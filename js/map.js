/**
 * map.js - Gestione della mappa OpenStreetMap con stile personalizzato
 */

class MapManager {
    constructor() {
        this.map = null;
        this.drawnItems = new L.FeatureGroup();
        this.suitableRoads = new L.FeatureGroup();
        this.generatedRoute = new L.FeatureGroup();
        this.startMarker = null;
        this.init();
    }

    init() {
        // Inizializza la mappa centrata sull'Italia
        this.map = L.map('map', {
            center: [45.4642, 9.1900], // Milano come centro default
            zoom: 13,
            zoomControl: true
        });

        // Tile layer con stile personalizzato (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);

        // Alternative: stile chiaro personalizzato
        // Uncomment per usare questo invece
        /*
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 20
        }).addTo(this.map);
        */

        // Aggiungi i layer groups alla mappa
        this.suitableRoads.addTo(this.map);
        this.generatedRoute.addTo(this.map);
        this.drawnItems.addTo(this.map);

        // Inizializza controlli di disegno
        this.initDrawControls();

        // Gestisci geolocalizzazione
        this.initGeolocation();
    }

    initDrawControls() {
        // Configura i controlli di disegno (inizialmente nascosti)
        this.drawControl = new L.Control.Draw({
            draw: {
                polyline: {
                    shapeOptions: {
                        color: '#2E7D32',
                        weight: 6,
                        opacity: 0.8
                    },
                    showLength: true,
                    metric: true,
                    feet: false
                },
                polygon: false,
                rectangle: false,
                circle: false,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: this.drawnItems,
                remove: true
            }
        });

        // Event handler per quando viene creata una nuova linea
        this.map.on(L.Draw.Event.CREATED, (e) => {
            const layer = e.layer;
            this.drawnItems.addLayer(layer);

            // Calcola la distanza in km
            const distance = this.calculateDistance(layer.getLatLngs());

            // Salva la strada come idonea
            if (window.roadManager) {
                window.roadManager.addRoad(layer.getLatLngs(), distance);
            }

            showToast(`Strada aggiunta: ${distance.toFixed(2)} km`);
        });

        // Event handler per quando viene eliminata una linea
        this.map.on(L.Draw.Event.DELETED, (e) => {
            const layers = e.layers;
            layers.eachLayer((layer) => {
                // Rimuovi dal manager
                if (window.roadManager) {
                    const coords = layer.getLatLngs();
                    window.roadManager.removeRoadByCoords(coords);
                }
            });
        });
    }

    initGeolocation() {
        // Prova a centrare sulla posizione dell'utente
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.map.setView([lat, lng], 13);
                },
                (error) => {
                    console.log('Geolocation not available:', error);
                }
            );
        }
    }

    enableDrawing() {
        this.map.addControl(this.drawControl);
        showToast('Modalità disegno attiva: clicca sulla mappa per tracciare le strade');
    }

    disableDrawing() {
        this.map.removeControl(this.drawControl);
        showToast('Modalità disegno disattivata');
    }

    addSuitableRoad(coords, color = '#2E7D32') {
        const polyline = L.polyline(coords, {
            color: color,
            weight: 6,
            opacity: 0.8,
            smoothFactor: 1
        });

        this.suitableRoads.addLayer(polyline);
        return polyline;
    }

    clearSuitableRoads() {
        this.suitableRoads.clearLayers();
        this.drawnItems.clearLayers();
    }

    addGeneratedRoute(coords, color = '#FF5722') {
        const polyline = L.polyline(coords, {
            color: color,
            weight: 8,
            opacity: 0.9,
            smoothFactor: 1,
            dashArray: '10, 5'
        });

        this.generatedRoute.addLayer(polyline);

        // Fit bounds per vedere tutto il percorso
        this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

        return polyline;
    }

    clearGeneratedRoute() {
        this.generatedRoute.clearLayers();
    }

    setStartMarker(latlng) {
        // Rimuovi marker precedente
        if (this.startMarker) {
            this.map.removeLayer(this.startMarker);
        }

        // Crea custom icon
        const customIcon = L.divIcon({
            className: 'custom-start-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        this.startMarker = L.marker(latlng, {
            icon: customIcon,
            draggable: true
        }).addTo(this.map);

        // Event per quando viene trascinato
        this.startMarker.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            if (window.routeGenerator) {
                window.routeGenerator.setStartPoint(newPos);
            }
        });

        return this.startMarker;
    }

    removeStartMarker() {
        if (this.startMarker) {
            this.map.removeLayer(this.startMarker);
            this.startMarker = null;
        }
    }

    calculateDistance(latlngs) {
        let distance = 0;
        for (let i = 0; i < latlngs.length - 1; i++) {
            distance += this.map.distance(latlngs[i], latlngs[i + 1]);
        }
        return distance / 1000; // Converti in km
    }

    enableStartPointSelection(callback) {
        showToast('Clicca sulla mappa per selezionare il punto di partenza');

        this.map.once('click', (e) => {
            callback(e.latlng);
        });

        // Cambia cursore
        this.map.getContainer().style.cursor = 'crosshair';
    }

    resetCursor() {
        this.map.getContainer().style.cursor = '';
    }
}

// Utility function per mostrare notifiche
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Esporta per uso globale
window.MapManager = MapManager;
window.showToast = showToast;
