import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  CaretDownOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { teklifService } from '../services/teklifService';
import { cariService } from '../services/musteriService';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import type { Teklif, TeklifDurum, KayipSebebi, Cari, Kullanici } from '../types';
import { formatCurrency, formatDate, formatCariAdi } from '../utils/formatters';
import { klasorAdiUret } from '../utils/folderUtils';
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

// Sonuç görünüm config'i — direkt durum'a bağlı.
// (Önceden ayrı bir 'sonuc' alanı tutuluyordu; o redundant alan kaldırıldı,
// sonuç gösterimleri artık doğrudan durum'dan türetiliyor.)
// Sadece sonuçlanmış durumlar için tanımlı (taslak/hazir/gonderildi'de "sonuç badge" yok).
export const SONUC_CFG: Partial<Record<TeklifDurum, { label: string; color: string; bg: string; border: string; emoji: string }>> = {
  onaylandi:  { label: 'Onaylandı',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', emoji: '✓' },
  reddedildi: { label: 'Kaybedildi', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', emoji: '✕' },
  iptal:      { label: 'İptal',      color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', emoji: '○' },
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

/**
 * Teklif numarasını "base" + "-RevN" suffix olarak ayrıştırır.
 * Listede ve diğer yerlerde "Rev" kısmını ayrı bir mor rozet olarak vurgulamak için.
 *  TKF-2024-0042       → { base: 'TKF-2024-0042', rev: null }
 *  TKF-2024-0042-Rev1  → { base: 'TKF-2024-0042', rev: 'Rev1' }
 */
function ayrTeklifNo(teklifNo: string): { base: string; rev: string | null } {
  const m = teklifNo.match(/^(.*?)-?(Rev\d+)$/);
  if (!m) return { base: teklifNo, rev: null };
  return { base: m[1], rev: m[2] };
}

/**
 * Teklif numarasını render et — varsa "RevN" kısmı ayrı vurgulu rozet olarak.
 * baseStyle: ana metnin stil özellikleri (fontSize, color vs.).
 */
function TeklifNoEtiket({ teklifNo, baseStyle }: { teklifNo: string; baseStyle?: CSSProperties }) {
  const { base, rev } = ayrTeklifNo(teklifNo);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...baseStyle }}>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{base}</span>
      {rev && (
        <span
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            color: '#ffffff',
            background: '#7c3aed',
            letterSpacing: '0.04em',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
          }}
        >
          {rev}
        </span>
      )}
    </span>
  );
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

// (wordmarkUret / wordmarkFontSize / logoTileRengi / distinctiveWord
//  cari logo + wordmark görselleri kaldırıldığı için artık kullanılmıyor — silindi.)

// ─── Filtre tipi ─────────────────────────────────────────────────────────────

