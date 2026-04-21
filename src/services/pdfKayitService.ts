import { APP_CONFIG } from '../config';
import type { Teklif } from '../types';

const INVALID_WINDOWS_SEGMENT_REGEX = /[<>:"/\\|?*]/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;

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

function buildMailSubject(teklif: Teklif): string {
  const cariStem = extractCariStem(teklif.cari?.firmaAdi ?? '');
  return `Teklif - ${teklif.teklifNo} - ${cariStem}`;
}

function buildMailBody(teklif: Teklif): string {
  const hitap = teklif.contactName?.trim()
    ? `Sayin ${teklif.contactName.trim()},`
    : 'Merhaba,';

  return [
    hitap,
    '',
    'Ilgili teklif dosyaniz ekte sunulmustur.',
    '',
    'Iyi calismalar dileriz.',
    '',
    'MEBA Mekanik',
  ].join('\n');
}

function browserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openMailtoDraft(aliciEposta: string, konu: string, govde: string): boolean {
  try {
    const url = `mailto:${encodeURIComponent(aliciEposta)}?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(govde)}`;
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
        reject(new Error('PDF verisi okunamadi.'));
        return;
      }

      const commaIndex = reader.result.indexOf(',');
      resolve(commaIndex >= 0 ? reader.result.slice(commaIndex + 1) : reader.result);
    };

    reader.onerror = () => reject(new Error('PDF verisi base64 formatina donusturulemedi.'));
    reader.readAsDataURL(blob);
  });
}

function buildFallbackResult(
  blob: Blob,
  teklif: Teklif,
  hedef: TeklifDisaAktarimHedefi,
): TeklifDisaAktarimSonucu {
  const fallbackFileName = buildFallbackFileName(teklif);
  const aliciEposta = teklif.cari?.ePosta?.trim() || undefined;
  const mailKonu = buildMailSubject(teklif);
  const mailGovdesi = buildMailBody(teklif);

  browserDownload(blob, fallbackFileName);

  if (hedef === 'email') {
    if (!aliciEposta) {
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
        epostaHatasi: 'Alici icin e-mail adresi bulunamadi.',
        epostaTaslakYontemi: null,
        mailKonu,
        mailGovdesi,
      };
    }

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
      epostaHatasi: acildi ? 'Tarayici taslagi acildi, ancak PDF eki otomatik eklenemedi.' : 'Mail taslagi acilamadi.',
      epostaTaslakYontemi: acildi ? 'mailto' : null,
      aliciEposta,
      mailKonu,
      mailGovdesi,
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
  };
}

export async function teklifDisaAktar(
  blob: Blob,
  teklif: Teklif,
  hedef: TeklifDisaAktarimHedefi,
): Promise<TeklifDisaAktarimSonucu> {
  const pdfBase64 = await blobToBase64(blob);

  try {
    const response = await fetch(`${APP_CONFIG.API_BASE}/teklif/disa-aktar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teklif, pdfBase64, hedef }),
    });

    const payload = await response.json() as Partial<TeklifDisaAktarimSonucu> & { error?: string };

    if (!response.ok) {
      throw new TeklifDisaAktarimHatasi(
        payload.error ?? 'Disa aktarim islemi tamamlanamadi.',
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
    };
  } catch (error) {
    if (error instanceof TeklifDisaAktarimHatasi || !(error instanceof TypeError)) {
      throw error;
    }

    return buildFallbackResult(blob, teklif, hedef);
  }
}

export async function pdfKaydetVeAc(blob: Blob, teklif: Teklif): Promise<TeklifDisaAktarimSonucu> {
  return teklifDisaAktar(blob, teklif, 'pdf');
}
