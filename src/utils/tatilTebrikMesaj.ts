// ── tatilTebrikMesaj.ts ──────────────────────────────────────────────
// NE: Her tatil kodu için 3 ton (resmi/samimi/kısa) tebrik mesajı
//     template'i. Kişiselleştirme: {hitap} = "Ahmet Bey", {firmaAdi},
//     {benimAdSoyad}, {benimFirma} placeholderları.
//
// NEDEN: Mehmet Bey 2026-05-26 direktifi — "Tüm tatil günleri ve
//        bayramlar için KİŞİYE ÖZEL (isme ithafen) tebrik mesajları".
//        Sabit template + dinamik isim ile her gönderi kişiye özel his.
//
// NASIL: 1) Her tatil koduna 3 mesaj (resmi/samimi/kısa) tanımlı.
//        2) tebrikMesajiUret(kod, ton, params) çağrılır → params içinde
//           hitap/firmaAdi/benimAdSoyad/benimFirma ile placeholder
//           yerleştirilir.
//        3) Bilinmeyen kod için JENERIK fallback ("İyi bayramlar")
//           döner — yeni tatiller eklendikçe template eklenir.

export type MesajTonu = 'resmi' | 'samimi' | 'kisa' | 'saygili' | 'cosaklu';

interface TebrikParams {
  /** Karşı tarafa "Ahmet Bey" hitabı (zaten Bey/Hanım suffix'li gelmesi beklenir) */
  hitap: string;
  /** Karşı tarafın firması (örn: "ÖRN A.Ş.") */
  firmaAdi?: string;
  /** Gönderenin adı (Mehmet Bakırdöğen) */
  benimAdSoyad: string;
  /** Gönderenin firması ("MEBA Mekanik") */
  benimFirma?: string;
}

interface TebrikTemplate {
  resmi?: string;
  samimi?: string;
  kisa?: string;
  saygili?: string;
  cosaklu?: string;
}

/**
 * Tatil koduna göre 3-5 ton mesaj template. {hitap}, {firmaAdi},
 * {benimAdSoyad}, {benimFirma} placeholderları runtime'da değiştirilir.
 */
