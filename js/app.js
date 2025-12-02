/**
 * app.js - Applicazione principale che collega tutti i moduli
 */

// Inizializza l'applicazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚴 Itinerari Ciclabili App - Inizializzazione...');

    // Inizializza i manager
    const routingService = new RoutingService();
    const mapManager = new MapManager();
    const roadManager = new RoadManager();
    const osmLoader = new OSMCyclewaysLoader(roadManager, mapManager);
    const gpxManager = new GPXManager(roadManager, mapManager);
    const routeGenerator = new RouteGenerator(roadManager, mapManager);

    // Rendi disponibili globalmente per debugging
    window.routingService = routingService;
    window.mapManager = mapManager;
    window.roadManager = roadManager;
    window.osmLoader = osmLoader;
    window.gpxManager = gpxManager;
    window.routeGenerator = routeGenerator;

    // Carica strade salvate e mostrali sulla mappa
    const savedRoads = roadManager.getAllRoads();
    savedRoads.forEach(road => {
        mapManager.addSuitableRoad(road.coords);
    });

    if (savedRoads.length > 0) {
        console.log(`✓ Caricate ${savedRoads.length} strade salvate`);
    }

    // ======================
    // EVENT HANDLERS - Gestione Strade
    // ======================

    const selectRoadBtn = document.getElementById('selectRoadBtn');
    const stopSelectBtn = document.getElementById('stopSelectBtn');
    const gpxUpload = document.getElementById('gpxUpload');
    const clearRoadsBtn = document.getElementById('clearRoadsBtn');
    const exportRoadsBtn = document.getElementById('exportRoadsBtn');

    // Attiva/disattiva modalità selezione
    selectRoadBtn.addEventListener('click', () => {
        mapManager.enableDrawing();
        selectRoadBtn.style.display = 'none';
        stopSelectBtn.style.display = 'block';
    });

    stopSelectBtn.addEventListener('click', () => {
        mapManager.disableDrawing();
        stopSelectBtn.style.display = 'none';
        selectRoadBtn.style.display = 'block';
    });

    // Caricamento GPX
    gpxUpload.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            gpxManager.handleFileUpload(files);
        }
        // Reset input per permettere ricaricamento stesso file
        e.target.value = '';
    });

    // Cancella tutte le strade
    clearRoadsBtn.addEventListener('click', () => {
        if (confirm('Sei sicuro di voler cancellare tutte le strade salvate?')) {
            roadManager.clearAll();
            mapManager.clearSuitableRoads();
            showToast('Tutte le strade sono state cancellate', 3000);
        }
    });

    // Esporta strade come GPX
    exportRoadsBtn.addEventListener('click', () => {
        const roads = roadManager.getAllRoads();
        if (roads.length === 0) {
            showToast('Nessuna strada da esportare', 3000);
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `strade-idonee-${timestamp}.gpx`;

        gpxManager.exportToGPX(roads, filename);
    });

    // ======================
    // EVENT HANDLERS - Stile Mappa
    // ======================

    const mapStyleSelect = document.getElementById('mapStyleSelect');

    // Imposta valore iniziale del select
    const savedStyle = localStorage.getItem('mapStyle') || 'cyclosm';
    mapStyleSelect.value = savedStyle;

    // Cambio stile mappa
    mapStyleSelect.addEventListener('change', (e) => {
        const styleKey = e.target.value;
        mapManager.setMapStyle(styleKey);
    });

    // ======================
    // EVENT HANDLERS - Generazione Percorso
    // ======================

    const selectStartBtn = document.getElementById('selectStartBtn');
    const generateRouteBtn = document.getElementById('generateRouteBtn');
    const exportRouteBtn = document.getElementById('exportRouteBtn');
    const routeTypeSelect = document.getElementById('routeType');
    const targetDistanceInput = document.getElementById('targetDistance');

    // Selezione punto di partenza
    selectStartBtn.addEventListener('click', () => {
        mapManager.enableStartPointSelection(async (latlng) => {
            routeGenerator.setStartPoint(latlng);
            mapManager.resetCursor();

            // Carica automaticamente strade ciclabili OSM in un raggio di 25km
            showToast('🔄 Caricamento strade ciclabili OSM (25km)...', 3000);

            try {
                const osmRoads = await osmLoader.loadCyclewaysAroundPoint(latlng, 25);

                // Salva le strade OSM nel roadManager per il generatore di percorsi
                roadManager.setOSMRoads(osmRoads);

                console.log(`✓ Caricate ${osmRoads.length} strade OSM`);
            } catch (error) {
                console.error('Errore caricamento OSM:', error);
                showToast('⚠️ Errore caricamento strade OSM', 3000);
            }
        });
    });

    // Genera percorso
    generateRouteBtn.addEventListener('click', () => {
        const routeType = routeTypeSelect.value;
        const targetDistance = parseFloat(targetDistanceInput.value);

        if (!targetDistance || targetDistance <= 0) {
            showToast('Inserisci una distanza valida', 3000);
            return;
        }

        if (targetDistance > 200) {
            showToast('La distanza massima è 200 km', 3000);
            return;
        }

        // Genera il percorso
        const route = routeGenerator.generateRoute(routeType, targetDistance);

        if (!route) {
            console.log('Nessun percorso generato');
        }
    });

    // Esporta percorso generato
    exportRouteBtn.addEventListener('click', () => {
        const routeCoords = routeGenerator.getCurrentRoute();

        if (!routeCoords || routeCoords.length === 0) {
            showToast('Nessun percorso da esportare', 3000);
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const routeType = routeTypeSelect.value;
        const filename = `percorso-${routeType}-${timestamp}.gpx`;

        gpxManager.exportRouteToGPX(routeCoords, filename);
    });

    // ======================
    // KEYBOARD SHORTCUTS
    // ======================

    document.addEventListener('keydown', (e) => {
        // ESC - Disattiva modalità disegno
        if (e.key === 'Escape') {
            if (stopSelectBtn.style.display !== 'none') {
                stopSelectBtn.click();
            }
        }

        // Ctrl/Cmd + S - Esporta strade
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            exportRoadsBtn.click();
        }

        // Ctrl/Cmd + G - Genera percorso
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            generateRouteBtn.click();
        }
    });

    // ======================
    // INIZIALIZZAZIONE COMPLETATA
    // ======================

    console.log('✓ App inizializzata con successo');
    showToast('🚴 Benvenuto! Inizia selezionando o caricando strade idonee', 4000);

    // Tips dopo 5 secondi
    setTimeout(() => {
        if (roadManager.getAllRoads().length === 0) {
            showToast('💡 Suggerimento: Usa "Seleziona Strade" o "Carica GPX" per iniziare', 5000);
        }
    }, 5000);
});

// ======================
// UTILITY FUNCTIONS
// ======================

// Previeni comportamenti di default su drag & drop
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();

    // Gestisci file GPX droppati
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const gpxFiles = Array.from(files).filter(f => f.name.endsWith('.gpx'));
        if (gpxFiles.length > 0) {
            window.gpxManager.handleFileUpload(gpxFiles);
        }
    }
});

// Log errori non gestiti
window.addEventListener('error', (e) => {
    console.error('Errore non gestito:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise non gestita:', e.reason);
});
