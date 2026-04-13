import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Card, Form, Input, AutoComplete, Select, DatePicker, Button,
  message, Row, Col
} from 'antd';
import { SaveOutlined, EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import CariSecimi from '../components/CariSecimi';
import UrunSatirlari from '../components/UrunSatirlari';
import ToplamPaneli from '../components/ToplamPaneli';
import { teklifService } from '../services/teklifService';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { sanitizeMultilineText } from '../utils/formatters';
import { cariService } from '../services/musteriService';
import type { Teklif, Cari, TeklifSatiri, TeklifDurum } from '../types';
import { useKullanici } from '../context/useKullanici';
import { buttonClassNames } from '../styles/buttonStyles';
import { useColors } from '../hooks/useColors';

const { Option } = Select;
const { TextArea } = Input;

// ── Design System ─────────────────────────────────────────────────────────────
const DS = {
  card: {
    marginBottom: 16,
    borderRadius: 10,
    border: '1px solid var(--border)',
    boxShadow: '0 1px 3px rgba(15,31,69,0.07), 0 1px 2px rgba(15,31,69,0.04)',
  } as CSSProperties,
  cardBody: { padding: '16px 20px' } as CSSProperties,
  secHead: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
    padding: '11px 20px 10px',
    borderBottom: '1px solid var(--border-subtle)',
  } as CSSProperties,
};
// ──────────────────────────────────────────────────────────────────────────────

interface YeniTeklifProps {
  duzenleme?: boolean;
}

