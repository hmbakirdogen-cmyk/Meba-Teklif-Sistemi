import { useState } from 'react';
import {
  App, Button, Card, Col, Divider, Empty, Form, Input, InputNumber,
  List, Modal, Popconfirm, Row, Select, Tabs, Typography,
} from 'antd';
import {
  DeleteOutlined, EditOutlined, PlusOutlined, SettingOutlined,
} from '@ant-design/icons';
import { referansVeriService } from '../services/referansVeriService';
import { urunSetService } from '../services/urunSetService';
import type { UrunSeti } from '../types';
import { normalizeProductCode, cleanTextInput, formatMarka, formatDisplayText } from '../utils/formatters';
import { useIsMobile } from '../hooks/useIsMobile';
import { buttonClassNames } from '../styles/buttonStyles';
import { useSayfaRehberi } from '../hooks/useSayfaRehberi';
import { REFERANS_VERILER_TIPLERI } from './ReferansVerilerSayfasi.tips';

// ─────────────────────────────────────────────────────────────────────────────
// UrunSetModal
// ─────────────────────────────────────────────────────────────────────────────
function UrunSetModal({
  acik,
  set,
  onKaydet,
  onIptal,
}: {
  acik: boolean;
  set: UrunSeti | null;
  onKaydet: () => void;
  onIptal: () => void;
}) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const isMobile = useIsMobile(640);
  const yeni = !set;

  const birimler = referansVeriService.birimler.tumunuGetir();

  function kaydet() {
    form.validateFields().then((vals) => {
      const kalemler = (vals.kalemler ?? [])
        .filter((k: { urunKod?: string }) => (k.urunKod ?? '').trim())
        .map((k: { id?: string; urunKod: string; aciklama?: string; miktar?: number; birim?: string }) => ({
          id: k.id || urunSetService.setKalemIdUret(),
          urunKod: normalizeProductCode(k.urunKod ?? ''),
          aciklama: cleanTextInput(k.aciklama ?? ''),
          miktar: Math.max(0, Number(k.miktar ?? 0)),
          birim: cleanTextInput(k.birim ?? '') || 'Adet',
        }));

      if (kalemler.length === 0) {
        message.warning('Set için en az 1 alt kalem giriniz.');
        return;
      }

      modal.confirm({
        title: yeni ? 'Set kaydedilsin mi?' : 'Set güncellensin mi?',
        content: `${vals.setKod} kodlu set ${kalemler.length} alt kalem ile kaydedilecek.`,
        okText: 'Onayla',
        cancelText: 'İptal',
        onOk: () => {
          const now = new Date().toISOString();
          const kayit: UrunSeti = {
            id: set?.id ?? urunSetService.setIdUret(),
            setKod: normalizeProductCode(vals.setKod ?? ''),
            aciklama: cleanTextInput(vals.aciklama ?? ''),
            kalemler,
            olusturmaTarihi: set?.olusturmaTarihi ?? now,
            guncellemeTarihi: now,
          };
          urunSetService.setKaydet(kayit);
          message.success(yeni ? 'Set eklendi.' : 'Set güncellendi.');
          form.resetFields();
          onKaydet();
        },
      });
    });
  }

  return (
    <Modal
      title={yeni ? 'Yeni Set Ekle' : 'Set Düzenle'}
      open={acik}
      onOk={kaydet}
      onCancel={() => { form.resetFields(); onIptal(); }}
      okText="Kaydet"
      cancelText="İptal"
      width={isMobile ? 'calc(100vw - 20px)' : 760}
      afterOpenChange={(open) => {
        if (!open) return;
        if (!set) {
          form.setFieldsValue({ kalemler: [{ id: urunSetService.setKalemIdUret(), urunKod: '', aciklama: '', miktar: 1, birim: 'Adet' }] });
          return;
        }
        form.setFieldsValue({
          setKod: set.setKod,
          aciklama: set.aciklama,
          kalemler: set.kalemler,
        });
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Row gutter={12}>
          <Col span={10}>
            <Form.Item name="setKod" label="Set Kodu" rules={[{ required: true, message: 'Zorunlu' }]} getValueFromEvent={(e) => formatDisplayText(e.target.value, 'product_code')}>
              <Input placeholder="SET-001" />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item name="aciklama" label="Set Açıklaması" rules={[{ required: true, message: 'Zorunlu' }]} getValueFromEvent={(e) => formatDisplayText(e.target.value, 'description')}>
              <Input placeholder="Örn: Pano Montaj Seti" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 14px' }} />

        <Form.List name="kalemler">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Row gutter={8} key={field.key} align="middle" style={{ marginBottom: 8 }}>
                  <Col span={7}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'urunKod']}
                      label="Alt Ürün Kodu"
                      rules={[{ required: true, message: 'Zorunlu' }]}
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => formatDisplayText(e?.target?.value ?? '', 'product_code')}
                    >
                      <Input
                        autoCapitalize="characters"
                        style={{ textTransform: 'uppercase' }}
                        placeholder="SMC-123"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={9}>
                    <Form.Item {...field} name={[field.name, 'aciklama']} label="Açıklama" style={{ marginBottom: 0 }} getValueFromEvent={(e) => formatDisplayText(e.target.value, 'description')}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Form.Item {...field} name={[field.name, 'miktar']} label="Adet" style={{ marginBottom: 0 }}>
                      <InputNumber min={0} step={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item {...field} name={[field.name, 'birim']} label="Birim" style={{ marginBottom: 0 }}>
                      <Select
                        placeholder="Adet"
                        options={birimler.map((b) => ({ value: b, label: b }))}
                        showSearch
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                  <Col span={1} style={{ paddingTop: 22, textAlign: 'right' }}>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                      aria-label="Alt Kalem Sil"
                      className={buttonClassNames.smallActionDanger}
                    />
                  </Col>
                </Row>
              ))}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => add({ id: urunSetService.setKalemIdUret(), urunKod: '', aciklama: '', miktar: 1, birim: 'Adet' })}
              >
                Alt Kalem Ekle
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ürün Setleri Sekmesi
// ─────────────────────────────────────────────────────────────────────────────
function UrunSetleriTab() {
  const { message } = App.useApp();
  const [setler, setSetler] = useState<UrunSeti[]>(() => urunSetService.tumSetleriGetir());
  const [modalAcik, setModalAcik] = useState(false);
  const [seciliSet, setSeciliSet] = useState<UrunSeti | null>(null);

  function listeyiYenile() { setSetler(urunSetService.tumSetleriGetir()); }

  function setDuzenle(s: UrunSeti) { setSeciliSet(s); setModalAcik(true); }
  function setEkleAc() { setSeciliSet(null); setModalAcik(true); }

  function setSil(id: string) {
    urunSetService.setSil(id);
    listeyiYenile();
    message.success('Set silindi.');
  }

  const kolonlar = [
    {
      title: 'Set Kodu',
      dataIndex: 'setKod',
      key: 'setKod',
      width: 140,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{v}</span>
      ),
    },
    {
      title: 'Açıklama',
      dataIndex: 'aciklama',
      key: 'aciklama',
      ellipsis: true,
    },
    {
      title: 'Kalem Sayısı',
      key: 'kalemSayisi',
      width: 110,
      render: (_: unknown, rec: UrunSeti) => (
        <span style={{ fontWeight: 600 }}>{rec.kalemler.length}</span>
      ),
    },
    {
      title: '',
      key: 'islem',
      width: 80,
      render: (_: unknown, rec: UrunSeti) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setDuzenle(rec)}
            className={buttonClassNames.smallAction}
          />
          <Popconfirm
            title="Set silinecek"
            description="Bu işlem geri alınamaz."
            onConfirm={() => setSil(rec.id)}
            okText="Sil"
            cancelText="İptal"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              className={buttonClassNames.smallActionDanger}
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  // Minimal table implementation with antd List to avoid Table import complexity
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={setEkleAc} className={buttonClassNames.primary} data-tip-target="referans-yeni-set">
          Yeni Set Ekle
        </Button>
      </div>

      {setler.length === 0 ? (
        <Empty description="Henüz ürün seti eklenmemiş" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              {kolonlar.map((k) => (
                <th
                  key={k.key}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#374151',
                    background: '#fafafa',
                    width: k.width,
                  }}
                >
                  {k.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {setler.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{s.setKod}</span>
                </td>
                <td style={{ padding: '8px 12px', maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.aciklama}
                </td>
                <td style={{ padding: '8px 12px', width: 110 }}>
                  <span style={{ fontWeight: 600 }}>{s.kalemler.length}</span>
                </td>
                <td style={{ padding: '8px 12px', width: 80 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => setDuzenle(s)}
                      className={buttonClassNames.smallAction}
                    />
                    <Popconfirm
                      title="Set silinecek"
                      description="Bu işlem geri alınamaz."
                      onConfirm={() => setSil(s.id)}
                      okText="Sil"
                      cancelText="İptal"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        className={buttonClassNames.smallActionDanger}
                      />
                    </Popconfirm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <UrunSetModal
        acik={modalAcik}
        set={seciliSet}
        onKaydet={() => { setModalAcik(false); listeyiYenile(); }}
        onIptal={() => setModalAcik(false)}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Basit Liste Yönetimi (Tab 1-7 için ortak)
// ─────────────────────────────────────────────────────────────────────────────
type ReferansAlan = keyof typeof referansVeriService;

interface ListeYonetimiProps {
  alan: ReferansAlan;
  placeholder: string;
  /** Input'tan önce değeri dönüştür (ör: toUpperCase) */
  transformInput?: (val: string) => string;
  /** Listede gösterilirken dönüştür (ör: KDV için "%20") */
  formatLabel?: (val: string) => string;
  /** InputNumber kullan (KDV için) */
  useNumber?: boolean;
}

function ListeYonetimi({ alan, placeholder, transformInput, formatLabel, useNumber }: ListeYonetimiProps) {
  const { message } = App.useApp();
  const servis = referansVeriService[alan];
  const [liste, setListe] = useState<string[]>(() => servis.tumunuGetir());
  const [yeniDeger, setYeniDeger] = useState('');
  const [numberDeger, setNumberDeger] = useState<number | null>(null);

  function listeYenile() { setListe(servis.tumunuGetir()); }

  function ekle() {
    const ham = useNumber
      ? (numberDeger !== null ? String(numberDeger) : '')
      : yeniDeger.trim();
    const deger = transformInput ? transformInput(ham) : ham;
    if (!deger) return;
    servis.ekle(deger);
    listeYenile();
    if (useNumber) setNumberDeger(null);
    else setYeniDeger('');
    message.success('Seçenek eklendi.');
  }

  function sil(deger: string) {
    servis.sil(deger);
    listeYenile();
    message.success('Seçenek silindi.');
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {useNumber ? (
          <InputNumber
            placeholder={placeholder}
            value={numberDeger}
            min={0}
            max={100}
            style={{ flex: 1 }}
            onChange={(v) => setNumberDeger(v)}
            onPressEnter={ekle}
          />
        ) : (
          <Input
            placeholder={placeholder}
            value={yeniDeger}
            onChange={(e) => setYeniDeger(transformInput ? transformInput(e.target.value) : e.target.value)}
            onPressEnter={ekle}
            style={{ flex: 1 }}
            maxLength={(alan as string) === 'paraBirimleri' ? 3 : undefined}
          />
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={ekle}>
          Ekle
        </Button>
      </div>

      {liste.length === 0 ? (
        <Empty description="Henüz seçenek eklenmemiş" />
      ) : (
        <List
          size="small"
          dataSource={liste}
          renderItem={(item) => (
            <List.Item
              style={{ padding: '8px 4px' }}
              actions={[
                <Popconfirm
                  key="sil"
                  title="Bu seçeneği silmek istediğinize emin misiniz?"
                  onConfirm={() => sil(item)}
                  okText="Sil"
                  cancelText="İptal"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    className={buttonClassNames.smallActionDanger}
                  />
                </Popconfirm>,
              ]}
            >
              {formatLabel ? formatLabel(item) : item}
            </List.Item>
          )}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Sayfa
// ─────────────────────────────────────────────────────────────────────────────
export default function ReferansVerilerSayfasi() {
  useSayfaRehberi(REFERANS_VERILER_TIPLERI, { sayfaAdi: 'Referans Veriler' });
  const tabItems = [
    {
      key: 'markalar',
      label: 'Markalar',
      children: (
        <ListeYonetimi
          alan="markalar"
          placeholder="Yeni marka adı"
          transformInput={(v) => formatMarka(v)}
        />
      ),
    },
    {
      key: 'birimler',
      label: 'Birimler',
      children: (
        <ListeYonetimi
          alan="birimler"
          placeholder="ör: Metre, Kg, Paket"
          transformInput={(v) => formatDisplayText(v, 'unit')}
        />
      ),
    },
    {
      key: 'paraBirimleri',
      label: 'Para Birimi',
      children: (
        <ListeYonetimi
          alan="paraBirimleri"
          placeholder="ör: GBP"
          transformInput={(v) => formatDisplayText(v, 'currency')}
        />
      ),
    },
    {
      key: 'odemeVadesiSecenekleri',
      label: 'Ödeme Vadesi',
      children: (
        <ListeYonetimi
          alan="odemeVadesiSecenekleri"
          placeholder="ör: 30 Gün, Peşin"
          transformInput={(v) => formatDisplayText(v, 'text')}
        />
      ),
    },
    {
      key: 'kdvOranlari',
      label: 'KDV Oranı',
      children: (
        <ListeYonetimi
          alan="kdvOranlari"
          placeholder="ör: 10"
          useNumber
          formatLabel={(v) => (v === '0' ? '%0 (Hariç)' : `%${v}`)}
        />
      ),
    },
    {
      key: 'dovizKuruSecenekleri',
      label: 'Döviz Kuru',
      children: (
        <ListeYonetimi
          alan="dovizKuruSecenekleri"
          placeholder="ör: TCMB Efektif Satış"
          transformInput={(v) => formatDisplayText(v, 'text')}
        />
      ),
    },
    {
      key: 'gecerlilikSecenekleri',
      label: 'Geçerlilik',
      children: (
        <ListeYonetimi
          alan="gecerlilikSecenekleri"
          placeholder="ör: 3 Ay, 15 Gün"
          transformInput={(v) => formatDisplayText(v, 'text')}
        />
      ),
    },
    {
      key: 'urunSetleri',
      label: 'Ürün Setleri',
      children: <UrunSetleriTab />,
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Typography.Title level={4} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SettingOutlined /> Referans Veriler
      </Typography.Title>
      <Card>
        <div data-tip-target="referans-sekme-listesi">
          <Tabs defaultActiveKey="markalar" items={tabItems} />
        </div>
      </Card>
    </div>
  );
}
