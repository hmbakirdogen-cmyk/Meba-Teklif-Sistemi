/**
 * SyncStatusBar.tsx — Header'da sync durumu gösteren chip.
 * Tıklayınca popover ile detay + manuel senkronize tetik.
 */

import { useState } from 'react';
import { Popover, App as AntdApp, Button, Spin, Badge } from 'antd';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { syncEngine } from '../services/syncEngine';
import { useKullanici } from '../context/useKullanici';
import CakismaCozumDialog from './CakismaCozumDialog';

const PALETTE = {
  online:    { bg: '#dcfce7', fg: '#166534', dot: '#16a34a', label: 'Bağlı' },
  syncing:   { bg: '#dbeafe', fg: '#1e3a8a', dot: '#2563eb', label: 'Senkronize ediliyor' },
  offline:   { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8', label: 'Çevrimdışı' },
  conflict:  { bg: '#fff7ed', fg: '#9a3412', dot: '#ea580c', label: 'Çakışma' },
  connecting:{ bg: '#fef9c3', fg: '#854d0e', dot: '#ca8a04', label: 'Bağlanıyor' },
  idle:      { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8', label: 'Hazır' },
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
  const { aktifKullanici } = useKullanici();
  const { message } = AntdApp.useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const isAdminLike =
    aktifKullanici?.rol === 'admin'
    || aktifKullanici?.rol === 'super_admin'
    || aktifKullanici?.rol === 'firma_admin';

  const palette = PALETTE[state.phase] || PALETTE.idle;

  const handleSyncNow = async () => {
    setIsOpen(false);
    void message.loading({ content: 'Senkronize ediliyor...', key: 'sync', duration: 0 });
    try {
      await syncEngine.syncNow(
        aktifKullanici ? { id: aktifKullanici.id, rol: aktifKullanici.rol } : undefined,
      );
      message.success({ content: 'Senkronize edildi', key: 'sync', duration: 2 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hata';
      message.error({ content: `Senkron hatası: ${msg}`, key: 'sync', duration: 3 });
    }
  };

  const popoverContent = (
    <div style={{ minWidth: 240, fontSize: 12.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#64748b' }}>Son alış (pull):</span>
        <span style={{ fontWeight: 600 }}>{formatRelativeTime(state.lastPullAt)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#64748b' }}>Son gönderim (push):</span>
        <span style={{ fontWeight: 600 }}>{formatRelativeTime(state.lastPushAt)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#64748b' }}>Senkron bekleyen:</span>
        <span style={{ fontWeight: 600 }}>{state.queueLength} kayıt</span>
      </div>
      {state.conflictCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#9a3412' }}>Çakışma:</span>
          <span style={{ fontWeight: 700, color: '#9a3412' }}>{state.conflictCount}</span>
        </div>
      )}
      {state.lastError && (
        <div style={{ marginTop: 8, padding: 8, background: '#fef2f2', borderRadius: 6, color: '#991b1b', fontSize: 11 }}>
          {state.lastError}
        </div>
      )}
      {state.storageQuotaExceeded && (
        <div style={{
          marginTop: 8, padding: 8,
          background: '#fff7ed', borderRadius: 6,
          color: '#9a3412', fontSize: 11,
          border: '1px solid #fdba74',
        }}>
          ⚠️ Yerel depolama dolu. Yeni kayıtlar geçici olarak kaydedilemiyor.
          Uzun süredir senkronize olunmadıysa biriken kuyruk olabilir; bu
          mesaj kaybolmazsa tarayıcıda <strong>localStorage</strong>'ı
          temizlemeniz gerekebilir (sayfayı yenilemeden önce yöneticinize
          danışın — bekleyen kayıtlar kaybolabilir).
        </div>
      )}
      <Button
        type="primary"
        size="small"
        block
        style={{ marginTop: 12 }}
        onClick={handleSyncNow}
        disabled={state.phase === 'syncing'}
      >
        {state.phase === 'syncing' ? <Spin size="small" /> : 'Şimdi Senkronize Et'}
      </Button>
      {isAdminLike && state.conflictCount > 0 && (
        <Button
          size="small"
          block
          danger
          style={{ marginTop: 6 }}
          onClick={() => { setIsOpen(false); setConflictModalOpen(true); }}
        >
          Çakışmaları Görüntüle ({state.conflictCount})
        </Button>
      )}
    </div>
  );

  return (
    <>
    <Popover
      content={popoverContent}
      title="Senkronizasyon Durumu"
      trigger="click"
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="bottomRight"
    >
      <Badge count={state.queueLength} size="small" offset={[-4, 4]}>
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
          aria-label={`Sync durumu: ${palette.label}`}
        >
          {state.phase === 'syncing' ? (
            <Spin size="small" />
          ) : (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: palette.dot,
                display: 'inline-block',
              }}
            />
          )}
          <span>{palette.label}</span>
        </button>
      </Badge>
    </Popover>
    {isAdminLike && (
      <CakismaCozumDialog
        open={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
      />
    )}
    </>
  );
}
