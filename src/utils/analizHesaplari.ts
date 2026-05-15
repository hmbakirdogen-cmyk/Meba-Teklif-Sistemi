/**
 * analizHesaplari.ts — Yönetici Analiz Merkezi için tüm pure hesaplama
 * yardımcıları. UI'dan ayrı, test edilebilir.
 *
 * Para birimi: TRY/EUR/USD ayrı bucket'larda toplanır (asla cross-currency
 * toplam yapılmaz). Tarih/kullanıcı/firma/durum filtreleri merkezi.
 */

import type { Teklif, TeklifDurum, TeklifSatiri, ParaBirimi } from '../types';

// ──────────────────────────────────────────────────────────────────
// Tipler
// ──────────────────────────────────────────────────────────────────

export type ParaBirimiToplam = Record<ParaBirimi, number>;

export interface AnalizFiltresi {
  tarihBaslangic?: string; // 'YYYY-MM-DD'
  tarihBitis?: string;     // 'YYYY-MM-DD' (dahil)
  kullaniciId?: string | null;
  firmaId?: string | null;
  durum?: TeklifDurum | null;
  paraBirimi?: ParaBirimi | null;
}

export interface OzetMetrikleri {
  bugunSayisi: number;
  buAySayisi: number;
  toplamSayisi: number;
  pdfOlusturulanSayisi: number;
  pdfYuzde: number;
  /** Durum bazında sayım. */
  durumDagilimi: Record<TeklifDurum, number>;
  /** Para birimi başına toplam tutar (genel toplam, KDV dahil). */
  toplamTutarlar: ParaBirimiToplam;
  /** Bekleyen = taslak + hazir + gonderildi. */
  bekleyenSayisi: number;
}

export interface KullaniciPerformansi {
  kullaniciId: string;
  adSoyad: string;
  unvan: string;
  rol: string;
  toplamTeklifSayisi: number;
  onaylanan: number;
  bekleyen: number;
  reddedilen: number;
  toplamTutar: ParaBirimiToplam;
  ortalamaTutar: ParaBirimiToplam;
  sonTeklifTarihi: string | null; // ISO
}

export interface FirmaAnaliz {
  cariId: string;
  firmaAdi: string;
  cariKod: string;
  toplamTeklifSayisi: number;
  onaylanan: number;
  bekleyen: number;
  reddedilen: number;
  toplamTutar: ParaBirimiToplam;
  basariOraniYuzde: number; // 0-100
  sonTeklifTarihi: string | null;
}

export interface MarkaAnaliz {
  marka: string;
  satirSayisi: number;
  teklifSayisi: number; // farklı teklif kayıt sayısı
  toplamTutar: ParaBirimiToplam;
}

export interface UrunKoduAnaliz {
  urunKod: string;
  marka: string; // en sık birlikte gördüğümüz marka
  satirSayisi: number;
  toplamMiktar: number;
}

export interface ParaBirimiOzeti {
  toplamlar: ParaBirimiToplam;          // genel toplam (KDV dahil)
  kdvHaric: ParaBirimiToplam;           // araToplam
  toplamIskonto: ParaBirimiToplam;
  toplamKdv: ParaBirimiToplam;
  karisikSayisi: number;                // satirBazliParaBirimi=true sayısı
}

export interface PdfAktivite {
  teklifId: string;
  teklifNo: string;
  hazirlayanAdSoyad: string;
  cariAdi: string;
  pdfOlusturmaTarihi: string;
  genelToplam: number;
  paraBirimi: ParaBirimi;
  durum: TeklifDurum;
}

export type RiskKategori =
  | 'uzunBekleyen'
  | 'yuksekIskonto'
  | 'pdfAmaGonderilmemis'
  | 'satirBosOlan'
  | 'yuksekTutarBelirsiz'
  | 'teslimTarihiBos'
  | 'karisikParaBirimi';

export interface RiskItem {
  kategori: RiskKategori;
  teklifId: string;
  teklifNo: string;
  cariAdi: string;
  hazirlayanAdSoyad: string;
  durum: TeklifDurum;
  genelToplam: number;
  paraBirimi: ParaBirimi;
  detay: string; // açıklayıcı metin (örn. "32 gündür gönderildi")
}

