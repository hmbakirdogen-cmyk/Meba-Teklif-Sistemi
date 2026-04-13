import type { ParaBirimi, TeklifSatiri } from '../types';

export interface TeklifToplam {
  araToplam: number;
  iskontoOrani: number;
  iskontoTutar: number;
  iskontoSonrasiToplam: number;
  kdvOrani: number;
  kdvTutar: number;
  genelToplam: number;
}

export type DesteklenenSatirParaBirimi = Extract<ParaBirimi, 'TRY' | 'EUR' | 'USD'>;
export type ParaBirimiToplamlari = Record<DesteklenenSatirParaBirimi, number>;

const SATIR_PARA_BIRIMLERI: DesteklenenSatirParaBirimi[] = ['TRY', 'EUR', 'USD'];

function teklifToplamlariniHesapla(params: {
  araToplam: number;
  kdvOrani: number;
  iskontoOrani: number;
}): TeklifToplam {
  const { araToplam, kdvOrani, iskontoOrani } = params;
  const iskontoTutar = araToplam * (iskontoOrani / 100);
  const iskontoSonrasiToplam = araToplam - iskontoTutar;
  const kdvTutar = iskontoSonrasiToplam * (kdvOrani / 100);
  const genelToplam = iskontoSonrasiToplam + kdvTutar;
  return { araToplam, iskontoOrani, iskontoTutar, iskontoSonrasiToplam, kdvOrani, kdvTutar, genelToplam };
}

function desteklenenSatirParaBirimi(pb?: string): DesteklenenSatirParaBirimi | null {
  if (pb === 'TRY' || pb === 'EUR' || pb === 'USD') return pb;
  return null;
}

function varsayilanSatirParaBirimi(pb?: string): DesteklenenSatirParaBirimi {
  return desteklenenSatirParaBirimi(pb) ?? 'TRY';
}

function satirParaBirimiGetir(
  satir: Pick<TeklifSatiri, 'paraBirimi'>,
  teklifParaBirimi?: string,
): DesteklenenSatirParaBirimi {
  return desteklenenSatirParaBirimi(satir.paraBirimi) ?? varsayilanSatirParaBirimi(teklifParaBirimi);
}

function satirToplamHesapla(satir: Omit<TeklifSatiri, 'satirToplami'>): number {
  const brutFiyat = satir.miktar * satir.birimFiyat;
  return brutFiyat - brutFiyat * (satir.indirimOrani / 100);
}

function paraBirimineGoreToplamlar(
  satirlar: TeklifSatiri[],
  teklifParaBirimi?: string,
): ParaBirimiToplamlari {
  const toplamlar: ParaBirimiToplamlari = { TRY: 0, EUR: 0, USD: 0 };

  for (const satir of satirlar) {
    const pb = satirParaBirimiGetir(satir, teklifParaBirimi);
    toplamlar[pb] += satir.satirToplami;
  }

  return toplamlar;
}

function genelToplamHesapla(
  satirlar: TeklifSatiri[],
  kdvOrani = 0,
  iskontoOrani = 0,
): TeklifToplam & { toplamIndirim: number } {
  let araToplam = 0;
  let toplamIndirim = 0;

  for (const satir of satirlar) {
    const brut = satir.miktar * satir.birimFiyat;
    const indirim = brut * (satir.indirimOrani / 100);
    araToplam += brut - indirim;
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
  SATIR_PARA_BIRIMLERI,
  satirToplamHesapla,
  genelToplamHesapla,
  teklifToplamlariniHesapla,
  paraBirimineGoreToplamlar,
  satirParaBirimiGetir,
  varsayilanSatirParaBirimi,
  satirIdUret,
};
