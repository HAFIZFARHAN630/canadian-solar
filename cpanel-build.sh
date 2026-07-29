#!/usr/bin/env bash
# =====================================================================
# cpanel-build.sh
# ---------------------------------------------------------------------
# Builds the Next.js app and assembles a deployment-ready folder that
# can be uploaded to cPanel's "Setup Node.js App" directory.
#
# Output: ./cpanel-deploy/   (zipped as ./cpanel-deploy.zip)
#
# Usage:
#   bash cpanel-build.sh         # build + zip
#   bash cpanel-build.sh --no-zip  # build only
# =====================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$ROOT_DIR/cpanel-deploy"
STANDALONE_DIR="$ROOT_DIR/.next/standalone"

cd "$ROOT_DIR"

echo "==> [1/5] Installing dependencies (npm ci)..."
npm ci

echo "==> [2/5] Generating Prisma client..."
npx prisma generate

echo "==> [3/5] Running Next.js production build..."
npm run build

echo "==> [4/5] Assembling cpanel-deploy/ folder..."
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# 1. Standalone server (server.js + minimal node_modules + .next)
cp -r "$STANDALONE_DIR/." "$OUT_DIR/"

# 2. Prisma schema (needed for any prisma CLI usage on server)
mkdir -p "$OUT_DIR/prisma"
cp "$ROOT_DIR/prisma/schema.prisma" "$OUT_DIR/prisma/"

# 3. Empty db dir for SQLite (must be writable on server)
mkdir -p "$OUT_DIR/db"

# 4. cPanel Passenger entry point
cp "$ROOT_DIR/app.js" "$OUT_DIR/app.js"

# 5. package.json (cPanel may use it for npm install)
cp "$ROOT_DIR/package.json" "$OUT_DIR/package.json"

# 6. Example env (server admin copies to .env and edits)
cp "$ROOT_DIR/.env.example" "$OUT_DIR/.env.example"

# 7. Deployment README
cp "$ROOT_DIR/DEPLOY-CPANEL.md" "$OUT_DIR/DEPLOY-CPANEL.md"

# 8. Restart / keepalive helper scripts
cp "$ROOT_DIR/restart.sh" "$OUT_DIR/restart.sh" 2>/dev/null || true

echo "==> [5/5] Build complete."
echo ""
echo "Output folder: $OUT_DIR"
du -sh "$OUT_DIR" || true
echo ""
if [[ "${1:-}" != "--no-zip" ]]; then
  echo "Zipping..."
  (cd "$ROOT_DIR" && zip -rq cpanel-deploy.zip cpanel-deploy/)
  echo "Zip created: $ROOT_DIR/cpanel-deploy.zip"
  ls -lh "$ROOT_DIR/cpanel-deploy.zip"
fi
echo ""
echo "Next steps: see DEPLOY-CPANEL.md"
