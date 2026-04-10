import type { Urun } from '../types';
import { cleanProductDescription, titleCaseAciklama } from '../utils/formatters';
import { referansVeriService } from './referansVeriService';

const STORAGE_KEY = 'teklif_urunler';

const varsayilanUrunler: Urun[] = [
  { id: 'u1',  urunKod: 'CP96SDB80-200',     urunAdi: '80x200 Manyetik Yastıklı Silindir',                    aciklama: 'Ø80 mm · 200 mm strok · manyetik sensörlü',           kategori: 'Silindir',   birim: 'Adet', varsayilanFiyat: 98.90 },
  { id: 'u2',  urunKod: 'SY9420-5DZ-03F-Q',  urunAdi: '3/8" 5/3 Egzoz Merkez Çift Bobin Valf',               aciklama: '3/8" bağlantı · 5/3 egzoz merkez · 24 VDC',          kategori: 'Valf',       birim: 'Adet', varsayilanFiyat: 72.90 },
  { id: 'u3',  urunKod: 'CP96SDB40-100',     urunAdi: '40x100 Manyetik Yastıklı Silindir',                    aciklama: 'Ø40 mm · 100 mm strok · manyetik sensörlü',           kategori: 'Silindir',   birim: 'Adet', varsayilanFiyat: 49.45 },
  { id: 'u4',  urunKod: 'SY7120-5DZ-02F-Q',  urunAdi: '1/4" 5/2 Tek Bobin Valf',                             aciklama: '1/4" bağlantı · 5/2 · tek bobin · 24 VDC',           kategori: 'Valf',       birim: 'Adet', varsayilanFiyat: 41.65 },
  { id: 'u5',  urunKod: 'CP96SDB63-250',     urunAdi: '63x250 Manyetik Yastıklı Silindir',                    aciklama: 'Ø63 mm · 250 mm strok · manyetik sensörlü',           kategori: 'Silindir',   birim: 'Adet', varsayilanFiyat: 77.25 },
  { id: 'u6',  urunKod: 'SY7320-5DZ-02F-Q',  urunAdi: '1/4" 5/3 Kapalı Merkez Çift Bobin Valf',              aciklama: '1/4" bağlantı · 5/3 kapalı merkez · 24 VDC',         kategori: 'Valf',       birim: 'Adet', varsayilanFiyat: 65.45 },
  { id: 'u7',  urunKod: 'CP96SDB50-150',     urunAdi: '50x150 Manyetik Yastıklı Silindir',                    aciklama: 'Ø50 mm · 150 mm strok · manyetik sensörlü',           kategori: 'Silindir',   birim: 'Adet', varsayilanFiyat: 61.20 },
  { id: 'u8',  urunKod: 'CP96SDB40-70',      urunAdi: '40x70 Manyetik Yastıklı Silindir',                     aciklama: 'Ø40 mm · 70 mm strok · manyetik sensörlü',            kategori: 'Silindir',   birim: 'Adet', varsayilanFiyat: 48.50 },
  { id: 'u9',  urunKod: 'VHS40-F04A',        urunAdi: '1/2" Manuel Aç/Kapa Valfi',                            aciklama: '1/2" bağlantı · manuel 3/2 yay dönüşlü',             kategori: 'Manuel Valf',birim: 'Adet', varsayilanFiyat: 21.50 },
  { id: 'u10', urunKod: 'AW40-F04BG-A',      urunAdi: '1/2" Filtre Regülatörü',                               aciklama: '1/2" bağlantı · manometre dahil · otomatik tahliye',  kategori: 'Regülatör',  birim: 'Adet', varsayilanFiyat: 45.00 },
  { id: 'u11', urunKod: 'EAV4000-F04-5DZ-Q', urunAdi: '1/2" Soft Starter Valfi',                              aciklama: '1/2" bağlantı · yavaş start fonksiyonlu',             kategori: 'Aksesuar',   birim: 'Adet', varsayilanFiyat: 89.25 },
  { id: 'u12', urunKod: 'Y400T-A',           urunAdi: 'Bağlantı Braketi',                                     aciklama: 'Seri bağlantı için bağlantı braketi',                 kategori: 'Aksesuar',   birim: 'Adet', varsayilanFiyat: 2.70  },
  { id: 'u13', urunKod: 'ASP530F-03-08S',    urunAdi: '3/8" 8 mm Pilot Kontrollü Çek Valf',                   aciklama: '3/8" bağlantı · 8 mm çıkış · pilot kontrollü',        kategori: 'Çek Valf',   birim: 'Adet', varsayilanFiyat: 32.10 },
  { id: 'u14', urunKod: 'ISE30A-01-F-G',     urunAdi: 'Dijital Basınç Sensörü',                               aciklama: '0–1 MPa · NPN/PNP çıkış · LED göstergeli',            kategori: 'Sensör',     birim: 'Adet', varsayilanFiyat: 51.30 },
  { id: 'u15', urunKod: 'KQ2W02-M3G',        urunAdi: '2 mm / M3 Erkek Dişli Dirsek Bağlantı (Push-In)',     aciklama: '2 mm boru · M3 erkek dişli · dirsek (Push-In)',       kategori: 'Bağlantı',   birim: 'Adet', varsayilanFiyat: 0     },
];

