# Perx

Employee benefits marketplace for Albania. Three apps, one shared API.

```
perx/
  backend/         Express + SQLite API (shared by all apps)
  apps/
    mobile/        Employee app — React Native (Expo)
    desktop/       Employer · HR · Provider — Electron + React (Vite renderer)
    landing/       Marketing website — empty placeholder
```

## Install

```bash
npm run install:all     # root (backend) + desktop + mobile
```

## Run

Backend must be running for either app to have data.

```bash
npm run api             # Express API on :3001  (seeds DB on first boot)
```

Then, in separate terminals:

```bash
npm run desktop         # Vite renderer + Electron window (employer/HR/provider)
npm run mobile          # Expo dev server (employee app) — scan QR with Expo Go
```

Shortcut: `npm run dev` runs API + desktop together.

- `npm run seed` — wipe & reseed `perx.db`
- Delete `perx.db*` to reset.

## Apps

**Mobile (`apps/mobile`)** — Expo. Employee browses catalog, asks the AI concierge,
builds a cart, requests approval. Tabs: Browse · Concierge · Requests.
Talks to the API over the LAN; it auto-derives the host IP from Expo
(`src/api.js`). On a real device, phone and dev machine must share a network.

**Desktop (`apps/desktop`)** — Electron app, native window (hiddenInset titlebar).
Role picker → Employer (approvals, team, payments), HR (benefits table,
analytics, compliance, nudge, challenges), Provider (offers, payments).
Dev loads Vite; packaged loads `dist/` and hits `http://localhost:3001`.

**Landing (`apps/landing`)** — empty. Website goes here.

## AI Concierge

Mock by default (deterministic, matches the demo). For real Gemini:

```bash
echo 'GEMINI_API_KEY=...' > backend/.env
```

Uses `gemini-2.0-flash`; falls back to mock on any error.

## Demo loop

1. Mobile: concierge → "relaxing under 5,000" → Zen Spa Massage → add → Request Approval
2. Desktop / Employer → Approvals → Approve → payment recorded
3. Mobile budget drops · Desktop / HR → Benefits Table + Analytics update