// ──────────────────────────────────────────────────────────────────
// Sabitler
// ──────────────────────────────────────────────────────────────────

const PARA_BIRIMLERI: ParaBirimi[] = ['TRY', 'EUR', 'USD'];
const BEKLEYEN_DURUMLAR: TeklifDurum[] = ['taslak', 'hazir', 'gonderildi'];

/** Risk eşikleri — yöneticinin dikkatini çekecek değerler. */
export const RISK_ESIK = {
  UZUN_BEKLEYEN_GUN: 14,            // gönderildi durumundan beri X gün
  YUKSEK_ISKONTO_YUZDE: 20,         // teklif veya satir iskontosu > X%
  YUKSEK_TUTAR_TRY: 50_000,         // TRY için belirsiz durumda risk
  YUKSEK_TUTAR_EUR: 1_500,
  YUKSEK_TUTAR_USD: 1_500,
} as const;

// ──────────────────────────────────────────────────────────────────
// Yardımcılar
// ──────────────────────────────────────────────────────────────────

export function bosParaBirimiToplami(): ParaBirimiToplam {
  return { TRY: 0, EUR: 0, USD: 0 };
}

function pb(t: Teklif): ParaBirimi {
  return (t.paraBirimi ?? 'TRY') as ParaBirimi;
}

