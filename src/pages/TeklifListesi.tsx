import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Dropdown, Input, Modal, Popconfirm, Select, Tooltip } from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  CopyOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  CameraOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';
import { teklifService } from '../services/teklifService';
import { cariService } from '../services/musteriService';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import type { Teklif, TeklifDurum, TeklifSonuc, KayipSebebi, Cari, Kullanici } from '../types';
import { formatCurrency, formatDate, formatCariAdi } from '../utils/formatters';
import { klasorAdiUret } from '../utils/folderUtils';
import { dosyaToCariLogoBase64 } from '../utils/cariLogo';
import { api } from '../services/apiClient';
import { useKullanici } from '../context/useKullanici';
import { useIsMobile } from '../hooks/useIsMobile';
import { buttonClassNames, tabButtonClassName } from '../styles/buttonStyles';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../context/useTheme';

// ─── Sabitler ────────────────────────────────────────────────────────────────

const DURUM_CFG: Record<TeklifDurum, { label: string; color: string; bg: string; border: string }> = {
  taslak:     { label: 'Taslak',     color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  hazir:      { label: 'Hazır',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  gonderildi: { label: 'Gönderildi', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  onaylandi:  { label: 'Onaylandı',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  reddedildi:  { label: 'Reddedildi',  color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  iptal:      { label: 'İptal',      color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
};

const DURUM_CFG_DARK: Record<TeklifDurum, { label: string; color: string; bg: string; border: string }> = {
  taslak:     { label: 'Taslak',     color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
  hazir:      { label: 'Hazır',      color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.22)'  },
  gonderildi: { label: 'Gönderildi', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)'  },
  onaylandi:  { label: 'Onaylandı',  color: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.22)'  },
  reddedildi:  { label: 'Reddedildi',  color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' },
  iptal:      { label: 'İptal',      color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
};

// İş sonucu — durum'dan bağımsız: yöneticinin win/loss analizi için.
// Not: DB'de hâlâ 'kazanildi' anahtarı kullanılıyor; UI'da "Onaylandı" gösteriliyor
// (kullanıcı tarafından "kazanıldı" terimi kaldırıldı, "onaylandı" tek pozitif outcome).
export const SONUC_CFG: Record<TeklifSonuc, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  kazanildi:  { label: 'Onaylandı',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', emoji: '✓' },
  kaybedildi: { label: 'Kaybedildi', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', emoji: '✕' },
  iptal:      { label: 'İptal',      color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', emoji: '○' },
  beklemede:  { label: 'Beklemede',  color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', emoji: '·' },
};

// Sebep listesi — hem Kaybedildi hem İptal için aynı havuz; kullanıcı seçer.
// (Öncesinde sadece kaybedildi'ye özeldi; iptal'e de açıldı.)
export const KAYIP_SEBEBI_LABEL: Record<KayipSebebi, string> = {
  fiyat:       'Fiyat',
  rakip:       'Rakip',
  zaman:       'Zaman/Süre',
  ihtiyac_yok: 'İhtiyaç düştü',
  diger:       'Diğer',
};

interface PersonelRenk {
  accent: string;
  avatarBg: string;
  avatarBorder: string;
  avatarText: string;
}

const PALET: PersonelRenk[] = [
  { accent: '#7c3aed', avatarBg: 'rgba(124,58,237,0.12)', avatarBorder: 'rgba(124,58,237,0.40)', avatarText: '#7c3aed' },
  { accent: '#0891b2', avatarBg: 'rgba(8,145,178,0.12)',  avatarBorder: 'rgba(8,145,178,0.40)',  avatarText: '#0891b2' },
  { accent: '#b45309', avatarBg: 'rgba(180,83,9,0.12)',   avatarBorder: 'rgba(180,83,9,0.40)',   avatarText: '#b45309' },
  { accent: '#be185d', avatarBg: 'rgba(190,24,93,0.12)',  avatarBorder: 'rgba(190,24,93,0.40)',  avatarText: '#be185d' },
  { accent: '#15803d', avatarBg: 'rgba(21,128,61,0.12)',  avatarBorder: 'rgba(21,128,61,0.40)',  avatarText: '#15803d' },
  { accent: '#b91c1c', avatarBg: 'rgba(185,28,28,0.12)',  avatarBorder: 'rgba(185,28,28,0.40)',  avatarText: '#b91c1c' },
];

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

function personelRenk(isim: string): PersonelRenk {
  let h = 0;
  for (let i = 0; i < isim.length; i++) h = (h * 31 + isim.charCodeAt(i)) & 0xffffffff;
  return PALET[Math.abs(h) % PALET.length];
}

function initials(isim: string): string {
  return isim.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function teklifToplamOzeti(teklif: Teklif): string[] {
  if (!teklif.satirBazliParaBirimi) {
    return [formatCurrency(teklif.genelToplam, teklif.paraBirimi)];
  }
  const toplamlar = hesaplamaMotoru.paraBirimineGoreToplamlar(teklif.satirlar, teklif.paraBirimi);
  return (['TRY', 'EUR', 'USD'] as const)
    .filter((pb) => toplamlar[pb] > 0)
    .map((pb) => formatCurrency(toplamlar[pb], pb));
}

// ─── Klasör veri tipi ─────────────────────────────────────────────────────────

interface CustomerFolder {
  klasorAdi: string;
  firmaAdiDisplay: string;
  teklifler: Teklif[];
  sonTarih: string;
  /** Master cari kaydından çekilen logo URL'i — yoksa otomatik monogram fallback */
  logoUrl?: string;
  /** Logo upload için master cari id (snapshot id'den farklı olabilir) */
  cariId?: string;
  /** Bu cariye en çok teklif yazmış 3 kullanıcının id sırası (azalan) */
  topHazirlayanIds: string[];
  /** Klasördeki tekliflerin durum dağılımı — aktivite şeridi rengi için */
  durumDist: Record<TeklifDurum, number>;
  /** 3+ gündür gönderildi durumda kalan ve sonucu girilmemiş teklif sayısı —
   *  klasör kartında lamba uyarısı için. */
  ucGunDurumsuzSayi: number;
}

function buildFolders(teklifler: Teklif[], cariMap: Map<string, Cari>): CustomerFolder[] {
  const map = new Map<string, CustomerFolder>();

  const ucGunEsigi = Date.now() - 3 * 24 * 60 * 60 * 1000;

  for (const t of teklifler) {
    const key = klasorAdiUret(t.cari.firmaAdi);
    if (!map.has(key)) {
      map.set(key, {
        klasorAdi: key,
        firmaAdiDisplay: formatCariAdi(t.cari.firmaAdi),
        teklifler: [],
        sonTarih: t.tarih,
        topHazirlayanIds: [],
        durumDist: { taslak: 0, hazir: 0, gonderildi: 0, onaylandi: 0, reddedildi: 0, iptal: 0 },
        ucGunDurumsuzSayi: 0,
      });
    }
    const folder = map.get(key)!;
    folder.teklifler.push(t);
    if (t.tarih > folder.sonTarih) folder.sonTarih = t.tarih;
    if (t.durum && folder.durumDist[t.durum] !== undefined) {
      folder.durumDist[t.durum] += 1;
    }
    // 3+ gün gönderildi durumda kalan teklifler — sonuç bekliyor.
    // NOT: guncellemeTarihi her cache değişikliğinde güncellenir (yanıltıcı);
    // teklifin asıl yazılma tarihi olarak olusturmaTarihi/tarih kullanılır.
    if (t.durum === 'gonderildi') {
      const ts = new Date(t.olusturmaTarihi || t.tarih).getTime();
      if (Number.isFinite(ts) && ts <= ucGunEsigi) {
        folder.ucGunDurumsuzSayi += 1;
      }
    }
  }

  for (const f of map.values()) {
    // Teklifler içinde en yenisi öne — her klasörde tutarlı sıra
    f.teklifler.sort((a, b) => b.tarih.localeCompare(a.tarih));

    // Logo lookup — folder'daki herhangi bir teklifin cari.id'sinden master cariye ulaş.
    // Aynı klasöre düşen birden fazla cariId olabilir (ilk-2-kelime kuralı yüzünden);
    // logosu olan ilk cariyi öncelikle seç.
    const cariIdleri = Array.from(new Set(f.teklifler.map((t) => t.cari.id))).filter(Boolean);
    let pickedCari: Cari | undefined;
    for (const cid of cariIdleri) {
      const m = cariMap.get(cid);
      if (m && m.logoUrl) { pickedCari = m; break; }
    }
    if (!pickedCari && cariIdleri.length > 0) pickedCari = cariMap.get(cariIdleri[0]);
    if (pickedCari) {
      f.cariId = pickedCari.id;
      f.logoUrl = pickedCari.logoUrl || undefined;
    }

    // Top 3 hazırlayan
    const sayim = new Map<string, number>();
    for (const t of f.teklifler) {
      const id = t.hazirlayanKullaniciId;
      if (!id) continue;
      sayim.set(id, (sayim.get(id) || 0) + 1);
    }
    f.topHazirlayanIds = Array.from(sayim.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.klasorAdi.localeCompare(b.klasorAdi, 'tr-TR'),
  );
}

// ─── Aktivite göstergesi (küçük dot rengi) ────────────────────────────────────

// @ts-expect-error — kullanılmıyor (renkli dot kaldırıldı)
function aktiviteRengi(folder: CustomerFolder): { color: string; label: string } {
  const top = (Object.entries(folder.durumDist) as Array<[TeklifDurum, number]>)
    .sort((a, b) => b[1] - a[1])[0];
  const baskinDurum = top && top[1] > 0 ? top[0] : null;

  if (baskinDurum === 'iptal') return { color: '#dc2626', label: 'İptal hâkim' };

  const son = new Date(folder.sonTarih);
  if (Number.isNaN(son.getTime())) return { color: '#94a3b8', label: 'Tarih yok' };
  const gunFark = Math.floor((Date.now() - son.getTime()) / (24 * 60 * 60 * 1000));

  if (baskinDurum === 'onaylandi') return { color: '#059669', label: 'Onaylanmış' };
  if (gunFark <= 30)  return { color: '#16a34a', label: 'Aktif (≤30 gün)' };
  if (gunFark <= 90)  return { color: '#d97706', label: 'Yavaşlamış (≤90 gün)' };
  if (gunFark <= 180) return { color: '#94a3b8', label: 'Uyuyor (≤6 ay)' };
  return { color: '#64748b', label: 'Eski (>6 ay)' };
}

// ─── Sektörel/genel kelimeleri filtre — wordmark için ─────────────────────────
// Bu kelimeler tek başına firmayı tanımlamaz; brand wordmark'a katmıyoruz.
const STOP_WORDS = new Set([
  'ELEKTRİK', 'ELEKTRIK', 'MEKANİK', 'MEKANIK', 'OTOMASYON', 'MAKİNE', 'MAKINA', 'MAKİNA',
  'TESİSAT', 'TESISAT', 'ENDÜSTRİYEL', 'ENDUSTRIYEL', 'MÜHENDİSLİK', 'MUHENDISLIK',
  'HİDROLİK', 'HIDROLIK', 'PNÖMATİK', 'PNOMATIK', 'TEKNİK', 'TEKNIK', 'KONTROL',
  'PROSES', 'YENİLİKÇİ', 'YENILIKCI', 'SAN', 'TİC', 'TIC', 'LTD', 'A.Ş.', 'AS',
  'ŞTİ', 'STI', 'İNŞ', 'INS', 'VE', 'SAN.', 'TİC.', 'LTD.', 'A.Ş', 'A.S.',
  'INC', 'GMBH', 'CO', 'CO.', 'GROUP', 'GRUP', 'VS',
]);

function distinctiveWord(firmaAdi: string): string {
  const ham = String(firmaAdi || '').toLocaleUpperCase('tr-TR').split(/[\s.,/]+/).filter(Boolean);
  const free = ham.filter((w) => !STOP_WORDS.has(w));
  return free[0] || ham[0] || '';
}

/** Premium wordmark: distinctive ilk kelimenin tamamı (ör. "EGE", "ANADOLU", "ÇINAR").
 *  Kısaltma YOK — kart tile'ında font-size dinamik küçültülür. */
function wordmarkUret(firmaAdi: string): string {
  const w = distinctiveWord(firmaAdi);
  if (!w) return '–';
  // Aşırı uzun kelimeleri (BORÇELİKDEMİRSAN) max 9 karaktere indir, yine de tek kelime
  return w.length > 9 ? w.slice(0, 9) : w;
}

/** Wordmark uzunluğuna göre tile içinde sığan font boyutu döner. */
function wordmarkFontSize(text: string, tileSize: number): number {
  const n = text.length;
  // tileSize 52 için: 1-3 harf = 18, 4 = 14, 5 = 12, 6 = 10, 7+ = 9
  // tileSize 44 (mobile) için orantılı ölçek
  const baz = tileSize >= 50 ? 1 : 0.85;
  let s: number;
  if (n <= 3) s = 18;
  else if (n === 4) s = 14;
  else if (n === 5) s = 12;
  else if (n === 6) s = 10.5;
  else if (n === 7) s = 9.5;
  else s = 8.5;
  return Math.round(s * baz);
}

/** Logo tile arkaplanı: aşırı renkli değil — düşük doygunluklu kurumsal ton.
 *  Açık modda paper feel için L=92, dark'ta calmer L=18. */
function logoTileRengi(seed: string, isDark: boolean): { bg: string; text: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(h) % 360;
  if (isDark) {
    return {
      bg:   `hsl(${hue}, 22%, 17%)`,
      text: `hsl(${hue}, 35%, 76%)`,
    };
  }
  return {
    bg:   `hsl(${hue}, 24%, 91%)`,
    text: `hsl(${hue}, 38%, 30%)`,
  };
}

// ─── Filtre tipi ─────────────────────────────────────────────────────────────

type Filtre = 'benim' | 'tumu' | 'digerleri';
type Gorunum = 'klasorler' | 'detay';
type Siralama = 'alfabe' | 'aktiflik' | 'teklifSayisi';
type GorunumModu = 'grid' | 'liste';

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function TeklifListesi() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { aktifKullanici } = useKullanici();
  const isMobile = useIsMobile(768);
  const C = useColors();

  const kullaniciCtx = useMemo(
    () => (aktifKullanici ? { id: aktifKullanici.id, rol: aktifKullanici.rol } : undefined),
    [aktifKullanici],
  );

  const [teklifler, setTeklifler] = useState<Teklif[]>(() =>
    teklifService.tumTeklifleriGetir(kullaniciCtx),
  );
  const [cariler, setCariler] = useState<Cari[]>(() => cariService.tumCarileriGetir());
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aktifFiltre, setAktifFiltre] = useState<Filtre>('benim');
  const [siralama, setSiralama] = useState<Siralama>('alfabe');
  const [gorunumModu, setGorunumModu] = useState<GorunumModu>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('teklif_klasor_gorunum') : null;
    return saved === 'liste' ? 'liste' : 'grid';
  });
  const [gorunum, setGorunum] = useState<Gorunum>('klasorler');
  const [seciliKlasor, setSeciliKlasor] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem('teklif_klasor_gorunum', gorunumModu); } catch { /* ignore */ }
  }, [gorunumModu]);

  const benimId = aktifKullanici?.id;

  const teklifleriYukle = useCallback(() => {
    setTeklifler(teklifService.tumTeklifleriGetir(kullaniciCtx));
    setCariler(cariService.tumCarileriGetir());
  }, [kullaniciCtx]);

  // Kullanıcı listesi (avatar yığını için) — bir kez çek; hata olursa boş kalır
  useEffect(() => {
    let aborted = false;
    api.kullanicilar.list().then((liste) => {
      if (!aborted) setKullanicilar(liste);
    }).catch(() => { /* yetkisi yoksa avatar yığını gizlenir */ });
    return () => { aborted = true; };
  }, []);

  // Master cari haritası — logoUrl lookup için
  const cariMap = useMemo(() => {
    const m = new Map<string, Cari>();
    for (const c of cariler) m.set(c.id, c);
    return m;
  }, [cariler]);

  // Kullanıcı haritası — avatar yığını için
  const kullaniciMap = useMemo(() => {
    const m = new Map<string, Kullanici>();
    for (const k of kullanicilar) m.set(k.id, k);
    return m;
  }, [kullanicilar]);

  const updateCariLocal = useCallback((c: Cari) => {
    setCariler((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = c;
        return next;
      }
      return [...prev, c];
    });
  }, []);

  // Sayfa açıldığında / kullanıcı değişiminde sunucudan taze veri çek
  // (visibility filter backend'de uygulanır → cache'i tazele).
  useEffect(() => {
    let aborted = false;
    teklifService.tekliferiYenile(kullaniciCtx).then(() => {
      if (!aborted) teklifleriYukle();
    });
    return () => { aborted = true; };
  }, [kullaniciCtx, teklifleriYukle]);

  function teklifSil(id: string) {
    teklifService.teklifSil(id);
    teklifleriYukle();
    message.success('Teklif silindi.');
  }

  async function teklifKopyala(id: string) {
    const ki = aktifKullanici
      ? { id: aktifKullanici.id, adSoyad: aktifKullanici.adSoyad, rol: aktifKullanici.rol }
      : undefined;
    const yeni = teklifService.teklifKopyala(id, ki);
    if (yeni) {
      const teklifNo = await teklifService.teklifNoUretAsync();
      teklifService.teklifKaydet({ ...yeni, teklifNo });
      teklifleriYukle();
      message.success(`Kopyalandı: ${teklifNo}`);
    }
  }

  function klasoreGir(klasorAdi: string) {
    setSeciliKlasor(klasorAdi);
    setGorunum('detay');
    setAramaMetni('');
  }

  function klasordenCik() {
    setGorunum('klasorler');
    setSeciliKlasor(null);
    setAramaMetni('');
  }

  // ── Tab bazlı filtreleme ─────────────────────────────────────────────────────
  const tabFiltreli = useMemo(() => {
    if (aktifFiltre === 'benim') return teklifler.filter((t) => t.hazirlayanKullaniciId === benimId);
    if (aktifFiltre === 'digerleri') return teklifler.filter((t) => t.hazirlayanKullaniciId !== benimId);
    return teklifler;
  }, [teklifler, aktifFiltre, benimId]);

  // ── Klasörler (ana görünüm) ───────────────────────────────────────────────────
  const klasorler = useMemo(() => {
    let all = buildFolders(tabFiltreli, cariMap);
    if (aramaMetni.trim()) {
      const q = aramaMetni.toLocaleLowerCase('tr-TR');
      all = all.filter(
        (f) =>
          f.klasorAdi.toLocaleLowerCase('tr-TR').includes(q) ||
          f.firmaAdiDisplay.toLocaleLowerCase('tr-TR').includes(q),
      );
    }
    if (siralama === 'aktiflik') {
      all = [...all].sort((a, b) => b.sonTarih.localeCompare(a.sonTarih));
    } else if (siralama === 'teklifSayisi') {
      all = [...all].sort((a, b) => b.teklifler.length - a.teklifler.length);
    }
    // 'alfabe' zaten buildFolders'tan A-Z geliyor.
    return all;
  }, [tabFiltreli, cariMap, aramaMetni, siralama]);

  // ── Detay görünümü: seçili klasörün tüm teklifleri (tab filtreli) ────────────
  const detayTeklifleri = useMemo(() => {
    if (!seciliKlasor) return [];
    let liste = tabFiltreli.filter(
      (t) => klasorAdiUret(t.cari.firmaAdi) === seciliKlasor,
    );
    if (aramaMetni.trim()) {
      const q = aramaMetni.toLocaleLowerCase('tr-TR');
      liste = liste.filter(
        (t) =>
          t.teklifNo.toLocaleLowerCase('tr-TR').includes(q) ||
          t.cari.firmaAdi.toLocaleLowerCase('tr-TR').includes(q) ||
          (t.hazirlayanAdSoyad?.toLocaleLowerCase('tr-TR').includes(q) ?? false),
      );
    }
    return liste.sort((a, b) => b.tarih.localeCompare(a.tarih));
  }, [tabFiltreli, seciliKlasor, aramaMetni]);

  const benimSayisi   = useMemo(() => teklifler.filter((t) => t.hazirlayanKullaniciId === benimId).length, [teklifler, benimId]);
  const digerSayisi   = useMemo(() => teklifler.filter((t) => t.hazirlayanKullaniciId !== benimId).length, [teklifler, benimId]);

  // ── Yönetici özeti — sadece admin/super_admin/firma_admin için ───────────────
  const isAdmin = useMemo(() => {
    const r = aktifKullanici?.rol;
    return r === 'super_admin' || r === 'admin' || r === 'firma_admin';
  }, [aktifKullanici]);

  const yoneticiOzeti = useMemo(() => {
    if (!isAdmin) return null;
    return computeYoneticiOzeti(teklifler);
  }, [teklifler, isAdmin]);

  const sekmeler: Array<{ key: Filtre; label: string; count: number }> = [
    { key: 'benim',     label: 'Benim Tekliflerim',           count: benimSayisi     },
    { key: 'tumu',      label: 'Tüm Teklifler',               count: teklifler.length },
    { key: 'digerleri', label: 'Diğer Personellerin Teklifleri', count: digerSayisi  },
  ];

  // ── Klasör detay başlık bilgisi ──────────────────────────────────────────────
  const seciliKlasorBilgi = seciliKlasor
    ? klasorler.find((k) => k.klasorAdi === seciliKlasor) ??
      buildFolders(teklifler, cariMap).find((k) => k.klasorAdi === seciliKlasor)
    : null;

  const wrapperStyle: CSSProperties = {
    padding: isMobile ? '10px 12px 48px' : '14px 32px 64px',
    maxWidth: 1160,
    margin: '0 auto',
    width: '100%',
  };

  return (
    <div style={wrapperStyle}>
      {gorunum === 'klasorler' ? (
        <KlasorGorunumu
          isMobile={isMobile}
          C={C}
          teklifler={teklifler}
          klasorler={klasorler}
          kullaniciMap={kullaniciMap}
          aramaMetni={aramaMetni}
          setAramaMetni={setAramaMetni}
          aktifFiltre={aktifFiltre}
          setAktifFiltre={setAktifFiltre}
          siralama={siralama}
          setSiralama={setSiralama}
          gorunumModu={gorunumModu}
          setGorunumModu={setGorunumModu}
          sekmeler={sekmeler}
          yoneticiOzeti={yoneticiOzeti}
          aktifKullaniciAd={aktifKullanici?.adSoyad ?? ''}
          onKlasorTikla={klasoreGir}
          onCariGuncelle={updateCariLocal}
          navigate={navigate}
        />
      ) : (
        <DetayGorunumu
          isMobile={isMobile}
          C={C}
          klasorAdi={seciliKlasor!}
          firmaAdiDisplay={seciliKlasorBilgi?.firmaAdiDisplay ?? seciliKlasor!}
          teklifler={detayTeklifleri}
          aramaMetni={aramaMetni}
          setAramaMetni={setAramaMetni}
          aktifFiltre={aktifFiltre}
          setAktifFiltre={setAktifFiltre}
          sekmeler={sekmeler}
          benimId={benimId}
          navigate={navigate}
          onGeri={klasordenCik}
          onSil={teklifSil}
          onKopyala={teklifKopyala}
        />
      )}

    </div>
  );
}

// ─── Klasör Ana Görünümü ──────────────────────────────────────────────────────

interface KlasorGorunumuProps {
  isMobile: boolean;
  C: ReturnType<typeof useColors>;
  teklifler: Teklif[];
  klasorler: CustomerFolder[];
  kullaniciMap: Map<string, Kullanici>;
  aramaMetni: string;
  setAramaMetni: (v: string) => void;
  aktifFiltre: Filtre;
  setAktifFiltre: (f: Filtre) => void;
  siralama: Siralama;
  setSiralama: (s: Siralama) => void;
  gorunumModu: GorunumModu;
  setGorunumModu: (g: GorunumModu) => void;
  sekmeler: Array<{ key: Filtre; label: string; count: number }>;
  yoneticiOzeti: YoneticiOzetiData | null;
  aktifKullaniciAd: string;
  onKlasorTikla: (k: string) => void;
  onCariGuncelle: (c: Cari) => void;
  navigate: (path: string) => void;
}

export interface YoneticiOzetiData {
  funnel: Record<TeklifDurum, number>;
  sonucSayim: { kazanildi: number; kaybedildi: number; iptal: number; beklemede: number; girilmemis: number };
  acikPipeline: Record<string, number>;
  winRate: number | null;
  topSebepler: Array<[KayipSebebi, number]>;
  topPersonel: Array<{ ad: string; kazanildi: number; kayipli: number; toplam: number }>;
  kararliToplam: number;
}

/** Pure helper — teklif listesinden yönetici özeti metriklerini hesaplar.
 *  Yeni mantık: durum tek model — onaylandı=kazandı, kapanmadı=kaybetti, iptal=iptal. */
export function computeYoneticiOzeti(teklifler: Teklif[]): YoneticiOzetiData {
  const funnel: Record<TeklifDurum, number> = {
    taslak: 0, hazir: 0, gonderildi: 0, onaylandi: 0, reddedildi: 0, iptal: 0,
  };
  const sonucSayim = { kazanildi: 0, kaybedildi: 0, iptal: 0, beklemede: 0, girilmemis: 0 };
  const acikPipeline: Record<string, number> = { TRY: 0, EUR: 0, USD: 0 };
  const sebepSayim: Record<string, number> = {};
  const personelMap = new Map<string, { ad: string; kazanildi: number; kayipli: number; toplam: number }>();

  for (const t of teklifler) {
    if (t.durum && funnel[t.durum] !== undefined) funnel[t.durum] += 1;

    // Durum → sonuç eşlemesi (eski sonuc field'ı yerine)
    if (t.durum === 'onaylandi') sonucSayim.kazanildi += 1;
    else if (t.durum === 'reddedildi') sonucSayim.kaybedildi += 1;
    else if (t.durum === 'iptal') sonucSayim.iptal += 1;
    else sonucSayim.girilmemis += 1;

    // Açık pipeline: durum henüz sonuçlanmadıysa (taslak/hazır/gönderildi)
    const sonuclu = t.durum === 'onaylandi' || t.durum === 'reddedildi' || t.durum === 'iptal';
    if (!sonuclu) {
      const pb = t.paraBirimi || 'TRY';
      acikPipeline[pb] = (acikPipeline[pb] || 0) + (t.genelToplam || 0);
    }

    if (t.durum === 'reddedildi' && t.kayipSebebi) {
      sebepSayim[t.kayipSebebi] = (sebepSayim[t.kayipSebebi] || 0) + 1;
    }

    const pid = t.hazirlayanKullaniciId;
    if (pid) {
      const ad = t.hazirlayanAdSoyad || pid;
      if (!personelMap.has(pid)) personelMap.set(pid, { ad, kazanildi: 0, kayipli: 0, toplam: 0 });
      const p = personelMap.get(pid)!;
      p.toplam += 1;
      if (t.durum === 'onaylandi') p.kazanildi += 1;
      if (t.durum === 'reddedildi') p.kayipli += 1;
    }
  }

  const karar = sonucSayim.kazanildi + sonucSayim.kaybedildi;
  const winRate = karar > 0 ? Math.round((sonucSayim.kazanildi / karar) * 100) : null;
  const topSebepler = Object.entries(sebepSayim)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3) as Array<[KayipSebebi, number]>;
  const topPersonel = Array.from(personelMap.values())
    .sort((a, b) => b.kazanildi - a.kazanildi || b.toplam - a.toplam)
    .slice(0, 3);

  return { funnel, sonucSayim, acikPipeline, winRate, topSebepler, topPersonel, kararliToplam: karar };
}

function KlasorGorunumu({
  isMobile, C, klasorler, kullaniciMap, aramaMetni, setAramaMetni,
  aktifFiltre, setAktifFiltre, siralama, setSiralama, gorunumModu, setGorunumModu,
  sekmeler, yoneticiOzeti, aktifKullaniciAd, onKlasorTikla, onCariGuncelle,
  navigate,
}: KlasorGorunumuProps) {
  const ilkAd = aktifKullaniciAd ? aktifKullaniciAd.split(/\s+/)[0] : '';
  const saat = new Date().getHours();
  const selam = saat < 6 ? 'İyi geceler' : saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
  return (
    <>
      {/* Başlık + Hoşgeldin */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Tekliflerim
          </div>
          <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6, fontWeight: 400, letterSpacing: '0.005em' }}>
            {ilkAd ? `${selam}, ${ilkAd}.` : selam} Bugün ne ekleyelim?
          </div>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          className={buttonClassNames.primary}
          onClick={() => navigate('/teklif/yeni')}
          style={{ height: 40, fontWeight: 600, paddingLeft: 18, paddingRight: 18, letterSpacing: '0.005em' }}
        >
          Yeni Teklif
        </Button>
      </div>

      {/* Yönetici Özeti şeridi — sadece admin/super_admin/firma_admin */}
      {yoneticiOzeti && (
        <YoneticiOzeti
          isMobile={isMobile}
          C={C}
          data={yoneticiOzeti}
          mode="serit"
          onDetay={() => navigate('/analiz')}
        />
      )}

      {/* Filtreler + Arama */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 272px',
        alignItems: 'center',
        columnGap: 16,
        rowGap: 10,
        marginBottom: 28,
      }}>
        <div style={{
          display: 'flex',
          width: 'fit-content',
          maxWidth: '100%',
          gap: 3,
          alignItems: 'center',
          background: C.bgElevated,
          borderRadius: 9,
          padding: '3px',
          overflowX: isMobile ? 'auto' : 'visible',
        }}>
          {sekmeler.map((s) => (
            <button key={s.key} onClick={() => setAktifFiltre(s.key)} className={tabButtonClassName(aktifFiltre === s.key)}>
              {s.label}
              <span className="app-tab-count">{s.count}</span>
            </button>
          ))}
        </div>
        <div style={{ width: isMobile ? '100%' : 272, justifySelf: isMobile ? 'stretch' : 'end' }}>
          <Input
            placeholder="Müşteri veya klasör ara..."
            prefix={<SearchOutlined style={{ color: C.textFaint }} />}
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            allowClear
            style={{ width: '100%', height: 36, borderRadius: 7 }}
          />
        </div>
      </div>

      {/* Sıralama satırı */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 14,
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: 3,
          background: C.bgElevated,
          borderRadius: 8,
          border: `1px solid ${C.borderSubtle}`,
        }}>
          {([
            { k: 'alfabe',       l: 'A → Z' },
            { k: 'aktiflik',     l: 'Son aktivite' },
            { k: 'teklifSayisi', l: 'Çok teklifli' },
          ] as Array<{ k: Siralama; l: string }>).map(({ k, l }) => {
            const aktif = siralama === k;
            return (
              <button
                key={k}
                onClick={() => setSiralama(k)}
                style={{
                  fontSize: 11,
                  fontWeight: aktif ? 600 : 500,
                  color: aktif ? C.textPrimary : C.textSecondary,
                  background: aktif ? C.bgSurface : 'transparent',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  boxShadow: aktif ? '0 1px 2px rgba(15,30,60,0.06)' : 'none',
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, color: C.textFaint, fontVariantNumeric: 'tabular-nums' }}>
            {klasorler.length} müşteri
          </div>
          {/* Grid / Liste toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: 2,
            background: C.bgElevated,
            borderRadius: 7,
            border: `1px solid ${C.borderSubtle}`,
          }}>
            {([
              { k: 'grid' as GorunumModu,  l: 'Izgara', icon: GridIcon },
              { k: 'liste' as GorunumModu, l: 'Liste',  icon: ListIcon },
            ]).map(({ k, l, icon: Icon }) => {
              const aktif = gorunumModu === k;
              return (
                <Tooltip key={k} title={l} mouseEnterDelay={0.3}>
                  <button
                    onClick={() => setGorunumModu(k)}
                    aria-label={l}
                    style={{
                      width: 28,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: aktif ? C.bgSurface : 'transparent',
                      border: 'none',
                      borderRadius: 5,
                      cursor: 'pointer',
                      color: aktif ? C.textPrimary : C.textSecondary,
                      padding: 0,
                      boxShadow: aktif ? '0 1px 2px rgba(15,30,60,0.06)' : 'none',
                    }}
                  >
                    <Icon active={aktif} />
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Klasör Izgarası */}
      {klasorler.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: isMobile ? '48px 16px' : '80px 20px',
          color: C.textFaint,
          fontSize: 14,
          background: C.bgSurface,
          borderRadius: 12,
          border: `1px solid ${C.borderSubtle}`,
        }}>
          {aramaMetni
            ? 'Arama kriterlerine uygun müşteri klasörü bulunamadı.'
            : 'Henüz teklif bulunmuyor. İlk teklifinizi oluşturun.'}
        </div>
      ) : (
        <KlasorIzgarasi
          klasorler={klasorler}
          isMobile={isMobile}
          C={C}
          kullaniciMap={kullaniciMap}
          siralama={siralama}
          gorunumModu={gorunumModu}
          onKlasorTikla={onKlasorTikla}
          onCariGuncelle={onCariGuncelle}
        />
      )}
    </>
  );
}

// ─── Sonuç gir uyarı banner'ı — KALDIRILDI (klasör kartına lamba ikonu olarak taşındı)
// Geriye uyum için stub tutuluyor; kullanılmıyor.

// @ts-expect-error — kullanılmıyor
function SonucBanner({ count, onTopluAc, isMobile }: { count: number; onTopluAc: () => void; isMobile: boolean }) {
  return (
    <div style={{
      background: '#FEF3C7',
      border: '1px solid #F59E0B',
      borderRadius: 10,
      padding: isMobile ? '11px 14px' : '12px 18px',
      marginBottom: 18,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap',
    }}>
      <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>⏰</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: isMobile ? 13 : 14, fontWeight: 700, color: '#78350F',
          letterSpacing: '-0.01em', lineHeight: 1.3,
        }}>
          {count} teklifinin sonucu girilmedi
        </div>
        <div style={{ fontSize: 12, color: '#92400E', marginTop: 2, lineHeight: 1.35 }}>
          14+ gün önce müşteriye gönderdin. <b>Win-rate'in eksik hesaplanıyor.</b>
        </div>
      </div>
      <Button
        type="primary"
        onClick={onTopluAc}
        style={{
          background: '#D97706',
          borderColor: '#B45309',
          fontWeight: 600,
          height: 36,
          padding: '0 16px',
          flexShrink: 0,
        }}
      >
        Topluca Gir →
      </Button>
    </div>
  );
}

// ─── Toplu Sonuç Gir Modalı — KALDIRILDI ────────────────────────────────────
// Geriye uyum için stub tutuluyor; kullanılmıyor.

// @ts-expect-error — kullanılmıyor
function TopluSonucModal({
  open, onClose, teklifler, onSet, onDetayAc,
}: {
  open: boolean;
  onClose: () => void;
  teklifler: Teklif[];
  onSet: (teklif: Teklif, yeniDurum: TeklifDurum) => void;
  onDetayAc: (teklif: Teklif, onSeciliDurum: TeklifDurum) => void;
}) {
  const C = useColors();
  const { isDark } = useTheme();
  const [tamamlananIds, setTamamlananIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setTamamlananIds(new Set());
  }, [open]);

  function handleSet(teklif: Teklif, yeniDurum: TeklifDurum) {
    if (yeniDurum === 'reddedildi' || yeniDurum === 'iptal') {
      onDetayAc(teklif, yeniDurum);
      setTamamlananIds((prev) => new Set(prev).add(teklif.id));
      return;
    }
    // Onaylandı — direkt yaz
    onSet(teklif, yeniDurum);
    setTamamlananIds((prev) => new Set(prev).add(teklif.id));
  }

  const kalan = teklifler.filter((t) => !tamamlananIds.has(t.id)).length;
  const sonuclar: Array<{ key: TeklifDurum; label: string; sebepIster?: boolean }> = [
    { key: 'onaylandi', label: 'Onaylandı'  },
    { key: 'reddedildi', label: 'Reddedildi', sebepIster: true },
    { key: 'iptal',     label: 'İptal',     sebepIster: true },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div>
          <div>Sonuç bekleyen teklifler — Topluca Gir</div>
          <div style={{ fontSize: 11, fontWeight: 400, color: C.textSecondary, marginTop: 4, letterSpacing: '0.005em' }}>
            {kalan === 0
              ? 'Hepsi tamam! 🎉'
              : `${kalan} teklif sırada — her satıra bir tıkla yeter.`}
          </div>
        </div>
      }
      footer={
        <Button type="primary" onClick={onClose}>
          {kalan === 0 ? 'Kapat' : 'Daha sonra'}
        </Button>
      }
      width={760}
      destroyOnHidden
    >
      <div style={{
        maxHeight: '60vh',
        overflowY: 'auto',
        marginRight: -8,
        paddingRight: 8,
      }}>
        {teklifler.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.textFaint, fontSize: 13 }}>
            Sonuç bekleyen teklifin yok. 👏
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teklifler.map((t) => {
              const done = tamamlananIds.has(t.id);
              const ts = new Date(t.guncellemeTarihi || t.olusturmaTarihi || t.tarih).getTime();
              const gunFark = Number.isFinite(ts) ? Math.floor((Date.now() - ts) / (24 * 3600 * 1000)) : 0;
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 12,
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: done ? (isDark ? 'rgba(34,197,94,0.06)' : '#F0FDF4') : (isDark ? 'rgba(255,255,255,0.025)' : '#FAFAF7'),
                    border: `1px solid ${done ? '#86EFAC' : C.borderSubtle}`,
                    borderRadius: 8,
                    opacity: done ? 0.65 : 1,
                    transition: 'opacity 0.18s, background 0.18s, border-color 0.18s',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: C.textPrimary,
                      letterSpacing: '0.005em', lineHeight: 1.3,
                      display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap',
                    }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{t.teklifNo}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 500, color: C.textSecondary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 320,
                      }}>
                        {formatCariAdi(t.cari?.firmaAdi || '')}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, color: C.textFaint, marginTop: 3,
                      display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline',
                    }}>
                      <span style={{ fontWeight: 500, color: gunFark >= 14 ? '#B45309' : C.textFaint }}>
                        {gunFark} gün önce
                      </span>
                      <span>·</span>
                      <span>{t.paraBirimi === 'TRY' ? '₺' : t.paraBirimi === 'EUR' ? '€' : '$'}{t.genelToplam.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                      <span>·</span>
                      <span>{t.durum === 'gonderildi' ? 'Gönderildi' : t.durum === 'onaylandi' ? 'Onaylandı' : t.durum === 'hazir' ? 'Hazır' : t.durum}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {done ? (
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: '#15803d',
                        padding: '6px 12px', borderRadius: 6,
                        background: '#DCFCE7', border: '1px solid #86EFAC',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        ✓ Tamam
                      </span>
                    ) : (
                      sonuclar.map((s) => {
                        // "Hazır" stili — solid lacivert bg, beyaz text, simge yok
                        return (
                          <Tooltip
                            key={s.key}
                            title={s.sebepIster ? `${s.label} → sebep gir` : s.label}
                            mouseEnterDelay={0.3}
                          >
                            <button
                              onClick={() => handleSet(t, s.key)}
                              style={{
                                display: 'inline-block',
                                background: '#1e3a8a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 5,
                                padding: '7px 14px',
                                fontSize: 12.5,
                                fontWeight: 600,
                                letterSpacing: '0.005em',
                                lineHeight: 1.2,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'background 0.12s',
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e40af'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e3a8a'; }}
                            >
                              {s.label}
                            </button>
                          </Tooltip>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── KPI satırı — KALDIRILDI ─────────────────────────────────────────────────
// Geriye uyum için stub tutuluyor; kullanılmıyor.

interface KpiSatiriProps {
  isMobile: boolean;
  C: ReturnType<typeof useColors>;
  kpilar: { buHafta: number; taslak: number; onayBekleyen: number; sonucBekleyen: number; benimToplam: number };
  toplamMusteri: number;
  onSonucKartiTikla?: () => void;
}

// @ts-expect-error — kullanılmıyor
function KpiSatiri({ isMobile, C, kpilar, toplamMusteri, onSonucKartiTikla }: KpiSatiriProps) {
  const { isDark } = useTheme();
  const sonucDikkat = kpilar.sonucBekleyen > 0;
  type KpiKartItem = { label: string; value: number; sub: string; tone?: string; vurgu?: boolean; onClick?: () => void };
  const cards: KpiKartItem[] = [
    { label: 'Bu hafta yazdığım', value: kpilar.buHafta,        sub: 'teklif',         tone: '#16a34a' },
    { label: 'Taslaklarım',       value: kpilar.taslak,          sub: 'açık taslak',    tone: '#d97706' },
    { label: 'Onay bekleyen',     value: kpilar.onayBekleyen,    sub: 'müşteri yanıtı', tone: '#0ea5e9' },
    { label: 'Sonuç giril.',      value: kpilar.sonucBekleyen,   sub: sonucDikkat ? 'tıkla → topluca gir' : '14+ gün geçti',
      tone: '#dc2626', vurgu: sonucDikkat, onClick: onSonucKartiTikla },
  ];
  void toplamMusteri;

  const cardBg = isDark ? '#161922' : '#F4F3EF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? 8 : 12,
      marginBottom: 22,
    }}>
      {cards.map((c) => (
        <div
          key={c.label}
          onClick={c.onClick}
          role={c.onClick ? 'button' : undefined}
          tabIndex={c.onClick ? 0 : undefined}
          style={{
            background: c.vurgu ? (isDark ? 'rgba(220,38,38,0.06)' : '#FDF2F0') : cardBg,
            border: `1px solid ${c.vurgu ? (isDark ? 'rgba(220,38,38,0.30)' : '#F4BFB4') : cardBorder}`,
            borderRadius: 10,
            padding: isMobile ? '12px 14px' : '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            position: 'relative',
            cursor: c.onClick ? 'pointer' : 'default',
            transition: 'border-color 0.12s, box-shadow 0.12s',
          }}
          onMouseEnter={(e) => {
            if (c.onClick) {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = isDark ? 'rgba(220,38,38,0.50)' : '#E89884';
              el.style.boxShadow = '0 2px 8px rgba(220,38,38,0.10)';
            }
          }}
          onMouseLeave={(e) => {
            if (c.onClick) {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = c.vurgu ? (isDark ? 'rgba(220,38,38,0.30)' : '#F4BFB4') : cardBorder;
              el.style.boxShadow = 'none';
            }
          }}
        >
          {/* Sol kenar accent rail (3px, mute) */}
          <span style={{
            position: 'absolute',
            top: 12, bottom: 12, left: 0,
            width: 3,
            background: c.tone,
            borderRadius: 2,
            opacity: c.vurgu ? 0.85 : 0.5,
          }} />
          <div style={{
            fontSize: 10.5,
            color: C.textFaint,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            lineHeight: 1,
            paddingLeft: 8,
          }}>
            {c.label}
          </div>
          <div style={{
            fontSize: isMobile ? 22 : 26,
            color: C.textPrimary,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            fontVariantNumeric: 'tabular-nums',
            paddingLeft: 8,
            marginTop: 2,
          }}>
            {c.value}
          </div>
          <div style={{
            fontSize: 11,
            color: C.textSecondary,
            lineHeight: 1.2,
            paddingLeft: 8,
          }}>
            {c.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Yönetici Özeti (admin/super_admin/firma_admin) ─────────────────────────

interface YoneticiOzetiProps {
  isMobile: boolean;
  C: ReturnType<typeof useColors>;
  data: YoneticiOzetiData;
  /** 'serit' = tek satır kompakt (Tekliflerim sayfası); 'panel' = tam görünüm (Analiz sayfası) */
  mode?: 'serit' | 'panel';
  /** 'serit' modunda tıklamada çağrılır (varsayılan: yok). */
  onDetay?: () => void;
}

export function YoneticiOzeti({ isMobile, C, data, mode = 'serit', onDetay }: YoneticiOzetiProps) {
  const { isDark } = useTheme();
  const cardBg = isDark ? '#161922' : '#F4F3EF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8';
  const sectionBg = isDark ? '#161922' : '#F4F3EF';

  const formatTRY = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
  const formatKisa = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
    return formatTRY(n);
  };

  const funnelSteps: Array<{ key: TeklifDurum; label: string; color: string }> = [
    { key: 'taslak',     label: 'Taslak',      color: '#94a3b8' },
    { key: 'hazir',      label: 'Hazır',       color: '#3b82f6' },
    { key: 'gonderildi', label: 'Gönderildi',  color: '#f59e0b' },
    { key: 'onaylandi',  label: 'Onaylandı',   color: '#16a34a' },
  ];
  const kazanildi = data.sonucSayim.kazanildi;

  // ── ŞERİT MODU ─────────────────────────────────────────────────────────────
  if (mode === 'serit') {
    const pipelineSeg = (['TRY', 'EUR', 'USD'] as const)
      .filter((pb) => (data.acikPipeline[pb] || 0) > 0)
      .map((pb) => {
        const sym = pb === 'TRY' ? '₺' : pb === 'EUR' ? '€' : '$';
        return `${sym}${formatKisa(data.acikPipeline[pb])}`;
      })
      .join(' · ');

    const funnelMini = funnelSteps.map((s) => data.funnel[s.key]).join('›');

    return (
      <button
        onClick={() => onDetay?.()}
        style={{
          width: '100%',
          background: sectionBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 10,
          padding: isMobile ? '10px 14px' : '11px 16px',
          marginBottom: 22,
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 10 : 14,
          cursor: 'pointer',
          textAlign: 'left',
          color: 'inherit',
          transition: 'border-color 0.14s, box-shadow 0.14s',
          flexWrap: 'wrap',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#D7D3CC';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = cardBorder;
        }}
      >
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: C.textFaint,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          Yönetici Özeti
        </span>

        <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: C.textFaint, letterSpacing: '0.02em' }}>Win-rate</span>
          <span style={{
            fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
            color: data.winRate === null ? C.textFaint : data.winRate >= 50 ? '#16a34a' : '#dc2626',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {data.winRate === null ? '—' : `%${data.winRate}`}
          </span>
        </span>

        {pipelineSeg && (
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: C.textFaint, letterSpacing: '0.02em' }}>Pipeline</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
              {pipelineSeg}
            </span>
          </span>
        )}

        {!isMobile && (
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: C.textFaint, letterSpacing: '0.02em' }}>Funnel</span>
            <span style={{ fontSize: 13, color: C.textSecondary, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em', fontWeight: 600 }}>
              {funnelMini}
            </span>
          </span>
        )}

        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
            ✓ {kazanildi}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
            ✕ {data.sonucSayim.kaybedildi}
          </span>
        </span>

        <span style={{ flex: 1 }} />

        <span style={{
          fontSize: 11, color: C.textSecondary, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 3,
          flexShrink: 0,
        }}>
          Detay <span style={{ fontSize: 14 }}>›</span>
        </span>
      </button>
    );
  }

  // ── PANEL MODU (Analiz sayfası) ────────────────────────────────────────────
  return (
    <div style={{
      background: sectionBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 10,
      padding: isMobile ? 14 : 18,
      marginBottom: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>

      {/* Top metrik satırı: Win-rate + Pipeline */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 2fr)',
        gap: 14,
      }}>
        {/* Win-rate */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: C.textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
            Win-rate
          </div>
          <div style={{
            fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05,
            color: data.winRate === null ? C.textFaint : data.winRate >= 50 ? '#16a34a' : '#dc2626',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {data.winRate === null ? '—' : `%${data.winRate}`}
          </div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
            {kazanildi} kazanıldı / {data.kararliToplam} kararlı
          </div>
        </div>

        {/* Açık pipeline */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: C.textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
            Açık pipeline (sonuç bekleyen)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 12 : 24, alignItems: 'baseline' }}>
            {(['TRY', 'EUR', 'USD'] as const).map((pb) => {
              const v = data.acikPipeline[pb] || 0;
              if (v === 0) return null;
              const sym = pb === 'TRY' ? '₺' : pb === 'EUR' ? '€' : '$';
              return (
                <div key={pb}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {sym}{formatTRY(v)}
                  </span>
                  <span style={{ fontSize: 11, color: C.textFaint, marginLeft: 4 }}>{pb}</span>
                </div>
              );
            })}
            {(['TRY','EUR','USD'] as const).every((pb) => (data.acikPipeline[pb] || 0) === 0) && (
              <span style={{ fontSize: 14, color: C.textFaint }}>—</span>
            )}
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 500, color: C.textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
          Funnel
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, flexWrap: 'wrap' }}>
          {funnelSteps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderLeft: `3px solid ${s.color}`,
                borderRadius: 6,
                padding: '8px 12px',
                minWidth: 88,
                flex: 1,
              }}>
                <div style={{ fontSize: 10, color: C.textFaint, fontWeight: 500, letterSpacing: '0.03em' }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {data.funnel[s.key]}
                </div>
              </div>
              {i < funnelSteps.length - 1 && !isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', color: C.textFaint, fontSize: 14 }}>›</div>
              )}
            </React.Fragment>
          ))}
          {/* Kazanıldı (kapanan) */}
          <div style={{ display: 'flex', alignItems: 'center', color: C.textFaint, fontSize: 14 }}>{!isMobile && '›'}</div>
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderLeft: '3px solid #16a34a',
            borderRadius: 6,
            padding: '8px 12px',
            minWidth: 88,
            flex: 1,
          }}>
            <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600, letterSpacing: '0.03em' }}>✓ Kazanıldı</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#065f46', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {kazanildi}
            </div>
          </div>
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderLeft: '3px solid #dc2626',
            borderRadius: 6,
            padding: '8px 12px',
            minWidth: 88,
            flex: 1,
          }}>
            <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, letterSpacing: '0.03em' }}>✕ Kaybedildi</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#7f1d1d', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {data.sonucSayim.kaybedildi}
            </div>
          </div>
        </div>
      </div>

      {/* Top kayıp sebebi + Top personel — yan yana */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 14,
      }}>
        {/* Kayıp sebepleri */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: C.textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            En çok kaybedilen sebep
          </div>
          {data.topSebepler.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textFaint }}>Henüz kayıp sebebi girilmemiş.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.topSebepler.map(([sebep, n], i) => (
                <div key={sebep} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 4,
                      background: i === 0 ? '#fee2e2' : i === 1 ? '#fef3c7' : '#f1f5f9',
                      color: i === 0 ? '#b91c1c' : i === 1 ? '#a16207' : '#475569',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
                      {KAYIP_SEBEBI_LABEL[sebep]}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: C.textSecondary, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {n} kayıp
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personel leaderboard */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: C.textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            En çok kazandıran personel
          </div>
          {data.topPersonel.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textFaint }}>Henüz kazandığı teklif girilmemiş.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.topPersonel.map((p, i) => (
                <div key={p.ad} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 4,
                      background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : '#f5f5f4',
                      color: i === 0 ? '#a16207' : '#475569',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{
                      fontSize: 13, color: C.textPrimary, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.ad}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#16a34a', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {p.kazanildi} kazan
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Toggle ikonları ──────────────────────────────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  const c = active ? 'currentColor' : 'currentColor';
  const o = active ? 1 : 0.85;
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill={c} opacity={o} aria-hidden>
      <rect x="0" y="0" width="5" height="5" rx="1" />
      <rect x="7" y="0" width="5" height="5" rx="1" />
      <rect x="0" y="7" width="5" height="5" rx="1" />
      <rect x="7" y="7" width="5" height="5" rx="1" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  const c = active ? 'currentColor' : 'currentColor';
  const o = active ? 1 : 0.85;
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill={c} opacity={o} aria-hidden>
      <rect x="0" y="1"  width="14" height="1.6" rx="0.8" />
      <rect x="0" y="5.2" width="14" height="1.6" rx="0.8" />
      <rect x="0" y="9.4" width="14" height="1.6" rx="0.8" />
    </svg>
  );
}

// ─── Klasör Izgarası — sıralamaya göre düz veya harf-bloklu ──────────────────

interface KlasorIzgarasiProps {
  klasorler: CustomerFolder[];
  isMobile: boolean;
  C: ReturnType<typeof useColors>;
  kullaniciMap: Map<string, Kullanici>;
  siralama: Siralama;
  gorunumModu: GorunumModu;
  onKlasorTikla: (k: string) => void;
  onCariGuncelle: (c: Cari) => void;
}

function KlasorIzgarasi({
  klasorler, isMobile, C, kullaniciMap, siralama, gorunumModu, onKlasorTikla, onCariGuncelle,
}: KlasorIzgarasiProps) {
  const liste = gorunumModu === 'liste';

  const gridStyle: CSSProperties = liste
    ? {
        display: 'flex',
        flexDirection: 'column',
        background: C.bgSurface,
        borderRadius: 10,
        border: `1px solid ${C.borderSubtle}`,
        overflow: 'hidden',
      }
    : {
        display: 'grid',
        gridTemplateColumns: isMobile
          ? 'repeat(auto-fill, minmax(220px, 1fr))'
          : 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: isMobile ? 14 : 18,
      };

  const itemEl = (klasor: CustomerFolder, idx: number, total: number) =>
    liste ? (
      <KlasorSatiri
        key={klasor.klasorAdi}
        klasor={klasor}
        isMobile={isMobile}
        C={C}
        kullaniciMap={kullaniciMap}
        sonSatir={idx === total - 1}
        onClick={() => onKlasorTikla(klasor.klasorAdi)}
        onCariGuncelle={onCariGuncelle}
      />
    ) : (
      <KlasorKarti
        key={klasor.klasorAdi}
        klasor={klasor}
        isMobile={isMobile}
        C={C}
        kullaniciMap={kullaniciMap}
        onClick={() => onKlasorTikla(klasor.klasorAdi)}
        onCariGuncelle={onCariGuncelle}
      />
    );

  if (siralama !== 'alfabe') {
    return <div style={gridStyle}>{klasorler.map((k, i) => itemEl(k, i, klasorler.length))}</div>;
  }

  // A-Z modu: harfle grupla, her grubun başına büyük section header bas
  const harfGruplari = new Map<string, CustomerFolder[]>();
  for (const f of klasorler) {
    const harf = (f.klasorAdi[0] || '#').toLocaleUpperCase('tr-TR');
    const k = /[A-ZÇĞİÖŞÜ]/.test(harf) ? harf : '#';
    if (!harfGruplari.has(k)) harfGruplari.set(k, []);
    harfGruplari.get(k)!.push(f);
  }
  const harfler = Array.from(harfGruplari.keys()).sort((a, b) => a.localeCompare(b, 'tr'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: liste ? 18 : 22 }}>
      {harfler.map((harf) => {
        const grup = harfGruplari.get(harf)!;
        return (
          <div key={harf}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginBottom: liste ? 6 : 10,
              paddingBottom: 6,
              borderBottom: `1px solid ${C.borderSubtle}`,
            }}>
              <div style={{
                fontSize: liste ? 14 : 18,
                fontWeight: 700,
                color: C.textPrimary,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {harf}
              </div>
              <div style={{ fontSize: 11, color: C.textFaint, fontVariantNumeric: 'tabular-nums' }}>
                {grup.length}
              </div>
            </div>
            <div style={gridStyle}>
              {grup.map((k, i) => itemEl(k, i, grup.length))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Klasör Satırı (liste modu) ──────────────────────────────────────────────

interface KlasorSatiriProps {
  klasor: CustomerFolder;
  isMobile: boolean;
  C: ReturnType<typeof useColors>;
  kullaniciMap: Map<string, Kullanici>;
  sonSatir: boolean;
  onClick: () => void;
  onCariGuncelle: (c: Cari) => void;
}

function KlasorSatiri({ klasor, isMobile, C, kullaniciMap, sonSatir, onClick, onCariGuncelle }: KlasorSatiriProps) {
  const { isDark } = useTheme();
  const { message } = App.useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(klasor.logoUrl);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => { setLogoUrl(klasor.logoUrl); }, [klasor.logoUrl]);

  const wordmark = useMemo(() => wordmarkUret(klasor.firmaAdiDisplay), [klasor.firmaAdiDisplay]);
  const tile = useMemo(() => logoTileRengi(klasor.cariId || klasor.klasorAdi, isDark), [klasor.cariId, klasor.klasorAdi, isDark]);
  // aktiviteRengi artık görsel olarak kullanılmıyor (renkli dot kaldırıldı, lamba yerine)
  // useMemo silindi.


  const subtitle = useMemo(() => {
    const ham = klasor.firmaAdiDisplay.split(/\s+/).filter(Boolean);
    const ikinciKelime = ham[1] && !STOP_WORDS.has(ham[1].toLocaleUpperCase('tr-TR')) ? ham[1] : '';
    return ikinciKelime ? ikinciKelime : '—';
  }, [klasor.firmaAdiDisplay]);

  async function dosyaSec(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!klasor.cariId) {
      message.warning('Bu klasör için cari kaydı bulunamadı.');
      return;
    }
    setYukleniyor(true);
    try {
      const base64 = await dosyaToCariLogoBase64(f);
      const sonuc = await api.cariler.uploadLogo(klasor.cariId, base64);
      setLogoUrl(sonuc.logoUrl);
      onCariGuncelle(sonuc.cari);
      message.success('Logo yüklendi.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Logo yüklenemedi.';
      message.error(msg);
    } finally {
      setYukleniyor(false);
    }
  }

  const hazirlayanlar = klasor.topHazirlayanIds
    .map((id) => kullaniciMap.get(id))
    .filter((k): k is Kullanici => Boolean(k));

  const isim = formatCariAdi(klasor.firmaAdiDisplay)
    .replace(/\s+(SAN\.|TİC\.|LTD\.|A\.Ş\.|ŞTİ\.|İNŞ\.).*$/i, '')
    .trim() || klasor.firmaAdiDisplay;

  // Kolon: [logo 32] [isim/sektör flex] [teklif 95] [tarih 90] [avatars 78]
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '36px minmax(0, 1fr) auto'
          : '36px minmax(0, 1fr) 110px 100px 86px',
        alignItems: 'center',
        gap: isMobile ? 10 : 14,
        padding: isMobile ? '8px 12px' : '8px 14px',
        background: hover ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,30,60,0.025)') : 'transparent',
        borderBottom: sonSatir ? 'none' : `1px solid ${C.borderSubtle}`,
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        transition: 'background 0.12s ease',
      }}
    >
      {/* Logo tile */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        background: logoUrl ? (isDark ? '#0f1219' : '#FBFAF7') : tile.bg,
        border: logoUrl ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E5E1D9'}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
      }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={isim}
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }}
            onError={() => setLogoUrl(undefined)}
          />
        ) : (
          <span style={{
            fontSize: wordmarkFontSize(wordmark, 32),
            fontWeight: 700,
            color: tile.text,
            letterSpacing: wordmark.length > 5 ? '-0.04em' : '-0.02em',
            fontFamily: '-apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
            lineHeight: 1,
            padding: '0 2px',
            whiteSpace: 'nowrap',
          }}>
            {wordmark}
          </span>
        )}
        {/* Hover'da logo upload — küçük overlay */}
        {klasor.cariId && hover && (
          <Tooltip title={logoUrl ? 'Logoyu değiştir' : 'Logo yükle'} mouseEnterDelay={0.4}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={yukleniyor}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(15,23,42,0.55)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: yukleniyor ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <CameraOutlined style={{ fontSize: 12 }} />
            </button>
          </Tooltip>
        )}
      </div>

      {/* İsim + sektör */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.textPrimary,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {isim}
        </div>
        <div style={{
          fontSize: 11,
          color: C.textFaint,
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {subtitle}
        </div>
      </div>

      {/* Teklif sayısı + pulse dot (3+ gün yanıt bekleyen varsa) */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontVariantNumeric: 'tabular-nums' }}>
          {klasor.ucGunDurumsuzSayi > 0 && (
            <Tooltip title={`${klasor.ucGunDurumsuzSayi} teklif yanıt bekliyor`} mouseEnterDelay={0.3}>
              <span className="pending-pulse-dot" aria-label="Yanıt bekliyor" />
            </Tooltip>
          )}
          <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>
            {klasor.teklifler.length} teklif
          </span>
        </div>
      )}

      {/* Tarih (mobile gizli) */}
      {!isMobile && (
        <div style={{ fontSize: 11, color: C.textFaint, fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(klasor.sonTarih)}
        </div>
      )}

      {/* Avatarlar */}
      <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start' }}>
        {hazirlayanlar.length > 0 && hazirlayanlar.slice().reverse().map((k, i) => (
          <Tooltip key={k.id} title={k.adSoyad} mouseEnterDelay={0.3}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              border: `2px solid ${C.bgSurface}`,
              marginLeft: i === 0 ? 0 : -7,
              background: k.profilFotoUrl ? '#0b1220' : (isDark ? '#1f2937' : '#e2e8f0'),
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 600,
              color: isDark ? '#cbd5e1' : '#475569',
              flexShrink: 0,
            }}>
              {k.profilFotoUrl ? (
                <img
                  src={k.profilFotoUrl}
                  alt={k.adSoyad}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (k.initials || k.adSoyad?.slice(0, 2) || '?').toLocaleUpperCase('tr-TR')
              )}
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Mobile için tek satır küçük meta */}
      {isMobile && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', fontVariantNumeric: 'tabular-nums', paddingLeft: 46 }}>
          <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 500 }}>
            {klasor.teklifler.length} teklif
          </span>
          <span style={{ fontSize: 11, color: C.textFaint }}>
            · {formatDate(klasor.sonTarih)}
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: 'none' }}
        onClick={(e) => e.stopPropagation()}
        onChange={dosyaSec}
      />
    </div>
  );
}

