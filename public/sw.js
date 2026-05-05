// Minimal service worker — sadece PWA kaydı için.
// Online-only sistem: cache yok, offline mod yok.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  // Cross-origin isteklere (localhost:3001 API) dokunma
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).catch(() => Response.error()));
});
