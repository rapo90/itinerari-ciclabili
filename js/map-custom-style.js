/**
 * map-custom-style.js - Versione con stile completamente personalizzato
 * RICHIEDE: API Key di MapTiler (gratuita) - https://cloud.maptiler.com/
 *
 * Per usare questo file:
 * 1. Ottieni API key su https://cloud.maptiler.com/
 * 2. Sostituisci 'YOUR_MAPTILER_API_KEY' con la tua chiave
 * 3. In index.html, sostituisci map.js con map-custom-style.js
 */

// ⚠️ INSERISCI QUI LA TUA API KEY MAPTILER
const MAPTILER_API_KEY = 'YOUR_MAPTILER_API_KEY';

// Stile personalizzato per la mappa
const CUSTOM_MAP_STYLE = {
    "version": 8,
    "name": "Itinerari Ciclabili - Stile Personalizzato",
    "sources": {
        "maptiler": {
            "type": "vector",
            "url": `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_API_KEY}`
        }
    },
    "layers": [
        // SFONDO BASE - Chiaro
        {
            "id": "background",
            "type": "background",
            "paint": {
                "background-color": "#f8f4f0"
            }
        },

        // ACQUA
        {
            "id": "water",
            "type": "fill",
            "source": "maptiler",
            "source-layer": "water",
            "paint": {
                "fill-color": "#aad3df",
                "fill-opacity": 0.7
            }
        },

        // PARCHI E VERDE
        {
            "id": "landuse_park",
            "type": "fill",
            "source": "maptiler",
            "source-layer": "landuse",
            "filter": ["==", "class", "park"],
            "paint": {
                "fill-color": "#d4edda",
                "fill-opacity": 0.6
            }
        },

        // EDIFICI
        {
            "id": "building",
            "type": "fill",
            "source": "maptiler",
            "source-layer": "building",
            "paint": {
                "fill-color": "#ddd",
                "fill-opacity": 0.7
            }
        },

        // ==========================================
        // STRADE - STILI PERSONALIZZATI
        // ==========================================

        // SENTIERI - Linea sottile marrone chiaro
        {
            "id": "path",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": ["==", "class", "path"],
            "paint": {
                "line-color": "#8B6914",
                "line-width": 1.5,
                "line-dasharray": [2, 2]
            }
        },

        // STRADE STERRATE (track) - Sfondo marrone, larghezza media
        {
            "id": "track",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": ["==", "class", "track"],
            "paint": {
                "line-color": "#A0826D",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    12, 2,
                    16, 4
                ]
            }
        },

        // STRADE STERRATE MINORI (unclassified unpaved)
        {
            "id": "minor_unpaved",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": [
                "all",
                ["==", "class", "minor"],
                ["==", "surface", "unpaved"]
            ],
            "paint": {
                "line-color": "#C4A574",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    12, 3,
                    16, 6
                ]
            }
        },

        // STRADE SECONDARIE - Grigio con bordo sottile
        {
            "id": "secondary_road_casing",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": ["==", "class", "secondary"],
            "paint": {
                "line-color": "#999",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 3,
                    16, 10
                ]
            }
        },
        {
            "id": "secondary_road",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": ["==", "class", "secondary"],
            "paint": {
                "line-color": "#e0e0e0",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 2,
                    16, 8
                ]
            }
        },

        // STRADE PROVINCIALI - Grigio con bordo GIALLO spesso
        {
            "id": "tertiary_road_casing",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": ["==", "class", "tertiary"],
            "paint": {
                "line-color": "#FFD700",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 4,
                    16, 12
                ]
            }
        },
        {
            "id": "tertiary_road",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": ["==", "class", "tertiary"],
            "paint": {
                "line-color": "#d0d0d0",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 3,
                    16, 10
                ]
            }
        },

        // STRADE PRIMARIE/STATALI - Grigio con bordo VERDE molto spesso
        {
            "id": "primary_road_casing",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": ["==", "class", "primary"],
            "paint": {
                "line-color": "#4CAF50",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 5,
                    16, 16
                ]
            }
        },
        {
            "id": "primary_road",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": ["==", "class", "primary"],
            "paint": {
                "line-color": "#c8c8c8",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 4,
                    16, 14
                ]
            }
        },

        // AUTOSTRADE - Grigio scuro con bordo blu
        {
            "id": "motorway_casing",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": ["==", "class", "motorway"],
            "paint": {
                "line-color": "#1976D2",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 6,
                    16, 20
                ]
            }
        },
        {
            "id": "motorway",
            "type": "line",
            "source": "maptiler",
            "source-layer": "transportation",
            "filter": ["==", "class", "motorway"],
            "paint": {
                "line-color": "#b0b0b0",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 5,
                    16, 18
                ]
            }
        },

        // ETICHETTE STRADE
        {
            "id": "road_label",
            "type": "symbol",
            "source": "maptiler",
            "source-layer": "transportation_name",
            "layout": {
                "text-field": ["get", "name"],
                "text-font": ["Noto Sans Regular"],
                "text-size": 12,
                "symbol-placement": "line",
                "text-rotation-alignment": "map"
            },
            "paint": {
                "text-color": "#333",
                "text-halo-color": "#fff",
                "text-halo-width": 2
            }
        },

        // ETICHETTE CITTÀ
        {
            "id": "place_label",
            "type": "symbol",
            "source": "maptiler",
            "source-layer": "place",
            "layout": {
                "text-field": ["get", "name"],
                "text-font": ["Noto Sans Bold"],
                "text-size": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    6, 10,
                    12, 16
                ]
            },
            "paint": {
                "text-color": "#222",
                "text-halo-color": "#fff",
                "text-halo-width": 2
            }
        }
    ]
};