// ─── Klasör İkonu (detay görünümü başlığı için minimal) ──────────────────────

function FolderIcon({ size = 42 }: { size?: number }) {
  const h = Math.round(size * 0.875);
  return (
    <svg width={size} height={h} viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fib" x1="32" y1="8" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#27405F" />
          <stop offset="1" stopColor="#152332" />
        </linearGradient>
        <linearGradient id="fif" x1="32" y1="14" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#304E72" />
          <stop offset="1" stopColor="#1D3250" />
        </linearGradient>
      </defs>
      <rect x="2" y="12" width="62" height="44" rx="5.5" fill="rgba(10,20,42,0.18)" />
      <rect x="0" y="8" width="62" height="46" rx="5" fill="url(#fib)" />
      <path d="M0 8 L0 4.5 Q0 2.5 2.5 2.5 L22 2.5 Q24.5 2.5 26 5 L30 8 Z" fill="#152332" />
      <rect x="0" y="13" width="62" height="41" rx="4.5" fill="url(#fif)" />
      <rect x="1" y="13" width="60" height="2" rx="1" fill="rgba(255,255,255,0.16)" />
      <rect x="10" y="26" width="42" height="2.5" rx="1.25" fill="rgba(255,255,255,0.15)" />
      <rect x="10" y="33" width="34" height="2"   rx="1"    fill="rgba(255,255,255,0.10)" />
      <rect x="10" y="39" width="24" height="2"   rx="1"    fill="rgba(255,255,255,0.06)" />
    </svg>
  );
}