const TEMPLATE: Record<string, TebrikTemplate> = {
  // ═══════ Resmi Tatiller ═══════
  yilbasi: {
    resmi:
      'Sayın {hitap},\n\nYeni yılın {firmaAdi} ailesi için sağlık, başarı ve istikrar getirmesini temenni eder; iş birliğimizin yeni yılda da güçlenerek devam etmesini dileriz.\n\nSaygılarımızla,\n{benimAdSoyad}\n{benimFirma}',
    samimi:
      'Merhaba {hitap},\n\nYeni yılınız kutlu olsun! Bu yıl hem siz hem de {firmaAdi} ekibi için sağlık ve bereket dolu olsun. Görüşmek üzere — 2026\'da yine bizim çayımız sizden.\n\nSelamlar,\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, yeni yılınız kutlu olsun. Sağlık, başarı dolu bir yıl dileğiyle — {benimAdSoyad} / {benimFirma}',
    cosaklu:
      '🎉 {hitap}, yeni yıl yeni umutlarla geldi! {firmaAdi} ailesine ve sevdiklerinize sağlıkla, başarıyla, bereketle dolu bir 2026 dileriz.\n\nYeni yılda görüşmek üzere,\n{benimAdSoyad} — {benimFirma}',
  },

  cocuk: {
    resmi:
      'Sayın {hitap},\n\n23 Nisan Ulusal Egemenlik ve Çocuk Bayramı\'nı en içten duygularımla kutlar; Atatürk\'ün dünya çocuklarına armağan ettiği bu özel günde sağlıklı, mutlu, aydınlık yarınlar dilerim.\n\nSaygılarımla,\n{benimAdSoyad}\n{benimFirma}',
    samimi:
      'Merhaba {hitap},\n\n23 Nisan kutlu olsun! Atatürk\'ün çocuklarımıza armağanı bu özel günde, çocuklarımızın geleceğine güvenle bakabileceğimiz bir Türkiye temennisiyle.\n\nSelamlar,\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun. {benimAdSoyad} / {benimFirma}',
    cosaklu:
      '🇹🇷 {hitap}, çocukların bayramı kutlu olsun! Atatürk\'ün bize bıraktığı bu emanet için bugün hep birlikte gururla nefes alıyoruz.\n\n{benimAdSoyad} — {benimFirma}',
  },

  emek: {
    resmi:
      'Sayın {hitap},\n\n1 Mayıs Emek ve Dayanışma Günü\'nde, üreten ve emeğiyle ülkemize değer katan herkesi saygıyla anar; dayanışma ve birlik içinde sağlıklı, huzurlu bir gün geçirmenizi dileriz.\n\nSaygılarımızla,\n{benimAdSoyad}\n{benimFirma}',
    samimi:
      '{hitap}, 1 Mayıs emek günü hayırlı olsun. Emek verenlerin emeklerinin karşılığını aldığı, dayanışmanın güçlendiği bir gün olsun.\n\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, 1 Mayıs Emek ve Dayanışma Günü kutlu olsun. {benimAdSoyad} / {benimFirma}',
  },

  genclik: {
    resmi:
      'Sayın {hitap},\n\n19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı\'nı kutlar; Mustafa Kemal Atatürk\'ün Samsun\'a çıktığı bu özel günde tüm gençlerimize sağlık, başarı ve aydınlık günler dileriz.\n\nSaygılarımızla,\n{benimAdSoyad}\n{benimFirma}',
    samimi:
      '{hitap}, 19 Mayıs kutlu olsun! Atatürk\'ün başlattığı yolda, gençliğin sağlık ve umutla yürüdüğü bir gün.\n\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, 19 Mayıs Gençlik ve Spor Bayramı kutlu olsun. {benimAdSoyad} / {benimFirma}',
    cosaklu:
      '🇹🇷 {hitap}, 19 Mayıs kutlu olsun! Bağımsızlığın ilk meşalesinin yandığı bu gün, gençliğimize ve geleceğimize güvenmek için anlamlı.\n\n{benimAdSoyad} — {benimFirma}',
  },

  demokrasi: {
    saygili:
      'Sayın {hitap},\n\n15 Temmuz Demokrasi ve Milli Birlik Günü\'nde, milletimizin özgürlüğü için canını veren şehitlerimizi saygıyla anar; demokrasinin ve birliğimizin daim olmasını dileriz.\n\nSaygılarımızla,\n{benimAdSoyad}\n{benimFirma}',
    kisa: '{hitap}, 15 Temmuz Demokrasi ve Milli Birlik Günü\'nde şehitlerimizi saygıyla anıyoruz. {benimAdSoyad} / {benimFirma}',
  },

  zafer: {
    resmi:
      'Sayın {hitap},\n\n30 Ağustos Zafer Bayramı\'nı en içten duygularımla kutlar; Mustafa Kemal Atatürk ve silah arkadaşlarının bize armağan ettiği bu büyük zaferin gururuyla, ülkemize ve milletimize huzurlu günler dileriz.\n\nSaygılarımızla,\n{benimAdSoyad}\n{benimFirma}',
    cosaklu:
      '🇹🇷 {hitap}, 30 Ağustos Zafer Bayramı kutlu olsun! Atatürk\'ün dehasıyla kazanılan bu büyük zaferin coşkusu içimizde, gururumuz hep yüksek olsun.\n\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, 30 Ağustos Zafer Bayramı kutlu olsun. {benimAdSoyad} / {benimFirma}',
  },

  cumhuriyet: {
    resmi:
      'Sayın {hitap},\n\n29 Ekim Cumhuriyet Bayramı\'nı içten duygularımla kutlar; Mustafa Kemal Atatürk ve aziz arkadaşlarının emanetini gururla yaşatmaya devam ettiğimiz bu özel günde {firmaAdi} ailesine huzur ve başarı dileriz.\n\nSaygılarımızla,\n{benimAdSoyad}\n{benimFirma}',
    cosaklu:
      '🇹🇷 {hitap}, Cumhuriyet\'imizin yıldönümü kutlu olsun! Atatürk\'ün dehasıyla kurulan Cumhuriyet\'imizin sonsuza dek yaşaması temennisiyle.\n\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, 29 Ekim Cumhuriyet Bayramı kutlu olsun. {benimAdSoyad} / {benimFirma}',
  },

  // ═══════ Dini Bayramlar ═══════
  'kurban-1': {
    resmi:
      'Sayın {hitap},\n\nMübarek Kurban Bayramı\'nın sizin ve {firmaAdi} ailesi için sağlık, huzur ve bereket getirmesini temenni eder; iş ortaklığımızın yeni yıl döneminde de güçlenerek devam etmesini dileriz.\n\nSaygılarımızla,\n{benimAdSoyad}\n{benimFirma}',
    samimi:
      'Merhaba {hitap},\n\nKurban Bayramınız mübarek olsun! Hem sizin hem de tüm {firmaAdi} ekibinin sevdiklerinizle güzel, sağlıklı bir bayram geçirmesini diliyorum.\n\nBayram sonrası kahvelerimiz yine bizden, görüşmek üzere. 🙌\n\nSelamlarımla,\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, Kurban Bayramınız mübarek olsun. Sağlık, huzur dolu bir bayram dileğiyle — {benimAdSoyad} / {benimFirma}',
  },

  'ramazan-1': {
    resmi:
      'Sayın {hitap},\n\nMübarek Ramazan Bayramı\'nı en içten duygularımla kutlar; {firmaAdi} ailesine sağlık, huzur, bereket getirmesini temenni eder, iş birliğimizin daim olmasını dilerim.\n\nSaygılarımla,\n{benimAdSoyad}\n{benimFirma}',
    samimi:
      'Merhaba {hitap},\n\nRamazan Bayramınız mübarek olsun! Bir ay süren oruçtan sonra hak edilmiş huzurlu, sevdiklerinizle dolu bir bayram geçirmenizi dilerim.\n\nGörüşmek üzere,\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, Ramazan Bayramınız mübarek olsun. {benimAdSoyad} / {benimFirma}',
  },

  // ═══════ Kandiller ═══════
  regaib: {
    saygili:
      'Sayın {hitap},\n\nRegaib Kandilinizi tebrik eder; mübarek üç ayların başlangıcı olan bu kandilin sizin, ailenizin ve {firmaAdi} ailesinin tüm dua ve dileklerinin kabul olmasına vesile olmasını dilerim.\n\nSaygılarımla,\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, Regaib Kandiliniz mübarek olsun. {benimAdSoyad} / {benimFirma}',
  },

  mirac: {
    saygili:
      'Sayın {hitap},\n\nMirac Kandilinizi tebrik eder; bu mübarek gecenin sizin ve sevdiklerinizin tüm dualarının kabul olmasına, gönüllerinizin huzurla dolmasına vesile olmasını dilerim.\n\nSaygılarımla,\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, Mirac Kandiliniz mübarek olsun. {benimAdSoyad} / {benimFirma}',
  },

  berat: {
    saygili:
      'Sayın {hitap},\n\nBerat Kandilinizi tebrik eder; bu mübarek gecenin tüm İslam alemine ve {firmaAdi} ailesine huzur, sağlık ve bereket getirmesini dilerim.\n\nSaygılarımla,\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, Berat Kandiliniz mübarek olsun. {benimAdSoyad} / {benimFirma}',
  },

  kadir: {
    saygili:
      'Sayın {hitap},\n\nBin aydan daha hayırlı olan Kadir Geceniz mübarek olsun. Tüm dualarınızın kabul olmasını, gönlünüzün huzurla dolmasını dilerim.\n\nSaygılarımla,\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, Kadir Geceniz mübarek olsun. {benimAdSoyad} / {benimFirma}',
  },

  mevlid: {
    saygili:
      'Sayın {hitap},\n\nMevlid Kandilinizi tebrik eder; Peygamber Efendimizin doğumunun yıldönümünde tüm İslam alemine huzur, sağlık ve bereket dilerim.\n\nSaygılarımla,\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, Mevlid Kandiliniz mübarek olsun. {benimAdSoyad} / {benimFirma}',
  },

  // ═══════ Özel Günler ═══════
  'kadinlar-gunu': {
    samimi:
      'Sevgili {hitap},\n\n8 Mart Dünya Kadınlar Günü kutlu olsun. Toplumumuzun her alanında verdiğiniz emek için saygıyla, sevgiyle...\n\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, 8 Mart Dünya Kadınlar Günü kutlu olsun. {benimAdSoyad} / {benimFirma}',
  },

  'anneler-gunu': {
    samimi:
      'Sevgili {hitap},\n\nAnneler Gününüz kutlu olsun. Tüm annelerimize sağlık, sevgi ve huzur dolu bir gün diliyorum.\n\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, Anneler Gününüz kutlu olsun. {benimAdSoyad} / {benimFirma}',
  },

  'babalar-gunu': {
    samimi:
      'Sayın {hitap},\n\nBabalar Gününüz kutlu olsun. Sağlık ve mutluluk dolu, sevdiklerinizle güzel anılar biriktirdiğiniz bir gün geçirmenizi dilerim.\n\n{benimAdSoyad} — {benimFirma}',
    kisa: '{hitap}, Babalar Gününüz kutlu olsun. {benimAdSoyad} / {benimFirma}',
  },
};

