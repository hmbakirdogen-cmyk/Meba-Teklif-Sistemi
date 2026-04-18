/**
 * BelgeInlineEditor.tsx
 * ─────────────────────────────────────────────────────────────────
 * TeklifSablonu'nun interaktif ikizi.
 * Aynı A4 düzenini korur, ancak tıklanan alanlar belge akışı
 * içinde inline genişleyerek düzenleme kontrollerini gösterir.
 *
 * PDF/baskı çıktısında KULLANILMAZ — yalnızca ekranda görünür.
 * html2canvas pipeline için orijinal TeklifSablonu ayrı tutulur.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
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

// ── Aynı sabitler (TeklifSablonu ile birebir) ──
const PARA_BIRIMI_ETIKETI: Record<string, string> = { TRY: 'TL', EUR: 'EUR', USD: 'USD' };
function firstLine(text: string): string {
  return text.split(/\r?\n/)[0]?.trim() ?? '';
}
const SEMBOL: Record<string, string> = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', CHF: '₣' };

const BRAND = {
  g:         'linear-gradient(180deg, #1a3567 0%, #0d1f45 55%, #060d20 100%)',
  border:    '#0a1630',
  shadow:    '0 4px 24px rgba(4,8,24,0.55), 0 1px 8px rgba(4,8,24,0.36)',
  shadowSm:  '0 2px 10px rgba(4,8,24,0.50)',
  text:      '#ffffff',
  textSub:   'rgba(255,255,255,0.88)',
  textLabel: 'rgba(255,255,255,0.70)',
  sep:       'rgba(255,255,255,0.25)',
} as const;

const C = {
  navy:        '#0c1e3c',
  navyLight:   '#102858',
  navyBorder:  '#3a6890',
  accent:      '#102858',
  border:      '#9ab8d4',
  borderSoft:  '#b4cce0',
  rowAlt:      '#f5f8fc',
  text:        '#060608',
  textMid:     '#0e0e12',
  textSoft:    '#181820',
  textMuted:   '#242430',
  white:       '#ffffff',
  bg:          '#dce8f5',
  stripeBg:    '#bed0ea',
  stripeText:  '#0c1e3c',
  stripeSub:   '#182e4e',
  stripeSep:   '#8aaed0',
};

// ══════════════════════════════════════════════════════════════════
//  UNIFIED COLUMN SYSTEM
//  Tek merkezi kolon tanımı — başlık, statik satır ve edit satırı
//  hepsi bu genişlikleri paylaşır. Kolon ayarı yalnızca buradan yapılır.
// ══════════════════════════════════════════════════════════════════
const COL = {
  no:         '4%',
  marka:      '9%',
  urunKod:    '13%',
  aciklama:   '27%',
  miktar:     '9%',
  birimFiyat: '13%',
  toplam:     '12%',
  teslimat:   '13%',
} as const;

const COL_PB = {
  no:         '3.5%',
  marka:      '8%',
  urunKod:    '12%',
  aciklama:   '22%',
  miktar:     '8%',
  paraBirimi: '8%',
  birimFiyat: '13%',
  toplam:     '13%',
  teslimat:   '12.5%',
} as const;

// ── Uniform cell padding ──
// Başlık, statik satır ve edit satırlarında kullanılan TEK padding değeri.
// Bu değer tüm hücrelerde aynıdır; böylece dikey hizalama garanti edilir.
const CELL_PAD = '7px 6px';

const noBreak: React.CSSProperties = {
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
};

const ROW_CARD = {
  bg:        '#ffffff',
  borderClr: '#aabdd4',
  radius:    '5px',
  shadow:    '0 1px 3px rgba(10,20,50,0.08)',
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

// ══════════════════════════════════════════════════════════════════
//  UNIFIED FIELD SYSTEM
//  Tüm veri giriş alanlarının merkezi konfigürasyonu.
//  Hiçbir alan kendine özel aktif/pasif/focus stili tanımlamaz.
//  Bu tek kaynaktan beslenir.
// ══════════════════════════════════════════════════════════════════
const FIELD = {
  activeOutline: '1px solid rgba(37, 99, 235, 0.18)',
  activeBg: 'rgba(237, 242, 251, 0.45)',
  radius: '4px',
  transition: 'all 0.15s ease',
  focusLine: 'inset 0 -2px 0 rgba(37, 99, 235, 0.20)',
  caret: '#1e40af',
} as const;

// ══════════════════════════════════════════════════════════════════
//  UNIFIED FIELD CSS
//  Ant Design kontrolleri belgenin doğal parçası gibi görünür.
//  Tüm border, padding, arka plan, ok ikonu kaldırılır.
//  Tek merkezi CSS — hiçbir alan kendine özel override kullanmaz.
// ══════════════════════════════════════════════════════════════════
const FIELD_CSS = `
/* ═══ BASE: Tüm kontroller belge tipografisini devralır ═══ */
.belge-inline .ant-select,
.belge-inline .ant-input,
.belge-inline .ant-input-number,
.belge-inline .ant-picker,
.belge-inline .ant-select-auto-complete {
  font-size: inherit !important;
  color: inherit !important;
  line-height: inherit !important;
}

