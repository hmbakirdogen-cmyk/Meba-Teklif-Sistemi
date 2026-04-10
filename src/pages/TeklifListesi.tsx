import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Popconfirm, message, Tooltip, Input } from 'antd';
import {
  PlusOutlined, EyeOutlined, EditOutlined,
  DeleteOutlined, CopyOutlined, FilePdfOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { teklifService } from '../services/teklifService';
import type { Teklif, TeklifDurum } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useKullanici } from '../context/KullaniciContext';

/* ── Durum rozet konfigürasyonu ─────────────────────────── */
const DURUM_CFG: Record<TeklifDurum, { label: string; color: string; bg: string; border: string }> = {
  taslak:     { label: 'Taslak',     color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  hazir:      { label: 'Hazır',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  gonderildi: { label: 'Gönderildi', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  onaylandi:  { label: 'Onaylandı',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  iptal:      { label: 'İptal',      color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

/* ── Personel renk paleti — hash bazlı, deterministik ───── */
interface PersonelRenk {
  accent: string;
  avatarBg: string;
  avatarBorder: string;
  avatarText: string;
}
const PALET: PersonelRenk[] = [
  { accent: '#7c3aed', avatarBg: 'rgba(124,58,237,0.12)',  avatarBorder: 'rgba(124,58,237,0.40)',  avatarText: '#7c3aed' },
  { accent: '#0891b2', avatarBg: 'rgba(8,145,178,0.12)',   avatarBorder: 'rgba(8,145,178,0.40)',   avatarText: '#0891b2' },
  { accent: '#b45309', avatarBg: 'rgba(180,83,9,0.12)',    avatarBorder: 'rgba(180,83,9,0.40)',    avatarText: '#b45309' },
  { accent: '#be185d', avatarBg: 'rgba(190,24,93,0.12)',   avatarBorder: 'rgba(190,24,93,0.40)',   avatarText: '#be185d' },
  { accent: '#15803d', avatarBg: 'rgba(21,128,61,0.12)',   avatarBorder: 'rgba(21,128,61,0.40)',   avatarText: '#15803d' },
  { accent: '#b91c1c', avatarBg: 'rgba(185,28,28,0.12)',   avatarBorder: 'rgba(185,28,28,0.40)',   avatarText: '#b91c1c' },
];

function personelRenk(isim: string): PersonelRenk {
  let h = 0;
  for (let i = 0; i < isim.length; i++) h = (h * 31 + isim.charCodeAt(i)) & 0xffffffff;
  return PALET[Math.abs(h) % PALET.length];
}

function initials(isim: string): string {
  return isim.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

type Filtre = 'benim' | 'tumu' | 'digerleri';

/* ── Ana bileşen ────────────────────────────────────────── */
export default function TeklifListesi() {
  const navigate = useNavigate();
  const { aktifKullanici } = useKullanici();
  const [teklifler, setTeklifler] = useState<Teklif[]>(() => teklifService.tumTeklifleriGetir());
  const [aramaMetni, setAramaMetni]   = useState('');
  const [aktifFiltre, setAktifFiltre] = useState<Filtre>('benim');

  const benimId = aktifKullanici?.id;

  function teklifleriYukle() { setTeklifler(teklifService.tumTeklifleriGetir()); }

  function teklifSil(id: string) {
    teklifService.teklifSil(id);
    teklifleriYukle();
    message.success('Teklif silindi.');
  }

  function teklifKopyala(id: string) {
    const ki = aktifKullanici
      ? { id: aktifKullanici.id, adSoyad: aktifKullanici.adSoyad, rol: aktifKullanici.rol }
      : undefined;
    const yeni = teklifService.teklifKopyala(id, ki);
    if (yeni) { teklifleriYukle(); message.success(`Kopyalandı: ${yeni.teklifNo}`); }
  }

  const benimSayisi   = useMemo(() => teklifler.filter(t => t.hazirlayanKullaniciId === benimId).length, [teklifler, benimId]);
  const digerSayisi   = useMemo(() => teklifler.filter(t => t.hazirlayanKullaniciId !== benimId).length, [teklifler, benimId]);

  const filtrelenmis = useMemo(() => {
    let liste = teklifler;
    if (aktifFiltre === 'benim')      liste = liste.filter(t => t.hazirlayanKullaniciId === benimId);
    else if (aktifFiltre === 'digerleri') liste = liste.filter(t => t.hazirlayanKullaniciId !== benimId);
    if (aramaMetni) {
      const q = aramaMetni.toLowerCase();
      liste = liste.filter(t =>
        t.teklifNo.toLowerCase().includes(q) ||
        t.cari.firmaAdi.toLowerCase().includes(q) ||
        (t.hazirlayanAdSoyad?.toLowerCase().includes(q) ?? false),
      );
    }
    return liste;
  }, [teklifler, aktifFiltre, aramaMetni, benimId]);

  const SEKMELER: { key: Filtre; label: string; count: number }[] = [
    { key: 'benim',     label: 'Benim Tekliflerim',             count: benimSayisi },
    { key: 'tumu',      label: 'Tüm Teklifler',                 count: teklifler.length },
    { key: 'digerleri', label: "Diğer Personellerin Teklifleri", count: digerSayisi },
  ];

  return (
    <div style={{ padding: '28px 32px 56px', maxWidth: 1120, margin: '0 auto' }}>

      {/* ── BAŞLIK + YENİ TEKLİF ──────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 28, gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f1f45', letterSpacing: -0.5, lineHeight: 1.2 }}>
            Teklif Arşivi
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 5 }}>
            {filtrelenmis.length} teklif gösteriliyor
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/teklif/yeni')}
          style={{
            background: '#0f1f45', borderColor: '#0f1f45',
            borderRadius: 7, fontWeight: 600, height: 38, paddingInline: 18,
          }}
        >
          Yeni Teklif
        </Button>
      </div>

      {/* ── SEKMELER + ARAMA ──────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 20, flexWrap: 'wrap',
      }}>
        {/* Sekme grubu */}
        <div style={{
          display: 'flex', gap: 3,
          background: '#f1f5f9', borderRadius: 9, padding: '3px',
        }}>
          {SEKMELER.map(sekme => {
            const aktif = aktifFiltre === sekme.key;
            return (
              <button
                key={sekme.key}
                onClick={() => setAktifFiltre(sekme.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 7, border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12, fontWeight: aktif ? 600 : 400,
                  color: aktif ? '#0f1f45' : '#64748b',
                  background: aktif ? '#ffffff' : 'transparent',
                  boxShadow: aktif ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
              >
                {sekme.label}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                  background: aktif ? '#0f1f45' : '#e2e8f0',
                  color: aktif ? '#ffffff' : '#64748b',
                  fontSize: 10, fontWeight: 700, lineHeight: 1,
                }}>
                  {sekme.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Arama */}
        <Input
          placeholder="Teklif no, firma veya personel ara..."
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          value={aramaMetni}
          onChange={e => setAramaMetni(e.target.value)}
          allowClear
          style={{ width: 272, borderRadius: 7, marginLeft: 'auto' }}
        />
      </div>

      {/* ── KOLON BAŞLIKLARI ──────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '3px 180px 1fr 100px 160px 130px 110px auto',
        alignItems: 'center',
        padding: '0 16px 0 0',
        marginBottom: 6,
        gap: 0,
      }}>
        <div />
        <div style={{ paddingLeft: 16, fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase' }}>Teklif No / Firma</div>
        <div />
        <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase' }}>Tarih</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase' }}>Hazırlayan</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'right', paddingRight: 16 }}>Toplam</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'center' }}>Durum</div>
        <div />
      </div>

      {/* ── LİSTE ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {filtrelenmis.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 20px',
            color: '#94a3b8', fontSize: 14,
            background: '#ffffff', borderRadius: 10,
            border: '1px solid #f1f5f9',
          }}>
            {aktifFiltre === 'benim'
              ? 'Henüz hazırladığınız bir teklif yok. İlk teklifinizi oluşturun.'
              : 'Gösterilecek teklif bulunamadı.'}
          </div>
        ) : (
          filtrelenmis.map(teklif => (
            <TeklifKarti
              key={teklif.id}
              teklif={teklif}
              benim={teklif.hazirlayanKullaniciId === benimId}
              durum={DURUM_CFG[teklif.durum]}
              navigate={navigate}
              onSil={teklifSil}
              onKopyala={teklifKopyala}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ── Teklif Kartı ───────────────────────────────────────── */
interface KartiProps {
  teklif: Teklif;
  benim: boolean;
  durum: { label: string; color: string; bg: string; border: string };
  navigate: (path: string) => void;
  onSil: (id: string) => void;
  onKopyala: (id: string) => void;
}

function TeklifKarti({ teklif, benim, durum, navigate, onSil, onKopyala }: KartiProps) {
  const isim  = teklif.hazirlayanAdSoyad ?? '';
  const renk  = isim ? personelRenk(isim) : PALET[0];
  const inits = isim ? initials(isim) : '?';

  return (
    <div
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: benim ? 'rgba(15,31,69,0.030)' : '#ffffff',
        border: `1px solid ${benim ? 'rgba(15,31,69,0.11)' : '#f0f4f8'}`,
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'box-shadow 0.14s',
      }}
    >
      {/* Vurgu çizgisi */}
      <div style={{
        width: 3,
        flexShrink: 0,
        background: benim ? '#0f1f45' : renk.accent,
        alignSelf: 'stretch',
      }} />

      {/* İçerik grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '180px 1fr 100px 160px 130px 110px auto',
        alignItems: 'center',
        padding: '12px 14px 12px 16px',
        gap: 0,
        minWidth: 0,
      }}>

        {/* Teklif No + Firma */}
        <div style={{ minWidth: 0, paddingRight: 12 }}>
          <button
            onClick={() => navigate(`/teklif/${teklif.id}/onizleme`)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
              fontSize: 13, fontWeight: 700,
              color: benim ? '#0f1f45' : '#1e293b',
              letterSpacing: 0.2, lineHeight: 1.2,
              display: 'block', marginBottom: 3,
            }}
          >
            {teklif.teklifNo}
          </button>
          <div style={{
            fontSize: 12, color: '#374151', fontWeight: 500,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {teklif.cari.firmaAdi}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1, letterSpacing: 0.2 }}>
            {teklif.cari.cariKod}
          </div>
        </div>

        {/* Boş orta — flex spacer */}
        <div />

        {/* Tarih */}
        <div style={{ paddingRight: 8 }}>
          <div style={{ fontSize: 12, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
            {formatDate(teklif.tarih)}
          </div>
        </div>

        {/* Hazırlayan */}
        <div style={{ paddingRight: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: benim ? 'rgba(15,31,69,0.10)' : renk.avatarBg,
              border: `1.5px solid ${benim ? 'rgba(15,31,69,0.28)' : renk.avatarBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9.5, fontWeight: 700, fontFamily: '"Arial", sans-serif',
              color: benim ? '#0f1f45' : renk.avatarText,
            }}>
              {inits}
            </div>
            {/* İsim */}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, lineHeight: 1.2,
                color: benim ? '#0f1f45' : '#374151',
                whiteSpace: 'nowrap',
              }}>
                {benim ? 'Sen' : (isim || '—')}
              </div>
              {benim && isim && (
                <div style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                  {isim}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toplam */}
        <div style={{ textAlign: 'right', paddingRight: 16 }}>
          <div style={{
            fontSize: 14, fontWeight: 700,
            color: benim ? '#0f1f45' : '#111827',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 0.1,
            whiteSpace: 'nowrap',
          }}>
            {formatCurrency(teklif.genelToplam, teklif.paraBirimi)}
          </div>
        </div>

        {/* Durum rozeti */}
        <div style={{ textAlign: 'center' }}>
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 5,
            fontSize: 11, fontWeight: 600, letterSpacing: 0.1,
            color: durum.color, background: durum.bg,
            border: `1px solid ${durum.border}`,
            whiteSpace: 'nowrap',
          }}>
            {durum.label}
          </span>
        </div>

        {/* İşlemler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1, paddingLeft: 8 }}>
          <Tooltip title="Önizle">
            <Button type="text" size="small" icon={<EyeOutlined />}
              onClick={() => navigate(`/teklif/${teklif.id}/onizleme`)}
              style={{ color: '#9ca3af' }} />
          </Tooltip>
          <Tooltip title="Düzenle">
            <Button type="text" size="small" icon={<EditOutlined />}
              onClick={() => navigate(`/teklif/${teklif.id}`)}
              style={{ color: '#9ca3af' }} />
          </Tooltip>
          <Tooltip title="PDF">
            <Button type="text" size="small" icon={<FilePdfOutlined />}
              onClick={() => navigate(`/teklif/${teklif.id}/onizleme`)}
              style={{ color: '#9ca3af' }} />
          </Tooltip>
          <Tooltip title="Kopyala">
            <Button type="text" size="small" icon={<CopyOutlined />}
              onClick={() => onKopyala(teklif.id)}
              style={{ color: '#9ca3af' }} />
          </Tooltip>
          <Popconfirm
            title="Teklif silinecek"
            description="Bu işlem geri alınamaz. Emin misiniz?"
            onConfirm={() => onSil(teklif.id)}
            okText="Sil" cancelText="İptal" okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}
