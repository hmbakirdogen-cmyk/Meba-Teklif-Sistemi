import { useFirma } from '../context/useFirma';
import type { Firma } from '../types/firma';
import type { Teklif } from '../types';

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

  // Fallback (firma null ise) — eski MEBA değerleri
  const FALLBACK = {
    logoPath: '/logo-meba.png',
    kisaAd: 'MEBA Mekanik',
    ad: 'MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik San. Tic. Ltd. Şti.',
    adres: 'Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ',
    telefon: '0352 502 07 80',
    eposta: 'info@mebamekanik.com',
    web: 'www.mebamekanik.com',
    iban: '',
    vergiDairesi: '',
    vergiNo: '',
  };

  if (!firma) return FALLBACK;
  return {
    logoPath: firma.logoPath || FALLBACK.logoPath,
    kisaAd: firma.kisaAd || FALLBACK.kisaAd,
    ad: firma.ad || FALLBACK.ad,
    adres: firma.adres || (firma.id === 'meba' ? FALLBACK.adres : ''),
    telefon: firma.telefon || (firma.id === 'meba' ? FALLBACK.telefon : ''),
    eposta: firma.eposta || (firma.id === 'meba' ? FALLBACK.eposta : ''),
    web: firma.eposta ? firma.eposta.replace(/^[^@]+@/, 'www.') : (firma.id === 'meba' ? FALLBACK.web : ''),
    iban: firma.iban || '',
    vergiDairesi: firma.vergiDairesi || '',
    vergiNo: firma.vergiNo || '',
  };
}