/* ═══ CARET: Tüm alanlarda aynı imlec rengi ═══ */
.belge-inline input,
.belge-inline textarea {
  caret-color: ${FIELD.caret} !important;
}

/* ═══ SELECTION: Tüm alanlarda aynı seçim rengi ═══ */
.belge-inline ::selection {
  background: rgba(37, 99, 235, 0.12);
}

/* ═══ SELECT: Ghost chrome ═══ */
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

/* ═══ SELECT OK İKONU: Tüm alanlarda gizli ═══ */
.belge-inline .ant-select-arrow {
  display: none !important;
}

/* ═══ PLACEHOLDER: Tüm alanlarda aynı görünüm ═══ */
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

/* ═══ FOCUS GÖSTERGESİ: Tablo hücreleri ═══ */
.belge-inline tr[data-editing] td:focus-within {
  box-shadow: ${FIELD.focusLine} !important;
}

/* ═══ FOCUS GÖSTERGESİ: Alan grupları (müşteri, notlar, ayarlar) ═══ */
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

/* ═══ CHECKBOX: Doğal görünüm ═══ */
.belge-inline input[type="checkbox"] {
  accent-color: ${FIELD.caret};
}
`;

// ── Editing alan tipi ──
export type EditingAlan =
  | 'musteri'
  | 'ayarlar'
  | `satir-${string}`
  | 'notlar'
  | null;

// ── Props ──
interface BelgeInlineEditorProps {
  teklif: Teklif;
  totals: TeklifToplam;
  editingAlan: EditingAlan;
  onEditingAlanDegistir: (alan: EditingAlan) => void;
  // Cari
  onCariDegistir: (cari: Cari) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM') => void;
  // Ayarlar
  onTarihDegistir: (tarih: string) => void;
  onParaBirimiDegistir: (pb: string) => void;
  satirBazliParaBirimi: boolean;
  onSatirBazliDegistir: (aktif: boolean) => void;
  onDurumDegistir: (durum: TeklifDurum) => void;
  onKdvOraniDegistir: (oran: number) => void;
  onIskontoOraniDegistir: (oran: number) => void;
  onOdemeVadesiDegistir: (vade: string) => void;
  // Satırlar
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;
  // Notlar
  onNotlarDegistir: (notlar: string) => void;
  // Yeni teklif modu — ilk satır otomatik açık
  yeniTeklif?: boolean;
}

function TableColgroup({ satirBazliParaBirimi }: { satirBazliParaBirimi: boolean }) {
  const cols = satirBazliParaBirimi ? COL_PB : COL;
  return (
    <colgroup>
      <col style={{ width: cols.no }} />
      <col style={{ width: cols.marka }} />
      <col style={{ width: cols.urunKod }} />
      <col style={{ width: cols.aciklama }} />
      <col style={{ width: cols.miktar }} />
      {satirBazliParaBirimi && <col style={{ width: COL_PB.paraBirimi }} />}
      <col style={{ width: cols.birimFiyat }} />
      <col style={{ width: cols.toplam }} />
      <col style={{ width: cols.teslimat }} />
    </colgroup>
  );
}

// ── Inline cari arama bileşeni ──
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
//  Statik satırla birebir aynı padding, font ve hizalama kullanır.
//  Ant Design kontrolleri CSS overrides sayesinde görünmez kabuk
//  olarak çalışır — metin doğrudan belgeye gömülü gibi görünür.
// ══════════════════════════════════════════════════════════════════
function InlineSatirEditor({
  satir,
  idx,
  paraBirimi,
  satirBazliParaBirimi,
  onGuncelle,
  onSil,
  onEkle,
}: {
  satir: TeklifSatiri;
  idx: number;
  paraBirimi: string;
  satirBazliParaBirimi: boolean;
  onGuncelle: (alan: keyof TeklifSatiri, deger: unknown) => void;
  onSil: () => void;
  onEkle: () => void;
}) {
  const markalar = useMemo(() => referansVeriService.markalar.tumunuGetir(), []);
  const birimler = useMemo(() => referansVeriService.birimler.tumunuGetir(), []);
  const teslimSecenekleri = useMemo(() => referansVeriService.teslimSecenekleri.tumunuGetir(), []);
  const urunler = useMemo(() => urunService.tumUrunleriGetir(), []);
  const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const urunKodOptions = useMemo(() =>
    urunler.map(u => ({
      value: u.urunKod,
      label: `${u.urunKod} — ${u.urunAdi}`,
    })),
  [urunler]);

  const handleUrunKodSec = (kod: string) => {
    onGuncelle('urunKod', kod);
    const urun = urunler.find(u => u.urunKod === kod);
    if (urun) {
      if (!satir.urunAdi) onGuncelle('urunAdi', urun.urunAdi);
      if (urun.varsayilanFiyat && !satir.birimFiyat) onGuncelle('birimFiyat', urun.varsayilanFiyat);
      if (urun.birim) onGuncelle('birim', urun.birim);
    }
  };

  const colCount = satirBazliParaBirimi ? 9 : 8;

  // ── Hücre stili: statik satırla birebir aynı padding, sadece arka plan farkı ──
  // Edit satırında hücreler arası ince dikey ayırıcılar eklenir.
  const editBg = idx % 2 === 0 ? '#fafbfe' : '#f3f6fc';
  const cellSep = `1px solid rgba(154, 184, 212, 0.35)`;
  const cell = (pos: CellPos, extra?: React.CSSProperties): React.CSSProperties => ({
    ...rcCell(pos, idx),
    padding: CELL_PAD,
    verticalAlign: 'middle',
    fontSize: '11px',
    background: editBg,
    borderRight: pos === 'last' ? rcCell(pos, idx).borderRight : cellSep,
    ...extra,
  });

  return (
    <>
      {/* Ana düzenleme satırı — tablo sütunlarına tam uyumlu */}
      <tr data-editing style={{ ...noBreak }}>
        {/* # */}
        <td style={cell('first', { textAlign: 'center', color: C.textMuted, whiteSpace: 'nowrap' })}>
          {String(idx + 1).padStart(2, '0')}
        </td>

        {/* Marka */}
        <td style={cell('mid', { textAlign: 'center', color: C.textMid })}>
          <Select
            size="small"
            variant="borderless"
            style={{ width: '100%', textAlign: 'center' }}
            value={satir.marka || undefined}
            onChange={(v) => onGuncelle('marka', v)}
            options={markalar.map(m => ({ value: m, label: m }))}
            placeholder="—"
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 130 }}
          />
        </td>

        {/* Ürün Kodu */}
        <td style={cell('mid', { fontWeight: 600, color: C.accent })}>
          <AutoComplete
            ref={inputRef as any}
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
          />
        </td>

        {/* Açıklama */}
        <td style={cell('mid', { fontWeight: 500, color: C.textMid })}>
          <Input
            size="small"
            variant="borderless"
            style={{ width: '100%', fontWeight: 500 }}
            value={firstLine(stripParantez(satir.urunAdi))}
            onChange={(e) => onGuncelle('urunAdi', e.target.value)}
            placeholder="açıklama"
          />
        </td>

        {/* Miktar + Birim */}
        <td style={cell('mid', { color: C.textMid, whiteSpace: 'nowrap' })}>
          <div style={{ display: 'flex', alignItems: 'baseline', width: '100%' }}>
            <InputNumber
              size="small"
              variant="borderless"
              style={{ flex: 1, minWidth: 0, fontWeight: 500, textAlign: 'right' }}
              value={satir.miktar}
              min={0}
              onChange={(v) => onGuncelle('miktar', v ?? 0)}
              controls={false}
            />
            <Select
              size="small"
              variant="borderless"
              style={{ flex: '0 0 auto', width: 34, fontSize: '9px', color: C.textMuted, opacity: 0.6 }}
              value={satir.birim || 'Adet'}
              onChange={(v) => onGuncelle('birim', v)}
              options={birimler.map(b => ({ value: b, label: /^adet$/i.test(b) ? 'Ad.' : b }))}
              popupMatchSelectWidth={false}
              dropdownStyle={{ minWidth: 90 }}
            />
          </div>
        </td>

        {/* Para Birimi (satır bazlı) */}
        {satirBazliParaBirimi && (
          <td style={cell('mid', { textAlign: 'center', fontWeight: 700 })}>
            <Select
              size="small"
              variant="borderless"
              style={{ width: '100%', fontWeight: 700, textAlign: 'center' }}
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
          </td>
        )}

        {/* Birim Fiyat */}
        <td style={cell('mid', { textAlign: 'right', color: C.textMid, fontVariantNumeric: 'tabular-nums' })}>
          <InputNumber
            size="small"
            variant="borderless"
            style={{ width: '100%', textAlign: 'right' }}
            value={satir.birimFiyat || undefined}
            min={0}
            step={0.01}
            onChange={(v) => onGuncelle('birimFiyat', v ?? 0)}
            controls={false}
            formatter={(v) => v != null ? String(v).replace('.', ',') : ''}
            parser={(v) => Number((v ?? '').replace(',', '.')) as any}
            placeholder="0,00"
          />
        </td>

        {/* Satır Toplam — hesaplanan, düzenlenemez */}
        <td style={cell('mid', { textAlign: 'right', fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' })}>
          {satir.satirToplami !== 0
            ? `${formatDisplayNumber(satir.satirToplami, 2, 2)}${satirBazliParaBirimi ? ` ${PARA_BIRIMI_ETIKETI[satirPb]}` : ''}`
            : '—'}
        </td>

        {/* Teslimat */}
        <td style={cell('last', { textAlign: 'center', color: C.textSoft })}>
          <Select
            size="small"
            variant="borderless"
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
        <td colSpan={colCount} style={{ padding: 0, border: 'none', background: 'transparent' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '3px 8px 4px',
            fontSize: '10px',
            color: C.textMuted,
            borderTop: `0.5px dashed ${C.borderSoft}`,
          }}>
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
              />
            </span>
            <span style={{ flex: 1 }} />
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
    .filter((pb) => teklif.satirlar.some((satir) => hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi) === pb))
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

  // Tıklama ile alan seçimi
  const handleAlanClick = (alan: EditingAlan, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingAlan !== alan) {
      onEditingAlanDegistir(alan);
    }
  };

  const isMusteriEditing = editingAlan === 'musteri';
  const isAyarlarEditing = editingAlan === 'ayarlar';
  const isNotlarEditing = editingAlan === 'notlar';
  const editingSatirId = editingAlan?.startsWith('satir-') ? editingAlan.slice(6) : null;

  // Inline düzenleme alanı çerçeve stili — tüm alanlarda aynı
  const editFrameStyle = (isActive: boolean): React.CSSProperties => ({
    transition: FIELD.transition,
    borderRadius: FIELD.radius,
    outline: isActive ? FIELD.activeOutline : undefined,
    background: isActive ? FIELD.activeBg : undefined,
    cursor: isActive ? 'default' : 'pointer',
  });

  return (
    <div
      id="teklif-sablon"
      className="belge-inline"
      style={{
        width: '210mm',
        minHeight: '297mm',
        display: 'flex',
        flexDirection: 'column',
        margin: '0 auto',
        backgroundColor: C.white,
        colorScheme: 'light',
        fontFamily: '"Inter", "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '11.7px',
        lineHeight: '1.52',
        letterSpacing: '0.01em',
        color: C.text,
        boxSizing: 'border-box',
        padding: '9mm 10mm 8mm 10mm',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'geometricPrecision',
        fontKerning: 'normal',
        fontOpticalSizing: 'auto',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}
    >
      {/* Unified Field System — tek merkezi CSS */}
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
      <div style={{ display: 'flex', width: '100%', background: '#ffffff', marginBottom: '10px', columnGap: '20px', ...noBreak }}>
        {/* Gönderen */}
        <div style={{ width: '50%', padding: '4px 0 8px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: '9px', fontWeight: 600, color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '7px', paddingBottom: '5px', borderBottom: `1px solid ${C.border}`, lineHeight: 1.2 }}>
            Gönderen <span style={{ fontWeight: 400, opacity: 0.6 }}>/ From</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: '13.5px', color: C.navy, marginBottom: '3px', letterSpacing: '-0.015em', lineHeight: 1.3 }}>MEBA Mekanik Ltd. Şti.</div>
          <div style={{ fontSize: '11.5px', lineHeight: '1.45', color: C.textMid }}>Tel: {formatPhone('03525020780')}<br />www.mebamekanik.com</div>
        </div>
        {/* Alıcı — tıklanabilir / inline düzenlenebilir */}
        <div
          data-alan="musteri"
          onClick={(e) => handleAlanClick('musteri', e)}
          style={{ width: '50%', padding: '4px 0 8px', boxSizing: 'border-box', ...editFrameStyle(isMusteriEditing) }}
        >
          <div style={{ fontSize: '9px', fontWeight: 600, color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '7px', paddingBottom: '5px', borderBottom: `1px solid ${C.border}`, lineHeight: 1.2 }}>
            Alıcı <span style={{ fontWeight: 400, opacity: 0.6 }}>/ To</span>
          </div>
          {isMusteriEditing ? (
            <div className="field-group" style={{ padding: '2px 0' }}>
              <InlineCariSecimi onSec={(cari) => { onCariDegistir(cari); }} />
              <div style={{ fontWeight: 800, fontSize: '13.5px', color: C.navy, marginTop: 6, marginBottom: '3px', lineHeight: '1.3', letterSpacing: '-0.015em' }}>
                {formatCariAdi(teklif.cari.firmaAdi)}
              </div>
              {/* Muhatap düzenleme */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '11.5px', color: C.textMid }}>
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>Sayın</span>
                <Input
                  size="small"
                  variant="borderless"
                  style={{ flex: 1, fontSize: '11.5px', fontWeight: 500, maxWidth: 160 }}
                  value={contactName}
                  onChange={(e) => onContactNameDegistir(e.target.value)}
                  placeholder="muhatap adı"
                />
                <Select
                  size="small"
                  variant="borderless"
                  style={{ width: 72, fontSize: '11.5px' }}
                  value={contactTitle}
                  onChange={onContactTitleDegistir}
                  options={[{ value: 'BEY', label: 'Bey' }, { value: 'HANIM', label: 'Hanım' }]}
                  popupMatchSelectWidth={false}
                  dropdownStyle={{ minWidth: 90 }}
                />
              </div>
              {/* Mevcut cari bilgileri */}
              <div style={{ fontSize: '11.5px', lineHeight: '1.45', color: C.textMid, marginTop: 4, wordBreak: 'break-word' }}>
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
              <div style={{ fontWeight: 800, fontSize: '13.5px', color: C.navy, marginBottom: '3px', lineHeight: '1.3', letterSpacing: '-0.015em' }}>
                {formatCariAdi(teklif.cari.firmaAdi)}
              </div>
              <div style={{ fontSize: '11.5px', lineHeight: '1.45', color: C.textMid, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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

      {/* ══ AYARLAR ŞERIDI ══ */}
      <div
        data-alan="ayarlar"
        onClick={(e) => handleAlanClick('ayarlar', e)}
        style={{ display: 'flex', width: '100%', gap: '6px', marginBottom: '10px', ...noBreak, ...editFrameStyle(isAyarlarEditing) }}
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
            background: 'linear-gradient(180deg, #edf3fb 0%, #d4e4f5 100%)',
            border: '1px solid #9ab8d4',
            borderRadius: '7px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
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
                <div style={valueStyle}>
                  {item.value}
                </div>
              </div>
            ));
          }

          return items.map((item, i) => (
            <div key={i} className="field-group" style={cardBase}>
              <div style={{ ...labelStyle, marginBottom: '4px' }}>
                {item.tr}
              </div>
              {i === 0 && (
                <div>
                  <Select
                    size="small" variant="borderless"
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
                  size="small" variant="borderless"
                  style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
                  value={teklif.odemeVadesi || '45 Gün'}
                  onChange={onOdemeVadesiDegistir}
                  options={['Peşin', '15 Gün', '30 Gün', '45 Gün', '60 Gün', '90 Gün'].map(v => ({ value: v, label: v }))}
                  popupMatchSelectWidth={100}
                />
              )}
              {i === 2 && (
                <Select
                  size="small" variant="borderless"
                  style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
                  value={teklif.kdvOrani}
                  onChange={onKdvOraniDegistir}
                  options={[{ value: 0, label: 'Hariç' }, { value: 1, label: '%1' }, { value: 10, label: '%10' }, { value: 20, label: '%20' }]}
                  popupMatchSelectWidth={80}
                />
              )}
              {i === 3 && (
                <div style={valueStyle}>TCMB Fatura</div>
              )}
              {i === 4 && (
                <div style={valueStyle}>{teklif.gecerlilikSuresi ?? '1 Hafta'}</div>
              )}
            </div>
          ));
        })()}
      </div>

      {/* ══ TEKLİF KALEMLERİ TABLOSU ══ */}
      <div style={{ fontSize: '9.5px', fontWeight: 700, color: C.textSoft, letterSpacing: '0.11em', textTransform: 'uppercase', marginBottom: '6px' }}>
        Teklif Kalemleri <span style={{ fontWeight: 400, opacity: 0.55 }}>/ Line Items</span>
      </div>
      <table style={{
        width: '100%', borderCollapse: 'separate', borderSpacing: '0 3px',
        borderLeft: 'none', borderRight: 'none', marginBottom: '0px', tableLayout: 'fixed',
        printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}>
        <TableColgroup satirBazliParaBirimi={satirBazliParaBirimi} />
        {/* ── Başlık satırı — CELL_PAD ile hizalanmış ── */}
        <thead id="pdf-thead">
          <tr>
            {[
              { label: '#', sub: '', align: 'center' as const },
              { label: 'Marka', sub: 'Brand', align: 'center' as const },
              { label: 'Ürün Kodu', sub: 'Item No', align: 'left' as const },
              { label: 'Açıklama', sub: 'Description', align: 'left' as const },
              { label: 'Miktar', sub: 'Qty', align: 'center' as const },
              ...(satirBazliParaBirimi ? [{ label: 'Para Birimi', sub: 'Currency', align: 'center' as const }] : []),
              { label: 'Birim Fiyat', sub: 'Unit Price', align: 'right' as const },
              { label: 'Toplam', sub: 'Total', align: 'right' as const },
              { label: 'Teslimat', sub: 'Delivery', align: 'center' as const },
            ].map((col, i) => (
              <th key={i} style={{
                padding: CELL_PAD,
                textAlign: col.align,
                verticalAlign: 'bottom',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: C.navy,
                background: '#ffffff',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: `1.5px solid ${C.navyBorder}`,
                borderRadius: 0,
                lineHeight: '1.3',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}>
                {col.label}
                {col.sub && (
                  <span style={{
                    display: 'block',
                    fontWeight: 400,
                    fontSize: '8px',
                    color: C.textMuted,
                    marginTop: '1px',
                    textAlign: col.align,
                    letterSpacing: '0.02em',
                    opacity: 0.7,
                  }}>
                    {col.sub}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr aria-hidden="true">
            <td colSpan={satirBazliParaBirimi ? 9 : 8} style={{ height: '4px', padding: 0, border: 'none', background: 'transparent' }} />
          </tr>
          {teklif.satirlar.map((satir, idx) => {
            const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi);
            const isEditing = editingSatirId === satir.id;

            if (isEditing) {
              return (
                <InlineSatirEditor
                  key={satir.id}
                  satir={satir}
                  idx={idx}
                  paraBirimi={teklif.paraBirimi}
                  satirBazliParaBirimi={satirBazliParaBirimi}
                  onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                  onSil={() => onSatirSil(satir.id)}
                  onEkle={onSatirEkle}
                />
              );
            }

            {/* ── Statik satır — CELL_PAD ile başlığa birebir hizalı ── */}
            return (
              <tr
                key={satir.id}
                data-satir-id={satir.id}
                onClick={(e) => handleAlanClick(`satir-${satir.id}`, e)}
                style={{ ...noBreak, cursor: 'pointer' }}
              >
                {/* # */}
                <td style={{ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: C.textMuted, whiteSpace: 'nowrap', ...rcCell('first', idx) }}>
                  {String(idx + 1).padStart(2, '0')}
                </td>
                {/* Marka */}
                <td style={{ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'normal', wordBreak: 'break-word', ...rcCell('mid', idx) }}>
                  {satir.marka || '—'}
                </td>
                {/* Ürün Kodu */}
                <td style={{ padding: CELL_PAD, fontSize: '11px', fontWeight: 600, color: C.accent, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', verticalAlign: 'middle', letterSpacing: '-0.1px', ...rcCell('mid', idx) }}>
                  {satir.urunKod || '—'}
                </td>
                {/* Açıklama */}
                <td style={{ padding: CELL_PAD, fontSize: '11px', fontWeight: 500, color: C.textMid, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', verticalAlign: 'middle', lineHeight: 1.35, ...rcCell('mid', idx) }}>
                  {firstLine(stripParantez(satir.urunAdi)) || '—'}
                </td>
                {/* Miktar */}
                <td style={{ padding: CELL_PAD, verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...rcCell('mid', idx) }}>
                  {satir.miktar !== 0 ? (
                    <div style={{ display: 'flex', width: '100%', alignItems: 'baseline' }}>
                      <span style={{ flex: 1, textAlign: 'right', paddingRight: '3px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{formatDisplayNumber(satir.miktar, 0, 4)}</span>
                      <span style={{ flex: '0 0 auto', textAlign: 'left', opacity: 0.55, fontSize: '0.85em' }}>{/^adet$/i.test(satir.birim?.trim() ?? '') || !satir.birim ? 'Ad.' : satir.birim}</span>
                    </div>
                  ) : '—'}
                </td>
                {/* Para Birimi (satır bazlı) */}
                {satirBazliParaBirimi && (
                  <td style={{ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'nowrap', fontWeight: 700, letterSpacing: '0.03em', ...rcCell('mid', idx) }}>
                    {PARA_BIRIMI_ETIKETI[satirPb]}
                  </td>
                )}
                {/* Birim Fiyat */}
                <td style={{ padding: CELL_PAD, textAlign: 'right', verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...rcCell('mid', idx) }}>
                  {(() => {
                    const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                    return nihai !== 0 ? `${formatDisplayNumber(nihai, 2, 2)}${satirBazliParaBirimi ? ` ${PARA_BIRIMI_ETIKETI[satirPb]}` : ''}` : '—';
                  })()}
                </td>
                {/* Toplam */}
                <td style={{ padding: CELL_PAD, textAlign: 'right', verticalAlign: 'middle', fontSize: '11px', fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...rcCell('mid', idx) }}>
                  {satir.satirToplami !== 0 ? `${formatDisplayNumber(satir.satirToplami, 2, 2)}${satirBazliParaBirimi ? ` ${PARA_BIRIMI_ETIKETI[satirPb]}` : ''}` : '—'}
                </td>
                {/* Teslimat */}
                <td style={{ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '10.5px', color: C.textSoft, whiteSpace: 'normal', wordBreak: 'break-word', ...rcCell('last', idx) }}>
                  {satir.teslimTarihi || '—'}
                </td>
              </tr>
            );
          })}
          {/* Satır yoksa — "satır ekle" ipucu */}
          {teklif.satirlar.length === 0 && (
            <tr>
              <td
                colSpan={satirBazliParaBirimi ? 9 : 8}
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

      {/* ══ TOPLAM ALANI ══ */}
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        marginTop: satirBazliParaBirimi ? '10px' : '6px', marginBottom: '14px',
        tableLayout: 'fixed', borderLeft: 'none', borderRight: 'none',
        borderTop: satirBazliParaBirimi ? `1px solid ${C.border}` : 'none',
        borderBottom: satirBazliParaBirimi ? `1px solid ${C.border}` : 'none',
        printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', ...noBreak,
      } as React.CSSProperties}>
        <TableColgroup satirBazliParaBirimi={satirBazliParaBirimi} />
        <tbody>
          {!satirBazliParaBirimi ? (() => {
            const hasDetail = iskontoOrani > 0 || kdvOrani > 0;
            const kartStyle: React.CSSProperties = {
              boxSizing: 'border-box', border: '1px solid #2a4a8a', borderRadius: '8px',
              background: 'linear-gradient(180deg, #2e5299 0%, #1e3a72 55%, #122450 100%)',
              boxShadow: '0 3px 16px rgba(10,24,70,0.22), 0 1px 4px rgba(10,24,70,0.14)',
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
                <td colSpan={9} style={{ padding: '8px 10px 10px', borderBottom: 'none' }}>
                  <div style={{
                    width: '100%', boxSizing: 'border-box', minHeight: `${KART_H + 26}px`,
                    border: '1px solid #2a4a8a', borderRadius: '8px',
                    background: 'linear-gradient(180deg, #2e5299 0%, #1e3a72 55%, #122450 100%)',
                    padding: '7px 8px 8px', boxShadow: '0 3px 16px rgba(10,24,70,0.22), 0 1px 4px rgba(10,24,70,0.14)',
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
                          border: '1px solid #c6d4e2', background: 'linear-gradient(180deg, #ffffff 0%, #f3f7fb 100%)',
                          boxShadow: '0 3px 14px rgba(20,39,78,0.06), 0 1px 3px rgba(20,39,78,0.03)',
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

      {/* ══ NOT ALANI ══ */}
      <div
        data-alan="notlar"
        onClick={(e) => handleAlanClick('notlar', e)}
        style={{
          fontSize: '12.5px', marginBottom: '16px', padding: '10px 14px',
          border: `0.75px solid ${C.border}`, borderRadius: '6px', lineHeight: '1.65',
          backgroundColor: C.bg, wordBreak: 'break-word', overflowWrap: 'break-word',
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

      </div>{/* içerik alanı sonu */}

      {/* ── KAŞE / İMZA + FOOTER ── */}
      <div id="pdf-bottom-block">
        <div style={{ marginTop: '18px', padding: '7px 0 25px', ...noBreak }}>
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
        <div id="pdf-page-footer" style={{
          border: `1px solid ${BRAND.border}`, borderRadius: '9px', background: BRAND.g,
          boxShadow: BRAND.shadowSm, color: 'rgba(255,255,255,0.88)',
          display: 'flex', justifyContent: 'space-between', fontSize: '9.8px', fontWeight: 500,
          padding: '7px 10px', lineHeight: '1.55', letterSpacing: '0.025em',
          printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
        } as React.CSSProperties}>
          <div>MEBA Pnömatik Hidrolik Makina &nbsp;|&nbsp; KAYSERİ &nbsp;|&nbsp; info@mebamekanik.com</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>Teklif No: {teklif.teklifNo} &nbsp;|&nbsp; {formatDate(teklif.tarih)} &nbsp;|&nbsp; www.mebamekanik.com</div>
        </div>
      </div>
    </div>
  );
}
