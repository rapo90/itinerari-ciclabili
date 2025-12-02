/**
 * osmCycleways.js - Caricamento strade ciclabili da OpenStreetMap
 */

class OSMCyclewaysLoader {
    constructor(roadManager, mapManager) {
        this.roadManager = roadManager;
        this.mapManager = mapManager;
        this.overpassUrl = 'https://overpass-api.de/api/interpreter';
        this.loadedAreas = new Set(); // Cache aree già caricate
        this.osmRoads = []; // Strade OSM caricate
    }

    /**
     * Carica strade ciclabili OSM in un raggio di 50km dal punto specificato
     */
    async loadCyclewaysAroundPoint(centerPoint, radiusKm = 50) {
        const radiusMeters = radiusKm * 1000;

        // Crea ID area per evitare duplicati
        const areaId = `${centerPoint.lat.toFixed(2)}_${centerPoint.lng.toFixed(2)}`;

        if (this.loadedAreas.has(areaId)) {
            console.log('Area già caricata, skip');
            return this.osmRoads;
        }

        showToast('🔄 Caricamento strade ciclabili OSM...', 3000);

        try {
            const ways = await this.queryOverpass(centerPoint, radiusMeters);

            if (ways.length === 0) {
                showToast('⚠️ Nessuna strada ciclabile OSM trovata nell\'area', 3000);
                return [];
            }

            // Converti ways in formato dell'app
            let roads = this.convertWaysToRoads(ways);

            // Rimuovi duplicati
            roads = this.removeDuplicates(roads);

            // Aggiungi alla lista OSM roads
            this.osmRoads.push(...roads);

            // Visualizza sulla mappa
            roads.forEach(road => {
                this.mapManager.addSuitableRoad(road.coords, '#2E7D32');
            });

            // Marca area come caricata
            this.loadedAreas.add(areaId);

            showToast(`✓ Caricate ${roads.length} strade ciclabili OSM (${radiusKm}km)`, 4000);

            return roads;

        } catch (error) {
            console.error('Errore caricamento strade OSM:', error);
            showToast('❌ Errore caricamento strade OSM', 3000);
            return [];
        }
    }

    /**
     * Query Overpass API per strade ciclabili
     */
    async queryOverpass(centerPoint, radiusMeters) {
        // Query Overpass RESTRITTIVA - solo piste ciclabili dedicate
        const query = `
            [out:json][timeout:60];
            (
              // SOLO piste ciclabili dedicate
              way["highway"="cycleway"](around:${radiusMeters},${centerPoint.lat},${centerPoint.lng});

              // Sentieri SOLO con bicycle=designated (non "yes")
              way["highway"="path"]["bicycle"="designated"](around:${radiusMeters},${centerPoint.lat},${centerPoint.lng});

              // Strade con corsie ciclabili dedicate (track o lane)
              way["cycleway"~"track|lane|opposite_track|opposite_lane"](around:${radiusMeters},${centerPoint.lat},${centerPoint.lng});

              // Percorsi ciclabili ufficiali
              way["route"="bicycle"](around:${radiusMeters},${centerPoint.lat},${centerPoint.lng});
            );
            out geom;
        `;

        const response = await fetch(this.overpassUrl, {
            method: 'POST',
            body: query,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }

        const data = await response.json();
        return data.elements || [];
    }

    /**
     * Converte ways di Overpass nel formato dell'app
     */
    convertWaysToRoads(ways) {
        const roads = [];

        ways.forEach((way, index) => {
            if (!way.geometry || way.geometry.length < 2) {
                return; // Skip ways senza geometria valida
            }

            // Converti coordinate da formato Overpass a formato Leaflet
            const coords = way.geometry.map(node => ({
                lat: node.lat,
                lng: node.lon
            }));

            // Calcola distanza
            const distance = this.calculateDistance(coords);

            // Crea oggetto strada
            const road = {
                id: `osm_${way.id}`,
                coords: coords,
                distance: distance,
                metadata: {
                    source: 'osm',
                    osmId: way.id,
                    highway: way.tags?.highway,
                    cycleway: way.tags?.cycleway,
                    name: way.tags?.name || 'Senza nome',
                    surface: way.tags?.surface
                }
            };

            roads.push(road);
        });

        return roads;
    }

    /**
     * Calcola distanza di un percorso
     */
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

    /**
     * Ottieni tutte le strade OSM caricate
     */
    getOSMRoads() {
        return this.osmRoads;
    }

    /**
     * Pulisci strade OSM
     */
    clear() {
        this.osmRoads = [];
        this.loadedAreas.clear();
    }

    /**
     * Rimuovi duplicati basati su coordinate simili
     */
    removeDuplicates(roads) {
        const uniqueRoads = [];
        const seenCoords = new Set();

        roads.forEach(road => {
            // Crea una firma basata su primo, medio e ultimo punto
            if (road.coords.length < 2) return;

            const firstPoint = road.coords[0];
            const lastPoint = road.coords[road.coords.length - 1];
            const midPoint = road.coords[Math.floor(road.coords.length / 2)];

            const signature = `${firstPoint.lat.toFixed(4)}_${firstPoint.lng.toFixed(4)}_` +
                            `${midPoint.lat.toFixed(4)}_${midPoint.lng.toFixed(4)}_` +
                            `${lastPoint.lat.toFixed(4)}_${lastPoint.lng.toFixed(4)}`;

            if (!seenCoords.has(signature)) {
                seenCoords.add(signature);
                uniqueRoads.push(road);
            }
        });

        return uniqueRoads;
    }
}

// Esporta per uso globale
window.OSMCyclewaysLoader = OSMCyclewaysLoader;
