#!/usr/bin/env python3
"""
download_desenzano_cycleways.py - Scarica ciclabili OSM intorno a Desenzano del Garda

Esegui questo script per aggiornare i dati delle ciclabili:
    python3 download_desenzano_cycleways.py

I dati vengono salvati in: data/desenzano_cycleways.json
"""

import urllib.request
import urllib.error
import json
import time

# Coordinate Desenzano del Garda
DESENZANO_LAT = 45.4708
DESENZANO_LNG = 10.5395
RADIUS_KM = 50
RADIUS_METERS = RADIUS_KM * 1000

# Server Overpass alternativi
OVERPASS_SERVERS = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter'
]

# Query Overpass - SOLO piste ciclabili dedicate
QUERY_TEMPLATE = """
[out:json][timeout:300];
(
  // SOLO piste ciclabili dedicate
  way["highway"="cycleway"](around:{radius},{lat},{lng});

  // Sentieri SOLO con bicycle=designated (non "yes")
  way["highway"="path"]["bicycle"="designated"](around:{radius},{lat},{lng});

  // Strade con corsie ciclabili dedicate (track o lane)
  way["cycleway"~"track|lane|opposite_track|opposite_lane"](around:{radius},{lat},{lng});

  // Percorsi ciclabili ufficiali
  way["route"="bicycle"](around:{radius},{lat},{lng});
);
out geom;
"""

def download_cycleways():
    """Scarica ciclabili da Overpass API"""

    query = QUERY_TEMPLATE.format(
        radius=RADIUS_METERS,
        lat=DESENZANO_LAT,
        lng=DESENZANO_LNG
    )

    query_bytes = query.encode('utf-8')

    print('=' * 70)
    print('🚴 Download Ciclabili OSM - Desenzano del Garda')
    print('=' * 70)
    print(f'📍 Centro: {DESENZANO_LAT}°N, {DESENZANO_LNG}°E')
    print(f'📏 Raggio: {RADIUS_KM} km (Area: ~{3.14159 * RADIUS_KM**2:.0f} km²)')
    print(f'⚠️  ATTENZIONE: Query su area molto grande, può richiedere 1-3 minuti!')
    print('=' * 70)
    print()

    # Prova ogni server finché uno funziona
    for i, server_url in enumerate(OVERPASS_SERVERS):
        server_name = server_url.split('/')[2]
        print(f'🌐 Tentativo {i+1}/{len(OVERPASS_SERVERS)}: {server_name}')
        print(f'   Query size: {len(query_bytes)} bytes')

        try:
            start_time = time.time()

            # Crea richiesta
            req = urllib.request.Request(
                server_url,
                data=query_bytes,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'ItinerariCiclabili/1.0'
                },
                method='POST'
            )

            print(f'   ⏳ Invio richiesta... (timeout 300s)')

            # Invia richiesta
            with urllib.request.urlopen(req, timeout=300) as response:
                response_data = response.read()
                elapsed = time.time() - start_time

                print(f'   ✅ Risposta ricevuta in {elapsed:.1f}s')
                print(f'   📦 Dimensione: {len(response_data):,} bytes ({len(response_data)/1024:.1f} KB)')

                # Parse JSON
                data = json.loads(response_data)
                elements = data.get('elements', [])

                print(f'   🛣️  Elementi trovati: {len(elements)}')
                print()

                return data

        except urllib.error.HTTPError as e:
            elapsed = time.time() - start_time
            print(f'   ❌ HTTPError {e.code} dopo {elapsed:.1f}s: {e.reason}')
            print()

            if i == len(OVERPASS_SERVERS) - 1:
                print('💥 ERRORE: Tutti i server hanno fallito!')
                return None

        except urllib.error.URLError as e:
            elapsed = time.time() - start_time
            print(f'   ❌ URLError dopo {elapsed:.1f}s: {e.reason}')
            print()

            if i == len(OVERPASS_SERVERS) - 1:
                print('💥 ERRORE: Tutti i server hanno fallito!')
                return None

        except Exception as e:
            elapsed = time.time() - start_time
            print(f'   ❌ Errore dopo {elapsed:.1f}s: {type(e).__name__}: {e}')
            print()

            if i == len(OVERPASS_SERVERS) - 1:
                print('💥 ERRORE: Tutti i server hanno fallito!')
                return None

    return None

def save_to_json(data, filename='data/desenzano_cycleways.json'):
    """Salva dati in file JSON"""

    print('💾 Salvataggio dati...')

    # Aggiungi metadata
    output = {
        'metadata': {
            'center': {'lat': DESENZANO_LAT, 'lng': DESENZANO_LNG},
            'radius_km': RADIUS_KM,
            'download_date': time.strftime('%Y-%m-%d %H:%M:%S'),
            'elements_count': len(data.get('elements', []))
        },
        'data': data
    }

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    file_size = len(json.dumps(output))
    print(f'   ✅ Salvato in: {filename}')
    print(f'   📦 Dimensione file: {file_size:,} bytes ({file_size/1024:.1f} KB)')
    print()

def main():
    # Download
    data = download_cycleways()

    if data is None:
        print('❌ Download fallito!')
        return 1

    # Salva
    save_to_json(data)

    print('=' * 70)
    print('✅ COMPLETATO!')
    print('=' * 70)
    print()
    print('📋 Prossimi passi:')
    print('   1. L\'app caricherà automaticamente questi dati all\'avvio')
    print('   2. Le ciclabili saranno colorate di verde più scuro')
    print('   3. Puoi rieseguire questo script per aggiornare i dati')
    print()

    return 0

if __name__ == '__main__':
    exit(main())
