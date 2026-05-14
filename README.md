# Off Court

```
   ___  __  __    ____                  __
  / _ \/ _|/ _|  / ___|___  _   _ _ __/ /_
 | | | |_  |_   | |   / _ \| | | | '__| __|
 | |_| |  _|  _|| |__| (_) | |_| | |  | |_
  \___/|_| |_|   \____\___/ \__,_|_|   \__|
```

**Premium Sports and Wellness Club Platform**

> Bengaluru's flagship multi-sport wellness destination — launching June 2026.

---

## Overview

Off Court is a full-stack club management platform powering a premium sports and wellness facility in Bengaluru. It covers every touchpoint of the member journey: WhatsApp-first onboarding, court and treatment bookings, AI-assisted concierge, real-time sport analytics, wellness programmes, and back-office operations — all in a single monorepo.

| | |
|---|---|
| **Location** | Bengaluru, Karnataka, India |
| **Launch Target** | June 2026 |
| **Stack** | React 18 · Express 5 · PostgreSQL · Socket.IO |
| **AI** | Claude (`claude-haiku-4-5`) via Anthropic SDK |
| **Payments** | Razorpay |
| **Auth** | OTP (MSG91) · Google OAuth · Microsoft OAuth |

---

## Features

### Member Experience
- **WhatsApp Concierge** — AI-powered conversational assistant handles bookings, FAQs, and notifications via Meta Cloud API
- **Booking Engine** — Court, treatment, and class reservations with real-time slot availability
- **Credits & Wallet** — Pre-paid credit packs, auto-deduction, balance alerts
- **Community Feed** — Member activity wall, challenges, and social engagement

### Sports
- **CV Pipeline** — Computer-vision frame analysis for tennis, padel, and squash
- **Automated Line Calls** — Real-time in/out decisions streamed to players
- **Performance Analytics** — Shot charts, rally stats, trend graphs
- **Tournament Brackets** — Single/double-elimination draw management with live score updates

### Wellness
- **Treatment Bookings** — Physiotherapy, massage, and recovery suite scheduling
- **Combo Packages** — Bundled sport + wellness programmes
- **Group Classes** — Yoga, Pilates, and conditioning class timetables with instructor assignment

### Operations
- **Housekeeping Module** — Task assignment, completion tracking, and court-ready status
- **Valet Management** — Vehicle entry/exit log and slot allocation
- **Kitchen & F&B** — Menu, orders, and tab management for the club restaurant
- **Compliance Dashboard** — Regulatory checklists, document expiry tracking
- **IoT Integration** — Court lighting, HVAC, and access-control event streams

### Financial
- **P&L Dashboard** — Revenue, expense, and margin reporting by department
- **GST Compliance** — Automated invoice generation with HSN/SAC codes
- **Payroll** — Staff attendance, leaves, and salary computation

### Growth
- **AR Wayfinding** — Dijkstra-based turn-by-turn navigation overlaid on venue SVG maps
- **Health Analytics** — Wellness score derived from CV-captured movement and biometric data
- **Activity Marketplace** — Browse, purchase, and review third-party programmes and experiences

---

## Tech Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18.x | UI framework |
| TypeScript | 5.x (strict) | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| Zustand | 5.x | Client state management |
| wouter | 3.x | Lightweight SPA routing |
| Vite | 6.x | Dev server and bundler |

### Backend
| Package | Version | Purpose |
|---|---|---|
| Express | 5.x | HTTP server |
| Drizzle ORM | 0.38.x | Type-safe database queries |
| PostgreSQL | 16.x | Primary data store |
| ioredis | 5.x | Session cache and pub/sub |

### Real-time
| Package | Purpose |
|---|---|
| Socket.IO 4.x | Bidirectional event streaming (live scores, IoT, booking updates) |

### AI
| Service | Model | Use cases |
|---|---|---|
| Anthropic Claude | `claude-haiku-4-5` | WhatsApp concierge responses, marketing copy generation |

### Integrations
| Service | Purpose |
|---|---|
| Meta Cloud API | WhatsApp Business messaging (HSM templates + webhooks) |
| Razorpay | Payment gateway, subscriptions, payouts |
| MSG91 | OTP delivery for phone-based authentication |
| Google OAuth 2.0 | SSO for members and staff |
| Microsoft OAuth (MSAL) | SSO for corporate accounts |
| Google Maps | Venue maps and AR wayfinding base layer |
| Spatial OS | AR spatial anchor management |

---

## Project Structure

```
platform/                          ← monorepo root (pnpm workspaces)
├── apps/
│   └── off-court/
│       ├── src/
│       │   ├── components/        ← 35 React UI components
│       │   ├── routes/            ← Express route handlers
│       │   ├── services/          ← 35 business-logic service modules
│       │   ├── db/                ← Drizzle schema, migrations, seeds
│       │   ├── middleware/        ← Auth, rate-limit, webhook-verify
│       │   ├── App.tsx            ← Root React component
│       │   ├── client.tsx         ← Vite client entry
│       │   └── index.ts           ← Express server entry
│       ├── dist/                  ← Build output (gitignored)
│       ├── .env.example           ← Environment variable template
│       ├── LAUNCH-CHECKLIST.md    ← Pre-launch task list
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── tailwind.config.ts
├── packages/                      ← Shared packages (reserved)
├── pnpm-workspace.yaml
└── package.json
```

