import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, message, Tabs, Avatar, Tag } from 'antd';
import { useKullanici } from '../context/useKullanici';
import { useFirma } from '../context/useFirma';
import type { Firma } from '../types/firma';

export default function FirmaProfilSayfasi() {
  const { aktifKullanici } = useKullanici();
  const { firmalar, firmaGuncelle, refresh } = useFirma();
  const isSuperAdmin = aktifKullanici?.rol === 'super_admin';

  const [activeFirmaId, setActiveFirmaId] = useState<string>(() => {
    if (isSuperAdmin) return firmalar[0]?.id || 'meba';
    return aktifKullanici?.firmaId || '';
  });

  useEffect(() => {
    if (firmalar.length && !firmalar.some((f) => f.id === activeFirmaId)) {
      setActiveFirmaId(isSuperAdmin ? firmalar[0]?.id || '' : aktifKullanici?.firmaId || '');
    }
  }, [firmalar, activeFirmaId, isSuperAdmin, aktifKullanici]);

  const firma = firmalar.find((f) => f.id === activeFirmaId) || null;

  const tabs = isSuperAdmin
    ? firmalar.map((f) => ({
        key: f.id,
        label: (
          <span>
            <Avatar src={f.logoPath} size="small" style={{ marginRight: 8, background: '#fff' }} />
            {f.kisaAd}
          </span>
        ),
        children: firma?.id === f.id ? <FirmaForm firma={firma} onSave={async (patch) => {
          const r = await firmaGuncelle(firma.id, patch);
          if (r.ok) { message.success('Firma profili güncellendi'); await refresh(); }
          else      { message.error(r.error); }
        }} /> : null,
      }))
    : [];

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <Card
        title={
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Firma Profili</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
              {isSuperAdmin
                ? 'Firma bilgilerini düzenleyin (PDF teklif şablonunda kullanılır)'
                : `${firma?.ad || ''} firma profili`}
            </div>
          </div>
        }
      >
        {isSuperAdmin
          ? <Tabs activeKey={activeFirmaId} onChange={setActiveFirmaId} items={tabs} />
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
      <div style={{ width: 220, padding: 20, background: '#f8fafc', borderRadius: 12, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ marginBottom: 12, padding: 16, background: '#fff', borderRadius: 8, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={firma.logoPath} alt={firma.kisaAd} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
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
          <Form.Item name="iban" label="IBAN">
            <Input placeholder="TR..." />
          </Form.Item>
          <Form.Item name="pdfKlasorAdi" label="PDF Çıktı Klasör Adı"
            extra="Masaüstüne kaydedilen PDF'lerin ana klasör adı (örn: MEBA MEKANİK TEKLİFLER)">
            <Input />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="renkBirincil" label="Birincil Renk" style={{ flex: 1 }}>
              <Input addonBefore="#" placeholder="1a3a8c" />
            </Form.Item>
            <Form.Item name="renkVurgu" label="Vurgu Rengi" style={{ flex: 1 }}>
              <Input addonBefore="#" placeholder="b99434" />
            </Form.Item>
            <Form.Item name="logoPath" label="Logo Yolu" style={{ flex: 2 }}
              extra="public/ klasöründen göreli — örn: /logo-meba.png">
              <Select
                options={[
                  { value: '/logo-meba.png',  label: '/logo-meba.png' },
                  { value: '/logo-elmos.png', label: '/logo-elmos.png' },
                  { value: '/logo-mesa.png',  label: '/logo-mesa.png' },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="logoScale" label="Logo Görsel Ölçeği"
            extra="Firma seçim ekranında logo boyutu (varsayılan 1.0). Kareye yakın logolar için 1.2-1.6 arası dene.">
            <Input type="number" step="0.05" min="0.5" max="2.5" placeholder="1.0" />
          </Form.Item>
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
