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

    generateRoute(type, targetDistance) {
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
                route = this.generateLoopRoute(targetDistance, roads);
            } else {
                route = this.generateLinearRoute(targetDistance, roads);
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

    generateLoopRoute(targetDistance, roads) {
        const maxAttempts = 50;
        const tolerance = 0.2; // ±20%
        const minDistance = targetDistance * (1 - tolerance);
        const maxDistance = targetDistance * (1 + tolerance);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let route = {
                coords: [this.startPoint],
                segments: [],
                totalDistance: 0
            };

            let currentPoint = this.startPoint;
            const usedRoads = new Set();
            let stuck = 0;

            while (route.totalDistance < maxDistance && stuck < 20) {
                // Trova strade vicine
                const nearbyRoads = this.findNearbyRoads(currentPoint, roads, usedRoads);

                if (nearbyRoads.length === 0) {
                    stuck++;
                    // Se bloccato, prova a trovare strade anche già usate
                    const anyRoads = this.findNearbyRoads(currentPoint, roads, new Set());
                    if (anyRoads.length > 0) {
                        const chosen = anyRoads[Math.floor(Math.random() * Math.min(3, anyRoads.length))];
                        const segment = this.connectToRoad(currentPoint, chosen.road);
                        route.coords.push(...segment.coords);
                        route.segments.push(segment);
                        route.totalDistance += segment.distance;
                        currentPoint = segment.coords[segment.coords.length - 1];
                    } else {
                        break;
                    }
                    continue;
                }

                // Se vicino alla distanza target, prova a tornare all'inizio
                if (route.totalDistance >= minDistance) {
                    const distToStart = this.calculateDistance([currentPoint, this.startPoint]);
                    if (distToStart < 2) { // Entro 2km dal punto di partenza
                        // Torna all'inizio
                        route.coords.push(this.startPoint);
                        route.totalDistance += distToStart;

                        if (route.totalDistance >= minDistance && route.totalDistance <= maxDistance) {
                            return route; // Successo!
                        }
                    }
                }

                // Scegli una strada casuale tra le vicine (peso maggiore alle più vicine)
                const chosenIndex = this.weightedRandomChoice(nearbyRoads.length);
                const chosenRoad = nearbyRoads[chosenIndex].road;

                usedRoads.add(chosenRoad.id);

                // Connetti al segmento
                const segment = this.connectToRoad(currentPoint, chosenRoad);
                route.coords.push(...segment.coords);
                route.segments.push(segment);
                route.totalDistance += segment.distance;

                currentPoint = segment.coords[segment.coords.length - 1];
                stuck = 0; // Reset stuck counter
            }

            // Controlla se è un buon percorso
            if (route.totalDistance >= minDistance && route.totalDistance <= maxDistance) {
                // Chiudi l'anello tornando all'inizio
                const distToStart = this.calculateDistance([currentPoint, this.startPoint]);
                if (distToStart < 5) {
                    route.coords.push(this.startPoint);
                    route.totalDistance += distToStart;
                    return route;
                }
            }
        }

        // Se non trova un percorso perfetto, restituisci il migliore
        return null;
    }

    generateLinearRoute(targetDistance, roads) {
        const maxAttempts = 50;
        const tolerance = 0.2;
        const minDistance = targetDistance * (1 - tolerance);
        const maxDistance = targetDistance * (1 + tolerance);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let route = {
                coords: [this.startPoint],
                segments: [],
                totalDistance: 0
            };

            let currentPoint = this.startPoint;
            const usedRoads = new Set();
            let stuck = 0;

            while (route.totalDistance < maxDistance && stuck < 20) {
                const nearbyRoads = this.findNearbyRoads(currentPoint, roads, usedRoads);

                if (nearbyRoads.length === 0) {
                    stuck++;
                    continue;
                }

                // Scegli una strada casuale
                const chosenIndex = this.weightedRandomChoice(nearbyRoads.length);
                const chosenRoad = nearbyRoads[chosenIndex].road;

                usedRoads.add(chosenRoad.id);

                const segment = this.connectToRoad(currentPoint, chosenRoad);
                route.coords.push(...segment.coords);
                route.segments.push(segment);
                route.totalDistance += segment.distance;

                currentPoint = segment.coords[segment.coords.length - 1];
                stuck = 0;

                // Se raggiunto target, termina
                if (route.totalDistance >= minDistance) {
                    return route;
                }
            }

            if (route.totalDistance >= minDistance && route.totalDistance <= maxDistance) {
                return route;
            }
        }

        return null;
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

    connectToRoad(point, road) {
        // Trova il punto più vicino sulla strada
        let minDist = Infinity;
        let closestSegmentIndex = 0;
        let closestPoint = null;

        for (let i = 0; i < road.coords.length - 1; i++) {
            const projected = this.projectPointOnSegment(point, road.coords[i], road.coords[i + 1]);
            const dist = this.calculateDistance([point, projected]);

            if (dist < minDist) {
                minDist = dist;
                closestSegmentIndex = i;
                closestPoint = projected;
            }
        }

        // Decide direzione: avanti o indietro lungo la strada
        const goForward = Math.random() > 0.5;

        let segmentCoords = [];

        if (goForward) {
            // Dal punto proiettato fino alla fine della strada
            segmentCoords = [closestPoint, ...road.coords.slice(closestSegmentIndex + 1)];
        } else {
            // Dal punto proiettato all'inizio della strada (invertito)
            const beforeSegment = road.coords.slice(0, closestSegmentIndex + 1).reverse();
            segmentCoords = [closestPoint, ...beforeSegment];
        }

        const distance = this.calculateDistance(segmentCoords);

        return {
            coords: segmentCoords,
            distance: distance,
            roadId: road.id
        };
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
