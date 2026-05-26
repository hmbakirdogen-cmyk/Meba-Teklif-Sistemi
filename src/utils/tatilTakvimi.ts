// ── tatilTakvimi.ts ──────────────────────────────────────────────────
// NE: Türkiye'de iş hayatı için anlamlı tüm tatil ve bayramların takvimi
//     (2026-2028) + tip tanımları. Her tatil için: tarih, kategori,
//     mesaj tonu önerisi, etiket bilgisi.
//
// NEDEN: Mehmet Bey 2026-05-26 direktifi — "TÜM tatil günleri ve
//        bayramlar için kişiye özel tebrik mesajları olsun". Bu modül
//        tek kaynak: tatilTebrikMesaj.ts buradan tatili alır, sayfa
//        burada yaklaşan tatili gösterir.
//
// NASIL: Tatiller resmi/dini/kandil/özel olarak gruplanır. Dini bayram
//        ve kandiller Hicri takvime bağlı — sabit Miladi tarih yok,
//        bu yüzden 2026-2028 için manuel takvim girişi (Diyanet bazlı).

export type TatilKategori = 'resmi' | 'dini-bayram' | 'kandil' | 'ozel';

export interface Tatil {
  /** YYYY-MM-DD */
  tarih: string;
  /** Tatilin tam adı */
  ad: string;
  /** Kategori */
  kategori: TatilKategori;
  /**
   * Mesaj kısa kodu — tatilTebrikMesaj'da template bulmak için.
   * Aynı tatil farklı yıllarda aynı kod (örn. 'yilbasi', 'kurban',
   * 'cumhuriyet').
   */
  kod: string;
  /** UI'da gösterilecek emoji */
  emoji: string;
  /** Resmi tatilse iş yerinin kapalı olduğu gün */
  isYerKapali: boolean;
  /**
   * Mesaj tonu önerisi — bu tatil için en uygun ton.
   * Cenaze/ölüm/kutsal kandiller "saygili", milli zafer "cosaklu" gibi.
   */
  onerilenTon: 'resmi' | 'samimi' | 'saygili' | 'cosaklu' | 'kisa';
  /** Yarım gün tatil mi (örn. arefe) */
  yarimGun?: boolean;
}

/**
 * Türkiye 2026-2028 resmi + dini + kandil + özel tatiller.
 * Dini günler Diyanet İşleri Başkanlığı 2026 takvimine göre.
 */
