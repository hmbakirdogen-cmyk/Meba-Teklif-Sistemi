// Minimal service worker — sadece PWA kaydı için.
// Online-only sistem: cache yok, offline mod yok.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  // Sadece GET isteklerini geçir, hata olursa network'e bırak
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => Response.error())
  );
});
