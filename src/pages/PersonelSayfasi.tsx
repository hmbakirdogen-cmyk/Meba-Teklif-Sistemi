import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm,
  message, Card, Avatar,
} from 'antd';
import { PlusOutlined, KeyOutlined, DeleteOutlined, UserOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../services/apiClient';
import { useKullanici } from '../context/useKullanici';
import { useFirma } from '../context/useFirma';
import type { Kullanici, KullaniciRol } from '../types/kullanici';

interface FormValues {
  kullaniciAdi: string;
  adSoyad: string;
  unvan: string;
  rol: KullaniciRol;
  firmaId?: string;
}

export default function PersonelSayfasi() {
  const { aktifKullanici } = useKullanici();
  const { firmalar } = useFirma();
  const [liste, setListe] = useState<Kullanici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Kullanici | null>(null);
  const [form] = Form.useForm<FormValues>();

  const isSuperAdmin = aktifKullanici?.rol === 'super_admin';

  const fetchListe = useCallback(async () => {
    setYukleniyor(true);
    try {
      const data = await api.kullanicilar.list();
      setListe(data.filter((k) => k.aktifMi));
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Personel listesi alınamadı');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => { void fetchListe(); }, [fetchListe]);

  function yeniPersonel() {
    setDuzenlenen(null);
    form.resetFields();
    form.setFieldsValue({
      rol: 'engineer',
      firmaId: isSuperAdmin ? undefined : aktifKullanici?.firmaId || undefined,
    });
    setModalOpen(true);
  }

  function duzenle(k: Kullanici) {
    setDuzenlenen(k);
    form.setFieldsValue({
      kullaniciAdi: k.kullaniciAdi || '',
      adSoyad: k.adSoyad,
      unvan: k.unvan,
      rol: k.rol,
      firmaId: k.firmaId || undefined,
    });
    setModalOpen(true);
  }

  async function kaydet(values: FormValues) {
    try {
      if (duzenlenen) {
        await api.kullanicilar.update(duzenlenen.id, {
          adSoyad: values.adSoyad,
          unvan: values.unvan,
          rol: values.rol,
        });
        message.success('Personel güncellendi');
      } else {
        const r = await api.kullanicilar.create({
          kullaniciAdi: values.kullaniciAdi.toLowerCase().trim(),
          adSoyad: values.adSoyad,
          unvan: values.unvan,
          rol: values.rol,
          firmaId: isSuperAdmin ? values.firmaId : aktifKullanici?.firmaId || undefined,
        });
        message.success(`Personel eklendi. Varsayılan şifre: ${r.varsayilanSifre}`);
      }
      setModalOpen(false);
      void fetchListe();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Kaydedilemedi');
    }
  }

  async function sifreSifirla(k: Kullanici) {
    try {
      const r = await api.kullanicilar.sifirla(k.id);
      Modal.success({
        title: 'Şifre sıfırlandı',
        content: (
          <div>
            <p><strong>{k.adSoyad}</strong> kullanıcısının şifresi:</p>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', textAlign: 'center', padding: 14, background: '#f1f5f9', borderRadius: 8 }}>
              {r.varsayilanSifre}
            </p>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Personel ilk giriş yapınca yeni şifresini belirleyecek.
            </p>
          </div>
        ),
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Sıfırlanamadı');
    }
  }

  async function sil(k: Kullanici) {
    try {
      await api.kullanicilar.sil(k.id);
      message.success('Personel pasif edildi');
      void fetchListe();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Silinemedi');
    }
  }

  const firmaIdToAd = useMemo(() => {
    const m: Record<string, string> = {};
    firmalar.forEach((f) => { m[f.id] = f.kisaAd; });
    return m;
  }, [firmalar]);

  const rolEtiket: Record<KullaniciRol, { color: string; label: string }> = {
    super_admin: { color: 'gold',    label: 'Süper Yönetici' },
    firma_admin: { color: 'orange',  label: 'Firma Yöneticisi' },
    admin:       { color: 'orange',  label: 'Yönetici' },
    engineer:    { color: 'blue',    label: 'Mühendis' },
    sales:       { color: 'green',   label: 'Satış' },
  };

  const columns = [
    {
      title: 'Personel',
      key: 'personel',
      render: (_: unknown, k: Kullanici) => (
        <Space>
          {k.profilFotoUrl
            ? <Avatar src={k.profilFotoUrl} size={36} />
            : <Avatar size={36} icon={<UserOutlined />}>{k.initials}</Avatar>
          }
          <div>
            <div style={{ fontWeight: 600 }}>{k.adSoyad}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>@{k.kullaniciAdi}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Ünvan',
      dataIndex: 'unvan',
      key: 'unvan',
      render: (v: string) => v || <span style={{ color: '#cbd5e1' }}>—</span>,
    },
    {
      title: 'Rol',
      dataIndex: 'rol',
      key: 'rol',
      render: (rol: KullaniciRol) => {
        const r = rolEtiket[rol] || { color: 'default', label: rol };
        return <Tag color={r.color}>{r.label}</Tag>;
      },
    },
    ...(isSuperAdmin ? [{
      title: 'Firma',
      dataIndex: 'firmaId',
      key: 'firmaId',
      render: (id: string | null) => id ? <Tag>{firmaIdToAd[id] || id}</Tag> : <span style={{ color: '#94a3b8' }}>—</span>,
    }] : []),
    {
      title: 'İlk Giriş',
      key: 'mustChange',
      render: (_: unknown, k: Kullanici) =>
        k.mustChangePassword
          ? <Tag color="red">Şifre değişmemiş</Tag>
          : <Tag color="green">Tamam</Tag>,
    },
    {
      title: 'İşlemler',
      key: 'actions',
      align: 'right' as const,
      render: (_: unknown, k: Kullanici) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => duzenle(k)}>Düzenle</Button>
          <Button size="small" icon={<KeyOutlined />} onClick={() => void sifreSifirla(k)}>Şifre</Button>
          <Popconfirm
            title="Personeli pasif et?"
            description="Tekrar aktifleştirmek için yöneticiye başvurmak gerekir."
            okText="Pasif et"
            cancelText="Vazgeç"
            okButtonProps={{ danger: true }}
            disabled={k.id === aktifKullanici?.id}
            onConfirm={() => void sil(k)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={k.id === aktifKullanici?.id}
            >
              Sil
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Personel Yönetimi</div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                {isSuperAdmin
                  ? 'Tüm firmalardaki personeli yönetin'
                  : 'Firmanıza ait personeli ekleyip düzenleyin'}
              </div>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={yeniPersonel}>
              Yeni Personel
            </Button>
          </div>
        }
      >
        <Table
          rowKey="id"
          loading={yukleniyor}
          dataSource={liste}
          columns={columns}
          pagination={{ pageSize: 20 }}
          size="middle"
        />
      </Card>

      <Modal
        title={duzenlenen ? `${duzenlenen.adSoyad} – Düzenle` : 'Yeni Personel Ekle'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={duzenlenen ? 'Kaydet' : 'Ekle'}
        cancelText="Vazgeç"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={kaydet}
          initialValues={{ rol: 'engineer' }}
        >
          {!duzenlenen && (
            <Form.Item
              name="kullaniciAdi"
              label="Kullanıcı Adı (giriş için)"
              rules={[
                { required: true, message: 'Zorunlu' },
                { pattern: /^[a-z0-9._-]+$/i, message: 'Sadece harf, rakam, . _ -' },
                { min: 3, message: 'En az 3 karakter' },
              ]}
              extra="Personel ilk girişte 123456 şifresiyle giriş yapacak ve yeni şifre belirleyecek"
            >
              <Input placeholder="örn. ahmet" autoComplete="off" />
            </Form.Item>
          )}
          <Form.Item
            name="adSoyad"
            label="Ad Soyad"
            rules={[{ required: true, message: 'Zorunlu' }]}
          >
            <Input placeholder="örn. Ahmet Yılmaz" />
          </Form.Item>
          <Form.Item
            name="unvan"
            label="Ünvan"
            extra="Örn: Makine Mühendisi, Satış Sorumlusu, Pazarlama Uzmanı"
          >
            <Input placeholder="Ünvan" />
          </Form.Item>
          <Form.Item name="rol" label="Rol" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="engineer">Mühendis</Select.Option>
              <Select.Option value="sales">Satış Sorumlusu</Select.Option>
              {isSuperAdmin && <Select.Option value="firma_admin">Firma Yöneticisi</Select.Option>}
            </Select>
          </Form.Item>
          {isSuperAdmin && !duzenlenen && (
            <Form.Item name="firmaId" label="Firma" rules={[{ required: true, message: 'Firma seçiniz' }]}>
              <Select placeholder="Firma seçin">
                {firmalar.map((f) => (
                  <Select.Option key={f.id} value={f.id}>{f.ad}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