export const TATIL_TAKVIMI: Tatil[] = [
  // ═══════ 2026 ═══════
  // Resmi
  { tarih: '2026-01-01', ad: 'Yılbaşı', kategori: 'resmi', kod: 'yilbasi', emoji: '🎉', isYerKapali: true, onerilenTon: 'cosaklu' },
  { tarih: '2026-04-23', ad: 'Ulusal Egemenlik ve Çocuk Bayramı', kategori: 'resmi', kod: 'cocuk', emoji: '🎈', isYerKapali: true, onerilenTon: 'cosaklu' },
  { tarih: '2026-05-01', ad: 'Emek ve Dayanışma Günü', kategori: 'resmi', kod: 'emek', emoji: '🛠️', isYerKapali: true, onerilenTon: 'resmi' },
  { tarih: '2026-05-19', ad: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", kategori: 'resmi', kod: 'genclik', emoji: '🇹🇷', isYerKapali: true, onerilenTon: 'cosaklu' },
  { tarih: '2026-07-15', ad: 'Demokrasi ve Milli Birlik Günü', kategori: 'resmi', kod: 'demokrasi', emoji: '🇹🇷', isYerKapali: true, onerilenTon: 'saygili' },
  { tarih: '2026-08-30', ad: 'Zafer Bayramı', kategori: 'resmi', kod: 'zafer', emoji: '🇹🇷', isYerKapali: true, onerilenTon: 'cosaklu' },
  { tarih: '2026-10-29', ad: 'Cumhuriyet Bayramı', kategori: 'resmi', kod: 'cumhuriyet', emoji: '🇹🇷', isYerKapali: true, onerilenTon: 'cosaklu' },
  { tarih: '2026-10-28', ad: 'Cumhuriyet Bayramı Arefesi', kategori: 'resmi', kod: 'cumhuriyet-arefe', emoji: '🇹🇷', isYerKapali: false, onerilenTon: 'resmi', yarimGun: true },

  // Dini Bayramlar (Diyanet 2026)
  { tarih: '2026-03-20', ad: 'Ramazan Bayramı Arefesi', kategori: 'dini-bayram', kod: 'ramazan-arefe', emoji: '🌙', isYerKapali: false, onerilenTon: 'resmi', yarimGun: true },
  { tarih: '2026-03-21', ad: 'Ramazan Bayramı 1. Gün', kategori: 'dini-bayram', kod: 'ramazan-1', emoji: '🕌', isYerKapali: true, onerilenTon: 'samimi' },
  { tarih: '2026-03-22', ad: 'Ramazan Bayramı 2. Gün', kategori: 'dini-bayram', kod: 'ramazan-2', emoji: '🕌', isYerKapali: true, onerilenTon: 'samimi' },
  { tarih: '2026-03-23', ad: 'Ramazan Bayramı 3. Gün', kategori: 'dini-bayram', kod: 'ramazan-3', emoji: '🕌', isYerKapali: true, onerilenTon: 'samimi' },
  { tarih: '2026-05-27', ad: 'Kurban Bayramı Arefesi', kategori: 'dini-bayram', kod: 'kurban-arefe', emoji: '🕌', isYerKapali: false, onerilenTon: 'resmi', yarimGun: true },
  { tarih: '2026-05-28', ad: 'Kurban Bayramı 1. Gün', kategori: 'dini-bayram', kod: 'kurban-1', emoji: '🕌', isYerKapali: true, onerilenTon: 'samimi' },
  { tarih: '2026-05-29', ad: 'Kurban Bayramı 2. Gün', kategori: 'dini-bayram', kod: 'kurban-2', emoji: '🕌', isYerKapali: true, onerilenTon: 'samimi' },
  { tarih: '2026-05-30', ad: 'Kurban Bayramı 3. Gün', kategori: 'dini-bayram', kod: 'kurban-3', emoji: '🕌', isYerKapali: true, onerilenTon: 'samimi' },
  { tarih: '2026-05-31', ad: 'Kurban Bayramı 4. Gün', kategori: 'dini-bayram', kod: 'kurban-4', emoji: '🕌', isYerKapali: true, onerilenTon: 'samimi' },

  // Kandiller 2026
  { tarih: '2026-01-15', ad: 'Regaib Kandili', kategori: 'kandil', kod: 'regaib', emoji: '🕌', isYerKapali: false, onerilenTon: 'saygili' },
  { tarih: '2026-02-05', ad: 'Mirac Kandili', kategori: 'kandil', kod: 'mirac', emoji: '🌙', isYerKapali: false, onerilenTon: 'saygili' },
  { tarih: '2026-02-21', ad: 'Berat Kandili', kategori: 'kandil', kod: 'berat', emoji: '🌟', isYerKapali: false, onerilenTon: 'saygili' },
  { tarih: '2026-03-16', ad: 'Kadir Gecesi', kategori: 'kandil', kod: 'kadir', emoji: '✨', isYerKapali: false, onerilenTon: 'saygili' },
  { tarih: '2026-09-09', ad: 'Mevlid Kandili', kategori: 'kandil', kod: 'mevlid', emoji: '🌙', isYerKapali: false, onerilenTon: 'saygili' },

  // Özel günler
  { tarih: '2026-03-08', ad: '8 Mart Dünya Kadınlar Günü', kategori: 'ozel', kod: 'kadinlar-gunu', emoji: '🌷', isYerKapali: false, onerilenTon: 'samimi' },
  { tarih: '2026-05-10', ad: 'Anneler Günü', kategori: 'ozel', kod: 'anneler-gunu', emoji: '💐', isYerKapali: false, onerilenTon: 'samimi' },
  { tarih: '2026-06-21', ad: 'Babalar Günü', kategori: 'ozel', kod: 'babalar-gunu', emoji: '👔', isYerKapali: false, onerilenTon: 'samimi' },

  // ═══════ 2027 (özet — yalnızca büyük bayramlar) ═══════
  { tarih: '2027-01-01', ad: 'Yılbaşı', kategori: 'resmi', kod: 'yilbasi', emoji: '🎉', isYerKapali: true, onerilenTon: 'cosaklu' },
  { tarih: '2027-03-10', ad: 'Ramazan Bayramı 1. Gün', kategori: 'dini-bayram', kod: 'ramazan-1', emoji: '🕌', isYerKapali: true, onerilenTon: 'samimi' },
  { tarih: '2027-05-17', ad: 'Kurban Bayramı 1. Gün', kategori: 'dini-bayram', kod: 'kurban-1', emoji: '🕌', isYerKapali: true, onerilenTon: 'samimi' },
  { tarih: '2027-10-29', ad: 'Cumhuriyet Bayramı', kategori: 'resmi', kod: 'cumhuriyet', emoji: '🇹🇷', isYerKapali: true, onerilenTon: 'cosaklu' },
];

/** Bugüne göre gün farkı (negatif = geçmiş, 0 = bugün, pozitif = gelecek) */
export function gunFarki(tarih: string): number {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  return Math.round((new Date(tarih).getTime() - bugun.getTime()) / 86_400_000);
}

/** Yaklaşan tatilleri döndürür (önümüzdeki N gün içinde, sıralı). */
export function yaklasanTatiller(gunSayisi: number = 90): Tatil[] {
  return TATIL_TAKVIMI.filter((t) => {
    const fark = gunFarki(t.tarih);
    return fark >= 0 && fark <= gunSayisi;
  }).sort((a, b) => gunFarki(a.tarih) - gunFarki(b.tarih));
}

/** Bu hafta içinde tatil var mı? */
export function buHaftaTatil(): Tatil | null {
  const yedi = yaklasanTatiller(7);
  return yedi[0] ?? null;
}

/** Geçmiş tatilleri de döndür (son N gün, arşiv için) */
export function gecmisTatiller(gunSayisi: number = 30): Tatil[] {
  return TATIL_TAKVIMI.filter((t) => {
    const fark = gunFarki(t.tarih);
    return fark < 0 && fark >= -gunSayisi;
  }).sort((a, b) => gunFarki(b.tarih) - gunFarki(a.tarih));
}