// Arefe günleri ana bayram template'inden türetilir
TEMPLATE['kurban-arefe'] = {
  resmi:
    'Sayın {hitap},\n\nMübarek Kurban Bayramı\'nın bir gün öncesinde sizi anar; bayramınızın {firmaAdi} ailesi için sağlık ve bereket getirmesini şimdiden dilerim.\n\nSaygılarımla,\n{benimAdSoyad} — {benimFirma}',
  kisa: '{hitap}, hayırlı bayramlar dileğiyle — {benimAdSoyad} / {benimFirma}',
};

TEMPLATE['ramazan-arefe'] = {
  resmi:
    'Sayın {hitap},\n\nMübarek Ramazan Bayramı\'nın arefesinde sizi en içten duygularımla anar; yarından itibaren huzurla, sevinçle dolu bir bayram dilerim.\n\nSaygılarımla,\n{benimAdSoyad} — {benimFirma}',
  kisa: '{hitap}, hayırlı bayramlar — {benimAdSoyad} / {benimFirma}',
};

// Kurban ve Ramazan'ın 2-4. günleri için aynı template
['kurban-2', 'kurban-3', 'kurban-4', 'ramazan-2', 'ramazan-3'].forEach((k) => {
  TEMPLATE[k] = TEMPLATE[k.replace(/-[234]$/, '-1')];
});

