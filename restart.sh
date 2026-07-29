#!/bin/bash
# Restart the Next.js server if it's not running on port 3000.
# Designed for cron-based keepalive on a VPS or cPanel server with
# shell access. On cPanel shared hosting, use the "Restart" button
# in the Setup Node.js App UI instead.
cd "$(dirname "$0")"
if ! ss -tlnp 2>/dev/null | grep -q ":${PORT:-3000} "; then
  setsid node .next/standalone/server.js </dev/null >/dev/null 2>&1 &
  disown
  echo "[$(date)] Started server" >> server.log
fi
