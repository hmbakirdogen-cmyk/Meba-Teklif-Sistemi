/**
 * usePDFKayit.ts — PDF'leri kullanıcının seçtiği klasöre sessizce kaydeder.
 *
 * File System Access API (Chrome/Edge desktop). Safari/Firefox desteklemiyor —
 * o tarayıcılarda hook no-op (supported=false), mevcut indirme akışı bozulmaz.
 *
 * Klasör seçimi açık bir kullanıcı aksiyonudur (Profil ekranında "Klasör Seç").
 * `kaydetPDF` HİÇ picker açmaz — handle yoksa `klasorYok: true` döner; çağıran
 * standart browser indirmesine düşer.
 *
 * Kalıcılık:
 *   - FileSystemDirectoryHandle → IndexedDB (kullanıcı + firma anahtarlı)
 *   - Klasör adı → localStorage (UI için ad/etiket)
 *   - Aynı tarayıcı + aynı kullanıcı → handle korunur, izin yenilenince devam.
 *   - Farklı kullanıcı / farklı firma → ayrı anahtar → klasörler karışmaz.
 *
 * Çıktı yapısı:
 *   <SeçilenKlasör>/
 *     AKCANLAR PETROL/
 *       2605-010_AKCANLAR_PETROL.pdf
 */

import { useEffect, useState, useCallback } from 'react';
import { useKullanici } from '../context/useKullanici';

const DB_NAME = 'meba_pdf_kayit';
const STORE = 'handles';
const KEY_PREFIX = 'rootDir';
const LS_NAME_PREFIX = 'mebaPdfKlasorAdi';
const DB_VERSION = 1;

const WIN_FORBIDDEN_CHARS = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

function isSupported(): boolean {
  return typeof window !== 'undefined'
    && 'showDirectoryPicker' in window
    && 'indexedDB' in window;
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<unknown> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

type DirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (opt: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (opt: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
};

async function ensurePermission(h: DirHandle): Promise<boolean> {
  if (!h.queryPermission) return true;
  const cur = await h.queryPermission({ mode: 'readwrite' });
  if (cur === 'granted') return true;
  if (!h.requestPermission) return false;
  const next = await h.requestPermission({ mode: 'readwrite' });
  return next === 'granted';
}

export interface PDFKayitSonucu {
  ok: boolean;
  path?: string;
  error?: string;
  /** Kullanıcı klasör seçimini iptal ettiyse true (hatadan farklı, sessizce geçilebilir) */
  iptal?: boolean;
  /** Henüz klasör seçilmemiş — çağıran browser download fallback'ine düşmeli. */
  klasorYok?: boolean;
  /** Tarayıcı File System Access desteklemiyor (Safari/Firefox). */
  desteklenmiyor?: boolean;
}

/**
 * Windows yasak karakterleri ve kontrol karakterlerini temizler.
 * Regex character class yerine string include ile (Edit tool'da regex bytes
 * bozulma sorununu önlemek için).
 */
function sanitizeAd(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code < 32) { out += ' '; continue; }
    if (WIN_FORBIDDEN_CHARS.includes(ch)) { out += ' '; continue; }
    out += ch;
  }
  return out.trim().replace(/\s+/g, ' ');
}

function ilk2Kelime(adi: string): string {
  const ws = sanitizeAd(adi).split(/\s+/).filter(Boolean).slice(0, 2);
  return ws.join(' ');
}

