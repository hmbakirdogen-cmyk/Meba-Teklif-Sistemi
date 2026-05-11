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

/**
 * File System Access API (`showDirectoryPicker`) için destek tespiti.
 *  - Chrome/Edge masaüstü: var.
 *  - Safari/Firefox: yok.
 *  - HTTP üzerinden LAN IP (örn. http://192.168.1.53:5174): bazı tarayıcılarda
 *    `showDirectoryPicker` undefined; bazılarında çağrıda SecurityError.
 *    `window.isSecureContext` false ise UI'da net mesaj verilir, çağrı yine
 *    try/catch ile sarılı — runtime hata sızdırılmaz.
 */
function isSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
    && typeof window.indexedDB !== 'undefined';
}

function isSecure(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true;
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB kullanılamıyor.'));
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(e);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB açılışı engellendi.'));
  });
}

async function idbGet(key: string): Promise<unknown> {
  try {
    const db = await openIDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[pdfKayit] idbGet failed:', e);
    return undefined;
  }
}

async function idbPut(key: string, value: unknown): Promise<boolean> {
  try {
    const db = await openIDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      try {
        tx.objectStore(STORE).put(value, key);
      } catch (e) {
        // DataCloneError vs. → handle aktarılamadı, sessizce false dön.
        console.warn('[pdfKayit] idbPut clone hata:', e);
        resolve(false);
        return;
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => { console.warn('[pdfKayit] idbPut tx hata:', tx.error); resolve(false); };
      tx.onabort = () => { console.warn('[pdfKayit] idbPut abort:', tx.error); resolve(false); };
    });
  } catch (e) {
    console.warn('[pdfKayit] idbPut açılış hata:', e);
    return false;
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

type DirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (opt: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (opt: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
};

async function ensurePermission(h: DirHandle): Promise<boolean> {
  try {
    if (!h.queryPermission) return true;
    const cur = await h.queryPermission({ mode: 'readwrite' });
    if (cur === 'granted') return true;
    if (!h.requestPermission) return false;
    const next = await h.requestPermission({ mode: 'readwrite' });
    return next === 'granted';
  } catch (e) {
    console.warn('[pdfKayit] ensurePermission hata:', e);
    return false;
  }
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
 *
 * Türkçe karakterler (ÇĞİÖŞÜ çğıöşü) Windows'da geçerlidir; korunur.
 * Sadece File System Access API ve Windows için yasak olanlar temizlenir.
 */
function sanitizeAd(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    // Kontrol karakterleri (CR/LF/TAB dahil) → boşluk
    if (code < 32) { out += ' '; continue; }
    if (WIN_FORBIDDEN_CHARS.includes(ch)) { out += ' '; continue; }
    out += ch;
  }
  // Boşlukları normalize et, baş/son boşluk sil, sonda kalan nokta/boşlukları
  // (Windows ve File System Access API kabul etmez) temizle.
  return out.trim().replace(/\s+/g, ' ').replace(/[. ]+$/g, '');
}

/** Windows reserved adları — File System Access API bunları reddeder. */
const WIN_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

/**
 * Dosya/klasör adını File System Access API + Windows için tam güvenli hale
 * getirir. Boş veya reserved bir ad gelirse fallback uygulanır.
 */
function safeFsName(raw: string, fallback: string, maxLen = 120): string {
  let cleaned = sanitizeAd(raw);
  if (!cleaned) cleaned = fallback;
  // Reserved isim kontrolü (uzantı olsun olmasın)
  const head = cleaned.split('.')[0]?.toUpperCase() ?? '';
  if (WIN_RESERVED_NAMES.has(head)) cleaned = `_${cleaned}`;
  // Uzunluk sınırı (NTFS: tek bileşen 255; biz makul tutalım).
  if (cleaned.length > maxLen) cleaned = cleaned.slice(0, maxLen).trimEnd().replace(/[. ]+$/g, '');
  return cleaned || fallback;
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
  // localStorage external state'tir; effect ile sync etmek doğru pattern.
  useEffect(() => {
    if (!supported || !lsKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
   * Picker açar; iptal ederse {iptal:true} döner. Tüm hata yolları yakalanır;
   * çağıran taraf hiçbir koşulda exception görmez.
   */
  const klasorSec = useCallback(async (): Promise<PDFKayitSonucu> => {
    if (!supported) {
      const guvenli = isSecure();
      return {
        ok: false,
        desteklenmiyor: true,
        error: guvenli
          ? 'Bu özellik Chrome veya Edge tarayıcıda çalışır.'
          : 'Bu özellik güvenli bağlantı (HTTPS / localhost) ve Chrome/Edge gerektirir. Şimdilik PDF\'ler tarayıcınızın İndirilenler klasörüne kaydedilecektir.',
      };
    }
    if (!isSecure()) {
      // Bazı Chrome sürümleri http://192.168.x.x üzerinde showDirectoryPicker'ı
      // expose ediyor ama çağrıda SecurityError fırlatıyor. Önden bilgilendir.
      return {
        ok: false,
        desteklenmiyor: true,
        error: 'Bu özellik güvenli bağlantı (HTTPS / localhost) gerektirir. Şimdilik PDF\'ler tarayıcınızın İndirilenler klasörüne kaydedilecektir.',
      };
    }
    if (!idbKey) return { ok: false, error: 'Aktif kullanıcı bulunamadı.' };
    try {
      const w = window as unknown as { showDirectoryPicker?: (opt: { id?: string; mode?: 'read' | 'readwrite'; startIn?: string }) => Promise<DirHandle> };
      if (typeof w.showDirectoryPicker !== 'function') {
        return { ok: false, desteklenmiyor: true, error: 'Bu özellik Chrome veya Edge tarayıcıda çalışır.' };
      }
      // Picker'ı doğrudan kullanıcı gesture içinde çağır — öncesinde await yok.
      // `id` Chrome tarafından `^[a-zA-Z0-9_-]{0,32}$` ile doğrulanır; userKey
      // içerdiği ':' nedeniyle TypeError "contains invalid character" fırlatır.
      // Bu yüzden yalnızca güvenli karakterleri bırakıp 32 karakterle sınırlıyoruz.
      const safePickerId = `meba-pdf-${userKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`.slice(0, 32);
      const h = await w.showDirectoryPicker({ id: safePickerId, mode: 'readwrite' });
      // Yazma izni ön-ısıt → ilk PDF kaydında ek prompt çıkmasın. Hata olsa
      // bile devam et; izin sonradan da istenebilir.
      try { await ensurePermission(h); } catch { /* ignore */ }
      // Handle'ı IDB'ye kaydet — başarısız olsa bile mevcut session devam eder
      // (bellekte değil, ama klasor adı LS'de tutulduğu için yeniden seçim
      // istenir; çağıran taraf zaten kaydetPDF'te handle yok ise fallback yapar).
      const persisted = await idbPut(idbKey, h);
      if (!persisted) {
        console.warn('[pdfKayit] Handle kalıcı saklanamadı (DataCloneError olabilir). Klasör seçimi yine de oturum boyu kullanılabilir; sonraki açılışta yeniden seçim istenecek.');
      }
      try { localStorage.setItem(lsKey, h.name); } catch { /* ignore */ }
      setKlasorAdi(h.name);
      return { ok: true, path: h.name };
    } catch (e) {
      const err = e as Error;
      // AbortError → kullanıcı iptal etti, sakin mesaj.
      if (err && err.name === 'AbortError') {
        return { ok: false, iptal: true };
      }
      // SecurityError / NotAllowedError → genelde insecure context veya iframe.
      if (err && (err.name === 'SecurityError' || err.name === 'NotAllowedError')) {
        console.warn('[pdfKayit] klasorSec güvenlik hatası:', err);
        return {
          ok: false,
          desteklenmiyor: true,
          error: 'Tarayıcı güvenlik politikası klasör seçimine izin vermedi. PDF\'ler İndirilenler klasörüne kaydedilecek.',
        };
      }
      // TypeError "contains invalid character" → suggestedName/id sanitization
      // başarısız oldu (teorik). Kullanıcıya net mesaj, indirme fallback'ine düş.
      if (err && err.name === 'TypeError' && /invalid character/i.test(err.message || '')) {
        console.error('[pdfKayit] klasorSec invalid character:', err);
        return {
          ok: false,
          error: 'Dosya adı güvenli hale getirilemedi. PDF normal indirme yöntemiyle kaydedilecek.',
        };
      }
      console.error('[pdfKayit] klasorSec beklenmeyen hata:', err);
      return { ok: false, error: err?.message || 'Klasör seçilemedi.' };
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

    let root: DirHandle | null = null;
    try {
      root = await handleYukle();
    } catch (e) {
      console.warn('[pdfKayit] handleYukle hata:', e);
      root = null;
    }
    if (!root) {
      // Handle yok veya izin reddedildi → adı da temizle, UI "seçilmedi" göstersin.
      try { localStorage.removeItem(lsKey); } catch { /* ignore */ }
      setKlasorAdi(null);
      return { ok: false, klasorYok: true };
    }

    const folderName = safeFsName(ilk2Kelime(firmaAdi), 'Diger', 80);
    const fileNameBase = folderName.replace(/\s+/g, '_');
    const safeTeklifNoRaw = sanitizeAd(teklifNo).replace(/\s+/g, '_');
    const safeTeklifNo = safeFsName(safeTeklifNoRaw, 'teklif', 80);
    const fileName = safeFsName(`${safeTeklifNo}_${fileNameBase}`, 'teklif', 200) + '.pdf';

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
      const err = e as Error;
      const msg = err?.message || String(e);
      console.warn('[pdfKayit] kaydetPDF yazma hatası:', err, { folderName, fileName });
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError' || msg.includes('NotAllowed') || msg.includes('denied')) {
        try { await idbDelete(idbKey); } catch { /* ignore */ }
        try { localStorage.removeItem(lsKey); } catch { /* ignore */ }
        setKlasorAdi(null);
        return { ok: false, klasorYok: true, error: 'Klasör izni reddedildi. Profilinizden yeniden seçim yapabilirsiniz.' };
      }
      if (err?.name === 'TypeError' && /invalid character/i.test(msg)) {
        return {
          ok: false,
          error: 'Dosya adı güvenli hale getirilemedi. PDF normal indirme yöntemiyle kaydedilecek.',
        };
      }
      return { ok: false, error: msg };
    }
  }, [supported, idbKey, lsKey, handleYukle, klasorAdi]);

  /** Geriye dönük: sifirla (eski API). */
  const sifirla = klasoruUnut;

  return {
    supported,
    /** Secure context (HTTPS / localhost) — UI bilgilendirmesi için. */
    secureContext: isSecure(),
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
