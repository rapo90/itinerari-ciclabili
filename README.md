# 🚴 Itinerari Ciclabili

Applicazione web interattiva per la gestione e generazione di percorsi ciclabili personalizzati utilizzando OpenStreetMap.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Caratteristiche

### 🗺️ Mappa Personalizzata
- **OpenStreetMap** con stili multipli selezionabili
- **CyclOSM** ottimizzato per ciclismo (default)
- Stili alternativi: OSM Standard, Humanitarian, OpenTopoMap
- Interfaccia moderna e intuitiva
- Geolocalizzazione automatica
- Zoom e navigazione fluida

### 📍 Selezione Strade Idonee
- **Disegno interattivo** direttamente sulla mappa
- **Snap-to-Road**: le linee seguono automaticamente le strade (OSRM)
- Routing intelligente per ciclabili
- Calcolo automatico delle distanze reali
- **Salvataggio locale** persistente (LocalStorage)
- Modifica ed eliminazione delle strade

### 📁 Gestione File GPX
- **Caricamento multiplo** di file GPX
- **Parsing automatico** di tracce GPS
- **Esportazione** delle strade salvate in formato GPX
- Supporto drag & drop

### 🎲 Generazione Percorsi Random
Due modalità di generazione:
- **Percorsi ad Anello**: ritorno al punto di partenza
- **Percorsi Lineari**: percorsi punto-a-punto

Parametri configurabili:
- Distanza desiderata (1-200 km)
- Punto di partenza personalizzabile
- Tolleranza automatica ±20%

### 💾 Esportazione
- Esporta strade idonee come GPX
- Esporta percorsi generati come GPX
- Compatibile con tutti i dispositivi GPS

## 🚀 Avvio Rapido

### Requisiti
Nessun requisito di installazione! L'applicazione funziona completamente nel browser.

### Utilizzo

1. **Apri il file `index.html` nel browser**
   ```bash
   # Opzione 1: Doppio click su index.html

   # Opzione 2: Avvia un server locale
   python3 -m http.server 8000
   # Poi apri http://localhost:8000
   ```

2. **Aggiungi strade idonee**
   - Clicca su "✏️ Seleziona Strade" e disegna sulla mappa
   - Oppure carica file GPX esistenti

3. **Genera un percorso**
   - Seleziona il punto di partenza
   - Scegli tipo di percorso (anello/lineare)
   - Imposta la distanza desiderata
   - Clicca "🎲 Genera Percorso"

4. **Esporta e condividi**
   - Scarica il percorso in formato GPX
   - Importa nel tuo GPS o app di navigazione

## 📂 Struttura del Progetto

```
itinerari-ciclabili/
├── index.html              # Pagina principale
├── css/
│   └── style.css          # Stili personalizzati
├── js/
│   ├── app.js             # Applicazione principale
│   ├── map.js             # Gestione mappa OSM
│   ├── roads.js           # Gestione strade idonee
│   ├── gpx.js             # Parser/export GPX
│   └── routeGenerator.js  # Algoritmo generazione percorsi
├── data/                  # Directory per dati (opzionale)
└── README.md              # Questa documentazione
```

## 🛠️ Tecnologie Utilizzate

