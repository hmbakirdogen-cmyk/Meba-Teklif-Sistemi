import { useEffect, useState } from 'react';
import { Select, Button, Modal, Form, Input, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { musteriService } from '../services/musteriService';
import type { Musteri } from '../types';

const { Option } = Select;

interface MusteriSecimiProps {
  value?: Musteri | null;
  onChange?: (musteri: Musteri) => void;
}

export default function MusteriSecimi({ value, onChange }: MusteriSecimiProps) {
  const [musteriler, setMusteriler] = useState<Musteri[]>([]);
  const [modalAcik, setModalAcik] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    setMusteriler(musteriService.tumMusterileriGetir());
  }, []);

  function musteriSec(id: string) {
    const musteri = musteriler.find((m) => m.id === id);
    if (musteri && onChange) onChange(musteri);
  }

  function yeniMusteriKaydet() {
    form.validateFields().then((vals) => {
      const yeni: Musteri = {
        id: musteriService.musteriIdUret(),
        cariKod: vals.cariKod || '',
        firmaAdi: vals.firmaAdi,
        yetkiliKisi: vals.yetkiliKisi || '',
        telefon: vals.telefon || '',
        ePosta: vals.ePosta || '',
        adres: vals.adres || '',
        vergiDairesi: vals.vergiDairesi || '',
        vergiNo: vals.vergiNo || '',
      };
      musteriService.musteriKaydet(yeni);
      const guncelliste = musteriService.tumMusterileriGetir();
      setMusteriler(guncelliste);
      setModalAcik(false);
      form.resetFields();
      if (onChange) onChange(yeni);
    });
  }

  return (
    <>
      <Space.Compact style={{ width: '100%' }}>
        <Select
          showSearch
          placeholder="Müşteri seçin..."
          style={{ flex: 1 }}
          value={value?.id}
          onChange={musteriSec}
          filterOption={(input, option) =>
            (option?.children as unknown as string)
              ?.toLowerCase()
              .includes(input.toLowerCase())
          }
        >
          {musteriler.map((m) => (
            <Option key={m.id} value={m.id}>
              {m.firmaAdi}
            </Option>
          ))}
        </Select>
        <Button icon={<PlusOutlined />} onClick={() => setModalAcik(true)}>
          Yeni Müşteri
        </Button>
      </Space.Compact>

      {value && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            background: '#f5f5f5',
            borderRadius: 4,
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          <strong>{value.firmaAdi}</strong>
          {value.yetkiliKisi && <> · {value.yetkiliKisi}</>}
          {value.telefon && <> · Tel: {value.telefon}</>}
          {value.ePosta && <> · {value.ePosta}</>}
        </div>
      )}

      <Modal
        title="Yeni Müşteri Ekle"
        open={modalAcik}
        onOk={yeniMusteriKaydet}
        onCancel={() => { setModalAcik(false); form.resetFields(); }}
        okText="Kaydet"
        cancelText="İptal"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="firmaAdi" label="Firma Adı" rules={[{ required: true, message: 'Firma adı zorunlu' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="yetkiliKisi" label="Yetkili Kişi">
            <Input />
          </Form.Item>
          <Form.Item name="telefon" label="Telefon">
            <Input />
          </Form.Item>
          <Form.Item name="ePosta" label="E-Posta">
            <Input />
          </Form.Item>
          <Form.Item name="adres" label="Adres">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="vergiDairesi" label="Vergi Dairesi">
            <Input />
          </Form.Item>
          <Form.Item name="vergiNo" label="Vergi No">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
