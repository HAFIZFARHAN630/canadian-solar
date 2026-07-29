# cPanel Deployment Guide — Canadian Solar Module Authenticity

This guide walks you through deploying the Next.js app to a cPanel-hosted
server using the **Setup Node.js App** feature (Cloudlinux + Phusion
Passenger).

---

## 0. Prerequisites on cPanel

| Requirement | Why |
|---|---|
| **Setup Node.js App** icon in cPanel | Required to run Node apps |
| Node.js **18.x or 20.x** available | Next.js 16 needs Node >= 18 |
| SSH / File Manager access | To upload files & set permissions |
| A subdomain or domain pointed at cPanel | e.g. `canadian-solar.yourdomain.com` |
| **SQLite enabled** OR a MySQL database | This app ships with SQLite; you can also switch (see §6) |

> **Shared-hosting caveat**: many cPanel shared plans block long-running
> Node processes or `node_modules` installs over a few thousand files.
> If the install times out, use a VPS or build locally and upload
> `.next/standalone` (which already contains only the minimal
> node_modules needed).

---

## 1. Build the deployment package (on your local machine)

```bash
git clone https://github.com/clicktaketechnologies/canadian-solar.git
cd canadian-solar
bash cpanel-build.sh
```

This produces `cpanel-deploy.zip` (~100 MB) containing everything needed:
```
cpanel-deploy/
├── app.js                 # cPanel Passenger entry point
├── server.js              # Next.js standalone server
├── package.json
├── .env.example
├── .next/                 # static + server chunks (built)
├── node_modules/          # minimal, traced by Next.js
├── public/                # static assets
├── prisma/schema.prisma
├── db/                    # empty; SQLite DB will be created here
├── restart.sh
└── DEPLOY-CPANEL.md
```

---

## 2. Upload to cPanel

1. Log in to **cPanel**.
2. Open **File Manager** → navigate to your home directory
   (e.g. `/home/USERNAME/`).
3. Click **Upload** and select `cpanel-deploy.zip`.
4. After upload, **Extract** the zip. Rename the extracted folder to
   `canadian-solar`. Final path should be:
   ```
   /home/USERNAME/canadian-solar/
   ```
5. **Important**: move the `db/` folder **outside the web root** so it
   cannot be downloaded. The default layout already keeps it next to
   (not inside) `public_html`, which is safe. If you ever move it,
   update `DATABASE_URL` accordingly.

---

## 3. Configure environment variables