// ─── Klasör Kart Bileşeni ─────────────────────────────────────────────────────

interface KlasorKartiProps {
  klasor: CustomerFolder;
  isMobile: boolean;
  C: ReturnType<typeof useColors>;
  kullaniciMap: Map<string, Kullanici>;
  onClick: () => void;
  onCariGuncelle: (c: Cari) => void;
}

function KlasorKarti({ klasor, isMobile, C, kullaniciMap, onClick, onCariGuncelle }: KlasorKartiProps) {
  const { isDark } = useTheme();
  const { message } = App.useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(klasor.logoUrl);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => { setLogoUrl(klasor.logoUrl); }, [klasor.logoUrl]);

  const wordmark = useMemo(() => wordmarkUret(klasor.firmaAdiDisplay), [klasor.firmaAdiDisplay]);
  const tile = useMemo(() => logoTileRengi(klasor.cariId || klasor.klasorAdi, isDark), [klasor.cariId, klasor.klasorAdi, isDark]);
  // aktiviteRengi artık görsel olarak kullanılmıyor (renkli dot kaldırıldı, lamba yerine)
  // useMemo silindi.


  // Sektör + lokasyon: "Otomasyon · İstanbul" tarzı meta satırı için.
  // db.cariler[].adres alanı il bilgisini taşıyabiliyor; sektör için firma adının
  // ikinci kelimesini (varsa) kullanıyoruz — gerçek sektör alanı şu an yok.
  const subtitle = useMemo(() => {
    const ham = klasor.firmaAdiDisplay.split(/\s+/).filter(Boolean);
    const ikinciKelime = ham[1] && !STOP_WORDS.has(ham[1].toLocaleUpperCase('tr-TR')) ? ham[1] : '';
    return ikinciKelime ? ikinciKelime : klasor.firmaAdiDisplay;
  }, [klasor.firmaAdiDisplay]);

  async function dosyaSec(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!klasor.cariId) {
      message.warning('Bu klasör için cari kaydı bulunamadı.');
      return;
    }
    setYukleniyor(true);
    try {
      const base64 = await dosyaToCariLogoBase64(f);
      const sonuc = await api.cariler.uploadLogo(klasor.cariId, base64);
      setLogoUrl(sonuc.logoUrl);
      onCariGuncelle(sonuc.cari);
      message.success('Logo yüklendi.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Logo yüklenemedi.';
      message.error(msg);
    } finally {
      setYukleniyor(false);
    }
  }

  const hazirlayanlar = klasor.topHazirlayanIds
    .map((id) => kullaniciMap.get(id))
    .filter((k): k is Kullanici => Boolean(k));

  // Premium B2B: kart yüzeyi sayfa zemininden 1 ton koyu (paper, not blast white)
  const cardBg = isDark ? '#161922' : '#F4F3EF';
  const cardBgHover = isDark ? '#1a1e29' : '#EFEDE8';
  const logoBgPlain = isDark ? '#0f1219' : '#FBFAF7';

  const cardStyle: CSSProperties = {
    background: hover ? cardBgHover : cardBg,
    border: `1px solid ${hover ? (isDark ? 'rgba(255,255,255,0.10)' : '#D7D3CC') : (isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8')}`,
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
    userSelect: 'none',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: hover
      ? (isDark ? '0 4px 14px rgba(0,0,0,0.32)' : '0 2px 8px rgba(40,30,15,0.06)')
      : 'none',
  };

  const logoSize = isMobile ? 44 : 52;
  const logoBoxStyle: CSSProperties = {
    width: logoSize,
    height: logoSize,
    minWidth: logoSize,
    borderRadius: 8,
    background: logoUrl ? logoBgPlain : tile.bg,
    border: logoUrl
      ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E5E1D9'}`
      : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Üst blok: logo + isim/altyazı */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: isMobile ? '12px 12px 10px' : '14px 14px 12px',
      }}>
        <div style={logoBoxStyle}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={klasor.firmaAdiDisplay}
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
              onError={() => setLogoUrl(undefined)}
            />
          ) : (
            <span style={{
              fontSize: wordmarkFontSize(wordmark, logoSize),
              fontWeight: 700,
              color: tile.text,
              letterSpacing: wordmark.length > 5 ? '-0.04em' : '-0.02em',
              fontFamily: '-apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
              lineHeight: 1,
              padding: '0 4px',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}>
              {wordmark}
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            color: C.textPrimary,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {formatCariAdi(klasor.firmaAdiDisplay)
              .replace(/\s+(SAN\.|TİC\.|LTD\.|A\.Ş\.|ŞTİ\.|İNŞ\.).*$/i, '')
              .trim() || klasor.firmaAdiDisplay}
          </div>
          <div style={{
            fontSize: 11,
            color: C.textSecondary,
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* Ayraç */}
      <div style={{ height: 1, background: C.borderSubtle, margin: '0 14px' }} />

      {/* Alt meta */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: isMobile ? '8px 12px 12px' : '10px 14px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {klasor.ucGunDurumsuzSayi > 0 && (
            <Tooltip title={`${klasor.ucGunDurumsuzSayi} teklif yanıt bekliyor`} mouseEnterDelay={0.3}>
              <span className="pending-pulse-dot" aria-label="Yanıt bekliyor" />
            </Tooltip>
          )}
          <span style={{
            fontSize: 11,
            color: C.textSecondary,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.01em',
          }}>
            {klasor.teklifler.length} teklif
          </span>
          <span style={{
            fontSize: 11,
            color: C.textFaint,
            fontVariantNumeric: 'tabular-nums',
          }}>
            · {formatDate(klasor.sonTarih)}
          </span>
        </div>

        {/* Personel avatar yığını */}
        {hazirlayanlar.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'row-reverse', flexShrink: 0 }}>
            {hazirlayanlar.slice().reverse().map((k, i) => (
              <Tooltip key={k.id} title={k.adSoyad} mouseEnterDelay={0.3}>
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: `2px solid ${C.bgSurface}`,
                  marginLeft: i === 0 ? 0 : -7,
                  background: k.profilFotoUrl ? '#0b1220' : (isDark ? '#1f2937' : '#e2e8f0'),
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 600,
                  color: isDark ? '#cbd5e1' : '#475569',
                }}>
                  {k.profilFotoUrl ? (
                    <img
                      src={k.profilFotoUrl}
                      alt={k.adSoyad}
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    (k.initials || k.adSoyad?.slice(0, 2) || '?').toLocaleUpperCase('tr-TR')
                  )}
                </div>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* Logo yükleme butonu — hover'da logo bloğu üzerinde belirir */}
      {klasor.cariId && (
        <Tooltip title={logoUrl ? 'Logoyu değiştir' : 'Logo yükle'} mouseEnterDelay={0.4}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={yukleniyor}
            style={{
              position: 'absolute',
              top: isMobile ? 10 : 12,
              left: isMobile ? 10 : 12,
              width: logoSize,
              height: logoSize,
              borderRadius: 8,
              border: 'none',
              background: 'rgba(15,23,42,0.62)',
              color: '#fff',
              cursor: yukleniyor ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: hover ? 1 : 0,
              transition: 'opacity 0.15s ease',
              padding: 0,
            }}
          >
            <CameraOutlined style={{ fontSize: 14 }} />
          </button>
        </Tooltip>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: 'none' }}
        onClick={(e) => e.stopPropagation()}
        onChange={dosyaSec}
      />
    </div>
  );
}

