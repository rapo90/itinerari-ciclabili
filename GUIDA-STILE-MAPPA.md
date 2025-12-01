# 🎨 Guida Personalizzazione Stile Mappa

Hai **3 opzioni** per personalizzare l'aspetto della mappa:

## ✅ Opzione 1: Stile Chiaro Standard (ATTUALE)

**Cosa hai ora**: Mappa OSM standard con sfondo chiaro

**Pro**:
- ✅ Funziona subito, nessuna configurazione
- ✅ Gratuito illimitato
- ✅ Nessuna API key necessaria

**Contro**:
- ❌ Non puoi cambiare i colori delle strade OSM
- ❌ Stile predefinito OSM

**File**: `js/map.js` (già attivo)

---

## 🚴 Opzione 2: Stile Ciclismo (CONSIGLIATO PER TE!)

**Cosa ottieni**: Mappe ottimizzate per ciclisti con:
- Piste ciclabili evidenziate
- Pendenze visualizzate
- Percorsi sterrati ben visibili
- Colori ottimizzati per il ciclismo

### Setup Rapido - CyclOSM (Gratuito, no API key)

Modifica `js/map.js` riga 23-27:

```javascript
// Sostituisci questo:
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {

// Con questo (CyclOSM):
L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors, CyclOSM',
    maxZoom: 20
}).addTo(this.map);
```

**CyclOSM include**:
- 🟤 Sentieri e sterrate ben visibili
- 🟢 Piste ciclabili evidenziate in verde
- 🔴 Pendenze indicate con colori
- 📏 Larghezza strade proporzionale all'importanza

### Setup Rapido - Thunderforest Cycle (API key gratuita)

1. Registrati su https://www.thunderforest.com/
2. Copia l'API key (25,000 richieste/mese gratis)
3. Modifica `js/map.js`:

```javascript
const THUNDERFOREST_API_KEY = 'TUA_API_KEY_QUI';

L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=' + THUNDERFOREST_API_KEY, {
    attribution: '&copy; Thunderforest, &copy; OpenStreetMap contributors',
    maxZoom: 22
}).addTo(this.map);
```

**Thunderforest Cycle include**:
- 🟤 Sentieri marroni
- 🟢 Piste ciclabili verdi
- 🔵 Strade principali ben definite
- 📍 Altimetria visualizzata

---

## 🎨 Opzione 3: Stile Completamente Personalizzato

**Cosa ottieni**: Controllo totale su OGNI colore e stile

**Requisiti**:
- API key MapTiler (100,000 visualizzazioni/mese GRATIS)
- Setup più complesso

### Setup Completo MapTiler

#### Step 1: Ottieni API Key

1. Vai su https://cloud.maptiler.com/
2. "Sign up for FREE"
3. Account → API Keys → Copia la chiave

#### Step 2: Attiva Versione Personalizzata

1. Apri `index-advanced.html` (lo creerò per te)
2. Inserisci la tua API key nel file
3. Personalizza i colori in `js/map-custom-style.js`

#### Step 3: Personalizza i Colori

Nel file `js/map-custom-style.js`, trovi le sezioni per ogni tipo di strada:

```javascript
// SENTIERI - Linea sottile
{
    "id": "path",
    "paint": {
        "line-color": "#8B6914",  // ← Cambia colore qui
        "line-width": 1.5          // ← Cambia larghezza qui
    }
},

// STERRATE - Sfondo marrone
{
    "id": "track",
    "paint": {
        "line-color": "#A0826D",   // ← Marrone sterrate
        "line-width": 4
    }
},

// PROVINCIALI - Bordo giallo
{
    "id": "tertiary_road_casing",
    "paint": {
        "line-color": "#FFD700",   // ← Giallo per provinciali
        "line-width": 12
    }
},

// STATALI - Bordo verde
{
    "id": "primary_road_casing",
    "paint": {
        "line-color": "#4CAF50",   // ← Verde per statali
        "line-width": 16
    }
}
```

---

## 🎯 Quale Scegliere?

### Per te consiglio: **Opzione 2 - CyclOSM** perché:
- ✅ **ZERO configurazione** - cambi 1 riga di codice
- ✅ **Gratuito** - nessun limite, no API key
- ✅ **Ottimizzato ciclismo** - vede bene sterrate, sentieri, ciclabili
- ✅ **Colori chiari** - sfondo chiaro come richiesto
- ✅ **Strade differenziate** - larghezza e colori proporzionali

---

## 🔄 Come Cambiare Stile Rapidamente

### Metodo 1: Modifica diretta (più semplice)

Apri `js/map.js` in VS Code, vai alla riga 23 e sostituisci l'URL delle tile.

### Metodo 2: Selettore stili (aggiungere UI)

Posso creare un menu a tendina nella sidebar per switchare tra stili in tempo reale.

Vuoi che aggiunga questa funzione?

---

## 🖼️ Anteprima Stili

### OSM Standard (attuale)
- Sfondo: Bianco/crema
- Strade: Tutte grigie/nere
- Stile: Minimalista

### CyclOSM (consigliato)
- Sfondo: Bianco/crema
- Sentieri: Marrone tratteggiato
- Sterrate: Marrone chiaro
- Ciclabili: Verde brillante
- Provinciali: Giallo
- Statali: Arancione/rosso
- Pendenze: Rosse (salita) / Verdi (discesa)

### Thunderforest Cycle
- Sfondo: Bianco/verde chiaro
- Massimo dettaglio piste ciclabili
- Indicatori pendenza
- Percorsi MTB evidenziati

### MapTiler Custom
- Sfondo: A tua scelta
- OGNI strada: Colore personalizzato
- OGNI elemento: Controllabile

---

## 📞 Prossimi Passi

**Dimmi cosa vuoi fare**:

1. 🚀 **"Attiva CyclOSM"** → Ti modifico il file per te (1 minuto)
2. 🔑 **"Voglio MapTiler custom"** → Ho la API key, configuralo
3. 🎮 **"Aggiungi selettore stili"** → Creo un menu per switchare stili
4. ℹ️ **"Mostrami esempi"** → Ti mostro screenshot/link degli stili

**Quale preferisci?** 🤔
