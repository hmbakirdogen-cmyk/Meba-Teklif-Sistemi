import { APP_CONFIG } from '../config';
import { getSessionToken, getActiveFirmaId } from './apiClient';
import type { Firma, Teklif } from '../types';

const INVALID_WINDOWS_SEGMENT_REGEX = /[<>:"/\\|?*]/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;
// Tüm firmalar için ortak fallback adı — sadece firma kök klasör adı dışarıdan
// verilmediğinde kullanılır (offline/edge senaryosu).
const PDF_ROOT_FOLDER_NAME_FALLBACK = 'GRUP ŞİRKETLERİ TEKLİFLER';

// showDirectoryPicker prompt'lu yol kaldırıldı — fully otomatik akış için
// kullanıcı gesture istemeyen browserDownload kullanılıyor.

export type TeklifDisaAktarimHedefi = 'pdf' | 'email';
export type TeklifDisaAktarimYontemi = 'otomatik' | 'tarayici';
export type EpostaTaslakYontemi = 'outlook' | 'mailto' | null;

export interface TeklifDisaAktarimSonucu {
  hedef: TeklifDisaAktarimHedefi;
  teklif: Teklif;
  pdfYolu: string;
  pdfDosyaAdi: string;
  klasorYolu: string;
  masaustuYolu: string;
  kayitYontemi: TeklifDisaAktarimYontemi;
  dosyaAcildi: boolean;
  dosyaAcmaHatasi?: string;
  epostaHazirlandi: boolean;
  epostaHatasi?: string;
  epostaTaslakYontemi: EpostaTaslakYontemi;
  aliciEposta?: string;
  mailKonu?: string;
  mailGovdesi?: string;
  istemciTarafindaMailtoGerekli?: boolean;
  yerelKayitYolu?: string;
  /** Kullanıcı "Farklı Kaydet" penceresinde iptal etti — UI sakin mesaj gösterir. */
  yerelKayitIptal?: boolean;
}

export class TeklifDisaAktarimHatasi extends Error {
  pdfYolu?: string;
  pdfDosyaAdi?: string;

  constructor(message: string, options?: { pdfYolu?: string; pdfDosyaAdi?: string }) {
    super(message);
    this.name = 'TeklifDisaAktarimHatasi';
    this.pdfYolu = options?.pdfYolu;
    this.pdfDosyaAdi = options?.pdfDosyaAdi;
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(MULTIPLE_SPACES_REGEX, ' ').trim();
}

type MailFirmaProfili = Pick<Firma, 'id' | 'kisaAd' | 'ad' | 'adres' | 'telefon' | 'eposta' | 'web'>;

const DEFAULT_MAIL_FIRMALAR: Record<string, MailFirmaProfili> = {
  meba: {
    id: 'meba',
    kisaAd: 'MEBA',
    ad: 'MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik San. Tic. Ltd. Şti.',
    adres: 'Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ',
    telefon: '0352 5020780',
    eposta: 'info@mebamekanik.com',
    web: 'www.mebamekanik.com',
  },
  mesa: {
    id: 'mesa',
    kisaAd: 'MESA',
    ad: 'Mesa Enerji Taahhüt Elektrik Elektronik Mühendislik Danışmanlık Makine San. ve Tic. Ltd. Şti.',
    adres: 'Organize Sanayi Bölgesi 12. Cad. OSB Ticaret Merkezi No: 5/9 Melikgazi / KAYSERİ',
    telefon: '0352 321 30 00',
    eposta: 'info@mesaenerji.com',
    web: 'www.mesaenerji.com.tr',
  },
  elmos: {
    id: 'elmos',
    kisaAd: 'ELMOS',
    ad: 'ELMOS Otomasyon San. Tic. Ltd. Şti.',
    adres: 'Organize Sanayi Bölgesi 12. Cad. No:30 Melikgazi / KAYSERİ',
    telefon: '0352 321 30 50',
    eposta: '',
    web: 'www.elmos.com.tr',
  },
};

function buildMailFirmaProfili(teklif: Teklif, firmaProfil?: Firma): MailFirmaProfili {
  const fallback = DEFAULT_MAIL_FIRMALAR[firmaProfil?.id || teklif.firmaId || 'meba'] ?? DEFAULT_MAIL_FIRMALAR.meba;
  return {
    id: normalizeWhitespace(firmaProfil?.id || fallback.id),
    kisaAd: normalizeWhitespace(firmaProfil?.kisaAd || fallback.kisaAd),
    ad: normalizeWhitespace(firmaProfil?.ad || fallback.ad),
    adres: normalizeWhitespace(firmaProfil?.adres || fallback.adres),
    telefon: normalizeWhitespace(firmaProfil?.telefon || fallback.telefon),
    eposta: normalizeWhitespace(firmaProfil?.eposta || fallback.eposta),
    web: normalizeWhitespace(firmaProfil?.web || fallback.web || ''),
  };
}

function sanitizeWindowsSegment(value: string, fallback: string): string {
  const withoutControls = Array.from(value).filter((character) => character.charCodeAt(0) >= 32).join('');
  const sanitized = normalizeWhitespace(
    withoutControls.replace(INVALID_WINDOWS_SEGMENT_REGEX, ' ').replace(/[. ]+$/g, ' '),
  );
  return sanitized || fallback;
}

function extractCariStem(cariAdi: string): string {
  const words = normalizeWhitespace(cariAdi).split(' ').filter(Boolean);
  const source = words.slice(0, 2).join(' ') || words.join(' ') || 'TEKLIF';
  return sanitizeWindowsSegment(source.toLocaleUpperCase('tr-TR'), 'TEKLIF');
}

function buildFallbackFileName(teklif: Teklif): string {
  const cariStem = extractCariStem(teklif.cari?.firmaAdi ?? '');
  const teklifNo = sanitizeWindowsSegment(teklif.teklifNo ?? '', '').trim();
  return teklifNo ? `${cariStem} - ${teklifNo}.pdf` : `${cariStem}.pdf`;
}

function buildMailSubject(teklif: Teklif, firmaProfil?: Firma): string {
  const firma = buildMailFirmaProfili(teklif, firmaProfil);
  return teklif.teklifNo
    ? `${firma.kisaAd} Teklif Belgesi - ${teklif.teklifNo}`
    : `${firma.kisaAd} Teklif Belgesi`;
}

function buildMailBody(teklif: Teklif, firmaProfil?: Firma): string {
  const firma = buildMailFirmaProfili(teklif, firmaProfil);
  const kisi = normalizeWhitespace(teklif.contactName ?? '');
  const title = teklif.contactTitle === 'HANIM' ? 'Hanım' : 'Bey';
  const hitap = kisi ? `Sayın ${kisi} ${title},` : 'Sayın İlgili,';
  const cariAdi = normalizeWhitespace(teklif.cari?.firmaAdi ?? '');
  const teklifNo = teklif.teklifNo ?? '';
  const hazirlayanAdi = normalizeWhitespace(teklif.hazirlayanAdSoyad ?? '');
  const sep = '--------------------------------------------------';

  const satirlar: string[] = [
    hitap,
    '',
    `${cariAdi ? cariAdi + ' için hazırladığımız teklif belgemiz' : 'Teklif belgemiz'}${teklifNo ? ' (No: ' + teklifNo + ')' : ''} ekte yer almaktadır.`,
    'Herhangi bir sorunuz olması durumunda lütfen bizimle iletişime geçiniz.',
    '',
    'Saygılarımızla,',
    '',
    sep,
  ];

  if (hazirlayanAdi) satirlar.push(hazirlayanAdi);

  satirlar.push(firma.ad, '');
  if (firma.telefon) satirlar.push(`T: ${firma.telefon}`);
  if (firma.eposta) satirlar.push(`E: ${firma.eposta}`);
  if (firma.web) satirlar.push(`W: ${firma.web}`);
  if (firma.adres) satirlar.push('', firma.adres);
  satirlar.push(sep);

  return satirlar.join('\n');
}

function browserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Çoklu bilgisayar / web client tespiti. Server'ın masaüstüne kaydetmesi
 * sadece sunucu makinede anlamlı; uzak (LAN/IP) taraycılardan bağlanan
 * kullanıcılar için bunun yanında mutlaka browser download tetiklenmelidir.
 *
 * `localhost` / `127.0.0.1` / `::1` → local server (Outlook COM + masaüstü kaydı
 * kullanıcıya ulaşan tek yol). Diğer her hostname (192.168.x.x, maşina adı,
 * vb.) → web client; taraycı download zorunlu.
 */
function isRemoteWebClient(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
  return true;
}

/**
 * Windows "Farklı Kaydet" penceresi — yalnızca özel durumlarda. Yeni akışta
 * kullanıcı `usePDFKayit` üzerinden kalıcı bir klasör seçmiş olur ve PDF
 * sessizce oraya yazılır; bu fonksiyon artık varsayılan akışta çağrılmıyor.
 *
 * Dönüş:
 *   - 'saved'       → kullanıcı dosyayı kaydetti
 *   - 'cancelled'   → kullanıcı pencerede iptal etti (sessizce çık)
 *   - 'unsupported' → tarayıcı API'yi desteklemiyor → fallback download yap
 */
async function showSaveDialog(blob: Blob, fileName: string): Promise<'saved' | 'cancelled' | 'unsupported'> {
  // showSaveFilePicker yalnızca Chromium tabanlı (Chrome/Edge) taraycılarda var.
  const w = window as Window & {
    showSaveFilePicker?: (opts: {
      suggestedName?: string;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<{
      createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }>;
    }>;
  };
  if (typeof w.showSaveFilePicker !== 'function') return 'unsupported';
  try {
    const handle = await w.showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description: 'PDF Belgesi', accept: { 'application/pdf': ['.pdf'] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return 'saved';
  } catch (err) {
    // AbortError = kullanıcı iptal etti → çağıran taraf "Kaydetme iptal edildi" gösterir.
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    console.warn('[showSaveDialog] hata, fallback download:', err);
    return 'unsupported';
  }
}
// Tip ihrac yok — fonksiyonun gelecekte özel durumlar için kalmasini saglar
// (ör. handle yok ve kullanici acik secim isterse). Su an cagrilmiyor.
void showSaveDialog;

// Otomatik dosya adı: <FIRMA-KLASOR>_<CARI>_<TEKLIFNO>.pdf
// → Kullanıcının Downloads klasöründe tek seviye, organize edilmiş dosya adı.
function buildAutoDownloadFileName(teklif: Teklif, firmaPdfKlasorAdi?: string): string {
  const firma = sanitizeWindowsSegment(
    (firmaPdfKlasorAdi || PDF_ROOT_FOLDER_NAME_FALLBACK).replace(/\s+TEKL[İI]FLER$/i, '').trim(),
    'GRUP',
  );
  const cariStem = extractCariStem(teklif.cari?.firmaAdi ?? '');
  const teklifNo = sanitizeWindowsSegment(teklif.teklifNo ?? '', '').trim();
  const parts = [firma, cariStem, teklifNo].filter(Boolean);
  return `${parts.join('_')}.pdf`;
}

// Browser auto-download: kullanıcı gesture'ı gerekmez, prompt yok, doğrudan
// Downloads klasörüne kaydedilir. Yeni akışta picker yok — kullanıcı kalıcı
// klasör seçmediyse PDF doğrudan İndirilenler'e iner.
async function autoSaveToDownloads(
  blob: Blob,
  teklif: Teklif,
  firmaPdfKlasorAdi?: string,
): Promise<{ saved: boolean; cancelled?: boolean; relativePath?: string }> {
  try {
    const fileName = buildAutoDownloadFileName(teklif, firmaPdfKlasorAdi);
    browserDownload(blob, fileName);
    return { saved: true, relativePath: `Downloads/${fileName}` };
  } catch {
    return { saved: false };
  }
}

function openMailtoDraft(aliciEposta: string | undefined, konu: string, govde: string): boolean {
  try {
    const toSegment = aliciEposta ? encodeURIComponent(aliciEposta) : '';
    const url = `mailto:${toSegment}?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(govde)}`;
    window.location.href = url;
    return true;
  } catch {
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('PDF verisi okunamadı.'));
        return;
      }

      const commaIndex = reader.result.indexOf(',');
      resolve(commaIndex >= 0 ? reader.result.slice(commaIndex + 1) : reader.result);
    };

    reader.onerror = () => reject(new Error('PDF verisi base64 formatına dönüştürülemedi.'));
    reader.readAsDataURL(blob);
  });
}

