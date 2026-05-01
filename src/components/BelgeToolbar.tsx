/**
 * BelgeToolbar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Belge editörü üst araç çubuğu.
 * Kaydet, PDF İndir, Yazdır, Listeye Dön aksiyonları.
 */

import { Button, Space, Tag, Tooltip, Spin } from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  MailOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useColors } from '../hooks/useColors';
import { buttonClassNames } from '../styles/buttonStyles';
import type { TeklifStatus } from '../types';
import type { PanelModu } from '../hooks/useBelgeState';

interface BelgeToolbarProps {
  teklifNo: string;
  teklifNoDurumu: 'hazir' | 'yukleniyor' | 'hata';
  cariAdi?: string;
  status: TeklifStatus;
  uretiliyor: boolean;
  onGeriDon: () => void;
  onPdfIndir: () => void;
  onEMailGonder: () => void;
  onYazdir: () => void;
  onSatirEkle: () => void;
  onPanelAc: (mod: PanelModu) => void;
}

// 3-state otomatik kayıt status modeli
const STATUS_RENK: Record<TeklifStatus, string> = {
  taslak:     'default',
  kaydedildi: 'blue',
  gonderildi: 'green',
};

const STATUS_ETIKET: Record<TeklifStatus, string> = {
  taslak:     'Taslak',
  kaydedildi: 'Kaydedildi',
  gonderildi: 'Gönderildi',
};

export default function BelgeToolbar({
  teklifNo,
  teklifNoDurumu,
  cariAdi,
  status,
  uretiliyor,
  onGeriDon,
  onPdfIndir,
  onEMailGonder,
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
      padding: '10px 18px',
      borderBottom: `1px solid ${C.border}`,
      background: C.bgSurface,
      flexShrink: 0,
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100,
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
        <Tag color={STATUS_RENK[status]} style={{ margin: 0, borderRadius: 999, fontWeight: 600 }}>
          {STATUS_ETIKET[status]}
        </Tag>
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
        <Tooltip title="Notlar">
          <Button
            type="text"
            icon={
              <svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                {/* spiral soluk */}
                <circle cx="5" cy="4" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
                <circle cx="5" cy="7" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
                <circle cx="5" cy="10" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
                {/* kağıt gövde */}
                <rect x="6.5" y="2" width="9" height="13" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.80" />
                {/* yazı satırları */}
                <line x1="8.5" y1="5.2" x2="13.5" y2="5.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                <line x1="8.5" y1="7.6" x2="13.5" y2="7.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                <line x1="8.5" y1="10" x2="11.5" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                {/* kalem */}
                <g transform="rotate(-40 13 14)">
                  <rect x="12" y="11" width="2" height="5.5" rx="0.4" fill="currentColor" opacity="0.85" />
                  <polygon points="12,16.5 14,16.5 13,18.5" fill="currentColor" opacity="0.70" />
                </g>
              </svg>
            }
            onClick={() => onPanelAc('notlar')}
          />
        </Tooltip>

        <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

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
        <Button
          icon={<MailOutlined />}
          onClick={onEMailGonder}
          loading={uretiliyor}
          className={buttonClassNames.secondary}
        >
          E-Mail Gönder
        </Button>
      </Space>
    </div>
  );
}
