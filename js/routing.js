/**
 * routing.js - Servizio di routing per snap-to-road
 * Usa OSRM (Open Source Routing Machine) per seguire le strade
 */

class RoutingService {
    constructor() {
        // Server OSRM gratuito (per biciclette)
        this.osrmServer = 'https://routing.openstreetmap.de/routed-bike';
        // Alternative:
        // 'https://router.project-osrm.org/route/v1/driving' (auto)
        // 'https://routing.openstreetmap.de/routed-bike' (bici)
    }

    /**
     * Ottiene il percorso stradale tra due punti
     * @param {Object} from - {lat, lng}
     * @param {Object} to - {lat, lng}
     * @returns {Promise<Array>} Array di coordinate che seguono la strada
     */
    async getRoute(from, to) {
        try {
            const url = `${this.osrmServer}/route/v1/cycling/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Errore nel routing');
            }

            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                throw new Error('Nessun percorso trovato');
            }

            // Estrai le coordinate del percorso
            const coordinates = data.routes[0].geometry.coordinates;

            // Converti da [lng, lat] a {lat, lng}
            return coordinates.map(coord => ({
                lat: coord[1],
                lng: coord[0]
            }));

        } catch (error) {
            console.error('Errore routing:', error);
            // Fallback: ritorna linea retta
            return [from, to];
        }
    }

    /**
     * Ottiene il percorso stradale tra multipli punti
     * @param {Array} points - Array di {lat, lng}
     * @returns {Promise<Array>} Array di coordinate che seguono la strada
     */
    async getRouteMultiple(points) {
        if (points.length < 2) {
            return points;
        }

        const allCoordinates = [];

        // Per ogni coppia di punti consecutivi, ottieni il routing
        for (let i = 0; i < points.length - 1; i++) {
            const segmentCoords = await this.getRoute(points[i], points[i + 1]);

            // Aggiungi le coordinate (evita duplicati)
            if (i === 0) {
                allCoordinates.push(...segmentCoords);
            } else {
                // Salta il primo punto perché è uguale all'ultimo del segmento precedente
                allCoordinates.push(...segmentCoords.slice(1));
            }
        }

        return allCoordinates;
    }

    /**
     * Calcola la distanza di un percorso
     * @param {Array} coordinates - Array di {lat, lng}
     * @returns {number} Distanza in km
     */
    calculateDistance(coordinates) {
        let distance = 0;

        for (let i = 0; i < coordinates.length - 1; i++) {
            distance += this.haversineDistance(
                coordinates[i],
                coordinates[i + 1]
            );
        }

        return distance;
    }

    /**
     * Formula di Haversine per calcolare distanza tra due punti
     */
    haversineDistance(point1, point2) {
        const R = 6371; // Raggio della Terra in km
        const dLat = this.toRad(point2.lat - point1.lat);
        const dLng = this.toRad(point2.lng - point1.lng);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRad(point1.lat)) *
                Math.cos(this.toRad(point2.lat)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * Math.PI / 180;
    }
}

// Esporta per uso globale
window.RoutingService = RoutingService;