type Filtre = 'benim' | 'tumu';
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
  const [aktifFiltre, setAktifFiltre] = useState<Filtre>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('teklif_filtre') : null;
    return saved === 'tumu' ? 'tumu' : 'benim';
  });
  const [siralama, setSiralama] = useState<Siralama>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('teklif_siralama') : null;
    return (saved === 'aktiflik' || saved === 'teklifSayisi') ? saved as Siralama : 'alfabe';
  });
  const [gorunumModu, setGorunumModu] = useState<GorunumModu>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('teklif_klasor_gorunum') : null;
    return saved === 'liste' ? 'liste' : 'grid';
  });
  // Liste mount edildiğinde sessionStorage'da son ziyaret edilen klasör varsa
  // ona dönen "klasör hafızası". TeklifEditor'dan Geri'ye dönüldüğünde önceki
  // klasörün içine düşüp ana listeye atılmaktan kurtulur.
  const HATIRLA_KEY = 'teklif_son_klasor';
  const baslangicKlasor: string | null =
    typeof window !== 'undefined' ? sessionStorage.getItem(HATIRLA_KEY) : null;
  const [gorunum, setGorunum] = useState<Gorunum>(baslangicKlasor ? 'detay' : 'klasorler');
  const [seciliKlasor, setSeciliKlasor] = useState<string | null>(baslangicKlasor);

  useEffect(() => {
    try { localStorage.setItem('teklif_klasor_gorunum', gorunumModu); } catch { /* ignore */ }
  }, [gorunumModu]);

  useEffect(() => {
    try { localStorage.setItem('teklif_siralama', siralama); } catch { /* ignore */ }
  }, [siralama]);

  useEffect(() => {
    try { localStorage.setItem('teklif_filtre', aktifFiltre); } catch { /* ignore */ }
  }, [aktifFiltre]);

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
    try { sessionStorage.setItem(HATIRLA_KEY, klasorAdi); } catch { /* ignore */ }
    setAramaMetni('');
  }

  function klasordenCik() {
    setGorunum('klasorler');
    setSeciliKlasor(null);
    setAramaMetni('');
    try { sessionStorage.removeItem(HATIRLA_KEY); } catch { /* ignore */ }
  }

  // ── Tab bazlı filtreleme ─────────────────────────────────────────────────────
  const tabFiltreli = useMemo(() => {
    if (aktifFiltre === 'benim') return teklifler.filter((t) => t.hazirlayanKullaniciId === benimId);
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

  // ── Yönetici özeti — sadece admin/super_admin/firma_admin için ───────────────
  const isAdmin = useMemo(() => {
    const r = aktifKullanici?.rol;
    return r === 'super_admin' || r === 'admin' || r === 'firma_admin';
  }, [aktifKullanici]);

  const yoneticiOzeti = useMemo(() => {
    if (!isAdmin) return null;
    return computeYoneticiOzeti(teklifler);
  }, [teklifler, isAdmin]);

  // "Diğer Personellerin Teklifleri" sekmesi kullanıcı tercihiyle kaldırıldı.
  const sekmeler: Array<{ key: Filtre; label: string; count: number }> = [
    { key: 'benim', label: 'Benim Tekliflerim', count: benimSayisi },
    { key: 'tumu',  label: 'Tüm Teklifler',     count: teklifler.length },
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
          teklifler={tabFiltreli}
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
          benimId={benimId}
          onSil={teklifSil}
          onKopyala={teklifKopyala}
          onRefresh={teklifleriYukle}
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
          onRefresh={teklifleriYukle}
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
  // Aktivite (flat) mod için gerekli ek aksiyonlar:
  benimId: string | undefined;
  onSil: (id: string) => void;
  onKopyala: (id: string) => void;
  onRefresh: () => void;
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
  isMobile, C, teklifler, klasorler, kullaniciMap, aramaMetni, setAramaMetni,
  aktifFiltre, setAktifFiltre, siralama, setSiralama, gorunumModu, setGorunumModu,
  sekmeler, yoneticiOzeti, aktifKullaniciAd, onKlasorTikla, onCariGuncelle,
  navigate, benimId, onSil, onKopyala, onRefresh,
}: KlasorGorunumuProps) {
  const { isDark } = useTheme();
  const { aktifKullanici } = useKullanici();
  const { message, modal } = App.useApp();
  const [sonucModalTeklif, setSonucModalTeklif] = useState<Teklif | null>(null);

  // Aktivite modu için kullanılacak callbacks — DetayGorunumu'ndakinin aynısı.
  const sonucYaz = useCallback((teklif: Teklif, patch: Partial<Teklif>) => {
    const guncel: Teklif = {
      ...teklif,
      ...patch,
      sonucGirenKullaniciId: aktifKullanici?.id,
      guncellemeTarihi: new Date().toISOString(),
    };
    teklifService.teklifKaydet(guncel);
    onRefresh();
    message.success('Durum güncellendi.');
  }, [aktifKullanici?.id, message, onRefresh]);

  function modalSave(patch: Partial<Teklif>) {
    if (!sonucModalTeklif) return;
    sonucYaz(sonucModalTeklif, patch);
    setSonucModalTeklif(null);
  }

  function uygulaHizliSonuc(teklif: Teklif, yeniDurum: TeklifDurum) {
    if (yeniDurum === 'reddedildi' || yeniDurum === 'iptal') {
      setSonucModalTeklif({ ...teklif, durum: yeniDurum });
      return;
    }
    sonucYaz(teklif, {
      durum: yeniDurum, sonucTarihi: new Date().toISOString(),
      kayipSebebi: undefined, rakipFirma: undefined,
    });
  }

  function hizliSonuc(teklif: Teklif, yeniDurum: TeklifDurum) {
    const KAPALI: TeklifDurum[] = ['onaylandi', 'reddedildi', 'iptal'];
    if (KAPALI.includes(teklif.durum) && yeniDurum !== teklif.durum) {
      modal.confirm({
        title: 'Sonuçlanmış teklifin durumunu değiştir?',
        content: `Bu teklif "${DURUM_CFG[teklif.durum].label}" olarak işaretliydi. Yeni durum: "${DURUM_CFG[yeniDurum].label}". Devam etmek istiyor musunuz?`,
        okText: 'Evet, değiştir', cancelText: 'Vazgeç',
        onOk: () => uygulaHizliSonuc(teklif, yeniDurum),
      });
      return;
    }
    uygulaHizliSonuc(teklif, yeniDurum);
  }

  // Aktivite modu listesi: mevcut filtreli teklifler (klasör birleşmesi
  // yapılmadan), guncellemeTarihi (yoksa olusturmaTarihi) tarihine göre
  // en yeniden eskiye sıralı.
  const aktiviteler = useMemo(() => {
    let liste = [...teklifler];
    if (aramaMetni.trim()) {
      const q = aramaMetni.toLocaleLowerCase('tr-TR');
      liste = liste.filter(
        (t) =>
          t.teklifNo.toLocaleLowerCase('tr-TR').includes(q) ||
          t.cari.firmaAdi.toLocaleLowerCase('tr-TR').includes(q) ||
          (t.hazirlayanAdSoyad?.toLocaleLowerCase('tr-TR').includes(q) ?? false),
      );
    }
    return liste.sort((a, b) => {
      const ta = a.guncellemeTarihi || a.olusturmaTarihi || a.tarih;
      const tb = b.guncellemeTarihi || b.olusturmaTarihi || b.tarih;
      return tb.localeCompare(ta);
    });
  }, [teklifler, aramaMetni]);
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
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          {/* Tab'lar */}
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

          {/* Sıralama butonları */}
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
              { k: 'aktiflik', l: 'Son aktivite' },
              { k: 'alfabe',   l: 'A → Z' },
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

      {/* Sıralama satırı → şimdi sayı + grid/liste toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12,
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, color: C.textFaint, fontVariantNumeric: 'tabular-nums' }}>
          {siralama === 'aktiflik'
            ? `${aktiviteler.length} teklif`
            : `${klasorler.length} müşteri`}
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

      {/* Aktivite modu: flat teklif listesi (en yeniden eskiye).
          Klasör modu: klasör grid'i (alfabe / teklif sayısı). */}
      {siralama === 'aktiflik' ? (
        aktiviteler.length === 0 ? (
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
              ? 'Arama kriterlerine uygun teklif bulunamadı.'
              : 'Henüz teklif bulunmuyor. İlk teklifinizi oluşturun.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {aktiviteler.map((t) => (
              <TeklifKarti
                key={t.id}
                teklif={t}
                benim={t.hazirlayanKullaniciId === benimId}
                isDark={isDark}
                C={C}
                navigate={navigate}
                onSil={onSil}
                onKopyala={onKopyala}
                onSonucAc={() => setSonucModalTeklif(t)}
                onSonucHizli={(durum) => hizliSonuc(t, durum)}
              />
            ))}
          </div>
        )
      ) : klasorler.length === 0 ? (
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

      <SonucModal
        open={sonucModalTeklif !== null}
        teklif={sonucModalTeklif}
        onClose={() => setSonucModalTeklif(null)}
        onSave={modalSave}
      />
    </>
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

function KlasorSatiri({ klasor, isMobile, C, kullaniciMap, sonSatir, onClick }: KlasorSatiriProps) {
  const { isDark } = useTheme();
  const [hover, setHover] = useState(false);

  const subtitle = useMemo(() => {
    const ham = klasor.firmaAdiDisplay.split(/\s+/).filter(Boolean);
    const ikinciKelime = ham[1] && !STOP_WORDS.has(ham[1].toLocaleUpperCase('tr-TR')) ? ham[1] : '';
    return ikinciKelime ? ikinciKelime : '—';
  }, [klasor.firmaAdiDisplay]);

  // Gösterge lambası — gönderilmiş ve 3+ gün eski mi?
  const hasOverdueOffers = useMemo(() => {
    const bugun = new Date();
    return klasor.teklifler.some((t) => {
      if (t.durum !== 'gonderildi') return false;
      const tarih = t.guncellemeTarihi || t.tarih;
      if (!tarih) return false;
      const teklifTarihi = new Date(tarih);
      const gunFarki = Math.floor((bugun.getTime() - teklifTarihi.getTime()) / (1000 * 60 * 60 * 24));
      return gunFarki >= 3;
    });
  }, [klasor.teklifler]);

  const hazirlayanlar = klasor.topHazirlayanIds
    .map((id) => kullaniciMap.get(id))
    .filter((k): k is Kullanici => Boolean(k));

  const isim = formatCariAdi(klasor.firmaAdiDisplay)
    .replace(/\s+(SAN\.|TİC\.|LTD\.|A\.Ş\.|ŞTİ\.|İNŞ\.).*$/i, '')
    .trim() || klasor.firmaAdiDisplay;

  // Kolon: [premium klasör 32] [isim/sektör flex] [teklif 95] [tarih 90] [avatars 78]
  // Satırlar arası nefes boşluk (margin-bottom + radius) — etiketler kalabalık
  // gözükmesin diye liste görünümünde her klasör satırı ayrı bir kart olarak.
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '40px minmax(0, 1fr) auto'
          : '40px minmax(0, 1fr) 110px 100px 86px',
        alignItems: 'center',
        gap: isMobile ? 10 : 14,
        padding: isMobile ? '12px 12px' : '12px 16px',
        marginBottom: sonSatir ? 0 : 8,
        borderRadius: 8,
        background: hover
          ? (isDark ? 'rgba(255,255,255,0.045)' : 'rgba(15,30,60,0.04)')
          : (isDark ? 'rgba(255,255,255,0.018)' : 'rgba(15,30,60,0.012)'),
        border: `1px solid ${hover ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,30,60,0.10)') : C.borderSubtle}`,
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        transition: 'background 0.14s ease, border-color 0.14s ease',
        overflow: 'visible',
      }}
    >
      {/* Gösterge lambası — gönderilmiş 3+ gün eski mi? */}
      {hasOverdueOffers && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'rgba(255, 152, 0, 0.9)',
            animation: 'klasorLambaGlow 2s ease-in-out infinite',
            zIndex: 10,
            border: '1px solid rgba(255, 200, 87, 0.5)',
          }}
        />
      )}
      {/* Premium klasör ikonu */}
      <div style={{
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <PremiumKlasorIcon size={44} isDark={isDark} />
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

      {/* Teklif sayısı (yanıp sönen nokta kullanıcı tercihiyle kaldırıldı) */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontVariantNumeric: 'tabular-nums' }}>
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

    </div>
  );
}