function buildFallbackResult(
  blob: Blob,
  teklif: Teklif,
  hedef: TeklifDisaAktarimHedefi,
  localSave?: { saved: boolean; relativePath?: string },
  firmaProfil?: Firma,
): TeklifDisaAktarimSonucu {
  const fallbackFileName = buildFallbackFileName(teklif);
  const aliciEposta = teklif.cari?.ePosta?.trim() || undefined;
  const mailKonu = buildMailSubject(teklif, firmaProfil);
  const mailGovdesi = buildMailBody(teklif, firmaProfil);

  if (!localSave?.saved) {
    browserDownload(blob, fallbackFileName);
  }

  if (hedef === 'email') {
    const acildi = openMailtoDraft(aliciEposta, mailKonu, mailGovdesi);
    return {
      hedef,
      teklif,
      pdfYolu: '',
      pdfDosyaAdi: fallbackFileName,
      klasorYolu: '',
      masaustuYolu: '',
      kayitYontemi: 'tarayici',
      dosyaAcildi: false,
      epostaHazirlandi: acildi,
      epostaHatasi: acildi ? 'Tarayıcı taslağı açıldı, ancak PDF eki otomatik eklenemedi.' : 'Mail taslağı açılamadı.',
      epostaTaslakYontemi: acildi ? 'mailto' : null,
      aliciEposta,
      mailKonu,
      mailGovdesi,
      yerelKayitYolu: localSave?.relativePath,
    };
  }

  return {
    hedef,
    teklif,
    pdfYolu: '',
    pdfDosyaAdi: fallbackFileName,
    klasorYolu: '',
    masaustuYolu: '',
    kayitYontemi: 'tarayici',
    dosyaAcildi: false,
    epostaHazirlandi: false,
    epostaTaslakYontemi: null,
    yerelKayitYolu: localSave?.relativePath,
  };
}

