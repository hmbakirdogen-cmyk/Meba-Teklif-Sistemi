export interface UrunSonFiyatPayload {
  birimFiyat: number;
  indirimOrani: number;
  paraBirimi?: string;
  ts: string;
}

const STORAGE_PREFIX = 'meba.urunSonFiyat.';

function getStorageKey(urunRef: string) {
  return `${STORAGE_PREFIX}${urunRef}`;
}

function isPayload(value: unknown): value is UrunSonFiyatPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.birimFiyat === 'number' &&
    Number.isFinite(payload.birimFiyat) &&
    typeof payload.indirimOrani === 'number' &&
    Number.isFinite(payload.indirimOrani) &&
    typeof payload.ts === 'string'
  );
}

export function getUrunSonFiyat(urunRef?: string | null): UrunSonFiyatPayload | null {
  if (!urunRef || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(urunRef));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setUrunSonFiyat(urunRef: string, payload: UrunSonFiyatPayload) {
  if (!urunRef || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(urunRef), JSON.stringify(payload));
  } catch {
  }
}

export function clearUrunSonFiyat(urunRef?: string | null) {
  if (!urunRef || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getStorageKey(urunRef));
  } catch {
  }
}
