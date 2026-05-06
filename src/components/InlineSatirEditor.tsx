/**
 * InlineSatirEditor.tsx
 * Kalem satırı hücre-bazlı inline düzenleme bileşenleri.
 * Tüm satır tek seferde edit moduna geçmez; sadece aktif hücre editöre döner.
 */
import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { App, Input } from 'antd';
import type { InputRef } from 'antd';
import { DeleteOutlined, PercentageOutlined } from '@ant-design/icons';
import type { TeklifSatiri, ParaBirimi, Urun, UrunSeti } from '../types';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { referansVeriService } from '../services/referansVeriService';
import { urunService } from '../services/urunService';
import { urunSetService } from '../services/urunSetService';
import {
  InlineTableNumberField,
  InlineTableSelectField,
} from './InlineTableFields';
import { UNIT_OPTIONS, ROW_SHELL, ROW_TEXT } from './InlineTableRowShared';
import { DOCUMENT_COLORS } from '../templates/teklifDocumentShared';
import type { SatirCellField } from './inlineSatirEditorShared';

const C = DOCUMENT_COLORS;

const ACIKLAMA_EDIT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  // Edit moduna girince yazı rengi/boyutu/satır yüksekliği değişmesin →
  // tipografi tüm hücreden inherit edilir; sadece layout özellikleri
  // (display/width/whiteSpace/resize/padding/margin) override edilir.
  fontFamily: 'inherit',
  fontSize: 'inherit',
  fontWeight: 'inherit',
  color: 'inherit',
  lineHeight: 'inherit',
  letterSpacing: 'inherit',
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
  onSetUygula?: (setId: string) => void;
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

