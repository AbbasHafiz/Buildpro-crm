const CACHE = 'buildpro-v7';
const CORE = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(CORE.map(url => fetch(url).then(r => c.put(url, r)).catch(() => {})))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('googleapis.com') || url.includes('accounts.google.com') ||
      url.includes('googleusercontent.com') || url.includes('gsi/client') ||
      url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com') ||
      url.includes('cdnjs.cloudflare.com') || url.includes('cdn.jsdelivr.net')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }
  if (e.request.mode === 'navigate') {
    // Network-first so new app versions load immediately; fall back to cache when offline.
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put('/index.html', clone));
        return resp;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
