import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Dropdown, Input, Modal, Popconfirm, Segmented, Tooltip } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  CaretDownOutlined,
  FlagOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { PremiumPdfBadge } from '../components/premium-icons';
import { YoneticiOzeti } from '../components/YoneticiOzeti';
import SonucModal from '../components/SonucModal';
import {
  computeYoneticiOzeti,
  type YoneticiOzetiData,
} from './teklifListesiShared';
import { teklifService } from '../services/teklifService';
import { cariService } from '../services/musteriService';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import type { Teklif, TeklifDurum, Cari, Kullanici } from '../types';
import { formatCurrency, formatDate, formatCariAdi } from '../utils/formatters';
import { klasorAdiUret } from '../utils/folderUtils';
import { api } from '../services/apiClient';
import { useKullanici } from '../context/useKullanici';
import { isYonetici } from '../utils/yetkiUtils';
import { useIsMobile } from '../hooks/useIsMobile';
import { buttonClassNames } from '../styles/buttonStyles';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../context/useTheme';
import { useSayfaRehberi } from '../hooks/useSayfaRehberi';
import { TEKLIF_LISTESI_TIPLERI } from './TeklifListesi.tips';

// SONUC_CFG, KAYIP_SEBEBI_LABEL, computeYoneticiOzeti, YoneticiOzetiData
// → ./teklifListesiShared'e taşındı (react-refresh constraint).
// YoneticiOzeti component → ../components/YoneticiOzeti'e taşındı.

// ─── Sabitler ────────────────────────────────────────────────────────────────

