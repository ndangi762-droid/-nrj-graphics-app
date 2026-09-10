const CACHE = 'printup-shell-v2';
const APP_SHELL = ['/', '/login', '/signup', '/manifest.json', '/nrj_graphics_icon.svg?v=2', '/printup-mobile-ui.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.destination === 'document') {
    event.respondWith(fetch(event.request).then(async response => {
      if (!response.ok) return response;
      const type = response.headers.get('content-type') || '';
      if (!type.includes('text/html')) return response;
      const html = await response.text();
      if (html.includes('/printup-mobile-ui.js')) return new Response(html, {status: response.status, statusText: response.statusText, headers: response.headers});
      const injected = html.replace('</body>', '<script src="/printup-mobile-ui.js?v=1"></script></body>');
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      return new Response(injected, {status: response.status, statusText: response.statusText, headers});
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match('/login'))));
    return;
  }

  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && ['script', 'style', 'image', 'manifest'].includes(event.request.destination)) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('/login'))));
});
