import { useState, useMemo } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  App, Card, Upload, Button, Table, Alert, Typography, Input,
  Space, Divider, Tag, Statistic, Row, Col, Popconfirm,
  Modal, Form, Tabs,
  InputNumber,
} from 'antd';
import {
  UploadOutlined, TeamOutlined, AppstoreOutlined,
  DeleteOutlined, ReloadOutlined, PlusOutlined, TagsOutlined,
  EditOutlined, DownloadOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import { referansVeriService } from '../services/referansVeriService';
import type { UploadFile } from 'antd';
import {
  cariExcelOku, urunExcelOku,
  cariExcelIndir, urunExcelIndir,
  cariSablonIndir, urunSablonIndir,
} from '../services/excelImportService';
import type { CariImportSonucu, UrunImportSonucu } from '../services/excelImportService';
import { cariService } from '../services/musteriService';
import { urunService } from '../services/urunService';
import { urunSetService } from '../services/urunSetService';
import type { Cari, Urun, UrunSeti } from '../types';
import {
  normalizeProductCode, cleanTextInput, normalizeEmail,
  formatCariAdi, formatDisplayText,
} from '../utils/formatters';
import { formatPhone } from '../utils/phone';
import { useSayfaRehberi } from '../hooks/useSayfaRehberi';
import { VERI_YONETIMI_TIPLERI } from './VeriYonetimiSayfasi.tips';
import { buttonClassNames } from '../styles/buttonStyles';

const { Title, Paragraph } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// Cari Modal — Ekle / Düzenle
// ─────────────────────────────────────────────────────────────────────────────
function CariModal({
  acik,
  cari,
  onKaydet,
  onIptal,
}: {
  acik: boolean;
  cari: Cari | null;
  onKaydet: () => void;
  onIptal: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const isMobile = useIsMobile(640);
  const yeni = !cari;

  function kaydet() {
    form.validateFields().then((vals) => {
      const kayit: Cari = {
        id: cari?.id ?? cariService.cariIdUret(),
        cariKod:       normalizeProductCode(vals.cariKod ?? ''),
        firmaAdi:      formatCariAdi(cleanTextInput(vals.firmaAdi ?? '')),
        yetkiliKisi:   cleanTextInput(vals.yetkiliKisi ?? ''),
        telefon:       formatPhone(vals.telefon ?? ''),
        ePosta:        normalizeEmail(vals.ePosta ?? ''),
        adres:         cleanTextInput(vals.adres ?? ''),
        vergiDairesi:  cleanTextInput(vals.vergiDairesi ?? ''),
        vergiNo:       (vals.vergiNo ?? '').replace(/\s+/g, ''),
        lastContactName:  cari?.lastContactName,
        lastContactTitle: cari?.lastContactTitle,
      };
      cariService.cariKaydet(kayit);
      message.success(yeni ? 'Cari eklendi.' : 'Cari güncellendi.');
      form.resetFields();
      onKaydet();
    });
  }

  return (
    <Modal
      title={yeni ? 'Yeni Cari Ekle' : 'Cari Düzenle'}
      open={acik}
      onOk={kaydet}
      onCancel={() => { form.resetFields(); onIptal(); }}
      okText="Kaydet"
      cancelText="İptal"
      width={isMobile ? 'calc(100vw - 24px)' : 560}
      afterOpenChange={(open) => {
        if (open && cari) form.setFieldsValue(cari);
        if (open && !cari) form.resetFields();
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="cariKod" label="Cari Kod" rules={[{ required: true, message: 'Zorunlu' }]}>
              <Input placeholder="C-001" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="firmaAdi" label="Firma Adı" rules={[{ required: true, message: 'Zorunlu' }]} getValueFromEvent={(e) => formatDisplayText(e.target.value, 'cari_adi')}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="yetkiliKisi" label="Yetkili Kişi" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'person_name')}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="telefon" label="Telefon" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'phone')}>
              <Input placeholder="(05xx) xxx xx xx" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="ePosta" label="E-Posta" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'email')}>
          <Input placeholder="ornek@firma.com" />
        </Form.Item>
        <Form.Item name="adres" label="Adres" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'address')}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="vergiDairesi" label="Vergi Dairesi" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'text')}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="vergiNo" label="Vergi No" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'vergi_no')}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ürün Modal — Ekle / Düzenle
