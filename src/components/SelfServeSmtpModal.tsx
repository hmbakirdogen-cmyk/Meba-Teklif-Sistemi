/**
 * SelfServeSmtpModal — kullanıcının kendi SMTP'sini sıfırdan kurması için
 * rehberli, "teknik bilmeyen" yardımcı.
 *
 * Akış (3 adım):
 *   1. Kullanıcının mail adresinden sağlayıcı tespit edilir (Google Workspace /
 *      Yandex / Microsoft 365 / Diğer) — domain ekinden + (gerekirse) MX'ten.
 *   2. Büyük "App Password al" butonu doğru sağlayıcının güvenlik sayfasını
 *      yeni sekmede açar; yanında 3-4 adımlık Türkçe talimat görünür.
 *   3. Kullanıcı dönüp şifreyi yapıştırır → "Test et" tuşu kendisine bir mail
 *      gönderir → "Tamamla" ile kayıt biter.
 *
 * Yönetici müdahalesine gerek yok. Kullanıcı ilk teklif göndermek istediğinde
 * SMTP yoksa bu modal otomatik açılır.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Modal, Input, Button, Steps, Tag, Alert, Space, Typography } from 'antd';
import {
  MailOutlined,
  KeyOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { api } from '../services/apiClient';
import { useKullanici } from '../context/useKullanici';

const { Text, Paragraph } = Typography;

type SaglayiciId = 'google' | 'yandex' | 'outlook365' | 'other';

interface SaglayiciInfo {
  id: SaglayiciId;
  ad: string;
  rozet: string;
  appPasswordUrl: string;
  adimlar: string[];
  note?: string;
}

const SAGLAYICILAR: Record<SaglayiciId, SaglayiciInfo> = {
  google: {
    id: 'google',
    ad: 'Google (Gmail / Workspace)',
    rozet: 'Google',
    appPasswordUrl: 'https://myaccount.google.com/apppasswords',
    adimlar: [
      'Açılan sayfada Google hesabınla giriş yap (gerekirse).',
      'Uygulama adı kutusuna "Teklif Sistemi" yaz, "Oluştur"a bas.',
      'Ekranda çıkan 16 karakterli mail şifresini kopyala (boşluklarla görünebilir, sorun değil).',
      'Bu pencereye dön, aşağıdaki "Mail şifresi" kutusuna yapıştır.',
    ],
    note: '2 Adımlı Doğrulama açık değilse önce o açılmalı. Buton sizi önce ona yönlendirir.',
  },
  yandex: {
    id: 'yandex',
    ad: 'Yandex Mail',
    rozet: 'Yandex',
    appPasswordUrl: 'https://id.yandex.com/security/enter-app-passwords',
    adimlar: [
      'Açılan sayfada Yandex hesabınla giriş yap (gerekirse).',
      '"Uygulama şifresi oluştur" → tip olarak "E-posta" / "Mail" seç.',
      'İsim olarak "Teklif Sistemi" yaz, oluştur.',
      'Görünen şifreyi kopyala → bu pencereye dön → "Mail şifresi" kutusuna yapıştır.',
    ],
    note: 'Eğer şirket hesabınız 2FA istemiyorsa mevcut mail şifrenizi de kullanabilirsiniz; o da çalışır.',
  },
  outlook365: {
    id: 'outlook365',
    ad: 'Microsoft 365 / Outlook',
    rozet: 'Microsoft 365',
    appPasswordUrl: 'https://account.microsoft.com/security',
    adimlar: [
      'Açılan güvenlik sayfasında "Gelişmiş güvenlik seçenekleri" / "Advanced security options".',
      '"Uygulama şifreleri" altında "Yeni uygulama şifresi oluştur".',
      'Ekranda çıkan kodu kopyala.',
      'Bu pencereye dön, "Mail şifresi" kutusuna yapıştır.',
    ],
    note: 'Şirket hesabınızda admin "Uygulama şifresi" seçeneğini kapatmış olabilir; o durumda IT\'ye danışın.',
  },
  other: {
    id: 'other',
    ad: 'Diğer / Bilinmeyen Sağlayıcı',
    rozet: 'Diğer',
    appPasswordUrl: '',
    adimlar: [
      'Mail sağlayıcınızın güvenlik sayfasından bir "uygulama şifresi" oluşturun.',
      'Sağlayıcınız bunu desteklemiyorsa mevcut mail şifrenizi kullanabilirsiniz.',
      'Şifreyi kopyalayıp aşağıdaki kutuya yapıştırın.',
    ],
    note: 'Sağlayıcınızı tespit edemedik. Mail adresi + şifre girince sistem otomatik bağlanmaya çalışır.',
  },
};

function detectSaglayici(email: string): SaglayiciId {
  const domain = (email.split('@')[1] || '').toLowerCase();
  if (!domain) return 'other';
  if (domain === 'gmail.com' || domain === 'googlemail.com') return 'google';
  if (domain === 'mebamekanik.com') return 'google'; // Google Workspace
  // mesaenerji.com'un MX kaydı yok (sadece .com.tr aktif) — yanlış yönlendirme
  // yapmamak için bilinçli olarak listeden çıkarıldı.
  if (domain === 'mesaenerji.com.tr' || domain === 'elmos.com.tr') return 'yandex';
  if (domain.endsWith('yandex.com') || domain.endsWith('yandex.ru') || domain.endsWith('yandex.com.tr')) return 'yandex';
  if (
    domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' ||
    domain.endsWith('.onmicrosoft.com')
  ) return 'outlook365';
  // Diğer kurumsal domainler için backend MX lookup yapıyor (kaydetme sırasında).
  // Burada UI'a yardımcı olması için 365'i fallback gösteriyoruz.
  return 'other';
}

interface Props {
  open: boolean;
  /** Modal kapatıldığında çağrılır. */
  onClose: () => void;
  /** SMTP başarıyla kaydedildiğinde (test gönderilmiş olsun olmasın) çağrılır.
   *  Çağıran bu sinyalle "şimdi compose modal'ı açabilirim" gibi devam eder. */
  onCompleted: () => void;
}

