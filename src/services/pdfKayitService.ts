import { APP_CONFIG } from '../config';
import { getSessionToken, getActiveFirmaId } from './apiClient';
import type { Firma, Teklif } from '../types';

const INVALID_WINDOWS_SEGMENT_REGEX = /[<>:"/\\|?*]/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;
const PDF_ROOT_FOLDER_NAME_FALLBACK = 'GRUP ŞİRKETLERİ TEKLİFLER';

export type TeklifDisaAktarimHedefi = 'pdf' | 'email';
export type TeklifDisaAktarimYontemi = 'otomatik' | 'tarayici';
/** Sunucu Resend ile gönderdi → 'resend'. Resend başarısız → mailto fallback.
 *  Hiç gönderim açılamadı → null. */
export type EpostaTaslakYontemi = 'resend' | 'mailto' | null;

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
  const withoutControls = Array.from(value).filter((c) => c.charCodeAt(0) >= 32).join('');
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

function buildMailSubject(teklif: Teklif, firmaProfil?: Firma): string {
  const firma = buildMailFirmaProfili(teklif, firmaProfil);
  return teklif.teklifNo ? `${firma.kisaAd} Teklif Belgesi - ${teklif.teklifNo}` : `${firma.kisaAd} Teklif Belgesi`;
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

/**
 * Resend ile e-posta gönder. Hata durumunda mailto fallback'ine düşülür.
 */
async function resendIleGonder(
  pdfBase64: string,
  teklif: Teklif,
  firmaProfil?: Firma,
): Promise<{ ok: boolean; resendId?: string; subject?: string; error?: string }> {
  const aliciEposta = teklif.cari?.ePosta?.trim() || '';
  if (!aliciEposta) {
    return { ok: false, error: 'Carinin e-posta adresi tanımlı değil.' };
  }
  const subject = buildMailSubject(teklif, firmaProfil);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getSessionToken();
  const firmaId = getActiveFirmaId();
  if (token) headers['X-Session-Token'] = token;
  if (firmaId) headers['X-Firma-Id'] = firmaId;
  try {
    const response = await fetch(`${APP_CONFIG.API_BASE}/teklif/eposta-gonder`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        teklifId: teklif.id,
        to: aliciEposta,
        subject,
        pdfBase64,
      }),
    });
    const payload = (await response.json()) as { ok?: boolean; resendId?: string; error?: string };
    if (!response.ok || !payload.ok) {
      return { ok: false, error: payload.error || 'E-posta gönderilemedi.' };
    }
    return { ok: true, resendId: payload.resendId, subject };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Ağ hatası.' };
  }
}

/**
 * PDF/e-posta dışa aktarımı — tamamen client-side. `hedef === 'pdf'` ise yalnız
 * PDF kaydedilir; `hedef === 'email'` ise PDF kaydedilir VE server üzerinden
 * Resend ile e-posta gönderilir.
 *
 * @param options.yerelKayitYapildi - Caller (kullanıcı klasörü) PDF'i zaten
 *   yazdıysa otomatik download tetiklenmez.
 */
export async function teklifDisaAktar(
  blob: Blob,
  teklif: Teklif,
  hedef: TeklifDisaAktarimHedefi,
  firmaPdfKlasorAdi?: string,
  firmaProfil?: Firma,
  options?: { yerelKayitYapildi?: { saved: boolean; path?: string } },
): Promise<TeklifDisaAktarimSonucu> {
  const fallbackFileName = buildFallbackFileName(teklif);
  const aliciEposta = teklif.cari?.ePosta?.trim() || undefined;
  const mailKonu = buildMailSubject(teklif, firmaProfil);
  const mailGovdesi = buildMailBody(teklif, firmaProfil);

  // Yerel kayıt: caller (kullanıcı seçili klasörü) zaten yaptıysa bypass; aksi
  // halde sessiz browser download (Downloads klasörü).
  const localSave = options?.yerelKayitYapildi?.saved
    ? { saved: true, relativePath: options.yerelKayitYapildi.path }
    : await autoSaveToDownloads(blob, teklif, firmaPdfKlasorAdi);

  if (hedef === 'pdf') {
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
      yerelKayitYolu: localSave.relativePath,
      yerelKayitIptal: 'cancelled' in localSave ? localSave.cancelled : false,
    };
  }

  // hedef === 'email': Resend ile gönder
  const pdfBase64 = await blobToBase64(blob);
  const sendResult = await resendIleGonder(pdfBase64, teklif, firmaProfil);
  if (sendResult.ok) {
    const firmaKisa = buildMailFirmaProfili(teklif, firmaProfil).kisaAd;
    return {
      hedef,
      teklif,
      pdfYolu: '',
      pdfDosyaAdi: fallbackFileName,
      klasorYolu: '',
      masaustuYolu: '',
      kayitYontemi: 'tarayici',
      dosyaAcildi: false,
      epostaHazirlandi: true,
      epostaTaslakYontemi: 'resend',
      aliciEposta,
      mailKonu: sendResult.subject || mailKonu,
      mailGovdesi,
      yerelKayitYolu: localSave.relativePath,
      epostaHatasi: `E-posta ${aliciEposta || 'alıcıya'} (${firmaKisa}) Resend üzerinden başarıyla gönderildi.`,
    };
  }

  // Resend başarısız → mailto fallback (kullanıcı kendi istemcisini açar)
  const mailtoOpened = openMailtoDraft(aliciEposta, mailKonu, mailGovdesi);
  return {
    hedef,
    teklif,
    pdfYolu: '',
    pdfDosyaAdi: fallbackFileName,
    klasorYolu: '',
    masaustuYolu: '',
    kayitYontemi: 'tarayici',
    dosyaAcildi: false,
    epostaHazirlandi: mailtoOpened,
    epostaTaslakYontemi: mailtoOpened ? 'mailto' : null,
    epostaHatasi: mailtoOpened
      ? `E-posta otomatik gönderilemedi (${sendResult.error || 'sunucu hatası'}). Tarayıcı taslağı açıldı; PDF eki manuel ekleyin.`
      : sendResult.error || 'E-posta gönderilemedi.',
    aliciEposta,
    mailKonu,
    mailGovdesi,
    yerelKayitYolu: localSave.relativePath,
  };
}

/**
 * Geriye dönük uyum: eski adı koruyan wrapper. `options.yerelKayitYapildi`
 * yine destekleniyor. Tüm "uzak istemci vs aynı makina" mantığı kaldırıldı —
 * artık her zaman client-side akış.
 */
export async function teklifDisaAktarVeGerekirseYerelTaslakAc(
  blob: Blob,
  teklif: Teklif,
  hedef: TeklifDisaAktarimHedefi,
  firmaPdfKlasorAdi?: string,
  firmaProfil?: Firma,
  options?: { yerelKayitYapildi?: { saved: boolean; path?: string } },
): Promise<TeklifDisaAktarimSonucu> {
  return teklifDisaAktar(blob, teklif, hedef, firmaPdfKlasorAdi, firmaProfil, options);
}

export async function pdfKaydetVeAc(blob: Blob, teklif: Teklif): Promise<TeklifDisaAktarimSonucu> {
  return teklifDisaAktar(blob, teklif, 'pdf');
}
