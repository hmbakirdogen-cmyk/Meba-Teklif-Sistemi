/**
 * BelgeInlineEditor.tsx
 * Teklif belgesi üzerinde doğrudan düzenleme.
 * PDF pipeline için kullanılmaz — yalnızca ekran görünümü.
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Select, AutoComplete, Input, InputNumber, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Teklif, Cari, TeklifSatiri, TeklifDurum } from '../types';
import { formatDate, formatDisplayNumber, formatTitleCaseTr, stripParantez, formatCariAdi } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';
import { FinansalOzetKartIci } from './FinansalOzetKartIci';
import { cariService } from '../services/musteriService';
import { referansVeriService } from '../services/referansVeriService';
import { urunService } from '../services/urunService';
import {
  CELL_PAD as DOC_CELL_PAD,
  DOCUMENT_ROOT_STYLE,
  FOOTER_BAR_STYLE,
  NOTES_BOX_STYLE,
  PARTY_BODY_STYLE,
  PARTY_CARD_STYLE,
  PARTY_GRID_STYLE,
  PARTY_LABEL_STYLE,
  PARTY_NAME_STYLE,
  SETTINGS_GRID_STYLE,
  SIGNATURE_SECTION_STYLE,
  TABLE_HEAD_SUBLABEL_STYLE,
  TABLE_STYLE,
  TABLE_TITLE_STYLE,
  getTableHeadCellStyle,
} from '../templates/teklifDocumentShared';

const PARA_BIRIMI_ETIKETI: Record<string, string> = { TRY: 'TL', EUR: 'EUR', USD: 'USD' };
function firstLine(text: string): string {
  return text.split(/\r?\n/)[0]?.trim() ?? '';
}
const SEMBOL: Record<string, string> = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', CHF: '₣' };

const BRAND = {
  g:         'linear-gradient(180deg, #1E3350 0%, #152740 55%, #0F1D30 100%)',
  border:    '#0E1A2E',
  shadow:    '0 2px 8px rgba(15,25,40,0.10)',
  shadowSm:  '0 1px 4px rgba(15,25,40,0.08)',
  text:      '#ffffff',
  textSub:   'rgba(255,255,255,0.80)',
  textLabel: 'rgba(255,255,255,0.58)',
  sep:       'rgba(255,255,255,0.15)',
} as const;

const C = {
  navy:        '#1A2B42',
  navyLight:   '#2E4460',
  navyBorder:  '#D5D3CF',
  accent:      '#1A2B42',
  border:      '#E2E0DC',
  borderSoft:  '#EDEBE8',
  rowAlt:      '#F7F6F4',
  text:        '#2C2C2E',
  textMid:     '#4A4A4E',
  textSoft:    '#717176',
  textMuted:   '#9B9BA0',
  white:       '#FAFAF8',
  bg:          '#F7F6F4',
  stripeBg:    '#F0EFEC',
  stripeText:  '#2C2C2E',
  stripeSub:   '#4A4A4E',
  stripeSep:   '#E2E0DC',
};

// ══ UNIFIED COLUMN SYSTEM — always 8 columns ══
// Para birimi sütunu tablodan kaldırıldı; action bar'a taşındı.
const COL = {
  no:         '4%',
  marka:      '9%',
  urunKod:    '14%',
  aciklama:   '28%',
  miktar:     '9%',
  birimFiyat: '13%',
  toplam:     '13%',
  teslimat:   '10%',
} as const;

const noBreak: React.CSSProperties = {
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
};

const ROW_CARD = {
  bg:        '#FFFFFF',
  borderClr: '#E8E6E3',
  radius:    '6px',
  shadow:    '0 1px 2px rgba(0,0,0,0.03)',
} as const;

type CellPos = 'first' | 'mid' | 'last';
function rcCell(pos: CellPos, idx: number = 0): React.CSSProperties {
  const b = `0.75px solid ${ROW_CARD.borderClr}`;
  const r = ROW_CARD.radius;
  return {
    background:              idx % 2 === 0 ? ROW_CARD.bg : C.rowAlt,
    printColorAdjust:        'exact' as const,
    WebkitPrintColorAdjust:  'exact' as const,
    borderTop:               b,
    borderBottom:            b,
    borderLeft:              pos === 'first' ? b : 'none',
    borderRight:             pos === 'last'  ? b : 'none',
    borderTopLeftRadius:     pos === 'first' ? r : 0,
    borderBottomLeftRadius:  pos === 'first' ? r : 0,
    borderTopRightRadius:    pos === 'last'  ? r : 0,
    borderBottomRightRadius: pos === 'last'  ? r : 0,
    boxShadow:               pos === 'first' ? ROW_CARD.shadow : 'none',
  };
}

const LOGO = {
  PNG_AR:        1858 / 846,
  OPT_TOP_FRAC:  87 / 846,
  OPT_BOT_FRAC:  646 / 846,
  OPT_LEFT_FRAC: 82 / 1858,
  OPT_RIGHT_FRAC:1738 / 1858,
  FILE_HEIGHT:   128,
} as const;

const LOGO_FILE_W   = LOGO.FILE_HEIGHT * LOGO.PNG_AR;
const LOGO_OPT_H    = LOGO.FILE_HEIGHT * (LOGO.OPT_BOT_FRAC - LOGO.OPT_TOP_FRAC);
const LOGO_OPT_W    = LOGO_FILE_W      * (LOGO.OPT_RIGHT_FRAC - LOGO.OPT_LEFT_FRAC);
const LOGO_OPT_TOP  = -(LOGO.FILE_HEIGHT * LOGO.OPT_TOP_FRAC);
const LOGO_OPT_LEFT = -(LOGO_FILE_W      * LOGO.OPT_LEFT_FRAC);

// ══ UNIFIED FIELD SYSTEM ══
const FIELD = {
  activeOutline: '1px solid rgba(37, 99, 235, 0.18)',
  activeBg:      'rgba(237, 242, 251, 0.45)',
  radius:        '4px',
  transition:    'all 0.15s ease',
  focusLine:     'inset 0 -2px 0 rgba(37, 99, 235, 0.20)',
  caret:         '#1e40af',
} as const;

// ══ UNIFIED FIELD CSS ══
// Tüm hücreler aynı ghost görünüm sistemi.
// Ok ikonları (arrow, suffix) edit modunda tamamen gizlenir.
const FIELD_CSS = `
/* ═══ BASE ═══ */
.belge-inline .ant-select,
.belge-inline .ant-input,
.belge-inline .ant-input-number,
.belge-inline .ant-picker,
.belge-inline .ant-select-auto-complete {
  font-size: inherit !important;
  color: inherit !important;
  line-height: inherit !important;
}

/* ═══ CARET & SELECTION ═══ */
.belge-inline input,
.belge-inline textarea {
  caret-color: ${FIELD.caret} !important;
}
.belge-inline ::selection {
  background: rgba(37, 99, 235, 0.12);
}

/* ═══ SELECT: Ghost ═══ */
.belge-inline .ant-select-selector {
  padding: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  line-height: inherit !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  transition: none !important;
}
.belge-inline .ant-select-selection-item {
  padding-inline-end: 0 !important;
  padding-inline-start: 0 !important;
  line-height: inherit !important;
  font-size: inherit !important;
}
.belge-inline .ant-select-selection-search {
  inset-inline-start: 0 !important;
  inset-inline-end: 0 !important;
}
.belge-inline .ant-select-selection-search-input {
  height: auto !important;
}

