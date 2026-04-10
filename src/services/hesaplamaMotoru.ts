import type { TeklifSatiri } from '../types';

// ── Ortak toplam sonuç tipi ───────────────────────────────────────────────────
// Hem ekran (ToplamPaneli) hem PDF (TeklifSablonu) bu nesneyi kullanır.
export interface TeklifToplam {
  araToplam: number;
  iskontoOrani: number;
  iskontoTutar: number;
  iskontoSonrasiToplam: number;
  kdvOrani: number;
  kdvTutar: number;
  genelToplam: number;
}

/**
 * Tek hesaplama zinciri — tüm türetilmiş değerleri üretir.
 *   araToplam (satır toplamları net)
 *   → iskontoTutar     = araToplam × iskontoOrani / 100
 *   → iskontoSonrasi   = araToplam − iskontoTutar
 *   → kdvTutar         = iskontoSonrasi × kdvOrani / 100
 *   → genelToplam      = iskontoSonrasi + kdvTutar
 */
function teklifToplamlariniHesapla(params: {
  araToplam: number;
  kdvOrani: number;
  iskontoOrani: number;
}): TeklifToplam {
  const { araToplam, kdvOrani, iskontoOrani } = params;
  const iskontoTutar        = araToplam * (iskontoOrani / 100);
  const iskontoSonrasiToplam = araToplam - iskontoTutar;
  const kdvTutar             = iskontoSonrasiToplam * (kdvOrani / 100);
  const genelToplam          = iskontoSonrasiToplam + kdvTutar;
  return { araToplam, iskontoOrani, iskontoTutar, iskontoSonrasiToplam, kdvOrani, kdvTutar, genelToplam };
}

// ── Satır bazlı yardımcılar ───────────────────────────────────────────────────

function satirToplamHesapla(satir: Omit<TeklifSatiri, 'satirToplami'>): number {
  const brutFiyat = satir.miktar * satir.birimFiyat;
  return brutFiyat - brutFiyat * (satir.indirimOrani / 100);
}

function genelToplamHesapla(
  satirlar: TeklifSatiri[],
  kdvOrani = 0,
  iskontoOrani = 0,
): TeklifToplam & { toplamIndirim: number } {
  let araToplam    = 0;
  let toplamIndirim = 0;

  for (const satir of satirlar) {
    const brut    = satir.miktar * satir.birimFiyat;
    const indirim = brut * (satir.indirimOrani / 100);
    araToplam    += brut - indirim;
    toplamIndirim += indirim;
  }

  return {
    ...teklifToplamlariniHesapla({ araToplam, kdvOrani, iskontoOrani }),
    toplamIndirim,
  };
}

function satirIdUret(): string {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export const hesaplamaMotoru = {
  satirToplamHesapla,
  genelToplamHesapla,
  teklifToplamlariniHesapla,
  satirIdUret,
};
