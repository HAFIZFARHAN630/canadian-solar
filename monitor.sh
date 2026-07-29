#!/bin/sh
# Lightweight monitor — checks every 8s that the Node process is
# listening on $PORT (default 3000) and restarts it if not.
cd "$(dirname "$0")"
while true; do
  if ! ss -tlnp 2>/dev/null | grep -q ":${PORT:-3000} "; then
    node .next/standalone/server.js </dev/null >/dev/null 2>&1 &
    echo "[$(date)] Restarted" >> server.log
  fi
  sleep 8
done
