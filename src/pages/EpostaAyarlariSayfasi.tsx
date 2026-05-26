import { useEffect, useState, useMemo, useCallback } from 'react';
import { App as AntdApp, Card, Form, Input, InputNumber, Select, Switch, Button, Space, Tag, Divider, Alert } from 'antd';
import { MailOutlined, SendOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { api } from '../services/apiClient';
import { useColors } from '../hooks/useColors';
import { useKullanici } from '../context/useKullanici';
import { buttonClassNames } from '../styles/buttonStyles';
import { useSayfaRehberi } from '../hooks/useSayfaRehberi';
import { EPOSTA_AYARLARI_TIPLERI } from './EpostaAyarlariSayfasi.tips';

interface SMTPFormValues {
  preset: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName: string;
  smtpFromAddress: string;
}

const FORM_DEFAULTS: SMTPFormValues = {
  preset: 'custom',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  smtpFromName: '',
  smtpFromAddress: '',
};

export default function EpostaAyarlariSayfasi() {
  useSayfaRehberi(EPOSTA_AYARLARI_TIPLERI, { sayfaAdi: 'E-posta Ayarları' });
  const C = useColors();
  const { aktifKullanici } = useKullanici();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<SMTPFormValues>();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [presets, setPresets] = useState<Record<string, { host: string; port: number; secure: boolean; label: string }>>({});
  const [hasPassword, setHasPassword] = useState(false);
  const [testEdiliyor, setTestEdiliyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mailGonderiliyor, setMailGonderiliyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      setYukleniyor(true);
      const data = await api.auth.smtpAyarlar();
      setPresets(data.presets || {});
      setHasPassword(data.hasPassword);
      form.setFieldsValue({
        preset: 'custom',
        smtpHost: data.smtpHost ?? '',
        smtpPort: data.smtpPort ?? 587,
        smtpSecure: data.smtpSecure ?? false,
        smtpUser: data.smtpUser ?? '',
        smtpPassword: '',
        smtpFromName: data.smtpFromName ?? aktifKullanici?.adSoyad ?? '',
        smtpFromAddress: data.smtpFromAddress ?? '',
      });
    } catch (err) {
      message.error('SMTP ayarları yüklenemedi: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setYukleniyor(false);
    }
  }, [form, aktifKullanici?.adSoyad, message]);

  useEffect(() => { void yukle(); }, [yukle]);

  const onPresetChange = useCallback((value: string) => {
    const preset = presets[value];
    if (preset && value !== 'custom') {
      form.setFieldsValue({ smtpHost: preset.host, smtpPort: preset.port, smtpSecure: preset.secure });
    }
  }, [presets, form]);

  const onTestConnection = useCallback(async () => {
    try {
      setTestEdiliyor(true);
      const v = await form.validateFields(['smtpHost', 'smtpPort', 'smtpSecure', 'smtpUser', 'smtpPassword']);
      if (!v.smtpPassword) {
        message.warning('Test için şifre alanını doldurun. (Kaydedilmiş şifre test edilemez — direkt mail gönderim testi kullanın.)');
        return;
      }
      const result = await api.auth.smtpTest({
        smtpHost: v.smtpHost, smtpPort: v.smtpPort, smtpSecure: v.smtpSecure,
        smtpUser: v.smtpUser, smtpPassword: v.smtpPassword,
      });
      if (result.ok) message.success('SMTP bağlantı testi başarılı.');
      else message.error('SMTP testi başarısız: ' + ('error' in result ? result.error : 'Bilinmeyen hata'));
    } catch {
      // validation error
    } finally {
      setTestEdiliyor(false);
    }
  }, [form, message]);

  const onKaydet = useCallback(async () => {
    try {
      setKaydediliyor(true);
      const v = await form.validateFields();
      const payload: Parameters<typeof api.auth.smtpAyarlariGuncelle>[0] = {
        smtpHost: v.smtpHost.trim(),
        smtpPort: v.smtpPort,
        smtpSecure: v.smtpSecure,
        smtpUser: v.smtpUser.trim(),
        smtpFromName: v.smtpFromName.trim(),
        smtpFromAddress: v.smtpFromAddress.trim() || v.smtpUser.trim(),
      };
      if (v.smtpPassword) {
        payload.smtpPassword = v.smtpPassword;
      }
      const result = await api.auth.smtpAyarlariGuncelle(payload);
      setHasPassword(result.hasPassword);
      form.setFieldsValue({ smtpPassword: '' });
      message.success('SMTP ayarları kaydedildi.');
    } catch (err) {
      if (err instanceof Error) message.error('Kaydetme hatası: ' + err.message);
    } finally {
      setKaydediliyor(false);
    }
  }, [form, message]);

  const onTestMail = useCallback(async () => {
    try {
      setMailGonderiliyor(true);
      const result = await api.auth.smtpTestMail();
      if (result.ok) message.success(`Test maili ${result.to} adresine gönderildi.`);
      else message.error('Test maili gönderilemedi: ' + (result.error || 'Bilinmeyen hata'));
    } catch (err) {
      message.error('Test maili gönderilemedi: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setMailGonderiliyor(false);
    }
  }, [message]);

  const onSifreSil = useCallback(async () => {
    try {
      await api.auth.smtpAyarlariGuncelle({ clearPassword: true });
      setHasPassword(false);
      message.success('Kayıtlı SMTP şifresi silindi.');
    } catch (err) {
      message.error('Silinemedi: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    }
  }, [message]);

  const presetOptions = useMemo(
    () => Object.entries(presets).map(([k, v]) => ({ value: k, label: v.label })),
    [presets],
  );

  return (
    <div style={{ maxWidth: 720, margin: '32px auto', padding: '0 24px' }}>
      <Card
        title={<><MailOutlined /> &nbsp; E-posta Gönderim Ayarları</>}
        loading={yukleniyor}
        styles={{ header: { background: C.bgElevated, color: C.textPrimary } }}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Kendi e-posta hesabınızdan teklif gönderin"
          description={
            <div>
              Teklifleriniz kendi e-posta adresinizden müşterilere gönderilir.
              Alıcı, gerçek gönderici adresinizi görür ve yanıtları doğrudan size ulaşır.
              Gönderilen e-postalar kendi <b>Gönderilenler</b> klasörünüzde görünmez (SMTP üzerinden gönderilir; ayrıca kendinize BCC eklemek isterseniz formdan ayarlayın).
              <br /><br />
              <b>Gmail/Outlook için:</b> 2FA aktif hesapta normal şifre yerine <b>App Password</b> (Uygulama Şifresi) oluşturmanız gerekir.
              {' '}
              <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer">Gmail kılavuzu</a> ·
              {' '}
              <a href="https://support.microsoft.com/en-us/account-billing/manage-app-passwords-for-two-step-verification-d6dc8c6d-4bf7-4851-ad95-6d07799387e9" target="_blank" rel="noopener noreferrer">Microsoft kılavuzu</a>
            </div>
          }
        />

        <Form form={form} layout="vertical" initialValues={FORM_DEFAULTS}>
          <Form.Item label="Sağlayıcı" name="preset">
            <Select options={presetOptions} onChange={onPresetChange} placeholder="Sağlayıcı seçin (host/port otomatik)" />
          </Form.Item>

          <Space.Compact block>
            <Form.Item label="SMTP Sunucu" name="smtpHost" rules={[{ required: true, message: 'Host zorunlu' }]} style={{ flex: 1 }}>
              <Input placeholder="smtp.gmail.com" />
            </Form.Item>
            <Form.Item label="Port" name="smtpPort" rules={[{ required: true, message: 'Port zorunlu' }]} style={{ width: 120 }}>
              <InputNumber style={{ width: '100%' }} min={1} max={65535} />
            </Form.Item>
          </Space.Compact>

          <Form.Item label="SSL (port 465 için açık, 587 için kapalı)" name="smtpSecure" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="E-posta Adresi (SMTP kullanıcı adı)" name="smtpUser" rules={[{ required: true, type: 'email', message: 'Geçerli e-posta gerekli' }]}>
            <Input placeholder="ornek@firma.com" autoComplete="username" />
          </Form.Item>

          <Form.Item
            label={
              <span>
                Şifre veya App Password
                {hasPassword && <Tag color="green" style={{ marginLeft: 8 }}>Kayıtlı şifre mevcut</Tag>}
              </span>
            }
            name="smtpPassword"
            extra={hasPassword ? 'Boş bırakırsan kayıtlı şifre korunur. Yeni şifre yazarsan üzerine yazılır.' : 'Hesabınızın App Password değeri.'}
          >
            <Input.Password placeholder={hasPassword ? '••••• (kayıtlı)' : 'Şifre veya app password'} autoComplete="new-password" />
          </Form.Item>

          <Divider plain>Gönderici Bilgileri</Divider>

          <Form.Item label="Gönderen Adı (alıcının göreceği)" name="smtpFromName">
            <Input placeholder={aktifKullanici?.adSoyad ?? 'Mehmet Bakırdöğen'} />
          </Form.Item>

          <Form.Item
            label="Gönderen E-posta (genelde SMTP kullanıcı adı ile aynı)"
            name="smtpFromAddress"
            extra="Boş bırakırsan SMTP kullanıcı adresi kullanılır."
          >
            <Input placeholder="ornek@firma.com" />
          </Form.Item>
        </Form>

        <Divider />

        <Space wrap>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={kaydediliyor}
            onClick={onKaydet}
            className={buttonClassNames.primary}
          >
            Kaydet
          </Button>
          <Button
            icon={<ExclamationCircleOutlined />}
            loading={testEdiliyor}
            onClick={onTestConnection}
            className={buttonClassNames.secondary}
          >
            Bağlantı Testi (yeni şifre gerektirir)
          </Button>
          <Button
            icon={<SendOutlined />}
            loading={mailGonderiliyor}
            onClick={onTestMail}
            className={buttonClassNames.secondary}
            disabled={!hasPassword}
          >
            Kendime Test Maili
          </Button>
          {hasPassword && (
            <Button danger size="small" onClick={onSifreSil}>
              Kayıtlı Şifreyi Sil
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
}
