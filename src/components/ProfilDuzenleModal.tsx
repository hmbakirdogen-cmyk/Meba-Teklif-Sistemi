import { useEffect, useState } from 'react';
import { Modal, Form, Input, message, Divider, Button, Alert, Space, Tag, Tooltip } from 'antd';
import { LockOutlined, FolderOpenOutlined, FolderOutlined, SwapOutlined, DisconnectOutlined, CopyOutlined } from '@ant-design/icons';
import { api } from '../services/apiClient';
import { useKullanici } from '../context/useKullanici';
import { useFirma } from '../context/useFirma';
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
  const { firmalar } = useFirma();
  const pdfKayit = usePDFKayit();
  // Kullanıcının firmasının PDF klasör adı (rehber UI'da göstermek için).
  // Örn. ELMOS kullanıcısı için "ELMOS OTOMASYON TEKLİFLER".
  const firmaPdfKlasorAdi =
    firmalar.find((f) => f.id === aktifKullanici?.firmaId)?.pdfKlasorAdi || '';
  // Mevcut seçili klasör tam olarak firma adı mı (tutarlı yapıda mı)?
  const klasorTutarli = !!pdfKayit.klasorAdi
    && !!firmaPdfKlasorAdi
    && pdfKayit.klasorAdi.toLocaleLowerCase('tr-TR') === firmaPdfKlasorAdi.toLocaleLowerCase('tr-TR');
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
        // Hook artık AbortError için bilgilendirici error mesajı sağlıyor
        // ("iptal edildi VEYA tarayıcı erişimi reddetti — farklı klasör dene").
        message.warning(r.error || 'Klasör seçimi iptal edildi.', 6);
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
      destroyOnHidden
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
            {/* Chrome güvenlik politikası kullanıcının Masaüstü/Belgeler/
                Downloads/OneDrive senkron klasörlerine yazma erişimi
                vermez — klasör seçilse bile AbortError fırlatır. Kullanıcı
                "iptal ettim" sanır. Bu banner ile en başta uyarıyoruz. */}
            {!pdfKayit.hasKlasor && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 10 }}
                message="Klasör seçerken dikkat"
                description={
                  <div style={{ fontSize: 12, lineHeight: 1.55 }}>
                    Tarayıcı güvenlik nedeniyle <strong>Masaüstü, Belgeler, Downloads</strong> ve <strong>OneDrive senkron</strong> klasörlerine yazma izni vermez. Klasör seçtikten sonra "iptal edildi" mesajı görürseniz neden budur.
                    <br /><br />
                    <strong>Önerilen:</strong> Önce Windows Explorer ile <code style={{ background: '#fff3cd', padding: '1px 5px', borderRadius: 3 }}>C:\TEKLIFLER</code> veya <code style={{ background: '#fff3cd', padding: '1px 5px', borderRadius: 3 }}>D:\Teklifler</code> gibi yeni bir klasör oluşturun, sonra burada onu seçin.
                  </div>
                }
              />
            )}

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

            {/* Önerilen yapı rehberi — kullanıcı masaüstünde firma adında bir
               klasör oluşturup onu seçerse, sistem alt cari klasörlerini
               otomatik açar ve "iç içe duplikasyon" olmaz. */}
            {firmaPdfKlasorAdi && !klasorTutarli && (
              <Alert
                type="info"
                showIcon
                style={{ marginTop: 12 }}
                message={
                  <span style={{ fontSize: 13 }}>
                    Önerilen yapı: <strong>masaüstünde</strong> aşağıdaki adda bir klasör oluşturup onu seçin
                  </span>
                }
                description={
                  <div style={{ fontSize: 12.5, lineHeight: 1.7, marginTop: 6 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      background: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      marginBottom: 8,
                      fontFamily: 'monospace',
                    }}>
                      <FolderOutlined style={{ color: '#1E3A5F' }} />
                      <span style={{ flex: 1, fontWeight: 600, color: '#1E3A5F' }}>{firmaPdfKlasorAdi}</span>
                      <Tooltip title="Klasör adını kopyala">
                        <Button
                          size="small"
                          type="text"
                          icon={<CopyOutlined />}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(firmaPdfKlasorAdi);
                              message.success('Klasör adı kopyalandı');
                            } catch {
                              message.warning('Kopyalanamadı, manuel seçip kopyalayın.');
                            }
                          }}
                        />
                      </Tooltip>
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 20 }}>
                      <li>Yukarıdaki adı kopyalayın (<CopyOutlined />)</li>
                      <li>Masaüstünde sağ tık → Yeni → Klasör → adı yapıştırın</li>
                      <li>"Klasör Seç" butonuyla bu klasörü seçin</li>
                      <li>İlk PDF'iniz cari adıyla alt klasör olarak otomatik düzenlenir</li>
                    </ol>
                  </div>
                }
              />
            )}
            {firmaPdfKlasorAdi && klasorTutarli && (
              <Alert
                type="success"
                showIcon
                style={{ marginTop: 12, fontSize: 12.5 }}
                message={`Klasör yapınız doğru: PDF'ler "${firmaPdfKlasorAdi}" altında cari klasörlere düzenli kaydedilir.`}
              />
            )}
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