export default function SelfServeSmtpModal({ open, onClose, onCompleted }: Props) {
  const { message } = AntdApp.useApp();
  const { aktifKullanici } = useKullanici();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [testEdiliyor, setTestEdiliyor] = useState(false);
  const [testGectiMi, setTestGectiMi] = useState(false);

  // Modal her açıldığında mevcut ayarları yükle (kullanıcı daha önce kısmen
  // doldurduysa devam edebilsin).
  useEffect(() => {
    if (!open) return;
    let iptal = false;
    setYukleniyor(true);
    setTestGectiMi(false);
    setPassword('');
    void (async () => {
      try {
        const data = await api.auth.smtpAyarlar();
        if (iptal) return;
        setEmail(data.smtpUser ?? '');
        setHasPassword(data.hasPassword);
      } catch {
        // İlk kez açılıyor — sessizce devam
        setEmail('');
        setHasPassword(false);
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    return () => { iptal = true; };
  }, [open]);

  const saglayici = useMemo<SaglayiciInfo>(() => SAGLAYICILAR[detectSaglayici(email)], [email]);
  const currentStep = !email ? 0 : (!hasPassword && !password) ? 1 : (testGectiMi ? 3 : 2);

  const acAppPasswordSayfasi = useCallback(() => {
    if (!saglayici.appPasswordUrl) {
      message.info('Mail sağlayıcınızın kendi web sitesinden uygulama şifresi oluşturmanız gerekiyor.');
      return;
    }
    window.open(saglayici.appPasswordUrl, '_blank', 'noopener,noreferrer');
  }, [saglayici, message]);

  const kaydet = useCallback(async (): Promise<boolean> => {
    if (!email.trim()) {
      message.warning('Önce mail adresinizi girin.');
      return false;
    }
    setKaydediliyor(true);
    try {
      const payload: Parameters<typeof api.auth.smtpAyarlariGuncelle>[0] = {
        smtpUser: email.trim(),
        smtpFromAddress: email.trim(),
        smtpFromName: aktifKullanici?.adSoyad,
      };
      if (password) payload.smtpPassword = password;
      // Sağlayıcıya göre host/port'u doğrudan biz set edelim (backend
      // bir başka kullanıcı için MX bakıyor ama kendi /smtp-ayarlar
      // endpoint'i MX detect yapmıyor — yine de doğru host'u burada veriyoruz).
      if (saglayici.id === 'google') {
        payload.smtpHost = 'smtp.gmail.com';
        payload.smtpPort = 465;
        payload.smtpSecure = true;
      } else if (saglayici.id === 'yandex') {
        payload.smtpHost = 'smtp.yandex.com';
        payload.smtpPort = 465;
        payload.smtpSecure = true;
      } else if (saglayici.id === 'outlook365') {
        payload.smtpHost = 'smtp.office365.com';
        payload.smtpPort = 587;
        payload.smtpSecure = false;
      }
      const r = await api.auth.smtpAyarlariGuncelle(payload);
      setHasPassword(r.hasPassword);
      if (password) setPassword('');
      return true;
    } catch (err) {
      message.error('Kaydetme hatası: ' + (err instanceof Error ? err.message : 'bilinmeyen'));
      return false;
    } finally {
      setKaydediliyor(false);
    }
  }, [email, password, saglayici, aktifKullanici, message]);

  const testEt = useCallback(async () => {
    if (!email || (!password && !hasPassword)) {
      message.warning('Mail adresi ve şifre dolu olmalı.');
      return;
    }
    // Önce kaydet, sonra test
    setTestEdiliyor(true);
    try {
      const kaydedildi = await kaydet();
      if (!kaydedildi) return;
      const r = await api.auth.smtpTestMail();
      if (r.ok) {
        message.success(`Test maili kendinize gönderildi (${r.to}). Mail kutunuzu kontrol edin.`);
        setTestGectiMi(true);
      } else {
        message.error('Test başarısız: ' + (r.error || 'bilinmeyen'));
      }
    } catch (err) {
      message.error('Test hatası: ' + (err instanceof Error ? err.message : 'bilinmeyen'));
    } finally {
      setTestEdiliyor(false);
    }
  }, [email, password, hasPassword, kaydet, message]);

  const tamamla = useCallback(async () => {
    const ok = await kaydet();
    if (ok) {
      message.success('Mail kurulumu tamamlandı.');
      onCompleted();
    }
  }, [kaydet, onCompleted, message]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={<><MailOutlined /> &nbsp; Mail Kurulumu — Tek Seferlik</>}
      footer={null}
      width={620}
      destroyOnHidden
    >
      {yukleniyor ? null : (
        <>
          <Steps
            size="small"
            current={currentStep}
            style={{ marginBottom: 16 }}
            items={[
              { title: 'Mail adresi' },
              { title: 'Mail şifresi' },
              { title: 'Test' },
              { title: 'Hazır' },
            ]}
          />

          {/* Adım 1: Mail adresi */}
          <div style={{ marginBottom: 14 }}>
            <Text strong>1. Hangi mail adresinden teklif göndereceksin?</Text>
            <Input
              prefix={<MailOutlined />}
              placeholder={`${aktifKullanici?.kullaniciAdi || 'ornek'}@mebamekanik.com`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setTestGectiMi(false); }}
              style={{ marginTop: 6 }}
              autoComplete="off"
            />
            {email && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                Sağlayıcı tespit edildi: <Tag color="blue">{saglayici.rozet}</Tag>
              </div>
            )}
          </div>

          {/* Adım 2: Mail şifresi */}
          {email && (
            <div style={{ marginBottom: 14, padding: 14, background: '#f8fafc', borderRadius: 8 }}>
              <Text strong>2. {saglayici.ad} hesabından mail şifrenizi al</Text>
              <Paragraph style={{ fontSize: 12, color: '#475569', margin: '8px 0' }}>
                Sağlayıcının (Google/Yandex/Microsoft) güvenlik sayfasından <b>mail için özel bir şifre</b>
                oluşturacaksın — 16 karakterli, sadece bu sistem için. İstediğin zaman iptal edebilirsin.
                <br /><br />
                <span style={{ color: '#94a3b8' }}>(Teknik ismi "App Password" / "Uygulama Şifresi". Normal hesap şifrenle aynı değil.)</span>
              </Paragraph>
              {saglayici.appPasswordUrl ? (
                <Button
                  type="primary"
                  icon={<ExportOutlined />}
                  onClick={acAppPasswordSayfasi}
                  style={{ marginBottom: 10 }}
                >
                  {saglayici.ad} sayfasını aç →
                </Button>
              ) : null}
              <ol style={{ fontSize: 12, margin: '8px 0 0 18px', padding: 0, color: '#334155', lineHeight: 1.7 }}>
                {saglayici.adimlar.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              {saglayici.note && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginTop: 10, fontSize: 12 }}
                  message={saglayici.note}
                />
              )}
            </div>
          )}

          {/* Adım 3: Yapıştır */}
          {email && (
            <div style={{ marginBottom: 14 }}>
              <Text strong>
                3. Kopyaladığın mail şifresini buraya yapıştır
                {hasPassword && <Tag color="green" style={{ marginLeft: 8 }}>Kayıtlı şifre var</Tag>}
              </Text>
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder={hasPassword ? '••••• (mevcut şifre kayıtlı, değiştirmek istemiyorsan boş bırak)' : 'Mail için oluşturduğun 16 karakterli şifre'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setTestGectiMi(false); }}
                style={{ marginTop: 6 }}
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Footer aksiyonlar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
            <Button onClick={onClose}>Kapat</Button>
            <Space>
              <Button
                icon={<SendOutlined />}
                loading={testEdiliyor}
                onClick={testEt}
                disabled={!email || (!password && !hasPassword)}
              >
                Test maili gönder
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={kaydediliyor}
                onClick={tamamla}
                disabled={!email || (!password && !hasPassword)}
              >
                {testGectiMi ? 'Tamamla' : 'Kaydet ve devam et'}
              </Button>
            </Space>
          </div>
        </>
      )}
    </Modal>
  );
}