function UrunKodEditor({ satir, autoFocus, onGuncelle, onSetUygula, onEnterNext }: CellEditorProps) {
  const { modal } = App.useApp();
  const urunler = useMemo(() => urunService.tumUrunleriGetir(), []);
  const setler = useMemo(() => urunSetService.tumSetleriGetir(), []);
  const inputRef = useRef<InputRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Mount anındaki kod — onaylanmamış değişikliği tespit için baseline
  const initialKodRef = useRef(satir.urunKod);
  // Suggestion'dan seçimle gelen değer DB'de zaten var → confirm sorma
  const justSelectedRef = useRef(false);
  const didInitialSelectRef = useRef(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [anchorRect, setAnchorRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    bottom: number;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = (satir.urunKod ?? '').trim().toLowerCase();
    const urunOnerileri = (q
      ? urunler.filter((u) =>
          u.urunKod.toLowerCase().includes(q) ||
          (u.aciklama ?? '').toLowerCase().includes(q),
        )
      : urunler)
      .slice(0, 40)
      .map((u) => ({
        type: 'urun' as const,
        id: u.id,
        kod: u.urunKod,
        aciklama: u.aciklama,
        payload: u,
      }));

    const setOnerileri = (q
      ? setler.filter((s) =>
          s.setKod.toLowerCase().includes(q) ||
          (s.aciklama ?? '').toLowerCase().includes(q),
        )
      : setler)
      .slice(0, 20)
      .map((s) => ({
        type: 'set' as const,
        id: s.id,
        kod: s.setKod,
        aciklama: s.aciklama,
        payload: s,
      }));

    return [...setOnerileri, ...urunOnerileri].slice(0, 50);
  }, [setler, urunler, satir.urunKod]);

  // Suggestion paneli pozisyonu — input altinda, viewport icinde
  useLayoutEffect(() => {
    const updateAnchorRect = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchorRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
      });
    };

    updateAnchorRect();

    const container = containerRef.current;
    const ro = new ResizeObserver(updateAnchorRect);
    if (container) ro.observe(container);

    window.addEventListener('scroll', updateAnchorRect, true);
    window.addEventListener('resize', updateAnchorRect);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', updateAnchorRect, true);
      window.removeEventListener('resize', updateAnchorRect);
    };
  }, [satir.urunKod, filtered.length, showSuggestions]);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = window.setTimeout(() => {
      const input = inputRef.current?.input;
      if (!input) return;
      input.focus();
      if (!didInitialSelectRef.current) {
        didInitialSelectRef.current = true;
        input.select();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFocus]);

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

  const handleSelect = (item: {
    type: 'urun' | 'set';
    kod: string;
    payload: Urun | UrunSeti;
  }) => {
    justSelectedRef.current = true;
    onGuncelle('urunKod', item.kod);

    if (item.type === 'set') {
      const set = item.payload as UrunSeti;
      onGuncelle('aciklama', set.aciklama ?? '');
      onSetUygula?.(set.id);
      setShowSuggestions(false);
      onEnterNext?.();
      return;
    }

    onGuncelle('setId', undefined);
    const urun = item.payload as Urun;
    onGuncelle('aciklama', urun.aciklama ?? '');
    if (urun.varsayilanFiyat && !satir.birimFiyat) onGuncelle('birimFiyat', urun.varsayilanFiyat);
    if (urun.birim) onGuncelle('birim', urun.birim);
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
        autoCapitalize="characters"
        style={{
          ...ROW_TEXT.code,
          background: '#fff',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          textTransform: 'uppercase',
        }}
        value={satir.urunKod}
        onChange={(e) => {
          // Ürün kodu daima büyük harf — Türkçe locale ile (i→İ, ı→I)
          const upper = e.target.value.toLocaleUpperCase('tr-TR');
          onGuncelle('urunKod', upper);
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
            if (sel) handleSelect(sel);
            else onEnterNext?.();
          } else if (e.key === 'Escape') {
            setShowSuggestions(false);
          }
        }}
      />
      {showSuggestions && filtered.length > 0 && anchorRect &&
        createPortal(
          <div
            id="urunkod-suggest-panel"
            style={{
              position: 'fixed',
              left: anchorRect.left,
              top: anchorRect.bottom + 2,
              minWidth: Math.max(anchorRect.width, 300),
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
                key={`${u.type}-${u.id}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(u);
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
                {u.type === 'set' && (
                  <span style={{ fontWeight: 700, color: '#7c3aed', marginRight: 6 }}>[SET]</span>
                )}
                <span style={{ fontWeight: 600, color: C.accent }}>{u.kod}</span>
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
      <div className="miktar-edit-value-wrap" style={ROW_SHELL.quantityValueWrap}>
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
      </div>
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
      const panelH = panelRef.current?.offsetHeight ?? 22;
      const KUMANDA_GAP = 200; // viewport sağındaki kumanda paneli için pay
      const minLeft = rect.right;          // satırın içine ASLA girme
      const maxLeft = window.innerWidth - panelW - KUMANDA_GAP;
      // maxLeft < minLeft olursa (küçük ekran) yine de satır dışında tut.
      const left = maxLeft >= minLeft ? minLeft : minLeft;
      // Y konumu: satırın yüksekliğini AŞMAYACAK şekilde clamp.
      const desiredTop = rect.top + rect.height / 2 - panelH / 2;
      const top = Math.max(rect.top, Math.min(desiredTop, rect.bottom - panelH));
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
    // Sadece boyut değişince tetiklenir — left zaten rect.right'a sabitli,
    // ekstra clamp gerekmez.
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
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...portalPanelStyle,
            top: pos.top,
            left: pos.left,
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
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
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

interface IskontoRozetiProps {
  rowId: string;
  oran: number;
}

export function SatirIskontoRozeti({ rowId, oran }: IskontoRozetiProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      let tr: HTMLElement | null = anchor.parentElement;
      while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
      if (!tr) return;

      const rect = tr.getBoundingClientRect();
      const minLeft = rect.right + 2;  // satırın içine ASLA girme
      const left = minLeft;
      const top = rect.top;
      setPos({ top, left, height: rect.height });
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
  }, [rowId, oran]);

  const oranText = Number.isInteger(oran) ? String(oran) : oran.toFixed(2).replace(/\.00$/, '');

  if (!pos) {
    return <span ref={anchorRef} style={{ display: 'none' }} aria-hidden="true" />;
  }

  return (
    <>
      <span ref={anchorRef} style={{ display: 'none' }} aria-hidden="true" />
      {createPortal(
        <div
          ref={badgeRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            height: pos.height,
            fontSize: '9px',
            fontWeight: 700,
            color: C.accent,
            background: 'rgba(37,99,235,0.10)',
            borderRadius: '4px',
            padding: '0 5px',
            lineHeight: `${pos.height}px`,
            letterSpacing: '0.02em',
            pointerEvents: 'none',
            zIndex: 9998,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-hidden="true"
        >
          -{oranText}%
        </div>,
        document.body,
      )}
    </>
  );
}
