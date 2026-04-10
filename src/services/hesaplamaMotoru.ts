import type { TeklifSatiri } from '../types';

function satirToplamHesapla(satir: Omit<TeklifSatiri, 'satirToplami'>): number {
  const brutFiyat = satir.miktar * satir.birimFiyat;
  const indirimTutari = brutFiyat * (satir.indirimOrani / 100);
  const indirimliTutar = brutFiyat - indirimTutari;
  return indirimliTutar;
}

function genelToplamHesapla(satirlar: TeklifSatiri[], kdvOrani = 0): {
  araToplam: number;
  toplamIndirim: number;
  toplamVergi: number;
  genelToplam: number;
} {
  let araToplam = 0;
  let toplamIndirim = 0;

  for (const satir of satirlar) {
    const brut = satir.miktar * satir.birimFiyat;
    const indirim = brut * (satir.indirimOrani / 100);
    const indirimli = brut - indirim;

    araToplam += indirimli;
    toplamIndirim += indirim;
  }

  const toplamVergi = araToplam * (kdvOrani / 100);

  return {
    araToplam,
    toplamIndirim,
    toplamVergi,
    genelToplam: araToplam + toplamVergi,
  };
}

function satirIdUret(): string {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export const hesaplamaMotoru = {
  satirToplamHesapla,
  genelToplamHesapla,
  satirIdUret,
};