/* ═══ SELECT: Tüm ok ve suffix ikonları gizli ═══ */
.belge-inline .ant-select-arrow,
.belge-inline .ant-select-suffix,
.belge-inline .ant-select-clear {
  display: none !important;
}

/* ═══ PLACEHOLDER ═══ */
.belge-inline .ant-select-selection-placeholder {
  color: #94a3b8 !important;
  opacity: 0.65 !important;
  font-style: italic !important;
  inset-inline-start: 0 !important;
}
.belge-inline .ant-input::placeholder,
.belge-inline .ant-input-number-input::placeholder,
.belge-inline .ant-picker-input > input::placeholder,
.belge-inline textarea.ant-input::placeholder {
  color: #94a3b8 !important;
  opacity: 0.65 !important;
  font-style: italic !important;
}

/* ═══ INPUT: Ghost ═══ */
.belge-inline .ant-input {
  padding: 0 !important;
  height: auto !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* ═══ INPUT NUMBER: Ghost ═══ */
.belge-inline .ant-input-number {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.belge-inline .ant-input-number-input {
  padding: 0 !important;
  height: auto !important;
  text-align: inherit !important;
}
.belge-inline .ant-input-number-handler-wrap {
  display: none !important;
}

/* ═══ AUTOCOMPLETE ═══ */
.belge-inline .ant-select-auto-complete .ant-select-selector {
  padding: 0 !important;
}
.belge-inline .ant-select-auto-complete .ant-select-selection-search-input {
  height: auto !important;
}
.belge-inline .ant-select-auto-complete .ant-select-selection-placeholder {
  inset-inline-start: 0 !important;
}

/* ═══ DATEPICKER: Ghost ═══ */
.belge-inline .ant-picker {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.belge-inline .ant-picker-input > input {
  font-size: inherit !important;
}
.belge-inline .ant-picker-suffix,
.belge-inline .ant-picker-clear {
  display: none !important;
}

/* ═══ TEXTAREA: Ghost ═══ */
.belge-inline textarea.ant-input {
  resize: none !important;
}

/* ═══ FOCUS: Tablo hücreleri ═══ */
.belge-inline tr[data-editing] td:focus-within {
  box-shadow: ${FIELD.focusLine} !important;
}

/* ═══ FOCUS: Alan grupları ═══ */
.belge-inline .field-group .ant-input:focus,
.belge-inline .field-group textarea.ant-input:focus {
  box-shadow: ${FIELD.focusLine} !important;
  border-radius: 0 !important;
}
.belge-inline .field-group .ant-select-focused .ant-select-selector {
  box-shadow: ${FIELD.focusLine} !important;
  border-radius: 0 !important;
}
.belge-inline .field-group .ant-input-number-focused {
  box-shadow: ${FIELD.focusLine} !important;
  border-radius: 0 !important;
}

/* ═══ CHECKBOX ═══ */
.belge-inline input[type="checkbox"] {
  accent-color: ${FIELD.caret};
}
`;

export type EditingAlan =
  | 'musteri'
  | 'ayarlar'
  | `satir-${string}`
  | 'notlar'
  | null;

interface BelgeInlineEditorProps {
  teklif: Teklif;
  totals: TeklifToplam;
  editingAlan: EditingAlan;
  onEditingAlanDegistir: (alan: EditingAlan) => void;
  onCariDegistir: (cari: Cari) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM') => void;
  onTarihDegistir: (tarih: string) => void;
  onParaBirimiDegistir: (pb: string) => void;
  satirBazliParaBirimi: boolean;
  onSatirBazliDegistir: (aktif: boolean) => void;
  onDurumDegistir: (durum: TeklifDurum) => void;
  onKdvOraniDegistir: (oran: number) => void;
  onIskontoOraniDegistir: (oran: number) => void;
  onOdemeVadesiDegistir: (vade: string) => void;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;
  onNotlarDegistir: (notlar: string) => void;
  yeniTeklif?: boolean;
}

// ── 8 sütun, sabit ──
function TableColgroup() {
  return (
    <colgroup>
      <col style={{ width: COL.no }} />
      <col style={{ width: COL.marka }} />
      <col style={{ width: COL.urunKod }} />
      <col style={{ width: COL.aciklama }} />
      <col style={{ width: COL.miktar }} />
      <col style={{ width: COL.birimFiyat }} />
      <col style={{ width: COL.toplam }} />
      <col style={{ width: COL.teslimat }} />
    </colgroup>
  );
}

function InlineCariSecimi({ onSec }: { onSec: (cari: Cari) => void }) {
  const [searchText, setSearchText] = useState('');
  const cariler = useMemo(() => cariService.tumCarileriGetir(), []);
  const options = useMemo(() => cariler.map(c => ({
    value: c.id,
    label: (
      <span>
        <span style={{ color: '#94a3b8', fontSize: 10, marginRight: 6, fontVariantNumeric: 'tabular-nums' }}>[{c.cariKod}]</span>
        <span style={{ fontWeight: 500 }}>{formatCariAdi(c.firmaAdi)}</span>
      </span>
    ),
    searchText: `${c.firmaAdi} ${c.cariKod}`.toLowerCase(),
  })), [cariler]);

  return (
    <AutoComplete
      autoFocus
      variant="borderless"
      value={searchText}
      onChange={setSearchText}
      style={{ width: '100%', maxWidth: 340 }}
      placeholder="Firma adı veya cari kod ile arayın..."
      options={options}
      filterOption={(input, option) =>
        option?.searchText?.includes(input.toLowerCase()) ?? false
      }
      onSelect={(id: string) => {
        const cari = cariler.find(c => c.id === id);
        if (cari) {
          setSearchText(formatCariAdi(cari.firmaAdi));
          onSec(cari);
        }
      }}
      size="small"
      popupMatchSelectWidth={340}
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  INLINE SATIR EDİTÖRÜ
//
//  Değişiklikler:
//  - Para birimi sütunu kaldırıldı → action bar'a taşındı
//  - focusCell prop: hangi hücreye odaklanılacağını belirler
//  - Enter tuşu: soldan sağa hücre navigasyonu, son hücrede yeni satır
//  - Metin bozulması yok: urunAdi raw değeriyle gösterilir
//  - suffixIcon={null}: edit modunda ok ikon görünmez
//  - onFocus select-all: hücreye girilince mevcut değer seçilir
// ══════════════════════════════════════════════════════════════════

type FocusCell = 'marka' | 'urunKod' | 'aciklama' | 'miktar' | 'birimFiyat' | 'teslimat';
const CELL_NAV_ORDER: FocusCell[] = ['urunKod', 'aciklama', 'miktar', 'birimFiyat', 'teslimat'];

function InlineSatirEditor({
  satir,
  idx,
  paraBirimi,
  satirBazliParaBirimi,
  focusCell,
  onGuncelle,
  onSil,
  onEkle,
}: {
  satir: TeklifSatiri;
  idx: number;
  paraBirimi: string;
  satirBazliParaBirimi: boolean;
  focusCell?: string;
  onGuncelle: (alan: keyof TeklifSatiri, deger: unknown) => void;
  onSil: () => void;
  onEkle: () => void;
}) {
  const markalar        = useMemo(() => referansVeriService.markalar.tumunuGetir(), []);
  const birimler        = useMemo(() => referansVeriService.birimler.tumunuGetir(), []);
  const teslimSecenekleri = useMemo(() => referansVeriService.teslimSecenekleri.tumunuGetir(), []);
  const urunler         = useMemo(() => urunService.tumUrunleriGetir(), []);
  const satirPb         = hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi);

  // ── Hücre referansları ──
  const markaRef      = useRef<any>(null);
  const urunKodRef    = useRef<any>(null);
  const aciklamaRef   = useRef<HTMLInputElement>(null);
  const miktarRef     = useRef<any>(null);
  const birimFiyatRef = useRef<any>(null);
  const teslimatRef   = useRef<any>(null);

  const FOCUS_MAP = useMemo<Record<string, React.RefObject<any>>>(() => ({
    marka:      markaRef,
    urunKod:    urunKodRef,
    aciklama:   aciklamaRef,
    miktar:     miktarRef,
    birimFiyat: birimFiyatRef,
    teslimat:   teslimatRef,
  }), []);

  // ── İlk odak: mount'ta focusCell prop'a göre ──
  useEffect(() => {
    const ref = (focusCell && FOCUS_MAP[focusCell]) ?? urunKodRef;
    const timer = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      if (typeof el.focus === 'function') el.focus();
      const input: HTMLInputElement | null =
        typeof el.querySelector === 'function'
          ? el.querySelector('input')
          : el.nodeName === 'INPUT' ? el : null;
      input?.select?.();
    }, 50);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Programatik odak ──
  const focusByName = useCallback((cell: string) => {
    const ref = FOCUS_MAP[cell];
    if (!ref) return;
    setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      if (typeof el.focus === 'function') el.focus();
      const input: HTMLInputElement | null =
        typeof el.querySelector === 'function'
          ? el.querySelector('input')
          : el.nodeName === 'INPUT' ? el : null;
      input?.select?.();
    }, 0);
  }, [FOCUS_MAP]);

  // ── Enter: sonraki hücreye geç, son hücreden yeni satır ──
  const handleEnterNav = useCallback((currentCell: FocusCell) => {
    const i = CELL_NAV_ORDER.indexOf(currentCell);
    if (i < CELL_NAV_ORDER.length - 1) {
      focusByName(CELL_NAV_ORDER[i + 1]);
    } else {
      onEkle();
    }
  }, [focusByName, onEkle]);

  const urunKodOptions = useMemo(() =>
    urunler.map(u => ({ value: u.urunKod, label: `${u.urunKod} — ${u.urunAdi}` })),
  [urunler]);

  const handleUrunKodSec = (kod: string) => {
    onGuncelle('urunKod', kod);
    const urun = urunler.find(u => u.urunKod === kod);
    if (urun) {
      if (!satir.urunAdi)    onGuncelle('urunAdi',     urun.urunAdi);
      if (urun.varsayilanFiyat && !satir.birimFiyat) onGuncelle('birimFiyat', urun.varsayilanFiyat);
      if (urun.birim)        onGuncelle('birim',       urun.birim);
    }
    setTimeout(() => focusByName('aciklama'), 100);
  };

  const editBg  = idx % 2 === 0 ? '#fafbfe' : '#f3f6fc';
  const cellSep = `1px solid rgba(154, 184, 212, 0.35)`;

  const cell = (pos: CellPos, extra?: React.CSSProperties): React.CSSProperties => ({
    ...rcCell(pos, idx),
    padding: DOC_CELL_PAD,
    verticalAlign: 'middle',
    fontSize: '11px',
    background: editBg,
    borderRight: pos === 'last' ? rcCell(pos, idx).borderRight : cellSep,
    ...extra,
  });

  return (
    <>
      {/* ── Ana düzenleme satırı ── */}
      <tr data-editing style={{ ...noBreak }}>

        {/* # */}
        <td style={cell('first', { textAlign: 'center', color: C.textMuted, whiteSpace: 'nowrap' })}>
          {String(idx + 1).padStart(2, '0')}
        </td>

        {/* Marka */}
        <td style={cell('mid', { textAlign: 'center', color: C.textMid })}>
          <Select
            ref={markaRef}
            size="small"
            variant="borderless"
            suffixIcon={null}
            style={{ width: '100%', textAlign: 'center' }}
            value={satir.marka || undefined}
            onChange={(v) => { onGuncelle('marka', v); setTimeout(() => focusByName('urunKod'), 50); }}
            options={markalar.map(m => ({ value: m, label: m }))}
            placeholder="—"
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 130 }}
          />
        </td>

        {/* Ürün Kodu */}
        <td style={cell('mid', { fontWeight: 600, color: C.accent })}>
          <AutoComplete
            ref={urunKodRef}
            size="small"
            variant="borderless"
            style={{ width: '100%', fontWeight: 600 }}
            value={satir.urunKod}
            onChange={(v) => onGuncelle('urunKod', v)}
            onSelect={handleUrunKodSec}
            options={urunKodOptions}
            filterOption={(input, option) =>
              option?.value?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
            }
            placeholder="ürün kodu"
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 300 }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                const dropdown = document.querySelector('.ant-select-dropdown:not([style*="display: none"])');
                if (!dropdown) { e.preventDefault(); handleEnterNav('urunKod'); }
              }
            }}
          />
        </td>

        {/* Açıklama — raw değer, dönüşüm yok */}
        <td style={cell('mid', { fontWeight: 500, color: C.textMid })}>
          <Input
            ref={aciklamaRef as any}
            size="small"
            variant="borderless"
            style={{ width: '100%', fontWeight: 500 }}
            value={satir.urunAdi}
            onChange={(e) => onGuncelle('urunAdi', e.target.value)}
            placeholder="açıklama"
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleEnterNav('aciklama'); }
            }}
          />
        </td>

        {/* Miktar + Birim */}
        <td style={cell('mid', { color: C.textMid, whiteSpace: 'nowrap' })}>
          <div style={{ display: 'flex', alignItems: 'baseline', width: '100%' }}>
            <InputNumber
              ref={miktarRef}
              size="small"
              variant="borderless"
              style={{ flex: 1, minWidth: 0, fontWeight: 600, textAlign: 'right', paddingRight: 4 }}
              value={satir.miktar}
              min={0}
              onChange={(v) => onGuncelle('miktar', v ?? 0)}
              controls={false}
              onFocus={(e) => (e.target as HTMLInputElement).select?.()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleEnterNav('miktar'); }
              }}
            />
            <Select
              size="small"
              variant="borderless"
              suffixIcon={null}
              style={{ flex: '0 0 auto', width: 40, fontSize: '9px', color: C.textMuted, opacity: 0.72 }}
              value={satir.birim || 'Adet'}
              onChange={(v) => onGuncelle('birim', v)}
              options={birimler.map(b => ({ value: b, label: /^adet$/i.test(b) ? 'Ad.' : b }))}
              popupMatchSelectWidth={false}
              dropdownStyle={{ minWidth: 90 }}
            />
          </div>
        </td>

        {/* Birim Fiyat */}
        <td style={cell('mid', { textAlign: 'right', color: C.textMid, fontVariantNumeric: 'tabular-nums' })}>
          <InputNumber
            ref={birimFiyatRef}
            size="small"
            variant="borderless"
            style={{ width: '100%', textAlign: 'right', fontWeight: 600, paddingRight: 2 }}
            value={satir.birimFiyat || undefined}
            min={0}
            step={0.01}
            onChange={(v) => onGuncelle('birimFiyat', v ?? 0)}
            controls={false}
            formatter={(v) => v != null ? String(v).replace('.', ',') : ''}
            parser={(v) => Number((v ?? '').replace(',', '.')) as any}
            placeholder="0,00"
            onFocus={(e) => (e.target as HTMLInputElement).select?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleEnterNav('birimFiyat'); }
            }}
          />
        </td>

        {/* Satır Toplam — hesaplanan, salt okunur */}
        <td style={cell('mid', { textAlign: 'right', fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' })}>
          {satir.satirToplami !== 0
            ? `${formatDisplayNumber(satir.satirToplami, 2, 2)}${satirBazliParaBirimi ? ` ${PARA_BIRIMI_ETIKETI[satirPb]}` : ''}`
            : '—'}
        </td>

        {/* Teslimat */}
        <td style={cell('last', { textAlign: 'center', color: C.textSoft })}>
          <Select
            ref={teslimatRef}
            size="small"
            variant="borderless"
            suffixIcon={null}
            style={{ width: '100%', textAlign: 'center' }}
            value={satir.teslimTarihi || undefined}
            onChange={(v) => onGuncelle('teslimTarihi', v)}
            options={teslimSecenekleri.map(t => ({ value: t, label: t }))}
            placeholder="—"
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 150 }}
          />
        </td>
      </tr>

      {/* ── Aksiyon çubuğu ── */}
      <tr>
        <td colSpan={8} style={{ padding: 0, border: 'none', background: 'transparent' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '3px 8px 4px',
            fontSize: '10px',
            color: C.textMuted,
            borderTop: `0.5px dashed ${C.borderSoft}`,
          }}>
            {/* Satır ekle */}
            <span
              onClick={(e) => { e.stopPropagation(); onEkle(); }}
              style={{
                cursor: 'pointer', color: C.accent, fontWeight: 600, fontSize: '10px',
                display: 'inline-flex', alignItems: 'center', gap: 3, userSelect: 'none',
                whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: 3,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16,40,88,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <PlusOutlined style={{ fontSize: 9 }} /> Satır ekle
            </span>

            <span style={{ flex: 1 }} />

            {/* İskonto */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>İskonto %</span>
              <InputNumber
                size="small"
                variant="borderless"
                style={{ width: 36, fontSize: '10px', fontWeight: 600, textAlign: 'center' }}
                value={satir.indirimOrani}
                min={0} max={100} step={1}
                onChange={(v) => onGuncelle('indirimOrani', v ?? 0)}
                controls={false}
                onFocus={(e) => (e.target as HTMLInputElement).select?.()}
              />
            </span>

            {/* Para birimi — satır bazlı modda action bar'da gösterilir */}
            {satirBazliParaBirimi && (
              <>
                <span style={{ margin: '0 8px', color: C.borderSoft, userSelect: 'none' }}>|</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>Para Birimi</span>
                  <Select
                    size="small"
                    variant="borderless"
                    suffixIcon={null}
                    style={{ width: 54, fontSize: '10px', fontWeight: 700 }}
                    value={satirPb}
                    onChange={(v) => onGuncelle('paraBirimi', v)}
                    options={[
                      { value: 'TRY', label: 'TL' },
                      { value: 'EUR', label: 'EUR' },
                      { value: 'USD', label: 'USD' },
                    ]}
                    popupMatchSelectWidth={false}
                    dropdownStyle={{ minWidth: 80 }}
                  />
                </span>
              </>
            )}

            {/* Sil */}
            <span
              onClick={(e) => { e.stopPropagation(); onSil(); }}
              style={{
                cursor: 'pointer', color: '#b91c1c', fontWeight: 500, fontSize: '10px',
                display: 'inline-flex', alignItems: 'center', gap: 3, userSelect: 'none',
                whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: 3,
                transition: 'background 0.15s, opacity 0.15s', opacity: 0.7,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(185,28,28,0.06)'; e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = '0.7'; }}
            >
              <DeleteOutlined style={{ fontSize: 9 }} /> Sil
            </span>
          </div>
        </td>
      </tr>
    </>
  );
}


export default function BelgeInlineEditor({
  teklif,
  totals,
  editingAlan,
  onEditingAlanDegistir,
  onCariDegistir,
  contactName,
  contactTitle,
  onContactNameDegistir,
  onContactTitleDegistir,
  onTarihDegistir,
  onParaBirimiDegistir,
  satirBazliParaBirimi,
  onSatirBazliDegistir,
  onDurumDegistir: _onDurumDegistir,
  onKdvOraniDegistir,
  onIskontoOraniDegistir: _onIskontoOraniDegistir,
  onOdemeVadesiDegistir,
  onSatirGuncelle,
  onSatirSil,
  onSatirEkle,
  onNotlarDegistir,
  yeniTeklif: _yeniTeklif,
}: BelgeInlineEditorProps) {
  const sembol = SEMBOL[teklif.paraBirimi] ?? teklif.paraBirimi;
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;
  const satirParaToplamlari = hesaplamaMotoru.paraBirimineGoreToplamlar(teklif.satirlar, teklif.paraBirimi);
  const kullanilanParaKartlari = (['TRY', 'EUR', 'USD'] as const)
    .filter((pb) => teklif.satirlar.some((s) => hesaplamaMotoru.satirParaBirimiGetir(s, teklif.paraBirimi) === pb))
    .map((pb) => {
      const hesap = hesaplamaMotoru.teklifToplamlariniHesapla({
        araToplam: satirParaToplamlari[pb],
        kdvOrani,
        iskontoOrani,
      });
      return { pb, short: PARA_BIRIMI_ETIKETI[pb], araToplam: hesap.araToplam, iskontoTutar: hesap.iskontoTutar, kdvTutar: hesap.kdvTutar, total: hesap.genelToplam };
    });

  const muhatapSatiri = teklif.contactName?.trim()
    ? `${formatTitleCaseTr(teklif.contactName.trim())} ${teklif.contactTitle === 'HANIM' ? 'Hanım' : 'Bey'}`
    : (teklif.cari.yetkiliKisi || null);

  // ── Hangi satır alanı aktif ──
  const isMusteriEditing  = editingAlan === 'musteri';
  const isAyarlarEditing  = editingAlan === 'ayarlar';
  const isNotlarEditing   = editingAlan === 'notlar';
  const editingSatirId    = editingAlan?.startsWith('satir-') ? editingAlan.slice(6) : null;

  // ── Satır bazlı odak: hangi hücreye ilk odaklanılacak ──
  const [satirFocusCell, setSatirFocusCell] = useState<string>('urunKod');

  // ── Satır hücresine tıklama: hem satırı açar hem doğru hücreye odaklar ──
  const handleSatirCellClick = useCallback(
    (satirId: string, cell: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      setSatirFocusCell(cell);
      onEditingAlanDegistir(`satir-${satirId}`);
    },
    [onEditingAlanDegistir],
  );

  const handleAlanClick = (alan: EditingAlan, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingAlan !== alan) onEditingAlanDegistir(alan);
  };

  const editFrameStyle = (isActive: boolean): React.CSSProperties => ({
    transition: FIELD.transition,
    borderRadius: FIELD.radius,
    outline:    isActive ? FIELD.activeOutline : undefined,
    background: isActive ? FIELD.activeBg : undefined,
    cursor:     isActive ? 'default' : 'pointer',
  });

  return (
    <div
      id="teklif-sablon"
      className="belge-inline"
      style={{ ...DOCUMENT_ROOT_STYLE } as React.CSSProperties}
    >
      <style>{FIELD_CSS}</style>

      <div style={{ flex: 1 }}>

      {/* ══ HEADER ══ */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        width: '100%',
        height: `${LOGO_OPT_H}px`,
        marginBottom: '10px',
        ...noBreak,
      }}>
        {/* Logo */}
        <div style={{ flex: '0 0 37%', maxWidth: '37%', paddingRight: '8px', boxSizing: 'border-box', lineHeight: 0 }}>
          <div style={{ position: 'relative', width: `${LOGO_OPT_W}px`, height: `${LOGO_OPT_H}px`, overflow: 'hidden' }}>
            <img src="/logo-meba.png" alt="MEBA Mekanik" style={{
              position: 'absolute', top: `${LOGO_OPT_TOP}px`, left: `${LOGO_OPT_LEFT}px`,
              width: `${LOGO_FILE_W}px`, height: `${LOGO.FILE_HEIGHT}px`,
              maxWidth: 'none', maxHeight: 'none', display: 'block',
              imageRendering: 'high-quality' as any,
              printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
            }} />
          </div>
        </div>
        {/* Firma bilgileri */}
        <div style={{ flex: '0 0 31%', maxWidth: '31%', paddingRight: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <div style={{ fontWeight: 800, fontSize: '11.5px', color: C.navy, lineHeight: '1.25', letterSpacing: '-0.012em' }}>
            MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik<br />San. Tic. Ltd. Şti.
          </div>
          <div style={{ fontSize: '9.2px', lineHeight: '1.35', color: C.textSoft, letterSpacing: '0.01em' }}>
            Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv.<br />No:252/D Melikgazi / KAYSERİ
          </div>
        </div>
        {/* Teklif bilgi bloğu */}
        <div style={{ flex: '0 0 32%', maxWidth: '32%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', boxSizing: 'border-box' }}>
          <div style={{ width: '202px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', boxSizing: 'border-box' }}>
            <div style={{
              background: BRAND.g, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
              padding: '5px 14px 6px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              lineHeight: 1.2, borderRadius: '9px', border: `1px solid ${BRAND.border}`, boxShadow: BRAND.shadowSm,
            }}>
              <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.8px', color: BRAND.text }}>TEKLİF</span>
              <span style={{ fontSize: '10.4px', color: BRAND.textSub, letterSpacing: '0.02em' }}>/ Quotation</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <colgroup><col style={{ width: '42%' }} /><col style={{ width: '58%' }} /></colgroup>
              <tbody>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '2px 0 1px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Teklif No</td>
                  <td style={{ fontSize: '12.1px', fontWeight: 800, color: C.navy, padding: '2px 0 1px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>{teklif.teklifNo}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Tarih</td>
                  <td style={{ fontSize: '10.9px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {isAyarlarEditing ? (
                      <DatePicker
                        size="small"
                        variant="borderless"
                        value={dayjs(teklif.tarih)}
                        onChange={(d) => d && onTarihDegistir(d.format('YYYY-MM-DD'))}
                        format="DD.MM.YYYY"
                        style={{ fontSize: '10.9px', padding: 0, width: 110 }}
                        allowClear={false}
                      />
                    ) : formatDate(teklif.tarih)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: 0, lineHeight: 1.2, letterSpacing: '0.04em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '10px', fontWeight: 400, color: C.textSoft, padding: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teklif.hazirlayanAdSoyad || 'MEBA Mekanik'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══ GÖNDEREN / ALICI ══ */}
      <div style={PARTY_GRID_STYLE}>
        <div style={PARTY_CARD_STYLE}>
          <div style={PARTY_LABEL_STYLE}>
            Gönderen <span style={{ fontWeight: 400, opacity: 0.6 }}>/ From</span>
          </div>
          <div style={PARTY_NAME_STYLE}>MEBA Mekanik Ltd. Şti.</div>
          <div style={PARTY_BODY_STYLE}>Tel: {formatPhone('03525020780')}<br />www.mebamekanik.com</div>
        </div>
        <div
          data-alan="musteri"
          onClick={(e) => handleAlanClick('musteri', e)}
          style={{ ...PARTY_CARD_STYLE, ...editFrameStyle(isMusteriEditing) }}
        >
          <div style={PARTY_LABEL_STYLE}>
            Alıcı <span style={{ fontWeight: 400, opacity: 0.6 }}>/ To</span>
          </div>
          {isMusteriEditing ? (
            <div className="field-group" style={{ padding: '2px 0' }}>
              <InlineCariSecimi onSec={(cari) => { onCariDegistir(cari); }} />
              <div style={{ ...PARTY_NAME_STYLE, marginTop: 8 }}>
                {formatCariAdi(teklif.cari.firmaAdi)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '11.5px', color: C.textMid }}>
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>Sayın</span>
                <Input
                  size="small"
                  variant="borderless"
                  style={{ flex: 1, fontSize: '11.5px', fontWeight: 500, maxWidth: 160 }}
                  value={contactName}
                  onChange={(e) => onContactNameDegistir(e.target.value)}
                  placeholder="muhatap adı"
                  onFocus={(e) => e.target.select()}
                />
                <Select
                  size="small"
                  variant="borderless"
                  suffixIcon={null}
                  style={{ width: 72, fontSize: '11.5px' }}
                  value={contactTitle}
                  onChange={onContactTitleDegistir}
                  options={[{ value: 'BEY', label: 'Bey' }, { value: 'HANIM', label: 'Hanım' }]}
                  popupMatchSelectWidth={false}
                  dropdownStyle={{ minWidth: 90 }}
                />
              </div>
              <div style={{ ...PARTY_BODY_STYLE, marginTop: 6 }}>
                {(teklif.cari.telefon || teklif.cari.ePosta) && (
                  <div>
                    {teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>}
                    {teklif.cari.telefon && teklif.cari.ePosta && <span> &nbsp;|&nbsp; </span>}
                    {teklif.cari.ePosta && <span>{teklif.cari.ePosta}</span>}
                  </div>
                )}
                {teklif.cari.vergiNo && (
                  <div>VKN: {teklif.cari.vergiNo}{teklif.cari.vergiDairesi && <span> &nbsp;—&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}</div>
                )}
                {teklif.cari.adres && <div>{teklif.cari.adres}</div>}
              </div>
            </div>
          ) : (
            <>
              <div style={PARTY_NAME_STYLE}>{formatCariAdi(teklif.cari.firmaAdi)}</div>
              <div style={PARTY_BODY_STYLE}>
                {muhatapSatiri && <div style={{ fontWeight: '500', marginBottom: '1px' }}>Sayın {muhatapSatiri}</div>}
                {(teklif.cari.telefon || teklif.cari.ePosta) && (
                  <div>
                    {teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>}
                    {teklif.cari.telefon && teklif.cari.ePosta && <span> &nbsp;|&nbsp; </span>}
                    {teklif.cari.ePosta && <span>{teklif.cari.ePosta}</span>}
                  </div>
                )}
                {teklif.cari.vergiNo && (
                  <div>VKN: {teklif.cari.vergiNo}{teklif.cari.vergiDairesi && <span> &nbsp;—&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}</div>
                )}
                {teklif.cari.adres && <div>{teklif.cari.adres}</div>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ AYARLAR ══ */}
      <div
        data-alan="ayarlar"
        onClick={(e) => handleAlanClick('ayarlar', e)}
        style={{ ...SETTINGS_GRID_STYLE, ...editFrameStyle(isAyarlarEditing) }}
      >
        {(() => {
          const items = [
            { tr: 'Para Birimi', en: 'Currency', value: satirBazliParaBirimi ? 'Satır Bazlı' : (sembol !== teklif.paraBirimi ? `${teklif.paraBirimi} (${sembol})` : teklif.paraBirimi) },
            { tr: 'Ödeme Vadesi', en: 'Payment', value: teklif.odemeVadesi || '45 Gün' },
            { tr: 'KDV Oranı', en: 'VAT', value: satirBazliParaBirimi ? 'Satır Bazlı' : (teklif.kdvOrani > 0 ? `%${teklif.kdvOrani}` : 'Hariç') },
            { tr: 'Kur', en: 'Exchange Rate', value: 'TCMB Fatura' },
            { tr: 'Geçerlilik', en: 'Validity', value: teklif.gecerlilikSuresi ?? '1 Hafta' },
          ];

          const cardBase: React.CSSProperties = {
            flex: 1,
            padding: '7px 8px 8px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #F8F7F5 0%, #F0EFEC 100%)',
            border: `0.75px solid ${C.border}`,
            borderRadius: '7px',
            boxShadow: 'none',
            minHeight: 50,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            printColorAdjust: 'exact' as const,
            WebkitPrintColorAdjust: 'exact' as const,
          };

          const labelStyle: React.CSSProperties = {
            fontSize: '9px',
            fontWeight: 700,
            color: C.textSoft,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            marginBottom: '3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          };

          const valueStyle: React.CSSProperties = {
            fontWeight: 700,
            fontSize: '12.5px',
            color: C.navy,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          };

          if (!isAyarlarEditing) {
            return items.map((item, i) => (
              <div key={i} style={cardBase}>
                <div style={labelStyle}>
                  {item.tr}<span style={{ fontWeight: 400, opacity: 0.55, fontSize: '8px' }}> / {item.en}</span>
                </div>
                <div style={valueStyle}>{item.value}</div>
              </div>
            ));
          }

          return items.map((item, i) => (
            <div key={i} className="field-group" style={cardBase}>
              <div style={{ ...labelStyle, marginBottom: '4px' }}>{item.tr}</div>
              {i === 0 && (
                <div>
                  <Select
                    size="small" variant="borderless" suffixIcon={null}
                    style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
                    value={teklif.paraBirimi}
                    onChange={onParaBirimiDegistir}
                    options={[{ value: 'TRY', label: 'TL' }, { value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }]}
                    popupMatchSelectWidth={100}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '8px', color: C.textMuted, marginTop: 2, justifyContent: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={satirBazliParaBirimi} onChange={(e) => onSatirBazliDegistir(e.target.checked)} style={{ width: 11, height: 11 }} />
                    Satır bazlı
                  </label>
                </div>
              )}
              {i === 1 && (
                <Select
                  size="small" variant="borderless" suffixIcon={null}
                  style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
                  value={teklif.odemeVadesi || '45 Gün'}
                  onChange={onOdemeVadesiDegistir}
                  options={['Peşin', '15 Gün', '30 Gün', '45 Gün', '60 Gün', '90 Gün'].map(v => ({ value: v, label: v }))}
                  popupMatchSelectWidth={100}
                />
              )}
              {i === 2 && (
                <Select
                  size="small" variant="borderless" suffixIcon={null}
                  style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
                  value={teklif.kdvOrani}
                  onChange={onKdvOraniDegistir}
                  options={[{ value: 0, label: 'Hariç' }, { value: 1, label: '%1' }, { value: 10, label: '%10' }, { value: 20, label: '%20' }]}
                  popupMatchSelectWidth={80}
                />
              )}
              {i === 3 && <div style={valueStyle}>TCMB Fatura</div>}
              {i === 4 && <div style={valueStyle}>{teklif.gecerlilikSuresi ?? '1 Hafta'}</div>}
            </div>
          ));
        })()}
      </div>

      {/* ══ TEKLİF KALEMLERİ ══ */}
      <div style={TABLE_TITLE_STYLE}>
        Teklif Kalemleri <span style={{ fontWeight: 400, opacity: 0.55 }}>/ Line Items</span>
      </div>
      <table style={{
        ...TABLE_STYLE,
        borderLeft: 'none', borderRight: 'none', marginBottom: '0px', tableLayout: 'fixed',
        printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}>
        <TableColgroup />
        <thead id="pdf-thead">
          <tr>
            {[
              { label: '#',           sub: '',           align: 'center' as const },
              { label: 'Marka',       sub: 'Brand',      align: 'center' as const },
              { label: 'Ürün Kodu',   sub: 'Item No',    align: 'left'   as const },
              { label: 'Açıklama',    sub: 'Description',align: 'left'   as const },
              { label: 'Miktar',      sub: 'Qty',        align: 'center' as const },
              { label: 'Birim Fiyat', sub: 'Unit Price', align: 'right'  as const },
              { label: 'Toplam',      sub: 'Total',      align: 'right'  as const },
              { label: 'Teslimat',    sub: 'Delivery',   align: 'center' as const },
            ].map((col, i) => (
              <th key={i} style={getTableHeadCellStyle(col.align)}>
                {col.label}
                {col.sub && (
                  <span style={{ ...TABLE_HEAD_SUBLABEL_STYLE, textAlign: col.align }}>
                    {col.sub}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr aria-hidden="true">
            <td colSpan={8} style={{ height: '4px', padding: 0, border: 'none', background: 'transparent' }} />
          </tr>

          {teklif.satirlar.map((satir, idx) => {
            const satirPb  = hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi);
            const isEditing = editingSatirId === satir.id;

            if (isEditing) {
              return (
                <InlineSatirEditor
                  key={satir.id}
                  satir={satir}
                  idx={idx}
                  paraBirimi={teklif.paraBirimi}
                  satirBazliParaBirimi={satirBazliParaBirimi}
                  focusCell={satirFocusCell}
                  onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                  onSil={() => onSatirSil(satir.id)}
                  onEkle={onSatirEkle}
                />
              );
            }

            // ── Statik satır — hücre bazlı tıklama ──
            const cellClick = (cell: string) => handleSatirCellClick(satir.id, cell);
            const tdBase: React.CSSProperties = { cursor: 'pointer' };

            return (
              <tr key={satir.id} data-satir-id={satir.id} style={{ ...noBreak }}>

                {/* # → urunKod odağı */}
                <td
                  onClick={cellClick('urunKod')}
                  style={{ ...tdBase, padding: DOC_CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: C.textMuted, whiteSpace: 'nowrap', ...rcCell('first', idx) }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </td>

                {/* Marka */}
                <td
                  onClick={cellClick('marka')}
                  style={{ ...tdBase, padding: DOC_CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'normal', wordBreak: 'break-word', ...rcCell('mid', idx) }}
                >
                  {satir.marka || '—'}
                </td>

                {/* Ürün Kodu */}
                <td
                  onClick={cellClick('urunKod')}
                  style={{ ...tdBase, padding: DOC_CELL_PAD, fontSize: '11px', fontWeight: 600, color: C.accent, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', verticalAlign: 'middle', letterSpacing: '-0.1px', ...rcCell('mid', idx) }}
                >
                  {satir.urunKod || '—'}
                </td>

                {/* Açıklama — display transform (stripParantez/firstLine) sadece görüntüde */}
                <td
                  onClick={cellClick('aciklama')}
                  style={{ ...tdBase, padding: DOC_CELL_PAD, fontSize: '11px', fontWeight: 500, color: C.textMid, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', verticalAlign: 'middle', lineHeight: 1.35, ...rcCell('mid', idx) }}
                >
                  {firstLine(stripParantez(satir.urunAdi)) || '—'}
                </td>

                {/* Miktar */}
                <td
                  onClick={cellClick('miktar')}
                  style={{ ...tdBase, padding: DOC_CELL_PAD, verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...rcCell('mid', idx) }}
                >
                  {satir.miktar !== 0 ? (
                    <div style={{ display: 'flex', width: '100%', alignItems: 'baseline' }}>
                      <span style={{ flex: 1, textAlign: 'right', paddingRight: '3px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{formatDisplayNumber(satir.miktar, 0, 4)}</span>
                      <span style={{ flex: '0 0 auto', textAlign: 'left', opacity: 0.55, fontSize: '0.85em' }}>{/^adet$/i.test(satir.birim?.trim() ?? '') || !satir.birim ? 'Ad.' : satir.birim}</span>
                    </div>
                  ) : '—'}
                </td>

                {/* Birim Fiyat */}
                <td
                  onClick={cellClick('birimFiyat')}
                  style={{ ...tdBase, padding: DOC_CELL_PAD, textAlign: 'right', verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...rcCell('mid', idx) }}
                >
                  {(() => {
                    const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                    return nihai !== 0
                      ? `${formatDisplayNumber(nihai, 2, 2)}${satirBazliParaBirimi ? ` ${PARA_BIRIMI_ETIKETI[satirPb]}` : ''}`
                      : '—';
                  })()}
                </td>

                {/* Toplam */}
                <td
                  onClick={cellClick('birimFiyat')}
                  style={{ ...tdBase, padding: DOC_CELL_PAD, textAlign: 'right', verticalAlign: 'middle', fontSize: '11px', fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...rcCell('mid', idx) }}
                >
                  {satir.satirToplami !== 0
                    ? `${formatDisplayNumber(satir.satirToplami, 2, 2)}${satirBazliParaBirimi ? ` ${PARA_BIRIMI_ETIKETI[satirPb]}` : ''}`
                    : '—'}
                </td>

                {/* Teslimat */}
                <td
                  onClick={cellClick('teslimat')}
                  style={{ ...tdBase, padding: DOC_CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '10.5px', color: C.textSoft, whiteSpace: 'normal', wordBreak: 'break-word', ...rcCell('last', idx) }}
                >
                  {satir.teslimTarihi || '—'}
                </td>
              </tr>
            );
          })}

          {/* Boş liste ipucu */}
          {teklif.satirlar.length === 0 && (
            <tr>
              <td
                colSpan={8}
                onClick={(e) => { e.stopPropagation(); onSatirEkle(); }}
                style={{
                  padding: '14px 7px', textAlign: 'center', fontSize: '11px', color: C.textMuted,
                  cursor: 'pointer', border: `1px dashed ${C.borderSoft}`, borderRadius: ROW_CARD.radius,
                  background: 'rgba(37, 99, 235, 0.02)', transition: 'background 0.15s',
                }}
              >
                <PlusOutlined style={{ marginRight: 6, fontSize: 11 }} />
                İlk kalem satırını eklemek için tıklayın
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ══ TOPLAM ══ */}
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        marginTop: satirBazliParaBirimi ? '10px' : '6px', marginBottom: '14px',
        tableLayout: 'fixed', borderLeft: 'none', borderRight: 'none',
        borderTop: satirBazliParaBirimi ? `1px solid ${C.border}` : 'none',
        borderBottom: satirBazliParaBirimi ? `1px solid ${C.border}` : 'none',
        printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', ...noBreak,
      } as React.CSSProperties}>
        <TableColgroup />
        <tbody>
          {!satirBazliParaBirimi ? (() => {
            const hasDetail = iskontoOrani > 0 || kdvOrani > 0;
            const kartStyle: React.CSSProperties = {
              boxSizing: 'border-box', border: '0.75px solid #1A2B42', borderRadius: '8px',
              background: 'linear-gradient(180deg, #1E3350 0%, #152740 55%, #0F1D30 100%)',
              boxShadow: '0 2px 8px rgba(15,25,40,0.10)',
              printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
            };
            const fmtN = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const pbLabel = teklif.paraBirimi === 'TRY' ? 'TL' : teklif.paraBirimi;
            const detayRow = (label: string, value: number, color: string, sign: '' | '–' | '+') => {
              const s = fmtN(value); const ci = s.lastIndexOf(','); const int = ci >= 0 ? s.slice(0, ci) : s; const dec = ci >= 0 ? s.slice(ci) : '';
              return (
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2px' }}>
                  <span style={{ flex: 1, paddingLeft: '3px', fontSize: '8.5px', lineHeight: 1.2, color, whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</span>
                  <span style={{ width: 8, flexShrink: 0, textAlign: 'right', fontSize: '8.5px', lineHeight: 1.2, color, fontWeight: sign ? 700 : undefined }}>{sign || null}</span>
                  <span style={{ width: 64, flexShrink: 0, display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ flex: 1, textAlign: 'right', fontSize: '8.5px', lineHeight: 1.2, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color, whiteSpace: 'nowrap' }}>{int}</span>
                    <span style={{ width: 16, flexShrink: 0, fontSize: '8.5px', lineHeight: 1.2, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color, whiteSpace: 'nowrap' }}>{dec}</span>
                  </span>
                  <div style={{ width: 'calc(23.26% + 7px)', flexShrink: 0 }} />
                </div>
              );
            };
            return (
              <tr>
                <td colSpan={4} style={{ borderTop: 'none', borderBottom: 'none' }} />
                <td colSpan={4} style={{ padding: '8px 0 10px', borderTop: 'none', borderBottom: 'none', verticalAlign: 'top' }}>
                  {!hasDetail ? (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 0 11px 14px', ...kartStyle }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: BRAND.text, lineHeight: 1 }}>Genel Toplam</span>
                        <span style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.04em', color: BRAND.textSub, lineHeight: 1 }}>Grand Total</span>
                      </div>
                      <div style={{ flex: 1 }} />
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
                        <span style={{ fontSize: '9px', color: BRAND.textLabel, lineHeight: 1, alignSelf: 'flex-end', paddingBottom: '1px' }}>{sembol}</span>
                        <span style={{ fontSize: genelToplam >= 1e6 ? '14px' : '17px', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: BRAND.text, whiteSpace: 'nowrap' }}>{fmtN(genelToplam)}</span>
                      </div>
                      <div style={{ width: '23.26%', flexShrink: 0 }} />
                    </div>
                  ) : (
                    <div style={{ padding: '9px 0 9px 14px', ...kartStyle }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: BRAND.text, lineHeight: 1 }}>Genel Toplam</span>
                        <span style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.04em', color: BRAND.textSub, lineHeight: 1 }}>Grand Total</span>
                      </div>
                      {detayRow('Ara Toplam', araToplam, BRAND.textSub, '')}
                      {iskontoOrani > 0 && detayRow(`İskonto %${iskontoOrani}`, iskontoTutar, '#fca5a5', '–')}
                      {kdvOrani > 0 && detayRow(`KDV %${kdvOrani}`, kdvTutar, '#86efac', '+')}
                      <div style={{ borderTop: `0.75px solid ${BRAND.sep}`, margin: '5px 0 4px' }} />
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: BRAND.textSub, lineHeight: 1 }}>{pbLabel}</span>
                        <div style={{ flex: 1 }} />
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
                          <span style={{ fontSize: '9px', color: BRAND.textLabel, lineHeight: 1, alignSelf: 'flex-end', paddingBottom: '1px' }}>{sembol}</span>
                          <span style={{ fontSize: genelToplam >= 1e6 ? '14px' : '17px', fontWeight: 900, lineHeight: 1.06, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: BRAND.text, whiteSpace: 'nowrap' }}>{fmtN(genelToplam)}</span>
                        </div>
                        <div style={{ width: 'calc(23.26% + 7px)', flexShrink: 0 }} />
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })() : (() => {
            const kartlar = kullanilanParaKartlari;
            const KART_W = 220; const KART_H = 86; const KART_GAP = 8;
            return (
              <tr>
                <td colSpan={8} style={{ padding: '8px 10px 10px', borderBottom: 'none' }}>
                  <div style={{
                    width: '100%', boxSizing: 'border-box', minHeight: `${KART_H + 26}px`,
                    border: '0.75px solid #1A2B42', borderRadius: '8px',
                    background: 'linear-gradient(180deg, #1E3350 0%, #152740 55%, #0F1D30 100%)',
                    padding: '7px 8px 8px', boxShadow: '0 2px 8px rgba(15,25,40,0.10)',
                    printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
                  } as React.CSSProperties}>
                    <div style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: BRAND.textLabel, lineHeight: 1, paddingBottom: '6px', paddingLeft: '2px' }}>
                      Genel Toplamlar / Grand Total
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: kartlar.length >= 3 ? 'flex-start' : 'flex-end', alignItems: 'flex-start', gap: `${KART_GAP}px` }}>
                      {kartlar.map((item) => (
                        <div key={item.pb} style={{
                          width: `${KART_W}px`, minWidth: `${KART_W}px`, maxWidth: `${KART_W}px`,
                          height: `${KART_H}px`, minHeight: `${KART_H}px`, maxHeight: `${KART_H}px`,
                          flexShrink: 0, position: 'relative', boxSizing: 'border-box', borderRadius: '10px',
                          border: '0.75px solid #E8E6E3', background: '#FFFFFF',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
                        } as React.CSSProperties}>
                          <FinansalOzetKartIci araToplam={item.araToplam} iskontoOrani={iskontoOrani} iskontoTutar={item.iskontoTutar} kdvOrani={kdvOrani} kdvTutar={item.kdvTutar} genelToplam={item.total} paraBirimi={item.pb} variant="pdf" />
                        </div>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })()}
        </tbody>
      </table>

      {/* ══ NOTLAR ══ */}
      <div
        data-alan="notlar"
        onClick={(e) => handleAlanClick('notlar', e)}
        style={{
          ...NOTES_BOX_STYLE,
          minHeight: isNotlarEditing ? 60 : (teklif.notlar ? undefined : 44),
          ...noBreak, ...editFrameStyle(isNotlarEditing),
        } as React.CSSProperties}
      >
        {isNotlarEditing ? (
          <div className="field-group">
            <div style={{ fontSize: '8.5px', fontWeight: 700, color: C.navy, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5, opacity: 0.7 }}>
              Notlar <span style={{ fontWeight: 400, opacity: 0.6 }}>/ Notes</span>
            </div>
            <Input.TextArea
              autoFocus
              variant="borderless"
              value={teklif.notlar}
              onChange={(e) => onNotlarDegistir(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 8 }}
              style={{ fontSize: '12.5px', lineHeight: '1.65', color: C.textMid, padding: 0 }}
              placeholder="Not ekleyin..."
            />
          </div>
        ) : (
          teklif.notlar ? (
            <>
              <strong style={{ color: C.navy, fontSize: '11px', letterSpacing: '0.02em' }}>Notlar / Notes:&nbsp;</strong>
              <span style={{ color: C.textMid }}>{teklif.notlar}</span>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 24 }}>
              <span style={{ color: C.textMuted, fontStyle: 'italic', fontSize: '11px', opacity: 0.65 }}>
                Not eklemek için tıklayın...
              </span>
            </div>
          )
        )}
      </div>

      </div>

      {/* ── KAŞE / İMZA + FOOTER ── */}
      <div id="pdf-bottom-block">
        <div style={SIGNATURE_SECTION_STYLE}>
          <div style={{ color: C.textMuted, fontSize: '11.7px', fontWeight: 500, letterSpacing: '0.01em', marginBottom: '9px' }}>
            Siparişi Veren / Authorised Person
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
            <div style={{ flex: '0 0 40%', fontSize: '11.7px', lineHeight: '1.45', color: C.textMid }}>
              <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.border}`, height: '25px' }} />
              <div style={{ color: C.textMuted, marginBottom: '9px', marginTop: '3px' }}>İsim / Name</div>
              <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.border}`, height: '25px' }} />
              <div style={{ color: C.textMuted, marginTop: '3px' }}>Tarih / Date</div>
            </div>
            <div style={{ flex: '1', fontSize: '11.7px', lineHeight: '1.45', color: C.textMid, paddingTop: '54px' }}>
              <div style={{ width: '115px', marginLeft: '-2cm', borderBottom: `1px solid ${C.border}`, height: '25px' }} />
              <div style={{ color: C.textMuted, marginTop: '3px', marginLeft: '-2cm' }}>İmza / Signature</div>
            </div>
          </div>
        </div>
        <div id="pdf-page-footer" style={FOOTER_BAR_STYLE}>
          <div>MEBA Pnömatik Hidrolik Makina &nbsp;|&nbsp; KAYSERİ &nbsp;|&nbsp; info@mebamekanik.com</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>Teklif No: {teklif.teklifNo} &nbsp;|&nbsp; {formatDate(teklif.tarih)} &nbsp;|&nbsp; www.mebamekanik.com</div>
        </div>
      </div>
    </div>
  );
}
