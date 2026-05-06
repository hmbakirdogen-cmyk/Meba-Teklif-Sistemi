import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Select, Input, DatePicker, Dropdown, Popover, InputNumber } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Teklif, Cari, TeklifSatiri, ParaBirimi } from '../types';
import { useTeklifFirmaBilgileri } from '../hooks/useTeklifFirma';
import { formatDate, formatDisplayNumber, formatTitleCaseTr, formatCariAdi } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { referansVeriService } from '../services/referansVeriService';
import { urunService } from '../services/urunService';
import { urunSetService } from '../services/urunSetService';
import { formatPhone } from '../utils/phone';
import { FinansalOzetKartIci } from './FinansalOzetKartIci';
import { TotalsCard } from './TotalsCard';
import { RowResizerLayer } from './RowResizerLayer';
import { InlineCariAutocompleteField } from './InlineCariAutocompleteField';
import {
  formatBirimAbbrev,
  formatParaBirimiLabel,
  RowCell,
  ROW_SHELL,
  ROW_TEXT,
  DescText,
  UNIT_OPTIONS,
} from './InlineTableRowShared';
import {
  DOCUMENT_BRAND,
  DOCUMENT_COLORS,
  DOCUMENT_PAGE,
  DOCUMENT_ROOT_STYLE,
  FOOTER_BAR_STYLE,
  LOGO_OPT_H,
  LOGO_OPT_W,
  LINE_ITEM_CSS_VARS,
  OFFER_TABLE_COLUMN_COUNT,
  OFFER_TABLE_ROW_GAP_PX,
  HIGH_QUALITY_IMAGE_RENDERING,
  noBreak,
  NOTES_BOX_STYLE,
  PARTY_BODY_STYLE,
  PARTY_CARD_STYLE,
  PARTY_GRID_STYLE,
  PARTY_LABEL_STYLE,
  PARTY_NAME_STYLE,
  ROW_CARD,
  SETTINGS_GRID_STYLE,
  SETTINGS_CARD_STYLE,
  SETTINGS_LABEL_STYLE,
  SETTINGS_TR_LABEL_STYLE,
  SETTINGS_SEP_STYLE,
  SETTINGS_EN_LABEL_STYLE,
  SETTINGS_VALUE_STYLE,
  SIGNATURE_SECTION_STYLE,
  TABLE_HEAD_SUBLABEL_STYLE,
  TABLE_TITLE_STYLE,
  TableColgroup,
  computeTotalsAmountRightOffset,
  buildSettingsItems,
  getTableHeadCellStyle,
  computeSetGroupPos,
  computeMainItemIndex,
  computeSetSubitemIndex,
  renderSetSubitemNumber,
  SET_SUBITEM_NUMBER_STYLE,
} from '../templates/teklifDocumentShared';
import { FIELD_CSS, type EditingAlan } from './belgeInlineConstants';
import {
  SatirAksiyonlariPanel,
  SatirIskontoRozeti,
} from './InlineSatirEditor';
import type { SatirCellField } from './inlineSatirEditorShared';
import type { TeklifPagePlan } from '../services/documentPagination';

const C = DOCUMENT_COLORS;
const BRAND = DOCUMENT_BRAND;
const PAGE_GAP_PX = 24;
const DEFAULT_TEKLIF_EMAIL = 'info@mebamekanik.com';

export type { EditingAlan } from './belgeInlineConstants';

interface PaginatedBelgeInlineEditorProps {
  teklif: Teklif;
  totals: TeklifToplam;
  pages: TeklifPagePlan[];
  editingAlan: EditingAlan;
  onEditingAlanDegistir: (alan: EditingAlan) => void;
  onCariDegistir: (cari: Cari) => void;
  onCariEPostaDegistir: (email: string) => void;
  onCariTelefonDegistir: (telefon: string) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM') => void;
  onTarihDegistir: (tarih: string) => void;
  onParaBirimiDegistir: (pb: ParaBirimi) => void;
  satirBazliParaBirimi: boolean;
  satirBazliIskonto: boolean;
  onKdvOraniDegistir: (oran: number) => void;
  onOdemeVadesiDegistir: (vade: string) => void;
  onGecerlilikSuresiDegistir: (sure: string) => void;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatiraSetUygula: (satirId: string, setId: string) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;
  onSatirArayaEkle: (afterIndex: number) => void;
  onNotlarDegistir: (notlar: string) => void;
  readOnly?: boolean;
  renderPageOverlay?: (pageIndex: number) => React.ReactNode;
  scale?: number;
}

function CompactHeaderBlock({ teklif }: { teklif: Teklif }) {
  const firmaBilgi = useTeklifFirmaBilgileri(teklif);
  const S = 0.478;
  const optW = LOGO_OPT_W * S;
  const optH = LOGO_OPT_H * S;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        paddingBottom: '3.5mm',
        borderBottom: `1.5px solid ${C.panelStrong}`,
      }}>
        <div style={{
          width: `${optW}px`,
          height: `${optH}px`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}>
          <img
            src={firmaBilgi.logoPath}
            alt={firmaBilgi.kisaAd}
            style={{
              width:  '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'left center',
              display: 'block',
              imageRendering: HIGH_QUALITY_IMAGE_RENDERING,
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '10.4px', fontWeight: 800, color: C.navy, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
            {firmaBilgi.ad}
          </span>
          {firmaBilgi.adres && (
            <span style={{ fontSize: '9px', color: C.textSoft, lineHeight: 1.3 }}>
              {firmaBilgi.adres}
            </span>
          )}
          <span style={{ fontSize: '9px', color: C.textSoft, lineHeight: 1.3 }}>
            {[firmaBilgi.telefon && `Tel: ${firmaBilgi.telefon}`, firmaBilgi.eposta, firmaBilgi.web].filter(Boolean).join(' | ')}
          </span>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: '10.4px', fontWeight: 700, color: C.navy, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
            {teklif.teklifNo}
          </div>
          <div style={{ fontSize: '8.6px', color: C.textMuted, marginTop: 1, letterSpacing: '0.01em' }}>
            {formatDate(teklif.tarih)}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sayfa tablosunu position:relative bir kapsayıcıda render eder ve
 * tablonun altına RowResizerLayer'ı yerleştirir. Layer satır altlarına
 * tutamak çizer; readOnly modda hiçbir şey eklenmez.
 */
function PageTableWithResizer({
  satirIds,
  scale,
  readOnly,
  onSatirGuncelle,
  children,
}: {
  satirIds: string[];
  scale: number;
  readOnly: boolean;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  children: React.ReactNode;
}) {
  const [tableEl, setTableEl] = useState<HTMLTableElement | null>(null);

  // Wrapper mount edildiğinde içindeki tabloyu yakala. Callback ref
  // sadece mount/unmount'ta çalışır → her render'da setState yok,
  // infinite re-render olmaz.
  const setWrapperRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) { setTableEl(null); return; }
    const found = node.querySelector<HTMLTableElement>('table.offer-table');
    setTableEl(found ?? null);
  }, []);

  return (
    <div ref={setWrapperRef} style={{ position: 'relative' }}>
      {children}
      <RowResizerLayer
        tableEl={tableEl}
        satirIds={satirIds}
        scale={scale}
        readOnly={readOnly}
        onCommit={(id, h) => onSatirGuncelle(id, 'rowHeight', h)}
      />
    </div>
  );
}

// ── Hücre Düzenleme Popup'ı ──────────────────────────────────────────────────
// Tek seferlik mount: aktif hücreye göre içerik değişir, ama bileşen ağacındaki
// kimlik korunur → input'lar her tuşta remount olmaz, focus kaybı yaşanmaz.
// Antd Popover'ı kullanmıyoruz; kendi portal-tabanlı popup'ımız → boyutlandırma,
// hizalama, dışarı tıklayınca kapatma davranışı bizde.
const CELL_POPUP_WIDTHS: Record<SatirCellField, number> = {
  marka: 280,
  urunKod: 380,
  aciklama: 480,
  miktar: 320,
  paraBirimi: 240,
  birimFiyat: 240,
  teslimat: 280,
};

