# BuildPro CRM

A construction-business management app for a Pakistani contracting business.

- **Web/PWA**: the entire app is a single static file, `index.html` (markup + CSS + vanilla JS inline), plus `sw.js`, `manifest.json`, and icons. No web build step, no framework, no bundler.
- **Backend**: Supabase (hosted) — Google OAuth + a single `buildpro_data` row per user (JSON blob). Config is inlined in `index.html`.
- **Android app**: a Capacitor wrapper. In production it loads the live PWA over-the-air from GitHub Pages `https://abbashafiz.github.io/Buildpro-crm/` (`capacitor.config.json` → `server.url`). Bundled `www/` assets are the offline fallback (`server.errorPath` → `offline.html`). Web feature updates do **not** require a new APK — only native shell/plugin changes do. Wasmer (`buildpro-crm.wasmer.app`) is a mirror; CLI deploy needs `WASMER_TOKEN`.

## Cursor Cloud specific instructions

### Running the web app (dev)
- It's a static site — serve the repo root with any static server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000/index.html`. There is no web build/compile step.
- Syntax-check the inline JS by extracting the `<script>` block to a file and running `node --check` (there are no automated tests or linters in this repo).

### Testing gotchas (important)
- **Service worker caching**: `sw.js` caches the app. After changing `index.html`, a reload can serve the old version. To load fresh code in a browser, clear it first (DevTools console):
  `Promise.all([navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))), caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))]).then(()=>{localStorage.removeItem('bp5');location.reload();})`
  End users can use the in-app menu → "Check for Updates" (`clearCacheUpdate()`).
- **Login is Google-OAuth-gated** (Supabase). Google OAuth cannot be completed in this VM/headless browser. To test app functionality without logging in, run `launchApp()` in the DevTools console — it bypasses the login screen and runs against `localStorage` (key `bp5`).
- `confirm()`/`alert()` dialogs get suppressed by Chrome after a few prompts in automated sessions, which makes delete buttons look unresponsive. In tests, set `window.confirm=()=>true` before exercising deletes.

### Deploying the web/PWA
- Static hosts (Wasmer Edge, Cloudflare Workers, GitHub Pages) publish from generated folders — run `npm run copy:web` before commit/deploy so they stay in sync with root `index.html`:
  - `public/` — Wasmer (`wasmer.toml`) + Cloudflare (`wrangler.jsonc`)
  - `docs/` — GitHub Pages (repo Pages source is `/docs`)
  - `www/` — Capacitor (gitignored; regenerated on `npm run sync`)
- Live PWA (OTA): `https://abbashafiz.github.io/Buildpro-crm/` — after a merge to `main`, Pages auto-deploys; use in-app **Check for Updates** if needed. Wasmer mirror: `https://buildpro-crm.wasmer.app` — GitHub→Wasmer uses **Anybuild** (`Anybuild` file, provider `node-static`, serves `public/`). Legacy `Shipit` files break modern Edge deploys (`static_redirects_config` / “must construct its provider config”). Regenerate with `anybuild generate --provider node-static --config '{"static_dir":"public"}'`.
- Android APK shell version tracks native packaging only. With OTA enabled, phones load GitHub Pages; after a web deploy, use in-app **Check for Updates** (or relaunch) — no APK rebuild needed for HTML/JS changes.
- Requires a JDK (17+; 21 works) and the **Android SDK** (`ANDROID_HOME` set; `platforms;android-34`, `build-tools;34.0.0`, `platform-tools`). The SDK is NOT preinstalled on the VM — install command-line tools from `https://dl.google.com/android/repository/commandlinetools-linux-<build>_latest.zip` (note: filename is `commandlinetools`, no hyphen) and `sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"`.
- Commands:
  - `npm run copy:web` — copies root static files (including `offline.html`) into `www/` / `public/` / `docs/`.
  - `npm run sync` — copy web + `cap sync android` (also writes OTA `server.url` into the Android project).
  - `npm run build:apk` — sync + `./gradlew assembleDebug`; APK at `android/app/build/outputs/apk/debug/app-debug.apk`.
  - **Signed release**: requires `android/keystore.properties` (gitignored) with `storeFile`/`storePassword`/`keyAlias`/`keyPassword` and the keystore file (also gitignored). Then `cd android && ./gradlew assembleRelease bundleRelease` → signed `app-release.apk` and `app-release.aab` (for Play Store). Signing is auto-skipped if `keystore.properties` is absent (debug/CI still work). NEVER commit the keystore or `keystore.properties`.
- **Do not edit `www/` or `android/app/src/main/assets/public/`** — they are generated from the repo-root `index.html`. Edit `index.html` (the single source) and re-run sync.
- Native Google sign-in uses the system browser + deep link `com.buildpro.crm://login-callback` (Google blocks OAuth inside WebViews). This deep link must be added to Supabase Auth → URL Configuration → Redirect URLs for login to work in the app. The web/PWA login path is unchanged and guarded by `isNative()`.
- **Open source**: MIT (`LICENSE`). Repo is public. OTA host and architecture are documented in `README.md`.

### Data / multi-device sync notes
- Data is one JSON blob per user in Supabase `buildpro_data`. Cross-device consistency uses a record-level merge (`mergeData`, last-write-wins by per-record `updatedAt`) with tombstones (`D._tomb`) for deletes, plus freshness pulls (realtime + focus + 30s). Realtime requires change replication enabled on `buildpro_data` in Supabase; otherwise polling/focus still sync.
