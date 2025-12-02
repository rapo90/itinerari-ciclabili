#!/usr/bin/env python3
"""
proxy.py - Server HTTP con proxy CORS per Overpass API
Risolve il problema CORS permettendo al browser di comunicare con Overpass API
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import urllib.error
import json

class CORSProxyHandler(SimpleHTTPRequestHandler):
    """Handler che serve file statici E fa da proxy per Overpass API"""

    # Server Overpass alternativi (stessa lista di osmCycleways.js)
    OVERPASS_SERVERS = [
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass-api.de/api/interpreter',
        'https://overpass.openstreetmap.ru/api/interpreter'
    ]

    def end_headers(self):
        """Aggiungi header CORS a tutte le risposte"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        """Gestisci richieste OPTIONS (preflight CORS)"""
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        """Gestisci richieste POST - proxy per Overpass API"""
        if self.path == '/api/overpass':
            self.proxy_overpass_request()
        else:
            # Se non è per il proxy, gestisci normalmente
            super().do_POST()

    def proxy_overpass_request(self):
        """Inoltra richiesta a Overpass API con retry su server alternativi"""
        # Leggi il body della richiesta (query Overpass)
        content_length = int(self.headers.get('Content-Length', 0))
        query_body = self.rfile.read(content_length)

        print(f'🔄 Proxy: Inoltro richiesta Overpass ({len(query_body)} bytes)')

        # Prova ogni server finché uno funziona
        for i, server_url in enumerate(self.OVERPASS_SERVERS):
            try:
                print(f'   Tentativo {i+1}/{len(self.OVERPASS_SERVERS)}: {server_url.split("/")[2]}')

                # Crea richiesta verso Overpass
                req = urllib.request.Request(
                    server_url,
                    data=query_body,
                    headers={
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'ItinerariCiclabili/1.0'
                    },
                    method='POST'
                )

                # Invia richiesta (timeout 180s come in osmCycleways.js)
                with urllib.request.urlopen(req, timeout=180) as response:
                    # Leggi risposta
                    response_data = response.read()

                    print(f'   ✅ Risposta ricevuta da {server_url.split("/")[2]} ({len(response_data)} bytes)')

                    # Invia risposta al browser
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response_data)
                    return

            except urllib.error.HTTPError as e:
                print(f'   ⚠️  HTTPError {e.code}: {e.reason}')
                if i == len(self.OVERPASS_SERVERS) - 1:
                    # Ultimo tentativo fallito
                    self.send_error(502, f'Tutti i server Overpass non disponibili (ultimo errore: {e.code})')
                    return

            except urllib.error.URLError as e:
                print(f'   ⚠️  URLError: {e.reason}')
                if i == len(self.OVERPASS_SERVERS) - 1:
                    self.send_error(504, 'Timeout o errore di connessione con tutti i server Overpass')
                    return

            except Exception as e:
                print(f'   ⚠️  Errore generico: {type(e).__name__}: {e}')
                if i == len(self.OVERPASS_SERVERS) - 1:
                    self.send_error(500, f'Errore proxy: {type(e).__name__}')
                    return

def run_server(port=8000):
    """Avvia il server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSProxyHandler)

    print('=' * 60)
    print('🚴 Itinerari Ciclabili - Server CORS Proxy')
    print('=' * 60)
    print(f'🌐 Server HTTP:        http://localhost:{port}')
    print(f'🔄 Proxy Overpass:     http://localhost:{port}/api/overpass')
    print('📁 Servendo file da:', httpd.server_name if hasattr(httpd, 'server_name') else 'directory corrente')
    print('=' * 60)
    print('💡 Premi Ctrl+C per fermare il server')
    print('=' * 60)
    print()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\n👋 Server fermato')
        httpd.server_close()

if __name__ == '__main__':
    run_server(8000)