const DURUM_CFG: Record<TeklifDurum, { label: string; color: string; bg: string; border: string }> = {
  taslak:           { label: 'Hazırlanıyor',    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  hazir:            { label: 'Hazır',           color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  gonderildi:       { label: 'Gönderildi',      color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  onaylandi:        { label: 'Onaylandı',       color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  kismi_onaylandi:  { label: 'Kısmi Onay',      color: '#d97706', bg: '#fffbeb', border: '#fed7aa' },
  siparis_alindi:   { label: 'Siparişe Döndü',  color: '#047857', bg: '#d1fae5', border: '#6ee7b7' },
  reddedildi:       { label: 'Reddedildi',      color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  iptal:            { label: 'İptal',           color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
};

const DURUM_CFG_DARK: Record<TeklifDurum, { label: string; color: string; bg: string; border: string }> = {
  taslak:           { label: 'Hazırlanıyor',    color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
  hazir:            { label: 'Hazır',           color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.22)'  },
  gonderildi:       { label: 'Gönderildi',      color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)'  },
  onaylandi:        { label: 'Onaylandı',       color: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.22)'  },
  kismi_onaylandi:  { label: 'Kısmi Onay',      color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(253,186,116,0.30)' },
  siparis_alindi:   { label: 'Siparişe Döndü',  color: '#10b981', bg: 'rgba(16,185,129,0.14)',  border: 'rgba(16,185,129,0.30)'  },
  reddedildi:       { label: 'Reddedildi',      color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' },
  iptal:            { label: 'İptal',           color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
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

/** Dakikada bir tick eden "şimdi" timestamp'i. Component'lerde
 *  Date.now() render scope'unda çağırmak yerine bu hook'tan alınır;
 *  React 19 purity kuralı korunur ve gün-fark hesapları taze kalır. */
function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
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
  /** 2+ gündür gönderildi durumda kalan ve sonucu girilmemiş teklif sayısı —
   *  klasör kartında lamba uyarısı için. */
  ikiGunDurumsuzSayi: number;
}

function buildFolders(teklifler: Teklif[], cariMap: Map<string, Cari>): CustomerFolder[] {
  const map = new Map<string, CustomerFolder>();

  const ikiGunEsigi = Date.now() - 2 * 24 * 60 * 60 * 1000;

  for (const t of teklifler) {
    const key = klasorAdiUret(t.cari.firmaAdi);
    if (!map.has(key)) {
      map.set(key, {
        klasorAdi: key,
        firmaAdiDisplay: formatCariAdi(t.cari.firmaAdi),
        teklifler: [],
        sonTarih: t.tarih,
        topHazirlayanIds: [],
        durumDist: { taslak: 0, hazir: 0, gonderildi: 0, onaylandi: 0, kismi_onaylandi: 0, siparis_alindi: 0, reddedildi: 0, iptal: 0 },
        ikiGunDurumsuzSayi: 0,
      });
    }
    const folder = map.get(key)!;
    folder.teklifler.push(t);
    if (t.tarih > folder.sonTarih) folder.sonTarih = t.tarih;
    if (t.durum && folder.durumDist[t.durum] !== undefined) {
      folder.durumDist[t.durum] += 1;
    }
    // 2+ gün gönderildi durumda kalan teklifler — sonuç bekliyor.
    // NOT: guncellemeTarihi her cache değişikliğinde güncellenir (yanıltıcı);
    // teklifin asıl yazılma tarihi olarak olusturmaTarihi/tarih kullanılır.
    if (t.durum === 'gonderildi') {
      const ts = new Date(t.olusturmaTarihi || t.tarih).getTime();
      if (Number.isFinite(ts) && ts <= ikiGunEsigi) {
        folder.ikiGunDurumsuzSayi += 1;
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

// (wordmarkUret / STOP_WORDS / logoTileRengi / distinctiveWord
//  cari logo + wordmark + kategori subtitle kaldırıldığı için artık kullanılmıyor — silindi.)


// ─── Filtre tipi ─────────────────────────────────────────────────────────────

type Filtre = 'benim' | 'tumu' | 'aktiflik' | 'atanan';
type Gorunum = 'klasorler' | 'detay';
type Siralama = 'alfabe' | 'aktiflik' | 'teklifSayisi';
type GorunumModu = 'grid' | 'liste';

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function TeklifListesi() {
  useSayfaRehberi(TEKLIF_LISTESI_TIPLERI, { sayfaAdi: 'Teklif Listesi' });
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
    if (saved === 'tumu' || saved === 'atanan' || saved === 'aktiflik') return saved;
    return 'benim';
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

  // ── Sahiplik kilidi: silme (Faz 15a, Plan agent denetimi) ───────────
  // NE: Çalışan sadece KENDİ tekliflerini silebilir; yönetici (super/firma
  //     admin) tüm tekliflere yetkili. UI kart üzerinde sil butonu zaten
  //     visibility ile gizlenebilir (Faz 12'de eklenir); bu fonksiyon
  //     defense-in-depth.
  // NEDEN: "Hiçbir personel başkasının teklifini ben yaptım diyemesin"
  //        (Mehmet Bey direktifi). Sil eylemi audit log için kritik —
  //        sadece sahip veya yönetici.
  function teklifSil(id: string) {
    const teklif = teklifler.find((t) => t.id === id);
    if (teklif) {
      const sahip = teklif.hazirlayanKullaniciId === aktifKullanici?.id;
      const yonetici = isYonetici(aktifKullanici?.rol);
      if (!sahip && !yonetici) {
        message.warning(
          `Bu teklifi yalnızca ${teklif.hazirlayanAdSoyad ?? 'hazırlayan kullanıcı'} veya yönetici silebilir.`,
        );
        return;
      }
    }
    teklifService.teklifSil(id);
    teklifleriYukle();
    message.success('Teklif başarıyla silindi.');
  }

  // ── Çoğalt akışı ────────────────────────────────────────────────────
  // Kart üzerinden Çoğalt'a basınca tek mini modal: Revize mi / yeni teklif mi.
  // Modal state üst seviyede; KlasorGorunumu ve DetayGorunumu kartlardan
  // sadece teklif objesini iletir.
  const [cogaltAdayi, setCogaltAdayi] = useState<Teklif | null>(null);

  async function cogaltUygula(mod: 'revize' | 'yeni') {
    const kaynak = cogaltAdayi;
    setCogaltAdayi(null);
    if (!kaynak) return;
    const ki = aktifKullanici
      ? {
          id: aktifKullanici.id,
          adSoyad: aktifKullanici.adSoyad,
          rol: aktifKullanici.rol,
          unvan: aktifKullanici.unvan,
        }
      : undefined;
    if (mod === 'revize') {
      const yeni = teklifService.revizeOlustur(kaynak.id, ki);
      if (yeni) {
        teklifService.teklifKaydet(yeni);
        teklifleriYukle();
        message.success(`Revize oluşturuldu: ${yeni.teklifNo}`);
        navigate(`/teklif/${yeni.id}`);
      }
    } else {
      const yeni = teklifService.teklifKopyala(kaynak.id, ki);
      if (yeni) {
        const teklifNo = await teklifService.teklifNoUretAsync();
        teklifService.teklifKaydet({ ...yeni, teklifNo });
        teklifleriYukle();
        message.success(`Yeni teklif: ${teklifNo}`);
        navigate(`/teklif/${yeni.id}`);
      }
    }
  }

  function teklifCogaltBaslat(t: Teklif) {
    setCogaltAdayi(t);
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
    if (aktifFiltre === 'atanan') return teklifler.filter((t) => t.ilgiliKisiId === benimId);
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
  const atananSayisi  = useMemo(() => teklifler.filter((t) => t.ilgiliKisiId === benimId).length, [teklifler, benimId]);
  const tumSayisi     = teklifler.length;

  // ── Yönetici özeti — yalnızca super_admin/firma_admin için ───────────────
  const isAdmin = useMemo(() => isYonetici(aktifKullanici?.rol), [aktifKullanici]);

  const yoneticiOzeti = useMemo(() => {
    if (!isAdmin) return null;
    return computeYoneticiOzeti(teklifler);
  }, [teklifler, isAdmin]);

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
          benimSayisi={benimSayisi}
          atananSayisi={atananSayisi}
          tumSayisi={tumSayisi}
          yoneticiOzeti={yoneticiOzeti}
          aktifKullaniciAd={aktifKullanici?.adSoyad ?? ''}
          onKlasorTikla={klasoreGir}
          onCariGuncelle={updateCariLocal}
          navigate={navigate}
          benimId={benimId}
          onSil={teklifSil}
          onCogalt={teklifCogaltBaslat}
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
          benimSayisi={benimSayisi}
          atananSayisi={atananSayisi}
          tumSayisi={tumSayisi}
          benimId={benimId}
          navigate={navigate}
          onGeri={klasordenCik}
          onSil={teklifSil}
          onCogalt={teklifCogaltBaslat}
          onRefresh={teklifleriYukle}
        />
      )}

      {/* Çoğalt mini modal — kullanıcı revize / yeni teklif arasında seçer */}
      <Modal
        open={!!cogaltAdayi}
        onCancel={() => setCogaltAdayi(null)}
        title="Çoğalt"
        width={400}
        centered
        destroyOnHidden
        footer={[
          <Button key="cancel" onClick={() => setCogaltAdayi(null)}>
            Vazgeç
          </Button>,
          <Button key="kopya" onClick={() => void cogaltUygula('yeni')}>
            Yeni Teklif
          </Button>,
          <Button key="rev" type="primary" onClick={() => void cogaltUygula('revize')}>
            Revize
          </Button>,
        ]}
      >
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>
          <strong style={{ color: C.textPrimary }}>{cogaltAdayi?.teklifNo}</strong>
          {' — '}
          {cogaltAdayi?.cari?.firmaAdi}
          <div style={{ marginTop: 10 }}>
            Bu teklifi <strong>revize</strong> olarak mı oluşturmak istersin?
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: C.textFaint }}>
            Revize → aynı teklif numarası altında <code>-Rev</code> olarak.
            <br />
            Yeni Teklif → bağımsız yeni numara, geçmiş zinciri yok.
          </div>
        </div>
      </Modal>
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
  benimSayisi: number;
  atananSayisi: number;
  tumSayisi: number;
  yoneticiOzeti: YoneticiOzetiData | null;
  aktifKullaniciAd: string;
  onKlasorTikla: (k: string) => void;
  onCariGuncelle: (c: Cari) => void;
  navigate: (path: string) => void;
  // Aktivite (flat) mod için gerekli ek aksiyonlar:
  benimId: string | undefined;
  onSil: (id: string) => void;
  onCogalt: (t: Teklif) => void;
  onRefresh: () => void;
}

// Segmented control label tipografi — Tekliflerim üst sekmeleri için
// Apple SF Pro tarzı premium görünüm. macOS/iOS'ta gerçek SF Pro, diğer
// platformlarda en yakın fallback (Helvetica Neue → system-ui).
const kapsamLabelStyle: CSSProperties = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Inter", system-ui, "Segoe UI", sans-serif',
  fontWeight: 600,
  fontSize: 13,
  letterSpacing: '-0.005em',
  lineHeight: 1,
};
// Görünüm segmented (Klasör/Liste) — ikon + etiket konteyneri.
// Sabit minWidth → iki cell aynı genişlikte; justifyContent center → içerik
// her cell içinde merkez. İkon kutusu sabit boyutta, içeride ortalı.
const gorunumLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  minWidth: 112,
  height: 32,
};
const gorunumIkonKutusu: CSSProperties = {
  width: 30,
  height: 30,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
// Sayım rozeti — etiketin yanında ince oval. Tabular nums, biraz daha
// faint renk; etiketle aynı satırda nefes alır.
const kapsamSayiStyle: CSSProperties = {
  display: 'inline-block',
  marginLeft: 8,
  padding: '1px 7px',
  fontSize: 11,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  color: 'inherit',
  background: 'rgba(15, 31, 69, 0.10)',
  borderRadius: 999,
  letterSpacing: 0,
};

function KlasorGorunumu({
  isMobile, C, teklifler, klasorler, kullaniciMap, aramaMetni, setAramaMetni,
  aktifFiltre, setAktifFiltre, siralama, setSiralama, gorunumModu, setGorunumModu,
  benimSayisi, atananSayisi, tumSayisi,
  yoneticiOzeti, aktifKullaniciAd, onKlasorTikla, onCariGuncelle,
  navigate, benimId, onSil, onCogalt, onRefresh,
}: KlasorGorunumuProps) {
  const { isDark } = useTheme();
  const { aktifKullanici } = useKullanici();
  const { message, modal } = App.useApp();

  // Navigasyon: kapsam (Filtre) ve görünüm (siralama) artık 2 ayrı segmented
  // control ile yönetiliyor — bağımsız boyutlar. Eski derived flag'ler ve
  // dual-state setter fonksiyonları kaldırıldı.
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
    // Kismi onay: modal yerine A4 sayfasinda inline secim (yeni UX).
    // Editor sayfasi ?action=kismi-onay query'sini gorunce otomatik
    // secim modunu baslatir.
    if (yeniDurum === 'kismi_onaylandi') {
      navigate(`/teklif/${teklif.id}?action=kismi-onay`);
      return;
    }
    // Diger sonuc durumlarinda hala modal:
    //  - reddedildi / iptal → sebep girişi modu
    //  - onaylandi          → satır seçimi modu
    if (
      yeniDurum === 'reddedildi' ||
      yeniDurum === 'iptal' ||
      yeniDurum === 'onaylandi'
    ) {
      setSonucModalTeklif({ ...teklif, durum: yeniDurum });
      return;
    }
    // Kismi onaydan geri donulurken (taslak/hazir/gonderildi) iptal
    // isaretleri temizlenir ve toplamlar yeniden hesaplanir; aksi halde
    // analitik/listede dusuk tutar gorunur.
    const satirReset = teklif.durum === 'kismi_onaylandi' && teklif.satirlar?.some((s) => s.onayDurumu);
    const patch: Partial<Teklif> = {
      durum: yeniDurum, sonucTarihi: new Date().toISOString(),
      kayipSebebi: undefined, rakipFirma: undefined,
    };
    if (satirReset) {
      const temiz = teklif.satirlar.map((s) => {
        if (!s.onayDurumu) return s;
        const r = { ...s };
        delete r.onayDurumu;
        return r;
      });
      const toplamlar = hesaplamaMotoru.genelToplamHesapla(
        temiz, teklif.kdvOrani, teklif.iskontoOrani, teklif.paraBirimi,
      );
      patch.satirlar = temiz;
      patch.araToplam = toplamlar.araToplam;
      patch.toplamIndirim = toplamlar.toplamIndirim;
      patch.toplamVergi = toplamlar.kdvTutar;
      patch.genelToplam = toplamlar.genelToplam;
    }
    sonucYaz(teklif, patch);
  }

  // ── Sahiplik kilidi (Faz 15a, Mehmet Bey direktifi 2026-05-26) ──────
  // NE: Çalışan başkasının teklifini sonuçlandıramaz; sadece hazırlayan
  //     veya yönetici (super_admin/firma_admin) durum dropdown'undan
  //     işlem yapabilir. UI'da disabled + tooltip; ek olarak
  //     hizliSonuc'a defense-in-depth guard.
  // NEDEN: Plan agent denetimi (2026-05-26): "TeklifListesi'nde çalışan
  //        başkasının teklifinin durumunu dropdown'dan değiştirebilir →
  //        Mehmet Bey'in audit/sahiplik talebiyle çelişir". Faz 12
  //        kapsamında "kim ne yaptı kayıt altında" mantığının frontend
  //        ayağı.
  // NASIL: Karşılaştır teklif.hazirlayanKullaniciId === aktifKullanici.id
  //        VEYA isYonetici(rol). Yoksa erken return + bilgi mesajı.
  function hizliSonuc(teklif: Teklif, yeniDurum: TeklifDurum) {
    const sahip = teklif.hazirlayanKullaniciId === aktifKullanici?.id;
    const yonetici = isYonetici(aktifKullanici?.rol);
    if (!sahip && !yonetici) {
      message.warning(
        `Bu teklif ${teklif.hazirlayanAdSoyad ?? 'başka bir kullanıcı'} tarafından hazırlanmış. Sonuç bilgisini yalnızca hazırlayan veya yönetici güncelleyebilir.`,
      );
      return;
    }
    const KAPALI: TeklifDurum[] = ['onaylandi', 'kismi_onaylandi', 'reddedildi', 'iptal'];
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
  // yapılmadan), kart üzerinde GÖRÜNEN `tarih` alanına göre en yeniden
  // eskiye sıralı. Aynı tarihte ise olusturmaTarihi/guncellemeTarihi ile
  // tie-break (daha yeni güncellenmiş olan üstte).
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
      const ta = a.tarih || a.olusturmaTarihi || a.guncellemeTarihi || '';
      const tb = b.tarih || b.olusturmaTarihi || b.guncellemeTarihi || '';
      const cmp = tb.localeCompare(ta);
      if (cmp !== 0) return cmp;
      const ua = a.guncellemeTarihi || a.olusturmaTarihi || '';
      const ub = b.guncellemeTarihi || b.olusturmaTarihi || '';
      return ub.localeCompare(ua);
    });
  }, [teklifler, aramaMetni]);
  const ilkAd = aktifKullaniciAd ? aktifKullaniciAd.split(/\s+/)[0] : '';
  const saat = new Date().getHours();
  const selam = saat < 6 ? 'İyi geceler' : saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
  return (
    <>
      {/* Başlık + Hoşgeldin */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          Tekliflerim
        </div>
        <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6, fontWeight: 400, letterSpacing: '0.005em' }}>
          {ilkAd ? `${selam}, ${ilkAd}.` : selam} Bugün ne ekleyelim?
        </div>
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

      {/* ═══════════════════════════════════════════════════════════════════
          LEVEL 1 — İki segmented control + CTA butonlar
          Sol: Görünüm (Klasör/Liste) + Kapsam (Benim/Tümü/Atanan)
          Sağ: Malzeme Hareketleri + Yeni Teklif
          Eski 4 ayrı widget (klasör kartları + PDF segments + Atanan pill) tek
          tek matriks haline geldi — aynı veri iki yerde sayılmıyor, label
          tekrarı yok.
          ─────────────────────────────────────────────────────────────────── */}
      <div className="app-ops-l1">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Segmented
            size="large"
            className="gorunum-segmented"
            value={siralama === 'aktiflik' ? 'liste' : 'klasor'}
            onChange={(v) => setSiralama(v === 'liste' ? 'aktiflik' : 'alfabe')}
            options={[
              {
                value: 'klasor',
                label: (
                  <span style={gorunumLabelStyle}>
                    <span style={gorunumIkonKutusu}>
                      <PremiumKlasorIcon size={28} />
                    </span>
                    <span style={kapsamLabelStyle}>Klasör</span>
                  </span>
                ),
              },
              {
                value: 'liste',
                label: (
                  <span style={gorunumLabelStyle}>
                    <span style={gorunumIkonKutusu}>
                      <PremiumPdfBadge size={28} />
                    </span>
                    <span style={kapsamLabelStyle}>Liste</span>
                  </span>
                ),
              },
            ]}
          />
          <Segmented
            size="large"
            value={aktifFiltre}
            onChange={(v) => setAktifFiltre(v as Filtre)}
            options={[
              {
                value: 'benim',
                label: (
                  <span style={kapsamLabelStyle}>
                    Benim <span style={kapsamSayiStyle}>{benimSayisi}</span>
                  </span>
                ),
              },
              {
                value: 'tumu',
                label: (
                  <span style={kapsamLabelStyle}>
                    Tümü <span style={kapsamSayiStyle}>{tumSayisi}</span>
                  </span>
                ),
              },
              {
                value: 'atanan',
                label: (
                  <span style={kapsamLabelStyle}>
                    Atanan <span style={kapsamSayiStyle}>{atananSayisi}</span>
                  </span>
                ),
              },
            ]}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Malzeme Hareketleri — secondary action. Kullanıcı yeni teklif
              yapmadan önce ürünün fiyat geçmişine bakar. Yeni Teklif CTA'sının
              solunda ikincil ağırlıkta. */}
          <Tooltip title="Bir ürünün geçmiş fiyatlarına ve müşterilerine bak" mouseEnterDelay={0.3}>
            <Button
              size="large"
              icon={<LineChartOutlined />}
              onClick={() => navigate('/malzeme-hareketleri')}
              style={{ height: 44, fontWeight: 600, paddingLeft: 16, paddingRight: 16, letterSpacing: '0.005em' }}
            >
              Malzeme Hareketleri
            </Button>
          </Tooltip>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            data-tip-target="yeni-teklif"
            className={buttonClassNames.primary}
            onClick={() => navigate('/teklif/yeni')}
            style={{ height: 44, fontWeight: 600, paddingLeft: 18, paddingRight: 18, letterSpacing: '0.005em' }}
          >
            Yeni Teklif
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          LEVEL 2 — Arama + (klasör modunda) ızgara/liste düzeni
          PDF Geçmişi ve Bana Atanan kontrolleri LEVEL 1 segmented'lara
          taşındı; burası sadece yardımcı.
          ─────────────────────────────────────────────────────────────────── */}
      <div className="app-ops-l2">
        <div className="app-ops-l2-tools" style={{ marginLeft: 'auto' }}>
          <Input
            placeholder="Müşteri veya klasör ara..."
            prefix={<SearchOutlined style={{ color: C.textFaint }} />}
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            allowClear
            className="app-ops-search"
            data-tip-target="liste-arama"
          />
          {siralama !== 'aktiflik' && (
            <div className="app-ops-view-toggle" data-tip-target="liste-gorunum-modu">
              {([
                { k: 'grid' as GorunumModu,  l: 'Izgara', icon: GridIcon },
                { k: 'liste' as GorunumModu, l: 'Liste',  icon: ListIcon },
              ]).map(({ k, l, icon: Icon }) => {
                const aktif = gorunumModu === k;
                return (
                  <Tooltip key={k} title={l} mouseEnterDelay={0.3}>
                    <button
                      type="button"
                      onClick={() => setGorunumModu(k)}
                      aria-label={l}
                      className={`app-ops-view-btn${aktif ? ' is-active' : ''}`}
                    >
                      <Icon active={aktif} />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sayım satırı (yalnız bilgi) */}
      <div className="app-ops-meta">
        <span className="app-ops-meta-count">
          {siralama === 'aktiflik'
            ? `${aktiviteler.length} teklif`
            : `${klasorler.length} müşteri`}
        </span>
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
                onCogalt={onCogalt}
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
        key={sonucModalTeklif?.id ?? 'closed-aktivite'}
        open={sonucModalTeklif !== null}
        teklif={sonucModalTeklif}
        onClose={() => setSonucModalTeklif(null)}
        onSave={modalSave}
      />
    </>
  );
}

// YoneticiOzeti component → ../components/YoneticiOzeti.tsx (top import)

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
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
        gap: isMobile ? 5 : 6,
      }
    : {
        display: 'grid',
        gridTemplateColumns: isMobile
          ? 'repeat(auto-fill, minmax(150px, 1fr))'
          : 'repeat(auto-fill, minmax(184px, 1fr))',
        gap: isMobile ? 7 : 8,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: liste ? 9 : 11 }}>
      {harfler.map((harf) => {
        const grup = harfGruplari.get(harf)!;
        return (
          <div key={harf}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: liste ? 4 : 5,
              paddingBottom: 2,
              borderBottom: `1px solid ${C.borderSubtle}`,
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: C.textFaint,
                letterSpacing: '0.08em',
                lineHeight: 1,
                opacity: 0.55,
                textTransform: 'uppercase',
              }}>
                {harf}
              </span>
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

function KlasorSatiri({ klasor, isMobile, C, kullaniciMap, onClick }: KlasorSatiriProps) {
  const { isDark } = useTheme();
  const [hover, setHover] = useState(false);

  // Gösterge lambası — gönderilmiş ve 2+ gün eski mi?
  const hasOverdueOffers = useMemo(() => {
    const bugun = new Date();
    return klasor.teklifler.some((t) => {
      if (t.durum !== 'gonderildi') return false;
      const tarih = t.guncellemeTarihi || t.tarih;
      if (!tarih) return false;
      const teklifTarihi = new Date(tarih);
      const gunFarki = Math.floor((bugun.getTime() - teklifTarihi.getTime()) / (1000 * 60 * 60 * 24));
      return gunFarki >= 2;
    });
  }, [klasor.teklifler]);

  const hazirlayanlar = klasor.topHazirlayanIds
    .map((id) => kullaniciMap.get(id))
    .filter((k): k is Kullanici => Boolean(k));

  const isim = formatCariAdi(klasor.firmaAdiDisplay) || klasor.firmaAdiDisplay;

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
          ? '52px minmax(0, 1fr) auto'
          : '52px minmax(0, 1fr) auto auto auto',
        alignItems: 'center',
        gap: isMobile ? 8 : 10,
        padding: isMobile ? '8px 10px' : '8px 12px',
        borderRadius: 7,
        background: hover
          ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,30,60,0.05)')
          : (isDark ? 'rgba(255,255,255,0.055)' : 'rgba(15,30,60,0.025)'),
        border: `1px solid ${hover ? (isDark ? 'rgba(255,255,255,0.20)' : 'rgba(15,30,60,0.16)') : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,30,60,0.10)')}`,
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        transition: 'background 0.14s ease, border-color 0.14s ease',
        overflow: 'visible',
      }}
    >
      {/* Gösterge lambası — gönderilmiş 2+ gün eski mi? */}
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
        width: 52,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <PremiumKlasorIcon size={48} isDark={isDark} />
      </div>

      {/* İsim + sektör */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-primary, inherit)',
          letterSpacing: '-0.01em',
          lineHeight: 1.25,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          overflow: 'visible',
          display: 'block',
          WebkitLineClamp: 'unset',
        }}>
          {isim}
        </div>
      </div>

      {/* Teklif sayısı (yanıp sönen nokta kullanıcı tercihiyle kaldırıldı) */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 500 }}>
            {klasor.teklifler.length} teklif
          </span>
        </div>
      )}

      {/* Tarih (mobile gizli) */}
      {!isMobile && (
        <div style={{ fontSize: 10, color: C.textFaint, fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(klasor.sonTarih)}
        </div>
      )}

      {/* Avatarlar — liste satırında da grid karttakiyle aynı büyük boy. */}
      <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start' }}>
        {hazirlayanlar.length > 0 && hazirlayanlar.slice().reverse().map((k, i) => (
          <Tooltip key={k.id} title={k.adSoyad} mouseEnterDelay={0.3}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `2px solid ${C.bgSurface}`,
              marginLeft: i === 0 ? 0 : -9,
              background: k.profilFotoUrl ? '#0b1220' : (isDark ? '#1f2937' : '#e2e8f0'),
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: isDark ? '#cbd5e1' : '#475569',
              flexShrink: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.10)',
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

// ─── Premium Klasör İkonu — 3D rendered PNG (transparent bg) ────────────────
// Vite asset import ile import edilir; build sırasında hash'lenip optimize
// edilir, production'da statik serve. SVG yerine PNG kullanma sebebi: 3D
// rendered (claymorphism) görsel SVG ile birebir yeniden çizilemiyordu.
import folderIconPng from '../components/premium-icons/png-transparent-folder-3d-icon.png';

function PremiumKlasorIcon({ size = 72, isDark = false }: { size?: number; isDark?: boolean }) {
  void isDark;
  return (
    <img
      src={folderIconPng}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      style={{
        display: 'block',
        objectFit: 'contain',
        // Dark mode'da transparan PNG zaten temadan bağımsız okunur; ekstra
        // filter gerekmez. PNG zaten kendi içinde gerekli kontrastı içerir.
      }}
      draggable={false}
    />
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

  // Pulse kontrolü — gönderilmiş ve 2+ gün eski teklifler var mı?
  const hasOverdueOffers = useMemo(() => {
    const bugun = new Date();
    return klasor.teklifler.some((t) => {
      if (t.durum !== 'gonderildi') return false;
      const tarih = t.guncellemeTarihi || t.tarih;
      if (!tarih) return false;
      const teklifTarihi = new Date(tarih);
      const gunFarki = Math.floor((bugun.getTime() - teklifTarihi.getTime()) / (1000 * 60 * 60 * 24));
      return gunFarki >= 2;
    });
  }, [klasor.teklifler]);

  const hazirlayanlar = klasor.topHazirlayanIds
    .map((id) => kullaniciMap.get(id))
    .filter((k): k is Kullanici => Boolean(k));

  // Premium B2B kart yüzeyi — sayfa zemininden belirgin ayrılır
  const cardBg = isDark ? '#1F2533' : '#FFFFFF';
  const cardBgHover = isDark ? '#262D3D' : '#F7F4ED';

  const cardStyle: CSSProperties = {
    background: hover ? cardBgHover : cardBg,
    border: `1px solid ${hover ? (isDark ? 'rgba(255,255,255,0.16)' : '#CDC7BD') : (isDark ? 'rgba(255,255,255,0.10)' : '#D7D3CC')}`,
    borderRadius: 9,
    cursor: 'pointer',
    transition: 'background 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
    userSelect: 'none',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: hover
      ? (isDark ? '0 3px 10px rgba(0,0,0,0.28)' : '0 2px 6px rgba(40,30,15,0.05)')
      : 'none',
  };

  const logoSize = 54;
  // Premium klasör ikon kutusu — liste görünümüne yakın oran (liste 48 px),
  // operasyon dosya yöneticisi yoğunluğunda ama premium hissi koruyacak boy.
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
      {/* Gösterge lambası — gönderilmiş 2+ gün eski teklifler varsa */}
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
        alignItems: 'center',
        gap: 9,
        padding: isMobile ? '6px 9px 5px' : '6px 10px 5px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={logoBoxStyle}>
          <PremiumKlasorIcon size={logoSize} isDark={isDark} />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary, inherit)',
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            overflow: 'visible',
            display: 'block',
            WebkitLineClamp: 'unset',
          }}>
            {formatCariAdi(klasor.firmaAdiDisplay) || klasor.firmaAdiDisplay}
          </div>
        </div>
      </div>

      {/* Ayraç */}
      <div style={{ height: 1, background: C.borderSubtle, margin: '0 10px', position: 'relative', zIndex: 1 }} />

      {/* Alt meta */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        padding: isMobile ? '4px 9px 5px' : '4px 10px 6px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span style={{
            fontSize: 10,
            color: C.textSecondary,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.01em',
          }}>
            {klasor.teklifler.length} teklif
          </span>
          <span style={{
            fontSize: 10,
            color: C.textFaint,
            fontVariantNumeric: 'tabular-nums',
          }}>
            · {formatDate(klasor.sonTarih)}
          </span>
        </div>

        {/* Personel avatar yığını — büyütüldü: 17 → 28, fotoğrafı tanınabilir
            boy. Overlap -6 → -9 (büyük çaplı dairelere uyumlu). */}
        {hazirlayanlar.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'row-reverse', flexShrink: 0 }}>
            {hazirlayanlar.slice().reverse().map((k, i) => (
              <Tooltip key={k.id} title={k.adSoyad} mouseEnterDelay={0.3}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: `2px solid ${C.bgSurface}`,
                  marginLeft: i === 0 ? 0 : -9,
                  background: k.profilFotoUrl ? '#0b1220' : (isDark ? '#1f2937' : '#e2e8f0'),
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: isDark ? '#cbd5e1' : '#475569',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.10)',
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
  benimSayisi: number;
  atananSayisi: number;
  tumSayisi: number;
  benimId: string | undefined;
  navigate: (path: string) => void;
  onGeri: () => void;
  onSil: (id: string) => void;
  onCogalt: (t: Teklif) => void;
  /** Ust state'teki teklifler array'ini yeniden cek — durum/sonuc kaydedildikten
   *  sonra UI'in guncel veriyle re-render olmasi icin cagrilir. */
  onRefresh: () => void;
}

function DetayGorunumu({
  isMobile, C, klasorAdi, firmaAdiDisplay, teklifler, aramaMetni, setAramaMetni,
  aktifFiltre, setAktifFiltre,
  benimSayisi, atananSayisi, tumSayisi,
  benimId, navigate, onGeri, onSil, onCogalt,
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
    // Sahiplik kilidi — Faz 15a (Plan agent denetimi). Sadece hazırlayan
    // veya yönetici sonuç bilgisini değiştirebilir.
    const sahip = teklif.hazirlayanKullaniciId === aktifKullanici?.id;
    const yonetici = isYonetici(aktifKullanici?.rol);
    if (!sahip && !yonetici) {
      message.warning(
        `Bu teklif ${teklif.hazirlayanAdSoyad ?? 'başka bir kullanıcı'} tarafından hazırlanmış. Sonuç bilgisini yalnızca hazırlayan veya yönetici güncelleyebilir.`,
      );
      return;
    }
    // Sonuclanmis (onaylandi/reddedildi/iptal) durumdan baska bir duruma
    // gecis kullanicidan onay ister — kazanmis teklifi yanlislikla taslaga
    // dusurmemesi vs. icin koruyucu.
    const KAPALI: TeklifDurum[] = ['onaylandi', 'kismi_onaylandi', 'reddedildi', 'iptal'];
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
    // Kismi onay: modal yerine A4 sayfasinda inline secim (yeni UX).
    if (yeniDurum === 'kismi_onaylandi') {
      navigate(`/teklif/${teklif.id}?action=kismi-onay`);
      return;
    }
    // Diger sonuc durumlari modal:
    //  - reddedildi / iptal → sebep girişi modu
    //  - onaylandi          → satır seçimi modu
    if (
      yeniDurum === 'reddedildi' ||
      yeniDurum === 'iptal' ||
      yeniDurum === 'onaylandi'
    ) {
      setSonucModalTeklif({ ...teklif, durum: yeniDurum });
      return;
    }
    // Kismi onaydan geri donulurken iptal isaretleri temizlenir;
    // toplamlar yeniden hesaplanarak full degere doner.
    const satirReset = teklif.durum === 'kismi_onaylandi' && teklif.satirlar?.some((s) => s.onayDurumu);
    const patch: Partial<Teklif> = {
      durum: yeniDurum,
      sonucTarihi: new Date().toISOString(),
      kayipSebebi: undefined,
      rakipFirma: undefined,
    };
    if (satirReset) {
      const temiz = teklif.satirlar.map((s) => {
        if (!s.onayDurumu) return s;
        const r = { ...s };
        delete r.onayDurumu;
        return r;
      });
      const toplamlar = hesaplamaMotoru.genelToplamHesapla(
        temiz, teklif.kdvOrani, teklif.iskontoOrani, teklif.paraBirimi,
      );
      patch.satirlar = temiz;
      patch.araToplam = toplamlar.araToplam;
      patch.toplamIndirim = toplamlar.toplamIndirim;
      patch.toplamVergi = toplamlar.kdvTutar;
      patch.genelToplam = toplamlar.genelToplam;
    }
    sonucYaz(teklif, patch);
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

      {/* Filtreler + Arama — klasör içinde yalnızca scope filtresi anlamlı */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 272px',
        alignItems: 'center',
        columnGap: 16,
        rowGap: 10,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Segmented
            value={aktifFiltre === 'aktiflik' ? 'tumu' : aktifFiltre}
            onChange={(v) => setAktifFiltre(v as Filtre)}
            options={[
              { value: 'benim',  label: `Benim (${benimSayisi})` },
              { value: 'tumu',   label: `Tümü (${tumSayisi})` },
              { value: 'atanan', label: `Atanan (${atananSayisi})` },
            ]}
          />
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
                  onCogalt={onCogalt}
                  onSonucAc={() => setSonucModalTeklif(teklif)}
                  onSonucHizli={(sonuc) => hizliSonuc(teklif, sonuc)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <SonucModal
        key={sonucModalTeklif?.id ?? 'closed-klasor'}
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
  teklif, durumGosterim, onSonucHizli, now,
}: {
  teklif: Teklif;
  durumGosterim: { label: string; color: string; bg: string; border: string };
  onSonucAc: () => void;
  onSonucHizli: (sonuc: TeklifDurum) => void;
  C: ReturnType<typeof useColors>;
  /** Parent'tan geçirilen "şimdi" timestamp'i — render purity için Date.now() yerine. */
  now: number;
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

  // Chip'in 7-durum dropdown'u — durum değiştirme için
  const tumDurumlarMenu = [
    { key: 'taslak',          label: <DurumMenuLabel durum="taslak"          hint="Üzerinde çalışılıyor" />,         onClick: () => onSonucHizli('taslak') },
    { key: 'hazir',           label: <DurumMenuLabel durum="hazir"           hint="PDF üretildi" />,                 onClick: () => onSonucHizli('hazir') },
    { key: 'gonderildi',      label: <DurumMenuLabel durum="gonderildi"      hint="Müşteriye gönderildi" />,         onClick: () => onSonucHizli('gonderildi') },
    { type: 'divider' as const },
    { key: 'onaylandi',       label: <DurumMenuLabel durum="onaylandi"       hint="Tüm kalemler onaylandı" />,        onClick: () => onSonucHizli('onaylandi') },
    { key: 'kismi_onaylandi', label: <DurumMenuLabel durum="kismi_onaylandi" hint="Bazı kalemler iptal edildi" />,    onClick: () => onSonucHizli('kismi_onaylandi') },
    { key: 'reddedildi',      label: <DurumMenuLabel durum="reddedildi"      hint="Sebep girilir" />,                 onClick: () => onSonucHizli('reddedildi') },
    { key: 'iptal',           label: <DurumMenuLabel durum="iptal"           hint="Sebep girilir" />,                 onClick: () => onSonucHizli('iptal') },
  ];

  // Sonuç gir butonu — sadece Gönderildi'de görünür, 4 sonuç dropdown
  const sonucMenu = [
    { key: 'onaylandi',       label: <DurumMenuLabel durum="onaylandi"       hint="Müşteri tüm kalemleri onayladı" />, onClick: () => onSonucHizli('onaylandi') },
    { key: 'kismi_onaylandi', label: <DurumMenuLabel durum="kismi_onaylandi" hint="Bazı kalemler iptal edildi" />,     onClick: () => onSonucHizli('kismi_onaylandi') },
    { key: 'reddedildi',      label: <DurumMenuLabel durum="reddedildi"      hint="Sebep girilir" />,                  onClick: () => onSonucHizli('reddedildi') },
    { key: 'iptal',           label: <DurumMenuLabel durum="iptal"           hint="Sebep girilir" />,                  onClick: () => onSonucHizli('iptal') },
  ];

  // 2+ gündür gönderildi durumda kalan teklif → "Sonuç gir" butonunun yanında
  // belli belirsiz yanıp sönen amber dot (kullanıcının "müsait bir yer" tarifi)
  const olusTs = new Date(teklif.olusturmaTarihi || teklif.tarih).getTime();
  const gunFark = Number.isFinite(olusTs) ? Math.floor((now - olusTs) / (24 * 3600 * 1000)) : 0;
  const yanitBekleniyor = isGonderildi && gunFark >= 2;

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
  onCogalt: (t: Teklif) => void;
  onSonucAc: () => void;
  onSonucHizli: (yeniDurum: TeklifDurum) => void;
}

function TeklifKarti({ teklif, benim, isDark, C, navigate, onSil, onCogalt, onSonucAc, onSonucHizli }: TeklifKartiProps) {
  const isim = teklif.hazirlayanAdSoyad ?? '';
  const toplamSatirlari = teklifToplamOzeti(teklif);
  const renk = isim ? personelRenk(isim) : PALET[0];
  const inits = isim ? initials(isim) : '?';
  const durumGosterim =
    (isDark ? DURUM_CFG_DARK[teklif.durum] : DURUM_CFG[teklif.durum]) ??
    (isDark ? DURUM_CFG_DARK.taslak : DURUM_CFG.taslak);
  const silinebilir = !(['onaylandi', 'kismi_onaylandi', 'reddedildi', 'iptal'] as TeklifDurum[]).includes(teklif.durum);
  // Dakikada bir tick eden "şimdi" — gun farkı hesapları render purity'yi koruyarak taze kalır.
  const now = useNow();
  function pdfAc() {
    // Cloud/PWA ortamında window.open ayrı standalone window açıyordu
    // ("masaüstü uygulaması" gibi görünüyordu). Bunun yerine editor sayfasına
    // navigate ediyoruz — orada "PDF İndir" butonu zaten mevcut.
    navigate(`/teklif/${teklif.id}`);
  }

  // Gösterge lambası — gönderilmiş ve 2+ gün eski mi?
  const hasOverdueOffers = useMemo(() => {
    if (teklif.durum !== 'gonderildi') return false;
    const tarih = teklif.guncellemeTarihi || teklif.tarih;
    if (!tarih) return false;
    const teklifTarihi = new Date(tarih);
    const gunFarki = Math.floor((now - teklifTarihi.getTime()) / (1000 * 60 * 60 * 24));
    return gunFarki >= 2;
  }, [teklif.durum, teklif.guncellemeTarihi, teklif.tarih, now]);


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
      role="button"
      tabIndex={0}
      className="teklif-karti-button"
      onClick={pdfAc}
      onKeyDown={(e) => {
        // Klavye erişilebilirliği: Enter / Space karta basmak = aç.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pdfAc();
        }
      }}
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
        // hover/active/focus-visible state'leri index.css'te .teklif-karti-button
        // class'ı üzerinden yönetilir — translateY lift + shadow elevation + active press.
        // Inline'da SADECE base transition kalır; transform-origin GPU compositing icin.
        transition:
          'transform 180ms cubic-bezier(0.2, 0.7, 0.2, 1), ' +
          'box-shadow 180ms cubic-bezier(0.2, 0.7, 0.2, 1), ' +
          'border-color 180ms ease',
        position: 'relative',
        cursor: 'pointer',
        willChange: 'transform, box-shadow',
      }}
    >
      {/* Gösterge lambası — gönderilmiş 2+ gün eski mi? */}
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

      {/* Premium PDF rozeti — 3D embossed, gradient, kıvrılmış köşe.
          Kart bütünüyle clickable olduğu için bu sadece görsel; .teklif-karti-
          button:hover ile rozet yukarı kalkar, :active'de hafif basılır
          (basılabilir buton hissi). */}
      <div
        aria-hidden="true"
        className="teklif-karti-pdf-rozet"
        style={{
          width: 52,
          flexShrink: 0,
          alignSelf: 'stretch',
          paddingLeft: 6,
          paddingRight: 6,
          pointerEvents: 'none',
        }}
      >
        <PremiumPdfBadge isDark={isDark} size={38} />
      </div>

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
          {/* Cari adı — kart bütünüyle clickable; sadece görsel metin. */}
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
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: C.textFaint,
              letterSpacing: '0.02em',
              lineHeight: 1.2,
            }}>
              <TeklifNoEtiket teklifNo={teklif.teklifNo} />
            </span>
            {teklif.visibility === 'private' && (
              <Tooltip title="Gizli — sadece hazırlayan ve yönetici görür" mouseEnterDelay={0.3}>
                <span aria-label="Gizli teklif" style={{
                  fontSize: 10, color: '#5b6e85', cursor: 'help', lineHeight: 1,
                }}>🔒</span>
              </Tooltip>
            )}
            {teklif.ilgiliKisiAdSoyad && (
              <Tooltip title={`İlgili: ${teklif.ilgiliKisiAdSoyad}`} mouseEnterDelay={0.3}>
                <span aria-label="İlgili kişi atandı" style={{
                  fontSize: 10, color: '#0ea5e9', cursor: 'help', lineHeight: 1,
                }}>👤</span>
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
              fontSize: 9.5, fontWeight: 700, fontFamily: 'var(--font-sans)',
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
          now={now}
        />

        {/* Aksiyonlar — Çoğalt · Sil (Aç/PDF kaldırıldı: kart bütünüyle clickable).
            stopPropagation: bu butonlara tıklamak kart navigate'ini tetiklemesin. */}
        <div style={{ paddingLeft: 6, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <Tooltip title="Çoğalt">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={(e) => { e.stopPropagation(); onCogalt(teklif); }}
                style={actionButtonStyle}
                className={buttonClassNames.smallAction}
              />
            </Tooltip>
            {silinebilir ? (
              // ── Sil Popconfirm — kart click bubble guard'ı ───────────────
              // NE: Sil butonu Popconfirm içinde; "Sil" onayı verilince
              //     onConfirm tetiklenir + Antd popover kapanır.
              // NEDEN: BUG (2026-05-26 Mehmet Bey raporu) — "teklif sildiğim
              //     zaman yeni teklif başlatmaya çalışıyor". Popconfirm "Sil"
              //     butonunun click event'i kart DOM'una bubble ediyor →
              //     dış div onClick={pdfAc} tetikleniyor → navigate(`/teklif/
              //     ${id}`) silinen ID'ye yöneliyor → Editor o ID DB'de
              //     olmadığı için "yeni teklif" modunda açılıyor.
              // NASIL: onConfirm + onCancel callback'lerinde e?.stopPropagation
              //     ile click event'in kart wrapper'a ulaşması engellenir.
              //     Silme akışı normal → liste tazelenir → kullanıcı listede
              //     kalır, yeni teklif AÇILMAZ.
              <Popconfirm
                title="Teklif silinecek"
                description="Bu işlem geri alınamaz. Emin misiniz?"
                onConfirm={(e) => { e?.stopPropagation(); onSil(teklif.id); }}
                onCancel={(e) => { e?.stopPropagation(); }}
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
                  onClick={(e) => e.stopPropagation()}
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
                  onClick={(e) => e.stopPropagation()}
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
