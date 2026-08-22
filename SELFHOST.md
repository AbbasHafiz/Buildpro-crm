# Self-host BuildPro for a client

Sell / deploy BuildPro so the client owns the database and Google Sign-In on their Supabase project.

## What the client needs

1. A place to host the static app (`index.html`, `sw.js`, icons) — any static host or their own domain.
2. A free/paid [Supabase](https://supabase.com) project.
3. A Google Cloud OAuth client (for “Sign in with Google”).

## Quick setup (in the app)

1. Open the app → **Backend / Self-host settings** (login screen) or avatar menu → **Backend Settings**.
2. Choose **Client Supabase (self-host)**.
3. Paste **Project URL** and **anon/public key** from Supabase → Project Settings → API.
4. Tap **Test Connection**, then **Save & Apply**.
5. Configure Google in Supabase (below), then sign in.

Settings are stored in the browser (`localStorage` key `bp_backend`). Switching backend reloads the app and uses a separate cloud account — export a backup first if you need to move data.

## Fleet deploy with `config.json`

For a white-label install (no UI setup), place `config.json` next to `index.html`:

```json
{
  "mode": "custom",
  "supabaseUrl": "https://YOUR_PROJECT.supabase.co",
  "supabaseAnonKey": "YOUR_ANON_KEY",
  "redirectUrl": "https://crm.client-domain.com/",
  "googleClientId": "xxxxx.apps.googleusercontent.com",
  "deeplink": "com.buildpro.crm://login-callback"
}
```

Copy from `config.example.json`. If the user later saves Backend Settings, that local override wins over `config.json`.

## Database schema (SQL)

Run once in Supabase → SQL Editor:

```sql
create table if not exists public.buildpro_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.buildpro_data enable row level security;

create policy "Users manage own buildpro data"
  on public.buildpro_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: live multi-device sync
alter publication supabase_realtime add table public.buildpro_data;
```

## Google Sign-In (Supabase Auth)

The app calls Supabase `signInWithOAuth({ provider: 'google' })`. Client ID / Secret are **not** put in the frontend (except an optional Client ID note). Configure them in Supabase:

1. **Google Cloud Console** → APIs & Services → Credentials → Create OAuth client ID (Web application).
2. Authorized JavaScript origins: your app origin (e.g. `https://crm.client.com`).
3. Authorized redirect URIs: copy the callback URL shown in Supabase → Authentication → Providers → Google (looks like `https://YOUR_PROJECT.supabase.co/auth/v1/callback`).
4. Paste **Client ID** and **Client Secret** into Supabase → Authentication → Providers → Google → Enable.
5. Supabase → Authentication → URL Configuration:
   - Site URL = your app URL
   - Redirect URLs = your app URL, and for Android: `com.buildpro.crm://login-callback` (or the deeplink you set in Backend Settings)

## Modes

| Mode | Behaviour |
|------|-----------|
| **BuildPro hosted** | Default cloud (vendor Supabase). |
| **Client Supabase** | Client URL + anon key; Google via their Supabase project. |
| **Local only** | No cloud; **Continue Offline** on the login screen. Use Export Backup regularly. |

## Security notes

- Only the **anon** key belongs in the browser / `config.json`. Never ship the **service_role** key.
- RLS on `buildpro_data` is required so users cannot read each other’s rows.
- The optional Google Client ID field in Backend Settings is a reminder only; the secret stays in Supabase.

## Android / Capacitor

Native Google login opens the system browser and returns via the deeplink. Add that deeplink to Supabase Redirect URLs. Rebrand the package / deeplink in a custom build if you ship a white-label APK.
