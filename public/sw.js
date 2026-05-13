// Service Worker KALDIRILDI (vBust4).
// Eski PWA kayıtlarında bu dosya hâlâ çağrılırsa kendini sessizce kaldırır,
// fetch'leri intercept ETMEZ → eski JS cache problemi çıkmaz.
// Yeni kurulumlarda main.tsx artık SW kaydı yapmıyor.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Tüm cache'leri temizle (varsa)
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch { /* ignore */ }
      // Kendini kayıttan sil
      try { await self.registration.unregister(); } catch { /* ignore */ }
      // Açık client'ları yenile (yeni JS yüklensin)
      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((c) => { try { c.navigate(c.url); } catch { /* ignore */ } });
      } catch { /* ignore */ }
    })(),
  );
});
// fetch handler YOK — tüm istekler tarayıcıya direkt gider, normal HTTP cache.