/** Bilinmeyen kod için jenerik fallback */
const JENERIK: TebrikTemplate = {
  resmi: 'Sayın {hitap},\n\nÖzel günümüzü tebrik eder, sağlık ve mutluluk dolu bir gün dilerim.\n\nSaygılarımla,\n{benimAdSoyad}\n{benimFirma}',
  kisa: '{hitap}, hayırlı günler. {benimAdSoyad} / {benimFirma}',
};

function placeholderDoldur(metin: string, p: TebrikParams): string {
  return metin
    .replace(/\{hitap\}/g, p.hitap)
    .replace(/\{firmaAdi\}/g, p.firmaAdi ?? 'firma')
    .replace(/\{benimAdSoyad\}/g, p.benimAdSoyad)
    .replace(/\{benimFirma\}/g, p.benimFirma ?? 'MEBA Mekanik');
}

/** Hitap üretici — Cari/Personel adından "Ahmet Bey" formatı */
export function bayHitap(adSoyad: string | undefined | null): string {
  if (!adSoyad?.trim()) return 'Sayın Yetkili';
  const son = adSoyad.trim().split(/\s+/).slice(-1)[0];
  return `${son} Bey`;
}

/**
 * Tatil koduna ve ton'a göre kişiselleştirilmiş mesaj üret.
 * Ton önerisinde mesaj yoksa kısa fallback'e düşer; o da yoksa jenerik.
 */
export function tebrikMesajiUret(kod: string, ton: MesajTonu, params: TebrikParams): string {
  const t = TEMPLATE[kod] ?? JENERIK;
  // İstenen ton varsa onu döndür; yoksa öncelik: kısa → resmi → samimi → jenerik
  const metin =
    t[ton] ??
    t.kisa ??
    t.resmi ??
    t.samimi ??
    t.saygili ??
    t.cosaklu ??
    JENERIK.kisa!;
  return placeholderDoldur(metin, params);
}

/** Tatil kodu için MEVCUT ton'ları döner — UI'da hangi ton seçilebilir? */
export function mevcutTonlar(kod: string): MesajTonu[] {
  const t = TEMPLATE[kod] ?? JENERIK;
  return (Object.keys(t) as MesajTonu[]).filter((ton) => !!t[ton]);
}