function CellEditPopup({
  teklif,
  editingAlan,
  satirFocusCell,
  onSatirGuncelle,
  onSatiraSetUygula,
  onClose,
  onEnterNext,
}: {
  teklif: Teklif;
  editingAlan: EditingAlan;
  satirFocusCell: SatirCellField;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatiraSetUygula: (satirId: string, setId: string) => void;
  onClose: () => void;
  onEnterNext: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  const isOpen = !!editingAlan && editingAlan.startsWith('satir-');
  const satirId = isOpen ? editingAlan!.slice(6) : null;
  const satir = satirId ? teklif.satirlar.find((s) => s.id === satirId) ?? null : null;

  const W = CELL_POPUP_WIDTHS[satirFocusCell] ?? 280;

  // Pozisyon: Aktif hücreyi DOM'dan bul, popup'ı altına; yer yoksa üstüne yerleştir.
  // Sol kenar aktif hücreye, sağ kenar viewport'a clamp'lenir.
  useLayoutEffect(() => {
    if (!isOpen || !satirId) {
      setPos(null);
      return;
    }
    const compute = () => {
      const sel = `tr[data-satir-id="${CSS.escape(satirId)}"] td[data-cell-field="${satirFocusCell}"]`;
      const cell = document.querySelector(sel) as HTMLElement | null;
      if (!cell) return;
      const rect = cell.getBoundingClientRect();
      const popupH = popupRef.current?.offsetHeight ?? 100;
      const GAP = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const placeBelow = spaceBelow >= popupH + 16 || spaceBelow > spaceAbove;
      const top = placeBelow
        ? rect.bottom + GAP
        : Math.max(8, rect.top - popupH - GAP);
      const maxLeft = window.innerWidth - W - 12;
      const left = Math.max(8, Math.min(rect.left, maxLeft));
      setPos({ top, left, minWidth: Math.max(W, rect.width) });
    };
    compute();
    // İçerik açıldıktan sonra popupH değişmiş olabilir → bir frame sonra yeniden ölç.
    const raf = requestAnimationFrame(compute);
    const handler = () => compute();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [isOpen, satirId, satirFocusCell, W]);

  // Escape ile kapat
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Dışarı tıklayınca kapat (aktif hücre + Antd dropdown portal'ları hariç)
  useEffect(() => {
    if (!isOpen || !satirId) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      const activeCell = document.querySelector(
        `tr[data-satir-id="${CSS.escape(satirId)}"] td[data-cell-field="${satirFocusCell}"]`,
      );
      if (activeCell?.contains(target)) return;
      // Antd dropdown'ları (Select, DatePicker vs.) document.body'ye portal'lanır.
      const closestDropdown =
        (target as Element)?.closest?.('.ant-select-dropdown, .ant-picker-dropdown, .ant-popover, .ant-dropdown');
      if (closestDropdown) return;
      onClose();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isOpen, satirId, satirFocusCell, onClose]);

  if (!isOpen || !satir || !pos) return null;

  const headerStyle: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#6b7280',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 8,
  };

  let title = '';
  let body: React.ReactNode = null;

  if (satirFocusCell === 'marka') {
    title = 'Marka';
    const markalar = referansVeriService.markalar.tumunuGetir();
    body = (
      <Select
        autoFocus
        defaultOpen
        showSearch
        allowClear
        size="middle"
        style={{ width: '100%' }}
        value={satir.marka || undefined}
        options={markalar.map((m) => ({ value: m, label: m }))}
        onChange={(value) => {
          onSatirGuncelle(satir.id, 'marka', value ?? '');
          onEnterNext();
        }}
        onInputKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder="Marka seçin veya yazın…"
      />
    );
  } else if (satirFocusCell === 'urunKod') {
    title = 'Ürün Kodu';
    body = (
      <UrunKodPopupBody
        satir={satir}
        onSatirGuncelle={onSatirGuncelle}
        onSatiraSetUygula={onSatiraSetUygula}
        onEnterNext={onEnterNext}
        onClose={onClose}
      />
    );
  } else if (satirFocusCell === 'aciklama') {
    title = 'Açıklama';
    body = (
      <Input.TextArea
        autoFocus
        autoSize={{ minRows: 2, maxRows: 14 }}
        size="middle"
        value={satir.aciklama || ''}
        onChange={(e) => onSatirGuncelle(satir.id, 'aciklama', e.target.value)}
        onFocus={(e) => (e.target as HTMLTextAreaElement).select?.()}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onEnterNext();
          }
          if (e.key === 'Escape') onClose();
        }}
        placeholder="Açıklama  (Shift+Enter ile alt satır, Enter ile ilerle)"
      />
    );
  } else if (satirFocusCell === 'miktar') {
    title = 'Miktar';
    body = (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...headerStyle, marginBottom: 4 }}>Değer</div>
          <InputNumber
            autoFocus
            size="middle"
            style={{ width: '100%' }}
            value={satir.miktar}
            min={0}
            decimalSeparator=","
            onChange={(value) => onSatirGuncelle(satir.id, 'miktar', value ?? 0)}
            onFocus={(e) => (e.target as HTMLInputElement).select?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); onEnterNext(); }
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>
        <div style={{ width: 110 }}>
          <div style={{ ...headerStyle, marginBottom: 4 }}>Birim</div>
          <Select
            size="middle"
            style={{ width: '100%' }}
            value={satir.birim || 'Adet'}
            onChange={(value) => onSatirGuncelle(satir.id, 'birim', value)}
            options={UNIT_OPTIONS.map((u) => ({ value: u.value, label: u.value }))}
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 130 }}
          />
        </div>
      </div>
    );
    // Bu kart için title ayrı header değil; iki sütun zaten kendi etiketleriyle gelir.
    title = '';
  } else if (satirFocusCell === 'paraBirimi') {
    title = 'Para Birimi';
    const cur = hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi);
    body = (
      <Select
        autoFocus
        defaultOpen
        size="middle"
        style={{ width: '100%' }}
        value={cur}
        onChange={(value) => {
          onSatirGuncelle(satir.id, 'paraBirimi', value);
          onEnterNext();
        }}
        options={[
          { value: 'TRY', label: 'Türk Lirası (TL)' },
          { value: 'EUR', label: 'Euro (EUR)' },
          { value: 'USD', label: 'Amerikan Doları (USD)' },
        ]}
      />
    );
  } else if (satirFocusCell === 'birimFiyat') {
    title = 'Birim Fiyat';
    body = (
      <InputNumber
        autoFocus
        size="middle"
        style={{ width: '100%' }}
        value={satir.birimFiyat}
        min={0}
        step={0.01}
        decimalSeparator=","
        onChange={(value) => onSatirGuncelle(satir.id, 'birimFiyat', value ?? 0)}
        onFocus={(e) => (e.target as HTMLInputElement).select?.()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onEnterNext(); }
          if (e.key === 'Escape') onClose();
        }}
      />
    );
  } else if (satirFocusCell === 'teslimat') {
    title = 'Teslimat';
    const teslimSecenekleri = referansVeriService.teslimSecenekleri.tumunuGetir();
    body = (
      <Select
        autoFocus
        defaultOpen
        showSearch
        allowClear
        size="middle"
        style={{ width: '100%' }}
        value={satir.teslimTarihi || undefined}
        options={teslimSecenekleri.map((t) => ({ value: t, label: t }))}
        onChange={(value) => {
          onSatirGuncelle(satir.id, 'teslimTarihi', value ?? '');
          onEnterNext();
        }}
        onInputKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder="Teslimat seçin…"
      />
    );
  }

  return createPortal(
    <div
      ref={popupRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        minWidth: pos.minWidth,
        background: '#ffffff',
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 14px 40px rgba(15,23,42,0.20), 0 0 0 1px rgba(15,23,42,0.08)',
        zIndex: 2000,
        animation: 'cell-popup-fade-in 120ms ease-out',
      }}
    >
      {title && <div style={headerStyle}>{title}</div>}
      {body}
    </div>,
    document.body,
  );
}

