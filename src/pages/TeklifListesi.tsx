import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Tag, Space, Popconfirm,
  message, Tooltip, Input
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EyeOutlined, EditOutlined,
  DeleteOutlined, CopyOutlined, FilePdfOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { teklifService } from '../services/teklifService';
import type { Teklif, TeklifDurum } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useKullanici } from '../context/KullaniciContext';

/* ─── Durum sistemi ─────────────────────────────────────── */
const DURUM_RENK: Record<TeklifDurum, string> = {
  taslak:     '#94a3b8',
  hazir:      '#3b82f6',
  gonderildi: '#f59e0b',
  onaylandi:  '#10b981',
  iptal:      '#ef4444',
};
const DURUM_BG: Record<TeklifDurum, string> = {
  taslak:     '#f1f5f9',
  hazir:      '#eff6ff',
  gonderildi: '#fffbeb',
  onaylandi:  '#ecfdf5',
  iptal:      '#fef2f2',
};
const DURUM_ETIKET: Record<TeklifDurum, string> = {
  taslak:     'Taslak',
  hazir:      'Hazır',
  gonderildi: 'Gönderildi',
  onaylandi:  'Onaylandı',
  iptal:      'İptal',
};

export default function TeklifListesi() {
  const navigate = useNavigate();
  const { aktifKullanici } = useKullanici();
  const [teklifler, setTeklifler] = useState<Teklif[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');

  function teklifleriYukle() {
    setTeklifler(teklifService.tumTeklifleriGetir());
  }

  useEffect(() => {
    teklifleriYukle();
  }, []);

  function teklifSil(id: string) {
    teklifService.teklifSil(id);
    teklifleriYukle();
    message.success('Teklif silindi.');
  }

  function teklifKopyala(id: string) {
    const kullaniciInfo = aktifKullanici
      ? { id: aktifKullanici.id, adSoyad: aktifKullanici.adSoyad, rol: aktifKullanici.rol }
      : undefined;
    const yeni = teklifService.teklifKopyala(id, kullaniciInfo);
    if (yeni) {
      teklifleriYukle();
      message.success(`Kopyalandı: ${yeni.teklifNo}`);
    }
  }

  const filtrelenmis = teklifler.filter((t) => {
    if (!aramaMetni) return true;
    const ara = aramaMetni.toLowerCase();
    return (
      t.teklifNo.toLowerCase().includes(ara) ||
      t.cari.firmaAdi.toLowerCase().includes(ara) ||
      t.cari.cariKod.toLowerCase().includes(ara)
    );
  });

  const columns: ColumnsType<Teklif> = [
    {
      title: 'Teklif No',
      dataIndex: 'teklifNo',
      key: 'teklifNo',
      width: 120,
      render: (val: string, rec: Teklif) => (
        <button
          onClick={() => navigate(`/teklif/${rec.id}/onizleme`)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#0f1f45',
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: 0.3,
            fontFamily: 'inherit',
          }}
        >
          {val}
        </button>
      ),
    },
    {
      title: 'Firma',
      key: 'firma',
      render: (_: unknown, rec: Teklif) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13, color: '#111827' }}>
            {rec.cari.firmaAdi}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1, letterSpacing: 0.2 }}>
            {rec.cari.cariKod}
          </div>
        </div>
      ),
    },
    {
      title: 'Tarih',
      dataIndex: 'tarih',
      key: 'tarih',
      width: 110,
      render: (val: string) => (
        <span style={{ fontSize: 12, color: '#6b7280' }}>{formatDate(val)}</span>
      ),
    },
    {
      title: 'Toplam',
      key: 'toplam',
      width: 150,
      align: 'right' as const,
      render: (_: unknown, rec: Teklif) => (
        <span
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: '#111827',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 0.2,
          }}
        >
          {formatCurrency(rec.genelToplam, rec.paraBirimi)}
        </span>
      ),
    },
    {
      title: 'Durum',
      dataIndex: 'durum',
      key: 'durum',
      width: 110,
      render: (val: TeklifDurum) => (
        <Tag
          style={{
            color: DURUM_RENK[val],
            background: DURUM_BG[val],
            border: `1px solid ${DURUM_RENK[val]}33`,
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
            padding: '1px 8px',
            lineHeight: '20px',
          }}
        >
          {DURUM_ETIKET[val]}
        </Tag>
      ),
    },
    {
      title: 'Hazırlayan',
      key: 'hazirlayan',
      width: 160,
      render: (_: unknown, rec: Teklif) => {
        const isim = rec.hazirlayanAdSoyad;
        const isAdmin = rec.hazirlayanRol === 'admin';
        if (!isim) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>;
        const initials = isim.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isAdmin
                  ? 'rgba(96,165,250,0.14)'
                  : 'rgba(59,130,246,0.1)',
                border: `1px solid ${
                  isAdmin ? 'rgba(96,165,250,0.45)' : 'rgba(59,130,246,0.35)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: isAdmin ? '#3b82f6' : '#1d4ed8',
                flexShrink: 0,
                fontFamily: '"Arial", sans-serif',
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', lineHeight: 1.3 }}>
                {isim}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: '',
      key: 'islemler',
      width: 160,
      render: (_: unknown, rec: Teklif) => (
        <Space size={2}>
          <Tooltip title="Önizle">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/teklif/${rec.id}/onizleme`)}
              style={{ color: '#6b7280' }}
            />
          </Tooltip>
          <Tooltip title="Düzenle">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/teklif/${rec.id}`)}
              style={{ color: '#6b7280' }}
            />
          </Tooltip>
          <Tooltip title="PDF İndir">
            <Button
              type="text"
              size="small"
              icon={<FilePdfOutlined />}
              onClick={() => navigate(`/teklif/${rec.id}/onizleme`)}
              style={{ color: '#6b7280' }}
            />
          </Tooltip>
          <Tooltip title="Kopyala">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => teklifKopyala(rec.id)}
              style={{ color: '#6b7280' }}
            />
          </Tooltip>
          <Tooltip title="Sil">
            <Popconfirm
              title="Teklif silinecek"
              description="Bu işlem geri alınamaz. Emin misiniz?"
              onConfirm={() => teklifSil(rec.id)}
              okText="Sil"
              cancelText="İptal"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '32px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── BAŞLIK SATIRI ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f1f45', letterSpacing: -0.3 }}>
            Teklif Arşivi
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {filtrelenmis.length} teklif listeleniyor
          </div>
        </div>

        <Space size={8}>
          <Input
            placeholder="Teklif no veya firma ara..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            allowClear
            style={{ width: 240, borderRadius: 6 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/teklif/yeni')}
            style={{
              background: '#0f1f45',
              borderColor: '#0f1f45',
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            Yeni Teklif
          </Button>
        </Space>
      </div>

      {/* ── TABLO ─────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #f1f5f9',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <Table
          dataSource={filtrelenmis}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={{
            pageSize: 15,
            showSizeChanger: false,
            style: { padding: '12px 16px' },
          }}
          locale={{ emptyText: 'Henüz teklif yok. İlk teklifinizi oluşturun.' }}
          onRow={(_) => ({
            style: { cursor: 'default' },
            onMouseEnter: (e) => {
              (e.currentTarget as HTMLElement).style.background = '#f8faff';
            },
            onMouseLeave: (e) => {
              (e.currentTarget as HTMLElement).style.background = '';
            },
          })}
          style={{ borderRadius: 0 }}
        />
      </div>
    </div>
  );
}