- **[Leaflet.js](https://leafletjs.com/)** - Libreria per mappe interattive
- **[Leaflet.draw](https://github.com/Leaflet/Leaflet.draw)** - Plugin per disegno su mappa
- **[toGeoJSON](https://github.com/mapbox/togeojson)** - Conversione GPX ↔ GeoJSON
- **[CartoDB](https://carto.com/)** - Tile server per mappe OSM
- **Vanilla JavaScript** - Nessun framework pesante
- **LocalStorage API** - Persistenza dati lato client

## 📖 Guida Dettagliata

### Selezione Strade Idonee

1. Clicca sul pulsante **"✏️ Seleziona Strade"**
2. Sulla mappa appariranno i controlli di disegno
3. Clicca per creare punti lungo una strada
4. Doppio click per terminare il tracciato
5. La strada verrà salvata automaticamente

**Shortcuts:**
- `ESC` - Annulla disegno corrente
- Click su una strada esistente - Seleziona per modifiche/eliminazione

### Caricamento GPX

Supporta file GPX standard con:
- Track (`<trk>`)
- Route (`<rte>`)
- Waypoint (`<wpt>`)

**Metodi di caricamento:**
1. Click su "📁 Carica GPX"
2. Drag & drop dei file sulla pagina
3. Caricamento multiplo supportato

### Generazione Percorsi

L'algoritmo di generazione:

1. Parte dal punto selezionato
2. Trova le strade idonee nelle vicinanze (entro 5km)
3. Concatena segmenti casuali dando priorità a:
   - Strade non ancora utilizzate
   - Strade più vicine al punto corrente
4. Per percorsi ad anello: cerca di tornare al punto di partenza
5. Rispetta la distanza target con tolleranza ±20%

**Parametri:**
- **Distanza**: 1-200 km
- **Tipo**: Anello o Lineare
- **Punto di partenza**: Trascinabile sulla mappa

### Shortcuts da Tastiera

- `ESC` - Esci dalla modalità disegno
- `Ctrl/Cmd + S` - Esporta strade
- `Ctrl/Cmd + G` - Genera percorso

## 🎨 Personalizzazione

### Cambiare Stile Mappa

Nel file `js/map.js`, modifica il tile layer:

```javascript
// Tema Scuro (default)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {...})

// Tema Chiaro
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {...})

// Altri stili disponibili:
// - CartoDB Positron (chiaro)
// - CartoDB Voyager (colorato)
// - Humanitarian OSM (dettagliato)
```

### Modificare Colori

Nel file `css/style.css`:

```css
/* Colore strade idonee */
.legend-color { background-color: #2E7D32; }

/* Colore percorso generato */
background-color: #FF5722;

/* Colore punto di partenza */
background-color: #2196F3;
```

### Personalizzare Sidebar

Modifica il gradiente in `css/style.css`:

```css
.sidebar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## 🔧 Configurazione Avanzata

### Modificare Parametri Algoritmo

Nel file `js/routeGenerator.js`:

```javascript
// Tolleranza distanza (±20%)
const tolerance = 0.2;

// Raggio di ricerca strade (5km)
maxDistance = 5000;

// Numero massimo tentativi
const maxAttempts = 50;
```

### Storage Personalizzato

Per usare un database invece di LocalStorage, modifica `js/roads.js`:

```javascript
saveToStorage() {
    // Implementa chiamata API
    fetch('/api/roads', {
        method: 'POST',
        body: JSON.stringify(this.roads)
    });
}
```

## 🐛 Risoluzione Problemi

### Le strade non vengono salvate
- Verifica che LocalStorage sia abilitato nel browser
- Controlla la console JavaScript per errori
- Svuota la cache e ricarica

### Il percorso non viene generato
- Assicurati di aver selezionato un punto di partenza
- Verifica che ci siano strade idonee salvate
- Prova a ridurre la distanza target
- Le strade devono essere abbastanza vicine tra loro (< 5km)

### File GPX non viene caricato
- Verifica che il file sia GPX valido
- Controlla che contenga tag `<trk>`, `<rte>` o `<wpt>`
- Alcuni GPX potrebbero avere encoding diverso

### La mappa non si carica
- Verifica connessione internet
- Controlla che i CDN siano raggiungibili
- Apri la console per vedere errori di rete

## 📊 Limitazioni Conosciute

- **Storage**: LocalStorage ha limite ~5-10MB (circa 1000+ strade)
- **Algoritmo**: Percorsi molto lunghi (>100km) potrebbero richiedere più tentativi
- **Browser**: Richiede browser moderno (ES6+)
- **Offline**: Richiede connessione per caricare tile mappa

## 🤝 Contribuire

Contributi sono benvenuti! Per modifiche importanti:

1. Fork il progetto
2. Crea un branch per la feature (`git checkout -b feature/NuovaFeature`)
3. Commit delle modifiche (`git commit -m 'Aggiunge NuovaFeature'`)
4. Push al branch (`git push origin feature/NuovaFeature`)
5. Apri una Pull Request

## 📝 TODO / Roadmap

- [ ] Backend per storage permanente
- [ ] Condivisione percorsi via URL
- [ ] Esportazione in altri formati (KML, GeoJSON)
- [ ] Overlay con dati meteo
- [ ] Calcolo dislivello
- [ ] Integrazione con Strava/Komoot
- [ ] PWA per uso offline
- [ ] Multi-lingua

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi il file `LICENSE` per dettagli.

## 🙏 Credits

- **OpenStreetMap Contributors** - Dati cartografici
- **CartoDB** - Tile server
- **Leaflet** - Libreria mappe
- **Mapbox** - toGeoJSON library

## 📧 Contatti

Per domande, suggerimenti o bug report:
- Apri una [Issue](https://github.com/tuousername/itinerari-ciclabili/issues)
- Contribuisci con una Pull Request

---

Creato con ❤️ per i ciclisti

**Buone pedalate! 🚴‍♂️🚴‍♀️**