function migrateUrun(u: Partial<Urun> & { id: string; urunKod: string; urunAdi: string }): Urun {
  return {
    id: u.id,
    urunKod: u.urunKod,
    urunAdi: u.urunAdi,
    aciklama: u.aciklama ?? '',
    kategori: u.kategori ?? '',
    birim: u.birim ?? 'Adet',
    varsayilanFiyat: u.varsayilanFiyat ?? 0,
  };
}

function tumUrunleriGetir(): Urun[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(varsayilanUrunler));
    return varsayilanUrunler;
  }
  const parsed = JSON.parse(raw) as Partial<Urun>[];
  return parsed.map((u) => migrateUrun(u as Parameters<typeof migrateUrun>[0]));
}

function urunKaydet(urun: Urun): void {
  const liste = tumUrunleriGetir();
  const idx = liste.findIndex((u) => u.id === urun.id);
  if (idx >= 0) {
    liste[idx] = urun;
  } else {
    liste.push(urun);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
}

function urunSil(id: string): void {
  const liste = tumUrunleriGetir().filter((u) => u.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
}

function urunIdUret(): string {
  return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/** Excel'den toplu aktarım — mevcut listenin üzerine yazar */
function urunleriBulkAktar(yeniUrunler: Urun[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(yeniUrunler));
}

/** Varsayılan ürün listesini sıfırla */
function urunleriSifirla(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(varsayilanUrunler));
}

/**
 * Temizlenmiş açıklamada marka varlığını kontrol eder ve gerekirse ekler.
 *
 * Kurallar:
 *  1) Kayıtlı markalar listesindeki herhangi bir marka açıklamada varsa → marka korunur.
 *     Ürünün kendi markası ise aynı zamanda birden fazla geçiyorsa tekilleştirilir.
 *  2) Hiçbir kayıtlı marka açıklamada yoksa ve ürünün marka alanı doluysa →
 *     marka açıklamanın başına eklenir.
 *  3) Açıklama tamamen boşsa ve marka doluysa → açıklama = marka olur.
 *  4) Büyük/küçük harf duyarsız kontrol; ekleme orijinal büyük/küçük harf korunarak yapılır.
 */
function markaKoruVeDuzenle(
  aciklama: string,
  urunMarkasi: string,
  markalar: string[],
): string {
  // Kayıtlı markalar arasında açıklamada var olan ilkini bul (case-insensitive)
  const mevcutMarka = markalar.find((m) =>
    aciklama.toLowerCase().includes(m.toLowerCase()),
  );

  if (mevcutMarka) {
    // Marka zaten mevcut — ürünün markasıyla eşleşiyorsa tekrar sayısını kontrol et
    if (urunMarkasi && urunMarkasi.toLowerCase() === mevcutMarka.toLowerCase()) {
      const escaped = urunMarkasi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'gi');
      const hits = aciklama.match(rx) ?? [];
      if (hits.length > 1) {
        // Birden fazla tekrar → hepsini çıkar, başa bir kez ekle
        const geri = aciklama
          .replace(rx, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/^[\s\-–·,;]+|[\s\-–·,;]+$/g, '')
          .trim();
        return geri ? `${urunMarkasi} ${geri}` : urunMarkasi;
      }
    }
    return aciklama; // marka var ve tekil — dokunma
  }

  // Açıklamada hiçbir kayıtlı marka yok
  if (!urunMarkasi) return aciklama;          // eklenecek marka bilgisi de yok
  if (!aciklama)    return urunMarkasi;        // boş açıklama → sadece marka
  return `${urunMarkasi} ${aciklama}`;         // başa ekle
}

/**
 * Mevcut tüm ürünlerin açıklamalarını temizler:
 *  - Parantez içinde ürün kodu tekrar ediyorsa siler.
 *  - Temizlik sonrası açıklamada kayıtlı marka yoksa ürünün marka bilgisini başa ekler.
 *  - Açıklama tamamen boşsa en azından marka adını yazar.
 * Kaç ürün güncellendi döner.
 */
function urunAciklamalariniTemizle(): number {
  const liste   = tumUrunleriGetir();
  const markalar = referansVeriService.markalar.tumunuGetir();
  let temizlenen = 0;

  const guncellenmis = liste.map((u) => {
    const urunMarkasi = u.marka?.trim() ?? '';

    // 1) Parantez temizliği
    const temizAciklama = cleanProductDescription(u.aciklama, u.urunKod);

    // 2) Marka koruması / ekleme
    const markaAciklama = markaKoruVeDuzenle(temizAciklama, urunMarkasi, markalar);

    // 3) Title Case uygula — her kelime ilk harf büyük, birimler küçük kalır
    const sonAciklama = titleCaseAciklama(markaAciklama);

    if (sonAciklama !== u.aciklama) {
      temizlenen++;
      return { ...u, aciklama: sonAciklama };
    }
    return u;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(guncellenmis));
  return temizlenen;
}

export const urunService = {
  tumUrunleriGetir,
  urunKaydet,
  urunSil,
  urunIdUret,
  urunleriBulkAktar,
  urunleriSifirla,
  urunAciklamalariniTemizle,
};
