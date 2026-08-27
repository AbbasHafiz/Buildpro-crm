# BuildPro CRM

Open-source construction CRM for Pakistani contracting businesses — expenses, sub-contractors, agreements, clients, ledger, and PDFs.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Live apps

| Surface | URL |
|--------|-----|
| **PWA (primary OTA host)** | https://abbashafiz.github.io/Buildpro-crm/ |
| **Wasmer mirror** | https://buildpro-crm.wasmer.app/ |
| **Android release APK** | [Download](https://github.com/AbbasHafiz/Buildpro-crm/raw/cursor/apk-download-6cf4/BuildPro-CRM-release.apk) |

## How OTA works (Android)

The Capacitor Android shell loads the live PWA from **GitHub Pages** (`server.url` in `capacitor.config.json`).

- **Web/feature updates** → merge to `main` (Pages auto-deploys `/docs`) → phones pick them up on next launch / “Check for Updates”. No new APK required.
- **Native shell updates** (plugins, permissions, signing) → bump Android `versionCode` and ship a new APK.
- Wasmer Edge remains a mirror. GitHub deploys need the repo **`Anybuild`** file (provider `node-static`, `static_dir: public`). In the Wasmer UI keep Project preset **`node-static`**, then Deploy.

If the device is offline, Capacitor shows the bundled `offline.html`, which can retry the live host or open the last packaged local copy.

## Self-host for a client

Point the app at the client’s own Supabase project (database + Google Sign-In) via **Backend / Self-host settings**, or ship a `config.json` beside `index.html`. Full steps: [SELFHOST.md](SELFHOST.md).

## Stack

- Single-file web app: `index.html` + `sw.js` + `manifest.json` (vanilla JS, no bundler)
- Supabase (Google OAuth + one JSON row per user) — BuildPro hosted by default, or client-owned via Backend Settings
- Capacitor 6 Android wrapper

## Develop

```bash
# Web
python3 -m http.server 8000   # open http://localhost:8000/index.html

# Copy web → www / public / docs
npm run copy:web

# Android
npm install
npm run sync
npm run build:apk
```

Edit root `index.html` only — then `npm run copy:web` (or `npm run sync` for Android).

## Version bumps

Keep these in sync on each web release:

1. `<meta name="app-version">` in `index.html`
2. `const APP_VERSION` in `index.html`
3. `APP_VERSION` in `sw.js`

Android shell version lives in `android/app/build.gradle` (`versionName` / `versionCode`) and only needs a bump when native packaging changes.

## License

MIT — see [LICENSE](LICENSE).
