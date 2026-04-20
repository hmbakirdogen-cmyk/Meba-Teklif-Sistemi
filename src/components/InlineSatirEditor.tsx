/**
 * InlineSatirEditor.tsx
 * Teklif satırı inline düzenleme bileşeni.
 * View mode ile aynı hücre iskeletini korur; yalnızca içerik düzenlenebilir hale gelir.
 */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { PlusOutlined, DeleteOutlined, PercentageOutlined } from '@ant-design/icons';
import type { TeklifSatiri } from '../types';
import { formatDisplayNumber } from '../utils/formatters';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { referansVeriService } from '../services/referansVeriService';
import { urunService } from '../services/urunService';
import {
  InlineTableAutocompleteField,
  InlineTableInputField,
  InlineTableNumberField,
  InlineTableSelectField,
} from './InlineTableFields';
import {
  formatBirimLabel,
  formatParaBirimiLabel,
  RowCell,
  ROW_SHELL,
  ROW_TEXT,
} from './InlineTableRowShared';
import {
  DOCUMENT_COLORS,
  SEMBOL,
  noBreak,
} from '../templates/teklifDocumentShared';

const C = DOCUMENT_COLORS;

const floatingPanelStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: '100%',
  marginTop: '3px',
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  padding: '3px 4px',
  background: 'rgba(255,255,255,0.97)',
  border: `0.75px solid ${C.borderSoft}`,
  borderRadius: '6px',
  boxShadow: '0 2px 8px rgba(15,25,40,0.10), 0 0 0 1px rgba(0,0,0,0.03)',
  whiteSpace: 'nowrap',
  backdropFilter: 'blur(8px)',
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

// Edit modunda açıklama: webkit-box/line-clamp olmadan (input'a uygulanamaz)
const ACIKLAMA_EDIT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  fontSize: '11px',
  fontWeight: 500,
  color: C.textMid,
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

type FocusCell = 'marka' | 'urunKod' | 'aciklama' | 'miktar' | 'birimFiyat' | 'teslimat';
const CELL_NAV_ORDER: FocusCell[] = ['urunKod', 'aciklama', 'miktar', 'birimFiyat', 'teslimat'];

interface InlineSatirEditorProps {
  satir: TeklifSatiri;
  idx: number;
  paraBirimi: string;
  satirBazliParaBirimi: boolean;
  focusCell?: string;
  onGuncelle: (alan: keyof TeklifSatiri, deger: unknown) => void;
  onSil: () => void;
  onArayaEkle: () => void;
  onSatirBazliDegistir?: (aktif: boolean) => void;
}

