import type { Urun } from '../types';
import { dataStore } from './dataStore';

const varsayilanUrunler: Urun[] = [
  { id: 'u1',  urunKod: 'CP96SDB80-200',     urunAdi: '80x200 Manyetik Yastıklı Silindir',                   aciklama: 'Ø80 mm · 200 mm strok · manyetik sensörlü',           kategori: 'Silindir',    birim: 'Adet', varsayilanFiyat: 98.90 },
  { id: 'u2',  urunKod: 'SY9420-5DZ-03F-Q',  urunAdi: '3/8" 5/3 Egzoz Merkez Çift Bobin Valf',              aciklama: '3/8" bağlantı · 5/3 egzoz merkez · 24 VDC',          kategori: 'Valf',        birim: 'Adet', varsayilanFiyat: 72.90 },
  { id: 'u3',  urunKod: 'CP96SDB40-100',     urunAdi: '40x100 Manyetik Yastıklı Silindir',                   aciklama: 'Ø40 mm · 100 mm strok · manyetik sensörlü',           kategori: 'Silindir',    birim: 'Adet', varsayilanFiyat: 49.45 },
  { id: 'u4',  urunKod: 'SY7120-5DZ-02F-Q',  urunAdi: '1/4" 5/2 Tek Bobin Valf',                            aciklama: '1/4" bağlantı · 5/2 · tek bobin · 24 VDC',           kategori: 'Valf',        birim: 'Adet', varsayilanFiyat: 41.65 },
  { id: 'u5',  urunKod: 'CP96SDB63-250',     urunAdi: '63x250 Manyetik Yastıklı Silindir',                   aciklama: 'Ø63 mm · 250 mm strok · manyetik sensörlü',           kategori: 'Silindir',    birim: 'Adet', varsayilanFiyat: 77.25 },
  { id: 'u6',  urunKod: 'SY7320-5DZ-02F-Q',  urunAdi: '1/4" 5/3 Kapalı Merkez Çift Bobin Valf',             aciklama: '1/4" bağlantı · 5/3 kapalı merkez · 24 VDC',         kategori: 'Valf',        birim: 'Adet', varsayilanFiyat: 65.45 },
  { id: 'u7',  urunKod: 'CP96SDB50-150',     urunAdi: '50x150 Manyetik Yastıklı Silindir',                   aciklama: 'Ø50 mm · 150 mm strok · manyetik sensörlü',           kategori: 'Silindir',    birim: 'Adet', varsayilanFiyat: 61.20 },
  { id: 'u8',  urunKod: 'CP96SDB40-70',      urunAdi: '40x70 Manyetik Yastıklı Silindir',                    aciklama: 'Ø40 mm · 70 mm strok · manyetik sensörlü',            kategori: 'Silindir',    birim: 'Adet', varsayilanFiyat: 48.50 },
  { id: 'u9',  urunKod: 'VHS40-F04A',        urunAdi: '1/2" Manuel Aç/Kapa Valfi',                           aciklama: '1/2" bağlantı · manuel 3/2 yay dönüşlü',             kategori: 'Manuel Valf', birim: 'Adet', varsayilanFiyat: 21.50 },
  { id: 'u10', urunKod: 'AW40-F04BG-A',      urunAdi: '1/2" Filtre Regülatörü',                              aciklama: '1/2" bağlantı · manometre dahil · otomatik tahliye',  kategori: 'Regülatör',   birim: 'Adet', varsayilanFiyat: 45.00 },
  { id: 'u11', urunKod: 'EAV4000-F04-5DZ-Q', urunAdi: '1/2" Soft Starter Valfi',                             aciklama: '1/2" bağlantı · yavaş start fonksiyonlu',             kategori: 'Aksesuar',    birim: 'Adet', varsayilanFiyat: 89.25 },
  { id: 'u12', urunKod: 'Y400T-A',           urunAdi: 'Bağlantı Braketi',                                    aciklama: 'Seri bağlantı için bağlantı braketi',                 kategori: 'Aksesuar',    birim: 'Adet', varsayilanFiyat: 2.70  },
  { id: 'u13', urunKod: 'ASP530F-03-08S',    urunAdi: '3/8" 8 mm Pilot Kontrollü Çek Valf',                  aciklama: '3/8" bağlantı · 8 mm çıkış · pilot kontrollü',        kategori: 'Çek Valf',    birim: 'Adet', varsayilanFiyat: 32.10 },
  { id: 'u14', urunKod: 'ISE30A-01-F-G',     urunAdi: 'Dijital Basınç Sensörü',                              aciklama: '0–1 MPa · NPN/PNP çıkış · LED göstergeli',            kategori: 'Sensör',      birim: 'Adet', varsayilanFiyat: 51.30 },
  { id: 'u15', urunKod: 'KQ2W02-M3G',        urunAdi: '2 mm / M3 Erkek Dişli Dirsek Bağlantı (Push-In)',    aciklama: '2 mm boru · M3 erkek dişli · dirsek (Push-In)',       kategori: 'Bağlantı',    birim: 'Adet', varsayilanFiyat: 0     },
];

function migrateUrun(u: Partial<Urun> & { id: string; urunKod: string; urunAdi: string }): Urun {
  return {
    id:              u.id,
    urunKod:         u.urunKod,
    urunAdi:         u.urunAdi,
    aciklama:        u.aciklama        ?? '',
    kategori:        u.kategori        ?? '',
    birim:           u.birim           ?? 'Adet',
    varsayilanFiyat: u.varsayilanFiyat ?? 0,
  };
}

function tumUrunleriGetir(): Urun[] {
  const liste = dataStore.getUrunler();
  return liste.map((u) => migrateUrun(u as Parameters<typeof migrateUrun>[0]));
}

function urunKaydet(urun: Urun): void {
  dataStore.upsertUrun(urun);
}

function urunSil(id: string): void {
  dataStore.deleteUrun(id);
}

function urunIdUret(): string {
  return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function urunleriBulkAktar(yeniUrunler: Urun[]): void {
  dataStore.bulkReplaceUrunler(yeniUrunler);
}

function urunleriSifirla(): void {
  dataStore.bulkReplaceUrunler(varsayilanUrunler);
}

export const urunService = {
  tumUrunleriGetir,
  urunKaydet,
  urunSil,
  urunIdUret,
  urunleriBulkAktar,
  urunleriSifirla,
};