export default function YeniTeklif({ duzenleme = false }: YeniTeklifProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const { aktifKullanici } = useKullanici();
  const isMobile = useIsMobile(768);
  const C = useColors();

  // ── Edit modunda mevcut teklifi bir kez yükle ──
  // AppRouter'da `<YeniTeklifEditor>` `key={id}` ile remount sağladığı için
  // lazy initializer her id için tek seferlik temiz bir state üretir.
  const mevcut = duzenleme && id ? teklifService.teklifGetir(id) : null;

  const [cari, setCari]                 = useState<Cari | null>(mevcut?.cari ?? null);
  const [satirlar, setSatirlar]         = useState<TeklifSatiri[]>(mevcut?.satirlar ?? []);
  const [satirBazliParaBirimi, setSatirBazliParaBirimi] = useState<boolean>(mevcut?.satirBazliParaBirimi ?? false);
  const [paraBirimi, setParaBirimi]     = useState<string>(mevcut?.paraBirimi ?? 'EUR');
  const [durum, setDurum]               = useState<TeklifDurum>(mevcut?.durum ?? 'taslak');
  const [notlar, setNotlar]             = useState(mevcut?.notlar ?? '');
  const [kdvOrani, setKdvOrani]         = useState(mevcut?.kdvOrani ?? 0);
  const [iskontoOrani, setIskontoOrani] = useState(mevcut?.iskontoOrani ?? 0);
  const [odemeVadesi, setOdemeVadesi]   = useState<string>(mevcut?.odemeVadesi ?? '45 Gün');
  const [contactName, setContactName]   = useState(mevcut?.contactName ?? '');
  const [contactTitle, setContactTitle] = useState<'BEY' | 'HANIM'>(mevcut?.contactTitle ?? 'BEY');
  const [teklifId] = useState(() => mevcut ? id! : teklifService.teklifIdUret());
  const [teklifNo, setTeklifNo] = useState<string>(mevcut?.teklifNo ?? '...');

  useEffect(() => {
    if (!mevcut) {
      teklifService.teklifNoUretAsync().then(setTeklifNo).catch(() => setTeklifNo('ERR'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Antd Form içsel state'ini mount sırasında bir kez senkronize et.
  // form.setFieldsValue React state'i değil — react-hooks/set-state-in-effect
  // tarafından flag edilmez, ama yine de cascading render üretmez çünkü Antd
  // bu çağrıyı internal store'una commit eder.
  useEffect(() => {
    if (mevcut) {
      form.setFieldsValue({
        tarih: dayjs(mevcut.tarih),
        paraBirimi: mevcut.paraBirimi,
        durum: mevcut.durum,
      });
    } else {
      form.setFieldsValue({ tarih: dayjs(), paraBirimi: 'EUR', durum: 'taslak' });
    }
    // Mount-only: id key wrapper'ı remount sağlıyor, dep array boş.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    araToplam,
    kdvTutar: toplamVergi, genelToplam,
  } = hesaplamaMotoru.genelToplamHesapla(satirlar, kdvOrani, iskontoOrani);
  // Satır bazlı bireysel iskonto araToplam'a zaten dahil — ayrıca gösterilmez.
  const toplamIndirim = 0;
  const satirParaToplamlari = hesaplamaMotoru.paraBirimineGoreToplamlar(satirlar, paraBirimi);

  function teklifOlustur(): Teklif {
    const tarihVal = form.getFieldValue('tarih');
    return {
      id: teklifId,
      teklifNo,
      tarih: tarihVal ? dayjs(tarihVal).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      satirBazliParaBirimi,
      paraBirimi,
      durum,
      cari: cari!,
      satirlar,
      araToplam,
      toplamIndirim,
      toplamVergi,
      genelToplam,
      kdvOrani,
      iskontoOrani,
      odemeVadesi,
      notlar,
      olusturmaTarihi: mevcut?.olusturmaTarihi ?? dayjs().toISOString(),
      guncellemeTarihi: dayjs().toISOString(),
      hazirlayanKullaniciId: aktifKullanici?.id,
      hazirlayanAdSoyad: aktifKullanici?.adSoyad,
      hazirlayanRol: aktifKullanici?.rol,
      gecerlilikSuresi: '1 Hafta',
      contactName: contactName.trim() || undefined,
      contactTitle: contactName.trim() ? contactTitle : undefined,
    };
  }

  function satirBazliParaBirimiDegistir(aktif: boolean) {
    setSatirBazliParaBirimi(aktif);
    if (!aktif) return;

    setSatirlar((onceki) => onceki.map((satir) => ({
      ...satir,
      paraBirimi: hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi),
    })));
  }

  function kaydet() {
    if (!cari) { message.warning('Lütfen cari seçin.'); return; }
    if (satirlar.length === 0) { message.warning('En az bir ürün satırı ekleyin.'); return; }
    teklifService.teklifKaydet(teklifOlustur());
    message.success('Teklif kaydedildi.');
    navigate('/teklifler');
  }

  function onizle() {
    if (!cari) { message.warning('Lütfen cari seçin.'); return; }
    if (satirlar.length === 0) { message.warning('En az bir ürün satırı ekleyin.'); return; }
    teklifService.teklifKaydet(teklifOlustur());
    navigate(`/teklif/${teklifId}/onizleme`);
  }

  return (
    <div style={{ padding: isMobile ? '16px 12px 40px' : '28px 32px 56px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── BAŞLIK ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 28,
        paddingBottom: 22,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          className={buttonClassNames.secondary}
          onClick={() => navigate('/teklifler')}
          style={{
            border: `1px solid ${C.borderInput}`,
            boxShadow: '0 1px 2px rgba(15,31,69,0.06)',
            color: C.textSecondary,
          }}
        >
          Geri
        </Button>
        <div>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: C.textPrimary,
            letterSpacing: -0.5,
            lineHeight: 1.2,
          }}>
            {duzenleme ? 'Teklif Düzenle' : 'Yeni Teklif'}
          </div>
          <div style={{
            fontSize: 11,
            color: C.textFaint,
            marginTop: 3,
            letterSpacing: 0.8,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {teklifNo}
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical">

        {/* ── CARİ ─────────────────────────────────────────── */}
        <Card
          title={<span style={DS.secHead}>Cari</span>}
          styles={{ header: { padding: 0, minHeight: 0, border: 'none' } }}
          style={DS.card}
          bodyStyle={DS.cardBody}
        >
          <CariSecimi
            value={cari}
            onChange={(secilen) => {
              setCari(secilen);
              if (secilen.lastContactName) {
                setContactName(secilen.lastContactName);
                setContactTitle(secilen.lastContactTitle ?? 'BEY');
              } else {
                setContactName('');
                setContactTitle('BEY');
              }
            }}
          />
          {cari && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: C.bgElevated,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.textSecondary,
                letterSpacing: 0.7,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                Muhatap
              </span>
              <Input
                size="small"
                placeholder="Ad Soyad (opsiyonel)"
                value={contactName}
                onChange={(e) => {
                  setContactName(e.target.value);
                  cariService.cariMuhatapGuncelle(cari.id, e.target.value.trim(), contactTitle);
                }}
                style={{ flex: 1, maxWidth: 280, borderRadius: 6 }}
                allowClear
              />
              <Select
                size="small"
                value={contactTitle}
                onChange={(v: 'BEY' | 'HANIM') => {
                  setContactTitle(v);
                  cariService.cariMuhatapGuncelle(cari.id, contactName.trim(), v);
                }}
                style={{ width: 84 }}
              >
                <Option value="BEY">Bey</Option>
                <Option value="HANIM">Hanım</Option>
              </Select>
            </div>
          )}
        </Card>

        {/* ── TEKLİF PARAMETRELERİ ──────────────────────────── */}
        <Card
          title={<span style={DS.secHead}>Teklif Parametreleri</span>}
          styles={{ header: { padding: 0, minHeight: 0, border: 'none' } }}
          style={DS.card}
          bodyStyle={DS.cardBody}
        >
          {/* — Satır 1 — */}
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={5}>
              <Form.Item label="Teklif No" style={{ marginBottom: 12 }}>
                <Input
                  value={teklifNo}
                  disabled
                  style={{
                    borderRadius: 6,
                    background: C.bgElevated,
                    color: C.textSecondary,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={4}>
              <Form.Item name="tarih" label="Tarih" style={{ marginBottom: 12 }}>
                <DatePicker style={{ width: '100%', borderRadius: 6 }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={4}>
              <Form.Item label="Para Birimi" style={{ marginBottom: 12 }}>
                <AutoComplete
                  value={paraBirimi}
                  onChange={setParaBirimi}
                  options={[
                    { value: 'EUR', label: 'EUR — €' },
                    { value: 'USD', label: 'USD — $' },
                    { value: 'TRY', label: 'TRY — ₺' },
                    { value: 'GBP', label: 'GBP — £' },
                    { value: 'CHF', label: 'CHF — ₣' },
                  ]}
                  style={{ width: '100%' }}
                  placeholder="EUR"
                >
                  <Input style={{ borderRadius: 6 }} />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col xs={24} sm={7}>
              <Form.Item label="Ödeme Vadesi" style={{ marginBottom: 12 }}>
                <AutoComplete
                  value={odemeVadesi}
                  onChange={setOdemeVadesi}
                  options={[
                    { value: 'Peşin' },
                    { value: '15 Gün' },
                    { value: '30 Gün' },
                    { value: '45 Gün' },
                    { value: '60 Gün' },
                    { value: '90 Gün' },
                    { value: '120 Gün' },
                  ]}
                  style={{ width: '100%' }}
                  placeholder="45 Gün"
                >
                  <Input style={{ borderRadius: 6 }} />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col xs={24} sm={4}>
              <Form.Item name="durum" label="Durum" style={{ marginBottom: 12 }}>
                <Select style={{ borderRadius: 6 }} onChange={(v: TeklifDurum) => setDurum(v)}>
                  <Option value="taslak">Taslak</Option>
                  <Option value="hazir">Hazır</Option>
                  <Option value="gonderildi">Gönderildi</Option>
                  <Option value="onaylandi">Onaylandı</Option>
                  <Option value="iptal">İptal</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

        </Card>

        {/* ── ÜRÜN KALEMLERİ ───────────────────────────────── */}
        <Card
          title={<span style={DS.secHead}>Teklif Kalemleri</span>}
          styles={{ header: { padding: 0, minHeight: 0, border: 'none' } }}
          style={DS.card}
          bodyStyle={DS.cardBody}
        >
          <UrunSatirlari
            satirlar={satirlar}
            paraBirimi={paraBirimi}
            satirBazliParaBirimi={satirBazliParaBirimi}
            onSatirBazliParaBirimiChange={satirBazliParaBirimiDegistir}
            onChange={setSatirlar}
          />
        </Card>

        {/* ── TOPLAM ───────────────────────────────────────── */}
        <Card style={{ ...DS.card, marginBottom: 16 }} bodyStyle={DS.cardBody}>
          <ToplamPaneli
            araToplam={araToplam}
            toplamIndirim={toplamIndirim}
            paraBirimi={paraBirimi}
            satirBazliParaBirimi={satirBazliParaBirimi}
            satirParaToplamlari={satirParaToplamlari}
            kdvOrani={kdvOrani}
            onKdvOraniChange={setKdvOrani}
            iskontoOrani={iskontoOrani}
            onIskontoOraniChange={setIskontoOrani}
          />
        </Card>

        {/* ── NOTLAR ───────────────────────────────────────── */}
        <Card
          title={<span style={DS.secHead}>Notlar</span>}
          styles={{ header: { padding: 0, minHeight: 0, border: 'none' } }}
          style={{ ...DS.card, marginBottom: 32 }}
          bodyStyle={DS.cardBody}
        >
          <TextArea
            rows={3}
            value={notlar}
            onChange={(e) => setNotlar(e.target.value)}
            onBlur={() => setNotlar(sanitizeMultilineText(notlar))}
            placeholder="Teslimat koşulları, teknik notlar, ödeme şartları..."
            style={{ borderRadius: 6, resize: 'vertical', fontSize: 13, lineHeight: 1.6 }}
          />
        </Card>

        {/* ── EYLEM ÇUBUĞU ─────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <Button
            onClick={() => navigate('/teklifler')}
            className={buttonClassNames.ghost}
            style={{ borderRadius: 7, color: '#64748b' }}
          >
            İptal
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={kaydet}
            className={buttonClassNames.secondary}
            style={{
              border: `1px solid ${C.textPrimary}`,
              color: C.textPrimary,
              boxShadow: '0 1px 2px rgba(15,31,69,0.08)',
            }}
          >
            Kaydet
          </Button>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={onizle}
            className={buttonClassNames.primary}
            style={{
              background: 'linear-gradient(180deg, #1a2f5e 0%, #0f1f45 100%)',
              borderColor: '#0f1f45',
              boxShadow: '0 2px 6px rgba(15,31,69,0.30)',
            }}
          >
            Önizle &amp; PDF
          </Button>
        </div>

      </Form>
    </div>
  );
}
