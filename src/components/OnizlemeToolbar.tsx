import { Button, Space } from 'antd';
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { Teklif } from '../types';
import { buttonClassNames } from '../styles/buttonStyles';
import { formatCariAdi } from '../utils/formatters';
import { useColors } from '../hooks/useColors';

interface OnizlemeToolbarProps {
  teklif: Teklif;
  isMobile: boolean;
  isDark: boolean;
  uretiliyor: boolean;
  pdfBlob: Blob | null;
  onDuzenle: () => void;
  onKaydet: () => void;
  onYenile: () => void;
  onYazdir: () => void;
  onPdfIndir: () => void;
}

export default function OnizlemeToolbar({
  teklif,
  isMobile,
  isDark,
  uretiliyor,
  pdfBlob,
  onDuzenle,
  onKaydet,
  onYenile,
  onYazdir,
  onPdfIndir,
}: OnizlemeToolbarProps) {
  const C = useColors();

  return (
    <div
      className="no-print"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 200,
        background: isDark ? 'rgba(17,21,31,0.94)' : 'rgba(248,250,252,0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? '10px 12px' : '12px 28px',
        minHeight: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isMobile ? 10 : 14,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.28)' : '0 8px 24px rgba(15,23,42,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          size="small"
          className={buttonClassNames.secondarySmall}
          onClick={onDuzenle}
        >
          Düzenle
        </Button>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            borderLeft: `1px solid ${C.border}`,
            paddingLeft: 12,
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: 11, color: C.textSecondary, letterSpacing: 0.5, fontVariantNumeric: 'tabular-nums' }}>
            {teklif.teklifNo}
          </span>
          <span style={{ color: C.textPrimary, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatCariAdi(teklif.cari.firmaAdi)}
          </span>
        </div>
      </div>

      <Space size={6} wrap style={{ justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
        <Button
          size="small"
          icon={<SaveOutlined />}
          className={buttonClassNames.secondarySmall}
          onClick={onKaydet}
        >
          Kaydet
        </Button>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          className={buttonClassNames.ghostSmall}
          loading={uretiliyor}
          onClick={onYenile}
        >
          Yenile
        </Button>
        <Button
          size="small"
          icon={<PrinterOutlined />}
          onClick={onYazdir}
          className={buttonClassNames.ghostSmall}
        >
          Yazdır
        </Button>
        <Button
          type="primary"
          size="small"
          icon={<FilePdfOutlined />}
          className={buttonClassNames.primarySmall}
          loading={uretiliyor && !pdfBlob}
          disabled={!pdfBlob}
          onClick={onPdfIndir}
          style={{ background: '#0f1f45', borderColor: '#0f1f45' }}
        >
          PDF İndir
        </Button>
      </Space>
    </div>
  );
}