---

## Getting Started

### Prerequisites
- **Node.js** ≥ 20 LTS
- **pnpm** ≥ 11 (`npm install -g pnpm`)
- **PostgreSQL** 16 running locally or via connection string
- **Redis** (optional for local dev — disable in config if not needed)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/platform.git
cd platform

# 2. Install all workspace dependencies
pnpm install

# 3. Configure environment variables
cp apps/off-court/.env.example apps/off-court/.env
# Edit apps/off-court/.env — see Environment Variables section below

# 4. Run database migrations
cd apps/off-court
pnpm drizzle-kit migrate

# 5. Start the development server
pnpm dev
```

The app will be available at `http://localhost:5173` (Vite) with the API server at `http://localhost:3000`.

---

## Environment Variables

Copy `apps/off-court/.env.example` to `apps/off-court/.env` and fill in the values below.

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgres://user:pass@host/db`) | Your DB provider or local Postgres |
| `PORT` | Express server port (default `3000`) | Set to any available port |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude AI features | [console.anthropic.com](https://console.anthropic.com) |
| `REDIS_URL` | Redis connection string (`redis://localhost:6379`) | Local Redis or Upstash |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token you choose | Meta App Dashboard → Webhooks |
| `WHATSAPP_APP_SECRET` | App secret for request signature validation | Meta App Dashboard → Settings |
| `WHATSAPP_PHONE_NUMBER_ID` | Numeric ID of the WhatsApp Business number | Meta App Dashboard → WhatsApp → Phone Numbers |
| `WHATSAPP_ACCESS_TOKEN` | Permanent or temporary access token | Meta App Dashboard → WhatsApp → API Setup |
| `MSG91_AUTH_KEY` | API key for OTP SMS delivery | [msg91.com](https://msg91.com) → API Keys |
| `MSG91_OTP_TEMPLATE_ID` | Approved DLT OTP template ID | MSG91 → Templates |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret | Google Cloud Console → Credentials |
| `MICROSOFT_CLIENT_ID` | Azure AD application (client) ID | Azure Portal → App Registrations |
| `MICROSOFT_CLIENT_SECRET` | Azure AD client secret value | Azure Portal → App Registrations → Certificates & Secrets |
| `OAUTH_REDIRECT_BASE_URL` | Base URL for OAuth callback (e.g. `https://offcourt.club`) | Your domain |
| `SPATIAL_OS_API_URL` | Spatial OS endpoint for AR anchor management | Spatial OS dashboard |
| `SPATIAL_OS_API_KEY` | Spatial OS API key | Spatial OS dashboard |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key (client-side) | Google Cloud Console → APIs & Services |

> **Never commit `.env` to version control.** The file is listed in `.gitignore`.

---

## Deployment

The production environment runs on a **Hetzner dedicated server** (Bengaluru region) with the following stack:

- **OS:** Ubuntu 22.04 LTS
- **Process manager:** PM2
- **Reverse proxy:** nginx with Let's Encrypt TLS
- **Domain:** offcourt.club

### Build & Start

```bash
# Build
cd apps/off-court
pnpm build

# Start with PM2
pm2 start dist/index.js --name off-court --env production
pm2 save
pm2 startup
```

### PM2 Common Commands

```bash
pm2 list                  # Show all processes
pm2 logs off-court        # Stream application logs
pm2 restart off-court     # Zero-downtime restart
pm2 reload off-court      # Graceful reload (no connection drop)
pm2 stop off-court        # Stop the app
pm2 delete off-court      # Remove from PM2 process list
```

### nginx Configuration (offcourt.club)

```nginx
server {
    listen 80;
    server_name offcourt.club www.offcourt.club;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name offcourt.club www.offcourt.club;

    ssl_certificate     /etc/letsencrypt/live/offcourt.club/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/offcourt.club/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Serve Vite build output
    root /var/www/off-court/dist/public;
    index index.html;

    # API and WebSocket proxy
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### TLS Certificate Renewal

```bash
certbot --nginx -d offcourt.club -d www.offcourt.club
# Auto-renewal is handled by the certbot systemd timer
```

---

## Launch Checklist

See [`apps/off-court/LAUNCH-CHECKLIST.md`](apps/off-court/LAUNCH-CHECKLIST.md) for the full pre-launch task list covering environment config, WhatsApp HSM template approval, Razorpay go-live, DNS cutover, and launch-day runbook.

---

## Build Status

All five development phases are complete.

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** | Foundation — auth, booking engine, member profiles, WhatsApp concierge | Complete |
| **Phase 2** | Sports tech — CV pipeline, line calls, analytics, tournament brackets | Complete |
| **Phase 3** | Wellness & operations — treatments, classes, housekeeping, valet, kitchen | Complete |
| **Phase 4** | Financial & compliance — P&L, GST invoicing, payroll, IoT integrations | Complete |
| **Phase 5** | Growth — AR wayfinding, health analytics, activity marketplace, launch polish | Complete |

---

## Contributing

This is a private repository. Internal team members should follow the branching strategy in the team wiki and open PRs against `main`.

---

## License

Proprietary. All rights reserved — Off Court Club Pvt. Ltd., Bengaluru.
