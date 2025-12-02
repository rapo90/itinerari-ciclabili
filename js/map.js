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
        // Variabili per il routing in tempo reale
        this.realtimePoints = [];
        this.realtimeCoords = [];
        this.realtimePreviewLayer = null;

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

        // Event handler per l'inizio del disegno
        this.map.on(L.Draw.Event.DRAWSTART, (e) => {
            this.realtimePoints = [];
            this.realtimeCoords = [];
            if (this.realtimePreviewLayer) {
                this.map.removeLayer(this.realtimePreviewLayer);
                this.realtimePreviewLayer = null;
            }
        });

        // Event handler per ogni vertice aggiunto durante il disegno
        this.map.on(L.Draw.Event.DRAWVERTEX, async (e) => {
            const layers = e.layers;
            const newPoint = e.layers.getLayers()[e.layers.getLayers().length - 1].getLatLng();

            this.realtimePoints.push(newPoint);

            // Se abbiamo almeno 2 punti, fa routing tra gli ultimi due
            if (this.realtimePoints.length >= 2) {
                const fromPoint = this.realtimePoints[this.realtimePoints.length - 2];
                const toPoint = this.realtimePoints[this.realtimePoints.length - 1];

                try {
                    const routingService = window.routingService || new RoutingService();
                    const segmentCoords = await routingService.getRoute(fromPoint, toPoint);

                    // Aggiungi le coordinate del nuovo segmento (escludi il primo punto per evitare duplicati)
                    if (this.realtimeCoords.length > 0) {
                        this.realtimeCoords.push(...segmentCoords.slice(1));
                    } else {
                        this.realtimeCoords.push(...segmentCoords);
                    }

                    // Aggiorna il layer di preview
                    if (this.realtimePreviewLayer) {
                        this.map.removeLayer(this.realtimePreviewLayer);
                    }

                    this.realtimePreviewLayer = L.polyline(this.realtimeCoords, {
                        color: '#2E7D32',
                        weight: 6,
                        opacity: 0.8
                    }).addTo(this.map);

                } catch (error) {
                    console.error('Errore nel routing real-time:', error);
                }
            }
        });

        // Event handler per quando viene creata una nuova linea
        this.map.on(L.Draw.Event.CREATED, async (e) => {
            // Rimuovi il layer di preview
            if (this.realtimePreviewLayer) {
                this.map.removeLayer(this.realtimePreviewLayer);
                this.realtimePreviewLayer = null;
            }

            const layer = e.layer;
            const clickedPoints = layer.getLatLngs();

            // Se abbiamo già le coordinate dal routing in tempo reale, usale
            if (this.realtimeCoords.length >= 2) {
                const roadCoords = this.realtimeCoords;

                // Crea una nuova polyline con le coordinate del percorso
                const roadLayer = L.polyline(roadCoords, {
                    color: '#2E7D32',
                    weight: 6,
                    opacity: 0.8
                });

                this.drawnItems.addLayer(roadLayer);

                // Calcola la distanza effettiva del percorso
                const routingService = window.routingService || new RoutingService();
                const distance = routingService.calculateDistance(roadCoords);

                // Salva la strada come idonea
                if (window.roadManager) {
                    window.roadManager.addRoad(roadCoords, distance);
                }

                showToast(`✓ Strada aggiunta: ${distance.toFixed(2)} km (segue le strade)`, 3000);

                // Reset delle variabili per il prossimo disegno
                this.realtimePoints = [];
                this.realtimeCoords = [];

            } else if (clickedPoints.length >= 2) {
                // Fallback: se per qualche motivo non abbiamo le coordinate real-time, fai routing ora
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

        // Event handler per quando il disegno viene annullato
        this.map.on(L.Draw.Event.DRAWSTOP, (e) => {
            // Pulisci il layer di preview
            if (this.realtimePreviewLayer) {
                this.map.removeLayer(this.realtimePreviewLayer);
                this.realtimePreviewLayer = null;
            }
            this.realtimePoints = [];
            this.realtimeCoords = [];
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

        // Aggiungi un popup con opzioni per modificare/eliminare
        const distance = this.calculateDistance(coords);
        const popupContent = `
            <div style="text-align: center; min-width: 150px;">
                <strong>Strada Idonea</strong><br>
                Distanza: ${distance.toFixed(2)} km<br><br>
                <button onclick="window.mapManager.deleteRoad(this)" data-layer-id="${L.stamp(polyline)}"
                    style="background: #D32F2F; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin: 3px; font-weight: 600;">
                    🗑️ Elimina
                </button>
                <button onclick="window.mapManager.highlightRoad(${L.stamp(polyline)})"
                    style="background: #2E7D32; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin: 3px; font-weight: 600;">
                    👁️ Evidenzia
                </button>
            </div>
        `;

        polyline.bindPopup(popupContent);

        // Rendi la linea cliccabile
        polyline.on('click', function(e) {
            polyline.openPopup();
        });

        // Salva le coordinate nella polyline per poterla identificare
        polyline._savedCoords = coords;

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

        // Aggiungi frecce direzionali al percorso generato
        const arrowDecorator = L.polylineDecorator(polyline, {
            patterns: [
                {
                    offset: '10%',
                    repeat: '100px',
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 12,
                        polygon: false,
                        pathOptions: {
                            stroke: true,
                            color: color,
                            weight: 3,
                            opacity: 0.9
                        }
                    })
                }
            ]
        });

        this.generatedRoute.addLayer(arrowDecorator);

        // Fit bounds per vedere tutto il percorso
        this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

        return polyline;
    }

    clearGeneratedRoute() {
        this.generatedRoute.clearLayers();
    }

    deleteRoad(buttonElement) {
        const layerId = parseInt(buttonElement.getAttribute('data-layer-id'));

        // Cerca il layer nei gruppi
        let layerToRemove = null;

        this.suitableRoads.eachLayer((layer) => {
            if (L.stamp(layer) === layerId) {
                layerToRemove = layer;
            }
        });

        if (layerToRemove) {
            const coords = layerToRemove._savedCoords || layerToRemove.getLatLngs();

            // Rimuovi dalla mappa
            this.suitableRoads.removeLayer(layerToRemove);

            // Rimuovi anche da drawnItems se presente
            this.drawnItems.eachLayer((layer) => {
                if (L.stamp(layer) === layerId) {
                    this.drawnItems.removeLayer(layer);
                }
            });

            // Rimuovi dallo storage
            if (window.roadManager) {
                window.roadManager.removeRoadByCoords(coords);
            }

            showToast('✓ Strada eliminata', 2000);
        }
    }

    highlightRoad(layerId) {
        // Trova il layer e evidenzialo temporaneamente
        this.suitableRoads.eachLayer((layer) => {
            if (L.stamp(layer) === layerId) {
                const originalColor = layer.options.color;
                const originalWeight = layer.options.weight;

                // Evidenzia
                layer.setStyle({
                    color: '#FFEB3B',
                    weight: 10
                });

                // Ritorna al normale dopo 2 secondi
                setTimeout(() => {
                    layer.setStyle({
                        color: originalColor,
                        weight: originalWeight
                    });
                }, 2000);

                // Centra la mappa sul segmento
                this.map.fitBounds(layer.getBounds(), { padding: [50, 50] });
            }
        });
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
