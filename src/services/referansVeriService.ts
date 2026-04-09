// Referans veri servisi — Marka, Birim ve Teslim Süresi listelerini
// localStorage'da saklar. Varsayılan değerler ilk açılışta yüklenir.

const KEYS = {
  markalar: 'teklif_markalar',
  birimler: 'teklif_birimler',
  teslimSecenekleri: 'teklif_teslim_secenekleri',
} as const;

const VARSAYILANLAR = {
  markalar: [] as string[],
  birimler: ['Adet', 'Takım', 'Metre', 'Cm', 'Mm', 'Kg', 'Litre', 'Paket', 'Kutu', 'Set', 'Rulo'],
  teslimSecenekleri: [
    'Stokta mevcut',
    '2-3 iş günü',
    '5-7 iş günü',
    '10 iş günü',
    '2-3 hafta',
    '4-6 hafta',
    'Sipariş üzerine',
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
  return [...VARSAYILANLAR[alan]];
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

export const referansVeriService = {
  markalar: listeServisi('markalar'),
  birimler: listeServisi('birimler'),
  teslimSecenekleri: listeServisi('teslimSecenekleri'),
};
