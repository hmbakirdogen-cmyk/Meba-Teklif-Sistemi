import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Table, DatePicker, Select, Tabs, Tag, Tooltip, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  FilterOutlined,
  CalendarOutlined,
  TeamOutlined,
  BankOutlined,
  TagOutlined,
  FilePdfOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { type Dayjs } from 'dayjs';
import { teklifService } from '../services/teklifService';
import { api } from '../services/apiClient';
import type { Teklif, TeklifDurum, ParaBirimi, Firma, Kullanici } from '../types';
import { useKullanici } from '../context/useKullanici';
import { useFirma } from '../context/useFirma';
import { useIsMobile } from '../hooks/useIsMobile';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../context/useTheme';
import { formatCurrency, formatDate, formatCariAdi, formatAdSoyad } from '../utils/formatters';
import { computeYoneticiOzeti } from './teklifListesiShared';
import { YoneticiOzeti } from '../components/YoneticiOzeti';
import { useSayfaRehberi } from '../hooks/useSayfaRehberi';
import { ANALIZ_TIPLERI } from './AnalizSayfasi.tips';
import EChartBar3D, { type Bar3DData } from '../components/charts/EChartBar3D';
import { isYonetici as isYoneticiRol } from '../utils/yetkiUtils';
import {
  filtreleTeklifleri,
  ozetMetrikleriHesapla,
  kullaniciPerformansiHesapla,
  firmaAnaliziHesapla,
  markaAnaliziHesapla,
  urunKoduAnaliziHesapla,
  paraBirimiOzetiHesapla,
  pdfAktivitesiHesapla,
  riskTekliflerHesapla,
  enAktifKullanici,
  enCokTeklifVerilenFirma,
  type AnalizFiltresi,
  type ParaBirimiToplam,
  type KullaniciPerformansi,
  type FirmaAnaliz,
  type MarkaAnaliz,
  type UrunKoduAnaliz,
  type PdfAktivite,
  type RiskItem,
  type RiskKategori,
} from '../utils/analizHesaplari';

/**
 * Yönetici Analiz Merkezi — sadece super_admin / firma_admin için.
 * - Üst filtreler: tarih aralığı, kullanıcı, firma, durum, para birimi
 * - Özet kartları: bugün/bu ay/toplam + durum bazında + en aktif kullanıcı/firma
 * - Para birimi özeti: TRY/EUR/USD ayrı, KDV hariç/dahil/iskonto
 * - Kullanıcı performansı tablosu
 * - Firma (cari) bazlı analiz tablosu
 * - Marka & ürün kodu analizi (Tabs)
 * - PDF aktivitesi (son üretimler)
 * - Risk merkezi (7 kategori, Tabs)
 */

const DURUM_LABEL: Record<TeklifDurum, string> = {
  taslak: 'Hazırlanıyor',
  hazir: 'Hazır',
  gonderildi: 'Gönderildi',
  onaylandi: 'Onaylandı',
  kismi_onaylandi: 'Kısmi Onay',
  siparis_alindi: 'Siparişe Döndü',
  reddedildi: 'Reddedildi',
  iptal: 'İptal',
};

const DURUM_RENK: Record<TeklifDurum, string> = {
  taslak: '#94a3b8',
  hazir: '#60a5fa',
  gonderildi: '#fbbf24',
  onaylandi: '#34d399',
  kismi_onaylandi: '#fb923c',
  siparis_alindi: '#10b981',
  reddedildi: '#f87171',
  iptal: '#94a3b8',
};

