/**
 * gpx.js - Gestione caricamento e parsing file GPX
 */

class GPXManager {
    constructor(roadManager, mapManager) {
        this.roadManager = roadManager;
        this.mapManager = mapManager;
    }

    handleFileUpload(files) {
        if (!files || files.length === 0) return;

        let processedCount = 0;
        let errorCount = 0;

        Array.from(files).forEach(file => {
            if (!file.name.endsWith('.gpx')) {
                showToast(`File ${file.name} non è un GPX valido`, 3000);
                errorCount++;
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const gpxText = e.target.result;
                    const count = this.parseGPX(gpxText);
                    processedCount += count;

                    if (processedCount > 0) {
                        showToast(`${processedCount} tracce caricate con successo!`, 3000);
                        this.refreshMap();
                    }
                } catch (error) {
                    console.error('Errore nel parsing GPX:', error);
                    errorCount++;
                    showToast(`Errore nel file ${file.name}`, 3000);
                }
            };

            reader.onerror = () => {
                errorCount++;
                showToast(`Errore nella lettura di ${file.name}`, 3000);
            };

            reader.readAsText(file);
        });
    }

    parseGPX(gpxText) {
        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxText, 'text/xml');

        // Controlla errori di parsing
        const parserError = gpxDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('GPX non valido');
        }

        // Usa toGeoJSON per convertire GPX in GeoJSON
        const geojson = toGeoJSON.gpx(gpxDoc);

        // Importa nel road manager
        const count = this.roadManager.importFromGeoJSON(geojson);

        return count;
    }

    refreshMap() {
        // Ricarica tutte le strade sulla mappa
        this.mapManager.clearSuitableRoads();

        const roads = this.roadManager.getAllRoads();
        roads.forEach(road => {
            this.mapManager.addSuitableRoad(road.coords);
        });

        // Fit bounds per vedere tutte le strade
        if (roads.length > 0) {
            const allCoords = roads.flatMap(road => road.coords);
            const bounds = L.latLngBounds(allCoords);
            this.mapManager.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    exportToGPX(roads, filename = 'itinerari-ciclabili.gpx') {
        // Crea documento GPX
        const gpxDoc = this.createGPXDocument(roads);

        // Converti in stringa
        const serializer = new XMLSerializer();
        const gpxText = serializer.serializeToString(gpxDoc);

        // Download
        this.downloadFile(gpxText, filename, 'application/gpx+xml');
    }

    createGPXDocument(roads) {
        const doc = document.implementation.createDocument('http://www.topografix.com/GPX/1/1', 'gpx', null);
        const gpx = doc.documentElement;

        gpx.setAttribute('version', '1.1');
        gpx.setAttribute('creator', 'Itinerari Ciclabili App');
        gpx.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        gpx.setAttribute('xsi:schemaLocation', 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd');

        // Metadata
        const metadata = doc.createElement('metadata');
        const name = doc.createElement('name');
        name.textContent = 'Strade Idonee Ciclabili';
        metadata.appendChild(name);

        const time = doc.createElement('time');
        time.textContent = new Date().toISOString();
        metadata.appendChild(time);

        gpx.appendChild(metadata);

        // Aggiungi ogni strada come track
        roads.forEach((road, index) => {
            const trk = doc.createElement('trk');

            const trkName = doc.createElement('name');
            trkName.textContent = `Percorso ${index + 1}`;
            trk.appendChild(trkName);

            const trkSeg = doc.createElement('trkseg');

            road.coords.forEach(coord => {
                const trkpt = doc.createElement('trkpt');
                trkpt.setAttribute('lat', coord.lat.toString());
                trkpt.setAttribute('lon', coord.lng.toString());
                trkSeg.appendChild(trkpt);
            });

            trk.appendChild(trkSeg);
            gpx.appendChild(trk);
        });

        return doc;
    }

    exportRouteToGPX(routeCoords, filename = 'percorso-generato.gpx') {
        // Crea un oggetto road temporaneo per il percorso
        const routeRoad = {
            coords: routeCoords,
            distance: 0
        };

        this.exportToGPX([routeRoad], filename);
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        showToast(`File ${filename} scaricato!`, 3000);
    }
}

// Esporta per uso globale
window.GPXManager = GPXManager;