export function usePDFKayit() {
  const supported = isSupported();
  const { aktifKullanici } = useKullanici();

  // Per-user / per-firma anahtarlar — farklı kullanıcılar arasında klasör karışmaz.
  const userKey = aktifKullanici ? `${aktifKullanici.id}:${aktifKullanici.firmaId ?? '_'}` : '';
  const idbKey = userKey ? `${KEY_PREFIX}:${userKey}` : '';
  const lsKey = userKey ? `${LS_NAME_PREFIX}:${userKey}` : '';

  // UI'da gösterilecek klasör adı (handle.name). null = klasör seçilmemiş.
  const [klasorAdi, setKlasorAdi] = useState<string | null>(() => {
    if (!supported || !lsKey) return null;
    try { return localStorage.getItem(lsKey); } catch { return null; }
  });

  // Aktif kullanıcı değişince LS adını yeniden yükle (klasör IDB'de saklı,
  // adı LS'de — UI'nin doğru kullanıcının klasör adını göstermesi için).
  useEffect(() => {
    if (!supported || !lsKey) {
      setKlasorAdi(null);
      return;
    }
    try { setKlasorAdi(localStorage.getItem(lsKey)); } catch { setKlasorAdi(null); }
  }, [supported, lsKey]);

  /** IDB'den handle'ı oku; izin tazele. Picker AÇMAZ. */
  const handleYukle = useCallback(async (): Promise<DirHandle | null> => {
    if (!supported || !idbKey) return null;
    try {
      const stored = await idbGet(idbKey) as DirHandle | undefined;
      if (!stored) return null;
      const ok = await ensurePermission(stored);
      return ok ? stored : null;
    } catch {
      return null;
    }
  }, [supported, idbKey]);

  /**
   * Kullanıcı bilinçli olarak klasör seçer (Profil > Klasör Seç / Değiştir).
   * Picker açar; iptal ederse {iptal:true} döner.
   */
  const klasorSec = useCallback(async (): Promise<PDFKayitSonucu> => {
    if (!supported) return { ok: false, desteklenmiyor: true, error: 'Bu özellik Chrome veya Edge tarayıcıda çalışır.' };
    if (!idbKey) return { ok: false, error: 'Aktif kullanıcı yok.' };
    try {
      const w = window as unknown as { showDirectoryPicker?: (opt: { id?: string; mode?: 'read' | 'readwrite'; startIn?: string }) => Promise<DirHandle> };
      if (!w.showDirectoryPicker) return { ok: false, desteklenmiyor: true, error: 'Bu özellik Chrome veya Edge tarayıcıda çalışır.' };
      const h = await w.showDirectoryPicker({ id: `meba-teklif-pdf-${userKey}`, mode: 'readwrite' });
      // Yazma izni ön-ısıt → ilk PDF kaydında ek prompt çıkmasın.
      await ensurePermission(h);
      await idbPut(idbKey, h);
      try { localStorage.setItem(lsKey, h.name); } catch { /* ignore */ }
      setKlasorAdi(h.name);
      return { ok: true, path: h.name };
    } catch (e) {
      // AbortError → kullanıcı iptal etti, sakin mesaj.
      if (e instanceof Error && e.name === 'AbortError') {
        return { ok: false, iptal: true };
      }
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  }, [supported, idbKey, lsKey, userKey]);

  /** Saklı klasörü unut (UI: "Bağlantıyı kaldır"). */
  const klasoruUnut = useCallback(async (): Promise<void> => {
    if (!idbKey) return;
    try { await idbDelete(idbKey); } catch { /* ignore */ }
    try { localStorage.removeItem(lsKey); } catch { /* ignore */ }
    setKlasorAdi(null);
  }, [idbKey, lsKey]);

  /**
   * Klasörü "aç" — File System Access doğrudan Explorer açmaya izin vermez.
   * En yakın UX: yeniden showDirectoryPicker → kullanıcı klasörünü görür/seçer.
   * (Aynı klasörü onaylarsa handle güncellenir, aksi halde değişir.)
   */
  const klasoruAc = useCallback(async (): Promise<PDFKayitSonucu> => {
    return klasorSec();
  }, [klasorSec]);

  /**
   * PDF'i kullanıcının seçtiği klasörün firma alt klasörüne yaz.
   *   - Tarayıcı desteklemiyor → desteklenmiyor:true (caller download fallback yapsın)
   *   - Klasör seçilmemiş     → klasorYok:true       (caller download fallback yapsın)
   *   - İzin reddedildi       → IDB temizlenir, klasorYok:true
   *   - Yazma hatası          → error mesajı
   * HİÇBİR durumda picker AÇMAZ. Picker yalnızca `klasorSec` içinden tetiklenir.
   */
  const kaydetPDF = useCallback(async (
    blob: Blob,
    teklifNo: string,
    firmaAdi: string,
  ): Promise<PDFKayitSonucu> => {
    if (!supported) return { ok: false, desteklenmiyor: true };
    if (!idbKey) return { ok: false, klasorYok: true };

    const root = await handleYukle();
    if (!root) {
      // Handle yok veya izin reddedildi → adı da temizle, UI "seçilmedi" göstersin.
      try { localStorage.removeItem(lsKey); } catch { /* ignore */ }
      setKlasorAdi(null);
      return { ok: false, klasorYok: true };
    }

    const folderName = ilk2Kelime(firmaAdi) || 'Diger';
    const fileNameBase = folderName.replace(/\s+/g, '_');
    const safeTeklifNo = sanitizeAd(teklifNo).replace(/\s+/g, '_') || 'teklif';
    const fileName = safeTeklifNo + '_' + fileNameBase + '.pdf';

    try {
      const subDir = await root.getDirectoryHandle(folderName, { create: true });
      const fileHandle = await subDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      // İlk başarılı yazımda klasör adını da senkronla (bazı tarayıcılarda
      // ad sonradan güncellenir).
      try { localStorage.setItem(lsKey, root.name); } catch { /* ignore */ }
      if (klasorAdi !== root.name) setKlasorAdi(root.name);
      return { ok: true, path: root.name + '\\' + folderName + '\\' + fileName };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('NotAllowed') || msg.includes('denied')) {
        try { await idbDelete(idbKey); } catch { /* ignore */ }
        try { localStorage.removeItem(lsKey); } catch { /* ignore */ }
        setKlasorAdi(null);
        return { ok: false, klasorYok: true, error: 'Klasör izni reddedildi. Profilinizden yeniden seçim yapabilirsiniz.' };
      }
      return { ok: false, error: msg };
    }
  }, [supported, idbKey, lsKey, handleYukle, klasorAdi]);

  /** Geriye dönük: sifirla (eski API). */
  const sifirla = klasoruUnut;

  return {
    supported,
    /** UI'da "PDF Konumu: ..." göstermek için klasör adı (null = seçilmedi). */
    klasorAdi,
    hasKlasor: !!klasorAdi,
    klasorSec,
    klasoruAc,
    klasoruUnut,
    kaydetPDF,
    sifirla,
  };
}