// ─── Premium Klasör İkonu ────────────────────────────────────────────────────
//
// Kabartmalı (3D), tema uyumlu, kart logosu yerine kullanılan zarif klasör.
// Light: warm bej/altın tonlu (premium B2B his), dark: gümüş-grafit.
// Üstten ışık highlight, alta yumuşak iç gölge, dışta soft drop shadow.

function PremiumKlasorIcon({ size = 52, isDark = false }: { size?: number; isDark?: boolean }) {
  const VB = 80;
  const uid = `pkv3-${isDark ? 'd' : 'l'}-${size}`;

  const c = isDark
    ? {
        // Arka kapak
        backTop:    '#5C6A96',
        backBot:    '#2E3650',
        // Tab
        tabTop:     '#7080B8',
        tabBot:     '#4A5580',
        tabRim:     'rgba(255,255,255,0.18)',
        // Kağıt
        paper1Top:  '#E8EDF8',
        paper1Bot:  '#C8D2EC',
        paper2Top:  '#D0D8F0',
        paper2Bot:  '#B8C4E4',
        paperLine:  'rgba(80,100,180,0.30)',
        // Ön kapak
        frontTop:   '#8A99C8',
        frontMid:   '#6070A8',
        frontBot:   '#3A4568',
        // Aksan / gölge
        rim:        'rgba(0,0,0,0.55)',
        shine:      'rgba(255,255,255,0.28)',
        shineEdge:  'rgba(255,255,255,0.15)',
        lineColor:  'rgba(255,255,255,0.13)',
        shadow:     'rgba(10,15,40,0.60)',
        bottomShadow: 'rgba(0,0,0,0.50)',
        // Kenar şeridi
        stripe:     '#5060A0',
        stripeShine:'rgba(255,255,255,0.22)',
      }
    : {
        // Arka kapak
        backTop:    '#F0C84A',
        backBot:    '#A87820',
        // Tab
        tabTop:     '#FAD86A',
        tabBot:     '#C89030',
        tabRim:     'rgba(255,255,255,0.60)',
        // Kağıt
        paper1Top:  '#FFFFFF',
        paper1Bot:  '#EFF3FF',
        paper2Top:  '#F5F8FF',
        paper2Bot:  '#E2E8FF',
        paperLine:  'rgba(80,100,200,0.18)',
        // Ön kapak
        frontTop:   '#FAEEC0',
        frontMid:   '#F0D060',
        frontBot:   '#B88020',
        // Aksan / gölge
        rim:        'rgba(100,60,0,0.42)',
        shine:      'rgba(255,255,255,0.90)',
        shineEdge:  'rgba(255,255,255,0.55)',
        lineColor:  'rgba(100,65,0,0.15)',
        shadow:     'rgba(120,80,10,0.35)',
        bottomShadow: 'rgba(100,60,0,0.40)',
        // Kenar şeridi
        stripe:     '#D4A030',
        stripeShine:'rgba(255,255,255,0.50)',
      };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Gradientler */}
        <linearGradient id={`${uid}-back`} x1="40" y1="16" x2="40" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={c.backTop} />
          <stop offset="100%" stopColor={c.backBot} />
        </linearGradient>
        <linearGradient id={`${uid}-tab`} x1="22" y1="14" x2="22" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={c.tabTop} />
          <stop offset="100%" stopColor={c.tabBot} />
        </linearGradient>
        <linearGradient id={`${uid}-front`} x1="40" y1="28" x2="40" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={c.frontTop} />
          <stop offset="55%"  stopColor={c.frontMid} />
          <stop offset="100%" stopColor={c.frontBot} />
        </linearGradient>
        <linearGradient id={`${uid}-p1`} x1="40" y1="14" x2="40" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={c.paper1Top} />
          <stop offset="100%" stopColor={c.paper1Bot} />
        </linearGradient>
        <linearGradient id={`${uid}-p2`} x1="40" y1="16" x2="40" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={c.paper2Top} />
          <stop offset="100%" stopColor={c.paper2Bot} />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="10" y1="28" x2="10" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={c.shine} stopOpacity="0.9" />
          <stop offset="100%" stopColor={c.shine} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-stripeG`} x1="7" y1="28" x2="11" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={c.stripe} />
          <stop offset="100%" stopColor={c.frontMid} />
        </linearGradient>
        {/* Drop shadow filtresi */}
        <filter id={`${uid}-fs`} x="-15%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor={c.shadow} floodOpacity="0.55" />
        </filter>
        <filter id={`${uid}-ps`} x="-20%" y="-20%" width="150%" height="180%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor={c.shadow} floodOpacity="0.40" />
        </filter>
        {/* Clip paths */}
        <clipPath id={`${uid}-frontClip`}>
          <path d="M 7 29 Q 7 26 10 26 L 70 26 Q 73 26 73 29 L 73 63 Q 73 67 70 67 L 10 67 Q 7 67 7 63 Z" />
        </clipPath>
      </defs>

      {/* ── Zemin gölgesi */}
      <ellipse cx="40" cy="70" rx="28" ry="2.8" fill={c.bottomShadow} opacity="0.38" />

      {/* ── Arka kapak gövdesi (tab dahil) */}
      <path
        d="M 7 26 Q 7 22 10 22 L 34 22 Q 37 22 38.5 26 L 41 30 L 70 30 Q 73 30 73 33 L 73 63 Q 73 67 70 67 L 10 67 Q 7 67 7 63 Z"
        fill={`url(#${uid}-back)`}
        stroke={c.rim}
        strokeWidth="0.8"
        filter={`url(#${uid}-fs)`}
      />

      {/* ── Tab yüzeyine ayrı gradient */}
      <path
        d="M 8 26 Q 8 23 11 23 L 33.5 23 Q 36 23 37.5 26 L 40 29.5 L 7.5 29.5 Z"
        fill={`url(#${uid}-tab)`}
        stroke="none"
        opacity="0.85"
      />
      {/* Tab üst parlak kenar */}
      <path
        d="M 9.5 26 Q 9.5 24.5 11.5 24.5 L 33 24.5 Q 35 24.5 36.5 27 L 38.5 29.5"
        stroke={c.tabRim}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* ── Kağıt 2 — hafif sol yatık */}
      <g filter={`url(#${uid}-ps)`}>
        <rect
          x="17" y="14" width="34" height="17"
          rx="2.5"
          fill={`url(#${uid}-p2)`}
          stroke={isDark ? 'rgba(180,195,230,0.30)' : 'rgba(160,140,80,0.35)'}
          strokeWidth="0.6"
          transform="rotate(-4 34 22)"
        />
      </g>
      {/* Kağıt 2 çizgileri */}
      <line x1="21" y1="19" x2="40" y2="19" stroke={c.paperLine} strokeWidth="1.1" strokeLinecap="round" transform="rotate(-4 34 22)" />
      <line x1="21" y1="22.5" x2="34" y2="22.5" stroke={c.paperLine} strokeWidth="0.9" strokeLinecap="round" transform="rotate(-4 34 22)" opacity="0.7" />

      {/* ── Kağıt 1 — hafif sağ yatık */}
      <g filter={`url(#${uid}-ps)`}>
        <rect
          x="22" y="13" width="34" height="17"
          rx="2.5"
          fill={`url(#${uid}-p1)`}
          stroke={isDark ? 'rgba(200,215,245,0.35)' : 'rgba(160,140,80,0.40)'}
          strokeWidth="0.6"
          transform="rotate(3 39 21)"
        />
      </g>
      {/* Kağıt 1 çizgileri */}
      <line x1="26" y1="18" x2="50" y2="18" stroke={c.paperLine} strokeWidth="1.1" strokeLinecap="round" transform="rotate(3 39 21)" />
      <line x1="26" y1="21.5" x2="43" y2="21.5" stroke={c.paperLine} strokeWidth="0.9" strokeLinecap="round" transform="rotate(3 39 21)" opacity="0.7" />
      <line x1="26" y1="25" x2="37" y2="25" stroke={c.paperLine} strokeWidth="0.8" strokeLinecap="round" transform="rotate(3 39 21)" opacity="0.5" />

      {/* ── Ön kapak */}
      <path
        d="M 7 29 Q 7 26 10 26 L 70 26 Q 73 26 73 29 L 73 63 Q 73 67 70 67 L 10 67 Q 7 67 7 63 Z"
        fill={`url(#${uid}-front)`}
        stroke={c.rim}
        strokeWidth="0.8"
      />

      {/* Ön kapak sol dikey kenar şeridi */}
      <path
        d="M 7 29 Q 7 26 10 26 L 14 26 L 14 67 L 10 67 Q 7 67 7 63 Z"
        fill={`url(#${uid}-stripeG)`}
        opacity="0.6"
      />

      {/* Ön kapak üst parlak highlight */}
      <rect x="8" y="26.8" width="64" height="1.6" rx="0.8" fill={c.shine} opacity="0.80" />

      {/* Sol dikey parlama şeridi */}
      <rect x="8" y="29" width="1.5" height="36" rx="0.75" fill={`url(#${uid}-shine)`} opacity="0.60" />

      {/* Ön kapak içerik — dosya içeriği çizgileri */}
      <g clipPath={`url(#${uid}-frontClip)`}>
        {/* Üst çizgi grubu — belge */}
        <rect x="18" y="36" width="44" height="3"   rx="1.5" fill={c.lineColor} />
        <rect x="18" y="42" width="36" height="2.5" rx="1.25" fill={c.lineColor} opacity="0.80" />
        <rect x="18" y="47.5" width="28" height="2.2" rx="1.1" fill={c.lineColor} opacity="0.60" />
        <rect x="18" y="52.5" width="20" height="2"   rx="1"   fill={c.lineColor} opacity="0.40" />

        {/* Alt köşe gölge derinliği */}
        <path d="M 7 50 L 73 50 L 73 67 Q 73 67 70 67 L 10 67 Q 7 67 7 63 Z"
          fill={isDark ? 'rgba(0,0,0,0.18)' : 'rgba(100,60,0,0.10)'}
          opacity="0.7"
        />
      </g>

      {/* Alt metal kenar şeridi / fold hissi */}
      <path
        d="M 8 63 Q 8 65.5 10 66 L 70 66 Q 72 65.5 72 63 L 72 62 L 8 62 Z"
        fill={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.30)'}
      />
    </svg>
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

