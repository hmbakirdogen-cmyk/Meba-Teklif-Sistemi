import { useEffect, useState } from 'react';
import { Modal, Form, Input, message, Divider, Button, Alert, Space, Tag, Tooltip } from 'antd';
import { LockOutlined, FolderOpenOutlined, FolderOutlined, SwapOutlined, DisconnectOutlined } from '@ant-design/icons';
import { api } from '../services/apiClient';
import { useKullanici } from '../context/useKullanici';
import { usePDFKayit } from '../hooks/usePDFKayit';
import { formatAdSoyad, formatUnvan } from '../utils/formatters';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  adSoyad: string;
  unvan: string;
  telefon: string;
  dahili: string;
}

interface SifreFormValues {
  mevcutSifre: string;
  yeniSifre: string;
  yeniSifreTekrar: string;
}

/**
 * Profilim modal'i — her kullanici (rol farketmez) ad-soyad, unvan, telefon
 * ve dahili bilgilerini kendi guncelleyebilir + kendi sifresini degistirebilir.
 * Profil fotosu icin ayri ProfilFotoModal var. Header'daki "Profilim"
 * butonu bu modal'i acar.
 */
export default function ProfilDuzenleModal({ open, onClose }: Props) {
  const { aktifKullanici, refreshKullanici, sifreDegistir } = useKullanici();
  const pdfKayit = usePDFKayit();
  const [form] = Form.useForm<FormValues>();
  const [sifreForm] = Form.useForm<SifreFormValues>();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sifreYukleniyor, setSifreYukleniyor] = useState(false);
  const [klasorYukleniyor, setKlasorYukleniyor] = useState(false);

  const sifreUyari = Boolean(aktifKullanici?.mustChangePassword);

  async function klasorSec() {
    setKlasorYukleniyor(true);
    try {
      const r = await pdfKayit.klasorSec();
      if (r.ok) {
        message.success(`PDF kayıt konumu seçildi: ${r.path}`);
      } else if (r.iptal) {
        message.info('Klasör seçimi iptal edildi.');
      } else if (r.desteklenmiyor) {
        message.warning(r.error || 'Bu özellik Chrome veya Edge tarayıcıda çalışır. Şimdilik PDF normal indirme klasörüne kaydedilecek.');
      } else if (r.error) {
        message.warning(`Klasör seçilemedi: ${r.error}`);
      }
    } catch (e) {
      // Hook artık tüm hataları yakalıyor; yine de son güvenlik ağı.
      console.error('[ProfilDuzenleModal] klasorSec exception:', e);
      message.warning('Klasör seçimi şu an yapılamıyor. PDF\'ler İndirilenler klasörüne kaydedilmeye devam edecek.');
    } finally {
      setKlasorYukleniyor(false);
    }
  }

  async function klasoruUnut() {
    await pdfKayit.klasoruUnut();
    message.info('PDF kayıt konumu kaldırıldı. Bundan sonra PDF\'ler İndirilenler klasörüne kaydedilecek.');
  }

  useEffect(() => {
    if (!open || !aktifKullanici) return;
    form.setFieldsValue({
      adSoyad: aktifKullanici.adSoyad || '',
      unvan: aktifKullanici.unvan || '',
      telefon: aktifKullanici.telefon || '',
      dahili: aktifKullanici.dahili || '',
    });
    sifreForm.resetFields();
  }, [open, aktifKullanici, form, sifreForm]);

  async function kaydet(values: FormValues) {
    if (!aktifKullanici) return;
    setYukleniyor(true);
    try {
      await api.kullanicilar.update(aktifKullanici.id, {
        adSoyad: formatAdSoyad(values.adSoyad ?? '', false),
        unvan: formatUnvan(values.unvan ?? '', false),
        telefon: (values.telefon ?? '').trim(),
        dahili: (values.dahili ?? '').trim(),
      });
      await refreshKullanici();
      message.success('Profil güncellendi');
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Profil güncellenemedi');
    } finally {
      setYukleniyor(false);
    }
  }

  async function sifreKaydet(values: SifreFormValues) {
    setSifreYukleniyor(true);
    try {
      const r = await sifreDegistir(values.mevcutSifre, values.yeniSifre);
      if (r.ok) {
        message.success('Şifreniz başarıyla değiştirildi');
        sifreForm.resetFields();
        await refreshKullanici();
      } else {
        message.error(r.error || 'Şifre değiştirilemedi');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Şifre değiştirilemedi');
    } finally {
      setSifreYukleniyor(false);
    }
  }

  return (
    <Modal
      title="Profilim"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Kaydet"
      cancelText="Vazgeç"
      okButtonProps={{ loading: yukleniyor }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={kaydet}>
        <Form.Item
          name="adSoyad"
          label="Ad Soyad"
          rules={[{ required: true, message: 'Zorunlu' }]}
          normalize={(val: string) => formatAdSoyad(val ?? '', true)}
        >
          <Input placeholder="örn. Ahmet YILMAZ" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="unvan"
          label="Ünvan"
          normalize={(val: string) => formatUnvan(val ?? '', true)}
        >
          <Input placeholder="Ünvan" autoComplete="off" />
        </Form.Item>
        <Form.Item name="telefon" label="Telefon">
          <Input placeholder="0XXX XXX XX XX" autoComplete="off" />
        </Form.Item>
        <Form.Item name="dahili" label="Dahili">
          <Input placeholder="Dahili numara" autoComplete="off" />
        </Form.Item>
      </Form>

      <Divider style={{ margin: '8px 0 16px' }}>PDF Kayıt Konumu</Divider>

      <div style={{ marginBottom: 16 }}>
        {!pdfKayit.supported ? (
          <Alert
            type="info"
            showIcon
            message="Bu özellik Chrome veya Edge tarayıcıda çalışır"
            description="Tarayıcınız desteklemiyor; PDF'ler şimdilik tarayıcınızın İndirilenler klasörüne kaydedilecek."
          />
        ) : !pdfKayit.secureContext ? (
          <Alert
            type="info"
            showIcon
            message="Güvenli bağlantı gerekiyor"
            description="PDF kayıt konumu özelliği yalnızca HTTPS veya localhost üzerinde çalışır. Bu sayfaya HTTP ile bağlandığınız için klasör seçimi şu an kullanılamıyor; PDF'ler İndirilenler klasörüne kaydedilecek."
          />
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#fafafa',
                marginBottom: 8,
              }}
            >
              <Space size={8} style={{ minWidth: 0 }}>
                <FolderOutlined style={{ color: pdfKayit.hasKlasor ? '#1E3A5F' : '#9ca3af', fontSize: 16 }} />
                <span style={{ fontSize: 13, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pdfKayit.hasKlasor
                    ? <><span style={{ color: '#6b7280' }}>Seçili klasör: </span><strong>{pdfKayit.klasorAdi}</strong></>
                    : <span style={{ color: '#6b7280' }}>Henüz PDF kayıt konumu seçilmedi</span>}
                </span>
              </Space>
              {pdfKayit.hasKlasor && (
                <Tag color="success" style={{ marginRight: 0 }}>Aktif</Tag>
              )}
            </div>
            <Space wrap>
              {pdfKayit.hasKlasor ? (
                <>
                  <Tooltip title="Mevcut klasörü değiştir">
                    <Button icon={<SwapOutlined />} loading={klasorYukleniyor} onClick={klasorSec}>
                      Değiştir
                    </Button>
                  </Tooltip>
                  <Tooltip title="Tarayıcı klasörü doğrudan açamaz; aynı klasörü onaylayarak görüntüleyebilirsiniz.">
                    <Button icon={<FolderOpenOutlined />} loading={klasorYukleniyor} onClick={klasorSec}>
                      Klasörü Aç
                    </Button>
                  </Tooltip>
                  <Button danger icon={<DisconnectOutlined />} onClick={klasoruUnut}>
                    Bağlantıyı Kaldır
                  </Button>
                </>
              ) : (
                <Button type="primary" icon={<FolderOpenOutlined />} loading={klasorYukleniyor} onClick={klasorSec}>
                  Klasör Seç
                </Button>
              )}
            </Space>
            <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', lineHeight: 1.55 }}>
              Seçtiğiniz klasör yalnızca bu tarayıcıda ve hesabınızda saklanır; sunucuya iletilmez.
              Klasör seçildikten sonra PDF ve e-posta için oluşturulan teklif PDF'leri otomatik olarak buraya kaydedilir.
            </div>
          </>
        )}
      </div>

      <Divider style={{ margin: '8px 0 16px' }}>Şifre Değiştir</Divider>

      {sifreUyari && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Lütfen şifrenizi değiştirin"
          description="Hesabınız varsayılan şifre (0000 / 1234) ile çalışıyor. Güvenliğiniz için yeni bir şifre belirleyin."
        />
      )}

      <Form form={sifreForm} layout="vertical" onFinish={sifreKaydet} autoComplete="off">
        <Form.Item
          name="mevcutSifre"
          label="Mevcut şifre"
          rules={[{ required: true, message: 'Mevcut şifrenizi girin' }]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="yeniSifre"
          label="Yeni şifre"
          rules={[
            { required: true, message: 'Yeni şifre girin' },
            { min: 4, message: 'En az 4 karakter olmalı' },
            {
              validator: (_r, val: string) =>
                val === '0000' || val === '1234'
                  ? Promise.reject(new Error('Yeni şifre varsayılan şifre (0000 / 1234) olamaz'))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="yeniSifreTekrar"
          label="Yeni şifre (tekrar)"
          dependencies={['yeniSifre']}
          rules={[
            { required: true, message: 'Yeni şifreyi tekrar girin' },
            ({ getFieldValue }) => ({
              validator: (_r, val: string) =>
                !val || getFieldValue('yeniSifre') === val
                  ? Promise.resolve()
                  : Promise.reject(new Error('Şifreler eşleşmiyor')),
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={sifreYukleniyor} block>
            Şifreyi Güncelle
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
