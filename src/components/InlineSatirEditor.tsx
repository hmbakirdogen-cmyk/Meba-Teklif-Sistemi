/**
 * InlineSatirEditor.tsx
 * Kalem satırı hücre-bazlı inline düzenleme bileşenleri.
 * Tüm satır tek seferde edit moduna geçmez; sadece aktif hücre editöre döner.
 */
import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from 'antd';
import { DeleteOutlined, PercentageOutlined } from '@ant-design/icons';
import type { TeklifSatiri, ParaBirimi } from '../types';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { referansVeriService } from '../services/referansVeriService';
import { urunService } from '../services/urunService';
import {
  InlineTableAutocompleteField,
  InlineTableNumberField,
  InlineTableSelectField,
} from './InlineTableFields';
import { UNIT_OPTIONS, ROW_SHELL, ROW_TEXT } from './InlineTableRowShared';
import {
  DOCUMENT_COLORS,
  LINE_ITEM_EDITOR_HEIGHT,
  LINE_ITEM_METRICS,
} from '../templates/teklifDocumentShared';

const C = DOCUMENT_COLORS;

export type SatirCellField =
  | 'marka'
  | 'urunKod'
  | 'aciklama'
  | 'miktar'
  | 'paraBirimi'
  | 'birimFiyat'
  | 'teslimat';

export const SATIR_CELL_NAV_ORDER: SatirCellField[] = [
  'urunKod',
  'aciklama',
  'miktar',
  'birimFiyat',
  'teslimat',
];

const ACIKLAMA_EDIT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  minHeight: LINE_ITEM_EDITOR_HEIGHT,
  fontSize: `${LINE_ITEM_METRICS.baseFontSizePx}px`,
  fontWeight: 400,
  color: C.textMid,
  lineHeight: LINE_ITEM_METRICS.lineHeight,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  resize: 'none',
  padding: 0,
  margin: 0,
};

interface CellEditorProps {
  satir: TeklifSatiri;
  paraBirimi: ParaBirimi;
  autoFocus?: boolean;
  onGuncelle: (alan: keyof TeklifSatiri, deger: unknown) => void;
  onEnterNext?: () => void;
}

export function SatirCellEditor({
  field,
  ...props
}: CellEditorProps & { field: SatirCellField }) {
  switch (field) {
    case 'marka':      return <MarkaEditor {...props} />;
    case 'urunKod':    return <UrunKodEditor {...props} />;
    case 'aciklama':   return <AciklamaEditor {...props} />;
    case 'miktar':     return <MiktarEditor {...props} />;
    case 'paraBirimi': return <ParaBirimiEditor {...props} />;
    case 'birimFiyat': return <BirimFiyatEditor {...props} />;
    case 'teslimat':   return <TeslimatEditor {...props} />;
  }
}

function MarkaEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  const markalar = useMemo(() => referansVeriService.markalar.tumunuGetir(), []);
  return (
    <InlineTableSelectField
      autoFocus={autoFocus}
      defaultOpen={autoFocus}
      style={ROW_TEXT.brand}
      value={satir.marka || undefined}
      onChange={(value) => {
        onGuncelle('marka', value);
        onEnterNext?.();
      }}
      options={markalar.map((m) => ({ value: m, label: m }))}
      placeholder="—"
      popupMatchSelectWidth={false}
      dropdownStyle={{ minWidth: 130 }}
    />
  );
}

function UrunKodEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  const urunler = useMemo(() => urunService.tumUrunleriGetir(), []);
  const options = useMemo(
    () => urunler.map((u) => ({ value: u.urunKod, label: `${u.urunKod} — ${u.aciklama}` })),
    [urunler],
  );

  const handleSelect = (kod: string) => {
    onGuncelle('urunKod', kod);
    const urun = urunler.find((u) => u.urunKod === kod);
    if (urun) {
      // Ürün seçildiğinde açıklama FULL TEXT yazılır; hiçbir kesme/kısaltma
      // yapılmaz, depoda hangi metin varsa birebir satıra aktarılır.
      onGuncelle('aciklama', urun.aciklama ?? '');
      if (urun.varsayilanFiyat && !satir.birimFiyat) onGuncelle('birimFiyat', urun.varsayilanFiyat);
      if (urun.birim) onGuncelle('birim', urun.birim);
    }
    onEnterNext?.();
  };

  return (
    <InlineTableAutocompleteField
      autoFocus={autoFocus}
      style={ROW_TEXT.code}
      value={satir.urunKod}
      onChange={(value) => onGuncelle('urunKod', value)}
      onSelect={(value) => handleSelect(String(value))}
      options={options}
      filterOption={(input, option) => {
        const q = input.toLowerCase();
        return (
          (option?.value?.toString().toLowerCase().includes(q) ||
            option?.label?.toString().toLowerCase().includes(q)) ?? false
        );
      }}
      placeholder="Ürün kodu"
      popupMatchSelectWidth={false}
      dropdownStyle={{ minWidth: 300 }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          const dropdown = document.querySelector('.ant-select-dropdown:not([style*="display: none"])');
          if (!dropdown) {
            e.preventDefault();
            onEnterNext?.();
          }
        }
      }}
    />
  );
}

function AciklamaEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  return (
    <Input.TextArea
      autoFocus={autoFocus}
      className="inline-table-field description-editor"
      variant="borderless"
      size="small"
      autoSize={{ minRows: 1, maxRows: 3 }}
      style={ACIKLAMA_EDIT}
      value={satir.aciklama}
      onChange={(e) => onGuncelle('aciklama', e.target.value)}
      placeholder="Açıklama"
      onFocus={(e) => (e.target as HTMLTextAreaElement).select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onEnterNext?.();
        }
      }}
    />
  );
}

function MiktarEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  return (
    <div style={ROW_SHELL.quantityWrap}>
      <InlineTableNumberField
        autoFocus={autoFocus}
        style={ROW_SHELL.quantityInputStyle}
        value={satir.miktar}
        min={0}
        onChange={(value) => onGuncelle('miktar', value ?? 0)}
        onFocus={(e) => (e.target as HTMLInputElement).select?.()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnterNext?.();
          }
        }}
      />
      <div style={ROW_SHELL.quantityUnitWrap}>
        <InlineTableSelectField
          value={satir.birim || 'Adet'}
          onChange={(value) => onGuncelle('birim', value)}
          options={UNIT_OPTIONS as unknown as { label: string; value: string }[]}
          style={ROW_TEXT.quantityUnit}
          popupMatchSelectWidth={false}
          dropdownStyle={{ minWidth: 110 }}
        />
      </div>
    </div>
  );
}

function ParaBirimiEditor({ satir, paraBirimi, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi);
  return (
    <InlineTableSelectField
      autoFocus={autoFocus}
      defaultOpen={autoFocus}
      style={ROW_TEXT.currency}
      value={satirPb}
      onChange={(value) => {
        onGuncelle('paraBirimi', value);
        onEnterNext?.();
      }}
      options={[
        { value: 'TRY', label: 'TL' },
        { value: 'USD', label: 'USD' },
        { value: 'EUR', label: 'EUR' },
      ]}
      popupMatchSelectWidth={false}
      dropdownStyle={{ minWidth: 90 }}
    />
  );
}

function BirimFiyatEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  return (
    <InlineTableNumberField
      autoFocus={autoFocus}
      style={ROW_TEXT.price}
      value={satir.birimFiyat || undefined}
      min={0}
      step={0.01}
      onChange={(value) => onGuncelle('birimFiyat', value ?? 0)}
      formatter={(value) => (value != null ? String(value).replace('.', ',') : '')}
      parser={(value) => Number((value ?? '').replace(',', '.'))}
      placeholder="0,00"
      onFocus={(e) => (e.target as HTMLInputElement).select?.()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnterNext?.();
        }
      }}
    />
  );
}

function TeslimatEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  const teslimSecenekleri = useMemo(
    () => referansVeriService.teslimSecenekleri.tumunuGetir(),
    [],
  );
  return (
    <InlineTableSelectField
      autoFocus={autoFocus}
      defaultOpen={autoFocus}
      style={ROW_TEXT.delivery}
      value={satir.teslimTarihi || undefined}
      onChange={(value) => {
        onGuncelle('teslimTarihi', value);
        onEnterNext?.();
      }}
      options={teslimSecenekleri.map((t) => ({ value: t, label: t }))}
      placeholder="—"
      popupMatchSelectWidth={false}
      dropdownStyle={{ minWidth: 150 }}
    />
  );
}