// Classe MapManager compatibile con la versione Leaflet
class MapManager {
    constructor() {
        this.map = null;
        this.drawnItems = [];
        this.suitableRoads = [];
        this.generatedRoute = [];
        this.startMarker = null;
        this.drawMode = false;
        this.currentDrawing = [];

        this.init();
    }

    init() {
        // Verifica API key
        if (MAPTILER_API_KEY === 'YOUR_MAPTILER_API_KEY') {
            alert('⚠️ ATTENZIONE: Devi inserire la tua API key MapTiler nel file map-custom-style.js!\n\n' +
                  'Vai su https://cloud.maptiler.com/ per ottenerne una gratuita.');
        }

        // Inizializza MapLibre GL JS
        this.map = new maplibregl.Map({
            container: 'map',
            style: CUSTOM_MAP_STYLE,
            center: [9.1900, 45.4642], // Milano
            zoom: 13
        });

        // Aggiungi controlli navigazione
        this.map.addControl(new maplibregl.NavigationControl());

        // Aggiungi controllo geolocalizzazione
        this.map.addControl(new maplibregl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }));

        // Event handlers per disegno
        this.map.on('click', (e) => {
            if (this.drawMode) {
                this.handleDrawClick(e.lngLat);
            }
        });

        showToast('Mappa caricata con stile personalizzato!', 3000);
    }

    enableDrawing() {
        this.drawMode = true;
        this.currentDrawing = [];
        this.map.getCanvas().style.cursor = 'crosshair';
        showToast('Modalità disegno attiva: clicca sulla mappa per tracciare', 3000);
    }

    disableDrawing() {
        this.drawMode = false;
        this.currentDrawing = [];
        this.map.getCanvas().style.cursor = '';
        showToast('Modalità disegno disattivata', 3000);
    }

    handleDrawClick(lngLat) {
        this.currentDrawing.push({lat: lngLat.lat, lng: lngLat.lng});

        // Mostra punto temporaneo
        // (implementazione semplificata)

        showToast(`Punto aggiunto (${this.currentDrawing.length}). Doppio click per finire.`, 2000);
    }

    // Metodi compatibili con versione Leaflet...
    addSuitableRoad(coords, color = '#2E7D32') {
        const geojson = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coords.map(c => [c.lng, c.lat])
            }
        };

        const id = 'road-' + Date.now();

        this.map.addSource(id, {
            type: 'geojson',
            data: geojson
        });

        this.map.addLayer({
            id: id,
            type: 'line',
            source: id,
            paint: {
                'line-color': color,
                'line-width': 6,
                'line-opacity': 0.8
            }
        });

        this.suitableRoads.push(id);
        return id;
    }

    clearSuitableRoads() {
        this.suitableRoads.forEach(id => {
            if (this.map.getLayer(id)) {
                this.map.removeLayer(id);
            }
            if (this.map.getSource(id)) {
                this.map.removeSource(id);
            }
        });
        this.suitableRoads = [];
    }

    addGeneratedRoute(coords, color = '#FF5722') {
        const geojson = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coords.map(c => [c.lng, c.lat])
            }
        };

        const id = 'route-' + Date.now();

        this.map.addSource(id, {
            type: 'geojson',
            data: geojson
        });

        this.map.addLayer({
            id: id,
            type: 'line',
            source: id,
            paint: {
                'line-color': color,
                'line-width': 8,
                'line-opacity': 0.9,
                'line-dasharray': [2, 1]
            }
        });

        this.generatedRoute.push(id);

        // Fit bounds
        const bounds = coords.reduce((bounds, coord) => {
            return bounds.extend([coord.lng, coord.lat]);
        }, new maplibregl.LngLatBounds());

        this.map.fitBounds(bounds, { padding: 50 });

        return id;
    }

    clearGeneratedRoute() {
        this.generatedRoute.forEach(id => {
            if (this.map.getLayer(id)) {
                this.map.removeLayer(id);
            }
            if (this.map.getSource(id)) {
                this.map.removeSource(id);
            }
        });
        this.generatedRoute = [];
    }

    setStartMarker(latlng) {
        if (this.startMarker) {
            this.startMarker.remove();
        }

        this.startMarker = new maplibregl.Marker({
            color: '#2196F3',
            draggable: true
        })
        .setLngLat([lngLat.lng, lngLat.lat])
        .addTo(this.map);

        this.startMarker.on('dragend', () => {
            const pos = this.startMarker.getLngLat();
            if (window.routeGenerator) {
                window.routeGenerator.setStartPoint({lat: pos.lat, lng: pos.lng});
            }
        });

        return this.startMarker;
    }

    removeStartMarker() {
        if (this.startMarker) {
            this.startMarker.remove();
            this.startMarker = null;
        }
    }

    calculateDistance(latlngs) {
        let distance = 0;
        for (let i = 0; i < latlngs.length - 1; i++) {
            const R = 6371;
            const dLat = (latlngs[i + 1].lat - latlngs[i].lat) * Math.PI / 180;
            const dLng = (latlngs[i + 1].lng - latlngs[i].lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(latlngs[i].lat * Math.PI / 180) *
                    Math.cos(latlngs[i + 1].lat * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            distance += R * c;
        }
        return distance;
    }

    enableStartPointSelection(callback) {
        showToast('Clicca sulla mappa per selezionare il punto di partenza', 3000);
        this.map.once('click', (e) => {
            callback({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
        this.map.getCanvas().style.cursor = 'crosshair';
    }

    resetCursor() {
        this.map.getCanvas().style.cursor = '';
    }
}

// Funzioni utility
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
}

// Esporta
window.MapManager = MapManager;
window.showToast = showToast;
