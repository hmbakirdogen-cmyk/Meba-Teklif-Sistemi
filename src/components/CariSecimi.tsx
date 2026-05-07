import { useState, useMemo } from 'react';
import { Select, Button, Modal, Form, Input } from 'antd';
import { PlusOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import { cariService } from '../services/musteriService';
import type { Cari } from '../types';
import {
  normalizeProductCode,
  cleanTextInput,
  formatCariAdi,
  formatDisplayText,
} from '../utils/formatters';
import { buttonClassNames } from '../styles/buttonStyles';
import { useColors } from '../hooks/useColors';

interface CariSecimiProps {
  value?: Cari | null;
  onChange?: (cari: Cari) => void;
}

export default function CariSecimi({ value, onChange }: CariSecimiProps) {
  const C = useColors();
  const [cariler, setCariler] = useState<Cari[]>(() => cariService.tumCarileriGetir());
  const [modalAcik, setModalAcik] = useState(false);
  const [form] = Form.useForm();

  // Hızlı lookup map — O(1) erişim
  const cariMap = useMemo(() => {
    const map = new Map<string, Cari>();
    for (const c of cariler) map.set(c.id, c);
    return map;
  }, [cariler]);

  // options dizisi — Select'e props olarak veriliyor
  const selectOptions = useMemo(() =>
    cariler.map((c) => ({
      value: c.id,
      label: `[${c.cariKod}] ${formatCariAdi(c.firmaAdi)}`,
      firmaAdiLower: c.firmaAdi.toLocaleLowerCase('tr-TR'),
      cariKodLower: c.cariKod.toLocaleLowerCase('tr-TR'),
    })),
    [cariler],
  );

  function cariSec(id: string) {
    const cari = cariMap.get(id);
    if (cari && onChange) onChange(cari);
  }

  function yeniCariKaydet() {
    form.validateFields().then((vals) => {
      const yeni: Cari = {
        id: cariService.cariIdUret(),
        cariKod: normalizeProductCode(vals.cariKod || ''),
        firmaAdi: formatCariAdi(cleanTextInput(vals.firmaAdi ?? '')),
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 8px 8px 16px',
        background: C.bgSurface,
        borderRadius: 10,
        border: `1.5px solid ${C.border}`,
        boxShadow: C.shadow,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <SearchOutlined style={{ color: C.textFaint, fontSize: 15, flexShrink: 0 }} />
        <Select
          showSearch
          placeholder="Müşteri ara..."
          variant="borderless"
          style={{ flex: 1, minWidth: 0, height: 40, fontSize: 14 }}
          value={value?.id}
          onChange={cariSec}
          popupMatchSelectWidth={false}
          dropdownStyle={{ minWidth: 560 }}
          options={selectOptions}
          filterOption={(input, option) => {
            const ara = input.toLocaleLowerCase('tr-TR');
            return (
              option?.firmaAdiLower?.startsWith(ara) ||
              option?.cariKodLower?.startsWith(ara)
            ) ?? false;
          }}
          optionRender={(option) => {
            const cari = cariMap.get(option.value as string);
            if (!cari) return null;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                <span style={{ fontWeight: 500, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatCariAdi(cari.firmaAdi)}
                </span>
              </div>
            );
          }}
          suffixIcon={null}
        />
        <Button
          icon={<PlusOutlined />}
          onClick={() => setModalAcik(true)}
          className={buttonClassNames.primary}
          style={{ borderRadius: 7, fontWeight: 600, flexShrink: 0 }}
        >
          Yeni Cari
        </Button>
      </div>

      {value && (
        <div style={{
          marginTop: 10,
          padding: '12px 16px',
          background: C.bgElevated,
          borderRadius: 10,
          border: `1px solid ${C.borderSubtle}`,
          lineHeight: 1.6,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}>
          {/* Avatar */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: C.bgSurface,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}>
            <UserOutlined style={{ fontSize: 16, color: C.textFaint }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Firma adı (cari kod prefix kaldırıldı) */}
            <div style={{ marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, letterSpacing: -0.2 }}>
                {formatCariAdi(value.firmaAdi)}
              </span>
            </div>
            {/* İkincil bilgiler */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px 16px' }}>
              {value.yetkiliKisi && (
                <span style={{ fontSize: 12, color: C.textSecondary }}>Sayın {value.yetkiliKisi}</span>
              )}
              {value.telefon && (
                <span style={{ fontSize: 12, color: C.textSecondary }}>{value.telefon}</span>
              )}
              {value.ePosta && (
                <span style={{ fontSize: 12, color: '#2563eb' }}>{value.ePosta}</span>
              )}
              {value.vergiNo && (
                <span style={{ fontSize: 12, color: C.textSecondary }}>
                  VKN: {value.vergiNo}
                  {value.vergiDairesi && <span style={{ color: C.textFaint }}> — {value.vergiDairesi} V.D.</span>}
                </span>
              )}
            </div>
            {value.adres && (
              <div style={{ marginTop: 3, color: C.textFaint, fontSize: 11, wordBreak: 'break-word' }}>
                {value.adres}
              </div>
            )}
          </div>
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
          <Form.Item name="cariKod" label="Cari Kod" rules={[{ required: true, message: 'Cari kod zorunlu' }]} getValueFromEvent={(e) => formatDisplayText(e.target.value, 'product_code')}>
            <Input placeholder="Örn: C-001" />
          </Form.Item>
          <Form.Item name="firmaAdi" label="Firma Adı" rules={[{ required: true, message: 'Firma adı zorunlu' }]} getValueFromEvent={(e) => formatDisplayText(e.target.value, 'cari_adi')}>
            <Input />
          </Form.Item>
          <Form.Item name="yetkiliKisi" label="Yetkili Kişi" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'person_name')}>
            <Input />
          </Form.Item>
          <Form.Item name="telefon" label="Telefon" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'phone')}>
            <Input placeholder="(05xx) xxx xx xx" />
          </Form.Item>
          <Form.Item name="ePosta" label="E-Posta" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'email')}>
            <Input placeholder="ornek@firma.com" />
          </Form.Item>
          <Form.Item name="adres" label="Adres" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'address')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="vergiDairesi" label="Vergi Dairesi" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'text')}>
            <Input />
          </Form.Item>
          <Form.Item name="vergiNo" label="Vergi No" getValueFromEvent={(e) => formatDisplayText(e.target.value, 'vergi_no')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
