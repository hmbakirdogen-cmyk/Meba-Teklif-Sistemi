import { useFirma } from '../context/useFirma';
import type { Firma } from '../types/firma';
import type { Teklif } from '../types';
import { formatFirmaUnvan } from '../utils/formatters';

/**
 * Bir teklif kaydına bakarak gösterilmesi gereken firma profilini döner.
 *  - teklif.firmaId varsa o firma
 *  - yoksa aktif firma
 *  - hiçbiri yoksa null (UI fallback değer kullanır)
 */
export function useTeklifFirma(teklif: Teklif | null | undefined): Firma | null {
  const { firmalar, aktifFirma } = useFirma();
  if (!teklif) return aktifFirma;
  if (teklif.firmaId) {
    return firmalar.find((f) => f.id === teklif.firmaId) ?? aktifFirma;
  }
  return aktifFirma;
}

/**
 * Web üzerindeki PDF/teklif template'lerinde kullanılmak üzere firma için
 * hazır metinler — null'a düşmeyen güvenli alanlar. Teklif yoksa varsayılan
 * MEBA fallback değerleri döner (geriye uyumluluk).
 */
export function useTeklifFirmaBilgileri(teklif: Teklif | null | undefined) {
  const firma = useTeklifFirma(teklif);

  // Fallback (firma null ise) — MEBA değerleri (DB ile uyumlu kisaAd)
  const FALLBACK_AD = 'MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik San. Tic. Ltd. Şti.';
  const FALLBACK = {
    id: 'meba',
    logoPath: '/logo-meba.png',
    logoScale: 1,
    renkBirincil: '#1A2B42',
    kisaAd: 'MEBA',
    ad: formatFirmaUnvan(FALLBACK_AD),
    adres: 'Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ',
    telefon: '0352 502 07 80',
    eposta: 'info@mebamekanik.com',
    web: 'www.mebamekanik.com',
    iban: '',
    vergiDairesi: '',
    vergiNo: '',
  };

  if (!firma) return FALLBACK;

  const epostaDomainWeb = firma.eposta && firma.eposta.includes('@')
    ? `www.${firma.eposta.split('@')[1]}`
    : '';

  return {
    id: firma.id,
    logoPath: firma.logoPath || FALLBACK.logoPath,
    logoScale: typeof firma.logoScale === 'number' && Number.isFinite(firma.logoScale) ? firma.logoScale : FALLBACK.logoScale,
    renkBirincil: firma.renkBirincil || FALLBACK.renkBirincil,
    kisaAd: firma.kisaAd || FALLBACK.kisaAd,
    ad: formatFirmaUnvan(firma.ad || FALLBACK_AD),
    adres: firma.adres || (firma.id === 'meba' ? FALLBACK.adres : ''),
    telefon: firma.telefon || (firma.id === 'meba' ? FALLBACK.telefon : ''),
    eposta: firma.eposta || (firma.id === 'meba' ? FALLBACK.eposta : ''),
    web: firma.web || epostaDomainWeb || (firma.id === 'meba' ? FALLBACK.web : ''),
    iban: firma.iban || '',
    vergiDairesi: firma.vergiDairesi || '',
    vergiNo: firma.vergiNo || '',
  };
}

