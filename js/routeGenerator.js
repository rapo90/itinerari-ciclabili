/**
 * routeGenerator.js - Generazione percorsi random da strade idonee
 */

class RouteGenerator {
    constructor(roadManager, mapManager) {
        this.roadManager = roadManager;
        this.mapManager = mapManager;
        this.startPoint = null;
    }

    setStartPoint(latlng) {
        this.startPoint = latlng;
        this.mapManager.setStartMarker(latlng);

        const statusEl = document.getElementById('startPointStatus');
        if (statusEl) {
            statusEl.textContent = `📍 ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
        }
    }

    async generateRoute(type, targetDistance) {
        if (!this.startPoint) {
            showToast('Seleziona prima un punto di partenza!', 3000);
            return null;
        }

        // Usa tutte le strade disponibili (manuali + OSM)
        const roads = this.roadManager.getAllRoadsForRouting();
        if (roads.length === 0) {
            showToast('Aggiungi prima delle strade idonee o seleziona un punto di partenza per caricare strade OSM!', 4000);
            return null;
        }

        showToast('Generazione percorso in corso...', 2000);

        try {
            let route;
            if (type === 'loop') {
                route = await this.generateLoopRoute(targetDistance, roads);
            } else {
                route = await this.generateLinearRoute(targetDistance, roads);
            }

            if (route) {
                this.displayRoute(route);
                return route;
            } else {
                showToast('Impossibile generare un percorso. Prova a modificare i parametri.', 4000);
                return null;
            }
        } catch (error) {
            console.error('Errore nella generazione:', error);
            showToast('Errore nella generazione del percorso', 3000);
            return null;
        }
    }

    async generateLoopRoute(targetDistance, roads) {
        const maxAttempts = 50; // Aumentato da 30 a 50
        const tolerance = 3; // ±3km FISSO
        const minDistance = targetDistance - tolerance;
        const maxDistance = targetDistance + tolerance;

        const routingService = window.routingService || new RoutingService();

        console.log(`🔄 Inizio generazione loop: ${roads.length} strade disponibili, target ${targetDistance}km`);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Rilassamento più aggressivo dei vincoli
            const maxNonPreferredRatio = attempt < 10 ? 0.20 : (attempt < 20 ? 0.25 : (attempt < 35 ? 0.30 : 0.40));
            const searchRadius = attempt < 10 ? 3000 : (attempt < 20 ? 4000 : (attempt < 35 ? 5000 : 8000));

            // Soglia deduplicazione: più permissiva nei primi tentativi
            const overlapThreshold = attempt < 15 ? 0.95 : (attempt < 30 ? 0.85 : 0.75);

            if (attempt % 10 === 0) {
                console.log(`  Tentativo ${attempt}: radius=${searchRadius}m, overlap=${(overlapThreshold*100).toFixed(0)}%, maxNonPref=${(maxNonPreferredRatio*100).toFixed(0)}%`);
            }

            let route = {
                coords: [],
                segments: [],
                totalDistance: 0,
                nonPreferredDistance: 0
            };

            let currentPoint = this.startPoint;
            const usedSegments = new Set();
            let stuck = 0;

            while (route.totalDistance < maxDistance && stuck < 15) {
                // Trova strade vicine con raggio progressivo e soglia deduplicazione variabile
                const nearbyRoads = this.findNearbyRoads(currentPoint, roads, usedSegments, searchRadius, overlapThreshold);

                if (nearbyRoads.length === 0) {
                    stuck++;
                    // Dopo 5 tentativi, permetti di riusare strade già usate
                    if (stuck > 5) {
                        const anyRoads = this.findNearbyRoads(currentPoint, roads, new Set(), searchRadius, overlapThreshold);
                        if (anyRoads.length > 0) {
                            nearbyRoads.push(...anyRoads);
                        }
                    }
                    if (nearbyRoads.length === 0) {
                        if (stuck > 10) break;
                        continue;
                    }
                }

                // Se siamo vicini alla distanza target, prova a tornare all'inizio
                if (route.totalDistance >= minDistance) {
                    // Prima prova a trovare una strada idonea che ci riporta vicino all'inizio
                    const roadsNearStart = this.findRoadsNearPoint(this.startPoint, roads, usedSegments, 2000, overlapThreshold);

                    if (roadsNearStart.length > 0) {
                        // Usa una strada idonea per avvicinarci all'inizio
                        const roadTowardStart = roadsNearStart[0].road;

                        try {
                            const segment = await this.connectToRoadWithRouting(
                                currentPoint,
                                roadTowardStart,
                                routingService,
                                route,
                                maxNonPreferredRatio
                            );

                            if (segment && this.isWithinNonPreferredLimit(route, segment, maxNonPreferredRatio)) {
                                const segmentId = `${roadTowardStart.id}-${segment.direction}`;
                                usedSegments.add(segmentId);

                                route.coords.push(...segment.coords);
                                route.segments.push(segment);
                                route.totalDistance += segment.distance;
                                route.nonPreferredDistance += segment.nonPreferredDistance || 0;

                                currentPoint = segment.coords[segment.coords.length - 1];

                                // Ora prova a tornare all'inizio
                                const distToStart = this.haversineDistance(currentPoint, this.startPoint);
                                if (distToStart < 1) { // Entro 1km
                                    try {
                                        const routeToStart = await routingService.getRoute(currentPoint, this.startPoint);
                                        const distToStartReal = routingService.calculateDistance(routeToStart);

                                        if ((route.totalDistance + distToStartReal) <= maxDistance) {
                                            route.coords.push(...routeToStart);
                                            route.totalDistance += distToStartReal;
                                            route.nonPreferredDistance += distToStartReal;

                                            // Controlla limite 20%
                                            if (route.nonPreferredDistance / route.totalDistance <= maxNonPreferredRatio) {
                                                return route; // Successo!
                                            }
                                        }
                                    } catch (error) {
                                        console.error('Errore routing finale:', error);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Errore connessione strada verso inizio:', error);
                        }
                    }
                }

                // Scegli una strada vicina (preferendo le più vicine)
                const chosenIndex = this.weightedRandomChoice(Math.min(3, nearbyRoads.length));
                const chosenRoad = nearbyRoads[chosenIndex].road;

                try {
                    // Connetti alla strada usando routing, con limite strade non-idonee
                    const segment = await this.connectToRoadWithRouting(
                        currentPoint,
                        chosenRoad,
                        routingService,
                        route,
                        maxNonPreferredRatio
                    );

                    if (segment && segment.coords.length > 0) {
                        // Controlla se rispetta il limite 20%
                        if (this.isWithinNonPreferredLimit(route, segment, maxNonPreferredRatio)) {
                            const segmentId = `${chosenRoad.id}-${segment.direction}`;
                            usedSegments.add(segmentId);

                            route.coords.push(...segment.coords);
                            route.segments.push(segment);
                            route.totalDistance += segment.distance;
                            route.nonPreferredDistance += segment.nonPreferredDistance || 0;

                            currentPoint = segment.coords[segment.coords.length - 1];
                            stuck = 0;
                        } else {
                            // Questo segmento sforerebbe il limite 20%
                            stuck++;
                        }
                    } else {
                        stuck++;
                    }
                } catch (error) {
                    console.error('Errore connessione strada:', error);
                    stuck++;
                }
            }

            // Controlla se è un buon percorso
            if (route.totalDistance >= minDistance && route.totalDistance <= maxDistance) {
                // Prova a chiudere l'anello
                try {
                    const routeToStart = await routingService.getRoute(currentPoint, this.startPoint);
                    const distToStart = routingService.calculateDistance(routeToStart);

                    if ((route.totalDistance + distToStart) <= maxDistance) {
                        route.coords.push(...routeToStart);
                        route.totalDistance += distToStart;
                        console.log(`✅ Percorso trovato al tentativo ${attempt}! Distanza: ${route.totalDistance.toFixed(2)}km`);
                        return route;
                    }
                } catch (error) {
                    console.error('Errore chiusura anello:', error);
                }
            }
        }

        console.error(`❌ Impossibile generare percorso dopo ${maxAttempts} tentativi`);
        return null;
    }

    async generateLinearRoute(targetDistance, roads) {
        const maxAttempts = 50; // Aumentato da 30 a 50
        const tolerance = 3; // ±3km FISSO
        const minDistance = targetDistance - tolerance;
        const maxDistance = targetDistance + tolerance;

        const routingService = window.routingService || new RoutingService();

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Rilassamento più aggressivo dei vincoli
            const maxNonPreferredRatio = attempt < 10 ? 0.20 : (attempt < 20 ? 0.25 : (attempt < 35 ? 0.30 : 0.40));
            const searchRadius = attempt < 10 ? 3000 : (attempt < 20 ? 4000 : (attempt < 35 ? 5000 : 8000));

            // Soglia deduplicazione: più permissiva nei primi tentativi
            const overlapThreshold = attempt < 15 ? 0.95 : (attempt < 30 ? 0.85 : 0.75);

            let route = {
                coords: [],
                segments: [],
                totalDistance: 0,
                nonPreferredDistance: 0
            };

            let currentPoint = this.startPoint;
            const usedSegments = new Set();
            let stuck = 0;

            while (route.totalDistance < maxDistance && stuck < 15) {
                const nearbyRoads = this.findNearbyRoads(currentPoint, roads, usedSegments, searchRadius, overlapThreshold);

                if (nearbyRoads.length === 0) {
                    stuck++;
                    // Dopo 5 tentativi, permetti di riusare strade già usate
                    if (stuck > 5) {
                        const anyRoads = this.findNearbyRoads(currentPoint, roads, new Set(), searchRadius, overlapThreshold);
                        if (anyRoads.length > 0) {
                            nearbyRoads.push(...anyRoads);
                        }
                    }
                    if (nearbyRoads.length === 0) {
                        if (stuck > 10) break;
                        continue;
                    }
                }

                // Scegli una strada vicina (preferendo le più vicine)
                const chosenIndex = this.weightedRandomChoice(Math.min(3, nearbyRoads.length));
                const chosenRoad = nearbyRoads[chosenIndex].road;

                try {
                    const segment = await this.connectToRoadWithRouting(
                        currentPoint,
                        chosenRoad,
                        routingService,
                        route,
                        maxNonPreferredRatio
                    );

                    if (segment && segment.coords.length > 0) {
                        // Controlla se rispetta il limite 20%
                        if (this.isWithinNonPreferredLimit(route, segment, maxNonPreferredRatio)) {
                            const segmentId = `${chosenRoad.id}-${segment.direction}`;
                            usedSegments.add(segmentId);

                            route.coords.push(...segment.coords);
                            route.segments.push(segment);
                            route.totalDistance += segment.distance;
                            route.nonPreferredDistance += segment.nonPreferredDistance || 0;

                            currentPoint = segment.coords[segment.coords.length - 1];
                            stuck = 0;

                            // Se raggiunto target, termina
                            if (route.totalDistance >= minDistance) {
                                // Verifica che rispetti il limite 20%
                                if (route.nonPreferredDistance / route.totalDistance <= maxNonPreferredRatio) {
                                    return route;
                                }
                            }
                        } else {
                            // Questo segmento sforerebbe il limite 20%
                            stuck++;
                        }
                    } else {
                        stuck++;
                    }
                } catch (error) {
                    console.error('Errore connessione strada:', error);
                    stuck++;
                }
            }

            if (route.totalDistance >= minDistance && route.totalDistance <= maxDistance) {
                // Verifica limite 20%
                if (route.nonPreferredDistance / route.totalDistance <= maxNonPreferredRatio) {
                    return route;
                }
            }
        }

        return null;
    }

    /**
     * Verifica se aggiungere questo segmento rispetta il limite 20% strade non-preferite
     */
    isWithinNonPreferredLimit(route, segment, maxRatio) {
        const newTotalDistance = route.totalDistance + segment.distance;
        const newNonPreferredDistance = route.nonPreferredDistance + (segment.nonPreferredDistance || 0);

        return (newNonPreferredDistance / newTotalDistance) <= maxRatio;
    }

    /**
     * Trova strade idonee vicine a un punto specifico
     */
    findRoadsNearPoint(point, roads, excludeIds, maxDistance = 2000, overlapThreshold = 0.90) {
        const nearby = [];

        roads.forEach(road => {
            if (excludeIds.has(road.id)) return;

            // Controlla anche sovrapposizione con strade già usate
            if (this.hasSignificantOverlap(road, roads, excludeIds, overlapThreshold)) {
                return;
            }

            const minDist = this.getMinDistanceToRoad(point, road.coords);
            if (minDist <= maxDistance) {
                nearby.push({ road, distance: minDist });
            }
        });

        nearby.sort((a, b) => a.distance - b.distance);
        return nearby;
    }

    /**
     * Connette il punto corrente a una strada usando routing OSRM
     * Implementa anche "torna indietro" se necessario
     * Traccia distanza su strade non-preferite
     */
    async connectToRoadWithRouting(currentPoint, road, routingService, currentRoute, maxNonPreferredRatio) {
        // Trova il punto più vicino sulla strada
        let minDist = Infinity;
        let closestSegmentIndex = 0;
        let closestPoint = null;

        for (let i = 0; i < road.coords.length - 1; i++) {
            const projected = this.projectPointOnSegment(currentPoint, road.coords[i], road.coords[i + 1]);
            const dist = this.haversineDistance(currentPoint, projected);

            if (dist < minDist) {
                minDist = dist;
                closestSegmentIndex = i;
                closestPoint = projected;
            }
        }

        // Prova entrambe le direzioni
        const directions = [
            { name: 'forward', coords: road.coords.slice(closestSegmentIndex) },
            { name: 'backward', coords: road.coords.slice(0, closestSegmentIndex + 1).reverse() }
        ];

        // Scegli direzione casuale
        const direction = directions[Math.floor(Math.random() * directions.length)];

        // Calcola distanza della connessione (punto corrente -> inizio strada idonea)
        const connectionDistance = this.haversineDistance(currentPoint, direction.coords[0]);

        // Se la connessione è troppo lunga rispetto al limite, salta questa strada
        if (currentRoute && maxNonPreferredRatio) {
            const potentialNonPreferred = currentRoute.nonPreferredDistance + connectionDistance;
            const potentialTotal = currentRoute.totalDistance + connectionDistance + this.calculateDistance(direction.coords);

            if ((potentialNonPreferred / potentialTotal) > maxNonPreferredRatio) {
                // Connessione troppo lunga, sforerebbe il limite 20%
                return null;
            }
        }

        try {
            // Routing dal punto corrente al punto di inizio del segmento (strade non-idonee)
            const routeToRoad = await routingService.getRoute(currentPoint, direction.coords[0]);
            const connectionDist = routingService.calculateDistance(routeToRoad);

            // Combina: routing verso strada + percorso lungo la strada idonea
            const fullPath = [...routeToRoad, ...direction.coords];
            const roadDistance = this.calculateDistance(direction.coords);
            const totalDistance = connectionDist + roadDistance;

            return {
                coords: fullPath,
                distance: totalDistance,
                nonPreferredDistance: connectionDist, // Solo la connessione è non-preferita
                roadId: road.id,
                direction: direction.name
            };
        } catch (error) {
            console.error('Errore routing verso strada:', error);

            // Fallback: usa solo la strada senza routing (assume connessione diretta breve)
            const distance = this.calculateDistance(direction.coords);
            return {
                coords: direction.coords,
                distance: distance,
                nonPreferredDistance: connectionDistance, // Approssimazione
                roadId: road.id,
                direction: direction.name
            };
        }
    }

    findNearbyRoads(point, roads, excludeIds, maxDistance = 5000, overlapThreshold = 0.90) {
        const nearby = [];

        roads.forEach(road => {
            // Controlla se questo ID è già stato escluso
            if (excludeIds.has(road.id)) return;

            // Controlla se questa strada si sovrappone significativamente con strade già usate
            // Soglia configurabile per essere meno aggressivi nei primi tentativi
            if (this.hasSignificantOverlap(road, roads, excludeIds, overlapThreshold)) {
                return; // Skip this road if it overlaps with already used roads
            }

            const minDist = this.getMinDistanceToRoad(point, road.coords);
            if (minDist <= maxDistance) {
                nearby.push({ road, distance: minDist });
            }
        });

        // Ordina per distanza
        nearby.sort((a, b) => a.distance - b.distance);

        return nearby;
    }

    /**
     * Verifica se una strada si sovrappone significativamente con strade già usate
     */
    hasSignificantOverlap(road, allRoads, usedIds, threshold = 0.90) {
        // Ottieni lista di strade già usate
        const usedRoads = allRoads.filter(r => {
            // Controlla se l'ID base (senza direzione) è già stato usato
            const baseUsedId = r.id.replace(/-(forward|backward)$/, '');
            for (let usedId of usedIds) {
                const baseId = usedId.replace(/-(forward|backward)$/, '');
                if (baseUsedId === baseId || baseId === r.id) {
                    return true;
                }
            }
            return false;
        });

        // Controlla sovrapposizione con ciascuna strada usata
        for (let usedRoad of usedRoads) {
            const overlapPercentage = this.calculateOverlapPercentage(road.coords, usedRoad.coords);

            // Usa soglia configurabile (default 90%, era 70%)
            if (overlapPercentage > threshold) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calcola la percentuale di sovrapposizione tra due strade
     */
    calculateOverlapPercentage(coords1, coords2) {
        if (coords1.length < 2 || coords2.length < 2) return 0;

        let overlapCount = 0;
        const threshold = 0.1; // 100 metri di tolleranza (aumentato da 50m)

        // Conta quanti punti di coords1 sono vicini a coords2
        for (let point of coords1) {
            for (let i = 0; i < coords2.length - 1; i++) {
                const dist = this.pointToSegmentDistance(point, coords2[i], coords2[i + 1]);
                if (dist < threshold) {
                    overlapCount++;
                    break; // Conta questo punto solo una volta
                }
            }
        }

        return overlapCount / coords1.length;
    }

    /**
     * Calcola distanza punto-segmento in km
     */
    pointToSegmentDistance(point, segStart, segEnd) {
        const projected = this.projectPointOnSegment(point, segStart, segEnd);
        return this.haversineDistance(point, projected);
    }

    haversineDistance(point1, point2) {
        const R = 6371; // Raggio Terra in km
        const dLat = this.toRad(point2.lat - point1.lat);
        const dLng = this.toRad(point2.lng - point1.lng);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    projectPointOnSegment(point, segStart, segEnd) {
        const A = point.lat - segStart.lat;
        const B = point.lng - segStart.lng;
        const C = segEnd.lat - segStart.lat;
        const D = segEnd.lng - segStart.lng;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = segStart.lat;
            yy = segStart.lng;
        } else if (param > 1) {
            xx = segEnd.lat;
            yy = segEnd.lng;
        } else {
            xx = segStart.lat + param * C;
            yy = segStart.lng + param * D;
        }

        return { lat: xx, lng: yy };
    }

    getMinDistanceToRoad(point, roadCoords) {
        let minDist = Infinity;

        for (let i = 0; i < roadCoords.length - 1; i++) {
            const projected = this.projectPointOnSegment(point, roadCoords[i], roadCoords[i + 1]);
            const dist = this.calculateDistance([point, projected]);
            minDist = Math.min(minDist, dist);
        }

        return minDist;
    }

    calculateDistance(coords) {
        let distance = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            const R = 6371; // Raggio Terra in km
            const dLat = this.toRad(coords[i + 1].lat - coords[i].lat);
            const dLng = this.toRad(coords[i + 1].lng - coords[i].lng);

            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(this.toRad(coords[i].lat)) * Math.cos(this.toRad(coords[i + 1].lat)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);

            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distance += R * c;
        }
        return distance;
    }

    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    weightedRandomChoice(length) {
        // Favorisce indici più bassi (strade più vicine)
        const weights = [];
        for (let i = 0; i < length; i++) {
            weights.push(1 / (i + 1));
        }

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return i;
            }
        }

        return length - 1;
    }

    displayRoute(route) {
        // Pulisci percorso precedente
        this.mapManager.clearGeneratedRoute();

        // Mostra nuovo percorso
        this.mapManager.addGeneratedRoute(route.coords);

        // Calcola percentuale strade non-preferite
        const nonPreferredPercent = route.nonPreferredDistance ?
            (route.nonPreferredDistance / route.totalDistance * 100).toFixed(1) : 0;

        // Aggiorna UI
        const resultDiv = document.getElementById('routeResult');
        const distanceEl = document.getElementById('routeDistance');
        const segmentsEl = document.getElementById('routeSegments');

        if (resultDiv) resultDiv.style.display = 'block';
        if (distanceEl) distanceEl.textContent = route.totalDistance.toFixed(2);
        if (segmentsEl) segmentsEl.textContent = route.segments.length;

        // Messaggio con info su strade non-preferite
        let message;
        if (nonPreferredPercent == 0) {
            message = `Percorso generato: ${route.totalDistance.toFixed(2)} km (100% su strade preferite!)`;
        } else if (nonPreferredPercent <= 20) {
            message = `Percorso generato: ${route.totalDistance.toFixed(2)} km (${nonPreferredPercent}% su altre strade) ✓`;
        } else {
            message = `Percorso generato: ${route.totalDistance.toFixed(2)} km (${nonPreferredPercent}% su altre strade)`;
        }

        showToast(message, 5000);
    }

    getCurrentRoute() {
        // Ritorna le coordinate del percorso corrente dalla mappa
        const layers = this.mapManager.generatedRoute.getLayers();
        if (layers.length > 0) {
            return layers[0].getLatLngs();
        }
        return null;
    }
}

// Esporta per uso globale
window.RouteGenerator = RouteGenerator;
