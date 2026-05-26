import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Tabs, Tag, Select, InputNumber, Divider } from 'antd';
import { referansVeriService } from '../services/referansVeriService';
import { useKullanici } from '../context/useKullanici';
import { useFirma } from '../context/useFirma';
import type { Firma } from '../types/firma';
import { FIRMA_KART_LAYOUT } from '../components/FirmaSecimKartLayout';
import { LogoContainer } from '../components/LogoContainer';
import { getAdaptiveLogoPlacement } from '../styles/logoStyles';
import { isYonetici as isYoneticiRol } from '../utils/yetkiUtils';
import { useSayfaRehberi } from '../hooks/useSayfaRehberi';
import { FIRMA_PROFIL_TIPLERI } from './FirmaProfilSayfasi.tips';

export default function FirmaProfilSayfasi() {
  useSayfaRehberi(FIRMA_PROFIL_TIPLERI, { sayfaAdi: 'Firma Profili' });
  const { aktifKullanici } = useKullanici();
  const { firmalar, firmaGuncelle, refresh } = useFirma();
  const isAdmin = isYoneticiRol(aktifKullanici?.rol);

  const [activeFirmaId, setActiveFirmaId] = useState<string>(() => {
    if (isAdmin) return firmalar[0]?.id || 'meba';
    return aktifKullanici?.firmaId || '';
  });

  const fallbackFirmaId = isAdmin ? firmalar[0]?.id || '' : aktifKullanici?.firmaId || '';
  const safeActiveFirmaId = firmalar.some((f) => f.id === activeFirmaId) ? activeFirmaId : fallbackFirmaId;
  const firma = firmalar.find((f) => f.id === safeActiveFirmaId) || null;

  const tabs = isAdmin
    ? firmalar.map((f) => ({
        key: f.id,
        label: (() => {
          const inlineLogo = getAdaptiveLogoPlacement({
            firmaId: f.id,
            logoPath: f.logoPath,
            surface: 'inline-tab',
            objectPosition: 'left center',
          });

          return (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ ...inlineLogo.slotStyle, marginRight: 8 }}>
                <img
                  src={f.logoPath}
                  alt={f.kisaAd}
                  style={inlineLogo.imageStyle}
                />
              </span>
              {f.kisaAd}
            </span>
          );
        })(),
        children: firma?.id === f.id ? <FirmaForm firma={firma} onSave={async (patch) => {
          const r = await firmaGuncelle(firma.id, patch);
          if (r.ok) { message.success('Firma profili güncellendi'); await refresh(); }
          else      { message.error(r.error); }
        }} /> : null,
      }))
    : [];

  return (
    <div style={{ padding: '14px 24px 24px', maxWidth: 980, margin: '0 auto' }}>
      <Card
        title={
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Firma Profili</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
              {isAdmin
                ? 'Firma bilgilerini düzenleyin (PDF teklif şablonunda kullanılır)'
                : `${firma?.ad || ''} firma profili`}
            </div>
          </div>
        }
      >
        {isAdmin
          ? <Tabs activeKey={safeActiveFirmaId} onChange={setActiveFirmaId} items={tabs} />
          : firma
            ? <FirmaForm firma={firma} onSave={async (patch) => {
                const r = await firmaGuncelle(firma.id, patch);
                if (r.ok) { message.success('Firma profili güncellendi'); await refresh(); }
                else      { message.error(r.error); }
              }} />
            : <div style={{ padding: 24, color: '#94a3b8' }}>Firma bulunamadı.</div>
        }
      </Card>
    </div>
  );
}

function FirmaForm({ firma, onSave }: { firma: Firma; onSave: (patch: Partial<Firma>) => Promise<void> }) {
  const [form] = Form.useForm<Firma>();
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    form.setFieldsValue(firma);
  }, [firma, form]);

  async function handleFinish(values: Firma) {
    setYukleniyor(true);
    await onSave(values);
    setYukleniyor(false);
  }

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}>
      <div style={{
        width: FIRMA_KART_LAYOUT.cardWidth,
        padding: FIRMA_KART_LAYOUT.cardPadding,
        background: '#f8fafc',
        borderRadius: FIRMA_KART_LAYOUT.cardBorderRadius,
        textAlign: 'center',
        flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: FIRMA_KART_LAYOUT.cardInnerGap,
        boxSizing: 'border-box',
      }}>
        <LogoContainer firma={firma} />
        <div style={{ fontSize: 13, fontWeight: 600 }}>{firma.ad}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{firma.slogan}</div>
        <div style={{ marginTop: 10 }}>
          <Tag color="default">ID: {firma.id}</Tag>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 320 }}>
        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={firma}>
          <Form.Item name="ad" label="Firma Adı" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="kisaAd" label="Kısa Ad" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="teklifPrefix" label="Teklif No Öneki" style={{ flex: 1 }}>
              <Input placeholder="MEBA / ELMOS / MESA" />
            </Form.Item>
          </div>
          <Form.Item name="slogan" label="Slogan / Sektör">
            <Input />
          </Form.Item>
          <Form.Item name="adres" label="Adres">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="vergiDairesi" label="Vergi Dairesi" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="vergiNo" label="Vergi No" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="telefon" label="Telefon" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="eposta" label="E-posta" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="web" label="Web Adresi">
            <Input placeholder="www.mebamekanik.com" />
          </Form.Item>
          <Form.Item name="iban" label="IBAN">
            <Input placeholder="TR..." />
          </Form.Item>

          <Divider style={{ margin: '12px 0 16px' }}>Teklif Varsayılanları</Divider>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
            Yeni teklif oluşturulurken bu firma için ön-doldurulan değerler. Cariye ait son teklif ayarları varsa onlar önceliklidir.
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name={['varsayilanlar', 'paraBirimi']} label="Para Birimi" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="EUR"
                options={referansVeriService.paraBirimleri.tumunuGetir().map((p) => ({ value: p, label: p }))}
              />
            </Form.Item>
            <Form.Item name={['varsayilanlar', 'kdvOrani']} label="KDV Oranı (%)" style={{ flex: 1 }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
            <Form.Item name={['varsayilanlar', 'iskontoOrani']} label="İskonto (%)" style={{ flex: 1 }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name={['varsayilanlar', 'odemeVadesi']} label="Ödeme Vadesi" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="45 Gün"
                options={referansVeriService.odemeVadesiSecenekleri.tumunuGetir().map((v) => ({ value: v, label: v }))}
              />
            </Form.Item>
            <Form.Item name={['varsayilanlar', 'gecerlilikSuresi']} label="Geçerlilik Süresi" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="1 Hafta"
                options={referansVeriService.gecerlilikSecenekleri.tumunuGetir().map((v) => ({ value: v, label: v }))}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name={['varsayilanlar', 'marka']} label="Marka" style={{ flex: 1 }}>
              <Select
                allowClear
                showSearch
                placeholder="SMC / MUHTELİF / —"
                options={referansVeriService.markalar.tumunuGetir().map((m) => ({ value: m, label: m }))}
              />
            </Form.Item>
            <Form.Item name={['varsayilanlar', 'birim']} label="Birim" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="Adet"
                options={referansVeriService.birimler.tumunuGetir().map((b) => ({ value: b, label: b }))}
              />
            </Form.Item>
            <Form.Item name={['varsayilanlar', 'teslimTarihi']} label="Teslim Süresi" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="2-3 Gün"
                options={referansVeriService.teslimSecenekleri.tumunuGetir().map((t) => ({ value: t, label: t }))}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={yukleniyor}>
              Kaydet
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