export default function AnalizSayfasi() {
  // Global rehber sistemine kayıt — pool boşken FAB "yakında" mesajı, dolunca
  // sequence başlar. Faz 6b'de ANALIZ_TIPLERI gerçek tiplerle doldurulacak.
  useSayfaRehberi(ANALIZ_TIPLERI, { sayfaAdi: 'Analiz' });
  const navigate = useNavigate();
  const { aktifKullanici } = useKullanici();
  const { firmalar } = useFirma();
  const { isDark } = useTheme();
  const isMobile = useIsMobile(768);
  const C = useColors();

  const kullaniciCtx = useMemo(
    () => (aktifKullanici ? { id: aktifKullanici.id, rol: aktifKullanici.rol } : undefined),
    [aktifKullanici],
  );

  const [teklifler, setTeklifler] = useState<Teklif[]>(() =>
    teklifService.tumTeklifleriGetir(kullaniciCtx),
  );
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);

  // ─── Filtreler ────────────────────────────────────────────────────────
  const [tarihAraligi, setTarihAraligi] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [filtreKullaniciId, setFiltreKullaniciId] = useState<string | null>(null);
  const [filtreFirmaId, setFiltreFirmaId] = useState<string | null>(null);
  const [filtreDurum, setFiltreDurum] = useState<TeklifDurum | null>(null);
  const [filtreParaBirimi, setFiltreParaBirimi] = useState<ParaBirimi | null>(null);

  // ─── İlk yükleme: server'dan taze veri + kullanıcılar ────────────────
  useEffect(() => {
    let aborted = false;
    teklifService.tekliferiYenile(kullaniciCtx).then(() => {
      if (aborted) return;
      setTeklifler(teklifService.tumTeklifleriGetir(kullaniciCtx));
    });
    api.kullanicilar.list().then((list) => { if (!aborted) setKullanicilar(list); }).catch(() => {});
    return () => { aborted = true; };
  }, [kullaniciCtx]);

  // ─── Filtreli teklif listesi ─────────────────────────────────────────
  const filtre: AnalizFiltresi = useMemo(() => ({
    tarihBaslangic: tarihAraligi?.[0]?.format('YYYY-MM-DD'),
    tarihBitis: tarihAraligi?.[1]?.format('YYYY-MM-DD'),
    kullaniciId: filtreKullaniciId,
    firmaId: filtreFirmaId,
    durum: filtreDurum,
    paraBirimi: filtreParaBirimi,
  }), [tarihAraligi, filtreKullaniciId, filtreFirmaId, filtreDurum, filtreParaBirimi]);

  const filtreliTeklifler = useMemo(() => filtreleTeklifleri(teklifler, filtre), [teklifler, filtre]);

  // ─── Hesaplamalar ────────────────────────────────────────────────────
  const ozet = useMemo(() => ozetMetrikleriHesapla(filtreliTeklifler), [filtreliTeklifler]);
  const yoneticiOzeti = useMemo(() => computeYoneticiOzeti(filtreliTeklifler), [filtreliTeklifler]);
  const kullaniciPerf = useMemo(() => kullaniciPerformansiHesapla(filtreliTeklifler), [filtreliTeklifler]);

  // ── 3D Personel Kullanım Analizi verisi (Faz 8a) ────────────────────
  // NE: kullaniciPerf array'inden EChartBar3D'nin beklediği {rows, xLabels,
  //     yLabels} formatına dönüştürür. X: personel, Y: durum (Toplam +
  //     Onaylanan + Bekleyen + Reddedilen), Z: teklif sayısı.
  // NEDEN: Mehmet Bey 2026-05-26 — "yöneticilere personel kullanım
  //        istatistikleri + en kuvvetli görseli olan grafiklerle, elit
  //        seviyede 3D". 2D tablo tek başına yetersiz; 3D bar derinlik
  //        verir, kim ne kadar üretiyor + kimin onay oranı yüksek tek
  //        bakışta görülür.
  // NASIL: kullaniciPerf'in ilk 10 personeli (toplamTeklifSayisi'na göre
  //        azalan) gösterilir — 10+ personel kalabalıklaşır. Y eksen 4
  //        durum kategorisi. Rows: her (personel, durum) kombinasyonu
  //        için [xi, yi, value] satırı.
  const personelKullanim3D: Bar3DData = useMemo(() => {
    const top10 = [...kullaniciPerf]
      .sort((a, b) => b.toplamTeklifSayisi - a.toplamTeklifSayisi)
      .slice(0, 10);
    const xLabels = top10.map((p) => p.adSoyad.split(' ').slice(0, 2).join(' '));
    const yLabels = ['Toplam', 'Onaylanan', 'Bekleyen', 'Reddedilen'];
    const rows: Array<[number, number, number]> = [];
    top10.forEach((p, xi) => {
      rows.push([xi, 0, p.toplamTeklifSayisi]);
      rows.push([xi, 1, p.onaylanan]);
      rows.push([xi, 2, p.bekleyen]);
      rows.push([xi, 3, p.reddedilen]);
    });
    return { rows, xLabels, yLabels };
  }, [kullaniciPerf]);

  // Sadece yönetici/firma_admin/super_admin için 3D analiz görünür
  const yoneticiMi = isYoneticiRol(aktifKullanici?.rol);
  const firmaAnaliz = useMemo(() => firmaAnaliziHesapla(filtreliTeklifler), [filtreliTeklifler]);
  const markaAnaliz = useMemo(() => markaAnaliziHesapla(filtreliTeklifler), [filtreliTeklifler]);
  const urunKoduAnaliz = useMemo(() => urunKoduAnaliziHesapla(filtreliTeklifler), [filtreliTeklifler]);
  const paraOzeti = useMemo(() => paraBirimiOzetiHesapla(filtreliTeklifler), [filtreliTeklifler]);
  const pdfAktivite = useMemo(() => pdfAktivitesiHesapla(filtreliTeklifler), [filtreliTeklifler]);
  const riskler = useMemo(() => riskTekliflerHesapla(filtreliTeklifler), [filtreliTeklifler]);
  const enAktifK = useMemo(() => enAktifKullanici(filtreliTeklifler), [filtreliTeklifler]);
  const enAktifF = useMemo(() => enCokTeklifVerilenFirma(filtreliTeklifler), [filtreliTeklifler]);

  const cardStyle: CSSProperties = useMemo(() => ({
    background: isDark ? '#161922' : '#F4F3EF',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8'}`,
    borderRadius: 14,
    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 6px rgba(15,23,42,0.04)',
  }), [isDark]);

  const wrapperStyle: CSSProperties = {
    padding: isMobile ? '10px 12px 64px' : '14px 24px 80px',
    maxWidth: 1400,
    margin: '0 auto',
    width: '100%',
  };

  const ilkAd = aktifKullanici?.adSoyad?.split(/\s+/)[0] ?? '';

  return (
    <div style={wrapperStyle}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/teklifler')}
          style={{ color: C.textSecondary, padding: '0 6px', height: 28 }}
        >
          Tekliflerim
        </Button>
        <span style={{ color: C.textFaint, fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, letterSpacing: '0.01em' }}>
          Yönetici Analiz Merkezi
        </span>
      </div>

      {/* Başlık */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.textPrimary,
          letterSpacing: '-0.03em', lineHeight: 1.15,
        }}>
          Yönetici Analiz Merkezi
        </div>
        <div style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 6, fontWeight: 400 }}>
          {ilkAd ? `${ilkAd}, ` : ''}teklif sisteminin uçtan uca performansı, kullanıcı ve firma dağılımı, riskler.
        </div>
      </div>

      {/* ─── Filtre Çubuğu ─── */}
      <div data-tip-target="analiz-filtre-cubugu">
      <FiltreBari
        C={C}
        cardStyle={cardStyle}
        isMobile={isMobile}
        tarihAraligi={tarihAraligi}
        setTarihAraligi={setTarihAraligi}
        filtreKullaniciId={filtreKullaniciId}
        setFiltreKullaniciId={setFiltreKullaniciId}
        filtreFirmaId={filtreFirmaId}
        setFiltreFirmaId={setFiltreFirmaId}
        filtreDurum={filtreDurum}
        setFiltreDurum={setFiltreDurum}
        filtreParaBirimi={filtreParaBirimi}
        setFiltreParaBirimi={setFiltreParaBirimi}
        kullanicilar={kullanicilar}
        firmalar={firmalar}
      />
      </div>

      {/* ─── Üst Özet Kartları ─── */}
      <div data-tip-target="analiz-ozet-kartlari">
      <OzetKartlari
        C={C}
        cardStyle={cardStyle}
        isMobile={isMobile}
        ozet={ozet}
        enAktifK={enAktifK}
        enAktifF={enAktifF}
      />
      </div>

      {/* ─── Para Birimi Özeti ─── */}
      <Card
        title={<><BankOutlined /> &nbsp; Para Birimi Toplamları</>}
        style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8'}` } }}
      >
        <ParaBirimiOzetiPanel ozeti={paraOzeti} C={C} isMobile={isMobile} />
      </Card>

      {/* ─── Klasik Funnel & Win-Rate Paneli ─── */}
      <div style={{ marginTop: 16 }}>
        <YoneticiOzeti isMobile={isMobile} C={C} data={yoneticiOzeti} mode="panel" />
      </div>

      {/* ─── Kullanıcı Performansı ─── */}
      <Card
        title={<><TeamOutlined /> &nbsp; Kullanıcı Performansı</>}
        style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8'}` } }}
      >
        {/* 3D Personel Kullanım Bar Chart — sadece yönetici/admin için.
            Mehmet Bey 2026-05-26: "yöneticilere personel kullanım
            istatistikleri + elit 3D grafikler". Top 10 personel × 4 durum
            (Toplam/Onaylanan/Bekleyen/Reddedilen). Realistic shading +
            bloom + SSAO postEffect ile premium görünüm. */}
        {yoneticiMi && kullaniciPerf.length > 0 && (
          <div
            style={{
              marginBottom: 18,
              padding: '8px 4px',
              borderRadius: 8,
              background: isDark
                ? 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%)'
                : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              border: `1px solid ${isDark ? 'rgba(91,141,239,0.18)' : '#E3DFD8'}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: isDark ? '#94a3b8' : '#475569',
                padding: '4px 12px 8px',
              }}
            >
              📊 3D Personel Kullanım Analizi — Top 10 (sürükleyerek döndürebilirsiniz)
            </div>
            <EChartBar3D
              data={personelKullanim3D}
              height={420}
              valueAdi="teklif"
              colorRange={['#3b82f6', '#22c55e']}
              isDark={isDark}
              autoRotate={false}
            />
          </div>
        )}
        <KullaniciPerformansiTablo data={kullaniciPerf} isMobile={isMobile} />
      </Card>

      {/* ─── Firma Bazlı Analiz ─── */}
      <Card
        title={<><BankOutlined /> &nbsp; Müşteri (Cari) Analizi</>}
        style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8'}` } }}
      >
        <FirmaAnalizTablo data={firmaAnaliz} isMobile={isMobile} />
      </Card>

      {/* ─── Marka & Ürün Analizi ─── */}
      <Card
        title={<><TagOutlined /> &nbsp; Marka ve Ürün Analizi</>}
        style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8'}` } }}
      >
        <Tabs
          items={[
            { key: 'marka', label: 'Markalar', children: <MarkaTablo data={markaAnaliz} /> },
            { key: 'urun', label: 'Ürün Kodları', children: <UrunKoduTablo data={urunKoduAnaliz} /> },
          ]}
        />
      </Card>

      {/* ─── PDF Aktivitesi ─── */}
      <Card
        title={<><FilePdfOutlined /> &nbsp; PDF Aktivitesi (Son {pdfAktivite.length})</>}
        style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8'}` } }}
      >
        <PdfAktiviteTablo data={pdfAktivite} navigate={navigate} />
      </Card>

      {/* ─── Yönetici Dikkat Merkezi (Risk) ─── */}
      <Card
        data-tip-target="analiz-risk-merkezi"
        title={<><WarningOutlined style={{ color: '#f59e0b' }} /> &nbsp; Yönetici Dikkat Merkezi</>}
        style={{ ...cardStyle, marginTop: 16 }}
        styles={{ header: { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8'}` } }}
      >
        <RiskMerkezi riskler={riskler} navigate={navigate} />
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Filtre Bari
// ───────────────────────────────────────────────────────────────────────

interface FiltreBariProps {
  C: ReturnType<typeof useColors>;
  cardStyle: CSSProperties;
  isMobile: boolean;
  tarihAraligi: [Dayjs | null, Dayjs | null] | null;
  setTarihAraligi: (v: [Dayjs | null, Dayjs | null] | null) => void;
  filtreKullaniciId: string | null;
  setFiltreKullaniciId: (v: string | null) => void;
  filtreFirmaId: string | null;
  setFiltreFirmaId: (v: string | null) => void;
  filtreDurum: TeklifDurum | null;
  setFiltreDurum: (v: TeklifDurum | null) => void;
  filtreParaBirimi: ParaBirimi | null;
  setFiltreParaBirimi: (v: ParaBirimi | null) => void;
  kullanicilar: Kullanici[];
  firmalar: Firma[];
}

function FiltreBari(p: FiltreBariProps) {
  const { C, cardStyle, isMobile } = p;
  const aktifFiltreSayisi = [
    p.tarihAraligi?.[0] || p.tarihAraligi?.[1],
    p.filtreKullaniciId,
    p.filtreFirmaId,
    p.filtreDurum,
    p.filtreParaBirimi,
  ].filter(Boolean).length;

  const fieldStyle: CSSProperties = { flex: isMobile ? '1 1 100%' : '1 1 180px', minWidth: 140 };

  return (
    <div
      style={{
        ...cardStyle,
        padding: '12px 14px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textSecondary, fontSize: 12, fontWeight: 600 }}>
        <FilterOutlined /> Filtreler
        {aktifFiltreSayisi > 0 && (
          <Tag color="blue" style={{ marginLeft: 6 }}>{aktifFiltreSayisi} aktif</Tag>
        )}
      </div>

      <div style={fieldStyle}>
        <DatePicker.RangePicker
          value={p.tarihAraligi as [Dayjs, Dayjs] | null}
          onChange={(v) => p.setTarihAraligi(v as [Dayjs | null, Dayjs | null] | null)}
          format="DD.MM.YYYY"
          allowEmpty={[true, true]}
          placeholder={['Başlangıç', 'Bitiş']}
          suffixIcon={<CalendarOutlined />}
          style={{ width: '100%' }}
          size="small"
        />
      </div>

      <Select
        placeholder="Kullanıcı"
        allowClear
        value={p.filtreKullaniciId}
        onChange={(v) => p.setFiltreKullaniciId(v ?? null)}
        options={p.kullanicilar.map((k) => ({ value: k.id, label: formatAdSoyad(k.adSoyad) }))}
        style={fieldStyle}
        size="small"
        showSearch
        optionFilterProp="label"
      />

      <Select
        placeholder="Firma"
        allowClear
        value={p.filtreFirmaId}
        onChange={(v) => p.setFiltreFirmaId(v ?? null)}
        options={p.firmalar.map((f) => ({ value: f.id, label: f.kisaAd || f.ad }))}
        style={fieldStyle}
        size="small"
      />

      <Select
        placeholder="Durum"
        allowClear
        value={p.filtreDurum}
        onChange={(v) => p.setFiltreDurum(v ?? null)}
        options={(Object.keys(DURUM_LABEL) as TeklifDurum[]).map((d) => ({ value: d, label: DURUM_LABEL[d] }))}
        style={fieldStyle}
        size="small"
      />

      <Select
        placeholder="Para Birimi"
        allowClear
        value={p.filtreParaBirimi}
        onChange={(v) => p.setFiltreParaBirimi(v ?? null)}
        options={[
          { value: 'TRY', label: 'TRY (₺)' },
          { value: 'EUR', label: 'EUR (€)' },
          { value: 'USD', label: 'USD ($)' },
        ]}
        style={fieldStyle}
        size="small"
      />

      {aktifFiltreSayisi > 0 && (
        <Button
          size="small"
          type="text"
          onClick={() => {
            p.setTarihAraligi(null);
            p.setFiltreKullaniciId(null);
            p.setFiltreFirmaId(null);
            p.setFiltreDurum(null);
            p.setFiltreParaBirimi(null);
          }}
          style={{ color: C.textSecondary }}
        >
          Temizle
        </Button>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Üst Özet Kartları
// ───────────────────────────────────────────────────────────────────────

interface OzetKartlariProps {
  C: ReturnType<typeof useColors>;
  cardStyle: CSSProperties;
  isMobile: boolean;
  ozet: ReturnType<typeof ozetMetrikleriHesapla>;
  enAktifK: { adSoyad: string; sayi: number } | null;
  enAktifF: { firmaAdi: string; sayi: number } | null;
}

function OzetKartlari({ C, cardStyle, isMobile, ozet, enAktifK, enAktifF }: OzetKartlariProps) {
  const kartlar: Array<{
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
  }> = [
    { label: 'Bugünkü Teklif', value: ozet.bugunSayisi, accent: '#60a5fa' },
    { label: 'Bu Ay', value: ozet.buAySayisi, accent: '#34d399' },
    { label: 'Toplam Teklif', value: ozet.toplamSayisi },
    {
      label: 'Bekleyen',
      value: ozet.bekleyenSayisi,
      sub: 'Hazırlanıyor + Hazır + Gönderildi',
      accent: '#fbbf24',
    },
    { label: 'Gönderildi', value: ozet.durumDagilimi.gonderildi, accent: DURUM_RENK.gonderildi },
    {
      label: 'Onaylandı',
      value: ozet.durumDagilimi.onaylandi + ozet.durumDagilimi.siparis_alindi,
      sub: ozet.durumDagilimi.siparis_alindi > 0 ? `${ozet.durumDagilimi.siparis_alindi} siparişe döndü` : undefined,
      accent: DURUM_RENK.onaylandi,
    },
    {
      label: 'Reddedildi / İptal',
      value: ozet.durumDagilimi.reddedildi + ozet.durumDagilimi.iptal,
      sub: `${ozet.durumDagilimi.reddedildi} red · ${ozet.durumDagilimi.iptal} iptal`,
      accent: DURUM_RENK.reddedildi,
    },
    {
      label: 'PDF Oluşturulan',
      value: ozet.pdfOlusturulanSayisi,
      sub: `%${ozet.pdfYuzde}`,
      accent: '#a78bfa',
    },
    enAktifK
      ? { label: 'En Aktif Kullanıcı', value: formatAdSoyad(enAktifK.adSoyad), sub: `${enAktifK.sayi} teklif` }
      : { label: 'En Aktif Kullanıcı', value: '—', sub: 'Veri yok' },
    enAktifF
      ? { label: 'En Çok Teklif Verilen', value: formatCariAdi(enAktifF.firmaAdi), sub: `${enAktifF.sayi} teklif` }
      : { label: 'En Çok Teklif Verilen', value: '—', sub: 'Veri yok' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: 12,
        marginTop: 14,
      }}
    >
      {kartlar.map((k, i) => (
        <div
          key={i}
          style={{
            ...cardStyle,
            padding: '14px 14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {k.accent && (
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background: k.accent,
                opacity: 0.85,
              }}
            />
          )}
          <div style={{ fontSize: 11, color: C.textFaint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            {k.label}
          </div>
          <div
            style={{
              fontSize: typeof k.value === 'number' ? 24 : 16,
              fontWeight: 700,
              color: C.textPrimary,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={String(k.value)}
          >
            {k.value}
          </div>
          {k.sub && (
            <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 400 }}>{k.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Para Birimi Özeti
// ───────────────────────────────────────────────────────────────────────

function ParaBirimiOzetiPanel({
  ozeti,
  C,
  isMobile,
}: {
  ozeti: ReturnType<typeof paraBirimiOzetiHesapla>;
  C: ReturnType<typeof useColors>;
  isMobile: boolean;
}) {
  const paraBirimleri: ParaBirimi[] = ['TRY', 'EUR', 'USD'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr) auto', gap: 14 }}>
      {paraBirimleri.map((pb) => {
        const toplam = ozeti.toplamlar[pb];
        const kdvHaric = ozeti.kdvHaric[pb];
        const iskonto = ozeti.toplamIskonto[pb];
        const kdv = ozeti.toplamKdv[pb];
        const bos = toplam === 0 && kdvHaric === 0;
        return (
          <div
            key={pb}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              opacity: bos ? 0.55 : 1,
            }}
          >
            <div style={{ fontSize: 11, color: C.textFaint, letterSpacing: '0.08em', fontWeight: 600 }}>{pb}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, textAlign: 'right', marginTop: 4 }}>
              {formatCurrency(toplam, pb)}
            </div>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'auto auto', gap: 4, fontSize: 11.5, color: C.textSecondary }}>
              <span>KDV Hariç</span>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(kdvHaric, pb)}</span>
              <span>İskonto</span>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(iskonto, pb)}</span>
              <span>KDV</span>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(kdv, pb)}</span>
            </div>
          </div>
        );
      })}
      <div style={{ padding: '10px 14px', borderLeft: isMobile ? 'none' : `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.textFaint, letterSpacing: '0.08em', fontWeight: 600 }}>Karışık Para Birimli</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.textPrimary, marginTop: 4 }}>{ozeti.karisikSayisi}</div>
        <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>satır bazlı PB seçimi</div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Kullanıcı Performansı Tablo
// ───────────────────────────────────────────────────────────────────────

function paraBirimiKisaText(t: ParaBirimiToplam): string {
  const parts: string[] = [];
  if (t.TRY > 0) parts.push(formatCurrency(t.TRY, 'TRY'));
  if (t.EUR > 0) parts.push(formatCurrency(t.EUR, 'EUR'));
  if (t.USD > 0) parts.push(formatCurrency(t.USD, 'USD'));
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function KullaniciPerformansiTablo({ data, isMobile }: { data: KullaniciPerformansi[]; isMobile: boolean }) {
  if (data.length === 0) {
    return <Empty description="Henüz veri yok" />;
  }
  const cols: ColumnsType<KullaniciPerformansi> = [
    {
      title: 'Kullanıcı',
      dataIndex: 'adSoyad',
      key: 'adSoyad',
      render: (v: string, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{formatAdSoyad(v)}</div>
          {r.unvan && <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.unvan}</div>}
        </div>
      ),
    },
    { title: 'Toplam', dataIndex: 'toplamTeklifSayisi', key: 'toplam', align: 'right', sorter: (a, b) => a.toplamTeklifSayisi - b.toplamTeklifSayisi },
    { title: 'Onaylanan', dataIndex: 'onaylanan', key: 'onaylanan', align: 'right' },
    { title: 'Bekleyen', dataIndex: 'bekleyen', key: 'bekleyen', align: 'right' },
    {
      title: 'Toplam Tutar',
      key: 'toplamTutar',
      align: 'right',
      render: (_, r) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{paraBirimiKisaText(r.toplamTutar)}</span>,
    },
    {
      title: 'Ortalama',
      key: 'ortalama',
      align: 'right',
      responsive: ['lg'],
      render: (_, r) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{paraBirimiKisaText(r.ortalamaTutar)}</span>,
    },
    {
      title: 'Son Teklif',
      dataIndex: 'sonTeklifTarihi',
      key: 'sonTeklif',
      align: 'right',
      render: (v: string | null) => v ? formatDate(v) : '—',
    },
  ];
  return <Table size="small" rowKey="kullaniciId" columns={cols} dataSource={data} pagination={{ pageSize: isMobile ? 5 : 10, showSizeChanger: false }} scroll={{ x: 'max-content' }} />;
}

// ───────────────────────────────────────────────────────────────────────
// Firma Analiz Tablo
// ───────────────────────────────────────────────────────────────────────

function FirmaAnalizTablo({ data, isMobile }: { data: FirmaAnaliz[]; isMobile: boolean }) {
  if (data.length === 0) return <Empty description="Henüz veri yok" />;
  const cols: ColumnsType<FirmaAnaliz> = [
    {
      title: 'Firma',
      dataIndex: 'firmaAdi',
      key: 'firmaAdi',
      render: (v: string, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{formatCariAdi(v)}</div>
          {r.cariKod && <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.cariKod}</div>}
        </div>
      ),
    },
    { title: 'Toplam', dataIndex: 'toplamTeklifSayisi', key: 'toplam', align: 'right', sorter: (a, b) => a.toplamTeklifSayisi - b.toplamTeklifSayisi, defaultSortOrder: 'descend' },
    { title: 'Onaylanan', dataIndex: 'onaylanan', key: 'onaylanan', align: 'right' },
    { title: 'Bekleyen', dataIndex: 'bekleyen', key: 'bekleyen', align: 'right' },
    {
      title: 'Başarı',
      dataIndex: 'basariOraniYuzde',
      key: 'basari',
      align: 'right',
      render: (v: number, r) => {
        const kapali = r.onaylanan + r.reddedilen;
        if (kapali === 0) return <span style={{ color: '#94a3b8' }}>—</span>;
        const color = v >= 60 ? '#34d399' : v >= 30 ? '#fbbf24' : '#f87171';
        return <Tag color={color}>%{v}</Tag>;
      },
    },
    {
      title: 'Toplam Tutar',
      key: 'toplamTutar',
      align: 'right',
      render: (_, r) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{paraBirimiKisaText(r.toplamTutar)}</span>,
    },
    {
      title: 'Son Teklif',
      dataIndex: 'sonTeklifTarihi',
      key: 'sonTeklif',
      align: 'right',
      render: (v: string | null) => v ? formatDate(v) : '—',
    },
  ];
  return <Table size="small" rowKey="cariId" columns={cols} dataSource={data} pagination={{ pageSize: isMobile ? 5 : 10, showSizeChanger: false }} scroll={{ x: 'max-content' }} />;
}

// ───────────────────────────────────────────────────────────────────────
// Marka & Ürün Tabloları
// ───────────────────────────────────────────────────────────────────────

function MarkaTablo({ data }: { data: MarkaAnaliz[] }) {
  if (data.length === 0) return <Empty description="Henüz veri yok" />;
  const cols: ColumnsType<MarkaAnaliz> = [
    { title: 'Marka', dataIndex: 'marka', key: 'marka' },
    { title: 'Satır Sayısı', dataIndex: 'satirSayisi', key: 'satir', align: 'right', sorter: (a, b) => a.satirSayisi - b.satirSayisi, defaultSortOrder: 'descend' },
    { title: 'Teklif Sayısı', dataIndex: 'teklifSayisi', key: 'teklif', align: 'right' },
    {
      title: 'Toplam Tutar',
      key: 'tutar',
      align: 'right',
      render: (_, r) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{paraBirimiKisaText(r.toplamTutar)}</span>,
    },
  ];
  return <Table size="small" rowKey="marka" columns={cols} dataSource={data} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 'max-content' }} />;
}

function UrunKoduTablo({ data }: { data: UrunKoduAnaliz[] }) {
  if (data.length === 0) return <Empty description="Henüz veri yok" />;
  const cols: ColumnsType<UrunKoduAnaliz> = [
    { title: 'Ürün Kodu', dataIndex: 'urunKod', key: 'urunKod', render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: 'Marka', dataIndex: 'marka', key: 'marka' },
    { title: 'Satır Sayısı', dataIndex: 'satirSayisi', key: 'satir', align: 'right', sorter: (a, b) => a.satirSayisi - b.satirSayisi, defaultSortOrder: 'descend' },
    { title: 'Toplam Miktar', dataIndex: 'toplamMiktar', key: 'miktar', align: 'right', render: (v: number) => v.toLocaleString('tr-TR') },
  ];
  return <Table size="small" rowKey="urunKod" columns={cols} dataSource={data} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 'max-content' }} />;
}

// ───────────────────────────────────────────────────────────────────────
// PDF Aktivite Tablo
// ───────────────────────────────────────────────────────────────────────

function PdfAktiviteTablo({ data, navigate }: { data: PdfAktivite[]; navigate: ReturnType<typeof useNavigate> }) {
  if (data.length === 0) return <Empty description="Henüz PDF üretimi yok" />;
  const cols: ColumnsType<PdfAktivite> = [
    {
      title: 'Tarih',
      dataIndex: 'pdfOlusturmaTarihi',
      key: 'tarih',
      render: (v: string) => <span style={{ fontSize: 12 }}>{formatDate(v)}</span>,
    },
    {
      title: 'Teklif No',
      dataIndex: 'teklifNo',
      key: 'teklifNo',
      render: (v: string, r) => (
        <Button type="link" size="small" onClick={() => navigate(`/teklif/${r.teklifId}`)} style={{ padding: 0, height: 'auto', fontWeight: 600 }}>
          {v || '(no yok)'}
        </Button>
      ),
    },
    { title: 'Müşteri', dataIndex: 'cariAdi', key: 'cari', render: (v: string) => formatCariAdi(v) },
    { title: 'Hazırlayan', dataIndex: 'hazirlayanAdSoyad', key: 'hazirlayan', render: (v: string) => formatAdSoyad(v) },
    {
      title: 'Tutar',
      key: 'tutar',
      align: 'right',
      render: (_, r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.genelToplam, r.paraBirimi)}</span>,
    },
    {
      title: 'Durum',
      dataIndex: 'durum',
      key: 'durum',
      render: (d: TeklifDurum) => <Tag color={DURUM_RENK[d]}>{DURUM_LABEL[d]}</Tag>,
    },
  ];
  return <Table size="small" rowKey="teklifId" columns={cols} dataSource={data} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 'max-content' }} />;
}

// ───────────────────────────────────────────────────────────────────────
// Risk Merkezi
// ───────────────────────────────────────────────────────────────────────

const RISK_BASLIK: Record<RiskKategori, string> = {
  uzunBekleyen: 'Uzun süredir bekleyen',
  yuksekIskonto: 'Yüksek iskonto',
  pdfAmaGonderilmemis: 'PDF üretildi ama unutulmuş',
  satirBosOlan: 'Müşteri var, satır yok',
  yuksekTutarBelirsiz: 'Yüksek tutarlı belirsiz',
  teslimTarihiBos: 'Teslim tarihi boş',
  karisikParaBirimi: 'Karışık para birimi',
};

function RiskMerkezi({
  riskler,
  navigate,
}: {
  riskler: Record<RiskKategori, RiskItem[]>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const kategoriler = Object.keys(RISK_BASLIK) as RiskKategori[];

  const cols: ColumnsType<RiskItem> = [
    {
      title: 'Teklif No',
      dataIndex: 'teklifNo',
      key: 'teklifNo',
      render: (v: string, r) => (
        <Button type="link" size="small" onClick={() => navigate(`/teklif/${r.teklifId}`)} style={{ padding: 0, height: 'auto', fontWeight: 600 }}>
          {v || '(no yok)'}
        </Button>
      ),
    },
    { title: 'Müşteri', dataIndex: 'cariAdi', key: 'cari', render: (v: string) => formatCariAdi(v) },
    { title: 'Hazırlayan', dataIndex: 'hazirlayanAdSoyad', key: 'hazirlayan', render: (v: string) => formatAdSoyad(v), responsive: ['md'] },
    {
      title: 'Tutar',
      key: 'tutar',
      align: 'right',
      render: (_, r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.genelToplam, r.paraBirimi)}</span>,
    },
    {
      title: 'Durum',
      dataIndex: 'durum',
      key: 'durum',
      render: (d: TeklifDurum) => <Tag color={DURUM_RENK[d]}>{DURUM_LABEL[d]}</Tag>,
    },
    { title: 'Detay', dataIndex: 'detay', key: 'detay', render: (v: string) => <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{v}</span> },
  ];

  return (
    <Tabs
      items={kategoriler.map((k) => {
        const items = riskler[k];
        return {
          key: k,
          label: (
            <Tooltip title={RISK_BASLIK[k]}>
              <span>
                {RISK_BASLIK[k]}{' '}
                <Tag color={items.length > 0 ? 'orange' : 'default'} style={{ marginLeft: 4 }}>{items.length}</Tag>
              </span>
            </Tooltip>
          ),
          children: items.length === 0 ? (
            <Empty description="Bu kategoride dikkat çekici teklif yok" />
          ) : (
            <Table size="small" rowKey="teklifId" columns={cols} dataSource={items} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 'max-content' }} />
          ),
        };
      })}
    />
  );
}
