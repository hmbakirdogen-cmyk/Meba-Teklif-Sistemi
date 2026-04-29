/**
 * networkConfig.ts — API base URL'in runtime'da çözümlenmesi.
 *
 * Strateji:
 *  1. localStorage'da `meba_server_base` saklanmışsa onu dene (kullanıcı
 *     "Server bağlantısı değiştir" ile kaydetmiş olabilir).
 *  2. window.location.hostname:3001 (uygulamayı sunan makinedeki backend).
 *  3. Başarısız olan tüm probe'lar → API_BASE = null döner; UI offline mod'a düşer.
 *
 * Sonuç boot'ta tek kez çalıştırılır, window.MEBA_API_BASE'e set edilir.
 * APP_CONFIG.API_BASE bu globali okur.
 */

const HEALTH_TIMEOUT_MS = 4000;
const STORAGE_KEY = 'meba_server_base';

async function probe(base: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
    const res = await fetch(`${base}/health`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Olası API base URL adaylarını sırayla dener; ilk başarılı olan döner.
 * Hiçbiri çalışmazsa varsayılan window.location.hostname:3001/api döner
 * (kullanıcı offline mod'da olsa bile API_BASE değeri olmalı — yoksa
 * fetch'ler crash'lar).
 */
export async function resolveServerBase(): Promise<string> {
  if (typeof window === 'undefined') return 'http://localhost:3001/api';

  const candidates: string[] = [];

  // 1. Kullanıcı tarafından değiştirilen base (öncelikli)
  const userOverride = localStorage.getItem(STORAGE_KEY);
  if (userOverride) candidates.push(userOverride);

  // 2. Uygulamayı sunan makine (server modunda doğru, client modunda da
  //    launcher static server frontend port'unda dinlerken backend aynı
  //    hostname:3001'de olabilir)
  const hostname = window.location.hostname || 'localhost';
  candidates.push(`http://${hostname}:3001/api`);

  for (const base of candidates) {
    if (await probe(base)) {
      return base;
    }
  }

  // Hiçbiri yanıt vermedi — son adayı yine de döndür (boot crash'i önle).
  // syncEngine offline state'i ayrıca yönetir.
  return candidates[candidates.length - 1] || `http://${hostname}:3001/api`;
}

/** Kullanıcı "Server bağlantısı değiştir" modal'ında bu fonksiyonu çağırır. */
export function setManualServerBase(base: string | null): void {
  if (typeof window === 'undefined') return;
  if (base) {
    localStorage.setItem(STORAGE_KEY, base);
    window.MEBA_API_BASE = base;
  } else {
    localStorage.removeItem(STORAGE_KEY);
    delete window.MEBA_API_BASE;
  }
}

/**
 * Boot'ta çağrılır — API_BASE'i belirle ve global'e koy.
 * App.tsx initDataStore'dan ÖNCE çağrılmalı.
 */
export async function initNetworkConfig(): Promise<void> {
  if (typeof window === 'undefined') return;
  const base = await resolveServerBase();
  window.MEBA_API_BASE = base;
}
