/**
 * BildirimPaneli.tsx
 * Navbar zilinden açılan kompakt premium dropdown içeriği.
 * Antd Popover content slot'una konur.
 *
 * Davranış:
 *   • Açıldığında listeyi tazele (refreshList).
 *   • Okunmamış üstte, sonra tarih DESC.
 *   • İlgili atandı → /teklif/{teklifId}
 *   • Geri bildirim cevap → onGeriBildirimAc() callback'i (üst seviye drawer açar)
 *   • Tıklanan bildirim okundu işaretlenir.
 *   • Tümünü okundu işaretle aksiyonu.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Spin, App } from 'antd';
import { CheckOutlined, ArrowRightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { bildirimService } from '../services/bildirimService';
import { formatAdSoyad } from '../utils/formatters';
import type { Bildirim } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Liste tazelendiğinde üst seviye polling state'i eşitle (badge sayacı). */
  onListeDegisti?: (liste: Bildirim[]) => void;
  /** geri_bildirim_cevap türü tıklanınca → admin geri bildirim drawer'ı aç */
  onGeriBildirimAc?: (geriBildirimId?: string) => void;
}

function formatTarih(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return '';
  const bugun = dayjs();
  if (d.isSame(bugun, 'day')) return d.format('HH:mm');
  if (d.isSame(bugun.subtract(1, 'day'), 'day')) return 'Dün ' + d.format('HH:mm');
  return d.format('DD.MM.YYYY');
}

export default function BildirimPaneli({
  open, onClose, onListeDegisti, onGeriBildirimAc,
}: Props) {
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

  async function markRead(b: Bildirim) {
    if (b.okundu) return b;
    try {
      const guncel = await bildirimService.bildirimOkundu(b.id);
      setListe((prev) => {
        const next = prev.map((x) => (x.id === b.id ? guncel : x));
        onListeDegisti?.(next);
        return next;
      });
      return guncel;
    } catch {
      return b;
    }
  }

  async function handleTikla(b: Bildirim) {
    await markRead(b);
    onClose();
    if (b.tur === 'geri_bildirim_cevap') {
      onGeriBildirimAc?.(b.geriBildirimId);
      return;
    }
    if (b.teklifId) {
      navigate(`/teklif/${b.teklifId}`);
    }
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
    <div className="bildirim-paneli">
      <div className="bildirim-paneli-header">
        <div>
          <div className="bildirim-paneli-title">Bildirimler</div>
          {sirali.length > 0 && (
            <div className="bildirim-paneli-meta">
              {sirali.filter((b) => !b.okundu).length} okunmamış · {sirali.length} toplam
            </div>
          )}
        </div>
        {okunmamisVar && (
          <Button
            size="small"
            type="text"
            icon={<CheckOutlined />}
            onClick={() => void handleTumunuOkundu()}
            className="bildirim-paneli-tumunu"
          >
            Tümünü okundu
          </Button>
        )}
      </div>

      <div className="bildirim-paneli-body">
        {yukleniyor ? (
          <div className="bildirim-paneli-loading">
            <Spin size="small" />
          </div>
        ) : sirali.length === 0 ? (
          <div className="bildirim-paneli-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ fontSize: 12 }}>Bildirim yok</span>}
            />
          </div>
        ) : (
          <ul className="bildirim-paneli-liste">
            {sirali.map((b) => (
              <BildirimSatiri key={b.id} b={b} onClick={() => void handleTikla(b)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface SatirProps {
  b: Bildirim;
  onClick: () => void;
}

function BildirimSatiri({ b, onClick }: SatirProps) {
  const cevapMi = b.tur === 'geri_bildirim_cevap';
  const baslik = cevapMi
    ? 'Yönetici geri bildiriminize cevap verdi'
    : 'Yeni teklif size atandı';
  const detay = cevapMi
    ? (b.ozet || 'Cevap görüntülemek için tıkla.')
    : `${b.cariAdi || '—'} · ${b.teklifNo || ''}`.trim();
  return (
    <li
      onClick={onClick}
      className={`bildirim-satiri${b.okundu ? '' : ' is-yeni'}`}
    >
      <span className={`bildirim-satiri-tag bildirim-satiri-tag--${cevapMi ? 'cevap' : 'atama'}`}>
        {cevapMi ? 'Cevap' : 'Atama'}
      </span>
      <div className="bildirim-satiri-icerik">
        <div className="bildirim-satiri-baslik">{baslik}</div>
        <div className="bildirim-satiri-detay" title={detay}>{detay}</div>
        <div className="bildirim-satiri-meta">
          <span>{formatAdSoyad(b.kaynakKullaniciAdSoyad) || 'Sistem'}</span>
          <span>·</span>
          <span>{formatTarih(b.tarih)}</span>
        </div>
      </div>
      <ArrowRightOutlined className="bildirim-satiri-ok" />
    </li>
  );
}
