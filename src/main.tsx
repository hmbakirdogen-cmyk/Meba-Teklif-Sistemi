import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { addCollection, type IconifyJSON } from '@iconify/react'
import solarIcons from '@iconify-json/solar/icons.json'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { KullaniciProvider } from './context/KullaniciContext.tsx'
import { FirmaProvider } from './context/FirmaContext.tsx'

// Solar Bold-Duotone ikon set'ini lokal olarak yükle. Premium navbar +
// toolbar'da kullanılır; Iconify online API'ye fallback yapmadan offline
// çalışır (PWA / LAN ortamlarında garanti).
addCollection(solarIcons as IconifyJSON)

/**
 * Online-only mimariye geçişten kalan eski sync engine localStorage
 * anahtarlarını temizle. Bir kez çalışır, mebaCleanup_v1 flag'i set edilir.
 * Kullanıcı bir sonraki sayfa yüklemesinde tekrar çalışmaz.
 */
function mebaCleanupLegacyKeys(): void {
  try {
    if (localStorage.getItem('mebaCleanup_v1') === '1') return;
    const exactKeys = [
      'meba_sync_queue',
      'meba_last_pull_server_time',
      'meba_last_pull_at',
      'meba_last_push_at',
      'meba_conflicts',
      'meba_last_snapshot',
      'meba_device_id',
    ];
    for (const k of exactKeys) localStorage.removeItem(k);
    const prefix = 'meba_conflict_local_';
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem('mebaCleanup_v1', '1');
  } catch { /* localStorage erişimi yoksa (incognito vs.) sessizce geç */ }
}
mebaCleanupLegacyKeys();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirmaProvider>
      <KullaniciProvider>
        <App />
      </KullaniciProvider>
    </FirmaProvider>
  </StrictMode>,
)

// Service Worker kaydı KALDIRILDI — online-only sistemde SW gereksizdi ve
// PWA kullanıcılarında deploy sonrası eski JS bundle cache'i bug yaratıyordu.
// PWA hâlâ çalışır (manifest.json ile install edilebilir), sadece browser
// HTTP cache'i (hash'li asset'lerle zaten doğru çalışır) kullanılır.
// Eski kullanıcıların kayıtlı SW'leri index.html'deki vBust mekanizmasıyla
// (her yeni vBust'ta) unregister edilir.