1. In File Manager, go into `/home/USERNAME/canadian-solar/`.
2. Copy `.env.example` → `.env` (use cPanel's Copy function).
3. Edit `.env` and set:

   ```env
   DATABASE_URL=file:/home/USERNAME/canadian-solar/db/custom.db
   NEXTAUTH_SECRET=<run: openssl rand -base64 32>
   NEXTAUTH_URL=https://canadian-solar.yourdomain.com
   NODE_ENV=production
   ```

4. **Save**.

---

## 4. Initialize the database

The app uses Prisma + SQLite. After the first deploy you must do **two** steps,
in this order, or `/api/seed` will return HTTP 500:

1. **Create the schema** (creates all tables in the SQLite file) — required once.
2. **Seed sample data + default admin** (creates the `admin / admin123` user,
   12 sample solar modules, query logs, and default site settings).

### Option A — via SSH (preferred)

Run from the project root (`/home/USERNAME/canadian-solar`):

```bash
cd /home/USERNAME/canadian-solar

# Step 1 — create tables (REQUIRED, do not skip)
node node_modules/prisma/build/index.js db push

# Step 2 — seed sample data + default admin
#   Either hit the endpoint:
curl -X POST https://canadian-solar.yourdomain.com/api/seed
#   Or click the "Seed Database" button inside the admin panel.
```

### Option B — via the browser (only if SSH is unavailable)

> ⚠️ The seed endpoint **requires the schema to already exist**.
> Prisma does NOT auto-create tables on first query.
> If you cannot run `prisma db push` via SSH, ask your host to run it for you,
> or use the cPanel "Run NPM Script" / Terminal feature to run:
> `node node_modules/prisma/build/index.js db push`

Once the schema exists, seed via:
```
POST https://canadian-solar.yourdomain.com/api/seed
```
(Method is **POST**, not GET — a GET will return HTTP 405.)

### Verify it worked
- Visit `https://canadian-solar.yourdomain.com/` — homepage should load.
- Visit `https://canadian-solar.yourdomain.com/admin` — login page.
- Login with `admin` / `admin123` — should succeed.
- **Change the admin password immediately after first login.**

> **Security**: After seeding, remove or protect the `/api/seed` route
> if you don't want it accessible publicly.

---

## 5. Register the Node.js app in cPanel

1. In cPanel, open **Setup Node.js App**.
2. Click **Create Application**.
3. Fill in:
   | Field | Value |
   |---|---|
   | **Node.js version** | 18.x or 20.x |
   | **Application mode** | Production |
   | **Application root** | `canadian-solar` |
   | **Application URL** | `canadian-solar.yourdomain.com` (or your domain) |
   | **Application startup file** | `app.js` |
4. **Environment variables** — you can also set them here instead of in
   `.env`. Recommended:
   - `NODE_ENV=production`
   - `NEXTAUTH_SECRET=<random>`
   - `NEXTAUTH_URL=https://canadian-solar.yourdomain.com`
   - `DATABASE_URL=file:/home/USERNAME/canadian-solar/db/custom.db`
5. Click **Create**.
6. cPanel will install npm dependencies automatically if `package.json`
   is present. With standalone build, dependencies are already
   bundled in `node_modules/`, so this step is fast.
7. Click **Run NPM Install** if prompted (it will skip most deps).
8. Click **Start App**.

The app should now be live at your Application URL.

---

## 6. Common issues

### 6.1 App shows "502 Bad Gateway" or "503 Service Unavailable"
- Check the **Passenger log** in cPanel → **Terminal** or
  **Metrics → Errors**.
- Most common cause: `.env` not loaded, or `DATABASE_URL` pointing to
  a non-writable directory.
- Fix: ensure `/home/USERNAME/canadian-solar/db/` exists and is
  writable by the user.

### 6.2 Prisma throws `SchemaValidation` / `relation` errors
- The Prisma client is pre-generated in `node_modules/@prisma/client`.
  If you change `schema.prisma` on the server, re-run:
  ```bash
  cd /home/USERNAME/canadian-solar
  node node_modules/prisma/build/index.js generate
  node node_modules/prisma/build/index.js db push
  ```
  Then restart the app from cPanel.

### 6.3 Switch to MySQL (recommended for shared hosting)
SQLite can have file-locking issues under concurrent load on NFS
filesystems used by some cPanel hosts. To switch to MySQL:

1. In cPanel → **MySQL Databases**, create a DB + user. Grant all
   privileges.
2. Edit `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```
3. Update `.env`:
   ```
   DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/DBNAME
   ```
4. Run `npx prisma generate && npx prisma db push` on the server.
5. Restart the app.

### 6.4 Admin login
Default credentials (created by the seed script):
- Username: `admin`
- Password: `admin123`

**Change this immediately** after first login via
`/admin` → Settings, or by hitting the password-reset endpoint.

### 6.5 Cron / keepalive (optional)
Some cPanel hosts kill idle Node processes. To keep the app alive:
1. cPanel → **Cron Jobs**.
2. Add a job every 5 minutes:
   ```
   */5 * * * * /home/USERNAME/canadian-solar/restart.sh
   ```

---

## 7. Updating the app

To deploy a new version:
1. Pull latest code locally and run `bash cpanel-build.sh`.
2. Upload the new `cpanel-deploy.zip` to cPanel.
3. Extract over the existing `canadian-solar/` folder.
4. In cPanel → **Setup Node.js App** → click **Restart**.

---

## 8. Quick troubleshooting checklist

- [ ] `app.js` is at `/home/USERNAME/canadian-solar/app.js`
- [ ] `server.js` is at `/home/USERNAME/canadian-solar/server.js`
- [ ] `.next/` folder exists (built output)
- [ ] `.env` exists and `DATABASE_URL` points to a writable path
- [ ] `db/` directory exists and is writable
- [ ] Node.js version in cPanel matches what built the app
- [ ] Application startup file = `app.js`
- [ ] No syntax errors in Passenger log (cPanel → Errors)
