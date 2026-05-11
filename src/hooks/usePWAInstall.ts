/**
 * usePWAInstall.ts — Chrome/Edge `beforeinstallprompt` event yöneticisi.
 *
 * Buton görünürlüğü mantığı:
 *   - canInstall = true → tarayıcı kurulum hazır + henüz kurulmamış
 *   - install() çağrıldığında native dialog açılır
 *   - appinstalled event veya display-mode: standalone → buton kaybolur
 *
 * Tarayıcı limiti: HTTPS veya localhost gerekli. LAN HTTP'de
 * `beforeinstallprompt` event'i fire etmez → buton hiç görünmez.
 */

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Zaten standalone modda açılmışsa (kurulu) → butonu gösterme.
    // matchMedia external API — sync için effect doğru yer.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  // Buton gösterilmeli mi?
  // - installPrompt var (tarayıcı hazır) VE henüz kurulmamışsa
  const canInstall = !!installPrompt && !isInstalled;

  return { canInstall, install, isInstalled };
}
