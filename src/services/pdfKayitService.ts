import { APP_CONFIG } from '../config';
import type { Teklif } from '../types';

const INVALID_WINDOWS_SEGMENT_REGEX = /[<>:"/\\|?*]/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;

export type PdfKayitYontemi = 'otomatik' | 'tarayici';

export interface PdfKayitSonucu {
  teklif: Teklif;
  pdfYolu: string;
  pdfDosyaAdi: string;
  klasorYolu: string;
  masaustuYolu: string;
  acildi: boolean;
  acmaHatasi?: string;
  kayitYontemi: PdfKayitYontemi;
}

export class PdfKayitHatasi extends Error {
  pdfYolu?: string;
  pdfDosyaAdi?: string;

  constructor(message: string, options?: { pdfYolu?: string; pdfDosyaAdi?: string }) {
    super(message);
    this.name = 'PdfKayitHatasi';
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

function browserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

export async function pdfKaydetVeAc(
  blob: Blob,
  teklif: Teklif,
): Promise<PdfKayitSonucu> {
  const pdfBase64 = await blobToBase64(blob);

  try {
    const response = await fetch(`${APP_CONFIG.API_BASE}/pdf/kaydet-ve-ac`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teklif, pdfBase64 }),
    });

    const payload = await response.json() as Partial<PdfKayitSonucu> & { error?: string };

    if (!response.ok) {
      throw new PdfKayitHatasi(
        payload.error ?? 'PDF kayit islemi tamamlanamadi.',
        {
          pdfYolu: payload.pdfYolu,
          pdfDosyaAdi: payload.pdfDosyaAdi,
        },
      );
    }

    return {
      teklif: payload.teklif as Teklif,
      pdfYolu: payload.pdfYolu ?? '',
      pdfDosyaAdi: payload.pdfDosyaAdi ?? buildFallbackFileName(teklif),
      klasorYolu: payload.klasorYolu ?? '',
      masaustuYolu: payload.masaustuYolu ?? '',
      acildi: payload.acildi ?? false,
      acmaHatasi: payload.acmaHatasi,
      kayitYontemi: 'otomatik',
    };
  } catch (error) {
    if (error instanceof PdfKayitHatasi || !(error instanceof TypeError)) {
      throw error;
    }

    const fallbackFileName = buildFallbackFileName(teklif);
    browserDownload(blob, fallbackFileName);

    return {
      teklif,
      pdfYolu: '',
      pdfDosyaAdi: fallbackFileName,
      klasorYolu: '',
      masaustuYolu: '',
      acildi: false,
      kayitYontemi: 'tarayici',
    };
  }
}
