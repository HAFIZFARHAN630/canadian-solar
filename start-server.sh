#!/bin/bash
# Start the Next.js standalone server using Node.js (not bun).
# On cPanel, you typically do NOT need this — cPanel's Passenger
# handles process management. Use this script only for direct
# VPS / shell deployments.
cd "$(dirname "$0")"
while true; do
  node .next/standalone/server.js
  echo "[$(date)] Server exited, restarting in 1s..." >> server.log
  sleep 1
done
