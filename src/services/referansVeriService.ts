// Referans veri servisi — Marka, Birim ve Teslim Süresi listelerini yönetir.
// Üçü de aynı yapı: localStorage'da saklanır, varsayılan değerler ilk açılışta
// yüklenir, kullanıcı ekle/sil/düzenle yapabilir.

export const VARSAYILAN_MARKA = 'SMC';

// Varsayılanlar değiştiğinde bu versiyonu artır → eski localStorage temizlenir.
const VERI_VERSIYONU = 3;
const VERSIYON_KEY = 'teklif_ref_v';

function migrasyonKontrol() {
  const kayitli = Number(localStorage.getItem(VERSIYON_KEY) ?? 0);
  if (kayitli < VERI_VERSIYONU) {
    // Eski liste verilerini sil, yeniden seed edilsin.
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(VERSIYON_KEY, String(VERI_VERSIYONU));
  }
}

const KEYS = {
  markalar: 'teklif_markalar',
  birimler: 'teklif_birimler',
  teslimSecenekleri: 'teklif_teslim_secenekleri',
} as const;

const VARSAYILANLAR = {
  markalar: ['SMC', 'Maxtor', 'SICK', 'Danfoss', 'WINMAN'],
  birimler: ['Adet', 'Takım', 'Metre', 'Cm', 'Mm', 'Kg', 'Litre', 'Paket', 'Kutu', 'Set', 'Rulo'],
  teslimSecenekleri: [
    '2-3 Gün',
    '5-7 Gün',
    '10 Gün',
    '1-2 Hafta',
    '2-3 Hafta',
    '4-6 Hafta',
    'Stok',
    'Sipariş Üzerine',
  ],
};

type Alan = keyof typeof KEYS;

function oku(alan: Alan): string[] {
  try {
    const raw = localStorage.getItem(KEYS[alan]);
    if (raw !== null) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  // İlk açılış — varsayılanları localStorage'a kaydet ki kalıcı olsun.
  // Böylece sonraki okumalarda localStorage'dan gelir, duplicate seed olmaz.
  const defaults = [...VARSAYILANLAR[alan]];
  localStorage.setItem(KEYS[alan], JSON.stringify(defaults));
  return defaults;
}

function kaydet(alan: Alan, liste: string[]): void {
  localStorage.setItem(KEYS[alan], JSON.stringify(liste));
}

function ekle(alan: Alan, deger: string): void {
  const temiz = deger.trim();
  if (!temiz) return;
  const mevcut = oku(alan);
  if (mevcut.includes(temiz)) return;
  kaydet(alan, [...mevcut, temiz]);
}

function sil(alan: Alan, deger: string): void {
  kaydet(alan, oku(alan).filter((v) => v !== deger));
}

function sirala(alan: Alan, liste: string[]): void {
  kaydet(alan, liste);
}

function listeServisi(alan: Alan) {
  return {
    tumunuGetir: () => oku(alan),
    ekle: (v: string) => ekle(alan, v),
    sil: (v: string) => sil(alan, v),
    sirala: (liste: string[]) => sirala(alan, liste),
  };
}

migrasyonKontrol();

export const referansVeriService = {
  markalar: listeServisi('markalar'),
  birimler: listeServisi('birimler'),
  teslimSecenekleri: listeServisi('teslimSecenekleri'),
};
