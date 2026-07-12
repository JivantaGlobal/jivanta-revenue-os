#!/bin/bash
# ============================================
# Jivanta Global Revenue OS — Launch Script
# ============================================
# Starts a local Python HTTP server and opens
# the CRM in your default browser.
# ============================================

PORT=${1:-8080}
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ⚡ Jivanta Global Revenue OS"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Starting server on port $PORT..."
echo "  Dashboard: http://localhost:$PORT"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

# Open browser after a short delay
(sleep 1 && open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null) &

# Start Python HTTP server
cd "$DIR"
python3 server.py "$PORT"
