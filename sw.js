const CACHE = 'buildpro-v5';
const CORE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return Promise.all(
        CORE.map(url => fetch(url).then(r => c.put(url, r)).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always network for Google APIs
  if (url.includes('googleapis.com') ||
      url.includes('accounts.google.com') ||
      url.includes('googleusercontent.com') ||
      url.includes('gsi/client') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('', {status: 503}))
    );
    return;
  }

  // For navigation requests (opening the app) — cache first, then network
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then(cached => {
        return cached || fetch(e.request).catch(() => cached);
      })
    );
    return;
  }

  // For all other requests — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