// ─── Klasör Detay Görünümü ────────────────────────────────────────────────────

const ROW_GRID = 'minmax(220px, 1.2fr) 110px 160px 110px 200px 110px';
const TABLE_MIN_WIDTH = 920;

interface DetayGorunumuProps {
  isMobile: boolean;
  C: ReturnType<typeof useColors>;
  klasorAdi: string;
  firmaAdiDisplay: string;
  teklifler: Teklif[];
  aramaMetni: string;
  setAramaMetni: (v: string) => void;
  aktifFiltre: Filtre;
  setAktifFiltre: (f: Filtre) => void;
  sekmeler: Array<{ key: Filtre; label: string; count: number }>;
  benimId: string | undefined;
  navigate: (path: string) => void;
  onGeri: () => void;
  onSil: (id: string) => void;
  onKopyala: (id: string) => void;
}

function DetayGorunumu({
  isMobile, C, klasorAdi, firmaAdiDisplay, teklifler, aramaMetni, setAramaMetni,
  aktifFiltre, setAktifFiltre, sekmeler, benimId, navigate, onGeri, onSil, onKopyala,
}: DetayGorunumuProps) {
  const { isDark } = useTheme();
  const { aktifKullanici } = useKullanici();
  const { message } = App.useApp();
  const [sonucModalTeklif, setSonucModalTeklif] = useState<Teklif | null>(null);

  // Tek noktadan durum güncelle — hem hızlı (modal-suz) hem modal save kullanır
  const sonucYaz = useCallback((teklif: Teklif, patch: Partial<Teklif>) => {
    const guncel: Teklif = {
      ...teklif,
      ...patch,
      sonucGirenKullaniciId: aktifKullanici?.id,
      guncellemeTarihi: new Date().toISOString(),
    };
    teklifService.teklifKaydet(guncel);
    message.success('Durum güncellendi.');
  }, [aktifKullanici?.id, message]);

  function modalSave(patch: Partial<Teklif>) {
    if (!sonucModalTeklif) return;
    sonucYaz(sonucModalTeklif, patch);
    setSonucModalTeklif(null);
  }

  function hizliSonuc(teklif: Teklif, yeniDurum: TeklifDurum) {
    // Reddedildi VE İptal sebep ister — modalı aç, ön-seçim olarak gelsin
    if (yeniDurum === 'reddedildi' || yeniDurum === 'iptal') {
      setSonucModalTeklif({ ...teklif, durum: yeniDurum });
      return;
    }
    // Onaylandı — direkt yaz, detay yok
    sonucYaz(teklif, {
      durum: yeniDurum,
      sonucTarihi: new Date().toISOString(),
      kayipSebebi: undefined,
      rakipFirma: undefined,
    });
  }

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={onGeri}
          style={{ color: C.textSecondary, padding: '0 6px', height: 28 }}
        >
          Arşiv
        </Button>
        <span style={{ color: C.textFaint, fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, letterSpacing: '0.01em' }}>
          {klasorAdi}
        </span>
      </div>

      {/* Başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <FolderIcon size={42} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {klasorAdi}
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 3 }}>
              {firmaAdiDisplay} · {teklifler.length} teklif
            </div>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className={buttonClassNames.primary}
          onClick={() => navigate('/teklif/yeni')}
        >
          Yeni Teklif
        </Button>
      </div>

      {/* Filtreler + Arama */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 272px',
        alignItems: 'center',
        columnGap: 16,
        rowGap: 10,
        marginBottom: 20,
      }}>
        <div style={{
          display: 'flex',
          width: 'fit-content',
          maxWidth: '100%',
          gap: 3,
          alignItems: 'center',
          background: C.bgElevated,
          borderRadius: 9,
          padding: '3px',
          overflowX: isMobile ? 'auto' : 'visible',
        }}>
          {sekmeler.map((s) => (
            <button key={s.key} onClick={() => setAktifFiltre(s.key)} className={tabButtonClassName(aktifFiltre === s.key)}>
              {s.label}
              <span className="app-tab-count">{s.count}</span>
            </button>
          ))}
        </div>
        <div style={{ width: isMobile ? '100%' : 272, justifySelf: isMobile ? 'stretch' : 'end' }}>
          <Input
            placeholder="Teklif no veya personel ara..."
            prefix={<SearchOutlined style={{ color: C.textFaint }} />}
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            allowClear
            style={{ width: '100%', height: 36, borderRadius: 7 }}
          />
        </div>
      </div>

      {/* Teklif listesi */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <div style={{ minWidth: TABLE_MIN_WIDTH }}>
          {/* Sütun başlıkları */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, border: '1px solid transparent', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ width: 3, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: ROW_GRID, alignItems: 'center', padding: '3px 14px 5px 16px', gap: 0 }}>
              <HeaderCell style={{ paddingRight: 12 }}>Müşteri / Teklif No</HeaderCell>
              <HeaderCell style={{ paddingRight: 8 }}>Tarih</HeaderCell>
              <HeaderCell style={{ paddingRight: 12 }}>Hazırlayan</HeaderCell>
              <HeaderCell style={{ textAlign: 'right', paddingRight: 16 }}>Toplam</HeaderCell>
              <HeaderCell style={{ textAlign: 'center' }}>Durum</HeaderCell>
              <div />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {teklifler.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: isMobile ? '48px 16px' : '64px 20px',
                color: C.textFaint,
                fontSize: 14,
                background: C.bgSurface,
                borderRadius: 10,
                border: `1px solid ${C.borderSubtle}`,
              }}>
                Bu klasörde gösterilecek teklif bulunamadı.
              </div>
            ) : (
              teklifler.map((teklif) => (
                <TeklifKarti
                  key={teklif.id}
                  teklif={teklif}
                  benim={teklif.hazirlayanKullaniciId === benimId}
                  isDark={isDark}
                  C={C}
                  navigate={navigate}
                  onSil={onSil}
                  onKopyala={onKopyala}
                  onSonucAc={() => setSonucModalTeklif(teklif)}
                  onSonucHizli={(sonuc) => hizliSonuc(teklif, sonuc)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <SonucModal
        open={sonucModalTeklif !== null}
        teklif={sonucModalTeklif}
        onClose={() => setSonucModalTeklif(null)}
        onSave={modalSave}
      />
    </>
  );
}

/**
 * Sonuç chip — yeni durum modelinde direkt kullanılmıyor (DurumSonucCell
 * kendi render'ını yapıyor). Geriye uyum için API tutuluyor.
 * eslint-disable-next-line @typescript-eslint/no-unused-vars
 */
// @ts-expect-error — geriye uyum tutulan ama doğrudan kullanılmayan fonksiyon
function SonucChip({ teklif, onClick }: { teklif: Teklif; onClick: () => void }) {
  const sonuc = teklif.sonuc;
  if (!sonuc || !SONUC_CFG[sonuc]) return null;
  const cfg = SONUC_CFG[sonuc];
  const notVar = Boolean(teklif.sonucNotu && teklif.sonucNotu.trim().length > 0);

  const durumLabel: Record<string, string> = {
    taslak: 'Taslak', hazir: 'Hazır', gonderildi: 'Gönderildi',
    onaylandi: 'Onaylandı', iptal: 'İptal',
  };
  // Çok satırlı tooltip içeriği — durum bilgisi de burada
  const tooltipContent = (
    <div style={{ maxWidth: 280, lineHeight: 1.45, fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {cfg.emoji} {cfg.label}
      </div>
      <div style={{ opacity: 0.85, fontSize: 11 }}>
        <span style={{ opacity: 0.7 }}>Aşama: </span>{durumLabel[teklif.durum] || teklif.durum}
      </div>
      {sonuc === 'kaybedildi' && teklif.kayipSebebi && (
        <div style={{ opacity: 0.9 }}>
          <span style={{ opacity: 0.7 }}>Sebep: </span>{KAYIP_SEBEBI_LABEL[teklif.kayipSebebi]}
        </div>
      )}
      {sonuc === 'kaybedildi' && teklif.rakipFirma && (
        <div style={{ opacity: 0.9 }}>
          <span style={{ opacity: 0.7 }}>Rakip: </span>{teklif.rakipFirma}
        </div>
      )}
      {notVar && (
        <div style={{
          marginTop: 6, paddingTop: 6,
          borderTop: '1px solid rgba(255,255,255,0.18)',
          fontSize: 11.5, fontStyle: 'italic', whiteSpace: 'pre-wrap',
        }}>
          📝 {teklif.sonucNotu}
        </div>
      )}
      <div style={{ marginTop: 6, fontSize: 10.5, opacity: 0.65 }}>
        Düzenlemek için tıkla
      </div>
    </div>
  );

  // Şeffaf + karakteristik renk — her sonuç kendi tonunun yarı saydam tinted hâli.
  // Notion/Linear modern tag stili: soft bg + colored text + ince yumuşak border.
  const seffafStil: Record<TeklifSonuc, { bg: string; color: string; border: string; bgHover: string }> = {
    kazanildi: {
      bg: 'rgba(16, 185, 129, 0.12)',
      color: '#047857',
      border: '1px solid rgba(16, 185, 129, 0.32)',
      bgHover: 'rgba(16, 185, 129, 0.20)',
    },
    kaybedildi: {
      bg: 'rgba(220, 38, 38, 0.10)',
      color: '#b91c1c',
      border: '1px solid rgba(220, 38, 38, 0.30)',
      bgHover: 'rgba(220, 38, 38, 0.18)',
    },
    iptal: {
      bg: 'rgba(100, 116, 139, 0.12)',
      color: '#475569',
      border: '1px solid rgba(100, 116, 139, 0.32)',
      bgHover: 'rgba(100, 116, 139, 0.20)',
    },
    beklemede: {
      bg: 'rgba(8, 145, 178, 0.10)',
      color: '#0e7490',
      border: '1px solid rgba(8, 145, 178, 0.30)',
      bgHover: 'rgba(8, 145, 178, 0.18)',
    },
  };
  const stil = seffafStil[sonuc];

  return (
    <Tooltip title={tooltipContent} mouseEnterDelay={0.25} placement="top">
      <button
        onClick={onClick}
        style={{
          display: 'inline-block',
          padding: '4px 11px',
          borderRadius: 5,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.005em',
          color: stil.color,
          background: stil.bg,
          border: stil.border,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = stil.bgHover; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = stil.bg; }}
      >
        {cfg.label}
      </button>
    </Tooltip>
  );
}

/**
 * Durum chip — tüm durumlar AYNI EBAT. Tıklanırsa 6-durum dropdown.
 * Gönderildi'de chip'in YANINDA ayrı "Sonuç gir ▾" butonu belirir
 * (3 sonuç: Onaylandı/Reddedildi/İptal).
 */
function DurumSonucCell({
  teklif, durumGosterim, onSonucHizli,
}: {
  teklif: Teklif;
  durumGosterim: { label: string; color: string; bg: string; border: string };
  onSonucAc: () => void;
  onSonucHizli: (sonuc: TeklifDurum) => void;
  C: ReturnType<typeof useColors>;
}) {
  const isGonderildi = teklif.durum === 'gonderildi';

  // Tüm durum chip'leri aynı ebatta (Gönderildi büyütülmez)
  const chipStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.005em',
    color: durumGosterim.color,
    background: durumGosterim.bg,
    border: `1px solid ${durumGosterim.border}`,
    whiteSpace: 'nowrap',
    lineHeight: 1.3,
    cursor: 'pointer',
    transition: 'border-color 0.12s',
  };

  // Chip'in 6-durum dropdown'u — durum değiştirme için
  const tumDurumlarMenu = [
    { key: 'taslak',     label: <DurumMenuLabel durum="taslak"     hint="Üzerinde çalışılıyor" />, onClick: () => onSonucHizli('taslak') },
    { key: 'hazir',      label: <DurumMenuLabel durum="hazir"      hint="PDF üretildi" />,         onClick: () => onSonucHizli('hazir') },
    { key: 'gonderildi', label: <DurumMenuLabel durum="gonderildi" hint="Müşteriye gönderildi" />, onClick: () => onSonucHizli('gonderildi') },
    { type: 'divider' as const },
    { key: 'onaylandi',  label: <DurumMenuLabel durum="onaylandi"  hint="Müşteri onay verdi" />,   onClick: () => onSonucHizli('onaylandi') },
    { key: 'reddedildi', label: <DurumMenuLabel durum="reddedildi" hint="Sebep girilir" />,        onClick: () => onSonucHizli('reddedildi') },
    { key: 'iptal',      label: <DurumMenuLabel durum="iptal"      hint="Sebep girilir" />,        onClick: () => onSonucHizli('iptal') },
  ];

  // Sonuç gir butonu — sadece Gönderildi'de görünür, 3 sonuç dropdown
  const sonucMenu = [
    { key: 'onaylandi',  label: <DurumMenuLabel durum="onaylandi"  hint="Müşteri onay verdi" />, onClick: () => onSonucHizli('onaylandi') },
    { key: 'reddedildi', label: <DurumMenuLabel durum="reddedildi" hint="Sebep girilir" />,      onClick: () => onSonucHizli('reddedildi') },
    { key: 'iptal',      label: <DurumMenuLabel durum="iptal"      hint="Sebep girilir" />,      onClick: () => onSonucHizli('iptal') },
  ];

  // 3+ gündür gönderildi durumda kalan teklif → "Sonuç gir" butonunun yanında
  // belli belirsiz yanıp sönen amber dot (kullanıcının "müsait bir yer" tarifi)
  const olusTs = new Date(teklif.olusturmaTarihi || teklif.tarih).getTime();
  const gunFark = Number.isFinite(olusTs) ? Math.floor((Date.now() - olusTs) / (24 * 3600 * 1000)) : 0;
  const yanitBekleniyor = isGonderildi && gunFark >= 3;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Dropdown menu={{ items: tumDurumlarMenu }} trigger={['click']} placement="bottomRight">
        <button
          style={chipStyle}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = durumGosterim.color; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = durumGosterim.border; }}
        >
          {durumGosterim.label}
          <CaretDownOutlined style={{ fontSize: 9, opacity: 0.65, marginLeft: 1 }} />
        </button>
      </Dropdown>

      {isGonderildi && (
        <Dropdown menu={{ items: sonucMenu }} trigger={['click']} placement="bottomRight">
          <button
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 5,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.005em',
              color: '#ffffff',
              background: '#1e40af',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e3a8a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e40af'; }}
          >
            Sonuç gir
            <CaretDownOutlined style={{ fontSize: 9, opacity: 0.85, marginLeft: 1 }} />
          </button>
        </Dropdown>
      )}

      {yanitBekleniyor && (
        <Tooltip title={`${gunFark} gündür yanıt bekleniyor`} mouseEnterDelay={0.3}>
          <span className="pending-pulse-dot" aria-label="Yanıt bekleniyor" />
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Eski "Sonuç gir ▾" linki — yeni mantıkta DurumSonucCell kendi dropdown'unu
 * yönetiyor, bu fonksiyon artık kullanılmıyor. Geriye uyum için tutuluyor.
 */
// @ts-expect-error — yeni mantıkta direkt kullanılmıyor
function SonucGirLink({
  teklif, onSonucHizli,
}: {
  teklif: Teklif;
  onSonucHizli: (yeniDurum: TeklifDurum) => void;
  onSonucAc: () => void;
}) {
  const ts = new Date(teklif.guncellemeTarihi || teklif.olusturmaTarihi || teklif.tarih).getTime();
  const gunFark = Number.isFinite(ts) ? Math.floor((Date.now() - ts) / (24 * 3600 * 1000)) : 0;
  const overdue = gunFark >= 14 && teklif.durum === 'gonderildi';

  return (
    <Dropdown
      menu={{
        items: [
          { key: 'onaylandi', label: <DurumMenuLabel durum="onaylandi" hint="Müşteri onay verdi" />, onClick: () => onSonucHizli('onaylandi') },
          { key: 'reddedildi', label: <DurumMenuLabel durum="reddedildi" hint="Sebep girilir" />,      onClick: () => onSonucHizli('reddedildi') },
          { key: 'iptal',     label: <DurumMenuLabel durum="iptal"     hint="Sebep girilir" />,      onClick: () => onSonucHizli('iptal') },
        ],
      }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Tooltip
        title={overdue ? `Bu teklif ${gunFark} gündür yanıtlanmamış — kazandı mı kaybetti mi?` : 'Sonuç gir'}
        mouseEnterDelay={0.25}
      >
        <button
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: '#1e40af',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '4px 11px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.005em',
            whiteSpace: 'nowrap',
            boxShadow: overdue ? '0 0 0 2px rgba(245,158,11,0.55)' : 'none',
            transition: 'background 0.12s, box-shadow 0.12s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e3a8a'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e40af'; }}
        >
          {overdue && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#fbbf24', flexShrink: 0,
            }} />
          )}
          Sonuç gir
          <CaretDownOutlined style={{ fontSize: 9, opacity: 0.85 }} />
        </button>
      </Tooltip>
    </Dropdown>
  );
}

// Sonuç dropdown menüsünde küçük etiket — durum bazlı, sade
function DurumMenuLabel({ durum, hint }: { durum: TeklifDurum; hint: string }) {
  const label = DURUM_CFG[durum].label;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 180, padding: '2px 0' }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{label}</span>
      <span style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.2 }}>{hint}</span>
    </div>
  );
}

