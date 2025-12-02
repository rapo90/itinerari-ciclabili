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

        const roads = this.roadManager.getAllRoads();
        if (roads.length === 0) {
            showToast('Aggiungi prima delle strade idonee!', 3000);
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
        const maxAttempts = 30;
        const tolerance = 3; // ±3km FISSO
        const minDistance = targetDistance - tolerance;
        const maxDistance = targetDistance + tolerance;

        const routingService = window.routingService || new RoutingService();

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let route = {
                coords: [],
                segments: [],
                totalDistance: 0
            };

            let currentPoint = this.startPoint;
            const usedSegments = new Set();
            let stuck = 0;

            while (route.totalDistance < maxDistance && stuck < 15) {
                // Trova strade vicine
                const nearbyRoads = this.findNearbyRoads(currentPoint, roads, usedSegments);

                if (nearbyRoads.length === 0) {
                    stuck++;
                    if (stuck > 10) break;
                    continue;
                }

                // Se siamo vicini alla distanza target, prova a tornare all'inizio
                if (route.totalDistance >= minDistance) {
                    try {
                        const routeToStart = await routingService.getRoute(currentPoint, this.startPoint);
                        const distToStart = routingService.calculateDistance(routeToStart);

                        if (distToStart < 5 && (route.totalDistance + distToStart) <= maxDistance) {
                            // Aggiungi percorso di ritorno
                            route.coords.push(...routeToStart);
                            route.totalDistance += distToStart;

                            if (route.totalDistance >= minDistance && route.totalDistance <= maxDistance) {
                                return route; // Successo!
                            }
                        }
                    } catch (error) {
                        console.error('Errore routing verso partenza:', error);
                    }
                }

                // Scegli una strada casuale tra le vicine
                const chosenIndex = this.weightedRandomChoice(nearbyRoads.length);
                const chosenRoad = nearbyRoads[chosenIndex].road;

                try {
                    // Connetti alla strada usando routing
                    const segment = await this.connectToRoadWithRouting(currentPoint, chosenRoad, routingService);

                    if (segment && segment.coords.length > 0) {
                        const segmentId = `${chosenRoad.id}-${segment.direction}`;
                        usedSegments.add(segmentId);

                        route.coords.push(...segment.coords);
                        route.segments.push(segment);
                        route.totalDistance += segment.distance;

                        currentPoint = segment.coords[segment.coords.length - 1];
                        stuck = 0;
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
                        return route;
                    }
                } catch (error) {
                    console.error('Errore chiusura anello:', error);
                }
            }
        }

        return null;
    }

    async generateLinearRoute(targetDistance, roads) {
        const maxAttempts = 30;
        const tolerance = 3; // ±3km FISSO
        const minDistance = targetDistance - tolerance;
        const maxDistance = targetDistance + tolerance;

        const routingService = window.routingService || new RoutingService();

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let route = {
                coords: [],
                segments: [],
                totalDistance: 0
            };

            let currentPoint = this.startPoint;
            const usedSegments = new Set();
            let stuck = 0;

            while (route.totalDistance < maxDistance && stuck < 15) {
                const nearbyRoads = this.findNearbyRoads(currentPoint, roads, usedSegments);

                if (nearbyRoads.length === 0) {
                    stuck++;
                    if (stuck > 10) break;
                    continue;
                }

                // Scegli una strada casuale
                const chosenIndex = this.weightedRandomChoice(nearbyRoads.length);
                const chosenRoad = nearbyRoads[chosenIndex].road;

                try {
                    const segment = await this.connectToRoadWithRouting(currentPoint, chosenRoad, routingService);

                    if (segment && segment.coords.length > 0) {
                        const segmentId = `${chosenRoad.id}-${segment.direction}`;
                        usedSegments.add(segmentId);

                        route.coords.push(...segment.coords);
                        route.segments.push(segment);
                        route.totalDistance += segment.distance;

                        currentPoint = segment.coords[segment.coords.length - 1];
                        stuck = 0;

                        // Se raggiunto target, termina
                        if (route.totalDistance >= minDistance) {
                            return route;
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
                return route;
            }
        }

        return null;
    }

    /**
     * Connette il punto corrente a una strada usando routing OSRM
     * Implementa anche "torna indietro" se necessario
     */
    async connectToRoadWithRouting(currentPoint, road, routingService) {
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

        try {
            // Routing dal punto corrente al punto di inizio del segmento
            const routeToRoad = await routingService.getRoute(currentPoint, direction.coords[0]);

            // Combina: routing verso strada + percorso lungo la strada
            const fullPath = [...routeToRoad, ...direction.coords];

            const distance = routingService.calculateDistance(fullPath);

            return {
                coords: fullPath,
                distance: distance,
                roadId: road.id,
                direction: direction.name
            };
        } catch (error) {
            console.error('Errore routing verso strada:', error);

            // Fallback: usa solo la strada senza routing
            const distance = this.calculateDistance(direction.coords);
            return {
                coords: direction.coords,
                distance: distance,
                roadId: road.id,
                direction: direction.name
            };
        }
    }

    findNearbyRoads(point, roads, excludeIds, maxDistance = 5000) {
        const nearby = [];

        roads.forEach(road => {
            if (excludeIds.has(road.id)) return;

            const minDist = this.getMinDistanceToRoad(point, road.coords);
            if (minDist <= maxDistance) {
                nearby.push({ road, distance: minDist });
            }
        });

        // Ordina per distanza
        nearby.sort((a, b) => a.distance - b.distance);

        return nearby;
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

        // Aggiorna UI
        const resultDiv = document.getElementById('routeResult');
        const distanceEl = document.getElementById('routeDistance');
        const segmentsEl = document.getElementById('routeSegments');

        if (resultDiv) resultDiv.style.display = 'block';
        if (distanceEl) distanceEl.textContent = route.totalDistance.toFixed(2);
        if (segmentsEl) segmentsEl.textContent = route.segments.length;

        showToast(`Percorso generato: ${route.totalDistance.toFixed(2)} km!`, 4000);
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
