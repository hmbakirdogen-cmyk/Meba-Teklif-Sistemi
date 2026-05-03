/**
 * BelgeToolbar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Belge editörü üst araç çubuğu.
 * Geri | Teklif başlığı + Durum pill (clickable) | Aksiyonlar (Yazdır / PDF / Gönder).
 *
 * Durum pill: 5 durum (taslak/hazır/gönderildi/onaylandı/iptal). Otomatik geçişler
 * (PDF üretildi → hazır, e-posta gönderildi → gönderildi) editörde yapılır;
 * pill click → manuel override menüsü.
 */

import { Button, Dropdown, Space, Tooltip, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  MailOutlined,
  PlusOutlined,
  CaretDownOutlined,
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
  onGeriDon: () => void;
  onPdfIndir: () => void;
  onEMailGonder: () => void;
  onYazdir: () => void;
  onSatirEkle: () => void;
  onPanelAc: (mod: PanelModu) => void;
  onDurumDegistir: (d: TeklifDurum) => void;
}

const DURUM_RENK: Record<TeklifDurum, { color: string; bg: string; border: string }> = {
  taslak:     { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  hazir:      { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  gonderildi: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  onaylandi:  { color: '#15803d', bg: '#ecfdf5', border: '#a7f3d0' },
  reddedildi:  { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  iptal:      { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
};

const DURUM_ETIKET: Record<TeklifDurum, string> = {
  taslak:     'Taslak',
  hazir:      'Hazır',
  gonderildi: 'Gönderildi',
  onaylandi:  'Onaylandı',
  reddedildi:  'Reddedildi',
  iptal:      'İptal',
};

const DURUM_ACIKLAMA: Record<TeklifDurum, string> = {
  taslak:     'Üzerinde çalışılıyor',
  hazir:      'PDF üretildi, gönderim için hazır',
  gonderildi: 'Müşteriye gönderildi, yanıt bekleniyor',
  onaylandi:  'Müşteri onayladı / sipariş alındı',
  reddedildi:  'Müşteri reddetti (rakip/fiyat/zaman)',
  iptal:      'Süreç sonlandırıldı',
};

export default function BelgeToolbar({
  teklifNo,
  teklifNoDurumu,
  cariAdi,
  durum,
  uretiliyor,
  onGeriDon,
  onPdfIndir,
  onEMailGonder,
  onYazdir,
  onSatirEkle,
  onPanelAc,
  onDurumDegistir,
}: BelgeToolbarProps) {
  const C = useColors();
  const durumRenk = DURUM_RENK[durum];

  const durumMenuItems: MenuProps['items'] = (Object.keys(DURUM_ETIKET) as TeklifDurum[]).map((d) => ({
    key: d,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0', minWidth: 200 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: DURUM_RENK[d].color, flexShrink: 0,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: durum === d ? 700 : 600, color: 'inherit' }}>
            {DURUM_ETIKET[d]}{durum === d ? '  ✓' : ''}
          </span>
          <span style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.3 }}>
            {DURUM_ACIKLAMA[d]}
          </span>
        </div>
      </div>
    ),
  }));

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
        <Dropdown
          menu={{
            items: durumMenuItems,
            onClick: ({ key }) => onDurumDegistir(key as TeklifDurum),
            selectable: true,
            selectedKeys: [durum],
          }}
          trigger={['click']}
          placement="bottomLeft"
        >
          <button
            type="button"
            title="Tıkla → durum değiştir"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px 3px 11px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '0.01em',
              color: durumRenk.color,
              background: durumRenk.bg,
              border: `1px solid ${durumRenk.border}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
              transition: 'background 0.12s, border-color 0.12s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = durumRenk.color; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = durumRenk.border; }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: durumRenk.color, flexShrink: 0 }} />
            {DURUM_ETIKET[durum]}
            <CaretDownOutlined style={{ fontSize: 9, opacity: 0.7, marginLeft: 1 }} />
          </button>
        </Dropdown>
      </div>

      <div style={{ flex: 1 }} />

      {/* Sağ: Aksiyonlar */}
      <Space size={6} wrap>
        <Tooltip title="Satır ekle">
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
                <circle cx="5" cy="4" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
                <circle cx="5" cy="7" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
                <circle cx="5" cy="10" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
                <rect x="6.5" y="2" width="9" height="13" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.80" />
                <line x1="8.5" y1="5.2" x2="13.5" y2="5.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                <line x1="8.5" y1="7.6" x2="13.5" y2="7.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                <line x1="8.5" y1="10" x2="11.5" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
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

        <Tooltip title="Sayfayı yazıcıya gönder (durumu değiştirmez)" placement="bottom">
          <Button
            type="text"
            icon={<PrinterOutlined />}
            onClick={onYazdir}
            loading={uretiliyor}
          >
            Yazdır
          </Button>
        </Tooltip>
        <Tooltip title="PDF dosyası oluştur ve klasöre kaydet — durumu 'Hazır'a çeker" placement="bottom">
          <Button
            icon={<FilePdfOutlined />}
            onClick={onPdfIndir}
            loading={uretiliyor}
            className={buttonClassNames.secondary}
          >
            PDF
          </Button>
        </Tooltip>
        <Tooltip title="PDF üret + müşteriye e-posta taslağı aç — durumu 'Gönderildi'ye çeker" placement="bottom">
          <Button
            type="primary"
            icon={<MailOutlined />}
            onClick={onEMailGonder}
            loading={uretiliyor}
          >
            Gönder
          </Button>
        </Tooltip>
      </Space>
    </div>
  );
}
