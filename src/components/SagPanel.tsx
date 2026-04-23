/**
 * SagPanel.tsx
 * ─────────────────────────────────────────────────────────────────
 * Bağlamsal düzenleme paneli — belgedeki seçili alana göre içerik değişir.
 * Müşteri, ayarlar, satır detayı ve notlar modları.
 */
import React from 'react';
import { Select, Input, Button, AutoComplete, InputNumber } from 'antd';
import {
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import CariSecimi from './CariSecimi';
import { referansVeriService } from '../services/referansVeriService';
import { urunService } from '../services/urunService';
import { useColors } from '../hooks/useColors';
import type { Cari, TeklifSatiri, ParaBirimi } from '../types';
import type { PanelModu } from '../hooks/useBelgeState';

const { TextArea } = Input;

interface SagPanelProps {
  panelModu: PanelModu;
  onKapat: () => void;

  // Cari
  cari: Cari | null;
  onCariDegistir: (cari: Cari) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM') => void;

  // Satırlar
  satirlar: TeklifSatiri[];
  seciliSatirId: string | null;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;

  // Para birimi bilgileri (SatirPaneli görüntüleme için)
  paraBirimi: ParaBirimi;
  satirBazliParaBirimi: boolean;
  satirBazliIskonto: boolean;

  // Notlar
  notlar: string;
  onNotlarDegistir: (notlar: string) => void;

}

const PANEL_W = 360;

const secHeadStyle = (C: ReturnType<typeof useColors>): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: `1px solid ${C.border}`,
  background: C.bgElevated,
  position: 'sticky',
  top: 0,
  zIndex: 10,
});

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
};

function PanelBaslik({ icon, baslik, onKapat, C }: { icon: React.ReactNode; baslik: string; onKapat: () => void; C: ReturnType<typeof useColors> }) {
  return (
    <div style={secHeadStyle(C)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: C.textFaint }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{baslik}</span>
      </div>
      <Button type="text" size="small" icon={<CloseOutlined />} onClick={onKapat} />
    </div>
  );
}

