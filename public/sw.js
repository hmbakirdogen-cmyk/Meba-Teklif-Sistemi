// Minimal service worker — sadece PWA kaydı için.
// Online-only sistem: cache yok, offline mod yok. Fetch handler tarayıcının
// PWA install kriterlerini sağlamak için var (no-op passthrough).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));
