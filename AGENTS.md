# BuildPro CRM

A construction-business management app for a Pakistani contracting business.

- **Web/PWA**: the entire app is a single static file, `index.html` (markup + CSS + vanilla JS inline), plus `sw.js`, `manifest.json`, and icons. No web build step, no framework, no bundler.
- **Backend**: Supabase (hosted) — Google OAuth + a single `buildpro_data` row per user (JSON blob). Config is inlined in `index.html`.
- **Android app**: a Capacitor wrapper that bundles the same `index.html`. Web assets are single-sourced in the repo root and copied into `www/` (which Capacitor packages).

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

### Building the Android app (Capacitor)
- Requires a JDK (17+; 21 works) and the **Android SDK** (`ANDROID_HOME` set; `platforms;android-34`, `build-tools;34.0.0`, `platform-tools`). The SDK is NOT preinstalled on the VM — install command-line tools from `https://dl.google.com/android/repository/commandlinetools-linux-<build>_latest.zip` (note: filename is `commandlinetools`, no hyphen) and `sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"`.
- Commands:
  - `npm run copy:web` — copies root static files into `www/`.
  - `npm run sync` — copy web + `cap sync android`.
  - `npm run build:apk` — sync + `./gradlew assembleDebug`; APK at `android/app/build/outputs/apk/debug/app-debug.apk`.
- **Do not edit `www/` or `android/app/src/main/assets/public/`** — they are generated from the repo-root `index.html`. Edit `index.html` (the single source) and re-run sync.
- Native Google sign-in uses the system browser + deep link `com.buildpro.crm://login-callback` (Google blocks OAuth inside WebViews). This deep link must be added to Supabase Auth → URL Configuration → Redirect URLs for login to work in the app. The web/PWA login path is unchanged and guarded by `isNative()`.

### Data / multi-device sync notes
- Data is one JSON blob per user in Supabase `buildpro_data`. Cross-device consistency uses a record-level merge (`mergeData`, last-write-wins by per-record `updatedAt`) with tombstones (`D._tomb`) for deletes, plus freshness pulls (realtime + focus + 30s). Realtime requires change replication enabled on `buildpro_data` in Supabase; otherwise polling/focus still sync.