export default function SagPanel(props: SagPanelProps) {
  const C = useColors();
  const { panelModu } = props;

  if (!panelModu) return null;

  return (
    <div style={{
      width: PANEL_W,
      minWidth: PANEL_W,
      maxWidth: PANEL_W,
      height: '100%',
      borderLeft: `1px solid ${C.border}`,
      background: C.bgSurface,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {panelModu === 'musteri' && <MusteriPaneli {...props} C={C} />}
      {panelModu === 'satir' && <SatirPaneli {...props} C={C} />}
      {panelModu === 'notlar' && <NotlarPaneli {...props} C={C} />}
    </div>
  );
}

// ── Müşteri Paneli ──────────────────────────────────────────────────────────
function MusteriPaneli(props: SagPanelProps & { C: ReturnType<typeof useColors> }) {
  const { C, cari, onCariDegistir, contactName, contactTitle, onContactNameDegistir, onContactTitleDegistir, onKapat } = props;
  return (
    <>
      <PanelBaslik icon={<UserOutlined />} baslik="Müşteri Bilgileri" onKapat={onKapat} C={C} />
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ ...sectionLabel, color: C.textFaint }}>Cari Seçimi</div>
        <CariSecimi value={cari} onChange={onCariDegistir} />

        {cari && (
          <div style={{ marginTop: 20 }}>
            <div style={{ ...sectionLabel, color: C.textFaint }}>Muhatap Kişi</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                placeholder="İsim"
                value={contactName}
                onChange={e => onContactNameDegistir(e.target.value)}
                style={{ flex: 1 }}
              />
              <Select
                value={contactTitle}
                onChange={onContactTitleDegistir}
                style={{ width: 100 }}
                options={[
                  { label: 'Bey', value: 'BEY' },
                  { label: 'Hanım', value: 'HANIM' },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Satır Detay Paneli ──────────────────────────────────────────────────────
function SatirPaneli(props: SagPanelProps & { C: ReturnType<typeof useColors> }) {
  const { C, satirlar, seciliSatirId, onSatirGuncelle, onSatirSil, onSatirEkle, onKapat, paraBirimi, satirBazliParaBirimi, satirBazliIskonto } = props;
  const satir = satirlar.find(s => s.id === seciliSatirId);
  const markalar = referansVeriService.markalar.tumunuGetir();
  const birimler = referansVeriService.birimler.tumunuGetir();
  const urunler = urunService.tumUrunleriGetir();

  const satirIdx = satirlar.findIndex(s => s.id === seciliSatirId);

  if (!satir) {
    return (
      <>
        <PanelBaslik icon={<ShoppingCartOutlined />} baslik="Ürün Satırı" onKapat={onKapat} C={C} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, color: C.textFaint }}>
          <div style={{ fontSize: 13 }}>Belgeden bir satır seçin veya yeni ekleyin</div>
          <Button type="primary" icon={<PlusOutlined />} onClick={onSatirEkle}>Satır Ekle</Button>
        </div>
      </>
    );
  }

  const guncelle = (alan: keyof TeklifSatiri, deger: unknown) => onSatirGuncelle(satir.id, alan, deger);

  return (
    <>
      <PanelBaslik icon={<ShoppingCartOutlined />} baslik={`Satır #${satirIdx + 1}`} onKapat={onKapat} C={C} />
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Marka */}
        <div>
          <div style={{ ...sectionLabel, color: C.textFaint }}>Marka</div>
          <Select
            value={satir.marka}
            onChange={v => guncelle('marka', v)}
            style={{ width: '100%' }}
            showSearch
            options={markalar.map(m => ({ label: m, value: m }))}
          />
        </div>

        {/* Ürün Kodu */}
        <div>
          <div style={{ ...sectionLabel, color: C.textFaint }}>Ürün Kodu</div>
          <AutoComplete
            value={satir.urunKod}
            onChange={v => {
              guncelle('urunKod', v);
              const urun = urunler.find(u => u.urunKod === v);
              if (urun) {
                guncelle('aciklama', urun.aciklama);
                if (urun.varsayilanFiyat) guncelle('birimFiyat', urun.varsayilanFiyat);
                if (urun.birim) guncelle('birim', urun.birim);
              }
            }}
            style={{ width: '100%' }}
            options={urunler.map(u => ({ value: u.urunKod, label: `${u.urunKod} — ${u.aciklama}` }))}
            filterOption={(input, option) =>
              (option?.value ?? '').toLowerCase().includes(input.toLowerCase()) ||
              (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>

        {/* Açıklama */}
        <div>
          <div style={{ ...sectionLabel, color: C.textFaint }}>Açıklama</div>
          <TextArea
            value={satir.aciklama}
            onChange={e => guncelle('aciklama', e.target.value)}
            autoSize={{ minRows: 2, maxRows: 5 }}
          />
        </div>

        {/* Miktar & Birim */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...sectionLabel, color: C.textFaint }}>Miktar</div>
            <InputNumber
              value={satir.miktar}
              onChange={v => guncelle('miktar', v ?? 0)}
              style={{ width: '100%' }}
              min={0}
              precision={4}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...sectionLabel, color: C.textFaint }}>Birim</div>
            <Select
              value={satir.birim}
              onChange={v => guncelle('birim', v)}
              style={{ width: '100%' }}
              options={birimler.map(b => ({ label: b, value: b }))}
            />
          </div>
        </div>

        {/* Para Birimi (satır bazlı) */}
        {satirBazliParaBirimi && (
          <div>
            <div style={{ ...sectionLabel, color: C.textFaint }}>Para Birimi</div>
            <Select
              value={satir.paraBirimi ?? paraBirimi}
              onChange={v => guncelle('paraBirimi', v)}
              style={{ width: '100%' }}
              options={[
                { label: 'EUR (€)', value: 'EUR' },
                { label: 'USD ($)', value: 'USD' },
                { label: 'TRY (₺)', value: 'TRY' },
              ]}
            />
          </div>
        )}

        {/* Birim Fiyat */}
        <div>
          <div style={{ ...sectionLabel, color: C.textFaint }}>Birim Fiyat</div>
          <InputNumber
            value={satir.birimFiyat}
            onChange={v => guncelle('birimFiyat', v ?? 0)}
            style={{ width: '100%' }}
            min={0}
            precision={2}
            formatter={v => v ? Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : ''}
          />
        </div>

        {/* İskonto — yalnız satır bazlı iskonto aktifse görünür */}
        {satirBazliIskonto && (
          <div>
            <div style={{ ...sectionLabel, color: C.textFaint }}>Satır İskontosu (%)</div>
            <InputNumber
              value={satir.indirimOrani}
              onChange={v => guncelle('indirimOrani', v ?? 0)}
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={2}
            />
          </div>
        )}

        {/* Teslimat */}
        <div>
          <div style={{ ...sectionLabel, color: C.textFaint }}>Teslimat Süresi</div>
          <AutoComplete
            value={satir.teslimTarihi ?? ''}
            onChange={v => guncelle('teslimTarihi', v)}
            style={{ width: '100%' }}
            options={referansVeriService.teslimSecenekleri.tumunuGetir().map(v => ({ value: v }))}
          />
        </div>

        {/* Toplam (salt okunur) */}
        <div style={{
          padding: '12px 14px',
          background: C.bgElevated,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>Satır Toplam</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {satir.satirToplami.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Sil butonu */}
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => onSatirSil(satir.id)}
          style={{ marginTop: 8 }}
        >
          Satırı Sil
        </Button>
      </div>

      {/* Yeni satır ekle butonu */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
        <Button block type="dashed" icon={<PlusOutlined />} onClick={onSatirEkle}>
          Yeni Satır Ekle
        </Button>
      </div>
    </>
  );
}

// ── Notlar Paneli ───────────────────────────────────────────────────────────
function NotlarPaneli(props: SagPanelProps & { C: ReturnType<typeof useColors> }) {
  const { C, notlar, onNotlarDegistir, onKapat } = props;
  return (
    <>
      <PanelBaslik icon={<FileTextOutlined />} baslik="Notlar" onKapat={onKapat} C={C} />
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <TextArea
          value={notlar}
          onChange={e => onNotlarDegistir(e.target.value)}
          autoSize={{ minRows: 6, maxRows: 20 }}
          placeholder="Teklif ile ilgili notlar, özel koşullar veya açıklamalar..."
        />
      </div>
    </>
  );
}
