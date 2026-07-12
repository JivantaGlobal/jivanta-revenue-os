#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

class SPARequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Extract path without query parameters or hash fragments
        clean_path = self.path.split('?')[0].split('#')[0]
        
        # Map to filesystem path
        filepath = os.path.join(os.getcwd(), clean_path.lstrip('/'))
        
        # If the file does not exist and has no dot in the filename (meaning it's an SPA route like /login),
        # serve the index.html fallback.
        if not os.path.exists(filepath) and '.' not in os.path.basename(clean_path):
            self.path = '/index.html'
            
        return super().do_GET()

# Ensure we use the proper class and allow address reuse
socketserver.TCPServer.allow_reuse_address = True
handler = SPARequestHandler

print(f"  ⚡ Jivanta Global Revenue OS Server")
print(f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(f"  Listening on: http://localhost:{PORT}")
print(f"  Press Ctrl+C to stop.")
print("")

try:
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nStopping server...")
    sys.exit(0)
