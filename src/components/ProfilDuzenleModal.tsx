import { useEffect, useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
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

/**
 * Profilim modal'i — her kullanici (rol farketmez) ad-soyad, unvan, telefon
 * ve dahili bilgilerini kendi guncelleyebilir. Profil fotosu icin ayri
 * ProfilFotoModal var. Header'daki "Profilim" butonu bu modal'i acar.
 */
export default function ProfilDuzenleModal({ open, onClose }: Props) {
  const { aktifKullanici, refreshKullanici } = useKullanici();
  const [form] = Form.useForm<FormValues>();
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!open || !aktifKullanici) return;
    form.setFieldsValue({
      adSoyad: aktifKullanici.adSoyad || '',
      unvan: aktifKullanici.unvan || '',
      telefon: aktifKullanici.telefon || '',
      dahili: aktifKullanici.dahili || '',
    });
  }, [open, aktifKullanici, form]);

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
    </Modal>
  );
}