// Panel base style (portal ile document.body'ye basılır, fixed pozisyon
// JS hesabıyla viewport içinde clamp edilir). Satırın TR'sinin SAĞINDA
// dikey merkez hizada belirir; sayfa kenarına çıkıp kırpılmaz.
const portalPanelStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  padding: '2px 3px',
  height: 22,
  background: 'rgba(250,250,248,0.96)',
  border: `0.75px solid ${C.borderSoft}`,
  borderRadius: '5px',
  boxShadow: '0 4px 12px rgba(26,43,66,0.16), 0 0 0 1px rgba(26,43,66,0.05)',
  whiteSpace: 'nowrap',
  backdropFilter: 'blur(10px)',
};

const actionBtnStyle: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: '9.5px',
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px',
  userSelect: 'none',
  padding: '3px 7px',
  borderRadius: '4px',
  transition: 'background 0.15s, opacity 0.15s',
  lineHeight: 1,
  border: 'none',
  background: 'transparent',
};

interface ActionPanelProps {
  satir: TeklifSatiri;
  satirBazliIskonto: boolean;
  onGuncelle: (alan: keyof TeklifSatiri, deger: unknown) => void;
  onSil: () => void;
}

export function SatirAksiyonlariPanel({
  satir,
  satirBazliIskonto,
  onGuncelle,
  onSil,
}: ActionPanelProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Anchor span'inden TR'yi bul, TR'nin viewport rect'ine göre panel'i
  // sağına yerleştir; viewport'a göre clamp et (kumanda paneli ~180px sağda).
  useLayoutEffect(() => {
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      let tr: HTMLElement | null = anchor.parentElement;
      while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
      if (!tr) return;
      const rect = tr.getBoundingClientRect();
      const panelW = panelRef.current?.offsetWidth ?? 80;
      const KUMANDA_GAP = 200; // viewport sağındaki kumanda paneli için pay
      const maxLeft = window.innerWidth - panelW - KUMANDA_GAP;
      let left = rect.right + 8;
      if (left > maxLeft) left = Math.max(8, maxLeft);
      const top = rect.top + rect.height / 2;
      setPos({ top, left });
    };
    update();
    const ro = new ResizeObserver(update);
    const anchor = anchorRef.current;
    if (anchor) {
      let tr: HTMLElement | null = anchor.parentElement;
      while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
      if (tr) ro.observe(tr);
    }
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [satir.id]);

  // Panel ölçüldüğünde re-position (ilk render'da panelW=80 fallback)
  useEffect(() => {
    if (!panelRef.current || !pos) return;
    const real = panelRef.current.offsetWidth;
    const KUMANDA_GAP = 200;
    const maxLeft = window.innerWidth - real - KUMANDA_GAP;
    if (pos.left > maxLeft && maxLeft > 8) {
      setPos((p) => (p ? { ...p, left: Math.max(8, maxLeft) } : p));
    }
  }, [pos, satirBazliIskonto]);

  if (!pos) {
    return <span ref={anchorRef} style={{ display: 'none' }} aria-hidden="true" />;
  }

  return (
    <>
      <span ref={anchorRef} style={{ display: 'none' }} aria-hidden="true" />
      {createPortal(
        <div
          ref={panelRef}
          className="satir-aksiyonlari"
          style={{
            ...portalPanelStyle,
            top: pos.top,
            left: pos.left,
            transform: 'translateY(-50%)',
          }}
        >
          {satirBazliIskonto && (
        <>
          <span style={{ ...actionBtnStyle, color: C.textMid }}>
            <PercentageOutlined style={{ fontSize: 9 }} />
            <InlineTableNumberField
              style={{ width: 26, fontSize: '9px', fontWeight: 700, textAlign: 'center', padding: 0 }}
              value={satir.indirimOrani}
              min={0}
              max={100}
              step={1}
              onChange={(value) => onGuncelle('indirimOrani', value ?? 0)}
              onFocus={(e) => (e.target as HTMLInputElement).select?.()}
            />
          </span>
          <span style={{ width: '0.75px', height: 14, background: C.borderSoft, flexShrink: 0 }} />
        </>
      )}
      <span
        onClick={(e) => {
          e.stopPropagation();
          onSil();
        }}
        title="Satırı sil"
        aria-label="Satırı sil"
        style={{ ...actionBtnStyle, color: '#b91c1c', opacity: 0.75, padding: '2px 5px' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(185,28,28,0.08)';
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.opacity = '0.75';
        }}
      >
        <DeleteOutlined style={{ fontSize: 10 }} />
      </span>
        </div>,
        document.body,
      )}
    </>
  );
}
