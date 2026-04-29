/**
 * CakismaCozumDialog.tsx — Çakışma çözüm modal'ı (admin için).
 *
 * Server'daki kayıt vs Client'ın yerel kaydı yan yana JSON görünür;
 * admin "Server'ı Kabul Et" / "Benimkini Tut" / "Manuel Düzenle" seçer.
 */

import { useState, useMemo } from 'react';
import { Modal, Button, Tabs, App as AntdApp } from 'antd';
import { syncEngine } from '../services/syncEngine';

interface Props {
  open: boolean;
  onClose: () => void;
}

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function CakismaCozumDialog({ open, onClose }: Props) {
  const { message, modal } = AntdApp.useApp();
  const [refreshKey, setRefreshKey] = useState(0);
  const conflicts = useMemo(
    () => syncEngine.getConflicts(),
    // refresh trigger'ları: dialog açılma + manual refresh sayacı
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, open],
  );
  const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
  const [manualText, setManualText] = useState('');

  const activeIdx = conflicts.findIndex(
    (c) => `${c.collection}:${c.id}` === activeKey,
  );
  const active = activeIdx >= 0 ? conflicts[activeIdx] : conflicts[0];

  const localKey = active ? `meba_conflict_local_${active.id}` : '';
  const localPayload = (() => {
    if (!localKey) return null;
    try {
      const raw = localStorage.getItem(localKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  if (!open) return null;

  if (conflicts.length === 0) {
    return (
      <Modal
        title="Çakışma Çözümü"
        open={open}
        onCancel={onClose}
        footer={[<Button key="ok" onClick={onClose}>Kapat</Button>]}
      >
        <p>Hiç çakışma yok. ✅</p>
      </Modal>
    );
  }

  const resolveAndAdvance = (choice: 'server' | 'client' | 'manual') => {
    if (!active) return;
    if (choice === 'manual') {
      try {
        const parsed = JSON.parse(manualText);
        syncEngine.resolveConflict(active.collection as never, active.id, 'manual', parsed);
        message.success('Manuel çözüm uygulandı');
      } catch {
        message.error('JSON parse hatası — geçerli JSON girin.');
        return;
      }
    } else {
      syncEngine.resolveConflict(active.collection as never, active.id, choice);
      message.success(choice === 'server' ? 'Server kaydı kabul edildi' : 'Yerel kayıt push edildi');
    }
    setManualText('');
    setRefreshKey((k) => k + 1);
  };

  const handleClientChoice = () => {
    modal.confirm({
      title: 'Yerel kaydı zorla gönder?',
      content: 'Server kaydının üzerine yazılır. Geri alınamaz.',
      okText: 'Gönder',
      cancelText: 'İptal',
      onOk: () => resolveAndAdvance('client'),
    });
  };

  return (
    <Modal
      title={`Çakışma Çözümü (${conflicts.length})`}
      open={open}
      onCancel={onClose}
      width={780}
      footer={null}
    >
      <Tabs
        activeKey={active ? `${active.collection}:${active.id}` : undefined}
        onChange={setActiveKey}
        items={conflicts.map((c) => ({
          key: `${c.collection}:${c.id}`,
          label: `${c.collection} / ${c.id.slice(0, 8)}`,
        }))}
      />
      {active && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <h4 style={{ margin: '4px 0 6px', fontSize: 13 }}>Server (mevcut)</h4>
            <pre style={{ background: '#f8fafc', padding: 10, borderRadius: 6, fontSize: 11, maxHeight: 320, overflow: 'auto' }}>
              {pretty(active.existing)}
            </pre>
          </div>
          <div>
            <h4 style={{ margin: '4px 0 6px', fontSize: 13 }}>Sizin (yerel)</h4>
            <pre style={{ background: '#fff7ed', padding: 10, borderRadius: 6, fontSize: 11, maxHeight: 320, overflow: 'auto' }}>
              {pretty(localPayload)}
            </pre>
          </div>
        </div>
      )}

      {active && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 12, color: '#475569' }}>Manuel Birleştirme (JSON)</h4>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={pretty(active.existing)}
            style={{
              width: '100%',
              minHeight: 100,
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11,
              padding: 8,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <Button onClick={() => resolveAndAdvance('server')}>Server'ı Kabul Et</Button>
            <Button onClick={handleClientChoice} type="default" danger>
              Benimkini Zorla Gönder
            </Button>
            <Button
              type="primary"
              onClick={() => resolveAndAdvance('manual')}
              disabled={!manualText.trim()}
            >
              Manuel Düzenlemeyi Uygula
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default CakismaCozumDialog;
