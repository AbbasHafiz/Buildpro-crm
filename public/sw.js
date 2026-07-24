// Bump APP_VERSION on every release so browsers detect a new service worker.
const APP_VERSION = '2026-07-24-v37';
const CACHE = 'buildpro-' + APP_VERSION;
const CORE = ['/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(
        CORE.map(url =>
          fetch(url, { cache: 'no-store' })
            .then(r => (r.ok ? c.put(url, r) : null))
            .catch(() => {})
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED', version: APP_VERSION }));
      })
  );
});

function isHtmlRequest(req) {
  if (req.mode === 'navigate') return true;
  try {
    const path = new URL(req.url).pathname;
    return path === '/' || path === '/index.html' || path.endsWith('.html');
  } catch (_) {
    return false;
  }
}

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // External / CDN — network only
  if (
    url.includes('googleapis.com') ||
    url.includes('accounts.google.com') ||
    url.includes('googleusercontent.com') ||
    url.includes('gsi/client') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    url.includes('cdnjs.cloudflare.com') ||
    url.includes('cdn.jsdelivr.net')
  ) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Always fetch a fresh service worker script (never serve from Cache API).
  if (url.includes('/sw.js')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  // HTML: network-first so Wasmer deploys show up on next open; cache only for offline.
  // Version-check fetches (?_bpver=) go straight to network and are not written to Cache API.
  if (isHtmlRequest(e.request)) {
    const isVerCheck = url.includes('_bpver=');
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(resp => {
          if (!isVerCheck && resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put('/index.html', clone));
          }
          return resp;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Icons / manifest: stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const networkPromise = fetch(e.request)
        .then(resp => {
          if (resp && resp.status === 200) cache.put(e.request, resp.clone());
          return resp;
        })
        .catch(() => cached || caches.match('/index.html'));
      return cached || networkPromise;
    })
  );
});
