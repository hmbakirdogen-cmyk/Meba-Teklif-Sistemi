import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Input, Popconfirm, Tooltip } from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  FilePdfOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { teklifService } from '../services/teklifService';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import type { Teklif, TeklifDurum } from '../types';
import { formatCurrency, formatDate, formatCariAdi } from '../utils/formatters';
import { klasorAdiUret } from '../utils/folderUtils';
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
  iptal:      { label: 'İptal',      color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const DURUM_CFG_DARK: Record<TeklifDurum, { label: string; color: string; bg: string; border: string }> = {
  taslak:     { label: 'Taslak',     color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
  hazir:      { label: 'Hazır',      color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.22)'  },
  gonderildi: { label: 'Gönderildi', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)'  },
  onaylandi:  { label: 'Onaylandı',  color: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.22)'  },
  iptal:      { label: 'İptal',      color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' },
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
}

function buildFolders(teklifler: Teklif[]): CustomerFolder[] {
  const map = new Map<string, CustomerFolder>();

  for (const t of teklifler) {
    const key = klasorAdiUret(t.cari.firmaAdi);
    if (!map.has(key)) {
      map.set(key, {
        klasorAdi: key,
        firmaAdiDisplay: formatCariAdi(t.cari.firmaAdi),
        teklifler: [],
        sonTarih: t.tarih,
      });
    }
    const folder = map.get(key)!;
    folder.teklifler.push(t);
    if (t.tarih > folder.sonTarih) folder.sonTarih = t.tarih;
  }

  // Teklifler içinde en yenisi öne — her klasörde tutarlı sıra
  for (const f of map.values()) {
    f.teklifler.sort((a, b) => b.tarih.localeCompare(a.tarih));
  }

  return Array.from(map.values()).sort((a, b) =>
    a.klasorAdi.localeCompare(b.klasorAdi, 'tr-TR'),
  );
}

// ─── Filtre tipi ─────────────────────────────────────────────────────────────

type Filtre = 'benim' | 'tumu' | 'digerleri';
type Gorunum = 'klasorler' | 'detay';

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
  const [aramaMetni, setAramaMetni] = useState('');
  const [aktifFiltre, setAktifFiltre] = useState<Filtre>('benim');
  const [gorunum, setGorunum] = useState<Gorunum>('klasorler');
  const [seciliKlasor, setSeciliKlasor] = useState<string | null>(null);

  const benimId = aktifKullanici?.id;

  const teklifleriYukle = useCallback(() => {
    setTeklifler(teklifService.tumTeklifleriGetir(kullaniciCtx));
  }, [kullaniciCtx]);

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
    const all = buildFolders(tabFiltreli);
    if (!aramaMetni.trim()) return all;
    const q = aramaMetni.toLocaleLowerCase('tr-TR');
    return all.filter(
      (f) =>
        f.klasorAdi.toLocaleLowerCase('tr-TR').includes(q) ||
        f.firmaAdiDisplay.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [tabFiltreli, aramaMetni]);

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

  const sekmeler: Array<{ key: Filtre; label: string; count: number }> = [
    { key: 'benim',     label: 'Benim Tekliflerim',           count: benimSayisi     },
    { key: 'tumu',      label: 'Tüm Teklifler',               count: teklifler.length },
    { key: 'digerleri', label: 'Diğer Personellerin Teklifleri', count: digerSayisi  },
  ];

  // ── Klasör detay başlık bilgisi ──────────────────────────────────────────────
  const seciliKlasorBilgi = seciliKlasor
    ? klasorler.find((k) => k.klasorAdi === seciliKlasor) ??
      buildFolders(teklifler).find((k) => k.klasorAdi === seciliKlasor)
    : null;

  const wrapperStyle: CSSProperties = {
    padding: isMobile ? '18px 12px 48px' : '28px 32px 64px',
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
          aramaMetni={aramaMetni}
          setAramaMetni={setAramaMetni}
          aktifFiltre={aktifFiltre}
          setAktifFiltre={setAktifFiltre}
          sekmeler={sekmeler}
          onKlasorTikla={klasoreGir}
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
  aramaMetni: string;
  setAramaMetni: (v: string) => void;
  aktifFiltre: Filtre;
  setAktifFiltre: (f: Filtre) => void;
  sekmeler: Array<{ key: Filtre; label: string; count: number }>;
  onKlasorTikla: (k: string) => void;
  navigate: (path: string) => void;
}

function KlasorGorunumu({
  isMobile, C, klasorler, aramaMetni, setAramaMetni,
  aktifFiltre, setAktifFiltre, sekmeler, onKlasorTikla, navigate,
}: KlasorGorunumuProps) {
  return (
    <>
      {/* Başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
            Teklif Arşivi
          </div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 5, fontWeight: 400 }}>
            {klasorler.length} müşteri klasörü
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? 'repeat(auto-fill, minmax(160px, 1fr))'
            : 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: isMobile ? 12 : 16,
        }}>
          {klasorler.map((klasor) => (
            <KlasorKarti
              key={klasor.klasorAdi}
              klasor={klasor}
              isMobile={isMobile}
              C={C}
              onClick={() => onKlasorTikla(klasor.klasorAdi)}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Klasör Kart Bileşeni ─────────────────────────────────────────────────────

function FolderIcon({ size = 64 }: { size?: number }) {
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
      {/* Gölge */}
      <rect x="2" y="12" width="62" height="44" rx="5.5" fill="rgba(10,20,42,0.18)" />
      {/* Arka panel */}
      <rect x="0" y="8" width="62" height="46" rx="5" fill="url(#fib)" />
      {/* Sekme */}
      <path d="M0 8 L0 4.5 Q0 2.5 2.5 2.5 L22 2.5 Q24.5 2.5 26 5 L30 8 Z" fill="#152332" />
      {/* Ön yüz */}
      <rect x="0" y="13" width="62" height="41" rx="4.5" fill="url(#fif)" />
      {/* Üst kenar parlaması */}
      <rect x="1" y="13" width="60" height="2" rx="1" fill="rgba(255,255,255,0.16)" />
      {/* Belge çizgileri */}
      <rect x="10" y="26" width="42" height="2.5" rx="1.25" fill="rgba(255,255,255,0.15)" />
      <rect x="10" y="33" width="34" height="2"   rx="1"    fill="rgba(255,255,255,0.10)" />
      <rect x="10" y="39" width="24" height="2"   rx="1"    fill="rgba(255,255,255,0.06)" />
    </svg>
  );
}

interface KlasorKartiProps {
  klasor: CustomerFolder;
  isMobile: boolean;
  C: ReturnType<typeof useColors>;
  onClick: () => void;
}

function KlasorKarti({ klasor, isMobile, C, onClick }: KlasorKartiProps) {
  const { isDark } = useTheme();

  const cardBase: CSSProperties = {
    background: C.bgSurface,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    cursor: 'pointer',
    transition: 'box-shadow 0.16s ease, border-color 0.16s ease',
    userSelect: 'none',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div
      style={cardBase}
      onClick={onClick}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = isDark
          ? '0 4px 20px rgba(0,0,0,0.35)'
          : '0 4px 20px rgba(15,30,60,0.10)';
        el.style.borderColor = isDark ? 'rgba(255,255,255,0.14)' : '#c5cdd8';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = 'none';
        el.style.borderColor = C.border;
      }}
    >
      {/* İkon alanı */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '20px 16px 14px' : '26px 20px 18px',
        background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(26,43,66,0.03)',
      }}>
        <FolderIcon size={isMobile ? 52 : 64} />
      </div>

      {/* Metin alanı */}
      <div style={{
        padding: isMobile ? '0 14px 16px' : '0 18px 20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}>
        {/* Klasör adı (2 kelime, BÜYÜK) */}
        <div style={{
          fontSize: isMobile ? 12 : 13,
          fontWeight: 800,
          color: C.textPrimary,
          letterSpacing: '0.01em',
          lineHeight: 1.3,
          wordBreak: 'break-word',
        }}>
          {klasor.klasorAdi}
        </div>
        {/* Tam firma adı */}
        <div style={{
          fontSize: 11,
          color: C.textSecondary,
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {klasor.firmaAdiDisplay}
        </div>
        {/* Alt bilgi */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 6,
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: isDark ? 'rgba(255,255,255,0.4)' : '#1A2B42',
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(26,43,66,0.07)',
            borderRadius: 5,
            padding: '2px 7px',
            letterSpacing: '0.02em',
          }}>
            {klasor.teklifler.length} teklif
          </span>
          <span style={{ fontSize: 10, color: C.textFaint, letterSpacing: '0.01em' }}>
            {formatDate(klasor.sonTarih)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Klasör Detay Görünümü ────────────────────────────────────────────────────

const ROW_GRID = '180px 1fr 100px 160px 130px 110px 172px';
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
              <HeaderCell style={{ paddingRight: 12 }}>Teklif No / Firma</HeaderCell>
              <div />
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
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
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
}

function TeklifKarti({ teklif, benim, isDark, C, navigate, onSil, onKopyala }: TeklifKartiProps) {
  const isim = teklif.hazirlayanAdSoyad ?? '';
  const toplamSatirlari = teklifToplamOzeti(teklif);
  const renk = isim ? personelRenk(isim) : PALET[0];
  const inits = isim ? initials(isim) : '?';
  const durumGosterim = isDark ? DURUM_CFG_DARK[teklif.durum] : DURUM_CFG[teklif.durum];

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
        {/* Teklif No / Firma */}
        <div style={{ minWidth: 0, paddingRight: 12 }}>
          <button
            onClick={() => navigate(`/teklif/${teklif.id}`)}
            className={buttonClassNames.link}
            style={{ textAlign: 'left', fontSize: 13, fontWeight: 600, color: C.textPrimary, letterSpacing: '0.01em', lineHeight: 1.2, display: 'block', marginBottom: 3 }}
          >
            {teklif.teklifNo}
          </button>
          <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatCariAdi(teklif.cari.firmaAdi)}
          </div>
          <div style={{ fontSize: 10, color: C.textFaint, marginTop: 1, letterSpacing: '0.02em' }}>
            {teklif.cari.cariKod}
          </div>
        </div>

        <div />

        {/* Tarih */}
        <div style={{ paddingRight: 8 }}>
          <div style={{ fontSize: 12, color: C.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
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
              fontSize: 9.5, fontWeight: 700, fontFamily: '"Arial", sans-serif',
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

        {/* Toplam */}
        <div style={{ textAlign: 'right', paddingRight: 16 }}>
          {toplamSatirlari.map((satir, i) => (
            <div key={`${teklif.id}-${i}`} style={{
              fontSize: i === 0 ? 14 : 11.5,
              fontWeight: i === 0 ? 700 : 600,
              color: i === 0 ? C.textPrimary : C.textSecondary,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              lineHeight: i === 0 ? 1.2 : 1.35,
              marginTop: i === 0 ? 0 : 2,
            }}>
              {satir}
            </div>
          ))}
          {teklif.satirBazliParaBirimi && toplamSatirlari.length === 0 && (
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textFaint }}>Satır bazlı</div>
          )}
        </div>

        {/* Durum */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.1,
            color: durumGosterim.color,
            background: durumGosterim.bg,
            border: `1px solid ${durumGosterim.border}`,
            whiteSpace: 'nowrap',
          }}>
            {durumGosterim.label}
          </span>
          {teklif.visibility === 'private' && (
            <span
              title="Gizli — sadece hazırlayan ve yönetici görür"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 7px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 0.15,
                color: '#5b6e85',
                background: 'rgba(107, 139, 166, 0.12)',
                border: '1px solid rgba(107, 139, 166, 0.32)',
                whiteSpace: 'nowrap',
              }}
            >
              <span aria-hidden="true">🔒</span> Gizli
            </span>
          )}
        </div>

        {/* Aksiyonlar */}
        <div style={{ paddingLeft: 6, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Tooltip title="Aç">
              <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/teklif/${teklif.id}`)} style={actionButtonStyle} className={buttonClassNames.smallAction} />
            </Tooltip>
            <Tooltip title="Düzenle">
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => navigate(`/teklif/${teklif.id}`)} style={actionButtonStyle} className={buttonClassNames.smallAction} />
            </Tooltip>
            <Tooltip title="PDF">
              <Button type="text" size="small" icon={<FilePdfOutlined />} onClick={() => navigate(`/teklif/${teklif.id}`)} style={actionButtonStyle} className={buttonClassNames.smallAction} />
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
