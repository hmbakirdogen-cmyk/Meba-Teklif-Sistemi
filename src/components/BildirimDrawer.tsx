import { useEffect, useMemo, useState } from 'react';
import { Drawer, Button, Empty, Spin, App, Tag } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { bildirimService } from '../services/bildirimService';
import { formatAdSoyad } from '../utils/formatters';
import type { Bildirim } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Liste tazelendikten sonra üst seviye polling state'in eşitlenmesi
   *  için callback (header'daki badge sayacı vs.). */
  onListeDegisti?: (liste: Bildirim[]) => void;
}

function formatTarih(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return '';
  const bugun = dayjs();
  if (d.isSame(bugun, 'day')) return d.format('HH:mm');
  if (d.isSame(bugun.subtract(1, 'day'), 'day')) return 'Dün ' + d.format('HH:mm');
  return d.format('DD.MM.YYYY HH:mm');
}

export default function BildirimDrawer({ open, onClose, onListeDegisti }: Props) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [liste, setListe] = useState<Bildirim[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function refreshList() {
    setYukleniyor(true);
    try {
      const data = await bildirimService.bildirimlerGetir();
      setListe(data);
      onListeDegisti?.(data);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Bildirimler alınamadı');
    } finally {
      setYukleniyor(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sirali = useMemo(
    () =>
      [...liste].sort((a, b) => {
        if (a.okundu !== b.okundu) return a.okundu ? 1 : -1;
        return dayjs(b.tarih).valueOf() - dayjs(a.tarih).valueOf();
      }),
    [liste],
  );

  async function handleTikla(b: Bildirim) {
    if (!b.okundu) {
      try {
        const guncel = await bildirimService.bildirimOkundu(b.id);
        setListe((prev) => {
          const next = prev.map((x) => (x.id === b.id ? guncel : x));
          onListeDegisti?.(next);
          return next;
        });
      } catch { /* sessiz */ }
    }
    onClose();
    navigate(`/teklif/${b.teklifId}`);
  }

  async function handleTumunuOkundu() {
    try {
      await bildirimService.tumunuOkunduYap();
      setListe((prev) => {
        const next = prev.map((b) => ({ ...b, okundu: true }));
        onListeDegisti?.(next);
        return next;
      });
      message.success('Tüm bildirimler okundu işaretlendi');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'İşlem başarısız');
    }
  }

  const okunmamisVar = sirali.some((b) => !b.okundu);

  return (
    <Drawer
      title="Bildirimler"
      placement="right"
      onClose={onClose}
      open={open}
      width={420}
      extra={
        okunmamisVar ? (
          <Button size="small" icon={<CheckOutlined />} onClick={() => void handleTumunuOkundu()}>
            Tümünü okundu işaretle
          </Button>
        ) : null
      }
    >
      {yukleniyor ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Spin />
        </div>
      ) : sirali.length === 0 ? (
        <Empty description="Bildirim yok" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sirali.map((b) => (
            <div
              key={b.id}
              onClick={() => void handleTikla(b)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${b.okundu ? '#e2e8f0' : '#bfdbfe'}`,
                background: b.okundu ? '#fafafa' : '#eff6ff',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{
                fontSize: 13,
                fontWeight: b.okundu ? 400 : 600,
                color: b.okundu ? '#64748b' : '#0f172a',
                lineHeight: 1.4,
              }}>
                <strong>{formatAdSoyad(b.kaynakKullaniciAdSoyad)}</strong>
                {' seni '}
                <Tag color="blue" style={{ marginInline: 2 }}>{b.teklifNo}</Tag>
                {b.cariAdi ? ` (${b.cariAdi}) ` : ' '}
                teklifine ilgili kişi olarak atadı
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {formatTarih(b.tarih)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
