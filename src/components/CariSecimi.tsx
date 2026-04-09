import { useEffect, useState } from 'react';
import { Select, Button, Modal, Form, Input, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { cariService } from '../services/musteriService';
import type { Cari } from '../types';
import {
  normalizeProductCode,
  cleanTextInput,
  formatPhone,
  normalizeEmail,
} from '../utils/formatters';

const { Option } = Select;

interface CariSecimiProps {
  value?: Cari | null;
  onChange?: (cari: Cari) => void;
}

export default function CariSecimi({ value, onChange }: CariSecimiProps) {
  const [cariler, setCariler] = useState<Cari[]>([]);
  const [modalAcik, setModalAcik] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    setCariler(cariService.tumCarileriGetir());
  }, [value]);

  function cariSec(id: string) {
    const cari = cariler.find((c) => c.id === id);
    if (cari && onChange) onChange(cari);
  }

  function yeniCariKaydet() {
    form.validateFields().then((vals) => {
      const yeni: Cari = {
        id: cariService.cariIdUret(),
        cariKod: vals.cariKod,
        firmaAdi: vals.firmaAdi,
        yetkiliKisi: vals.yetkiliKisi || '',
        telefon: vals.telefon || '',
        ePosta: vals.ePosta || '',
        adres: vals.adres || '',
        vergiDairesi: vals.vergiDairesi || '',
        vergiNo: vals.vergiNo || '',
        lastContactName: undefined,
        lastContactTitle: undefined,
      };
      cariService.cariKaydet(yeni);
      const guncelliste = cariService.tumCarileriGetir();
      setCariler(guncelliste);
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
          placeholder="Cari seçin (firma adı veya cari kod ile arayın)..."
          style={{ flex: 1 }}
          value={value?.id}
          onChange={cariSec}
          filterOption={(input, option) => {
            const cari = cariler.find((c) => c.id === option?.value);
            if (!cari) return false;
            const ara = input.toLowerCase();
            return (
              cari.firmaAdi.toLowerCase().includes(ara) ||
              cari.cariKod.toLowerCase().includes(ara)
            );
          }}
        >
          {cariler.map((c) => (
            <Option key={c.id} value={c.id}>
              <span style={{ color: '#94a3b8', fontSize: 11, marginRight: 8, fontVariantNumeric: 'tabular-nums' }}>
                [{c.cariKod}]
              </span>
              <span style={{ fontWeight: 500 }}>{c.firmaAdi}</span>
            </Option>
          ))}
        </Select>
        <Button icon={<PlusOutlined />} onClick={() => setModalAcik(true)}>
          Yeni Cari
        </Button>
      </Space.Compact>

      {value && (
        <div style={{
          marginTop: 10,
          padding: '10px 14px',
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          lineHeight: 1.6,
        }}>
          {/* Firma adı + kod */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: 1.0,
              textTransform: 'uppercase',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {value.cariKod}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f1f45', letterSpacing: -0.2 }}>
              {value.firmaAdi}
            </span>
          </div>
          {/* İkincil bilgiler */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px 16px' }}>
            {value.yetkiliKisi && (
              <span style={{ fontSize: 12, color: '#475569' }}>Sayın {value.yetkiliKisi}</span>
            )}
            {value.telefon && (
              <span style={{ fontSize: 12, color: '#64748b' }}>{value.telefon}</span>
            )}
            {value.ePosta && (
              <span style={{ fontSize: 12, color: '#2563eb' }}>{value.ePosta}</span>
            )}
            {value.vergiNo && (
              <span style={{ fontSize: 12, color: '#64748b' }}>
                VKN: {value.vergiNo}
                {value.vergiDairesi && <span style={{ color: '#94a3b8' }}> — {value.vergiDairesi} V.D.</span>}
              </span>
            )}
          </div>
          {value.adres && (
            <div style={{ marginTop: 3, color: '#94a3b8', fontSize: 11, wordBreak: 'break-word' }}>
              {value.adres}
            </div>
          )}
        </div>
      )}

      <Modal
        title="Yeni Cari Ekle"
        open={modalAcik}
        onOk={yeniCariKaydet}
        onCancel={() => { setModalAcik(false); form.resetFields(); }}
        okText="Kaydet"
        cancelText="İptal"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="cariKod" label="Cari Kod" rules={[{ required: true, message: 'Cari kod zorunlu' }]}>
            <Input
              placeholder="Örn: C-001"
              onBlur={() => form.setFieldValue('cariKod', normalizeProductCode(form.getFieldValue('cariKod') || ''))}
            />
          </Form.Item>
          <Form.Item name="firmaAdi" label="Firma Adı" rules={[{ required: true, message: 'Firma adı zorunlu' }]}>
            <Input
              onBlur={() => form.setFieldValue('firmaAdi', cleanTextInput(form.getFieldValue('firmaAdi') || ''))}
            />
          </Form.Item>
          <Form.Item name="yetkiliKisi" label="Yetkili Kişi">
            <Input
              onBlur={() => form.setFieldValue('yetkiliKisi', cleanTextInput(form.getFieldValue('yetkiliKisi') || ''))}
            />
          </Form.Item>
          <Form.Item name="telefon" label="Telefon">
            <Input
              placeholder="(05xx) xxx xx xx"
              onBlur={() => form.setFieldValue('telefon', formatPhone(form.getFieldValue('telefon') || ''))}
            />
          </Form.Item>
          <Form.Item name="ePosta" label="E-Posta">
            <Input
              placeholder="ornek@firma.com"
              onBlur={() => form.setFieldValue('ePosta', normalizeEmail(form.getFieldValue('ePosta') || ''))}
            />
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
