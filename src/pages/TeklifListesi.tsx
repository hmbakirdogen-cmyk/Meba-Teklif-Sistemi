import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Popconfirm, Tooltip, message } from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  FilePdfOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { teklifService } from '../services/teklifService';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import type { Teklif, TeklifDurum } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useKullanici } from '../context/useKullanici';
import { useIsMobile } from '../hooks/useIsMobile';
import { buttonClassNames, tabButtonClassName } from '../styles/buttonStyles';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../context/useTheme';

// Son sütun (aksiyon butonları): 5 × 30px + 4 × 4px gap + 6px paddingLeft = 172px
// 1fr spacer otomatik küçülür (920 - 852 = 68px min → yeterli)
const ROW_GRID = '180px 1fr 100px 160px 130px 110px 172px';
const TABLE_MIN_WIDTH = 920;

const DURUM_CFG: Record<TeklifDurum, { label: string; color: string; bg: string; border: string }> = {
  taslak: { label: 'Taslak', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  hazir: { label: 'Hazır', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  gonderildi: { label: 'Gönderildi', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  onaylandi: { label: 'Onaylandı', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  iptal: { label: 'İptal', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
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
  { accent: '#0891b2', avatarBg: 'rgba(8,145,178,0.12)', avatarBorder: 'rgba(8,145,178,0.40)', avatarText: '#0891b2' },
  { accent: '#b45309', avatarBg: 'rgba(180,83,9,0.12)', avatarBorder: 'rgba(180,83,9,0.40)', avatarText: '#b45309' },
  { accent: '#be185d', avatarBg: 'rgba(190,24,93,0.12)', avatarBorder: 'rgba(190,24,93,0.40)', avatarText: '#be185d' },
  { accent: '#15803d', avatarBg: 'rgba(21,128,61,0.12)', avatarBorder: 'rgba(21,128,61,0.40)', avatarText: '#15803d' },
  { accent: '#b91c1c', avatarBg: 'rgba(185,28,28,0.12)', avatarBorder: 'rgba(185,28,28,0.40)', avatarText: '#b91c1c' },
];

function personelRenk(isim: string): PersonelRenk {
  let h = 0;
  for (let i = 0; i < isim.length; i += 1) h = (h * 31 + isim.charCodeAt(i)) & 0xffffffff;
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

type Filtre = 'benim' | 'tumu' | 'digerleri';

export default function TeklifListesi() {
  const navigate = useNavigate();
  const { aktifKullanici } = useKullanici();
  const isMobile = useIsMobile(768);
  const C = useColors();
  const [teklifler, setTeklifler] = useState<Teklif[]>(() => teklifService.tumTeklifleriGetir());
  const [aramaMetni, setAramaMetni] = useState('');
  const [aktifFiltre, setAktifFiltre] = useState<Filtre>('benim');

  const benimId = aktifKullanici?.id;

  function teklifleriYukle() {
    setTeklifler(teklifService.tumTeklifleriGetir());
  }

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

  const benimSayisi = useMemo(
    () => teklifler.filter((t) => t.hazirlayanKullaniciId === benimId).length,
    [teklifler, benimId],
  );
  const digerSayisi = useMemo(
    () => teklifler.filter((t) => t.hazirlayanKullaniciId !== benimId).length,
    [teklifler, benimId],
  );

  const filtrelenmis = useMemo(() => {
    let liste = teklifler;

    if (aktifFiltre === 'benim') liste = liste.filter((t) => t.hazirlayanKullaniciId === benimId);
    else if (aktifFiltre === 'digerleri') liste = liste.filter((t) => t.hazirlayanKullaniciId !== benimId);

    if (aramaMetni) {
      const q = aramaMetni.toLowerCase();
      liste = liste.filter(
        (t) =>
          t.teklifNo.toLowerCase().includes(q) ||
          t.cari.firmaAdi.toLowerCase().includes(q) ||
          (t.hazirlayanAdSoyad?.toLowerCase().includes(q) ?? false),
      );
    }

    return liste;
  }, [teklifler, aktifFiltre, aramaMetni, benimId]);

  const sekmeler: Array<{ key: Filtre; label: string; count: number }> = [
    { key: 'benim', label: 'Benim Tekliflerim', count: benimSayisi },
    { key: 'tumu', label: 'Tüm Teklifler', count: teklifler.length },
    { key: 'digerleri', label: 'Diğer Personellerin Teklifleri', count: digerSayisi },
  ];

  return (
    <div
      style={{
        padding: isMobile ? '18px 12px 40px' : '28px 32px 56px',
        maxWidth: 1120,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 28,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, letterSpacing: -0.5, lineHeight: 1.2 }}>
            Teklif Arşivi
          </div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 5 }}>
            {filtrelenmis.length} teklif gösteriliyor
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 272px',
          alignItems: 'center',
          columnGap: 16,
          rowGap: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 'fit-content',
            maxWidth: '100%',
            gap: 3,
            alignItems: 'center',
            background: C.bgElevated,
            borderRadius: 9,
            padding: '3px',
            overflowX: isMobile ? 'auto' : 'visible',
          }}
        >
          {sekmeler.map((sekme) => {
            const aktif = aktifFiltre === sekme.key;
            return (
              <button
                key={sekme.key}
                onClick={() => setAktifFiltre(sekme.key)}
                className={tabButtonClassName(aktif)}
              >
                {sekme.label}
                <span className="app-tab-count">
                  {sekme.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ width: isMobile ? '100%' : 272, justifySelf: isMobile ? 'stretch' : 'end' }}>
          <Input
            placeholder="Teklif no, firma veya personel ara..."
            prefix={<SearchOutlined style={{ color: C.textFaint }} />}
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            allowClear
            style={{ width: '100%', height: 36, borderRadius: 7 }}
          />
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <div style={{ minWidth: TABLE_MIN_WIDTH }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 4,
              border: '1px solid transparent',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div style={{ width: 3, flexShrink: 0 }} />
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: ROW_GRID,
                alignItems: 'center',
                padding: '3px 14px 5px 16px',
                gap: 0,
              }}
            >
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
            {filtrelenmis.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: isMobile ? '48px 16px' : '64px 20px',
                  color: C.textFaint,
                  fontSize: 14,
                  background: C.bgSurface,
                  borderRadius: 10,
                  border: `1px solid ${C.borderSubtle}`,
                }}
              >
                {aktifFiltre === 'benim'
                  ? 'Henüz hazırladığınız bir teklif yok. İlk teklifinizi oluşturun.'
                  : 'Gösterilecek teklif bulunamadı.'}
              </div>
            ) : (
              filtrelenmis.map((teklif) => (
                <TeklifKarti
                  key={teklif.id}
                  teklif={teklif}
                  benim={teklif.hazirlayanKullaniciId === benimId}
                  durum={DURUM_CFG[teklif.durum]}
                  navigate={navigate}
                  onSil={teklifSil}
                  onKopyala={teklifKopyala}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderCell({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--text-faint)',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface KartiProps {
  teklif: Teklif;
  benim: boolean;
  durum: { label: string; color: string; bg: string; border: string };
  navigate: (path: string) => void;
  onSil: (id: string) => void;
  onKopyala: (id: string) => void;
}

function TeklifKarti({ teklif, benim, durum, navigate, onSil, onKopyala }: KartiProps) {
  const C = useColors();
  const { isDark } = useTheme();
  const isim = teklif.hazirlayanAdSoyad ?? '';
  const toplamSatirlari = teklifToplamOzeti(teklif);
  const renk = isim ? personelRenk(isim) : PALET[0];
  const inits = isim ? initials(isim) : '?';
  const durumGosterim = isDark ? DURUM_CFG_DARK[teklif.durum] : durum;

  const actionButtonStyle: CSSProperties = {
    color: C.textFaint,
    width: 30,
    height: 30,
    minWidth: 30,
    padding: 0,
    borderRadius: 8,
    flexShrink: 0,
  };

  const islemler = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <Tooltip title="Önizle">
        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/teklif/${teklif.id}/onizleme`)} style={actionButtonStyle} className={buttonClassNames.smallAction} />
      </Tooltip>
      <Tooltip title="Düzenle">
        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => navigate(`/teklif/${teklif.id}`)} style={actionButtonStyle} className={buttonClassNames.smallAction} />
      </Tooltip>
      <Tooltip title="PDF">
        <Button type="text" size="small" icon={<FilePdfOutlined />} onClick={() => navigate(`/teklif/${teklif.id}/onizleme`)} style={actionButtonStyle} className={buttonClassNames.smallAction} />
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
        <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ ...actionButtonStyle, color: isDark ? '#f87171' : '#dc2626' }} className={buttonClassNames.smallActionDanger} />
      </Popconfirm>
    </div>
  );

  return (
    <div
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: benim ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,31,69,0.030)') : C.bgSurface,
        border: `1px solid ${benim ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,31,69,0.11)') : C.borderSubtle}`,
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'box-shadow 0.14s',
      }}
    >
      <div
        style={{
          width: 3,
          flexShrink: 0,
          background: benim ? '#0f1f45' : renk.accent,
          alignSelf: 'stretch',
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: ROW_GRID,
          alignItems: 'center',
          padding: '11px 14px 11px 16px',
          gap: 0,
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0, paddingRight: 12 }}>
          <button
            onClick={() => navigate(`/teklif/${teklif.id}/onizleme`)}
            className={buttonClassNames.link}
            style={{
              textAlign: 'left',
              fontSize: 13,
              fontWeight: 700,
              color: C.textPrimary,
              letterSpacing: 0.2,
              lineHeight: 1.2,
              display: 'block',
              marginBottom: 3,
            }}
          >
            {teklif.teklifNo}
          </button>
          <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {teklif.cari.firmaAdi}
          </div>
          <div style={{ fontSize: 10, color: C.textFaint, marginTop: 1, letterSpacing: 0.2 }}>{teklif.cari.cariKod}</div>
        </div>

        <div />

        <div style={{ paddingRight: 8 }}>
          <div style={{ fontSize: 12, color: C.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{formatDate(teklif.tarih)}</div>
        </div>

        <div style={{ paddingRight: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                flexShrink: 0,
                background: benim ? 'rgba(15,31,69,0.10)' : renk.avatarBg,
                border: `1.5px solid ${benim ? 'rgba(15,31,69,0.28)' : renk.avatarBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9.5,
                fontWeight: 700,
                fontFamily: '"Arial", sans-serif',
                color: benim ? C.textPrimary : renk.avatarText,
              }}
            >
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

        <div style={{ textAlign: 'right', paddingRight: 16 }}>
          {toplamSatirlari.map((satir, index) => (
            <div
              key={`${teklif.id}-${index}`}
              style={{
                fontSize: index === 0 ? 14 : 11.5,
                fontWeight: index === 0 ? 700 : 600,
                color: index === 0 ? C.textPrimary : C.textSecondary,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: 0.1,
                whiteSpace: 'nowrap',
                lineHeight: index === 0 ? 1.2 : 1.35,
                marginTop: index === 0 ? 0 : 2,
              }}
            >
              {satir}
            </div>
          ))}
          {teklif.satirBazliParaBirimi && toplamSatirlari.length === 0 && (
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textFaint }}>Satir bazli</div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <span
            style={{
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
            }}
          >
            {durumGosterim.label}
          </span>
        </div>

        <div style={{ paddingLeft: 6, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }}>{islemler}</div>
      </div>
    </div>
  );
}
