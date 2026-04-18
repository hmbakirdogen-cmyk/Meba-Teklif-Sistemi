/**
 * BelgeToolbar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Belge editörü üst araç çubuğu.
 * Kaydet, PDF İndir, Yazdır, Listeye Dön aksiyonları.
 */

import { Button, Space, Tag, Tooltip, Spin } from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SettingOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useColors } from '../hooks/useColors';
import { buttonClassNames } from '../styles/buttonStyles';
import type { TeklifDurum } from '../types';
import type { PanelModu } from '../hooks/useBelgeState';

interface BelgeToolbarProps {
  teklifNo: string;
  teklifNoDurumu: 'hazir' | 'yukleniyor' | 'hata';
  cariAdi?: string;
  durum: TeklifDurum;
  uretiliyor: boolean;
  pdfHazir: boolean;
  onGeriDon: () => void;
  onKaydet: () => void;
  onPdfIndir: () => void;
  onYazdir: () => void;
  onSatirEkle: () => void;
  onPanelAc: (mod: PanelModu) => void;
}

const DURUM_RENK: Record<TeklifDurum, string> = {
  taslak: 'default',
  hazir: 'blue',
  gonderildi: 'orange',
  onaylandi: 'green',
  iptal: 'red',
};

const DURUM_ETIKET: Record<TeklifDurum, string> = {
  taslak: 'Taslak',
  hazir: 'Hazır',
  gonderildi: 'Gönderildi',
  onaylandi: 'Onaylandı',
  iptal: 'İptal',
};

export default function BelgeToolbar({
  teklifNo,
  teklifNoDurumu,
  cariAdi,
  durum,
  uretiliyor,
  pdfHazir: _pdfHazir,
  onGeriDon,
  onKaydet,
  onPdfIndir,
  onYazdir,
  onSatirEkle,
  onPanelAc,
}: BelgeToolbarProps) {
  const C = useColors();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 16px',
      borderBottom: `1px solid ${C.border}`,
      background: C.bgSurface,
      flexShrink: 0,
      minHeight: 48,
      flexWrap: 'wrap',
    }}>
      {/* Sol: Geri + Teklif bilgisi */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={onGeriDon}
        style={{ marginRight: 4 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.textPrimary,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}>
          {teklifNoDurumu === 'yukleniyor' ? <Spin size="small" /> : teklifNo}
        </span>
        {cariAdi && (
          <span style={{
            fontSize: 12,
            color: C.textSecondary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 200,
          }}>
            — {cariAdi}
          </span>
        )}
        <Tag color={DURUM_RENK[durum]} style={{ margin: 0 }}>{DURUM_ETIKET[durum]}</Tag>
      </div>

      <div style={{ flex: 1 }} />

      {/* Sağ: Aksiyonlar */}
      <Space size={6} wrap>
        <Tooltip title="Satır Ekle">
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={onSatirEkle}
          />
        </Tooltip>
        <Tooltip title="Ayarlar Paneli">
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => onPanelAc('ayarlar')}
          />
        </Tooltip>
        <Tooltip title="Notlar">
          <Button
            type="text"
            icon={<FileTextOutlined />}
            onClick={() => onPanelAc('notlar')}
          />
        </Tooltip>

        <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

        <Button
          icon={<SaveOutlined />}
          onClick={onKaydet}
          className={buttonClassNames.secondary}
        >
          Kaydet
        </Button>
        <Button
          icon={<PrinterOutlined />}
          onClick={onYazdir}
          loading={uretiliyor}
          className={buttonClassNames.secondary}
        >
          Yazdır
        </Button>
        <Button
          type="primary"
          icon={<FilePdfOutlined />}
          onClick={onPdfIndir}
          loading={uretiliyor}
        >
          PDF
        </Button>
      </Space>
    </div>
  );
}