function KlasorKarti({ klasor, isMobile, C, kullaniciMap, onClick }: KlasorKartiProps) {
  const { isDark } = useTheme();
  const [hover, setHover] = useState(false);

  // Sektör + lokasyon: "Otomasyon · İstanbul" tarzı meta satırı için.
  // db.cariler[].adres alanı il bilgisini taşıyabiliyor; sektör için firma adının
  // ikinci kelimesini (varsa) kullanıyoruz — gerçek sektör alanı şu an yok.
  const subtitle = useMemo(() => {
    const ham = klasor.firmaAdiDisplay.split(/\s+/).filter(Boolean);
    const ikinciKelime = ham[1] && !STOP_WORDS.has(ham[1].toLocaleUpperCase('tr-TR')) ? ham[1] : '';
    return ikinciKelime ? ikinciKelime : klasor.firmaAdiDisplay;
  }, [klasor.firmaAdiDisplay]);

  // Pulse kontrolü — gönderilmiş ve 3+ gün eski teklifler var mı?
  const hasOverdueOffers = useMemo(() => {
    const bugun = new Date();
    return klasor.teklifler.some((t) => {
      if (t.durum !== 'gonderildi') return false;
      const tarih = t.guncellemeTarihi || t.tarih;
      if (!tarih) return false;
      const teklifTarihi = new Date(tarih);
      const gunFarki = Math.floor((bugun.getTime() - teklifTarihi.getTime()) / (1000 * 60 * 60 * 24));
      return gunFarki >= 3;
    });
  }, [klasor.teklifler]);

  const hazirlayanlar = klasor.topHazirlayanIds
    .map((id) => kullaniciMap.get(id))
    .filter((k): k is Kullanici => Boolean(k));

  // Premium B2B: kart yüzeyi sayfa zemininden 1 ton koyu (paper, not blast white)
  const cardBg = isDark ? '#161922' : '#F4F3EF';
  const cardBgHover = isDark ? '#1a1e29' : '#EFEDE8';

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

  const logoSize = isMobile ? 56 : 68;
  // Premium klasör ikon kutusu — eski cari logo yerine zarif kabartmalı klasör.
  // Şeffaf arka plan: ikonun kendi gradient'i ön planda kalsın.
  const logoBoxStyle: CSSProperties = {
    width: logoSize,
    height: logoSize,
    minWidth: logoSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  return (
    <div
      style={{
        ...cardStyle,
        position: 'relative',
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Gösterge lambası — gönderilmiş 3+ gün eski teklifler varsa */}
      {hasOverdueOffers && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'rgba(255, 152, 0, 0.9)',
            boxShadow: '0 0 6px rgba(255, 152, 0, 0.6)',
            animation: 'klasorLambaGlow 2s ease-in-out infinite',
            zIndex: 2,
            border: '1px solid rgba(255, 200, 87, 0.5)',
          }}
        />
      )}
      
      {/* Üst blok: logo + isim/altyazı */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: isMobile ? '12px 12px 10px' : '14px 14px 12px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={logoBoxStyle}>
          <PremiumKlasorIcon size={logoSize} isDark={isDark} />
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
      <div style={{ height: 1, background: C.borderSubtle, margin: '0 14px', position: 'relative', zIndex: 1 }} />

      {/* Alt meta */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: isMobile ? '8px 12px 12px' : '10px 14px 14px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
  /** Ust state'teki teklifler array'ini yeniden cek — durum/sonuc kaydedildikten
   *  sonra UI'in guncel veriyle re-render olmasi icin cagrilir. */
  onRefresh: () => void;
}

function DetayGorunumu({
  isMobile, C, klasorAdi, firmaAdiDisplay, teklifler, aramaMetni, setAramaMetni,
  aktifFiltre, setAktifFiltre, sekmeler, benimId, navigate, onGeri, onSil, onKopyala,
  onRefresh,
}: DetayGorunumuProps) {
  const { isDark } = useTheme();
  const { aktifKullanici } = useKullanici();
  const { message, modal } = App.useApp();
  const [sonucModalTeklif, setSonucModalTeklif] = useState<Teklif | null>(null);

  // Tek noktadan durum güncelle — hem hızlı (modal-suz) hem modal save kullanır.
  // 'sonuc' field'i kaldirildi: sonuç bilgisi artik direkt durum'dan turetiliyor.
  const sonucYaz = useCallback((teklif: Teklif, patch: Partial<Teklif>) => {
    const guncel: Teklif = {
      ...teklif,
      ...patch,
      sonucGirenKullaniciId: aktifKullanici?.id,
      guncellemeTarihi: new Date().toISOString(),
    };
    teklifService.teklifKaydet(guncel);
    // Ust state'i yenile ki UI degisikligi yansisin (sadece store guncellenirse
    // React re-render olmaz — local "teklifler" state hala eski referansta kalir)
    onRefresh();
    message.success('Durum güncellendi.');
  }, [aktifKullanici?.id, message, onRefresh]);

  function modalSave(patch: Partial<Teklif>) {
    if (!sonucModalTeklif) return;
    sonucYaz(sonucModalTeklif, patch);
    setSonucModalTeklif(null);
  }

  function hizliSonuc(teklif: Teklif, yeniDurum: TeklifDurum) {
    // Sonuclanmis (onaylandi/reddedildi/iptal) durumdan baska bir duruma
    // gecis kullanicidan onay ister — kazanmis teklifi yanlislikla taslaga
    // dusurmemesi vs. icin koruyucu.
    const KAPALI: TeklifDurum[] = ['onaylandi', 'reddedildi', 'iptal'];
    const sonuclanmisti = KAPALI.includes(teklif.durum);
    const farkli = yeniDurum !== teklif.durum;
    if (sonuclanmisti && farkli) {
      modal.confirm({
        title: 'Sonuçlanmış teklifin durumunu değiştir?',
        content: `Bu teklif "${DURUM_CFG[teklif.durum].label}" olarak işaretliydi. Yeni durum: "${DURUM_CFG[yeniDurum].label}". Devam etmek istiyor musunuz?`,
        okText: 'Evet, değiştir',
        cancelText: 'Vazgeç',
        onOk: () => uygulaHizliSonuc(teklif, yeniDurum),
      });
      return;
    }
    uygulaHizliSonuc(teklif, yeniDurum);
  }

  function uygulaHizliSonuc(teklif: Teklif, yeniDurum: TeklifDurum) {
    // Reddedildi VE İptal sebep ister — modalı aç, ön-seçim olarak gelsin
    if (yeniDurum === 'reddedildi' || yeniDurum === 'iptal') {
      setSonucModalTeklif({ ...teklif, durum: yeniDurum });
      return;
    }
    // Onaylandı (veya diger acik durumlar) — direkt yaz, detay yok
    sonucYaz(teklif, {
      durum: yeniDurum,
      sonucTarihi: new Date().toISOString(),
      kayipSebebi: undefined,
      rakipFirma: undefined,
    });
  }

  return (
    <>
      {/* Breadcrumb — geri butonu pratik boyutta (text yerine outline border).
          Ayrıca büyük tıklama hedefi olarak rahat kullanılır. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button
          type="default"
          icon={<ArrowLeftOutlined />}
          onClick={onGeri}
          style={{
            height: 34,
            padding: '0 14px',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 6,
          }}
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

  // (Önceden burada "✎ Revize" rozeti durum sütununa eklenmişti — kullanıcı
  // tercihiyle kaldırıldı. Revize bilgisi artık teklif numarasındaki '-RevN'
  // suffix'inden vurgulanıyor; durum sütunu sade kalır.)

  return (
    // Ortalanmış — chip + (varsa) Sonuç gir butonu hücre merkezi etrafında
    // toplanır. Yanıp sönen nokta kullanıcı tercihiyle kaldırıldı.
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
          <Tooltip
            title={yanitBekleniyor ? `Sonuç gir — ${gunFark} gündür yanıt bekleniyor` : 'Sonuç gir'}
            mouseEnterDelay={0.25}
          >
            <button
              type="button"
              aria-label="Sonuç gir"
              onClick={(e) => e.stopPropagation()}
              className={yanitBekleniyor ? 'sonuc-buton-pulse' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24, height: 24,
                padding: 0,
                borderRadius: 5,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b5fd9 100%)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.08)',
                cursor: 'pointer',
                transition: 'transform 0.10s, box-shadow 0.15s, filter 0.15s',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'translateY(-1px)';
                el.style.filter = 'brightness(1.10)';
                el.style.boxShadow = '0 2px 6px rgba(30,64,175,0.35), inset 0 1px 0 rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'translateY(0)';
                el.style.filter = 'none';
                el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.08)';
              }}
            >
              <FlagOutlined style={{ fontSize: 11 }} />
            </button>
          </Tooltip>
        </Dropdown>
      )}

    </div>
  );
}

// Sonuç dropdown menüsünde küçük etiket — durum bazlı, sade
function DurumMenuLabel({ durum, hint }: { durum: TeklifDurum; hint: string }) {
  const { isDark } = useTheme();
  // Etiket kendi durum rengiyle gosterilir (gorsel taninma kolaylasir).
  // Dark mode'da daha acik tonlar kullanilir; ipucu metni notr kalir.
  const cfg = isDark ? DURUM_CFG_DARK[durum] : DURUM_CFG[durum];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, padding: '2px 0' }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: cfg.color, flexShrink: 0,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
        <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.2 }}>{hint}</span>
      </div>
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
  // Sade modal: sebep + (reddedildi'de) rakip firma + opsiyonel not.
  // Durum dışarıdan zaten reddedildi veya iptal olarak gelir.
  const [sebep, setSebep] = useState<KayipSebebi | undefined>();
  const [rakip, setRakip] = useState('');
  const [not, setNot] = useState('');

  useEffect(() => {
    if (teklif) {
      setSebep(teklif.kayipSebebi);
      setRakip(teklif.rakipFirma ?? '');
      setNot(teklif.sonucNotu ?? '');
    }
  }, [teklif]);

  function kaydet() {
    if (!teklif) return;
    const durum = teklif.durum;
    const patch: Partial<Teklif> = {
      durum,
      sonucTarihi: new Date().toISOString(),
      kayipSebebi: sebep,
      rakipFirma: durum === 'reddedildi' ? (rakip.trim() || undefined) : undefined,
      sonucNotu: not.trim() || undefined,
    };
    onSave(patch);
  }

  if (!teklif) return null;

  const okDisabled = !sebep;
  const baslik = teklif.durum === 'iptal' ? 'İptal — Sebep' : 'Reddedildi — Sebep';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={kaydet}
      okButtonProps={{ disabled: okDisabled }}
      title={baslik}
      okText="Kaydet"
      cancelText="Vazgeç"
      width={420}
      destroyOnHidden
    >
      <Select
        value={sebep}
        onChange={(v) => setSebep(v)}
        placeholder="Sebep seçin"
        style={{ width: '100%' }}
        status={!sebep ? 'warning' : undefined}
        options={(Object.keys(KAYIP_SEBEBI_LABEL) as KayipSebebi[]).map((k) => ({
          value: k, label: KAYIP_SEBEBI_LABEL[k],
        }))}
      />
      {teklif.durum === 'reddedildi' && (
        <Input
          placeholder="Rakip firma (opsiyonel)"
          value={rakip}
          onChange={(e) => setRakip(e.target.value)}
          maxLength={100}
          style={{ marginTop: 10 }}
        />
      )}
      <Input.TextArea
        value={not}
        onChange={(e) => setNot(e.target.value)}
        rows={3}
        placeholder="Not (opsiyonel)"
        maxLength={500}
        style={{ marginTop: 10 }}
      />
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
  const silinebilir = !(['onaylandi', 'reddedildi', 'iptal'] as TeklifDurum[]).includes(teklif.durum);

  // Gösterge lambası — gönderilmiş ve 3+ gün eski mi?
  const hasOverdueOffers = useMemo(() => {
    if (teklif.durum !== 'gonderildi') return false;
    const tarih = teklif.guncellemeTarihi || teklif.tarih;
    if (!tarih) return false;
    const teklifTarihi = new Date(tarih);
    const gunFarki = Math.floor((new Date().getTime() - teklifTarihi.getTime()) / (1000 * 60 * 60 * 24));
    return gunFarki >= 3;
  }, [teklif.durum, teklif.guncellemeTarihi, teklif.tarih]);


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
        overflow: 'visible',
        transition: 'box-shadow 0.14s',
        position: 'relative',
      }}
    >
      {/* Gösterge lambası — gönderilmiş 3+ gün eski mi? */}
      {hasOverdueOffers && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'rgba(255, 152, 0, 0.9)',
            animation: 'klasorLambaGlow 2s ease-in-out infinite',
            zIndex: 10,
            border: '1px solid rgba(255, 200, 87, 0.5)',
          }}
        />
      )}
      
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
              }}
            >
              <TeklifNoEtiket teklifNo={teklif.teklifNo} />
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
            {silinebilir ? (
              <Popconfirm
                title="Teklif silinecek"
                description="Bu işlem geri alınamaz. Emin misiniz?"
                onConfirm={() => onSil(teklif.id)}
                okText="Sil"
                cancelText="İptal"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="Teklifi Sil"
                  style={{ ...actionButtonStyle, color: isDark ? '#f87171' : '#dc2626' }}
                  className={buttonClassNames.smallActionDanger}
                />
              </Popconfirm>
            ) : (
              <Tooltip title="Sonuçlanmış teklifler silinemez" mouseEnterDelay={0.25}>
                <Button
                  type="text"
                  size="small"
                  danger
                  disabled
                  icon={<DeleteOutlined />}
                  aria-label="Teklifi Sil"
                  style={{ ...actionButtonStyle, color: C.textFaint }}
                  className={buttonClassNames.smallActionDanger}
                />
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
