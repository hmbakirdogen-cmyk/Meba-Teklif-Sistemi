/**
 * SyncStatusBar.tsx — Header'da bağlantı durumu gösteren chip.
 * Online-only mimaride sadece "Bağlı / Bağlı Değil / Bağlanıyor" görünümü;
 * eski queue/conflict göstergeleri kaldırıldı.
 *
 * Tıklayınca popover: son health check zamanı + "Yeniden Bağlan" butonu.
 */

import { useState } from 'react';
import { Popover, App as AntdApp, Button, Spin } from 'antd';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { syncEngine } from '../services/syncEngine';

const PALETTE = {
  online:     { bg: '#dcfce7', fg: '#166534', dot: '#16a34a', label: 'Bağlı' },
  offline:    { bg: '#fef2f2', fg: '#991b1b', dot: '#dc2626', label: 'Bağlı Değil' },
  connecting: { bg: '#fef9c3', fg: '#854d0e', dot: '#ca8a04', label: 'Bağlanıyor' },
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diffSec = Math.floor((Date.now() - t) / 1000);
  if (diffSec < 30) return 'şimdi';
  if (diffSec < 90) return '1 dk önce';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dk önce`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} sa önce`;
  return new Date(iso).toLocaleString('tr-TR');
}

export function SyncStatusBar() {
  const state = useOnlineStatus();
  const { message } = AntdApp.useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const palette = PALETTE[state.phase] || PALETTE.connecting;

  const handleReconnect = async () => {
    setLoading(true);
    try {
      const ok = await syncEngine.reconnect();
      if (ok) {
        message.success({ content: 'Bağlantı kuruldu', duration: 2 });
        setIsOpen(false);
      } else {
        message.error({ content: 'Server\'a ulaşılamadı', duration: 3 });
      }
    } finally {
      setLoading(false);
    }
  };

  const popoverContent = (
    <div style={{ minWidth: 220, fontSize: 12.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#64748b' }}>Durum:</span>
        <span style={{ fontWeight: 600 }}>{palette.label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#64748b' }}>Son kontrol:</span>
        <span style={{ fontWeight: 600 }}>{formatRelativeTime(state.lastHealthCheckAt)}</span>
      </div>
      {state.lastError && (
        <div style={{
          marginTop: 8,
          padding: 8,
          background: '#fef2f2',
          borderRadius: 6,
          color: '#991b1b',
          fontSize: 11,
        }}>
          {state.lastError}
        </div>
      )}
      <Button
        type="primary"
        size="small"
        block
        style={{ marginTop: 12 }}
        onClick={handleReconnect}
        disabled={loading}
      >
        {loading ? <Spin size="small" /> : 'Yeniden Bağlan'}
      </Button>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      title="Sunucu Bağlantısı"
      trigger="click"
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="bottomRight"
    >
      <button
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: palette.bg,
          color: palette.fg,
          border: 'none',
          borderRadius: 999,
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: 0.2,
        }}
        aria-label={`Sunucu durumu: ${palette.label}`}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: palette.dot,
            display: 'inline-block',
          }}
        />
        <span>{palette.label}</span>
      </button>
    </Popover>
  );
}
