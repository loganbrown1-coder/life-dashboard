#!/bin/bash
# launch-dashboard.command
# Double-click this file to start Life Dashboard.
# It starts the Next.js server in the background, waits until it's ready,
# then opens the Tauri app (or falls back to the browser).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="/Applications/Life Dashboard.app"
BROWSER_FALLBACK="http://localhost:3000"
PORT=3000

cd "$SCRIPT_DIR" || exit 1

# ── 1. Kill any existing server on port 3000 ──────────────────────────────────
if lsof -ti tcp:$PORT &>/dev/null; then
  echo "Stopping existing server on port $PORT…"
  kill $(lsof -ti tcp:$PORT) 2>/dev/null
  sleep 1
fi

# ── 2. Start the Next.js production server ────────────────────────────────────
echo "Starting Life Dashboard server…"
npm run start > /tmp/life-dashboard.log 2>&1 &
SERVER_PID=$!

# ── 3. Wait until localhost:3000 responds (up to 30 seconds) ─────────────────
echo "Waiting for server to be ready…"
for i in $(seq 1 30); do
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    echo "Server ready."
    break
  fi
  sleep 1
done

# ── 4. Open the app ───────────────────────────────────────────────────────────
if [ -d "$APP_PATH" ]; then
  open "$APP_PATH"
else
  echo "Tauri app not found at $APP_PATH — opening in browser instead."
  open "$BROWSER_FALLBACK"
fi