function tarihIso(t: Teklif): string {
  // tarih 'YYYY-MM-DD' formatında olabilir, olusturmaTarihi ISO
  return t.tarih || t.olusturmaTarihi || '';
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function bugun(): string {
  return ymd(new Date());
}

function buAyBaslangici(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function gunFarki(isoDate: string, refIso: string): number {
  const a = new Date(isoDate).getTime();
  const b = new Date(refIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function safeAd(t: Teklif): string {
  return t.cari?.firmaAdi || t.cariSnapshot
    ? (t.cari?.firmaAdi || (t.cariSnapshot as { firmaAdi?: string } | undefined)?.firmaAdi || '(adsız)')
    : '(adsız)';
}

// ──────────────────────────────────────────────────────────────────
// Filtre uygulama
// ──────────────────────────────────────────────────────────────────

export function filtreleTeklifleri(teklifler: Teklif[], f: AnalizFiltresi): Teklif[] {
  let out = teklifler.filter((t) => !t.deletedAt);

  if (f.tarihBaslangic) {
    out = out.filter((t) => (tarihIso(t) || '') >= f.tarihBaslangic!);
  }
  if (f.tarihBitis) {
    out = out.filter((t) => (tarihIso(t) || '') <= f.tarihBitis!);
  }
  if (f.kullaniciId) {
    out = out.filter((t) => t.hazirlayanKullaniciId === f.kullaniciId);
  }
  if (f.firmaId) {
    out = out.filter((t) => t.firmaId === f.firmaId);
  }
  if (f.durum) {
    out = out.filter((t) => t.durum === f.durum);
  }
  if (f.paraBirimi) {
    out = out.filter((t) => pb(t) === f.paraBirimi);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────
// Özet metrikleri
// ──────────────────────────────────────────────────────────────────

export function ozetMetrikleriHesapla(teklifler: Teklif[]): OzetMetrikleri {
  const today = bugun();
  const ayIlk = buAyBaslangici();
  const durumDagilimi: Record<TeklifDurum, number> = {
    taslak: 0,
    hazir: 0,
    gonderildi: 0,
    onaylandi: 0,
    siparis_alindi: 0,
    reddedildi: 0,
    iptal: 0,
  };
  const toplamTutarlar = bosParaBirimiToplami();
  let bugunSayisi = 0;
  let buAySayisi = 0;
  let pdfOlusturulanSayisi = 0;

  for (const t of teklifler) {
    const d = tarihIso(t);
    if (d === today) bugunSayisi++;
    if (d >= ayIlk) buAySayisi++;
    if (t.pdfOlusturmaTarihi) pdfOlusturulanSayisi++;
    if (t.durum in durumDagilimi) durumDagilimi[t.durum]++;
    const para = pb(t);
    toplamTutarlar[para] += (t.genelToplam || 0);
  }

  const bekleyenSayisi = BEKLEYEN_DURUMLAR.reduce((s, k) => s + durumDagilimi[k], 0);
  const pdfYuzde = teklifler.length > 0 ? Math.round((pdfOlusturulanSayisi / teklifler.length) * 100) : 0;

  return {
    bugunSayisi,
    buAySayisi,
    toplamSayisi: teklifler.length,
    pdfOlusturulanSayisi,
    pdfYuzde,
    durumDagilimi,
    toplamTutarlar,
    bekleyenSayisi,
  };
}

// ──────────────────────────────────────────────────────────────────
// Kullanıcı performansı
// ──────────────────────────────────────────────────────────────────

export function kullaniciPerformansiHesapla(teklifler: Teklif[]): KullaniciPerformansi[] {
  const map = new Map<string, KullaniciPerformansi>();
  for (const t of teklifler) {
    const kid = t.hazirlayanKullaniciId;
    if (!kid) continue;
    let kp = map.get(kid);
    if (!kp) {
      kp = {
        kullaniciId: kid,
        adSoyad: t.hazirlayanAdSoyad || '(bilinmeyen)',
        unvan: t.hazirlayanUnvan || '',
        rol: t.hazirlayanRol || '',
        toplamTeklifSayisi: 0,
        onaylanan: 0,
        bekleyen: 0,
        reddedilen: 0,
        toplamTutar: bosParaBirimiToplami(),
        ortalamaTutar: bosParaBirimiToplami(),
        sonTeklifTarihi: null,
      };
      map.set(kid, kp);
    }
    kp.toplamTeklifSayisi++;
    // Kısmi onay → onaylanan grubunda (iş kazanılmış sayılır, bazı kalemler satıldı).
    if (t.durum === 'onaylandi' || t.durum === 'kismi_onaylandi' || t.durum === 'siparis_alindi') kp.onaylanan++;
    else if (BEKLEYEN_DURUMLAR.includes(t.durum)) kp.bekleyen++;
    else if (t.durum === 'reddedildi' || t.durum === 'iptal') kp.reddedilen++;
    const para = pb(t);
    kp.toplamTutar[para] += (t.genelToplam || 0);
    const d = tarihIso(t);
    if (!kp.sonTeklifTarihi || d > kp.sonTeklifTarihi) kp.sonTeklifTarihi = d;
  }
  // Ortalama tutarı hesapla (kayıt sayısına böl, sadece > 0 olan para birimleri)
  for (const kp of map.values()) {
    if (kp.toplamTeklifSayisi > 0) {
      for (const para of PARA_BIRIMLERI) {
        kp.ortalamaTutar[para] = kp.toplamTutar[para] / kp.toplamTeklifSayisi;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.toplamTeklifSayisi - a.toplamTeklifSayisi);
}

// ──────────────────────────────────────────────────────────────────
// Firma (cari) analizi
// ──────────────────────────────────────────────────────────────────

export function firmaAnaliziHesapla(teklifler: Teklif[]): FirmaAnaliz[] {
  const map = new Map<string, FirmaAnaliz>();
  for (const t of teklifler) {
    const cariId = t.cari?.id || (t.cariSnapshot as { id?: string } | undefined)?.id || '';
    if (!cariId) continue;
    let fa = map.get(cariId);
    if (!fa) {
      const ad = safeAd(t);
      const kod = t.cari?.cariKod || (t.cariSnapshot as { cariKod?: string } | undefined)?.cariKod || '';
      fa = {
        cariId,
        firmaAdi: ad,
        cariKod: kod,
        toplamTeklifSayisi: 0,
        onaylanan: 0,
        bekleyen: 0,
        reddedilen: 0,
        toplamTutar: bosParaBirimiToplami(),
        basariOraniYuzde: 0,
        sonTeklifTarihi: null,
      };
      map.set(cariId, fa);
    }
    fa.toplamTeklifSayisi++;
    if (t.durum === 'onaylandi' || t.durum === 'kismi_onaylandi' || t.durum === 'siparis_alindi') fa.onaylanan++;
    else if (BEKLEYEN_DURUMLAR.includes(t.durum)) fa.bekleyen++;
    else if (t.durum === 'reddedildi' || t.durum === 'iptal') fa.reddedilen++;
    fa.toplamTutar[pb(t)] += (t.genelToplam || 0);
    const d = tarihIso(t);
    if (!fa.sonTeklifTarihi || d > fa.sonTeklifTarihi) fa.sonTeklifTarihi = d;
  }
  for (const fa of map.values()) {
    const kapali = fa.onaylanan + fa.reddedilen;
    fa.basariOraniYuzde = kapali > 0 ? Math.round((fa.onaylanan / kapali) * 100) : 0;
  }
  return Array.from(map.values()).sort((a, b) => b.toplamTeklifSayisi - a.toplamTeklifSayisi);
}

// ──────────────────────────────────────────────────────────────────
// Marka & ürün kodu analizi
// ──────────────────────────────────────────────────────────────────

interface SatirCtx { satir: TeklifSatiri; teklif: Teklif }

function* tumSatirlar(teklifler: Teklif[]): Generator<SatirCtx> {
  for (const t of teklifler) {
    for (const s of t.satirlar || []) {
      if (!s || s.setAltKalem) continue; // set alt kalemleri parent ile sayılır
      yield { satir: s, teklif: t };
    }
  }
}

function satirToplam(s: TeklifSatiri): number {
  const m = Number(s.miktar) || 0;
  const f = Number(s.birimFiyat) || 0;
  const i = Number(s.indirimOrani) || 0;
  return Math.max(0, m * f * (1 - i / 100));
}

export function markaAnaliziHesapla(teklifler: Teklif[]): MarkaAnaliz[] {
  const map = new Map<string, { sayi: number; teklifSet: Set<string>; tutar: ParaBirimiToplam }>();
  for (const ctx of tumSatirlar(teklifler)) {
    const marka = (ctx.satir.marka || '').trim() || '(belirsiz)';
    let m = map.get(marka);
    if (!m) {
      m = { sayi: 0, teklifSet: new Set(), tutar: bosParaBirimiToplami() };
      map.set(marka, m);
    }
    m.sayi++;
    m.teklifSet.add(ctx.teklif.id);
    const para = (ctx.satir.paraBirimi || ctx.teklif.paraBirimi || 'TRY') as ParaBirimi;
    m.tutar[para] = (m.tutar[para] || 0) + satirToplam(ctx.satir);
  }
  return Array.from(map.entries())
    .map(([marka, m]) => ({
      marka,
      satirSayisi: m.sayi,
      teklifSayisi: m.teklifSet.size,
      toplamTutar: m.tutar,
    }))
    .sort((a, b) => b.satirSayisi - a.satirSayisi);
}

export function urunKoduAnaliziHesapla(teklifler: Teklif[], limit = 20): UrunKoduAnaliz[] {
  const map = new Map<string, { sayi: number; toplamMiktar: number; markaSayim: Map<string, number> }>();
  for (const ctx of tumSatirlar(teklifler)) {
    const kod = (ctx.satir.urunKod || '').trim();
    if (!kod) continue;
    let u = map.get(kod);
    if (!u) {
      u = { sayi: 0, toplamMiktar: 0, markaSayim: new Map() };
      map.set(kod, u);
    }
    u.sayi++;
    u.toplamMiktar += Number(ctx.satir.miktar) || 0;
    const marka = (ctx.satir.marka || '').trim() || '(belirsiz)';
    u.markaSayim.set(marka, (u.markaSayim.get(marka) || 0) + 1);
  }
  const dominantMarka = (m: Map<string, number>): string => {
    let best = '(belirsiz)';
    let bestCount = 0;
    for (const [marka, n] of m) {
      if (n > bestCount) { best = marka; bestCount = n; }
    }
    return best;
  };
  return Array.from(map.entries())
    .map(([urunKod, u]) => ({
      urunKod,
      marka: dominantMarka(u.markaSayim),
      satirSayisi: u.sayi,
      toplamMiktar: u.toplamMiktar,
    }))
    .sort((a, b) => b.satirSayisi - a.satirSayisi)
    .slice(0, limit);
}

// ──────────────────────────────────────────────────────────────────
// Para birimi özeti
// ──────────────────────────────────────────────────────────────────

export function paraBirimiOzetiHesapla(teklifler: Teklif[]): ParaBirimiOzeti {
  const toplamlar = bosParaBirimiToplami();
  const kdvHaric = bosParaBirimiToplami();
  const toplamIskonto = bosParaBirimiToplami();
  const toplamKdv = bosParaBirimiToplami();
  let karisikSayisi = 0;

  for (const t of teklifler) {
    const para = pb(t);
    toplamlar[para] += (t.genelToplam || 0);
    kdvHaric[para] += (t.araToplam || 0);
    toplamIskonto[para] += (t.toplamIndirim || 0);
    toplamKdv[para] += (t.toplamVergi || 0);
    if (t.satirBazliParaBirimi) {
      const setPara = new Set<string>();
      for (const s of t.satirlar || []) {
        if (s.paraBirimi) setPara.add(s.paraBirimi);
      }
      if (setPara.size > 1) karisikSayisi++;
    }
  }

  return { toplamlar, kdvHaric, toplamIskonto, toplamKdv, karisikSayisi };
}

// ──────────────────────────────────────────────────────────────────
// PDF / aktivite analizi
// ──────────────────────────────────────────────────────────────────

export function pdfAktivitesiHesapla(teklifler: Teklif[], limit = 30): PdfAktivite[] {
  return teklifler
    .filter((t) => !!t.pdfOlusturmaTarihi)
    .map((t) => ({
      teklifId: t.id,
      teklifNo: t.teklifNo || '',
      hazirlayanAdSoyad: t.hazirlayanAdSoyad || '(bilinmeyen)',
      cariAdi: safeAd(t),
      pdfOlusturmaTarihi: t.pdfOlusturmaTarihi || '',
      genelToplam: t.genelToplam || 0,
      paraBirimi: pb(t),
      durum: t.durum,
    }))
    .sort((a, b) => (b.pdfOlusturmaTarihi || '').localeCompare(a.pdfOlusturmaTarihi || ''))
    .slice(0, limit);
}

// ──────────────────────────────────────────────────────────────────
// Risk merkezi
// ──────────────────────────────────────────────────────────────────

export function riskTekliflerHesapla(teklifler: Teklif[]): Record<RiskKategori, RiskItem[]> {
  const today = new Date().toISOString();
  const sonuc: Record<RiskKategori, RiskItem[]> = {
    uzunBekleyen: [],
    yuksekIskonto: [],
    pdfAmaGonderilmemis: [],
    satirBosOlan: [],
    yuksekTutarBelirsiz: [],
    teslimTarihiBos: [],
    karisikParaBirimi: [],
  };

  const yuksekTutarEsik = (para: ParaBirimi): number => {
    if (para === 'TRY') return RISK_ESIK.YUKSEK_TUTAR_TRY;
    if (para === 'EUR') return RISK_ESIK.YUKSEK_TUTAR_EUR;
    return RISK_ESIK.YUKSEK_TUTAR_USD;
  };

  const itemBase = (t: Teklif): Omit<RiskItem, 'kategori' | 'detay'> => ({
    teklifId: t.id,
    teklifNo: t.teklifNo || '',
    cariAdi: safeAd(t),
    hazirlayanAdSoyad: t.hazirlayanAdSoyad || '(bilinmeyen)',
    durum: t.durum,
    genelToplam: t.genelToplam || 0,
    paraBirimi: pb(t),
  });

  for (const t of teklifler) {
    if (t.deletedAt) continue;

    // 1) Uzun süredir gönderildi
    if (t.durum === 'gonderildi') {
      const refTarih = t.olusturmaTarihi || t.tarih;
      const gun = gunFarki(refTarih, today);
      if (gun >= RISK_ESIK.UZUN_BEKLEYEN_GUN) {
        sonuc.uzunBekleyen.push({ ...itemBase(t), kategori: 'uzunBekleyen', detay: `${gun} gündür yanıt yok` });
      }
    }

    // 2) Yüksek iskonto
    const teklifIskonto = Number(t.iskontoOrani) || 0;
    const maxSatirIskonto = (t.satirlar || []).reduce((m, s) => Math.max(m, Number(s.indirimOrani) || 0), 0);
    const enYuksekIskonto = Math.max(teklifIskonto, maxSatirIskonto);
    if (enYuksekIskonto >= RISK_ESIK.YUKSEK_ISKONTO_YUZDE) {
      sonuc.yuksekIskonto.push({
        ...itemBase(t),
        kategori: 'yuksekIskonto',
        detay: `İskonto ${enYuksekIskonto.toFixed(1)}%`,
      });
    }

    // 3) PDF üretilmiş ama gönderildi/hazır değil → ya hazır ya da hala taslakta unutulmuş
    if (t.pdfOlusturmaTarihi && t.durum === 'taslak') {
      sonuc.pdfAmaGonderilmemis.push({
        ...itemBase(t),
        kategori: 'pdfAmaGonderilmemis',
        detay: 'PDF var, durum hâlâ Hazırlanıyor',
      });
    }

    // 4) Cari adı var ama satır boş
    const cariVar = !!(t.cari?.firmaAdi || (t.cariSnapshot as { firmaAdi?: string } | undefined)?.firmaAdi);
    const satirSayisi = (t.satirlar || []).filter((s) => !s.setAltKalem).length;
    if (cariVar && satirSayisi === 0) {
      sonuc.satirBosOlan.push({ ...itemBase(t), kategori: 'satirBosOlan', detay: 'Müşteri seçili, ürün satırı yok' });
    }

    // 5) Yüksek tutarlı ama durum belirsiz (taslak/hazır)
    if ((t.durum === 'taslak' || t.durum === 'hazir') && (t.genelToplam || 0) >= yuksekTutarEsik(pb(t))) {
      sonuc.yuksekTutarBelirsiz.push({
        ...itemBase(t),
        kategori: 'yuksekTutarBelirsiz',
        detay: 'Yüksek tutarlı, durum henüz netleşmedi',
      });
    }

    // 6) Teslim tarihi boş satır
    const teslimBos = (t.satirlar || []).some((s) => !s.setAltKalem && !(s.teslimTarihi || '').trim());
    if (teslimBos && satirSayisi > 0) {
      sonuc.teslimTarihiBos.push({ ...itemBase(t), kategori: 'teslimTarihiBos', detay: 'En az bir satırda teslim süresi yok' });
    }

    // 7) Karışık para birimi
    if (t.satirBazliParaBirimi) {
      const setPara = new Set<string>();
      for (const s of t.satirlar || []) {
        if (s.paraBirimi) setPara.add(s.paraBirimi);
      }
      if (setPara.size > 1) {
        sonuc.karisikParaBirimi.push({
          ...itemBase(t),
          kategori: 'karisikParaBirimi',
          detay: `${setPara.size} farklı para birimi: ${Array.from(setPara).join(', ')}`,
        });
      }
    }
  }

  return sonuc;
}

// ──────────────────────────────────────────────────────────────────
// En aktif kullanıcı + En çok teklif verilen firma
// ──────────────────────────────────────────────────────────────────

export function enAktifKullanici(teklifler: Teklif[]): { adSoyad: string; sayi: number } | null {
  const map = new Map<string, { ad: string; n: number }>();
  for (const t of teklifler) {
    const kid = t.hazirlayanKullaniciId;
    if (!kid) continue;
    const cur = map.get(kid);
    if (cur) cur.n++;
    else map.set(kid, { ad: t.hazirlayanAdSoyad || '(bilinmeyen)', n: 1 });
  }
  let best: { adSoyad: string; sayi: number } | null = null;
  for (const v of map.values()) {
    if (!best || v.n > best.sayi) best = { adSoyad: v.ad, sayi: v.n };
  }
  return best;
}

export function enCokTeklifVerilenFirma(teklifler: Teklif[]): { firmaAdi: string; sayi: number } | null {
  const map = new Map<string, { ad: string; n: number }>();
  for (const t of teklifler) {
    const cariId = t.cari?.id || (t.cariSnapshot as { id?: string } | undefined)?.id || '';
    if (!cariId) continue;
    const ad = safeAd(t);
    const cur = map.get(cariId);
    if (cur) cur.n++;
    else map.set(cariId, { ad, n: 1 });
  }
  let best: { firmaAdi: string; sayi: number } | null = null;
  for (const v of map.values()) {
    if (!best || v.n > best.sayi) best = { firmaAdi: v.ad, sayi: v.n };
  }
  return best;
}