// ─────────────────────────────────────────────────────────────────────────────
function UrunModal({
  acik,
  urun,
  onKaydet,
  onIptal,
}: {
  acik: boolean;
  urun: Urun | null;
  onKaydet: () => void;
  onIptal: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const isMobile = useIsMobile(640);
  const yeni = !urun;

  function kaydet() {
    form.validateFields().then((vals) => {
      const kayit: Urun = {
        id: urun?.id ?? urunService.urunIdUret(),
        urunKod:          normalizeProductCode(vals.urunKod ?? ''),
        urunAdi:          '',
        aciklama:         cleanTextInput(vals.aciklama ?? ''),
        kategori:         cleanTextInput(vals.kategori ?? ''),
        birim:            cleanTextInput(vals.birim ?? '') || 'Adet',
        varsayilanFiyat:  parseFloat(String(vals.varsayilanFiyat).replace(',', '.')) || 0,
      };
      urunService.urunKaydet(kayit);
      message.success(yeni ? 'Ürün eklendi.' : 'Ürün güncellendi.');
      form.resetFields();
      onKaydet();
    });
  }

  return (
    <Modal
      title={yeni ? 'Yeni Ürün Ekle' : 'Ürün Düzenle'}
      open={acik}
      onOk={kaydet}
      onCancel={() => { form.resetFields(); onIptal(); }}
      okText="Kaydet"
      cancelText="İptal"
      width={isMobile ? 'calc(100vw - 24px)' : 560}
      afterOpenChange={(open) => {
        if (open && urun) form.setFieldsValue(urun);
        if (open && !urun) form.resetFields();
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Row gutter={12}>
          <Col span={10}>
            <Form.Item
              name="urunKod"
              label="Ürün Kodu"
              rules={[{ required: true, message: 'Zorunlu' }]}
              getValueFromEvent={(e) => formatDisplayText(e?.target?.value ?? '', 'product_code')}
            >
              <Input placeholder="CP96SDB80-200" autoCapitalize="characters" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="aciklama" label="Açıklama" rules={[{ required: true, message: 'Zorunlu' }]} getValueFromEvent={(e) => formatDisplayText(e.target.value, 'description')}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={10}>
            <Form.Item name="kategori" label="Kategori" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'category')}>
              <Input placeholder="Silindir, Valf…" />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item name="birim" label="Birim" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'unit')}>
              <Input placeholder="Adet" />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item name="varsayilanFiyat" label="Varsayılan Fiyat">
              <Input placeholder="0.00" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ürün Seti Modal — Ekle / Düzenle
// ─────────────────────────────────────────────────────────────────────────────
function UrunSetModal({
  acik,
  set,
  urunler,
  onKaydet,
  onIptal,
}: {
  acik: boolean;
  set: UrunSeti | null;
  urunler: Urun[];
  onKaydet: () => void;
  onIptal: () => void;
}) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const isMobile = useIsMobile(640);
  const yeni = !set;

  function koddanAciklamaGetir(kod: string): string {
    const urun = urunler.find((u) => u.urunKod.toLowerCase() === kod.toLowerCase());
    return urun?.aciklama ?? '';
  }

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
                  <Col span={8}>
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
                        onBlur={(e) => {
                          const kod = formatDisplayText(e.target.value ?? '', 'product_code');
                          const aciklama = koddanAciklamaGetir(kod);
                          form.setFieldValue(['kalemler', field.name, 'urunKod'], kod);
                          if (aciklama) form.setFieldValue(['kalemler', field.name, 'aciklama'], aciklama);
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item {...field} name={[field.name, 'aciklama']} label="Açıklama" style={{ marginBottom: 0 }} getValueFromEvent={(e) => formatDisplayText(e.target.value, 'description')}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Form.Item {...field} name={[field.name, 'miktar']} label="Adet" style={{ marginBottom: 0 }}>
                      <InputNumber min={0} step={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    <Form.Item {...field} name={[field.name, 'birim']} label="Birim" style={{ marginBottom: 0 }} getValueFromEvent={(e) => formatDisplayText(e.target.value, 'unit')}>
                      <Input placeholder="Adet" />
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
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ id: urunSetService.setKalemIdUret(), urunKod: '', aciklama: '', miktar: 1, birim: 'Adet' })}>
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
// Ana Sayfa
// ─────────────────────────────────────────────────────────────────────────────
export default function VeriYonetimiSayfasi() {
  useSayfaRehberi(VERI_YONETIMI_TIPLERI, { sayfaAdi: 'Veri Yönetimi' });
  const { message } = App.useApp();
  // ── Veri state ──────────────────────────────────────────────────────────────
  const [cariler, setCariler] = useState<Cari[]>(() => cariService.tumCarileriGetir());
  const [urunler, setUrunler] = useState<Urun[]>(() => urunService.tumUrunleriGetir());
  const [setler, setSetler] = useState<UrunSeti[]>(() => urunSetService.tumSetleriGetir());

  // Tablo görünümleri için alfabetik sıralı türev — tr-locale aware.
  const carilerSirali = useMemo(
    () => [...cariler].sort((a, b) => (a.firmaAdi || '').localeCompare(b.firmaAdi || '', 'tr')),
    [cariler],
  );
  const urunlerSirali = useMemo(
    () => [...urunler].sort((a, b) => (a.urunKod || '').localeCompare(b.urunKod || '', 'tr')),
    [urunler],
  );

  function cariListesiYenile() { setCariler(cariService.tumCarileriGetir()); }
  function urunListesiYenile() { setUrunler(urunService.tumUrunleriGetir()); }
  function setListesiYenile() { setSetler(urunSetService.tumSetleriGetir()); }

  // ── Referans veri state — üçü de aynı yapı (localStorage + useState) ──────
  const [markalar, setMarkalar]                   = useState(() => referansVeriService.markalar.tumunuGetir());
  const [birimler, setBirimler]                   = useState(() => referansVeriService.birimler.tumunuGetir());
  const [teslimSecenekleri, setTeslimSecenekleri] = useState(() => referansVeriService.teslimSecenekleri.tumunuGetir());

  // ── Import state ────────────────────────────────────────────────────────────
  const [cariYukleniyor, setCariYukleniyor]   = useState(false);
  const [urunYukleniyor, setUrunYukleniyor]   = useState(false);
  const [cariSonuc, setCariSonuc]             = useState<CariImportSonucu | null>(null);
  const [urunSonuclar, setUrunSonuclar]       = useState<UrunImportSonucu[]>([]);
  const [cariHata, setCariHata]               = useState<string | null>(null);
  const [urunHata, setUrunHata]               = useState<string | null>(null);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [cariModalAcik, setCariModalAcik]     = useState(false);
  const [seciliCari, setSeciliCari]           = useState<Cari | null>(null);
  const [urunModalAcik, setUrunModalAcik]     = useState(false);
  const [seciliUrun, setSeciliUrun]           = useState<Urun | null>(null);
  const [setModalAcik, setSetModalAcik]       = useState(false);
  const [seciliSet, setSeciliSet]             = useState<UrunSeti | null>(null);

  // ── Cari işlemleri ──────────────────────────────────────────────────────────
  async function cariDosyaOku(file: File) {
    let basarili = false;
    setCariYukleniyor(true); setCariHata(null); setCariSonuc(null);
    try {
      const sonuc = await cariExcelOku(file);
      setCariSonuc(sonuc);
      cariListesiYenile();
      message.success(`${sonuc.eklenen} cari eklendi, ${sonuc.guncellenen} güncellendi.`);
      basarili = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setCariHata(msg);
      message.error('Cari dosyası okunamadı.');
    } finally { setCariYukleniyor(false); }
    return basarili;
  }

  function cariSil(id: string) {
    cariService.cariSil(id);
    cariListesiYenile();
    message.success('Cari kaydı başarıyla silindi.');
  }

  function cariDuzenle(cari: Cari) { setSeciliCari(cari); setCariModalAcik(true); }
  function cariEkleAc()             { setSeciliCari(null);  setCariModalAcik(true); }

  // ── Ürün işlemleri ──────────────────────────────────────────────────────────
  async function urunDosyaOku(file: File) {
    let basarili = false;
    setUrunYukleniyor(true); setUrunHata(null);
    try {
      const sonuc = await urunExcelOku(file);
      setUrunSonuclar((p) => [sonuc, ...p]);
      urunListesiYenile();
      message.success(`${sonuc.eklenen} ürün eklendi, ${sonuc.guncellenen} güncellendi — ${sonuc.kategori}`);
      basarili = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setUrunHata(msg);
      message.error('Ürün dosyası okunamadı. Lütfen dosya formatını kontrol ediniz.');
    } finally { setUrunYukleniyor(false); }
    return basarili;
  }

  function urunSil(id: string) {
    urunService.urunSil(id);
    urunListesiYenile();
    message.success('Ürün kaydı başarıyla silindi.');
  }

  function urunDuzenle(urun: Urun) { setSeciliUrun(urun); setUrunModalAcik(true); }
  function urunEkleAc()             { setSeciliUrun(null);  setUrunModalAcik(true); }

  function setSil(id: string) {
    urunSetService.setSil(id);
    setListesiYenile();
    message.success('Ürün seti başarıyla silindi.');
  }

  function setDuzenle(set: UrunSeti) { setSeciliSet(set); setSetModalAcik(true); }
  function setEkleAc()               { setSeciliSet(null); setSetModalAcik(true); }

  function urunleriSifirla() {
    urunService.urunleriSifirla();
    urunListesiYenile();
    setUrunSonuclar([]);
    message.info('Ürün listesi varsayılan MEBA ürünlerine sıfırlandı.');
  }

  // ── Kolon tanımları ─────────────────────────────────────────────────────────
  const cariKolonlar = [
    { title: 'Kod',      dataIndex: 'cariKod',    key: 'cariKod',    width: 90,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{v}</span> },
    { title: 'Firma Adı',  dataIndex: 'firmaAdi',   key: 'firmaAdi', ellipsis: true, render: (v: string) => formatCariAdi(v) },
    { title: 'Yetkili',    dataIndex: 'yetkiliKisi', key: 'yetkiliKisi', width: 130, ellipsis: true },
    { title: 'Telefon',    dataIndex: 'telefon',     key: 'telefon',   width: 140 },
    { title: 'E-Posta',    dataIndex: 'ePosta',      key: 'ePosta',    ellipsis: true },
    { title: 'VKN',        dataIndex: 'vergiNo',     key: 'vergiNo',   width: 110 },
    {
      title: '', key: 'islem', width: 80, fixed: 'right' as const,
      render: (_: unknown, rec: Cari) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => cariDuzenle(rec)} className={buttonClassNames.smallAction} />
          <Popconfirm
            title="Cari silinecek"
            description="Bu işlem geri alınamaz."
            onConfirm={() => cariSil(rec.id)}
            okText="Sil" cancelText="İptal" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} className={buttonClassNames.smallActionDanger} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const urunKolonlar = [
    { title: 'Ürün Kodu', dataIndex: 'urunKod',  key: 'urunKod',  width: 150,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{v}</span> },
    { title: 'Açıklama',   dataIndex: 'aciklama', key: 'aciklama', ellipsis: true,
      render: (v: string) => v || '—' },
    { title: 'Kategori',   dataIndex: 'kategori', key: 'kategori', width: 110,
      render: (v: string) => v ? <Tag style={{ fontSize: 11 }}>{v}</Tag> : null },
    { title: 'Birim',      dataIndex: 'birim',    key: 'birim',    width: 65 },
    { title: 'Fiyat',      dataIndex: 'varsayilanFiyat', key: 'fiyat', width: 90, align: 'right' as const,
      render: (v: number) => v > 0 ? v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '—' },
    {
      title: '', key: 'islem', width: 80, fixed: 'right' as const,
      render: (_: unknown, rec: Urun) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => urunDuzenle(rec)} className={buttonClassNames.smallAction} />
          <Popconfirm
            title="Ürün silinecek"
            description="Bu işlem geri alınamaz."
            onConfirm={() => urunSil(rec.id)}
            okText="Sil" cancelText="İptal" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} className={buttonClassNames.smallActionDanger} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const setKolonlar = [
    {
      title: 'Set Kodu', dataIndex: 'setKod', key: 'setKod', width: 140,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{v}</span>,
    },
    { title: 'Açıklama', dataIndex: 'aciklama', key: 'aciklama', ellipsis: true },
    {
      title: 'Alt Kalem', key: 'kalem', width: 100,
      render: (_: unknown, rec: UrunSeti) => <Tag color="purple">{rec.kalemler.length}</Tag>,
    },
    {
      title: '', key: 'islem', width: 80, fixed: 'right' as const,
      render: (_: unknown, rec: UrunSeti) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => setDuzenle(rec)} className={buttonClassNames.smallAction} />
          <Popconfirm
            title="Set silinecek"
            description="Bu işlem geri alınamaz."
            onConfirm={() => setSil(rec.id)}
            okText="Sil" cancelText="İptal" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} className={buttonClassNames.smallActionDanger} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Sekme içerikleri ────────────────────────────────────────────────────────
  const tabCariler = (
    <div>
      {/* Araç çubuğu */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }} data-tip-target="veri-cari-toolbar">
        <Button type="primary" icon={<PlusOutlined />} onClick={cariEkleAc} className={buttonClassNames.primary} data-tip-target="veri-yeni-cari">
          Yeni Cari
        </Button>
        <Upload
          accept=".xlsx,.xls"
          showUploadList={false}
          beforeUpload={(f: UploadFile) => {
            void cariDosyaOku(f as unknown as File);
            return Upload.LIST_IGNORE;
          }}
        >
          <Button icon={<UploadOutlined />} loading={cariYukleniyor} className={buttonClassNames.secondary} data-tip-target="veri-excel-aktar">Excel'den Aktar</Button>
        </Upload>
        <Button icon={<FileExcelOutlined />} onClick={cariSablonIndir} className={buttonClassNames.secondary}>
          Boş Şablon İndir
        </Button>
        <Button icon={<DownloadOutlined />} onClick={() => cariExcelIndir(cariler)} className={buttonClassNames.secondary}
          disabled={cariler.length === 0}>
          Mevcut Listeyi İndir
        </Button>
      </div>

      {cariHata && (
        <Alert type="error" message="Okuma Hatası"
          description={<pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>{cariHata}</pre>}
          style={{ marginBottom: 12 }} showIcon />
      )}

      {cariSonuc && (
        <div style={{ marginBottom: 12 }}>
          <Space>
            <Tag color="green">+{cariSonuc.eklenen} eklendi</Tag>
            <Tag color="blue">{cariSonuc.guncellenen} güncellendi</Tag>
            {cariSonuc.hatali > 0 && <Tag color="red">{cariSonuc.hatali} hatalı satır atlandı</Tag>}
          </Space>
        </div>
      )}

      <Table
        dataSource={carilerSirali}
        columns={cariKolonlar}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `${t} cari` }}
        locale={{ emptyText: 'Henüz cari yok.' }}
        scroll={{ x: 860 }}
      />
    </div>
  );

  const tabUrunler = (
    <div>
      {/* Araç çubuğu */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={urunEkleAc} className={buttonClassNames.primary}>
          Yeni Ürün
        </Button>
        <Upload
          accept=".xlsx,.xls"
          multiple
          showUploadList={false}
          beforeUpload={(f: UploadFile) => {
            void urunDosyaOku(f as unknown as File);
            return Upload.LIST_IGNORE;
          }}
        >
          <Button icon={<UploadOutlined />} loading={urunYukleniyor} className={buttonClassNames.secondary}>Excel'den Aktar</Button>
        </Upload>
        <Button icon={<FileExcelOutlined />} onClick={urunSablonIndir} className={buttonClassNames.secondary}>
          Boş Şablon İndir
        </Button>
        <Button icon={<DownloadOutlined />} onClick={() => urunExcelIndir(urunler)} className={buttonClassNames.secondary}
          disabled={urunler.length === 0}>
          Mevcut Listeyi İndir
        </Button>
        <Divider type="vertical" style={{ margin: '4px 0' }} />
        <Popconfirm
          title="Varsayılan listeye dön"
          description="Tüm içe aktarılan ürünler silinir. Devam edilsin mi?"
          onConfirm={urunleriSifirla}
          okText="Evet, sıfırla" cancelText="İptal" okButtonProps={{ danger: true }}
        >
          <Button
            icon={<ReloadOutlined />}
            danger
            disabled={urunler.length === 0}
            className={buttonClassNames.danger}
          >
            Varsayılana Sıfırla
          </Button>
        </Popconfirm>
      </div>

      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 10 }}>
        Excel aktarımında dosya adı kategori olarak kullanılır — örn: <em>SAYIM Silindir.xlsx</em> → Kategori: Silindir
      </Paragraph>

      {urunHata && (
        <Alert type="error" message="Okuma Hatası"
          description={<pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>{urunHata}</pre>}
          style={{ marginBottom: 12 }} showIcon />
      )}

      {urunSonuclar.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {urunSonuclar.map((s, i) => (
            <Space key={i} style={{ marginRight: 16 }}>
              <Tag color="purple">{s.kategori}</Tag>
              <Tag color="green">+{s.eklenen}</Tag>
              <Tag color="blue">{s.guncellenen} güncellendi</Tag>
            </Space>
          ))}
        </div>
      )}

      <Table
        dataSource={urunlerSirali}
        columns={urunKolonlar}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `${t} ürün` }}
        locale={{ emptyText: 'Henüz ürün yok.' }}
        scroll={{ x: 960 }}
      />
    </div>
  );

  const tabReferans = (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <ReferansListeKarti
          baslik="Markalar"
          liste={markalar}
          onEkle={(v) => { referansVeriService.markalar.ekle(v); setMarkalar(referansVeriService.markalar.tumunuGetir()); }}
          onSil={(v)  => { referansVeriService.markalar.sil(v);  setMarkalar(referansVeriService.markalar.tumunuGetir()); }}
        />
      </Col>
      <Col xs={24} md={8}>
        <ReferansListeKarti
          baslik="Birimler"
          liste={birimler}
          onEkle={(v) => { referansVeriService.birimler.ekle(v); setBirimler(referansVeriService.birimler.tumunuGetir()); }}
          onSil={(v)  => { referansVeriService.birimler.sil(v);  setBirimler(referansVeriService.birimler.tumunuGetir()); }}
        />
      </Col>
      <Col xs={24} md={8}>
        <ReferansListeKarti
          baslik="Teslim Seçenekleri"
          liste={teslimSecenekleri}
          onEkle={(v) => { referansVeriService.teslimSecenekleri.ekle(v); setTeslimSecenekleri(referansVeriService.teslimSecenekleri.tumunuGetir()); }}
          onSil={(v)  => { referansVeriService.teslimSecenekleri.sil(v);  setTeslimSecenekleri(referansVeriService.teslimSecenekleri.tumunuGetir()); }}
        />
      </Col>
    </Row>
  );

  const tabSetler = (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={setEkleAc} className={buttonClassNames.primary}>
          Yeni Set
        </Button>
      </div>

      <Table
        dataSource={setler}
        columns={setKolonlar}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 12, showSizeChanger: false, showTotal: (t) => `${t} set` }}
        locale={{ emptyText: 'Henüz set tanımı yok.' }}
        scroll={{ x: 620 }}
        expandable={{
          expandedRowRender: (rec: UrunSeti) => (
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={rec.kalemler}
              columns={[
                { title: 'Ürün Kodu', dataIndex: 'urunKod', key: 'urunKod', width: 160 },
                { title: 'Açıklama', dataIndex: 'aciklama', key: 'aciklama' },
                { title: 'Adet', dataIndex: 'miktar', key: 'miktar', width: 90, align: 'right' as const },
                { title: 'Birim', dataIndex: 'birim', key: 'birim', width: 100 },
              ]}
            />
          ),
        }}
      />
    </div>
  );

  const isMobile = useIsMobile(768);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? '10px 12px' : '14px 24px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 4 }}>Veri Yönetimi</Title>
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Cari ve ürün verilerini yönetin. Veriler tarayıcıda kalıcı olarak saklanır.
        Excel ile yedekleme ve aktarım yapabilirsiniz.
      </Paragraph>

      {/* Özet istatistikler */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={5}>
          <Card size="small">
            <Statistic title="Kayıtlı Cari" value={cariler.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={5}>
          <Card size="small">
            <Statistic title="Kayıtlı Ürün" value={urunler.length} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={5}>
          <Card size="small">
            <Statistic title="Ürün Seti" value={setler.length} prefix={<TagsOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { paddingTop: 0 } }}>
        <Tabs
          defaultActiveKey="cariler"
          items={[
            {
              key: 'cariler',
              label: <><TeamOutlined /> Cariler <Tag style={{ marginLeft: 4 }}>{cariler.length}</Tag></>,
              children: tabCariler,
            },
            {
              key: 'urunler',
              label: <><AppstoreOutlined /> Ürünler <Tag style={{ marginLeft: 4 }}>{urunler.length}</Tag></>,
              children: tabUrunler,
            },
            {
              key: 'referans',
              label: <><TagsOutlined /> Referans Veriler</>,
              children: tabReferans,
            },
            {
              key: 'setler',
              label: <><TagsOutlined /> Set Listeleri <Tag style={{ marginLeft: 4 }}>{setler.length}</Tag></>,
              children: tabSetler,
            },
          ]}
        />
      </Card>

      {/* Cari Modal */}
      <CariModal
        acik={cariModalAcik}
        cari={seciliCari}
        onKaydet={() => { setCariModalAcik(false); cariListesiYenile(); }}
        onIptal={() => setCariModalAcik(false)}
      />

      {/* Ürün Modal */}
      <UrunModal
        acik={urunModalAcik}
        urun={seciliUrun}
        onKaydet={() => { setUrunModalAcik(false); urunListesiYenile(); }}
        onIptal={() => setUrunModalAcik(false)}
      />

      <UrunSetModal
        acik={setModalAcik}
        set={seciliSet}
        urunler={urunler}
        onKaydet={() => { setSetModalAcik(false); setListesiYenile(); }}
        onIptal={() => setSetModalAcik(false)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Referans liste bileşeni — Markalar, Birimler, Teslim Seçenekleri üçü de kullanır
// ─────────────────────────────────────────────────────────────────────────────
function ReferansListeKarti({
  baslik, liste, onEkle, onSil,
}: { baslik: string; liste: string[]; onEkle: (v: string) => void; onSil: (v: string) => void }) {
  const [yeni, setYeni] = useState('');

  function ekle() {
    const v = yeni.trim();
    if (!v) return;
    onEkle(v);
    setYeni('');
  }

  return (
    <Card size="small" title={<><TagsOutlined style={{ marginRight: 6 }} />{baslik}</>} style={{ marginBottom: 16 }}>
      <Space.Compact style={{ width: '100%', marginBottom: 10 }}>
        <Input
          placeholder={`Yeni ekle…`}
          value={yeni}
          onChange={(e) => setYeni(e.target.value)}
          onPressEnter={ekle}
          maxLength={60}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={ekle} className={buttonClassNames.iconPrimary} />
      </Space.Compact>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {liste.length === 0 && <span style={{ color: '#9ca3af', fontSize: 12 }}>Henüz kayıt yok.</span>}
        {liste.map((item) => (
          <Tag key={item} closable onClose={() => onSil(item)} style={{ fontSize: 12, padding: '2px 8px' }}>
            {item}
          </Tag>
        ))}
      </div>
    </Card>
  );
}
