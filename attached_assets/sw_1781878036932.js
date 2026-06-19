const CACHE = 'gopack-v25';
const ASSETS = [
  '/',
  '/index.html',
  '/src/style.css',
  '/src/icons.js',
  '/src/state.js',
  '/src/ui.js',
  '/src/notifications.js',
  '/src/firebase-listeners.js',
  '/src/collab.js',
  '/src/packing.js',
  '/src/itinerary.js',
  '/src/create.js',
  '/src/chat.js',
  '/src/dashboard.js',
  '/src/auth.js',
  '/manifest.json',
  '/favicon.svg',
];

// Helper: try the exact request, then fall back to the cached app shell,
// then finally a minimal synthetic Response so respondWith() never resolves
// to undefined (which throws "Failed to convert value to 'Response'").
function fallbackResponse(req) {
  return caches.match(req).then(cached => {
    if (cached) return cached;
    return caches.match('/index.html').then(shell => {
      if (shell) return shell;
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    });
  });
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
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

  // Never intercept API or third-party calls
  if (
    url.includes('/api/') ||
    url.includes('firebase') ||
    url.includes('googleapis') ||
    url.includes('anthropic') ||
    url.includes('gstatic') ||
    url.includes('googletagmanager')
  ) {
    return;
  }

  // Network-first for all app shell files — always get fresh, fall back to cache
  if (
    url.includes('/index.html') ||
    url.includes('/src/') ||
    url.endsWith('/') ||
    url.includes('gopack.now/?') ||
    url.includes('gopack.now/t/')
  ) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (!response || response.status !== 200) return fallbackResponse(e.request);
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        return response;
      }).catch(() => fallbackResponse(e.request))
    );
    return;
  }

  // Cache-first for everything else (icons, fonts, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        return response;
      }).catch(() => fallbackResponse(e.request));
    })
  );
});