export async function teklifDisaAktar(
  blob: Blob,
  teklif: Teklif,
  hedef: TeklifDisaAktarimHedefi,
  firmaPdfKlasorAdi?: string,
  firmaProfil?: Firma,
): Promise<TeklifDisaAktarimSonucu> {
  const pdfBase64 = await blobToBase64(blob);

  try {
    // Auth middleware X-Session-Token + X-Firma-Id ister; aksi halde 401.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getSessionToken();
    const firmaId = getActiveFirmaId();
    if (token) headers['X-Session-Token'] = token;
    if (firmaId) headers['X-Firma-Id'] = firmaId;
    const response = await fetch(`${APP_CONFIG.API_BASE}/teklif/disa-aktar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ teklif, pdfBase64, hedef }),
    });

    const payload = await response.json() as Partial<TeklifDisaAktarimSonucu> & { error?: string };

    if (!response.ok) {
      throw new TeklifDisaAktarimHatasi(
        payload.error ?? 'Dışa aktarım işlemi tamamlanamadı.',
        {
          pdfYolu: payload.pdfYolu,
          pdfDosyaAdi: payload.pdfDosyaAdi,
        },
      );
    }

    return {
      hedef,
      teklif: payload.teklif as Teklif,
      pdfYolu: payload.pdfYolu ?? '',
      pdfDosyaAdi: payload.pdfDosyaAdi ?? buildFallbackFileName(teklif),
      klasorYolu: payload.klasorYolu ?? '',
      masaustuYolu: payload.masaustuYolu ?? '',
      kayitYontemi: 'otomatik',
      dosyaAcildi: payload.dosyaAcildi ?? false,
      dosyaAcmaHatasi: payload.dosyaAcmaHatasi,
      epostaHazirlandi: payload.epostaHazirlandi ?? false,
      epostaHatasi: payload.epostaHatasi,
      epostaTaslakYontemi: payload.epostaTaslakYontemi ?? null,
      aliciEposta: payload.aliciEposta,
      mailKonu: payload.mailKonu,
      mailGovdesi: payload.mailGovdesi,
      // Server uzak makinede ise PDF yalnızca server'ın MEBA klasörüne
      // yazıldı; kullanıcının tarayıcısına ulaşması için
      // teklifDisaAktarVeGerekirseYerelTaslakAc içinde zorunlu indirme tetiklenir.
      istemciTarafindaMailtoGerekli: payload.istemciTarafindaMailtoGerekli ?? isRemoteWebClient(),
    };
  } catch (error) {
    if (error instanceof TeklifDisaAktarimHatasi || !(error instanceof TypeError)) {
      throw error;
    }

    const localSave = await autoSaveToDownloads(blob, teklif, firmaPdfKlasorAdi);
    return buildFallbackResult(blob, teklif, hedef, localSave, firmaProfil);
  }
}

export async function teklifDisaAktarVeGerekirseYerelTaslakAc(
  blob: Blob,
  teklif: Teklif,
  hedef: TeklifDisaAktarimHedefi,
  firmaPdfKlasorAdi?: string,
  firmaProfil?: Firma,
  options?: {
    /**
     * Caller (TeklifEditor) PDF'i kullanıcının seçtiği klasöre zaten yazdı mı?
     * Verildiğinde otomatik fallback (browser download) atlanır; sonuca yerel
     * yol işlenir. Picker veya download tetiklenmez.
     */
    yerelKayitYapildi?: { saved: boolean; path?: string };
  },
): Promise<TeklifDisaAktarimSonucu> {
  const sonuc = await teklifDisaAktar(blob, teklif, hedef, firmaPdfKlasorAdi, firmaProfil);

  // ── Web/uzak istemci akışı ────────────────────────────────────────────
  // Server PDF'i kendi makinesindeki MEBA klasörüne yazdı; kullanıcının
  // tarayıcısına dosya UN ulaşmamış olabilir. Hem PDF hem email hedefinde:
  //   1) Kullanıcı seçili klasör belirlediyse caller orada zaten yazmış olur
  //      (options.yerelKayitYapildi). Aksi halde browser download tetiklenir.
  //   2) Email hedefinde mailto ile Outlook/varsayılan istemciyi aç.
  const uzakIstemci = isRemoteWebClient();
  const indirmeGerekli = uzakIstemci || sonuc.istemciTarafindaMailtoGerekli;

  if (!indirmeGerekli) {
    // Local server modunda da kullanıcı klasör seçtiyse onu sonuca işle.
    if (options?.yerelKayitYapildi?.saved) {
      return { ...sonuc, yerelKayitYolu: options.yerelKayitYapildi.path };
    }
    return sonuc;
  }

  // Yerel kayıt: caller (kullanıcı seçili klasörü) zaten yaptıysa bypass et;
  // aksi halde sessiz browser download (Downloads klasörü).
  const localSave = options?.yerelKayitYapildi?.saved
    ? { saved: true, relativePath: options.yerelKayitYapildi.path }
    : await autoSaveToDownloads(blob, teklif, firmaPdfKlasorAdi);

  if (hedef === 'pdf') {
    return {
      ...sonuc,
      kayitYontemi: localSave.saved ? sonuc.kayitYontemi : 'tarayici',
      yerelKayitYolu: localSave.relativePath,
      yerelKayitIptal: 'cancelled' in localSave ? localSave.cancelled : false,
    };
  }

  // hedef === 'email' → kullanıcı kaydetme penceresinde iptal ettiyse mailto'yu da
  // açma — kullanıcı işlemi durdurmak istedi.
  if ('cancelled' in localSave && localSave.cancelled) {
    return {
      ...sonuc,
      epostaHazirlandi: false,
      epostaTaslakYontemi: null,
      yerelKayitIptal: true,
    };
  }

  // hedef === 'email' → ek olarak mailto taslağı aç
  const konu = sonuc.mailKonu || buildMailSubject(teklif, firmaProfil);
  const govde = sonuc.mailGovdesi || buildMailBody(teklif, firmaProfil);
  const firma = buildMailFirmaProfili(teklif, firmaProfil);
  const acildi = openMailtoDraft(sonuc.aliciEposta, konu, govde);

  return {
    ...sonuc,
    epostaHazirlandi: acildi,
    epostaTaslakYontemi: acildi ? 'mailto' : null,
    yerelKayitYolu: localSave.relativePath,
    epostaHatasi: acildi
      ? localSave.saved
        ? options?.yerelKayitYapildi?.saved
          ? `PDF seçili kayıt konumuna kaydedildi (${firma.kisaAd}). Outlook penceresine bu PDF'i ekleyip kontrol ederek gönderiniz.`
          : `PDF bu bilgisayara indirildi (${firma.kisaAd}). Outlook penceresine bu PDF'i ekleyip kontrol ederek gönderiniz.`
        : 'PDF bu bilgisayara indirildi. Outlook penceresine bu PDF\'i ekleyip kontrol ederek gönderiniz.'
      : localSave.saved
      ? `PDF kaydedildi (${firma.kisaAd}), ancak yerel e-posta taslağı açılamadı.`
      : 'PDF bu bilgisayara indirildi, ancak yerel e-posta taslağı açılamadı.',
  };
}

export async function pdfKaydetVeAc(blob: Blob, teklif: Teklif): Promise<TeklifDisaAktarimSonucu> {
  return teklifDisaAktar(blob, teklif, 'pdf');
}
