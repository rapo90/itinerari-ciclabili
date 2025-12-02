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
        this.currentTileLayer = null;

        // Definizione stili mappa disponibili
        this.mapStyles = {
            osm: {
                name: 'OSM Standard',
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            },
            cyclosm: {
                name: 'CyclOSM (Ciclismo)',
                url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
                attribution: '&copy; OpenStreetMap contributors, CyclOSM',
                maxZoom: 20
            },
            humanitarian: {
                name: 'Humanitarian OSM',
                url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
                attribution: '&copy; OpenStreetMap contributors, HOT',
                maxZoom: 20
            },
            opentopo: {
                name: 'OpenTopoMap',
                url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                attribution: '&copy; OpenStreetMap contributors, OpenTopoMap',
                maxZoom: 17
            }
        };

        this.init();
    }

    init() {
        // Inizializza la mappa centrata sull'Italia
        this.map = L.map('map', {
            center: [45.4642, 9.1900], // Milano come centro default
            zoom: 13,
            zoomControl: true
        });

        // Carica stile salvato o usa CyclOSM come default
        const savedStyle = localStorage.getItem('mapStyle') || 'cyclosm';
        this.setMapStyle(savedStyle);

        // NOTA: Per controllo completo su colori strade (sentieri marroni, provinciali gialle, ecc.)
        // è necessario usare MapTiler o Mapbox con stile personalizzato
        // Vedi: js/map-custom-style.js per la versione avanzata

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
        this.map.on(L.Draw.Event.CREATED, async (e) => {
            const layer = e.layer;
            const clickedPoints = layer.getLatLngs();

            // Se ci sono almeno 2 punti, fa routing tra di loro
            if (clickedPoints.length >= 2) {
                showToast('Calcolo percorso stradale...', 2000);

                try {
                    // Usa il servizio di routing per seguire le strade
                    const routingService = window.routingService || new RoutingService();
                    const roadCoords = await routingService.getRouteMultiple(clickedPoints);

                    // Crea una nuova polyline con le coordinate del percorso
                    const roadLayer = L.polyline(roadCoords, {
                        color: '#2E7D32',
                        weight: 6,
                        opacity: 0.8
                    });

                    this.drawnItems.addLayer(roadLayer);

                    // Calcola la distanza effettiva del percorso
                    const distance = routingService.calculateDistance(roadCoords);

                    // Salva la strada come idonea
                    if (window.roadManager) {
                        window.roadManager.addRoad(roadCoords, distance);
                    }

                    showToast(`✓ Strada aggiunta: ${distance.toFixed(2)} km (segue le strade)`, 3000);

                } catch (error) {
                    console.error('Errore nel routing:', error);

                    // Fallback: usa la linea retta
                    this.drawnItems.addLayer(layer);
                    const distance = this.calculateDistance(clickedPoints);

                    if (window.roadManager) {
                        window.roadManager.addRoad(clickedPoints, distance);
                    }

                    showToast(`⚠️ Strada aggiunta: ${distance.toFixed(2)} km (linea retta)`, 3000);
                }
            } else {
                // Meno di 2 punti, aggiungi come linea normale
                this.drawnItems.addLayer(layer);
                const distance = this.calculateDistance(clickedPoints);

                if (window.roadManager) {
                    window.roadManager.addRoad(clickedPoints, distance);
                }

                showToast(`Strada aggiunta: ${distance.toFixed(2)} km`, 3000);
            }
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

    setMapStyle(styleKey) {
        // Rimuovi tile layer precedente
        if (this.currentTileLayer) {
            this.map.removeLayer(this.currentTileLayer);
        }

        // Ottieni configurazione stile
        const style = this.mapStyles[styleKey];
        if (!style) {
            console.error('Stile non trovato:', styleKey);
            return;
        }

        // Aggiungi nuovo tile layer
        this.currentTileLayer = L.tileLayer(style.url, {
            attribution: style.attribution,
            maxZoom: style.maxZoom
        }).addTo(this.map);

        // Salva preferenza
        localStorage.setItem('mapStyle', styleKey);

        showToast(`Stile mappa cambiato: ${style.name}`, 3000);
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