// ─── Sonuç düzenleme modalı ──────────────────────────────────────────────────

interface SonucModalProps {
  open: boolean;
  teklif: Teklif | null;
  onClose: () => void;
  onSave: (patch: Partial<Teklif>) => void;
}

function SonucModal({ open, teklif, onClose, onSave }: SonucModalProps) {
  const C = useColors();
  // Modal artık DURUM-bazlı çalışır: onaylandi / reddedildi / iptal
  const [durum, setDurum] = useState<TeklifDurum>('onaylandi');
  const [sebep, setSebep] = useState<KayipSebebi | undefined>();
  const [rakip, setRakip] = useState('');
  const [not, setNot] = useState('');

  useEffect(() => {
    if (teklif) {
      // Sadece sonuçlandırma durumlarını başlangıç olarak al; gönderildi/hazır vs ise default onaylandı
      const baslangic: TeklifDurum =
        teklif.durum === 'reddedildi' || teklif.durum === 'iptal' || teklif.durum === 'onaylandi'
          ? teklif.durum
          : 'onaylandi';
      setDurum(baslangic);
      setSebep(teklif.kayipSebebi);
      setRakip(teklif.rakipFirma ?? '');
      setNot(teklif.sonucNotu ?? '');
    }
  }, [teklif]);

  function kaydet() {
    const patch: Partial<Teklif> = {
      durum,
      sonucTarihi: new Date().toISOString(),
      sonucNotu: not.trim() || undefined,
    };
    if (durum === 'reddedildi') {
      patch.kayipSebebi = sebep;
      patch.rakipFirma = rakip.trim() || undefined;
    } else if (durum === 'iptal') {
      patch.kayipSebebi = sebep;
      patch.rakipFirma = undefined;
    } else {
      patch.kayipSebebi = undefined;
      patch.rakipFirma = undefined;
    }
    onSave(patch);
  }

  if (!teklif) return null;

  const sebepIstenir = durum === 'reddedildi' || durum === 'iptal';
  const okDisabled = sebepIstenir && !sebep;
  const durumKonfig = DURUM_CFG[durum];

  void durumKonfig;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={kaydet}
      okButtonProps={{ disabled: okDisabled }}
      title={teklif.teklifNo}
      okText="Kaydet"
      cancelText="Vazgeç"
      width={500}
      destroyOnHidden
    >
      <div style={{ paddingTop: 2 }}>
        <div style={{
          fontSize: 12, color: C.textSecondary, marginBottom: 14,
          lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {teklif.cari?.firmaAdi}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {([
            { key: 'onaylandi'  as TeklifDurum, label: 'Onaylandı'  },
            { key: 'reddedildi' as TeklifDurum, label: 'Reddedildi' },
            { key: 'iptal'      as TeklifDurum, label: 'İptal'      },
          ]).map((s) => {
            const aktif = durum === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setDurum(s.key)}
                type="button"
                style={{
                  display: 'inline-block',
                  background: aktif ? '#1e3a8a' : '#1e40af',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 5,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: aktif ? 700 : 600,
                  cursor: 'pointer',
                  letterSpacing: '0.005em',
                  lineHeight: 1.2,
                  boxShadow: aktif ? '0 0 0 3px rgba(30,64,175,0.22)' : 'none',
                  transition: 'background 0.12s, box-shadow 0.12s',
                }}
                onMouseEnter={(e) => { if (!aktif) (e.currentTarget as HTMLElement).style.background = '#1e3a8a'; }}
                onMouseLeave={(e) => { if (!aktif) (e.currentTarget as HTMLElement).style.background = '#1e40af'; }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {sebepIstenir && (
          <div style={{ marginTop: 14 }}>
            <Select
              value={sebep}
              onChange={(v) => setSebep(v)}
              placeholder="Sebep *"
              style={{ width: '100%' }}
              status={!sebep ? 'warning' : undefined}
              options={(Object.keys(KAYIP_SEBEBI_LABEL) as KayipSebebi[]).map((k) => ({
                value: k, label: KAYIP_SEBEBI_LABEL[k],
              }))}
            />
            {durum === 'reddedildi' && (
              <Input
                placeholder="Rakip firma (opsiyonel)"
                value={rakip}
                onChange={(e) => setRakip(e.target.value)}
                maxLength={100}
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        )}

        <Input.TextArea
          value={not}
          onChange={(e) => setNot(e.target.value)}
          rows={3}
          placeholder="Not (gizli)"
          maxLength={500}
          style={{ marginTop: 12 }}
        />
      </div>
    </Modal>
  );
}

// ─── Yardımcı bileşenler ─────────────────────────────────────────────────────

function HeaderCell({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 500,
      color: 'var(--text-secondary)',
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      ...style,
    }}>
      {children}
    </div>
  );
}

interface TeklifKartiProps {
  teklif: Teklif;
  benim: boolean;
  isDark: boolean;
  C: ReturnType<typeof useColors>;
  navigate: (path: string) => void;
  onSil: (id: string) => void;
  onKopyala: (id: string) => void;
  onSonucAc: () => void;
  onSonucHizli: (yeniDurum: TeklifDurum) => void;
}

function TeklifKarti({ teklif, benim, isDark, C, navigate, onSil, onKopyala, onSonucAc, onSonucHizli }: TeklifKartiProps) {
  const isim = teklif.hazirlayanAdSoyad ?? '';
  const toplamSatirlari = teklifToplamOzeti(teklif);
  const renk = isim ? personelRenk(isim) : PALET[0];
  const inits = isim ? initials(isim) : '?';
  const durumGosterim =
    (isDark ? DURUM_CFG_DARK[teklif.durum] : DURUM_CFG[teklif.durum]) ??
    (isDark ? DURUM_CFG_DARK.taslak : DURUM_CFG.taslak);


  const actionButtonStyle: CSSProperties = {
    color: C.textFaint,
    width: 30,
    height: 30,
    minWidth: 30,
    padding: 0,
    borderRadius: 8,
    flexShrink: 0,
  };

  return (
    <div
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: benim
          ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,31,69,0.030)')
          : C.bgSurface,
        border: `1px solid ${benim
          ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,31,69,0.11)')
          : C.borderSubtle}`,
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'box-shadow 0.14s',
      }}
    >
      <div style={{ width: 3, flexShrink: 0, background: benim ? '#0f1f45' : renk.accent, alignSelf: 'stretch' }} />

      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: ROW_GRID,
        alignItems: 'center',
        padding: '11px 14px 11px 16px',
        gap: 0,
        minWidth: 0,
      }}>
        {/* Müşteri / Teklif No — cari büyük primary, no küçük faint */}
        <div style={{ minWidth: 0, paddingRight: 12 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.textPrimary,
            letterSpacing: '-0.005em',
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 2,
          }}>
            {formatCariAdi(teklif.cari.firmaAdi)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => navigate(`/teklif/${teklif.id}`)}
              className={buttonClassNames.link}
              style={{
                textAlign: 'left',
                fontSize: 11,
                fontWeight: 500,
                color: C.textFaint,
                letterSpacing: '0.02em',
                lineHeight: 1.2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {teklif.teklifNo}
            </button>
            {teklif.visibility === 'private' && (
              <Tooltip title="Gizli — sadece hazırlayan ve yönetici görür" mouseEnterDelay={0.3}>
                <span aria-label="Gizli teklif" style={{
                  fontSize: 10, color: '#5b6e85', cursor: 'help', lineHeight: 1,
                }}>🔒</span>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Tarih — primary vurgulu */}
        <div style={{ paddingRight: 8 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.textPrimary,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.005em',
          }}>
            {formatDate(teklif.tarih)}
          </div>
        </div>

        {/* Hazırlayan */}
        <div style={{ paddingRight: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: benim ? 'rgba(15,31,69,0.10)' : renk.avatarBg,
              border: `1.5px solid ${benim ? 'rgba(15,31,69,0.28)' : renk.avatarBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9.5, fontWeight: 700, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Inter", "Arial", sans-serif',
              color: benim ? C.textPrimary : renk.avatarText,
            }}>
              {inits}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, color: C.textPrimary, whiteSpace: 'nowrap' }}>
                {benim ? 'Sen' : isim || '—'}
              </div>
              {benim && isim && (
                <div style={{ fontSize: 10, color: C.textFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                  {isim}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toplam — küçültülmüş, ikincil görsel ağırlık */}
        <div style={{ textAlign: 'right', paddingRight: 16 }}>
          {toplamSatirlari.map((satir, i) => (
            <div key={`${teklif.id}-${i}`} style={{
              fontSize: i === 0 ? 12 : 11,
              fontWeight: i === 0 ? 600 : 500,
              color: i === 0 ? C.textSecondary : C.textFaint,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              lineHeight: i === 0 ? 1.25 : 1.35,
              marginTop: i === 0 ? 0 : 2,
            }}>
              {satir}
            </div>
          ))}
          {teklif.satirBazliParaBirimi && toplamSatirlari.length === 0 && (
            <div style={{ fontSize: 11, fontWeight: 500, color: C.textFaint }}>Satır bazlı</div>
          )}
        </div>

        {/* Durum + Sonuç — tek vurgulu chip, alt satır metadata */}
        <DurumSonucCell
          teklif={teklif}
          durumGosterim={durumGosterim}
          onSonucAc={onSonucAc}
          onSonucHizli={onSonucHizli}
          C={C}
        />

        {/* Aksiyonlar — sadeleşti: Aç / Kopyala / Sil */}
        <div style={{ paddingLeft: 6, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <Tooltip title="Aç">
              <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/teklif/${teklif.id}`)} style={actionButtonStyle} className={buttonClassNames.smallAction} />
            </Tooltip>
            <Tooltip title="Kopyala">
              <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => onKopyala(teklif.id)} style={actionButtonStyle} className={buttonClassNames.smallAction} />
            </Tooltip>
            <Popconfirm
              title="Teklif silinecek"
              description="Bu işlem geri alınamaz. Emin misiniz?"
              onConfirm={() => onSil(teklif.id)}
              okText="Sil"
              cancelText="İptal"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />}
                style={{ ...actionButtonStyle, color: isDark ? '#f87171' : '#dc2626' }}
                className={buttonClassNames.smallActionDanger}
              />
            </Popconfirm>
          </div>
        </div>
      </div>
    </div>
  );
}
