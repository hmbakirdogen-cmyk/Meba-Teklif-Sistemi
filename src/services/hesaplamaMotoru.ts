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

// Kuruş hassasiyetinde yuvarlama — IEEE-754 noise (örn. 0.1+0.2=0.30000…04)
// kümülatif hatalara dönüşmesin diye her ara toplamı 2 ondalığa sabitliyoruz.
function kurusYuvarla(n: number): number {
  return Math.round(n * 100) / 100;
}

function teklifToplamlariniHesapla(params: {
  araToplam: number;
  kdvOrani: number;
  iskontoOrani: number;
}): TeklifToplam {
  const { araToplam, kdvOrani, iskontoOrani } = params;
  const araToplamY = kurusYuvarla(araToplam);
  const iskontoTutar = kurusYuvarla(araToplamY * (iskontoOrani / 100));
  const iskontoSonrasiToplam = kurusYuvarla(araToplamY - iskontoTutar);
  const kdvTutar = kurusYuvarla(iskontoSonrasiToplam * (kdvOrani / 100));
  const genelToplam = kurusYuvarla(iskontoSonrasiToplam + kdvTutar);
  return { araToplam: araToplamY, iskontoOrani, iskontoTutar, iskontoSonrasiToplam, kdvOrani, kdvTutar, genelToplam };
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
  // Set alt kalemi → fiyat satırı yok; toplama girmez.
  if (satir.setAltKalem) return 0;
  const brutFiyat = satir.miktar * satir.birimFiyat;
  const sonrasi = brutFiyat - brutFiyat * ((satir.indirimOrani ?? 0) / 100);
  return kurusYuvarla(sonrasi);
}

function paraBirimineGoreToplamlar(
  satirlar: TeklifSatiri[],
  teklifParaBirimi?: string,
): ParaBirimiToplamlari {
  const toplamlar: ParaBirimiToplamlari = { TRY: 0, EUR: 0, USD: 0 };

  for (const satir of satirlar) {
    if (satir.setAltKalem) continue; // Defansif: alt kalem birimFiyat'ı 0 olsa bile döngüye girmesin.
    if (satir.onayDurumu === 'reddedildi') continue; // Kismi onayda iptal edilen satir hesaba dahil olmaz.
    const pb = satirParaBirimiGetir(satir, teklifParaBirimi);
    // satir.satirToplami stale olabilir (eski kayıt). Hep taze hesap kullan.
    toplamlar[pb] += satirToplamHesapla(satir);
  }

  // Her bucket'ı kuruşa yuvarla — biriken IEEE-754 hatalarını sil.
  toplamlar.TRY = kurusYuvarla(toplamlar.TRY);
  toplamlar.EUR = kurusYuvarla(toplamlar.EUR);
  toplamlar.USD = kurusYuvarla(toplamlar.USD);
  return toplamlar;
}

function genelToplamHesapla(
  satirlar: TeklifSatiri[],
  kdvOrani = 0,
  iskontoOrani = 0,
  teklifParaBirimi?: string,
): TeklifToplam & { toplamIndirim: number } {
  let araToplam = 0;
  let toplamIndirim = 0;

  // Belge para biriminde olan satırların toplamını al — çoklu para biriminde
  // farklı kur'daki satırlar tek bir araToplam'a karışmasın.
  const belgePb = teklifParaBirimi
    ? desteklenenSatirParaBirimi(teklifParaBirimi) ?? 'TRY'
    : null;

  for (const satir of satirlar) {
    if (satir.setAltKalem) continue; // Set alt kalemi toplama girmez.
    if (satir.onayDurumu === 'reddedildi') continue; // Kismi onayda iptal edilen satir hesaba dahil olmaz.
    if (belgePb) {
      const sPb = satirParaBirimiGetir(satir, teklifParaBirimi);
      if (sPb !== belgePb) continue; // Farklı para birimindeki satırlar bu bucket'a girmez.
    }
    const brut = satir.miktar * satir.birimFiyat;
    const indirim = brut * ((satir.indirimOrani ?? 0) / 100);
    araToplam += brut - indirim;
    toplamIndirim += indirim;
  }

  return {
    ...teklifToplamlariniHesapla({ araToplam, kdvOrani, iskontoOrani }),
    toplamIndirim: kurusYuvarla(toplamIndirim),
  };
}

function satirIdUret(): string {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export interface ParaKartiData {
  pb: DesteklenenSatirParaBirimi;
  araToplam: number;
  iskontoTutar: number;
  kdvTutar: number;
  total: number;
}

function kullanilanParaBirimiKartlariniHesapla(
  satirlar: TeklifSatiri[],
  teklifParaBirimi: string,
  kdvOrani: number,
  iskontoOrani: number,
): ParaKartiData[] {
  const toplamlar = paraBirimineGoreToplamlar(satirlar, teklifParaBirimi);
  return SATIR_PARA_BIRIMLERI
    .filter((pb) => satirlar.some((s) => satirParaBirimiGetir(s, teklifParaBirimi) === pb))
    .map((pb) => {
      const hesap = teklifToplamlariniHesapla({ araToplam: toplamlar[pb], kdvOrani, iskontoOrani });
      return { pb, araToplam: hesap.araToplam, iskontoTutar: hesap.iskontoTutar, kdvTutar: hesap.kdvTutar, total: hesap.genelToplam };
    });
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
  kullanilanParaBirimiKartlariniHesapla,
};
