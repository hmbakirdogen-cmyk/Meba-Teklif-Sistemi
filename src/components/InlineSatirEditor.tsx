/**
 * InlineSatirEditor.tsx
 * Kalem satırı hücre-bazlı inline düzenleme bileşenleri.
 * Tüm satır tek seferde edit moduna geçmez; sadece aktif hücre editöre döner.
 */
import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { App, Input } from 'antd';
import { DeleteOutlined, PercentageOutlined } from '@ant-design/icons';
import type { TeklifSatiri, ParaBirimi, Urun } from '../types';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { referansVeriService } from '../services/referansVeriService';
import { urunService } from '../services/urunService';
import {
  InlineTableNumberField,
  InlineTableSelectField,
} from './InlineTableFields';
import { UNIT_OPTIONS, ROW_SHELL, ROW_TEXT } from './InlineTableRowShared';
import {
  DOCUMENT_COLORS,
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
  // minHeight kaldırıldı — TD'nin min-height (var --line-row-height = 20px)
  // satır yüksekliğini yönetir; editor doğal text height'ında (~14px) kalır.
  // 12px = DescText df-1 (varsayılan fit) ile birebir → font değişimi yok.
  fontSize: '12px',
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
  const { modal } = App.useApp();
  const urunler = useMemo(() => urunService.tumUrunleriGetir(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Mount anındaki kod — onaylanmamış değişikliği tespit için baseline
  const initialKodRef = useRef(satir.urunKod);
  // Suggestion'dan seçimle gelen değer DB'de zaten var → confirm sorma
  const justSelectedRef = useRef(false);
  const didInitialSelectRef = useRef(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);

  const filtered = useMemo(() => {
    const q = (satir.urunKod ?? '').trim().toLowerCase();
    if (!q) return urunler.slice(0, 50);
    return urunler
      .filter((u) =>
        u.urunKod.toLowerCase().includes(q) ||
        (u.aciklama ?? '').toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [urunler, satir.urunKod]);

  // Suggestion paneli pozisyonu — input altinda, viewport icinde
  useLayoutEffect(() => {
    if (!showSuggestions) return;
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPanelPos({ left: r.left, top: r.bottom + 2 });
  }, [showSuggestions, satir.urunKod, filtered.length]);

  // Dropdown disinda click → kapat
  useEffect(() => {
    if (!showSuggestions) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const panel = document.getElementById('urunkod-suggest-panel');
      if (panel?.contains(target)) return;
      setShowSuggestions(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showSuggestions]);

  const handleSelect = (kod: string) => {
    justSelectedRef.current = true;
    onGuncelle('urunKod', kod);
    const urun = urunler.find((u) => u.urunKod === kod);
    if (urun) {
      onGuncelle('aciklama', urun.aciklama ?? '');
      if (urun.varsayilanFiyat && !satir.birimFiyat) onGuncelle('birimFiyat', urun.varsayilanFiyat);
      if (urun.birim) onGuncelle('birim', urun.birim);
    }
    setShowSuggestions(false);
    onEnterNext?.();
  };

  const handleBlur = () => {
    // setTimeout: panel item'a click olabilir; blur once tetiklenirse
    // suggestion seçimi kaybolur. Kucuk bir gecikme ile sectiyse handle.
    setTimeout(() => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }
      const yeni = satir.urunKod?.trim();
      if (!yeni) return;
      if (yeni === initialKodRef.current?.trim()) return;
      const exists = urunler.some((u) => u.urunKod.toLowerCase() === yeni.toLowerCase());
      if (exists) return;
      modal.confirm({
        title: 'Yeni Ürün Kaydı',
        content: `"${yeni}" kodu veritabanında bulunamadı. Yeni ürün olarak kaydedilsin mi?`,
        okText: 'Kaydet',
        cancelText: 'İptal',
        onOk: () => {
          const yeniUrun: Urun = {
            id: urunService.urunIdUret(),
            urunKod: yeni,
            urunAdi: yeni,
            aciklama: satir.aciklama ?? '',
            kategori: '',
            birim: satir.birim || 'Adet',
            varsayilanFiyat: satir.birimFiyat || 0,
          };
          urunService.urunKaydet(yeniUrun);
          initialKodRef.current = yeni;
        },
      });
    }, 150);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <Input
        ref={inputRef}
        autoFocus={autoFocus}
        className="inline-table-field"
        variant="borderless"
        size="small"
        style={ROW_TEXT.code}
        value={satir.urunKod}
        onChange={(e) => {
          onGuncelle('urunKod', e.target.value);
          setShowSuggestions(true);
          setHighlightIdx(0);
        }}
        onFocus={(e) => {
          setShowSuggestions(true);
          if (didInitialSelectRef.current) return;
          didInitialSelectRef.current = true;
          (e.target as HTMLInputElement).select?.();
        }}
        onBlur={handleBlur}
        placeholder="Ürün kodu"
        onKeyDown={(e) => {
          if (!showSuggestions || filtered.length === 0) {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnterNext?.();
            }
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const sel = filtered[highlightIdx];
            if (sel) handleSelect(sel.urunKod);
            else onEnterNext?.();
          } else if (e.key === 'Escape') {
            setShowSuggestions(false);
          }
        }}
      />
      {showSuggestions && filtered.length > 0 && panelPos &&
        createPortal(
          <div
            id="urunkod-suggest-panel"
            style={{
              position: 'fixed',
              left: panelPos.left,
              top: panelPos.top,
              minWidth: 300,
              maxHeight: 280,
              overflowY: 'auto',
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 6,
              boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
              zIndex: 1500,
              fontSize: 11,
            }}
          >
            {filtered.map((u, i) => (
              <div
                key={u.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(u.urunKod);
                }}
                onMouseEnter={() => setHighlightIdx(i)}
                style={{
                  padding: '5px 8px',
                  cursor: 'pointer',
                  background: i === highlightIdx ? 'rgba(237, 242, 251, 0.92)' : 'transparent',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: C.textMid,
                }}
              >
                <span style={{ fontWeight: 600, color: C.accent }}>{u.urunKod}</span>
                {u.aciklama && (
                  <span style={{ color: C.textMid, marginLeft: 6 }}>— {u.aciklama}</span>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

function AciklamaEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  const { modal } = App.useApp();
  // Mount anındaki açıklama — değişiklik tespit baseline
  const initialAciklamaRef = useRef(satir.aciklama);

  const handleBlur = () => {
    const yeniAciklama = (satir.aciklama ?? '').trim();
    const eski = (initialAciklamaRef.current ?? '').trim();
    if (yeniAciklama === eski) return; // değişiklik yok
    const kod = (satir.urunKod ?? '').trim();
    if (!kod) return; // ürün kodu yoksa veritabanına kaydet anlamı yok

    const urunler = urunService.tumUrunleriGetir();
    const mevcut = urunler.find((u) => u.urunKod.toLowerCase() === kod.toLowerCase());

    if (mevcut) {
      // Var olan ürün — açıklamayı güncellemek istiyor mu?
      if ((mevcut.aciklama ?? '').trim() === yeniAciklama) {
        initialAciklamaRef.current = yeniAciklama;
        return;
      }
      modal.confirm({
        title: 'Açıklama Güncellensin mi?',
        content: `"${kod}" ürününün veritabanındaki açıklaması güncellensin mi?`,
        okText: 'Güncelle',
        cancelText: 'İptal',
        onOk: () => {
          urunService.urunKaydet({ ...mevcut, aciklama: yeniAciklama });
          initialAciklamaRef.current = yeniAciklama;
        },
      });
    } else {
      // Bu kodla ürün yok — yeni ürün olarak kaydedilsin mi?
      modal.confirm({
        title: 'Yeni Ürün Kaydı',
        content: `"${kod}" kodu veritabanında yok. Bu açıklamayla yeni ürün olarak kaydedilsin mi?`,
        okText: 'Kaydet',
        cancelText: 'İptal',
        onOk: () => {
          const yeniUrun: Urun = {
            id: urunService.urunIdUret(),
            urunKod: kod,
            urunAdi: kod,
            aciklama: yeniAciklama,
            kategori: '',
            birim: satir.birim || 'Adet',
            varsayilanFiyat: satir.birimFiyat || 0,
          };
          urunService.urunKaydet(yeniUrun);
          initialAciklamaRef.current = yeniAciklama;
        },
      });
    }
  };

  return (
    <Input
      autoFocus={autoFocus}
      className="inline-table-field description-editor"
      variant="borderless"
      size="small"
      style={ACIKLAMA_EDIT}
      value={satir.aciklama}
      onChange={(e) => onGuncelle('aciklama', e.target.value)}
      onBlur={handleBlur}
      placeholder="Açıklama"
      onFocus={(e) => (e.target as HTMLInputElement).select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnterNext?.();
        }
      }}
    />
  );
}

function MiktarEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  return (
    <div className="miktar-edit-wrap" style={ROW_SHELL.quantityWrap}>
      <InlineTableNumberField
        autoFocus={autoFocus}
        className="miktar-edit-input"
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
      <div className="miktar-edit-unit-wrap" style={ROW_SHELL.quantityUnitWrap}>
        <InlineTableSelectField
          className="miktar-edit-unit"
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
      // Satır sonu çizgisine YAPIŞIK — sıfır boşluk (gap=0).
      let left = rect.right;
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
