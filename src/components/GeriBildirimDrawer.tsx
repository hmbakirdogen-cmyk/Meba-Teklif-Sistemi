/**
 * GeriBildirimDrawer
 * ─────────────────────────────────────────────────────────────────
 * Kullanıcı → Süper Admin mesaj kanalı.
 * Rol'e göre içerik:
 *   - Normal kullanıcı: form + "Önceki Bildirimlerim" listesi (admin cevabı dahil)
 *   - Süper admin: tüm bildirimleri yönet (okundu / cevap yaz / sil)
 */
import { useEffect, useMemo, useState } from 'react';
import {
  App, Drawer, Segmented, Input, Button, Tag, Empty, Spin, Popconfirm, Space,
} from 'antd';
import {
  SendOutlined, CheckOutlined, DeleteOutlined, MessageOutlined,
  BugOutlined, BulbOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../services/apiClient';
import type { GeriBildirim, GeriBildirimTur } from '../services/apiClient';
import { useKullanici } from '../context/useKullanici';
import { isSuperAdmin } from '../utils/yetkiUtils';

interface Props {
  open: boolean;
  onClose: () => void;
  initialSayfa: string;
}

const TUR_OPSIYONLARI = [
  { label: <span><BugOutlined /> Hata</span>, value: 'hata' },
  { label: <span><BulbOutlined /> Öneri</span>, value: 'oneri' },
  { label: <span><MessageOutlined /> Mesaj</span>, value: 'mesaj' },
];

const TUR_ETIKET: Record<GeriBildirimTur, { color: string; label: string }> = {
  hata:  { color: 'red',    label: 'Hata' },
  oneri: { color: 'gold',   label: 'Öneri' },
  mesaj: { color: 'blue',   label: 'Mesaj' },
};

function formatTarih(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return '';
  return d.format('DD.MM.YYYY HH:mm');
}

export default function GeriBildirimDrawer({ open, onClose, initialSayfa }: Props) {
  const { message } = App.useApp();
  const { aktifKullanici } = useKullanici();
  const adminMi = isSuperAdmin(aktifKullanici?.rol);

  const [yukleniyor, setYukleniyor] = useState(false);
  const [bildirimler, setBildirimler] = useState<GeriBildirim[]>([]);

  // Form state (normal kullanıcı)
  const [tur, setTur] = useState<GeriBildirimTur>('hata');
  const [mesaj, setMesaj] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // Cevap state (admin) — id → cevap text
  const [cevapTaslak, setCevapTaslak] = useState<Record<string, string>>({});

  const refreshList = async () => {
    setYukleniyor(true);
    try {
      const data = await api.geriBildirimler.list();
      setBildirimler(data);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Bildirimler alınamadı');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sortedAdmin = useMemo(() => {
    if (!adminMi) return [] as GeriBildirim[];
    // Okunmamışlar üstte, sonra tarih (yeniden eskiye)
    return [...bildirimler].sort((a, b) => {
      if (a.okundu !== b.okundu) return a.okundu ? 1 : -1;
      return dayjs(b.tarih).valueOf() - dayjs(a.tarih).valueOf();
    });
  }, [bildirimler, adminMi]);

  const sortedKullanici = useMemo(() => {
    if (adminMi) return [] as GeriBildirim[];
    return [...bildirimler].sort((a, b) => dayjs(b.tarih).valueOf() - dayjs(a.tarih).valueOf());
  }, [bildirimler, adminMi]);

  async function handleGonder() {
    const text = mesaj.trim();
    if (!text) {
      message.warning('Lütfen mesaj alanını doldurunuz.');
      return;
    }
    setGonderiliyor(true);
    try {
      await api.geriBildirimler.create({ mesaj: text, tur, sayfa: initialSayfa });
      message.success('Bildiriminiz tarafımıza ulaştı. Teşekkür ederiz.');
      setMesaj('');
      setTur('hata');
      void refreshList();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Bildiriminiz gönderilemedi.');
    } finally {
      setGonderiliyor(false);
    }
  }

  async function handleOkundu(id: string) {
    try {
      const guncel = await api.geriBildirimler.update(id, { okundu: true });
      setBildirimler((prev) => prev.map((g) => (g.id === id ? guncel : g)));
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Güncellenemedi');
    }
  }

  async function handleCevapKaydet(id: string) {
    const cevap = (cevapTaslak[id] || '').trim();
    if (!cevap) {
      message.warning('Lütfen cevap alanını doldurunuz.');
      return;
    }
    try {
      const guncel = await api.geriBildirimler.update(id, { cevap, okundu: true });
      setBildirimler((prev) => prev.map((g) => (g.id === id ? guncel : g)));
      setCevapTaslak((prev) => { const n = { ...prev }; delete n[id]; return n; });
      message.success('Cevabınız başarıyla iletildi.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Cevap kaydedilemedi.');
    }
  }

  async function handleSil(id: string) {
    try {
      await api.geriBildirimler.sil(id);
      setBildirimler((prev) => prev.filter((g) => g.id !== id));
      message.success('Bildirim başarıyla silindi.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Bildirim silinemedi.');
    }
  }

  return (
    <Drawer
      title={adminMi ? 'Geri Bildirimler — Yönetim' : 'Geri Bildirim'}
      placement="right"
      onClose={onClose}
      open={open}
      size={460}
      styles={{ body: { padding: 16 } }}
    >
      {!adminMi && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Yeni Bildirim</div>
          <Segmented
            block
            options={TUR_OPSIYONLARI}
            value={tur}
            onChange={(v) => setTur(v as GeriBildirimTur)}
            style={{ marginBottom: 10 }}
          />
          <Input.TextArea
            rows={4}
            value={mesaj}
            onChange={(e) => setMesaj(e.target.value)}
            placeholder="Sorunu veya önerinizi detaylıca yazın..."
            maxLength={1000}
            showCount
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            block
            loading={gonderiliyor}
            onClick={handleGonder}
            style={{ marginTop: 10 }}
          >
            Gönder
          </Button>
        </div>
      )}

      {/* Liste */}
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: adminMi ? 0 : 24, marginBottom: 8 }}>
        {adminMi ? 'Tüm Bildirimler' : 'Önceki Bildirimlerim'}
      </div>

      {yukleniyor ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : (adminMi ? sortedAdmin : sortedKullanici).length === 0 ? (
        <Empty description="Bildirim yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(adminMi ? sortedAdmin : sortedKullanici).map((g) => {
            const tEtiket = TUR_ETIKET[g.tur];
            const cevapDuzenleAcik = cevapTaslak[g.id] !== undefined;
            return (
              <div
                key={g.id}
                className="gb-kart"
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  background: !g.okundu && adminMi ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-surface)',
                  borderLeftWidth: !g.okundu && adminMi ? 3 : 1,
                  borderLeftColor: !g.okundu && adminMi ? '#2563eb' : 'var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Space size={6}>
                    <Tag color={tEtiket.color}>{tEtiket.label}</Tag>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{g.sayfa}</span>
                  </Space>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{formatTarih(g.tarih)}</span>
                </div>
                {adminMi && (
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    {g.gonderen.adSoyad}
                  </div>
                )}
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginBottom: 6 }}>
                  {g.mesaj}
                </div>

                {/* Admin'in yazdığı cevap — herkese görünür */}
                {g.cevap && (
                  <div className="gb-cevap-card" style={{ marginTop: 8, padding: 8, borderRadius: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2, opacity: 0.85 }}>
                      Yönetici Cevabı{g.cevapTarihi ? ` · ${formatTarih(g.cevapTarihi)}` : ''}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{g.cevap}</div>
                  </div>
                )}

                {adminMi && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {!g.okundu && (
                      <Button size="small" icon={<CheckOutlined />} onClick={() => handleOkundu(g.id)}>
                        Okundu
                      </Button>
                    )}
                    <Button
                      size="small"
                      icon={<MessageOutlined />}
                      onClick={() => setCevapTaslak((p) => ({ ...p, [g.id]: g.cevap ?? '' }))}
                    >
                      {g.cevap ? 'Cevabı Düzenle' : 'Cevap Yaz'}
                    </Button>
                    <Popconfirm
                      title="Bildirimi silmek istediğinize emin misiniz?"
                      okText="Evet, sil"
                      cancelText="Vazgeç"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleSil(g.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />}>
                        Sil
                      </Button>
                    </Popconfirm>
                  </div>
                )}

                {adminMi && cevapDuzenleAcik && (
                  <div style={{ marginTop: 8 }}>
                    <Input.TextArea
                      rows={3}
                      value={cevapTaslak[g.id] ?? ''}
                      onChange={(e) => setCevapTaslak((p) => ({ ...p, [g.id]: e.target.value }))}
                      placeholder="Cevabınızı yazın..."
                    />
                    <Space style={{ marginTop: 6 }}>
                      <Button size="small" type="primary" onClick={() => handleCevapKaydet(g.id)}>
                        Kaydet
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setCevapTaslak((p) => { const n = { ...p }; delete n[g.id]; return n; })}
                      >
                        İptal
                      </Button>
                    </Space>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
