import { useEffect, useState } from 'react';
import { Modal, Form, Input, message, Divider, Button, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { api } from '../services/apiClient';
import { useKullanici } from '../context/useKullanici';
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
  const [form] = Form.useForm<FormValues>();
  const [sifreForm] = Form.useForm<SifreFormValues>();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sifreYukleniyor, setSifreYukleniyor] = useState(false);

  const sifreUyari = Boolean(aktifKullanici?.mustChangePassword);

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

      <Divider style={{ margin: '8px 0 16px' }}>Şifre Değiştir</Divider>

      {sifreUyari && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Lütfen şifrenizi değiştirin"
          description="Hesabınız varsayılan şifre (0000) ile çalışıyor. Güvenliğiniz için yeni bir şifre belirleyin."
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
                val === '0000'
                  ? Promise.reject(new Error('Yeni şifre 0000 olamaz'))
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