export function InlineSatirEditor({
  satir,
  idx,
  paraBirimi,
  satirBazliParaBirimi,
  focusCell,
  onGuncelle,
  onSil,
  onArayaEkle,
  onSatirBazliDegistir,
}: InlineSatirEditorProps) {
  const markalar = useMemo(() => referansVeriService.markalar.tumunuGetir(), []);
  const birimler = useMemo(() => referansVeriService.birimler.tumunuGetir(), []);
  const teslimSecenekleri = useMemo(() => referansVeriService.teslimSecenekleri.tumunuGetir(), []);
  const urunler = useMemo(() => urunService.tumUrunleriGetir(), []);
  const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi);

  const markaRef = useRef<any>(null);
  const urunKodRef = useRef<any>(null);
  const aciklamaRef = useRef<any>(null);
  const miktarRef = useRef<any>(null);
  const birimFiyatRef = useRef<any>(null);
  const teslimatRef = useRef<any>(null);

  const focusMap = useMemo<Record<FocusCell, React.RefObject<any>>>(() => ({
    marka: markaRef,
    urunKod: urunKodRef,
    aciklama: aciklamaRef,
    miktar: miktarRef,
    birimFiyat: birimFiyatRef,
    teslimat: teslimatRef,
  }), []);

  useEffect(() => {
    const ref = focusCell ? focusMap[focusCell as FocusCell] ?? urunKodRef : urunKodRef;
    const timer = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      if (typeof el.focus === 'function') el.focus();
      const input: HTMLInputElement | null =
        typeof el.querySelector === 'function'
          ? el.querySelector('input, textarea')
          : el.nodeName === 'INPUT' || el.nodeName === 'TEXTAREA' ? el : null;
      input?.select?.();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [focusCell, focusMap]);

  const focusByName = useCallback((cell: FocusCell) => {
    const ref = focusMap[cell];
    if (!ref) return;
    window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      if (typeof el.focus === 'function') el.focus();
      const input: HTMLInputElement | null =
        typeof el.querySelector === 'function'
          ? el.querySelector('input, textarea')
          : el.nodeName === 'INPUT' || el.nodeName === 'TEXTAREA' ? el : null;
      input?.select?.();
    }, 0);
  }, [focusMap]);

  const handleEnterNav = useCallback((currentCell: FocusCell) => {
    const index = CELL_NAV_ORDER.indexOf(currentCell);
    if (index < CELL_NAV_ORDER.length - 1) {
      focusByName(CELL_NAV_ORDER[index + 1]);
    } else {
      onArayaEkle();
    }
  }, [focusByName, onArayaEkle]);

  const urunKodOptions = useMemo(() =>
    urunler.map((urun) => ({
      value: urun.urunKod,
      label: `${urun.urunKod} - ${urun.urunAdi}`,
    })),
  [urunler]);

  const handleUrunKodSec = useCallback((kod: string) => {
    onGuncelle('urunKod', kod);
    const urun = urunler.find((item) => item.urunKod === kod);
    if (urun) {
      if (!satir.urunAdi) onGuncelle('urunAdi', urun.urunAdi);
      if (urun.varsayilanFiyat && !satir.birimFiyat) onGuncelle('birimFiyat', urun.varsayilanFiyat);
      if (urun.birim) onGuncelle('birim', urun.birim);
    }
    window.setTimeout(() => focusByName('aciklama'), 80);
  }, [focusByName, onGuncelle, satir.birimFiyat, satir.urunAdi, urunler]);

  return (
    <tr data-editing style={{ ...noBreak }}>
      <RowCell idx={idx} pos="first" style={ROW_TEXT.no}>
        {String(idx + 1).padStart(2, '0')}
      </RowCell>

      <RowCell idx={idx} pos="mid">
        <InlineTableSelectField
          ref={markaRef}
          style={ROW_TEXT.brand}
          value={satir.marka || undefined}
          onChange={(value) => {
            onGuncelle('marka', value);
            window.setTimeout(() => focusByName('urunKod'), 50);
          }}
          options={markalar.map((marka) => ({ value: marka, label: marka }))}
          placeholder="—"
          popupMatchSelectWidth={false}
          dropdownStyle={{ minWidth: 130 }}
        />
      </RowCell>

      <RowCell idx={idx} pos="mid" style={{ overflow: 'hidden' }}>
        <InlineTableAutocompleteField
          ref={urunKodRef}
          style={ROW_TEXT.code}
          value={satir.urunKod}
          onChange={(value) => onGuncelle('urunKod', value)}
          onSelect={(value) => handleUrunKodSec(String(value))}
          options={urunKodOptions}
          filterOption={(input, option) =>
            option?.value?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
          }
          placeholder="Ürün kodu"
          popupMatchSelectWidth={false}
          dropdownStyle={{ minWidth: 300 }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
              const dropdown = document.querySelector('.ant-select-dropdown:not([style*="display: none"])');
              if (!dropdown) {
                e.preventDefault();
                handleEnterNav('urunKod');
              }
            }
          }}
        />
      </RowCell>

      <RowCell idx={idx} pos="mid">
        <InlineTableInputField
          ref={aciklamaRef}
          style={ACIKLAMA_EDIT}
          value={satir.urunAdi}
          onChange={(e) => onGuncelle('urunAdi', e.target.value)}
          placeholder="Açıklama"
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleEnterNav('aciklama');
            }
          }}
        />
      </RowCell>

      <RowCell idx={idx} pos="mid">
        <div style={ROW_SHELL.quantityWrap}>
          <InlineTableNumberField
            ref={miktarRef}
            style={ROW_SHELL.quantityInputStyle}
            value={satir.miktar}
            min={0}
            onChange={(value) => onGuncelle('miktar', value ?? 0)}
            onFocus={(e) => (e.target as HTMLInputElement).select?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleEnterNav('miktar');
              }
            }}
          />
          <InlineTableSelectField
            style={{ ...ROW_TEXT.quantityUnit, ...ROW_SHELL.quantityUnitWrap }}
            value={satir.birim || 'Adet'}
            onChange={(value) => onGuncelle('birim', value)}
            options={birimler.map((birim) => ({ value: birim, label: formatBirimLabel(birim) }))}
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 110 }}
          />
        </div>
      </RowCell>

      {satirBazliParaBirimi && (
        <RowCell idx={idx} pos="mid">
          <span style={ROW_TEXT.currency}>{formatParaBirimiLabel(satirPb)}</span>
        </RowCell>
      )}

      <RowCell idx={idx} pos="mid">
        <InlineTableNumberField
          ref={birimFiyatRef}
          style={ROW_TEXT.price}
          value={satir.birimFiyat || undefined}
          min={0}
          step={0.01}
          onChange={(value) => onGuncelle('birimFiyat', value ?? 0)}
          formatter={(value) => (value != null ? String(value).replace('.', ',') : '')}
          parser={(value) => Number((value ?? '').replace(',', '.')) as any}
          placeholder="0,00"
          onFocus={(e) => (e.target as HTMLInputElement).select?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleEnterNav('birimFiyat');
            }
          }}
        />
      </RowCell>

      <RowCell idx={idx} pos="mid">
        <span style={ROW_TEXT.total}>
          {satir.satirToplami !== 0
            ? `${formatDisplayNumber(satir.satirToplami, 2, 2)}${satirBazliParaBirimi ? ` ${formatParaBirimiLabel(satirPb)}` : ''}`
            : '—'}
        </span>
      </RowCell>

      <RowCell idx={idx} pos="last" style={{ position: 'relative' }}>
        <InlineTableSelectField
          ref={teslimatRef}
          style={ROW_TEXT.delivery}
          value={satir.teslimTarihi || undefined}
          onChange={(value) => onGuncelle('teslimTarihi', value)}
          options={teslimSecenekleri.map((teslimat) => ({ value: teslimat, label: teslimat }))}
          placeholder="—"
          popupMatchSelectWidth={false}
          dropdownStyle={{ minWidth: 150 }}
        />

        <div className="satir-aksiyonlari" style={floatingPanelStyle}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', padding: '0 2px' }}>
            {(['TRY', 'EUR', 'USD'] as const).map((pb) => {
              const active = satirPb === pb;
              return (
                <span
                  key={pb}
                  onClick={(e) => {
                    e.stopPropagation();
                    onGuncelle('paraBirimi', pb);
                    if (!satirBazliParaBirimi) onSatirBazliDegistir?.(true);
                  }}
                  style={{
                    cursor: 'pointer',
                    fontSize: '9px',
                    fontWeight: active ? 800 : 500,
                    color: active ? C.accent : C.textMuted,
                    background: active ? 'rgba(37,99,235,0.08)' : 'transparent',
                    borderRadius: '3px',
                    padding: '2px 5px',
                    lineHeight: 1,
                    transition: 'all 0.12s',
                    opacity: active ? 1 : 0.6,
                    letterSpacing: '0.01em',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.opacity = '0.6';
                  }}
                  title={`Para birimi: ${formatParaBirimiLabel(pb)}`}
                >
                  {SEMBOL[pb]}
                </span>
              );
            })}
          </span>

          <span style={{ width: '0.75px', height: 14, background: C.borderSoft, flexShrink: 0 }} />

          <span style={{ ...actionBtnStyle, color: C.textMid }}>
            <PercentageOutlined style={{ fontSize: 9 }} />
            <InlineTableNumberField
              style={{ width: 32, fontSize: '9.5px', fontWeight: 700, textAlign: 'center', padding: 0 }}
              value={satir.indirimOrani}
              min={0}
              max={100}
              step={1}
              onChange={(value) => onGuncelle('indirimOrani', value ?? 0)}
              onFocus={(e) => (e.target as HTMLInputElement).select?.()}
            />
          </span>

          <span style={{ width: '0.75px', height: 14, background: C.borderSoft, flexShrink: 0 }} />

          <span
            onClick={(e) => {
              e.stopPropagation();
              onArayaEkle();
            }}
            style={{ ...actionBtnStyle, color: C.accent }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16,40,88,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <PlusOutlined style={{ fontSize: 8 }} /> Ekle
          </span>

          <span style={{ width: '0.75px', height: 14, background: C.borderSoft, flexShrink: 0 }} />

          <span
            onClick={(e) => {
              e.stopPropagation();
              onSil();
            }}
            style={{ ...actionBtnStyle, color: '#b91c1c', opacity: 0.7 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(185,28,28,0.06)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.opacity = '0.7';
            }}
          >
            <DeleteOutlined style={{ fontSize: 8 }} /> Sil
          </span>
        </div>
      </RowCell>
    </tr>
  );
}
