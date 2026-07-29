/**
 * cPanel / Phusion Passenger entry point for the
 * Canadian Solar Module Authenticity app (Next.js standalone build).
 *
 * ------------------------------------------------------------------
 * HOW cPanel RUNS NODE.JS APPS
 * ------------------------------------------------------------------
 * cPanel's "Setup Node.js App" feature uses Phusion Passenger.
 * Passenger sets `process.env.PORT` and expects the startup file
 * to start an HTTP server listening on that port. Passenger then
 * reverse-proxies Apache -> your app.
 *
 * This file:
 *   1. Loads .env from disk (standalone server.js does NOT do this)
 *   2. Sets sensible production defaults
 *   3. Locates and requires the Next.js standalone server.js
 *
 * Layouts supported:
 *   Production (cpanel-deploy/):
 *     ./app.js
 *     ./server.js
 *     ./.next/
 *     ./public/
 *     ./.env
 *
 *   Development (project root):
 *     ./app.js
 *     ./.env
 *     ./.next/standalone/server.js
 *     ./.next/standalone/.env
 * ------------------------------------------------------------------
 */

const path = require('path');
const fs = require('fs');

// --- 1. Load .env from disk (try several candidate locations) ---
const envCandidates = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '.next', 'standalone', '.env'),
];

function loadDotenv(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
  console.log('[app.js] Loaded env from', file);
}

for (const f of envCandidates) loadDotenv(f);

// --- 2. Apply defaults ---
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

// --- 3. Locate the standalone server.js ---
const serverCandidates = [
  path.join(__dirname, 'server.js'),                          // production: cpanel-deploy/
  path.join(__dirname, '.next', 'standalone', 'server.js'),   // development: project root
];

let standaloneServer = null;
for (const candidate of serverCandidates) {
  if (fs.existsSync(candidate)) {
    standaloneServer = candidate;
    break;
  }
}

if (!standaloneServer) {
  console.error('FATAL: server.js not found in any of:');
  serverCandidates.forEach(c => console.error('  - ' + c));
  console.error('Did you run `npm run build`?');
  console.error('See DEPLOY-CPANEL.md for the full deployment procedure.');
  process.exit(1);
}

if (standaloneServer !== path.join(__dirname, 'server.js')) {
  process.chdir(path.dirname(standaloneServer));
}

console.log('[app.js] Starting Next.js standalone server:', standaloneServer);
console.log('[app.js] PORT=' + process.env.PORT + ' HOSTNAME=' + process.env.HOSTNAME +
            ' NODE_ENV=' + process.env.NODE_ENV);
console.log('[app.js] DATABASE_URL=' + (process.env.DATABASE_URL || '(not set)'));

require(standaloneServer);
