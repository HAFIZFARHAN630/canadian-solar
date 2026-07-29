# Canadian Solar — Module Authenticity Verification

A Next.js 16 web application that lets end-users verify the authenticity
of Canadian Solar (CSI Solar) photovoltaic modules by serial number,
plus an admin panel for managing the module database and reviewing
query logs.

## Features

### Public verification page
- Serial-number lookup with SVG captcha
- Pixel-perfect clone of the official CSI Solar verification UI
- Three result modal types: success (full module info),
  not-found, and Pakistan-specific anti-counterfeit check
- Dark gradient background with the official Canadian Solar logo

### Admin panel (`/admin`)
- Dashboard with 8 stat cards and 4 Recharts visualizations
- Modules CRUD with search, pagination, add / edit / delete,
  CSV import / export
- Query logs with filter, search, and pagination
- Site settings with toggle switches and text inputs
- Responsive sidebar + mobile bottom tab bar

### Backend
- Next.js Route Handlers under `src/app/api/`
- Prisma ORM with SQLite (swappable for MySQL, see
  `DEPLOY-CPANEL.md` §6.3)
- `bcryptjs` password hashing for admin login
- `next-auth` for session management

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix primitives |
| Charts | Recharts 2 |
| Forms | react-hook-form + zod |
| ORM | Prisma 6 |
| Database | SQLite (file-based) — swap to MySQL for production |
| Runtime | Node.js 18+ (Bun also supported for dev) |

## Quick start (development)

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
# open http://localhost:3000
```

To seed sample data: visit `http://localhost:3000/api/seed` once.

Default admin credentials:
- URL: `http://localhost:3000/admin`
- Username: `admin`
- Password: `admin123`

**Change these immediately in production.**

## Production build

```bash
npm run build
npm start
```

The build produces a self-contained `.next/standalone/` directory that
includes only the Node modules actually used by the app — ideal for
deployment to constrained environments like cPanel shared hosting.

## Deploying to cPanel

See **[DEPLOY-CPANEL.md](./DEPLOY-CPANEL.md)** for the full
step-by-step guide. Summary:

```bash
bash cpanel-build.sh        # produces cpanel-deploy.zip
# upload zip via cPanel File Manager
# Setup Node.js App -> Create Application
#   Application root: canadian-solar
#   Startup file: app.js
#   Node version: 18.x or 20.x
```

## Project structure

```
.
├── src/
│   ├── app/
│   │   ├── page.tsx              # public verification page
│   │   ├── admin/page.tsx        # admin panel
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── captcha/          # SVG captcha generator
│   │       ├── query-module/     # serial-number verification
│   │       ├── verify-code/      # anti-counterfeit check
│   │       ├── seed/             # one-time sample data
│   │       └── admin/            # login, modules, logs, stats, settings
│   ├── components/ui/            # shadcn/ui primitives
│   ├── hooks/
│   └── lib/
│       ├── db.ts                 # Prisma client singleton
│       └── utils.ts
├── prisma/schema.prisma          # 5 models: AdminUser, SolarModule, QueryLog, CaptchaStore, SiteSetting
├── public/                       # bg_chaxun.jpg, enlogo.png, chaxun_ma.jpg, ...
├── app.js                        # cPanel Passenger entry point
├── cpanel-build.sh               # build + package for cPanel
├── DEPLOY-CPANEL.md              # deployment guide
├── next.config.ts
├── package.json
└── tailwind.config.ts
```

## Security notes

- `bcryptjs` is used for admin password hashing (10 rounds).
- The `/api/seed` endpoint is publicly accessible — disable it after
  initial setup by deleting the file or wrapping it with an admin
  auth check.
- Change `NEXTAUTH_SECRET` and the default `admin` password before
  going live.
- The SQLite database file (`db/custom.db`) is git-ignored. Never
  commit it.

## License

Proprietary — Canadian Solar / ClickTake Technologies.
