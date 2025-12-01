/**
 * roads.js - Gestione delle strade idonee (storage e retrieval)
 */

class RoadManager {
    constructor() {
        this.roads = [];
        this.storageKey = 'suitableRoads';
        this.loadFromStorage();
    }

    addRoad(coords, distance, metadata = {}) {
        const road = {
            id: this.generateId(),
            coords: coords.map(c => ({ lat: c.lat, lng: c.lng })),
            distance: distance,
            metadata: metadata,
            addedAt: new Date().toISOString()
        };

        this.roads.push(road);
        this.saveToStorage();
        this.updateStats();

        return road;
    }

    removeRoad(id) {
        this.roads = this.roads.filter(road => road.id !== id);
        this.saveToStorage();
        this.updateStats();
    }

    removeRoadByCoords(coords) {
        // Trova e rimuovi strada con coordinate simili
        const coordsStr = JSON.stringify(coords);
        this.roads = this.roads.filter(road => {
            const roadCoordsStr = JSON.stringify(road.coords);
            return roadCoordsStr !== coordsStr;
        });
        this.saveToStorage();
        this.updateStats();
    }

    getAllRoads() {
        return this.roads;
    }

    getTotalDistance() {
        return this.roads.reduce((sum, road) => sum + road.distance, 0);
    }

    clearAll() {
        this.roads = [];
        this.saveToStorage();
        this.updateStats();
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.roads));
        } catch (e) {
            console.error('Errore nel salvataggio:', e);
            showToast('Errore nel salvataggio dei dati', 3000);
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                this.roads = JSON.parse(data);
                this.updateStats();
                return true;
            }
        } catch (e) {
            console.error('Errore nel caricamento:', e);
        }
        return false;
    }

    updateStats() {
        // Aggiorna le statistiche nell'UI
        const roadCountEl = document.getElementById('roadCount');
        const totalDistanceEl = document.getElementById('totalDistance');

        if (roadCountEl) {
            roadCountEl.textContent = this.roads.length;
        }

        if (totalDistanceEl) {
            totalDistanceEl.textContent = this.getTotalDistance().toFixed(2);
        }
    }

    generateId() {
        return 'road_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Trova le strade più vicine a un punto
    findNearestRoads(point, maxDistance = 5000) {
        return this.roads.map(road => {
            const minDist = this.getMinDistanceToRoad(point, road.coords);
            return { road, distance: minDist };
        })
        .filter(item => item.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance);
    }

    getMinDistanceToRoad(point, roadCoords) {
        let minDist = Infinity;

        for (let i = 0; i < roadCoords.length - 1; i++) {
            const p1 = roadCoords[i];
            const p2 = roadCoords[i + 1];
            const dist = this.pointToSegmentDistance(point, p1, p2);
            minDist = Math.min(minDist, dist);
        }

        return minDist;
    }

    pointToSegmentDistance(point, segStart, segEnd) {
        const L2 = this.distanceSquared(segStart, segEnd);
        if (L2 === 0) return this.distance(point, segStart);

        let t = ((point.lat - segStart.lat) * (segEnd.lat - segStart.lat) +
                 (point.lng - segStart.lng) * (segEnd.lng - segStart.lng)) / L2;
        t = Math.max(0, Math.min(1, t));

        const projection = {
            lat: segStart.lat + t * (segEnd.lat - segStart.lat),
            lng: segStart.lng + t * (segEnd.lng - segStart.lng)
        };

        return this.distance(point, projection);
    }

    distance(p1, p2) {
        return Math.sqrt(this.distanceSquared(p1, p2));
    }

    distanceSquared(p1, p2) {
        const R = 6371000; // Raggio della Terra in metri (approssimazione)
        const dLat = this.toRad(p2.lat - p1.lat);
        const dLng = this.toRad(p2.lng - p1.lng);

        const lat1 = this.toRad(p1.lat);
        const lat2 = this.toRad(p2.lat);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    // Esporta tutte le strade come GeoJSON
    exportAsGeoJSON() {
        const features = this.roads.map(road => ({
            type: 'Feature',
            properties: {
                id: road.id,
                distance: road.distance,
                addedAt: road.addedAt,
                ...road.metadata
            },
            geometry: {
                type: 'LineString',
                coordinates: road.coords.map(c => [c.lng, c.lat])
            }
        }));

        return {
            type: 'FeatureCollection',
            features: features
        };
    }

    // Importa strade da GeoJSON
    importFromGeoJSON(geojson) {
        let count = 0;

        if (geojson.type === 'FeatureCollection') {
            geojson.features.forEach(feature => {
                if (feature.geometry.type === 'LineString') {
                    const coords = feature.geometry.coordinates.map(c => ({
                        lat: c[1],
                        lng: c[0]
                    }));

                    // Calcola distanza
                    const distance = this.calculateLineDistance(coords);

                    this.addRoad(coords, distance, feature.properties || {});
                    count++;
                }
            });
        }

        return count;
    }

    calculateLineDistance(coords) {
        let distance = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            distance += this.distance(coords[i], coords[i + 1]);
        }
        return distance / 1000; // Converti in km
    }
}

// Esporta per uso globale
window.RoadManager = RoadManager;