// Ürün Kodu için autocomplete'li alt-bileşen — InlineSatirEditor içindeki
// SatirCellEditor'ün urunKod handler'ını yeniden kullanır (suggestion paneli,
// onaylanmamış kod uyarısı vs).
function UrunKodPopupBody({
  satir,
  onSatirGuncelle,
  onSatiraSetUygula,
  onEnterNext,
  onClose,
}: {
  satir: TeklifSatiri;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatiraSetUygula: (satirId: string, setId: string) => void;
  onEnterNext: () => void;
  onClose: () => void;
}) {
  // Urun listesi — popup açıkken bir kez çek
  const [urunler, setUrunler] = useState(() => urunService.tumUrunleriGetir());
  const [setler, setSetler] = useState(() => urunSetService.tumSetleriGetir());
  useEffect(() => {
    setUrunler(urunService.tumUrunleriGetir());
    setSetler(urunSetService.tumSetleriGetir());
  }, []);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<InputRef>(null);
  useEffect(() => {
    const el = inputRef.current?.input;
    el?.focus();
    el?.select();
  }, []);

  const q = (satir.urunKod ?? '').trim().toLowerCase();
  const filteredUrun = (q
    ? urunler.filter((u) =>
        u.urunKod.toLowerCase().includes(q) ||
        (u.aciklama ?? '').toLowerCase().includes(q),
      )
    : urunler).slice(0, 40);
  const filteredSet = (q
    ? setler.filter((s) =>
        s.setKod.toLowerCase().includes(q) ||
        (s.aciklama ?? '').toLowerCase().includes(q),
      )
    : setler).slice(0, 20);
  const merged = [
    ...filteredSet.map((s) => ({ kind: 'set' as const, id: s.id, kod: s.setKod, aciklama: s.aciklama, payload: s })),
    ...filteredUrun.map((u) => ({ kind: 'urun' as const, id: u.id, kod: u.urunKod, aciklama: u.aciklama, payload: u })),
  ].slice(0, 50);

  const select = (item: typeof merged[number]) => {
    if (item.kind === 'set') {
      onSatirGuncelle(satir.id, 'urunKod', item.kod);
      onSatirGuncelle(satir.id, 'aciklama', item.payload.aciklama ?? '');
      onSatiraSetUygula(satir.id, item.payload.id);
    } else {
      onSatirGuncelle(satir.id, 'urunKod', item.kod);
      onSatirGuncelle(satir.id, 'setId', undefined);
      onSatirGuncelle(satir.id, 'aciklama', item.payload.aciklama ?? '');
      if (item.payload.varsayilanFiyat && !satir.birimFiyat) {
        onSatirGuncelle(satir.id, 'birimFiyat', item.payload.varsayilanFiyat);
      }
      if (item.payload.birim) onSatirGuncelle(satir.id, 'birim', item.payload.birim);
    }
    onEnterNext();
  };

  return (
    <div>
      <Input
        ref={inputRef}
        size="middle"
        value={satir.urunKod || ''}
        onChange={(e) => {
          const upper = e.target.value.toLocaleUpperCase('tr-TR');
          onSatirGuncelle(satir.id, 'urunKod', upper);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((i) => Math.min(i + 1, merged.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((i) => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter') {
            e.preventDefault();
            const sel = merged[highlight];
            if (sel) select(sel);
            else onEnterNext();
          } else if (e.key === 'Escape') onClose();
        }}
        placeholder="Ürün kodu / açıklama ile ara…"
        autoCapitalize="characters"
        style={{ textTransform: 'uppercase' }}
      />
      {merged.length > 0 && (
        <div
          style={{
            marginTop: 8,
            maxHeight: 240,
            overflowY: 'auto',
            border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: 6,
            fontSize: 12,
            background: '#fafbfc',
          }}
        >
          {merged.map((it, i) => (
            <div
              key={`${it.kind}-${it.id}`}
              onMouseDown={(e) => { e.preventDefault(); select(it); }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
                background: i === highlight ? 'rgba(37,99,235,0.10)' : 'transparent',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {it.kind === 'set' && (
                <span style={{ fontWeight: 700, color: '#7c3aed', marginRight: 6 }}>[SET]</span>
              )}
              <span style={{ fontWeight: 600 }}>{it.kod}</span>
              {it.aciklama && <span style={{ color: '#6b7280', marginLeft: 6 }}>— {it.aciklama}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FooterBlock({ teklif, pageNumber, totalPages }: { teklif: Teklif; pageNumber: number; totalPages: number }) {
  const firmaBilgi = useTeklifFirmaBilgileri(teklif);
  return (
    <div style={{ ...FOOTER_BAR_STYLE, marginTop: 'auto' }}>
      <div>{[firmaBilgi.kisaAd, firmaBilgi.eposta].filter(Boolean).join(' | ')}</div>
      <div>Teklif No: {teklif.teklifNo} | {formatDate(teklif.tarih)}</div>
      <div style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>Sayfa {pageNumber} / {totalPages}</div>
    </div>
  );
}

export default function PaginatedBelgeInlineEditor({
  teklif,
  totals,
  pages,
  editingAlan,
  onEditingAlanDegistir,
  onCariDegistir,
  onCariEPostaDegistir,
  onCariTelefonDegistir,
  contactName,
  contactTitle,
  onContactNameDegistir,
  onContactTitleDegistir,
  onTarihDegistir,
  onParaBirimiDegistir,
  satirBazliParaBirimi,
  satirBazliIskonto,
  onKdvOraniDegistir,
  onOdemeVadesiDegistir,
  onGecerlilikSuresiDegistir,
  onSatirGuncelle,
  onSatiraSetUygula,
  onSatirSil,
  onSatirEkle,
  onSatirArayaEkle,
  onNotlarDegistir,
  readOnly = false,
  renderPageOverlay,
  scale = 1,
}: PaginatedBelgeInlineEditorProps) {
  const firmaBilgi = useTeklifFirmaBilgileri(teklif);
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;
  const kullanilanParaKartlari = hesaplamaMotoru.kullanilanParaBirimiKartlariniHesapla(
    teklif.satirlar, teklif.paraBirimi, kdvOrani, iskontoOrani,
  );

  const muhatapSatiri = teklif.contactName?.trim()
    ? `${formatTitleCaseTr(teklif.contactName.trim())} ${teklif.contactTitle === 'HANIM' ? 'Hanım' : 'Bey'}`
    : (teklif.cari.yetkiliKisi || null);

  const editingSatirId   = !readOnly && editingAlan?.startsWith('satir-') ? editingAlan.slice(6) : null;

  const muhatapRef = useRef<InputRef>(null);
  const notesTextareaRef = useRef<{ focus: (opts?: { cursor?: 'start' | 'end' | 'all' }) => void } | null>(null);
  const [cariSearchText, setCariSearchText] = useState(() => formatCariAdi(teklif.cari.firmaAdi));

  // Toggle açıldığında imleci doğrudan TextArea'ya getir. Animasyon mount
  // sonrası 1 frame bekleyerek transition'la çakışmayı önler.
  useEffect(() => {
    if (!teklif.notlarGosterilsin || readOnly) return;
    const id = window.setTimeout(() => {
      notesTextareaRef.current?.focus({ cursor: 'end' });
    }, 50);
    return () => window.clearTimeout(id);
  }, [teklif.notlarGosterilsin, readOnly]);

  const [satirFocusCell, setSatirFocusCell] = useState<SatirCellField>('urunKod');
  // Hover edilen satırın id'si — aktif değilken bile Sil ikonu portal'da
  // gözüksün diye (active panel ile aynı pozisyonda).
  const [hoverRowId, setHoverRowId] = useState<string | null>(null);
  // Satır başındaki numaraya tıklanınca o satırın id'si bu set'e eklenir;
  // tekrar tıklanırsa çıkarılır. Görsel inceleme/işaretleme amaçlı, kalıcı
  // değil — teklif state'ine yazılmaz.
  const [markedRowIds, setMarkedRowIds] = useState<Set<string>>(() => new Set());

  const toggleRowMark = useCallback(
    (satirId: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      setMarkedRowIds((prev) => {
        const next = new Set(prev);
        if (next.has(satirId)) next.delete(satirId);
        else next.add(satirId);
        return next;
      });
    },
    [],
  );

  // Tabloda hücreden hücreye Enter ile gezinme sırası. Set alt kalemde
  // sadece urunKod / aciklama / miktar düzenlenebilir; satır bazlı para birimi
  // kapalıysa paraBirimi atlanır.
  const CELL_NAV_ORDER: SatirCellField[] = ['marka', 'urunKod', 'aciklama', 'miktar', 'paraBirimi', 'birimFiyat', 'teslimat'];

  const isCellEditableForSatir = useCallback(
    (cell: SatirCellField, satir: TeklifSatiri): boolean => {
      if (satir.setAltKalem) {
        return cell === 'urunKod' || cell === 'aciklama' || cell === 'miktar';
      }
      if (cell === 'paraBirimi') return satirBazliParaBirimi;
      return true;
    },
    [satirBazliParaBirimi],
  );

  // Aktif hücreden bir sonrakine geç. Satır sonunda bir alt satıra atla;
  // son satırın sonunda popup'ı kapat.
  const handleEnterNext = useCallback(() => {
    if (!editingAlan?.startsWith('satir-')) {
      setHoverRowId(null);
      onEditingAlanDegistir(null);
      return;
    }
    const satirId = editingAlan.slice(6);
    const satirIdx = teklif.satirlar.findIndex((s) => s.id === satirId);
    if (satirIdx < 0) {
      setHoverRowId(null);
      onEditingAlanDegistir(null);
      return;
    }
    const satir = teklif.satirlar[satirIdx];
    const curIdx = CELL_NAV_ORDER.indexOf(satirFocusCell);
    // Aynı satır içinde sonraki düzenlenebilir hücre
    for (let i = curIdx + 1; i < CELL_NAV_ORDER.length; i++) {
      const nx = CELL_NAV_ORDER[i];
      if (isCellEditableForSatir(nx, satir)) {
        setSatirFocusCell(nx);
        return;
      }
    }
    // Bir alt satıra geç (varsa)
    const nextRow = teklif.satirlar[satirIdx + 1];
    if (nextRow) {
      // Alt satırın ilk düzenlenebilir hücresi
      const firstCell = CELL_NAV_ORDER.find((c) => isCellEditableForSatir(c, nextRow)) ?? 'urunKod';
      setSatirFocusCell(firstCell);
      onEditingAlanDegistir(`satir-${nextRow.id}`);
      return;
    }
    // Son satır sonu — popup'ı kapat
    setHoverRowId(null);
    onEditingAlanDegistir(null);
  }, [editingAlan, teklif.satirlar, satirFocusCell, isCellEditableForSatir, onEditingAlanDegistir]);

  // Hücreye tıklayınca aktif et (popup açar).
  const handleSatirCellClick = useCallback(
    (satir: TeklifSatiri, cell: SatirCellField) => (e: React.MouseEvent) => {
      if (readOnly) return;
      e.stopPropagation();
      setSatirFocusCell(cell);
      onEditingAlanDegistir(`satir-${satir.id}`);
    },
    [onEditingAlanDegistir, readOnly],
  );

  const renderFirstPageHeader = () => (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        width: '100%',
        height: `${LOGO_OPT_H}px`,
        marginBottom: '10px',
        ...noBreak,
      }}>
        <div style={{ flex: '0 0 37%', maxWidth: '37%', paddingRight: '8px', boxSizing: 'border-box', lineHeight: 0 }}>
          <div style={{
            width: `${LOGO_OPT_W}px`,
            height: `${LOGO_OPT_H}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}>
            <img src={firmaBilgi.logoPath} alt={firmaBilgi.kisaAd} style={{
              width: '100%', height: '100%',
              objectFit: 'contain', objectPosition: 'left center',
              display: 'block',
              imageRendering: HIGH_QUALITY_IMAGE_RENDERING,
              printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
            }} />
          </div>
        </div>
        <div style={{ flex: '0 0 31%', maxWidth: '31%', paddingRight: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <div style={{ fontWeight: 800, fontSize: '11.5px', color: C.navy, lineHeight: '1.25', letterSpacing: '-0.012em' }}>
            {firmaBilgi.ad}
          </div>
          {firmaBilgi.adres && (
            <div style={{ fontSize: '9.2px', lineHeight: '1.35', color: C.textSoft, letterSpacing: '0.01em' }}>
              {firmaBilgi.adres}
            </div>
          )}
        </div>
        <div style={{ flex: '0 0 32%', maxWidth: '32%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', boxSizing: 'border-box' }}>
          <div style={{ width: '202px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'visible', boxSizing: 'border-box' }}>
            <div style={{
              background: BRAND.gradient, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
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
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '2px 0 1px 0', lineHeight: 1.3, letterSpacing: '0.04em' }}>Teklif No</td>
                  <td style={{ fontSize: '12.1px', fontWeight: 800, color: C.navy, padding: '2px 0 1px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>{teklif.teklifNo}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.04em' }}>Tarih</td>
                  <td style={{ fontSize: '10.9px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {readOnly ? (
                      formatDate(teklif.tarih)
                    ) : (
                      <DatePicker
                        size="small"
                        variant="borderless"
                        value={dayjs(teklif.tarih)}
                        onChange={(d) => d && onTarihDegistir(d.format('YYYY-MM-DD'))}
                        format="DD.MM.YYYY"
                        style={{ fontSize: '10.9px', padding: 0, width: 110 }}
                        allowClear={false}
                        suffixIcon={null}
                      />
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.04em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '10px', fontWeight: 400, color: C.textSoft, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap' }}>{teklif.hazirlayanAdSoyad || firmaBilgi.kisaAd}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={PARTY_GRID_STYLE}>
        <div style={PARTY_CARD_STYLE}>
          <div style={PARTY_LABEL_STYLE}>
            Gönderen <span style={{ fontWeight: 400, opacity: 0.6 }}>/ From</span>
          </div>
          <div style={PARTY_NAME_STYLE}>{firmaBilgi.ad}</div>
          <div style={PARTY_BODY_STYLE}>
            {firmaBilgi.telefon ? <>Tel: {formatPhone(firmaBilgi.telefon.replace(/\s+/g, ''))}<br /></> : null}
            {firmaBilgi.web}
          </div>
        </div>
        <div data-alan="musteri" style={{ ...PARTY_CARD_STYLE, background: 'transparent' }}>
          <div style={PARTY_LABEL_STYLE}>
            Alıcı <span style={{ fontWeight: 400, opacity: 0.6 }}>/ To</span>
          </div>

          {/* Firma adı hücresi — kendi popup'ı */}
          {readOnly ? (
            <div style={PARTY_NAME_STYLE}>{formatCariAdi(teklif.cari.firmaAdi) || '—'}</div>
          ) : (
            <Popover
              open={editingAlan === 'musteri-firma'}
              onOpenChange={(open) => {
                if (open) setCariSearchText(formatCariAdi(teklif.cari.firmaAdi));
                onEditingAlanDegistir(open ? 'musteri-firma' : null);
              }}
              trigger={['click']}
              placement="bottomLeft"
              destroyTooltipOnHide
              content={
                <div style={{ width: 380, padding: '2px 0' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Firma</div>
                  <InlineCariAutocompleteField
                    autoFocus
                    style={{ width: '100%' }}
                    value={cariSearchText}
                    onChange={setCariSearchText}
                    onCariSelect={(cari) => {
                      if (cari) {
                        setCariSearchText(formatCariAdi(cari.firmaAdi));
                        onCariDegistir(cari);
                        onEditingAlanDegistir('musteri-muhatap');
                      }
                    }}
                    placeholder={formatCariAdi(teklif.cari.firmaAdi) || 'Firma adı veya cari kod...'}
                    popupMinWidth={360}
                  />
                </div>
              }
            >
              <div style={{ ...PARTY_NAME_STYLE, cursor: 'pointer' }}>
                {formatCariAdi(teklif.cari.firmaAdi) || '—'}
              </div>
            </Popover>
          )}

          <div style={PARTY_BODY_STYLE}>
            {/* Muhatap satırı — kendi popup'ı */}
            {readOnly ? (
              muhatapSatiri && <div style={{ fontWeight: '500', marginBottom: '1px' }}>Sayın {muhatapSatiri}</div>
            ) : (
              <Popover
                open={editingAlan === 'musteri-muhatap'}
                onOpenChange={(open) => onEditingAlanDegistir(open ? 'musteri-muhatap' : null)}
                trigger={['click']}
                placement="bottomLeft"
                destroyTooltipOnHide
                content={
                  <div style={{ width: 340, padding: '2px 0' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Muhatap</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ whiteSpace: 'nowrap', fontSize: 13, color: '#444' }}>Sayın</span>
                      <Input
                        ref={muhatapRef}
                        autoFocus
                        size="middle"
                        style={{ flex: 1 }}
                        value={contactName}
                        onChange={(e) => onContactNameDegistir(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); onEditingAlanDegistir(null); }
                          if (e.key === 'Escape') onEditingAlanDegistir(null);
                        }}
                        placeholder="muhatap adı"
                      />
                      <Select
                        size="middle"
                        style={{ width: 100 }}
                        value={contactTitle}
                        onChange={onContactTitleDegistir}
                        options={[{ value: 'BEY', label: 'Bey' }, { value: 'HANIM', label: 'Hanım' }]}
                      />
                    </div>
                  </div>
                }
              >
                <div style={{ fontWeight: 500, marginBottom: '1px', cursor: 'pointer' }}>
                  {muhatapSatiri ? <>Sayın {muhatapSatiri}</> : <span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>Muhatap ekle…</span>}
                </div>
              </Popover>
            )}

            {/* Tel hücresi — kendi popup'ı */}
            <div>
              {readOnly ? (
                teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>
              ) : (
                <Popover
                  open={editingAlan === 'musteri-telefon'}
                  onOpenChange={(open) => onEditingAlanDegistir(open ? 'musteri-telefon' : null)}
                  trigger={['click']}
                  placement="bottomLeft"
                  destroyTooltipOnHide
                  content={
                    <div style={{ width: 280, padding: '2px 0' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Telefon</div>
                      <Input
                        autoFocus
                        size="middle"
                        style={{ width: '100%' }}
                        value={teklif.cari.telefon || ''}
                        onChange={(e) => onCariTelefonDegistir(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); onEditingAlanDegistir(null); }
                          if (e.key === 'Escape') onEditingAlanDegistir(null);
                        }}
                        placeholder="0xxx xxx xx xx"
                      />
                    </div>
                  }
                >
                  <span style={{ cursor: 'pointer' }}>
                    Tel: {teklif.cari.telefon ? formatPhone(teklif.cari.telefon) : <span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>ekle…</span>}
                  </span>
                </Popover>
              )}
              {(teklif.cari.telefon || !readOnly) && <span> &nbsp;|&nbsp; </span>}
              {/* E-posta hücresi — kendi popup'ı */}
              {readOnly ? (
                <span>{teklif.cari.ePosta || DEFAULT_TEKLIF_EMAIL}</span>
              ) : (
                <Popover
                  open={editingAlan === 'musteri-eposta'}
                  onOpenChange={(open) => onEditingAlanDegistir(open ? 'musteri-eposta' : null)}
                  trigger={['click']}
                  placement="bottomLeft"
                  destroyTooltipOnHide
                  content={
                    <div style={{ width: 320, padding: '2px 0' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>E-posta</div>
                      <Input
                        autoFocus
                        size="middle"
                        type="email"
                        style={{ width: '100%' }}
                        value={teklif.cari.ePosta || ''}
                        onChange={(e) => onCariEPostaDegistir(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (!next) onCariEPostaDegistir(DEFAULT_TEKLIF_EMAIL);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); onEditingAlanDegistir(null); }
                          if (e.key === 'Escape') onEditingAlanDegistir(null);
                        }}
                        placeholder={DEFAULT_TEKLIF_EMAIL}
                      />
                    </div>
                  }
                >
                  <span style={{ cursor: 'pointer' }}>{teklif.cari.ePosta || DEFAULT_TEKLIF_EMAIL}</span>
                </Popover>
              )}
            </div>

            {teklif.cari.vergiNo && (
              <div>VKN: {teklif.cari.vergiNo}{teklif.cari.vergiDairesi && <span> &nbsp;-&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}</div>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const ayarAlanIds = ['ayar-paraBirimi', 'ayar-odemeVadesi', 'ayar-kdvOrani', 'ayar-kur', 'ayar-gecerlilik'] as const;
        const items = buildSettingsItems(teklif, satirBazliParaBirimi);

        const paraBirimiMenuItems = [
          { key: 'TRY', label: 'Türk Lirası (TL)' },
          { key: 'EUR', label: 'Euro (EUR)' },
          { key: 'USD', label: 'Amerikan Doları (USD)' },
        ];
        const odemeVadesiMenuItems = ['Peşin', '15 Gün', '30 Gün', '45 Gün', '60 Gün', '90 Gün']
          .map((v) => ({ key: v, label: v }));
        const kdvMenuItems = [
          { key: '0', label: 'Hariç' },
          { key: '1', label: '%1' },
          { key: '10', label: '%10' },
          { key: '20', label: '%20' },
        ];
        const gecerlilikMenuItems = ['1 Hafta', '2 Hafta', '1 Ay', '2 Ay', '3 Ay', 'Sınırsız']
          .map((v) => ({ key: v, label: v }));

        return (
          <div style={SETTINGS_GRID_STYLE}>
            {items.map((item, i) => {
              const alanId = ayarAlanIds[i];
              const isReadonly = i === 3; // sadece Döviz Kuru salt-okunur
              const editable = !isReadonly && !readOnly;

              const cardInner = (
                <div
                  key={alanId}
                  data-alan={alanId}
                  style={{
                    ...SETTINGS_CARD_STYLE,
                    cursor: editable ? 'pointer' : 'default',
                  }}
                >
                  <div style={SETTINGS_LABEL_STYLE}>
                    <span style={SETTINGS_TR_LABEL_STYLE}>{item.tr}</span>
                    <span style={SETTINGS_SEP_STYLE}>/</span>
                    <span style={SETTINGS_EN_LABEL_STYLE}>{item.en}</span>
                  </div>
                  <div style={SETTINGS_VALUE_STYLE}>{item.value}</div>
                </div>
              );

              if (!editable) return cardInner;

              const menu =
                i === 0
                  ? { items: paraBirimiMenuItems, onClick: ({ key }: { key: string }) => onParaBirimiDegistir(key as ParaBirimi) }
                  : i === 1
                  ? { items: odemeVadesiMenuItems, onClick: ({ key }: { key: string }) => onOdemeVadesiDegistir(key) }
                  : i === 2
                  ? { items: kdvMenuItems, onClick: ({ key }: { key: string }) => onKdvOraniDegistir(Number(key)) }
                  : { items: gecerlilikMenuItems, onClick: ({ key }: { key: string }) => onGecerlilikSuresiDegistir(key) };

              return (
                <Dropdown
                  key={alanId}
                  trigger={['click']}
                  menu={menu}
                  placement="bottom"
                  open={editingAlan === alanId}
                  onOpenChange={(open) => onEditingAlanDegistir(open ? alanId : null)}
                >
                  {cardInner}
                </Dropdown>
              );
            })}
          </div>
        );
      })()}
    </>
  );

  const renderTable = (page: TeklifPagePlan) => {
    if (!page.showTableHeader) return null;
    const pageSatirIds = teklif.satirlar
      .slice(page.rowStartIndex, page.rowEndIndex)
      .map((s) => s.id);

    return (
      <>
        <div style={{ ...TABLE_TITLE_STYLE, display: page.showFullHeader ? 'block' : 'none' }}>
          Teklif Kalemleri <span style={{ fontWeight: 400, opacity: 0.55 }}>/ Line Items</span>
        </div>
        <PageTableWithResizer
          satirIds={pageSatirIds}
          scale={scale}
          readOnly={readOnly}
          onSatirGuncelle={onSatirGuncelle}
        >
        <table className="offer-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '0', marginBottom: 0 }}>
          <TableColgroup satirBazliParaBirimi={satirBazliParaBirimi} teklifSatirlari={teklif.satirlar} />
          <thead>
            <tr>
              {[
                { label: '#', sub: '', align: 'center' as const },
                { label: 'Marka', sub: 'Brand', align: 'center' as const },
                { label: 'Ürün Kodu', sub: 'Item No', align: 'left' as const },
                { label: 'Açıklama', sub: 'Description', align: 'left' as const },
                { label: 'Miktar', sub: 'Qty', align: 'center' as const },
                satirBazliParaBirimi
                  ? { label: 'Para Birimi', sub: 'Currency', align: 'center' as const }
                  : { label: '', sub: '', align: 'center' as const },
                { label: 'Birim Fiyat', sub: 'Unit Price', align: 'right' as const },
                { label: 'Toplam', sub: 'Total', align: 'right' as const },
                { label: 'Teslimat', sub: 'Delivery', align: 'center' as const },
              ].map((col, i) => (
                <th key={i} style={getTableHeadCellStyle(col.align)}>
                  {col.label}
                  {col.sub && <span style={{ ...TABLE_HEAD_SUBLABEL_STYLE, textAlign: col.align }}>{col.sub}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr aria-hidden="true">
              <td colSpan={OFFER_TABLE_COLUMN_COUNT} style={{ height: '4px', padding: 0, border: 'none', background: 'transparent' }} />
            </tr>
            {teklif.satirlar.slice(page.rowStartIndex, page.rowEndIndex).map((satir, localIndex) => {
              const idx = page.rowStartIndex + localIndex;
              const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi);
              const isRowActive = editingSatirId === satir.id;
              const setGroupPos = computeSetGroupPos(teklif.satirlar, idx);
              const isInsideSetGroup = setGroupPos === 'top' || setGroupPos === 'middle';
              const colCount = OFFER_TABLE_COLUMN_COUNT;
              const isMarked = markedRowIds.has(satir.id);

              const applyCellStyle = (style: React.CSSProperties): React.CSSProperties =>
                isMarked
                  ? { ...style, background: 'rgba(0, 0, 0, 0.06)' }
                  : style;

              const isLastRow = idx === teklif.satirlar.length - 1;
              const isFirstRow = idx === 0;
              // Indicator zone: 2px yüksekli tr (border-spacing: 0 olduğu için
              // satırlar arası boşluğu DA bu sağlar). Tek buton + ince HIT AREA
              // satır sınırında ortalanır. Hover sadece sınıra yakınken parlar.
              // Set grubu içinde RENDER EDİLMEZ → hem boşluk hem buton kaybolur,
              // grup tek bir çerçeve gibi davranır.
              const renderInsertButton = (afterIndex: number, key: string, gapPx: number) => (
                <tr key={key} className="satir-araya-ekle-zone" style={{ height: gapPx }}>
                  <td colSpan={colCount} style={{ padding: 0, border: 'none', position: 'relative', height: gapPx, overflow: 'visible' }}>
                    <div
                      className="satir-araya-ekle-hit"
                      style={{
                        position: 'absolute', left: 0, right: 0, top: -7, height: 14,
                        cursor: 'default', zIndex: 24,
                        // Parent .satir-araya-ekle-zone pointer-events:none →
                        // hit area icin override; ancak resize handle'in
                        // UZERINE cikmamali; aksi halde mavi cizgi hover alamaz.
                        pointerEvents: readOnly ? 'none' : 'auto',
                      }}
                    />
                    <div
                      className="satir-araya-ekle-btn"
                      onClick={readOnly ? undefined : (e) => { e.stopPropagation(); onSatirArayaEkle(afterIndex); }}
                      style={{
                        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 45, display: 'flex', alignItems: 'center', gap: 4,
                        padding: '1px 10px', borderRadius: 10,
                        background: 'rgba(37,99,235,0.07)', border: `1px solid ${C.accent}`,
                        color: C.accent, fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                        opacity: 0, transition: 'opacity 0.18s',
                        pointerEvents: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      <PlusOutlined style={{ fontSize: 8 }} /> Araya ekle
                    </div>
                  </td>
                </tr>
              );
              // Ilk satirin USTUNDE: 0-yukseklik (header spacer zaten boşluğu sağlar)
              const insertAbove = isFirstRow ? renderInsertButton(-1, `insert-top-${satir.id}`, 0) : null;
              // Satirin ALTI: son satir veya set grubu içiyse render edilmez
              const insertIndicator = (isLastRow || isInsideSetGroup)
                ? null
                : renderInsertButton(idx, `insert-${satir.id}`, OFFER_TABLE_ROW_GAP_PX);


              const isActiveCell = (cell: SatirCellField) => isRowActive && satirFocusCell === cell;
              // Hücre tıklaması popup'ı açar (CellEditPopup, render ağacının tepesinde tek mount).
              const cellClick = (cell: SatirCellField) => handleSatirCellClick(satir, cell);
              const activeClass = (cell: SatirCellField) => (isActiveCell(cell) ? 'is-active-cell' : undefined);

              return (
                <React.Fragment key={satir.id}>
                  {insertAbove}
                  <tr
                    data-satir-id={satir.id}
                    onMouseEnter={() => setHoverRowId(satir.id)}
                    onMouseLeave={() => setHoverRowId((curr) => (curr === satir.id ? null : curr))}
                    style={{
                      ...noBreak,
                      ...(satir.rowHeight && satir.rowHeight > 0
                        ? { height: `${satir.rowHeight}px` }
                        : null),
                    }}
                  >
                    <RowCell
                      idx={idx}
                      pos="first"
                      setGroupPos={setGroupPos}
                      style={applyCellStyle({ ...ROW_TEXT.no })}
                    >
                      {satir.setAltKalem ? (
                        <span
                          onClick={toggleRowMark(satir.id)}
                          title={isMarked ? 'İşareti kaldır' : 'Satırı işaretle'}
                          style={{ ...SET_SUBITEM_NUMBER_STYLE, cursor: 'pointer' }}
                        >
                          {renderSetSubitemNumber(computeSetSubitemIndex(teklif.satirlar, idx) ?? 1)}
                        </span>
                      ) : (
                        <span
                          onClick={toggleRowMark(satir.id)}
                          title={isMarked ? 'İşareti kaldır' : 'Satırı işaretle'}
                          style={{ cursor: 'pointer' }}
                        >
                          {String(computeMainItemIndex(teklif.satirlar, idx)).padStart(2, '0')}
                        </span>
                      )}
                    </RowCell>
                    <RowCell idx={idx} pos="mid" setGroupPos={setGroupPos} data-cell-field="marka" onClick={cellClick('marka')} className={activeClass('marka')} style={applyCellStyle({ cursor: 'pointer', textAlign: 'center' })}>
                      <span style={ROW_TEXT.brand}>{satir.marka || '-'}</span>
                    </RowCell>
                    <RowCell idx={idx} pos="mid" setGroupPos={setGroupPos} data-cell-field="urunKod" onClick={cellClick('urunKod')} className={`product-code-cell ${activeClass('urunKod') ?? ''}`.trim()} style={applyCellStyle({ cursor: 'pointer', textAlign: 'left' })}>
                      <span style={ROW_TEXT.code}>{satir.urunKod || '-'}</span>
                    </RowCell>
                    <RowCell idx={idx} pos="mid" setGroupPos={setGroupPos} data-cell-field="aciklama" onClick={cellClick('aciklama')} className={`description-cell ${activeClass('aciklama') ?? ''}`.trim()} style={applyCellStyle({ cursor: 'pointer', textAlign: 'left' })}>
                      <span>
                        <DescText text={satir.aciklama || '-'} />
                      </span>
                    </RowCell>
                    <RowCell
                      idx={idx}
                      pos="mid"
                      setGroupPos={setGroupPos}
                      data-cell-field="miktar"
                      onClick={cellClick('miktar')}
                      className={activeClass('miktar')}
                      style={applyCellStyle({ cursor: 'pointer', textAlign: 'left' })}
                    >
                      {satir.miktar !== 0 ? (
                        <div style={ROW_SHELL.quantityWrap}>
                          <span style={{ ...ROW_TEXT.quantityValue, ...ROW_SHELL.quantityValueWrap }}>{formatDisplayNumber(satir.miktar, 0, 4)}</span>
                          <span style={{ ...ROW_TEXT.quantityUnit, ...ROW_SHELL.quantityUnitWrap }}>{formatBirimAbbrev(satir.birim)}</span>
                        </div>
                      ) : <span>-</span>}
                    </RowCell>
                    {/* Para Birimi — satirBazli'da gösterilir, değilse boş. */}
                    <RowCell
                      idx={idx}
                      pos="mid"
                      setGroupPos={setGroupPos}
                      data-cell-field="paraBirimi"
                      onClick={satirBazliParaBirimi ? cellClick('paraBirimi') : undefined}
                      className={activeClass('paraBirimi')}
                      style={applyCellStyle({ cursor: satirBazliParaBirimi ? 'pointer' : 'default', textAlign: 'center' })}
                    >
                      {satirBazliParaBirimi ? (
                        <span style={ROW_TEXT.currency}>{formatParaBirimiLabel(satirPb)}</span>
                      ) : null}
                    </RowCell>
                    {/* Birim Fiyat — alt kalemde tıklanamaz */}
                    <RowCell
                      idx={idx}
                      pos="mid"
                      setGroupPos={setGroupPos}
                      data-cell-field="birimFiyat"
                      onClick={satir.setAltKalem ? undefined : cellClick('birimFiyat')}
                      className={!satir.setAltKalem ? activeClass('birimFiyat') : undefined}
                      style={applyCellStyle({ cursor: satir.setAltKalem ? 'default' : 'pointer', textAlign: 'right' })}
                    >
                      {satir.setAltKalem ? null : (
                        <span style={ROW_TEXT.price}>{(() => {
                          const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                          return nihai !== 0 ? formatDisplayNumber(nihai, 2, 2) : '-';
                        })()}</span>
                      )}
                    </RowCell>
                    {/* Toplam — salt-okunur */}
                    <RowCell
                      idx={idx}
                      pos="mid"
                      setGroupPos={setGroupPos}
                      style={applyCellStyle({ textAlign: 'right' })}
                    >
                      {satir.setAltKalem ? null : (
                        <span style={ROW_TEXT.total}>
                          {satir.satirToplami !== 0 ? formatDisplayNumber(satir.satirToplami, 2, 2) : '-'}
                        </span>
                      )}
                    </RowCell>
                    {/* Teslimat — alt kalemde tıklanamaz; aksiyon paneli burada */}
                    <RowCell
                      idx={idx}
                      pos="last"
                      setGroupPos={setGroupPos}
                      data-cell-field="teslimat"
                      onClick={satir.setAltKalem ? undefined : cellClick('teslimat')}
                      className={!satir.setAltKalem ? activeClass('teslimat') : undefined}
                      style={applyCellStyle({ position: 'relative', cursor: satir.setAltKalem ? 'default' : 'pointer', textAlign: 'center' })}
                    >
                      {satir.setAltKalem ? null : (
                        <span style={ROW_TEXT.delivery}>{satir.teslimTarihi || '-'}</span>
                      )}
                      {(satir.indirimOrani || 0) > 0 && !isRowActive && hoverRowId !== satir.id && (
                        <SatirIskontoRozeti rowId={satir.id} oran={satir.indirimOrani || 0} />
                      )}
                      {!readOnly && (isRowActive || hoverRowId === satir.id) && (
                        <SatirAksiyonlariPanel
                          satir={satir}
                          satirBazliIskonto={!satir.setAltKalem && isRowActive && satirBazliIskonto}
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onSil={() => onSatirSil(satir.id)}
                        />
                      )}
                    </RowCell>
                  </tr>
                  {insertIndicator}
                </React.Fragment>
              );
            })}
            {page.pageNumber === pages.length && teklif.satirlar.length === 0 && (
              <tr>
                <td
                  colSpan={OFFER_TABLE_COLUMN_COUNT}
                  onClick={readOnly ? undefined : (e) => { e.stopPropagation(); onSatirEkle(); }}
                  style={{
                    padding: '14px 7px', textAlign: 'center', fontSize: '11px', color: '#777777',
                    cursor: readOnly ? 'default' : 'pointer', border: `1px dashed ${C.borderSoft}`, borderRadius: ROW_CARD.radius,
                    background: 'rgba(37, 99, 235, 0.02)',
                  }}
                >
                  <PlusOutlined style={{ marginRight: 6, fontSize: 11 }} />
                  İlk kalem satırını eklemek için tıklayın
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </PageTableWithResizer>
        {page.pageNumber === pages.length && teklif.satirlar.length > 0 && !readOnly && (
          // 0-yukseklik wrapper + absolutely positioned bar → tabloya
          // YERLESTIR ama altindaki Genel Toplam karti ASLA kaymasin.
          // Bar tablonun hemen altinda yuzer (uzeri-altinda totals'a degil,
          // table+totals arasi mevcut bosluga oturmus gorunur).
          <div style={{ position: 'relative', height: 0, overflow: 'visible' }}>
            <div
              className="belge-kalem-ekle-bar"
              onClick={(e) => { e.stopPropagation(); onSatirEkle(); }}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 5,
                padding: '5px 0',
                cursor: 'pointer',
                fontSize: '9.5px',
                fontWeight: 600,
                color: C.accent,
                letterSpacing: '0.01em',
                opacity: 0.55,
                userSelect: 'none',
                transition: 'opacity 0.18s',
                zIndex: 5,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.55'; }}
            >
              <PlusOutlined style={{ fontSize: 9 }} /> Yeni kalem ekle
            </div>
          </div>
        )}
      </>
    );
  };

  const renderTotals = () =>
    !satirBazliParaBirimi ? (
      // Çerçeve 56%/44% yapıda; rakamlar amountRightOffsetPx ile tablonun
      // "Toplam" kolonu değer X'iyle birebir hizalanır. Üst ve alt boşluklar
      // "ortalama" — tablo ile arasında ferah ama abartısız nefes payı.
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        marginTop: '14px', marginBottom: '0',
        tableLayout: 'fixed', borderLeft: 'none', borderRight: 'none',
        printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', ...noBreak,
      } as React.CSSProperties}>
        <colgroup><col style={{ width: '56%' }} /><col /></colgroup>
        <tbody>
          <tr>
            <td style={{ borderTop: 'none', borderBottom: 'none' }} />
            <td style={{ padding: '0', borderTop: 'none', borderBottom: 'none', verticalAlign: 'top' }}>
              <TotalsCard
                araToplam={araToplam}
                iskontoOrani={iskontoOrani}
                iskontoTutar={iskontoTutar}
                kdvOrani={kdvOrani}
                kdvTutar={kdvTutar}
                genelToplam={genelToplam}
                paraBirimi={teklif.paraBirimi}
                variant="light"
                amountRightOffsetPx={computeTotalsAmountRightOffset(teklif.satirlar, false)}
              />
            </td>
          </tr>
        </tbody>
      </table>
    ) : (
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        marginTop: '32px', marginBottom: '14px',
        tableLayout: 'fixed', border: 'none',
        printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', ...noBreak,
      } as React.CSSProperties}>
        <colgroup><col style={{ width: '56%' }} /><col /></colgroup>
        <tbody>
          <tr>
            <td colSpan={2} style={{ padding: '6px 10px 8px', borderBottom: 'none' }}>
              <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: kullanilanParaKartlari.length >= 3 ? 'flex-start' : 'flex-end', alignItems: 'flex-start', gap: '10px' }}>
                {kullanilanParaKartlari.map((item) => (
                  <div key={item.pb} style={{ width: '220px', minWidth: '220px', flexShrink: 0, position: 'relative', boxSizing: 'border-box', borderRadius: '10px', border: `0.75px solid ${C.border}`, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(26,43,66,0.05)' }}>
                    <FinansalOzetKartIci araToplam={item.araToplam} iskontoOrani={iskontoOrani} iskontoTutar={item.iskontoTutar} kdvOrani={kdvOrani} kdvTutar={item.kdvTutar} genelToplam={item.total} paraBirimi={item.pb} variant="pdf" />
                  </div>
                ))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );

  // AnimatedNotesContainer kapanış animasyonu sırasında (~320ms) DOM'da
  // tutar; toggle ON/OFF arasında smooth bir geçiş sağlar. Toggle hiç
  // kullanılmadığında bile mount edilir ama 0 height + opacity 0 olduğu
  // için layout etkilemez.
  const renderNotes = () => (
    <AnimatedNotesContainer open={!!teklif.notlarGosterilsin}>
      <div
        data-alan="notlar"
        style={{
          ...NOTES_BOX_STYLE,
          ...noBreak,
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
        } as React.CSSProperties}
      >
        <strong
          style={{
            color: C.navy,
            fontSize: '10.5px',
            letterSpacing: 'inherit',
            lineHeight: 1.45,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Notlar / Notes:
        </strong>
        <Input.TextArea
          ref={notesTextareaRef as never}
          variant="borderless"
          value={teklif.notlar}
          onChange={(e) => onNotlarDegistir(e.target.value)}
          autoSize={{ minRows: 1 }}
          readOnly={readOnly}
          placeholder="burada not ekleyin..."
          style={{
            flex: 1,
            minWidth: 0,
            padding: 0,
            fontSize: '10.5px',
            lineHeight: 1.45,
            color: C.textMid,
            fontFamily: 'inherit',
            letterSpacing: 'inherit',
            background: 'transparent',
            resize: 'none',
            border: 'none',
            boxShadow: 'none',
          }}
        />
      </div>
    </AnimatedNotesContainer>
  );

  return (
    <div
      className={readOnly ? 'belge-inline belge-readonly' : 'belge-inline'}
    >
      <style>{FIELD_CSS}{`
        .belge-inline .offer-table {
          ${LINE_ITEM_CSS_VARS}
        }
        .satir-aksiyonlari { pointer-events: auto; }
        /* .belge-satir-hover-actions CSS rule'ları kaldırıldı — hover Sil
           ikonu artık SatirAksiyonlariPanel ile portal'da basılır
           (active panel ile aynı pozisyon). */
        .belge-readonly .satir-araya-ekle-btn { display: none !important; }
        .belge-readonly tr[data-satir-id] td { cursor: default !important; }
        .belge-readonly [data-alan] { cursor: default !important; }
        /* Alıcı / musteri card — hover renk değişimi yok */
        .belge-inline [data-alan="musteri"] .ant-select:hover .ant-select-content,
        .belge-inline [data-alan="musteri"] .ant-select:hover { background: transparent !important; border-color: transparent !important; box-shadow: none !important; }
        .belge-inline [data-alan="musteri"] .ant-input:hover { background: transparent !important; border-color: transparent !important; box-shadow: none !important; }
        .belge-inline [data-alan="musteri"] .ant-btn,
        .belge-inline [data-alan="musteri"] .ant-btn:hover { background: transparent !important; border: none !important; color: inherit !important; box-shadow: none !important; }
        .belge-inline [data-alan="musteri"] .anticon { color: inherit !important; }
        .belge-inline [data-alan="musteri"] .anticon:hover { color: inherit !important; }
        .belge-inline-cari-dropdown .ant-select-item { font-family: inherit; font-size: 11.5px; line-height: 1.35; letter-spacing: -0.01em; color: ${C.textMid}; }
        .belge-inline-cari-dropdown .ant-select-item-option { padding: 6px 10px; }
        .belge-inline-cari-dropdown .ant-select-item-option-active:not(.ant-select-item-option-disabled) { background: rgba(237, 242, 251, 0.92); }
        .belge-inline-cari-dropdown .ant-select-item-option-selected:not(.ant-select-item-option-disabled) { background: rgba(226, 232, 240, 0.96); }
        .belge-inline-table-dropdown .ant-select-item { font-family: inherit; font-size: 11px; line-height: 1.35; letter-spacing: inherit; color: ${C.textMid}; }
        .belge-inline-table-dropdown .ant-select-item-option { padding: 5px 8px; }
        .belge-inline-table-dropdown .ant-select-item-option-active:not(.ant-select-item-option-disabled) { background: rgba(237, 242, 251, 0.9); }
        .belge-inline-table-dropdown .ant-select-item-option-selected:not(.ant-select-item-option-disabled) { background: rgba(226, 232, 240, 0.94); color: ${C.navy}; }
        .satir-araya-ekle-zone { pointer-events: none; }
        /* HIT AREA: ince serit (14px) tam satir sinirinda. Sadece bu seride
           imlec varken buton parlar. Satir gövdesine hover etmek tetiklemez
           → asla iki buton ayni anda gorunmez. */
        .satir-araya-ekle-hit:hover ~ .satir-araya-ekle-btn,
        .satir-araya-ekle-btn:hover { opacity: 1 !important; pointer-events: auto !important; }
      `}</style>

      {pages.map((page, pageIdx) => (
        <div
          key={page.pageNumber}
          data-pdf-page="true"
          id={page.pageNumber === 1 ? 'teklif-sablon' : undefined}
          style={{
            ...DOCUMENT_ROOT_STYLE,
            height: `${DOCUMENT_PAGE.heightMm}mm`,
            minHeight: `${DOCUMENT_PAGE.heightMm}mm`,
            overflow: 'hidden',
            marginBottom: page.pageNumber < pages.length ? `${PAGE_GAP_PX}px` : 0,
          } as React.CSSProperties}
        >
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ minHeight: 0 }}>
            {page.showFullHeader && renderFirstPageHeader()}
            {page.showCompactHeader && <CompactHeaderBlock teklif={teklif} />}
            {renderTable(page)}
            {/* Genel Toplam — her iki modda da (tek/çoklu para birimi)
                tablonun hemen altında, sağa hizalı, Siparişi Veren'den
                tamamen bağımsız konumda. */}
            {page.includeTotals && renderTotals()}
            {/* Notes wrapper son sayfada her zaman mount; AnimatedNotesContainer */}
            {/* açık/kapalı animasyonunu yönetir (kapanışta ~320ms mounted kalır). */}
            {page.pageNumber === pages.length && renderNotes()}
            </div>
            {page.includeSignature && (
              <div style={{ marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: '14px' }}>

                  {/* SİPARİŞİ VEREN bloğu — Genel Toplam'dan bağımsız, sayfanın altında.
                      Iç boşluklar ferah: title-content gap 22px, isim/tarih ↔ imza
                      arası gap 44px; rotasyonlu etiket biraz daha büyük + tracking'li. */}
                  <div style={{ flex: '0 0 70%', minWidth: 0, ...SIGNATURE_SECTION_STYLE }}>
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: '22px' }}>

                    {/* Sol: 2-satır dikey başlık (rotasyonlu) — biraz büyütüldü */}
                    <div style={{
                      flexShrink: 0,
                      position: 'relative',
                      width: '40px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        width: '120px',
                        textAlign: 'left',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: C.sigPrimary,
                          letterSpacing: '0.10em',
                          textTransform: 'uppercase',
                          lineHeight: 1.2,
                          marginBottom: '6px',
                        }}>
                          Siparişi Veren
                        </div>
                        <div style={{
                          fontSize: '9.2px',
                          fontWeight: 400,
                          color: C.sigSecondary,
                          letterSpacing: '0.06em',
                          lineHeight: 1.2,
                        }}>
                          Authorised Person
                        </div>
                      </div>
                    </div>

                    {/* Sağ: İçerik — isim, tarih, imza */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '44px' }}>
                        <div style={{ flex: '0 0 42%', fontSize: '11px', lineHeight: '1.45' }}>
                          <div style={{ position: 'relative', top: '16px' }}>
                            <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.sigBorder}`, height: '30px' }} />
                            <div style={{ marginBottom: '6px', marginTop: '2px' }}>
                              <span style={{ fontWeight: 500, color: C.sigPrimary }}>İsim</span>
                              <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                              <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Name</span>
                            </div>
                          </div>
                          <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.sigBorder}`, height: '30px' }} />
                          <div style={{ marginTop: '2px' }}>
                            <span style={{ fontWeight: 500, color: C.sigPrimary }}>Tarih</span>
                            <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                            <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Date</span>
                          </div>
                        </div>
                        <div style={{ flex: '1', fontSize: '11px', lineHeight: '1.45', paddingTop: '54px' }}>
                          <div style={{ width: '115px', marginLeft: '-2cm', borderBottom: `1px solid ${C.sigBorder}`, height: '30px' }} />
                          <div style={{ marginTop: '2px', marginLeft: '-2cm' }}>
                            <span style={{ fontWeight: 500, color: C.sigPrimary }}>İmza</span>
                            <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                            <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Signature</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                  </div>

                </div>
              </div>
            )}
          </div>
          <FooterBlock teklif={teklif} pageNumber={page.pageNumber} totalPages={pages.length} />
          {renderPageOverlay?.(pageIdx)}
        </div>
      ))}
      {!readOnly && (
        <CellEditPopup
          teklif={teklif}
          editingAlan={editingAlan}
          satirFocusCell={satirFocusCell}
          onSatirGuncelle={onSatirGuncelle}
          onSatiraSetUygula={onSatiraSetUygula}
          onClose={() => onEditingAlanDegistir(null)}
          onEnterNext={handleEnterNext}
        />
      )}
    </div>
  );
}

/**
 * AnimatedNotesContainer — toggle değişimine smooth max-height + opacity +
 * translateY geçişi uygular. Kapanırken DOM'da ~320ms tutar, ardından
 * unmount eder; açılırken bir sonraki frame'de "expanded" state'e geçer
 * (initial state'ten direkt expanded olursa transition tetiklenmez).
 *
 * Sadece editör tarafı içindir. Offline ölçüm (TeklifSablonu) ve PDF
 * (TeklifPagedDocument) toggle'a göre koşullu mount/unmount yapar —
 * animasyon yok. Pagination motoru bu wrapper'ı ölçmez (TeklifSablonu'nun
 * #pdf-notes-block'unu ölçer).
 */
function AnimatedNotesContainer({ open, children }: { open: boolean; children: React.ReactNode }) {
  const [render, setRender] = useState<boolean>(open);
  const [expanded, setExpanded] = useState<boolean>(open);

  useEffect(() => {
    if (open) {
      let expandId: number | null = null;
      const showId = window.requestAnimationFrame(() => {
        setRender(true);
        expandId = window.requestAnimationFrame(() => setExpanded(true));
      });
      return () => {
        window.cancelAnimationFrame(showId);
        if (expandId != null) window.cancelAnimationFrame(expandId);
      };
    }

    const collapseId = window.requestAnimationFrame(() => setExpanded(false));
    const hideTimer = window.setTimeout(() => setRender(false), 320);
    return () => {
      window.cancelAnimationFrame(collapseId);
      window.clearTimeout(hideTimer);
    };
  }, [open]);

  if (!render) return null;
  return (
    <div
      style={{
        overflow: 'hidden',
        maxHeight: expanded ? 600 : 0,
        opacity: expanded ? 1 : 0,
        transform: expanded ? 'translateY(0)' : 'translateY(-4px)',
        transition: 'max-height 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease, transform 260ms ease',
      }}
    >
      {children}
    </div>
  );
}
