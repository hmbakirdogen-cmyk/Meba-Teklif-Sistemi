import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AutoComplete, Select, Input, DatePicker, Dropdown, Popover, InputNumber, App } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Teklif, Cari, TeklifSatiri, ParaBirimi, Urun } from '../types';
import { useTeklifFirmaBilgileri } from '../hooks/useTeklifFirma';
import { formatDate, formatTitleCaseTr, formatCariAdi, formatSehir, formatVKN, formatAdres, formatAdSoyad, formatAciklama } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { useAkilliReferans } from '../hooks/useAkilliReferans';
import { urunService } from '../services/urunService';
import { urunSetService } from '../services/urunSetService';
import { formatPhone } from '../utils/phone';
import { getAdaptiveLogoPlacement } from '../styles/logoStyles';
import { POPUP } from '../styles/popupTokens';
import { TotalsCard } from './TotalsCard';
import { RowResizerLayer } from './RowResizerLayer';
import { InlineCariAutocompleteField } from './InlineCariAutocompleteField';
import { EditableField } from './EditableField';
import { SatirRow } from './SatirRow';
import { UNIT_OPTIONS } from './InlineTableRowShared';
import {
  DOCUMENT_BRAND,
  DOCUMENT_COLORS,
  DOCUMENT_PAGE,
  DOCUMENT_ROOT_STYLE,
  FOOTER_BAR_STYLE,
  getFullHeaderLayoutStyles,
  KargoNotuSatiri,
  LINE_ITEM_CSS_VARS,
  OFFER_TABLE_COLUMN_COUNT,
  OFFER_TABLE_ROW_GAP_PX,
  noBreak,
  NOTES_BOX_STYLE,
  PARTY_BODY_STYLE,
  PARTY_GREETING_STYLE,
  PARTY_VKN_LINE_STYLE,
  efektifSatirBazliParaBirimi,
  PARTY_CARD_STYLE,
  PARTY_GRID_STYLE,
  PARTY_LABEL_STYLE,
  PARTY_NAME_STYLE,
  ROW_CARD,
  TableColgroup,
  buildSettingsItems,
  computeTotalsAmountRightOffset,
  getOfferTableSeparatorClass,
  getSettingsGridStyle,
  SETTINGS_CARD_STYLE,
  SETTINGS_LABEL_STYLE,
  SETTINGS_TR_LABEL_STYLE,
  SETTINGS_SEP_STYLE,
  SETTINGS_EN_LABEL_STYLE,
  SETTINGS_VALUE_STYLE,
  SIGNATURE_BLOCK_ROW_STYLE,
  SIGNATURE_SECTION_STYLE,
  TABLE_HEAD_SUBLABEL_STYLE,
  TABLE_TITLE_STYLE,
  getTableHeadCellStyle,
  computeSetGroupPos,
  computeMainItemIndex,
  computeSetSubitemIndex,
} from '../templates/teklifDocumentShared';
import { FIELD_CSS, type EditingAlan } from './belgeInlineConstants';
import ReferanslarDrawer from './ReferanslarDrawer';
import { buildSatirCellNavOrder, type SatirCellField } from './inlineSatirEditorShared';
import type { Snapshot } from '../hooks/useUndoRedo';
import { snapshotChanged } from '../hooks/useUndoRedo';
import type { TeklifPagePlan } from '../services/documentPagination';
import {
  computeCellPopupPosition,
  findSatirCellElement,
} from './paginatedBelgeInlineHelpers';

const C = DOCUMENT_COLORS;
const BRAND = DOCUMENT_BRAND;
const PAGE_GAP_PX = 24;

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
  onCariSehirDegistir: (sehir: string) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM' | 'YETKILI';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM' | 'YETKILI') => void;
  onTarihDegistir: (tarih: string) => void;
  onParaBirimiDegistir: (pb: ParaBirimi) => void;
  satirBazliParaBirimi: boolean;
  satirBazliIskonto: boolean;
  onKdvOraniDegistir: (oran: number) => void;
  onOdemeVadesiDegistir: (vade: string) => void;
  onGecerlilikSuresiDegistir: (sure: string) => void;
  onDovizKuruDegistir: (kur: string) => void;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatiraSetUygula: (satirId: string, setId: string) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;
  onSatirArayaEkle: (afterIndex: number) => void;
  onNotlarDegistir: (notlar: string) => void;
  readOnly?: boolean;
  renderPageOverlay?: (pageIndex: number) => React.ReactNode;
  scale?: number;
  /** Faz 2 undo stack push — popup commit + cari/ayar değişikliklerinde tetiklenir. */
  pushUndo: (snapshot: Snapshot) => void;
  getSnapshot: () => Snapshot;
  /** Üst seviye (CanliA4Belge) — işaretli satır kümesi. PDF kaynağı
   *  (TeklifPagedDocument) ile paylaşılır ki PDF çıktısı satır işaretlerini
   *  aynı şekilde yansıtsın. */
  markedRowIds: Set<string>;
  /** Satır başı numara tıklamasında çağrılır (toggle). */
  toggleRowMark: (satirId: string) => (e: React.MouseEvent) => void;
  /** PDF export kaynağı gibi özel readOnly varyantları için ek root class. */
  rootClassName?: string;
}

function CompactHeaderBlock({ teklif }: { teklif: Teklif }) {
  const firmaBilgi = useTeklifFirmaBilgileri(teklif);
  const compactLogo = getAdaptiveLogoPlacement({
    firmaId: firmaBilgi.id,
    logoPath: firmaBilgi.logoPath,
    surface: 'a4-compact',
    objectPosition: 'left center',
  });

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        paddingBottom: '3.5mm',
        borderBottom: `1.5px solid ${C.panelStrong}`,
      }}>
        <div style={compactLogo.slotStyle}>
          <img
            src={firmaBilgi.logoPath}
            alt={firmaBilgi.kisaAd}
            style={compactLogo.imageStyle}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '10.4px', fontWeight: 800, color: C.navy, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
            {firmaBilgi.ad}
          </span>
          {firmaBilgi.adres && (
            <span style={{ fontSize: '9px', color: C.textSoft, lineHeight: 1.3 }}>
              {formatAdres(firmaBilgi.adres)}
            </span>
          )}
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
/* Popup genişliği artık SABİT değil — içeriğe göre otomatik (width: max-content).
   Bu sabitler yalnızca min/max sınırlar:
   - minWidth: input/select görsel olarak çok dar görünmesin diye taban
   - maxWidth: gereksiz yere geniş olmaması için tavan
   Tarayıcı bu aralıkta içeriğin gerçek ölçüsünü kullanır → optimum boyut.
   Mantık: suggestion paneli olanlar genişlikte daha çok yer ister; tek
   input/select olanlar kompakt durmalı. */
const CELL_POPUP_CONSTRAINTS: Record<SatirCellField, { min: number; max: number }> = {
  marka:      { min: 180, max: 280 },   // Select (kısa marka adları)
  urunKod:    { min: 340, max: 520 },   // Suggestion paneli — uzun açıklama sığsın
  aciklama:   { min: 360, max: 560 },   // TextArea — multi-line açıklama
  miktar:     { min: 220, max: 300 },   // İki sütun (değer + birim)
  paraBirimi: { min: 180, max: 260 },   // Select (TL/EUR/USD)
  birimFiyat: { min: 160, max: 220 },   // Tek number input
  teslimat:   { min: 110, max: 140 },   // Dar — ~12 karakterden sonra alt satıra geçer (hücre kolon hizasında)
};

function CellEditPopup({
  teklif,
  editingAlan,
  satirFocusCell,
  onSatirGuncelle,
  onSatiraSetUygula,
  onClose,
  onEscapeRevert,
}: {
  teklif: Teklif;
  editingAlan: EditingAlan;
  satirFocusCell: SatirCellField;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatiraSetUygula: (satirId: string, setId: string) => void;
  onClose: () => void;
  /** Escape'te aktif hücrenin alanlarını baseline'a geri yükler (parent handle eder). */
  onEscapeRevert?: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  const isOpen = !!editingAlan && editingAlan.startsWith('satir-');
  const satirId = isOpen ? editingAlan!.slice(6) : null;
  const satir = satirId ? teklif.satirlar.find((s) => s.id === satirId) ?? null : null;

  const constraints = CELL_POPUP_CONSTRAINTS[satirFocusCell] ?? { min: 220, max: 360 };
  // Pozisyon hesaplaması için referans genişlik: min ile max arası ortalama.
  // Gerçek popup içeriğine göre genişler (width: max-content), bu değer
  // sadece viewport-clamp hesabı için kullanılır.
  const W = Math.round((constraints.min + constraints.max) / 2);

  // Akıllı sıralı referans listeleri — aktif firmanın kullanım deseniyle
  // sık kullanılanlar yukarıda, son kullanım sırasına göre.
  const akilliMarkalar = useAkilliReferans('markalar');
  const akilliTeslim = useAkilliReferans('teslimSecenekleri');

  // Pozisyon: Aktif hücreyi DOM'dan bul, popup'ı altına; yer yoksa üstüne yerleştir.
  // Sol kenar aktif hücreye, sağ kenar viewport'a clamp'lenir.
  useLayoutEffect(() => {
    if (!isOpen || !satirId) {
      // Cell popup kapanırken pozisyonu sıfırla — DOM ölçümünden derive ediliyor,
      // layout effect external sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPos(null);
      return;
    }
    const compute = () => {
      const cell = findSatirCellElement(satirId, satirFocusCell);
      if (!cell) return;
      const rect = cell.getBoundingClientRect();
      const popupH = popupRef.current?.offsetHeight ?? 100;
      setPos(computeCellPopupPosition({
        cellRect: rect,
        popupHeight: popupH,
        popupWidth: W,
        minWidth: rect.width,
      }));
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

  // Escape / Dışarı tıklama callback'lerini ref'te tut → listener her render'da
  // yeniden bağlanmasın, latest closure'a sahip olsun.
  const stateRef = useRef({ satirId, satirFocusCell, onClose, onEscapeRevert });
  useEffect(() => {
    stateRef.current = { satirId, satirFocusCell, onClose, onEscapeRevert };
  }, [satirId, satirFocusCell, onClose, onEscapeRevert]);

  // Escape ile kapat — Faz 2: önce baseline'a revert, sonra kapat.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        stateRef.current.onEscapeRevert?.();
        stateRef.current.onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Dışarı tıklayınca kapat. mousedown yerine click kullanıyoruz: cellClick
  // handler'ı mousedown→click sırasında çalışır; biz aktif hücre toggle'ını
  // cellClick'te (handleSatirCellClick) hallediyoruz, burada ek "outside"
  // davranışı sadece popup/active-cell/dropdown DIŞINA tıklanırsa kapatma.
  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const { satirId: sid, satirFocusCell: scell, onClose: oc } = stateRef.current;
      if (!sid) return;
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      const activeCell = findSatirCellElement(sid, scell);
      if (activeCell?.contains(target)) return;
      // Başka bir hücreye tıklanmışsa → kendi cellClick handler'ı zaten yeni
      // popup'ı açacak; biz sadece editingAlan'ı geçici olarak kapatıyoruz,
      // ardından handleSatirCellClick yeni hücreyi set ediyor.
      const otherCell = (target as Element)?.closest?.('td[data-cell-field]');
      if (otherCell) return; // cellClick handler kendi yapsın
      // Antd dropdown'ları
      const closestDropdown =
        (target as Element)?.closest?.('.ant-select-dropdown, .ant-picker-dropdown, .ant-popover, .ant-dropdown');
      if (closestDropdown) return;
      oc();
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [isOpen]);

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
    const markalar = akilliMarkalar;
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
          const yeni = value ?? '';
          onSatirGuncelle(satir.id, 'marka', yeni);
          // Marka senkronize — ürün kataloğunda marka boşsa kalıcı kaydet
          if (typeof yeni === 'string' && yeni.trim() && satir.urunKod) {
            urunService.markaSenkronize(satir.urunKod, yeni);
          }
          onClose();
        }}
        onInputKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder="Marka seçin veya yazın…"
        getPopupContainer={() => popupRef.current ?? document.body}
      />
    );
  } else if (satirFocusCell === 'urunKod') {
    title = 'Ürün Kodu';
    body = (
      <UrunKodPopupBody
        satir={satir}
        onSatirGuncelle={onSatirGuncelle}
        onSatiraSetUygula={onSatiraSetUygula}
        onClose={onClose}
      />
    );
  } else if (satirFocusCell === 'aciklama') {
    title = 'Açıklama';
    body = (
      <AciklamaPopupBody
        satir={satir}
        onSatirGuncelle={onSatirGuncelle}
        onClose={onClose}
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
              if (e.key === 'Enter') { e.preventDefault(); onClose(); }
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
            getPopupContainer={() => popupRef.current ?? document.body}
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
          onClose();
        }}
        options={[
          { value: 'TRY', label: 'Türk Lirası (TL)' },
          { value: 'EUR', label: 'Euro (EUR)' },
          { value: 'USD', label: 'Amerikan Doları (USD)' },
        ]}
        getPopupContainer={() => popupRef.current ?? document.body}
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
          if (e.key === 'Enter') { e.preventDefault(); onClose(); }
          if (e.key === 'Escape') onClose();
        }}
      />
    );
  } else if (satirFocusCell === 'teslimat') {
    title = 'Teslimat';
    const teslimSecenekleri = akilliTeslim;
    body = (
      <AutoComplete
        autoFocus
        defaultOpen
        allowClear
        size="middle"
        style={{ width: '100%' }}
        value={satir.teslimTarihi || ''}
        options={teslimSecenekleri.map((t) => ({ value: t, label: t }))}
        onChange={(value) => onSatirGuncelle(satir.id, 'teslimTarihi', String(value ?? ''))}
        onSelect={(value) => {
          onSatirGuncelle(satir.id, 'teslimTarihi', String(value ?? ''));
          onClose();
        }}
        placeholder="Teslimat…"
        getPopupContainer={() => popupRef.current ?? document.body}
      >
        {/* TextArea — yazarken hücre kolon genişliğine paralel olarak ~12
            karakterden sonra alt satıra otomatik geçer; autoSize ile dikey
            büyür. Enter = manuel satır kır (12 karakterden ÖNCE de istediği
            yerde alt satıra geçebilsin). Tab/Escape = kaydet+kapat. Dışarı
            tıklama da popup'ı kapatır. */}
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 5 }}
          style={{ resize: 'none', lineHeight: 1.3 }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') { e.preventDefault(); onClose(); }
            if (e.key === 'Escape') onClose();
          }}
        />
      </AutoComplete>
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
        // İçeriğe göre otomatik boyut — min/max sınırları içinde tarayıcı
        // popup body'sinin gerçek genişliğini hesaplar. Tek input ise
        // input doğal ölçüsünde, suggestion listesi varsa daha geniş.
        width: 'max-content',
        minWidth: Math.max(constraints.min, pos.minWidth),
        maxWidth: constraints.max,
        background: POPUP.surface.background,
        borderRadius: POPUP.radius.base,
        padding: POPUP.padding.base,
        boxShadow: POPUP.shadow.level2,
        zIndex: POPUP.zIndex.popup,
        animation: `cell-popup-fade-in ${POPUP.animation.fadeIn}`,
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
  onClose,
}: {
  satir: TeklifSatiri;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatiraSetUygula: (satirId: string, setId: string) => void;
  onClose: () => void;
}) {
  const { modal, message } = App.useApp();
  // Urun listesi — popup açıkken bir kez çek
  const [urunler, setUrunler] = useState(() => urunService.tumUrunleriGetir());
  const [setler] = useState(() => urunSetService.tumSetleriGetir());
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<InputRef>(null);
  // "Yeni ürün?" sorgusu için baseline + suggestion'dan seçim flag'i
  const initialKodRef = useRef(satir.urunKod);
  const justSelectedRef = useRef(false);
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
    justSelectedRef.current = true;
    initialKodRef.current = item.kod;
    // Açıklama: DB'deki kanonik değer varsa ez, boşsa kullanıcının manuel
    // yazdığı açıklama korunur — boş payload kullanıcı yazısını silmesin.
    const yeniAciklama = formatAciklama(item.payload.aciklama ?? '');
    if (item.kind === 'set') {
      onSatirGuncelle(satir.id, 'urunKod', item.kod);
      if (yeniAciklama) {
        onSatirGuncelle(satir.id, 'aciklama', yeniAciklama);
      }
      onSatiraSetUygula(satir.id, item.payload.id);
    } else {
      onSatirGuncelle(satir.id, 'urunKod', item.kod);
      onSatirGuncelle(satir.id, 'setId', undefined);
      if (yeniAciklama) {
        onSatirGuncelle(satir.id, 'aciklama', yeniAciklama);
      }
      // Akıllı doldurma: ürün katalog değerleri yalnızca BOŞ hücreleri doldurur,
      // kullanıcının daha önce girdiği değer ezilmez.
      if (item.payload.varsayilanFiyat && !satir.birimFiyat) {
        onSatirGuncelle(satir.id, 'birimFiyat', item.payload.varsayilanFiyat);
      }
      // Marka HER ZAMAN ürünün markası ile değişir — kullanıcı ürün seçince
      // ona ait markayı görmek ister (varsayılan veya eski marka eziLİR).
      if (item.payload.marka) {
        onSatirGuncelle(satir.id, 'marka', item.payload.marka);
      }
      if (item.payload.birim && !(satir.birim || '').trim()) {
        onSatirGuncelle(satir.id, 'birim', item.payload.birim);
      }
    }
    onClose();
  };

  // Yeni kod kontrolü → soru → onay → kayıt + toast. Hem onBlur hem Enter
  // handler'ından çağrılıyor (Enter'da popup hemen unmount olduğu için onBlur
  // her zaman fire etmeyebiliyor).
  const promptYeniUrun = () => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    const yeni = satir.urunKod?.trim();
    if (!yeni) return;
    if (yeni === (initialKodRef.current ?? '').trim()) return;
    const exists = urunler.some((u) => u.urunKod.toLowerCase() === yeni.toLowerCase());
    if (exists) return;
    modal.confirm({
      title: 'Yeni Ürün Olarak Kaydet',
      content: `"${yeni}" kodlu ürün veritabanında bulunamadı. Yeni ürün olarak kaydedilsin mi? Bir dahaki sefer otomatik gelecek.`,
      okText: 'Kaydet',
      cancelText: 'İptal',
      onOk: () => {
        const yeniUrun: Urun = {
          id: urunService.urunIdUret(),
          urunKod: yeni,
          urunAdi: yeni,
          aciklama: satir.aciklama ?? '',
          kategori: '',
          marka: satir.marka || '',
          birim: satir.birim || 'Adet',
          varsayilanFiyat: satir.birimFiyat || 0,
        };
        urunService.urunKaydet(yeniUrun);
        setUrunler(urunService.tumUrunleriGetir());
        initialKodRef.current = yeni;
        message.success(`"${yeni}" yeni ürün olarak kaydedildi. Bundan sonra otomatik öneri olarak çıkacak.`);
      },
    });
  };

  const handleBlur = () => {
    setTimeout(promptYeniUrun, 150);
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
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((i) => Math.min(i + 1, merged.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((i) => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter') {
            e.preventDefault();
            const yeniKod = (satir.urunKod ?? '').trim();
            // Önce: input'taki kod DB'de tam eşleşiyor mu? (suggestion'daki
            // substring match'lerle karıştırma)
            const exactMatch = yeniKod
              ? urunler.find((u) => u.urunKod.toLowerCase() === yeniKod.toLowerCase())
              : null;
            if (exactMatch) {
              select({
                kind: 'urun',
                id: exactMatch.id,
                kod: exactMatch.urunKod,
                aciklama: exactMatch.aciklama,
                payload: exactMatch,
              });
            } else if (highlight > 0 && merged[highlight]) {
              // User ArrowDown ile suggestion'a indi → onu seç
              select(merged[highlight]);
            } else if (yeniKod) {
              // Yeni kod, exact match yok, navigate de yapmadı → soru sor
              promptYeniUrun();
              onClose();
            } else {
              onClose();
            }
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

// Açıklama düzenleme popup body'si — input blur olunca, eğer kod DB'de varsa
// "Veritabanı açıklamasını güncellemek ister misin?" sorusu sorulur. Kod yoksa
// veya değişiklik yoksa sessizce çıkar.
function AciklamaPopupBody({
  satir,
  onSatirGuncelle,
  onClose,
}: {
  satir: TeklifSatiri;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onClose: () => void;
}) {
  const { modal, message } = App.useApp();
  const initialAciklamaRef = useRef(satir.aciklama);

  const promptAciklamaGuncelle = () => {
    // Title Case normalize — kullanıcı yazdıklarını çıkışta tutarlı hale getirir.
    const ham = (satir.aciklama ?? '').trim();
    const normalize = ham ? formatAciklama(ham) : '';
    if (normalize !== ham) {
      onSatirGuncelle(satir.id, 'aciklama', normalize);
    }
    const yeniAciklama = normalize;
    const eski = (initialAciklamaRef.current ?? '').trim();
    if (yeniAciklama === eski) return;
    const kod = (satir.urunKod ?? '').trim();
    if (!kod) return;
    const mevcut = urunService.tumUrunleriGetir()
      .find((u) => u.urunKod.toLowerCase() === kod.toLowerCase());
    // Açıklama editörü asla yeni ürün oluşturmaz — kod DB'de yoksa sessizce çık.
    if (!mevcut) return;
    if ((mevcut.aciklama ?? '').trim() === yeniAciklama) {
      initialAciklamaRef.current = yeniAciklama;
      return;
    }
    modal.confirm({
      title: 'Açıklama Güncellensin mi?',
      content: `"${kod}" ürününün açıklaması veritabanında güncellensin mi? Bir dahaki sefer bu ürün seçildiğinde yeni açıklama otomatik gelecek.`,
      okText: 'Güncelle',
      cancelText: 'Hayır',
      onOk: () => {
        urunService.urunKaydet({ ...mevcut, aciklama: yeniAciklama });
        initialAciklamaRef.current = yeniAciklama;
        message.success(`"${kod}" ürününün açıklaması güncellendi. Bir dahaki seçildiğinde yeni açıklama otomatik gelecek.`);
      },
    });
  };

  return (
    <Input.TextArea
      autoFocus
      autoSize={{ minRows: 2, maxRows: 14 }}
      size="middle"
      value={satir.aciklama || ''}
      onChange={(e) => onSatirGuncelle(satir.id, 'aciklama', e.target.value)}
      onFocus={(e) => (e.target as HTMLTextAreaElement).select?.()}
      onBlur={promptAciklamaGuncelle}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          // Önce soru sor (modal açılır), sonra popup'ı kapat.
          promptAciklamaGuncelle();
          onClose();
        }
        if (e.key === 'Tab') {
          // Outer handleTab next cell'e geçince popup unmount → blur fire etmez,
          // formatAciklama çağrılmaz. Burada bubble'dan ÖNCE normalize uygula
          // (preventDefault yok → outer handler next-cell davranışını üstlensin).
          promptAciklamaGuncelle();
        }
        if (e.key === 'Escape') onClose();
      }}
      placeholder="Açıklama  (Shift+Enter ile alt satır, Enter ile kapat)"
    />
  );
}

function FooterBlock({ teklif, pageNumber, totalPages }: { teklif: Teklif; pageNumber: number; totalPages: number }) {
  const firmaBilgi = useTeklifFirmaBilgileri(teklif);
  return (
    <div style={{ ...FOOTER_BAR_STYLE, marginTop: 'auto', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <div>{firmaBilgi.ad}</div>
        {firmaBilgi.iban && (
          <div style={{
            fontSize: '8.5px', opacity: 0.88,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>
            IBAN: {firmaBilgi.iban}
          </div>
        )}
      </div>
      <div style={{ fontSize: '8px', opacity: 0.7, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        Sayfa {pageNumber} / {totalPages}
      </div>
      <div>Teklif No: {teklif.teklifNo} | {formatDate(teklif.tarih)}</div>
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
  onCariSehirDegistir,
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
  onDovizKuruDegistir,
  onSatirGuncelle,
  onSatiraSetUygula,
  onSatirSil,
  onSatirEkle,
  onSatirArayaEkle,
  onNotlarDegistir,
  readOnly = false,
  renderPageOverlay,
  scale = 1,
  pushUndo,
  getSnapshot,
  markedRowIds,
  toggleRowMark,
  rootClassName = '',
}: PaginatedBelgeInlineEditorProps) {
  const firmaBilgi = useTeklifFirmaBilgileri(teklif);
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;
  const kullanilanParaKartlari = hesaplamaMotoru.kullanilanParaBirimiKartlariniHesapla(
    teklif.satirlar, teklif.paraBirimi, kdvOrani, iskontoOrani,
  );

  const muhatapSatiri = teklif.contactTitle === 'YETKILI'
    ? 'Yetkili'
    : teklif.contactName?.trim()
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

  // Müşteri muhatap popover açıldığında focus'u robust şekilde input'a getir —
  // Antd Popover destroyTooltipOnHide ile mount/transition cycle'ı yarış
  // yaratabiliyor; autoFocus prop yetersiz kaldığında 150ms sonra ek focus
  // çağrısıyla yedekle.
  useEffect(() => {
    if (editingAlan !== 'musteri-muhatap' || readOnly) return;
    const id = window.setTimeout(() => {
      muhatapRef.current?.focus();
    }, 150);
    return () => window.clearTimeout(id);
  }, [editingAlan, readOnly]);

  const [satirFocusCell, setSatirFocusCell] = useState<SatirCellField>('urunKod');
  // Hover edilen satırın id'si — aktif değilken bile Sil ikonu portal'da
  // gözüksün diye (active panel ile aynı pozisyonda).
  const [hoverRowId, setHoverRowId] = useState<string | null>(null);

  // ─── Spotlight efekti — imleci takip eden cam yüzey ışığı ─────────────
  // Tablo hücreleri (td[data-cell-field]) üzerinde imleç gezerken,
  // hücredeki ::before pseudo-element'in radial-gradient pozisyonu CSS
  // variable'larla (--mx, --my) güncellenir → cursor-following spotlight.
  //
  // Tek delegate listener (editor root), RAF throttled — tablodaki yüzlerce
  // hücreye ayrı listener takılmıyor. CSS pseudo-element render ediyor;
  // PDF capture'da JS listener aktif değil + :hover state yok → görsel sızıntı yok.
  const editorRootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = editorRootRef.current;
    if (!root || readOnly) return;
    let raf = 0;
    let currentCell: HTMLElement | null = null;

    function clearVars(cell: HTMLElement | null) {
      if (cell) {
        cell.style.removeProperty('--mx');
        cell.style.removeProperty('--my');
      }
    }

    function onMove(e: MouseEvent) {
      if (raf) return; // RAF throttle — frame başına en fazla 1 update
      raf = requestAnimationFrame(() => {
        raf = 0;
        const target = e.target as HTMLElement | null;
        const td = target?.closest('td[data-cell-field]') as HTMLElement | null;
        if (td !== currentCell) {
          clearVars(currentCell);
          currentCell = td;
        }
        if (td) {
          const r = td.getBoundingClientRect();
          td.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
          td.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
        }
      });
    }

    function onLeave() {
      clearVars(currentCell);
      currentCell = null;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    return () => {
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      clearVars(currentCell);
    };
  }, [readOnly]);

  // Akıllı sıralı referanslar — aktif firmanın kullanım deseniyle (sık ve son
  // kullanım önce). Genel ayarlar menüsünde (para birimi, ödeme, KDV, geçerlilik,
  // döviz kuru) kullanılır.
  const akilliParaBirimleri = useAkilliReferans('paraBirimleri');
  const akilliOdemeVadesi = useAkilliReferans('odemeVadesiSecenekleri');
  const akilliKdvOranlari = useAkilliReferans('kdvOranlari');
  const akilliGecerlilik = useAkilliReferans('gecerlilikSecenekleri');
  const akilliDovizKuru = useAkilliReferans('dovizKuruSecenekleri');
  // Referanslar drawer'i — satırdaki ürünün geçmiş ticari kayıtlarını gösterir.
  const [referanslarSatir, setReferanslarSatir] = useState<TeklifSatiri | null>(null);
  // Satır başındaki numaraya tıklanınca satır işaretlenir; markedRowIds +
  // toggleRowMark prop olarak CanliA4Belge'den (lift up) gelir → aynı state
  // PDF kaynağı (TeklifPagedDocument) ile paylaşılır.
  const fullHeaderLayout = getFullHeaderLayoutStyles(firmaBilgi.id);
  const fullLogo = getAdaptiveLogoPlacement({
    firmaId: firmaBilgi.id,
    logoPath: firmaBilgi.logoPath,
    surface: 'a4-full',
    objectPosition: 'left center',
  });

  // ─── SatirRow için stable flat callbacks ──────────────────────────────
  // Curried `handleSatirCellClick` memo'yu bozar (her satır map'inde yeni fn).
  // Aşağıdaki callback'ler primitive parametre alır, dependency'leri sabittir.
  const handleCellClickFlat = useCallback(
    (satirId: string, cell: SatirCellField, e: React.MouseEvent) => {
      if (readOnly) return;
      e.stopPropagation();
      const isSameActive = editingAlan === `satir-${satirId}` && satirFocusCell === cell;
      if (isSameActive) {
        onEditingAlanDegistir(null);
        return;
      }
      setSatirFocusCell(cell);
      onEditingAlanDegistir(`satir-${satirId}`);
    },
    [editingAlan, satirFocusCell, onEditingAlanDegistir, readOnly],
  );

  const handleRowEnter = useCallback((satirId: string) => {
    setHoverRowId(satirId);
  }, []);

  const handleRowLeave = useCallback((satirId: string) => {
    setHoverRowId((curr) => (curr === satirId ? null : curr));
  }, []);

  // satirlar'a referans tutarız — Referanslar drawer için satir nesnesi gerek
  // ama SatirRow'a sadece id geçiyoruz. Ref güncel satırı bulmaya yarar.
  const satirlarRef = useRef(teklif.satirlar);
  satirlarRef.current = teklif.satirlar;

  const handleReferanslarAc = useCallback(
    (satirId: string) => {
      const target = satirlarRef.current.find((s) => s.id === satirId);
      if (!target) return;
      onEditingAlanDegistir(null);
      setHoverRowId(null);
      setReferanslarSatir(target);
    },
    [onEditingAlanDegistir],
  );

  // ─── Faz 2 — Popup commit boundary için baseline snapshot yönetimi ───
  //
  // Popup (CellEditPopup veya cari/ayar Popover) açıldığında baseline alınır;
  // kapanırken state değiştiyse undo stack'e baseline push edilir. Escape
  // revert tablo hücrelerinde baseline'a geri döner (push olmaz → diff yok).
  // Cari/ayar popover'larında Escape değer korur (kullanıcı tercihi); kapanışta
  // diff varsa yine push olur.
  const popupBaselineRef = useRef<Snapshot | null>(null);
  const popupBaselineSatirRef = useRef<TeklifSatiri | null>(null);
  const getSnapshotRef = useRef(getSnapshot);
  const pushUndoRef = useRef(pushUndo);
  useEffect(() => { getSnapshotRef.current = getSnapshot; }, [getSnapshot]);
  useEffect(() => { pushUndoRef.current = pushUndo; }, [pushUndo]);

  useEffect(() => {
    if (!editingAlan) {
      // Kapanış: değişiklik varsa baseline'ı stack'e it.
      const baseline = popupBaselineRef.current;
      if (baseline && snapshotChanged(baseline, getSnapshotRef.current())) {
        pushUndoRef.current(baseline);
      }
      popupBaselineRef.current = null;
      popupBaselineSatirRef.current = null;
      return;
    }
    // Açılış
    popupBaselineRef.current = getSnapshotRef.current();
    if (editingAlan.startsWith('satir-')) {
      const id = editingAlan.slice(6);
      const found = satirlarRef.current.find((s) => s.id === id);
      popupBaselineSatirRef.current = found ? { ...found } : null;
    } else {
      popupBaselineSatirRef.current = null;
    }
  }, [editingAlan]);

  /**
   * CellEditPopup Escape'i: aktif hücrenin alanlarını baseline kopyaya
   * geri yükle → kapanışta diff bulunmaz → push olmaz (=iptal davranışı).
   */
  const handleCellEscapeRevert = useCallback(() => {
    const orig = popupBaselineSatirRef.current;
    if (!orig || !satirFocusCell) return;
    const fieldMap: Record<SatirCellField, (keyof TeklifSatiri)[]> = {
      marka: ['marka'],
      urunKod: ['urunKod', 'urunAdi'],
      aciklama: ['aciklama'],
      miktar: ['miktar', 'birim'],
      paraBirimi: ['paraBirimi'],
      birimFiyat: ['birimFiyat', 'indirimOrani'],
      teslimat: ['teslimTarihi'],
    };
    const fields = fieldMap[satirFocusCell];
    if (!fields) return;
    fields.forEach((k) => onSatirGuncelle(orig.id, k, orig[k]));
  }, [satirFocusCell, onSatirGuncelle]);

  // ─── Tab tuşu ile hücreler arası gezinme ──────────────────────────────
  // Sıra satirBazliParaBirimi'ye göre değişir; sub-item'da paraBirimi ve
  // birimFiyat tıklanamaz → atlanır.
  const CELL_ORDER = useMemo<SatirCellField[]>(
    () => buildSatirCellNavOrder(satirBazliParaBirimi),
    [satirBazliParaBirimi],
  );

  const isCellEditable = useCallback(
    (satir: TeklifSatiri, cell: SatirCellField) => {
      if (satir.setAltKalem && (cell === 'birimFiyat' || cell === 'paraBirimi' || cell === 'teslimat')) return false;
      return true;
    },
    [],
  );

  const findEditableCellIdx = useCallback(
    (satir: TeklifSatiri, startIdx: number, direction: 1 | -1): number => {
      let idx = startIdx;
      while (idx >= 0 && idx < CELL_ORDER.length) {
        if (isCellEditable(satir, CELL_ORDER[idx])) return idx;
        idx += direction;
      }
      return -1;
    },
    [CELL_ORDER, isCellEditable],
  );

  const handleTab = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly || !editingAlan || !editingAlan.startsWith('satir-')) return;
    if (e.key !== 'Tab') return;
    e.preventDefault();
    e.stopPropagation();

    const currentSatirId = editingAlan.slice(6);
    const satirIndex = teklif.satirlar.findIndex((s) => s.id === currentSatirId);
    if (satirIndex === -1) return;

    const currentSatir = teklif.satirlar[satirIndex];
    const currentCellIndex = CELL_ORDER.indexOf(satirFocusCell);
    const isShift = e.shiftKey;

    if (!isShift) {
      // Tab ileri
      const nextIdx = findEditableCellIdx(currentSatir, currentCellIndex + 1, 1);
      if (nextIdx >= 0) {
        setSatirFocusCell(CELL_ORDER[nextIdx]);
        return;
      }
      // Aynı satırda kalmadı → sonraki satıra geç
      if (satirIndex < teklif.satirlar.length - 1) {
        const nextSatir = teklif.satirlar[satirIndex + 1];
        const firstIdx = findEditableCellIdx(nextSatir, 0, 1);
        setSatirFocusCell(CELL_ORDER[firstIdx >= 0 ? firstIdx : 0]);
        onEditingAlanDegistir(`satir-${nextSatir.id}`);
      } else {
        // Son satırın son hücresi → yeni satır ekle (focus useEffect ile gelir)
        tabAddedRowRef.current = true;
        onSatirEkle();
      }
    } else {
      // Shift+Tab geri
      const prevIdx = findEditableCellIdx(currentSatir, currentCellIndex - 1, -1);
      if (prevIdx >= 0) {
        setSatirFocusCell(CELL_ORDER[prevIdx]);
        return;
      }
      if (satirIndex > 0) {
        const prevSatir = teklif.satirlar[satirIndex - 1];
        const lastIdx = findEditableCellIdx(prevSatir, CELL_ORDER.length - 1, -1);
        setSatirFocusCell(CELL_ORDER[lastIdx >= 0 ? lastIdx : 0]);
        onEditingAlanDegistir(`satir-${prevSatir.id}`);
      }
      // İlk satırın ilk hücresinde Shift+Tab → bir şey yapma
    }
  }, [readOnly, editingAlan, teklif.satirlar, satirFocusCell, CELL_ORDER, findEditableCellIdx, onEditingAlanDegistir, onSatirEkle]);

  // Tab → "Son hücrede yeni satır" akışında, eklenen satırın ilk düzenlenebilir
  // hücresine otomatik odaklan. Sadece Tab tetiklediğinde devreye girer; diğer
  // satır eklemeleri (cari seçilince intro satırı, manuel "Satır ekle"
  // butonu, vb.) bu effect'i etkilemez — yani cari seçilir seçilmez marka
  // popup'ı açılmaz, satirFocusCell initial 'urunKod' olarak kalır.
  const tabAddedRowRef = useRef(false);
  const prevSatirCountRef = useRef(teklif.satirlar.length);
  useEffect(() => {
    const prevCount = prevSatirCountRef.current;
    const newCount = teklif.satirlar.length;
    prevSatirCountRef.current = newCount;
    if (!tabAddedRowRef.current) return;
    if (newCount > prevCount && newCount > 0) {
      tabAddedRowRef.current = false;
      const yeniSatir = teklif.satirlar[newCount - 1];
      const firstIdx = findEditableCellIdx(yeniSatir, 0, 1);
      // 50ms gecikme: yeni satır DOM'a render edilene kadar bekle, sonra focus.
      const id = window.setTimeout(() => {
        setSatirFocusCell(CELL_ORDER[firstIdx >= 0 ? firstIdx : 0]);
        onEditingAlanDegistir(`satir-${yeniSatir.id}`);
      }, 50);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teklif.satirlar.length]);

  const handleMuhatapKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEditingAlanDegistir('musteri-telefon');
      return;
    }
    if (e.key === 'Escape') onEditingAlanDegistir(null);
  }, [onEditingAlanDegistir]);

  const handleTelefonKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEditingAlanDegistir('musteri-eposta');
      return;
    }
    if (e.key === 'Escape') onEditingAlanDegistir(null);
  }, [onEditingAlanDegistir]);

  const handleEpostaKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEditingAlanDegistir(null);
      return;
    }
    if (e.key === 'Escape') onEditingAlanDegistir(null);
  }, [onEditingAlanDegistir]);


  const renderFirstPageHeader = () => (
    <>
      <div style={fullHeaderLayout.rootStyle}>
        <div style={fullHeaderLayout.logoColumnStyle}>
          <div style={fullLogo.slotStyle}>
            <img src={firmaBilgi.logoPath} alt={firmaBilgi.kisaAd} style={{
              ...fullLogo.imageStyle,
            }} />
          </div>
        </div>
        <div style={fullHeaderLayout.companyColumnStyle}>
          <div style={{ fontWeight: 700, fontSize: '11px', color: C.navy, lineHeight: '1.3', letterSpacing: '-0.01em' }}>
            {firmaBilgi.ad}
          </div>
          {firmaBilgi.adres && (
            <div style={{ fontSize: '8.8px', lineHeight: '1.35', color: C.textMuted, letterSpacing: '0.01em', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {formatAdres(firmaBilgi.adres)}
            </div>
          )}
          {firmaBilgi.vergiNo && (
            <div style={{ fontSize: '8.5px', lineHeight: '1.35', color: C.textMuted, letterSpacing: '0.02em' }}>
              VKN: {formatVKN(firmaBilgi.vergiNo)}{firmaBilgi.vergiDairesi && <span> &nbsp;—&nbsp; {firmaBilgi.vergiDairesi} V.D.</span>}
            </div>
          )}
        </div>
        {fullHeaderLayout.separatorStyle && <div aria-hidden="true" style={fullHeaderLayout.separatorStyle} />}
        <div style={fullHeaderLayout.quoteColumnStyle}>
          <div style={fullHeaderLayout.quotePanelStyle}>
            <div style={{
              background: BRAND.gradient, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
              padding: '4px 12px 5px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              lineHeight: 1.2, borderRadius: '9px', border: `1px solid ${BRAND.border}`, boxShadow: BRAND.shadowSm,
            }}>
              <span style={{ fontWeight: 700, fontSize: '14.5px', letterSpacing: '0.8px', color: BRAND.text }}>TEKLİF</span>
              <span style={{ fontSize: '9.5px', color: BRAND.textSub, letterSpacing: '0.02em' }}>/ Quotation</span>
              {teklif.revizyonNo && teklif.revizyonNo > 0 && (
                <span style={{ fontSize: '9px', fontWeight: 600, color: BRAND.textSub, marginLeft: '6px' }}>
                  Rev.{String(teklif.revizyonNo).padStart(2, '0')}
                </span>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <colgroup><col style={{ width: '38%' }} /><col style={{ width: '62%' }} /></colgroup>
              <tbody>
                <tr>
                  <td style={{ fontSize: '8.5px', color: C.textMuted, padding: '2px 0 1px 0', lineHeight: 1.3, letterSpacing: '0.05em' }}>Teklif No</td>
                  <td style={{ fontSize: '11.5px', fontWeight: 700, color: C.navy, padding: '2px 0 1px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>{teklif.teklifNo}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: '8.5px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.05em' }}>Tarih</td>
                  <td style={{ fontSize: '10.2px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {readOnly ? (
                      // Kilit yeşil ↔ kırmızı geçişinde yatay kayma olmasın
                      // diye DatePicker ile aynı genişlik (110px) zorlandı.
                      <span style={{ display: 'inline-block', width: 110 }}>
                        {formatDate(teklif.tarih)}
                      </span>
                    ) : (
                      <DatePicker
                        size="small"
                        variant="borderless"
                        value={dayjs(teklif.tarih)}
                        onChange={(d) => d && onTarihDegistir(d.format('YYYY-MM-DD'))}
                        format="DD.MM.YYYY"
                        style={{ fontSize: '10.2px', padding: 0, width: 110 }}
                        allowClear={false}
                        suffixIcon={null}
                      />
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '8.5px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.05em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '9.5px', fontWeight: 400, color: C.textSoft, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                    <EditableField as="span" type="text" fieldKey="alt-hazirlayan" readOnly>
                      {teklif.hazirlayanAdSoyad ? formatAdSoyad(teklif.hazirlayanAdSoyad) : firmaBilgi.kisaAd}
                    </EditableField>
                  </td>
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
            {/* Tel hizalama placeholder'ı — Alıcı Sayın satırına denk tek
                satır görünmez yer kaplar. İki placeholder fazla iniyordu;
                tek placeholder ile Tel'ler aynı yatay eksende kalır. */}
            <div style={{ ...PARTY_GREETING_STYLE, visibility: 'hidden' }} aria-hidden>
              {muhatapSatiri ? <>Sayın {muhatapSatiri},</> : 'Sayın Muhatap,'}
            </div>
            {firmaBilgi.telefon && <div>Tel: {formatPhone(firmaBilgi.telefon.replace(/\s+/g, ''))}</div>}
            {/* IBAN footer'a taşındı (her sayfada görünür) — burada dublike olmasın */}
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
              <EditableField as="div" type="text" fieldKey="musteri-firma" style={PARTY_NAME_STYLE}>
                {formatCariAdi(teklif.cari.firmaAdi) || '—'}
              </EditableField>
            </Popover>
          )}

          <div style={PARTY_BODY_STYLE}>
            {/* Muhatap satırı — kendi popup'ı.
                readOnly + boş muhatap durumunda satır görünmez AMA yer kaplar
                (visibility:hidden) → diğer içerik (adres, telefon, vb.) yukarı
                kaymaz, layout kilit yeşil ↔ kırmızı geçişinde sabit kalır. */}
            {readOnly ? (
              muhatapSatiri ? (
                <div style={PARTY_GREETING_STYLE}>Sayın {muhatapSatiri},</div>
              ) : (
                <div style={{ ...PARTY_GREETING_STYLE, visibility: 'hidden' }} aria-hidden>
                  Sayın Muhatap,
                </div>
              )
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
                        style={{ flex: 1, opacity: contactTitle === 'YETKILI' ? 0.5 : 1 }}
                        value={contactTitle === 'YETKILI' ? '' : contactName}
                        disabled={contactTitle === 'YETKILI'}
                        onChange={(e) => onContactNameDegistir(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={handleMuhatapKeyDown}
                        placeholder={contactTitle === 'YETKILI' ? 'Yetkili (isim gerekmez)' : 'muhatap adı'}
                      />
                      <Select
                        size="middle"
                        style={{ width: 110 }}
                        value={contactTitle}
                        onChange={onContactTitleDegistir}
                        options={[
                          { value: 'BEY', label: 'Bey' },
                          { value: 'HANIM', label: 'Hanım' },
                          { value: 'YETKILI', label: 'Yetkili' },
                        ]}
                      />
                    </div>
                  </div>
                }
              >
                <EditableField as="div" type="text" fieldKey="musteri-muhatap" style={PARTY_GREETING_STYLE}>
                  {muhatapSatiri ? <>Sayın {muhatapSatiri},</> : <span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>Muhatap ekle…</span>}
                </EditableField>
              </Popover>
            )}

            {/* Adres — read-only render, muhatap altında.
                Boş adres durumunda HEM yeşil HEM kırmızı modda aynı görünmez
                yer tutucu → kilit geçişinde dikey yükseklik sabit kalır,
                A4 boyu uzamaz. */}
            {teklif.cari.adres ? (
              <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {formatAdres(teklif.cari.adres)}
              </div>
            ) : (
              <div
                style={{ visibility: 'hidden', wordBreak: 'break-word', overflowWrap: 'break-word' }}
                aria-hidden
              >
                Adres satırı yer tutucu
              </div>
            )}

            {/* Tel | Şehir | E-posta satırı (Tel başta) */}
            <div>
              {/* Tel hücresi — kendi popup'ı (en başta).
                  readOnly + boş telefon → visibility:hidden placeholder, yer
                  kaplar (kilit geçişinde layout aynı kalsın). */}
              {readOnly ? (
                teklif.cari.telefon ? (
                  <span>Tel: {formatPhone(teklif.cari.telefon)}</span>
                ) : (
                  <span style={{ visibility: 'hidden' }} aria-hidden>Tel: 0000 000 00 00</span>
                )
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
                        onBlur={(e) => {
                          const f = formatPhone(e.target.value);
                          if (f !== e.target.value) onCariTelefonDegistir(f);
                        }}
                        onKeyDown={handleTelefonKeyDown}
                        placeholder="0xxx xxx xx xx"
                      />
                    </div>
                  }
                >
                  <EditableField as="span" type="text" fieldKey="musteri-telefon">
                    Tel: {teklif.cari.telefon ? formatPhone(teklif.cari.telefon) : <span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>ekle…</span>}
                  </EditableField>
                </Popover>
              )}
              {/* Tel | Şehir ayraç — readOnly + boş telefon durumunda yer
                  kaplaması için her zaman render, visibility ile gizleme. */}
              {(teklif.cari.telefon || !readOnly) ? (
                <span> &nbsp;|&nbsp; </span>
              ) : (
                <span style={{ visibility: 'hidden' }} aria-hidden> &nbsp;|&nbsp; </span>
              )}
              {/* Şehir hücresi — kendi popup'ı.
                  readOnly + boş şehir → visibility:hidden placeholder ile
                  yer kaplama, satır yatay layout kilit geçişinde sabit kalsın. */}
              {readOnly ? (
                teklif.cari.sehir ? (
                  <span>{formatSehir(teklif.cari.sehir)}</span>
                ) : (
                  <span style={{ visibility: 'hidden' }} aria-hidden>İstanbul</span>
                )
              ) : (
                <Popover
                  open={editingAlan === 'musteri-sehir'}
                  onOpenChange={(open) => onEditingAlanDegistir(open ? 'musteri-sehir' : null)}
                  trigger={['click']}
                  placement="bottomLeft"
                  destroyTooltipOnHide
                  content={
                    <div style={{ width: 260, padding: '2px 0' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Şehir</div>
                      <Input
                        autoFocus
                        size="middle"
                        style={{ width: '100%' }}
                        value={teklif.cari.sehir || ''}
                        onChange={(e) => onCariSehirDegistir(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) => {
                          const f = formatSehir(e.target.value);
                          if (f !== e.target.value) onCariSehirDegistir(f);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onEditingAlanDegistir(null);
                          }
                          if (e.key === 'Escape') onEditingAlanDegistir(null);
                        }}
                        placeholder="şehir"
                      />
                    </div>
                  }
                >
                  <EditableField as="span" type="text" fieldKey="musteri-sehir">
                    {teklif.cari.sehir || <span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>şehir ekle…</span>}
                  </EditableField>
                </Popover>
              )}

              {/* E-posta hücresi — kendi popup'ı, şehir sonrası */}
              {/* Şehir | E-posta ayraç — readOnly + boş durumlarda yer kaplama
                  amaçlı her zaman render, visibility:hidden ile gizleme. */}
              {((teklif.cari.telefon || teklif.cari.sehir) && (teklif.cari.ePosta || !readOnly)) ? (
                <span> &nbsp;|&nbsp; </span>
              ) : (
                <span style={{ visibility: 'hidden' }} aria-hidden> &nbsp;|&nbsp; </span>
              )}
              {/* E-posta hücresi — readOnly + boş ePosta → visibility:hidden
                  placeholder ile yer kaplama (kilit geçişinde layout sabit). */}
              {readOnly ? (
                teklif.cari.ePosta ? (
                  <span>{teklif.cari.ePosta}</span>
                ) : (
                  <span style={{ visibility: 'hidden' }} aria-hidden>placeholder@example.com</span>
                )
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
                        onChange={(e) => onCariEPostaDegistir(e.target.value.toLowerCase())}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next !== e.target.value) onCariEPostaDegistir(next);
                        }}
                        onKeyDown={handleEpostaKeyDown}
                        placeholder="ornek@firma.com"
                      />
                    </div>
                  }
                >
                  <EditableField as="span" type="text" fieldKey="musteri-eposta">
                    {teklif.cari.ePosta || <span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>e-posta ekle…</span>}
                  </EditableField>
                </Popover>
              )}
            </div>

            {teklif.cari.vergiNo && (
              <div style={PARTY_VKN_LINE_STYLE}>VKN: {formatVKN(teklif.cari.vergiNo)}{teklif.cari.vergiDairesi && <span> &nbsp;—&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}</div>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const items = buildSettingsItems(teklif, satirBazliParaBirimi);

        const PB_LABEL: Record<string, string> = { TRY: 'Türk Lirası (TL)', EUR: 'Euro (EUR)', USD: 'Amerikan Doları (USD)' };
        const paraBirimiMenuItems = akilliParaBirimleri.map(pb => ({ key: pb, label: PB_LABEL[pb] || pb }));
        const odemeVadesiMenuItems = akilliOdemeVadesi.map((v) => ({ key: v, label: v }));
        const kdvMenuItems = akilliKdvOranlari.map((v) => ({ key: v, label: v === '0' ? 'Hariç' : `%${v}` }));
        const gecerlilikMenuItems = akilliGecerlilik.map((v) => ({ key: v, label: v }));
        const dovizKuruMenuItems = akilliDovizKuru.map((v) => ({ key: v, label: v }));

        return (
          <div style={getSettingsGridStyle(items.length)}>
            {items.map((item) => {
              const alanKey = `ayar-${item.id}`;
              const alanId = alanKey as EditingAlan;
              const editable = !readOnly;
              const fieldType: 'text' | 'number' | 'currency' =
                item.id === 'paraBirimi' ? 'currency'
                : (item.id === 'kdvOrani' || item.id === 'kur') ? 'number'
                : 'text';

              const cardInner = (
                <EditableField
                  key={alanKey}
                  as="div"
                  type={fieldType}
                  fieldKey={alanKey}
                  readOnly={!editable}
                  style={SETTINGS_CARD_STYLE}
                  extraAttrs={{ 'data-alan': alanKey }}
                >
                  <div style={SETTINGS_LABEL_STYLE}>
                    <span style={SETTINGS_TR_LABEL_STYLE}>{item.tr}</span>
                    <span style={SETTINGS_SEP_STYLE}>/</span>
                    <span style={SETTINGS_EN_LABEL_STYLE}>{item.en}</span>
                  </div>
                  <div style={SETTINGS_VALUE_STYLE}>{item.value}</div>
                </EditableField>
              );

              if (!editable) return cardInner;

              let menu;
              switch (item.id) {
                case 'paraBirimi':
                  menu = { items: paraBirimiMenuItems, onClick: ({ key }: { key: string }) => onParaBirimiDegistir(key as ParaBirimi) };
                  break;
                case 'odemeVadesi':
                  menu = { items: odemeVadesiMenuItems, onClick: ({ key }: { key: string }) => onOdemeVadesiDegistir(key) };
                  break;
                case 'kdvOrani':
                  menu = { items: kdvMenuItems, onClick: ({ key }: { key: string }) => onKdvOraniDegistir(Number(key)) };
                  break;
                case 'gecerlilik':
                  menu = { items: gecerlilikMenuItems, onClick: ({ key }: { key: string }) => onGecerlilikSuresiDegistir(key) };
                  break;
                case 'kur':
                  menu = { items: dovizKuruMenuItems, onClick: ({ key }: { key: string }) => onDovizKuruDegistir(key) };
                  break;
                default:
                  return cardInner;
              }

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
        <div style={{ ...TABLE_TITLE_STYLE, textTransform: 'none', display: page.showFullHeader ? 'block' : 'none' }}>
          TEKLİF KALEMLERİ <span style={{ fontWeight: 400, opacity: 0.55 }}>/ LINE ITEMS</span>
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
                { key: 'no' as const, label: '#', sub: '', align: 'center' as const },
                { key: 'marka' as const, label: 'Marka', sub: 'Brand', align: 'center' as const },
                { key: 'urunKod' as const, label: 'Ürün Kodu', sub: 'Item no', align: 'left' as const },
                { key: 'aciklama' as const, label: 'Açıklama', sub: 'Description', align: 'left' as const },
                { key: 'miktar' as const, label: 'Miktar', sub: 'Qty', align: 'center' as const },
                satirBazliParaBirimi
                  ? { key: 'paraBirimi' as const, label: 'Kur', sub: 'Currency', align: 'center' as const }
                  : { key: 'paraBirimi' as const, label: '', sub: '', align: 'center' as const },
                { key: 'birimFiyat' as const, label: 'Birim Fiyat', sub: 'Unit price', align: 'right' as const },
                { key: 'toplam' as const, label: 'Toplam', sub: 'Total', align: 'right' as const },
                { key: 'teslimat' as const, label: 'Teslimat', sub: 'Delivery', align: 'center' as const },
              ].map((col, i) => (
                <th key={i} className={getOfferTableSeparatorClass(col.key)} style={getTableHeadCellStyle(col.align, col.key)}>
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
              const isHoverRow = hoverRowId === satir.id;
              const mainItemIndex = computeMainItemIndex(teklif.satirlar, idx);
              const setSubitemIndex = computeSetSubitemIndex(teklif.satirlar, idx) ?? 1;

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
                        // Sadece ortadaki %30'lık bölgede aktif — kullanıcı
                        // satırın orta kısmına gelince "Araya ekle" belirir,
                        // satırın geneline gelmek butonu tetiklemez.
                        position: 'absolute', left: '35%', right: '35%', top: -7, height: 14,
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


              return (
                <React.Fragment key={satir.id}>
                  {insertAbove}
                  <SatirRow
                    satir={satir}
                    idx={idx}
                    satirPb={satirPb}
                    mainItemIndex={mainItemIndex}
                    setSubitemIndex={setSubitemIndex}
                    setGroupPos={setGroupPos}
                    isMarked={isMarked}
                    isRowActive={isRowActive}
                    isHoverRow={isHoverRow}
                    activeCellField={isRowActive ? satirFocusCell : null}
                    satirBazliParaBirimi={satirBazliParaBirimi}
                    satirBazliIskonto={satirBazliIskonto}
                    readOnly={readOnly}
                    onCellClick={handleCellClickFlat}
                    onRowEnter={handleRowEnter}
                    onRowLeave={handleRowLeave}
                    onToggleMark={toggleRowMark}
                    onSatirGuncelle={onSatirGuncelle}
                    onSatirSil={onSatirSil}
                    onReferanslarAc={handleReferanslarAc}
                  />
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

  // Smart fallback: toggle açık ama tüm satırlar tek tip ise sanki kapalı
  // gibi davran → tek TotalsCard. Çoklu kart gereksiz görünmez.
  const efektifSatirBazli = efektifSatirBazliParaBirimi(teklif);

  const renderTotals = () =>
    !efektifSatirBazli ? (() => {
      // Veri kaynağı: toggle açıkken hesap satır bazlı → kullanilanParaKartlari[0]
      // doğru; toggle kapalıyken belge default totals doğru.
      const tek = kullanilanParaKartlari[0];
      const useKart = satirBazliParaBirimi && !!tek;
      return (
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
                araToplam={useKart ? tek.araToplam : araToplam}
                iskontoOrani={iskontoOrani}
                iskontoTutar={useKart ? tek.iskontoTutar : iskontoTutar}
                kdvOrani={kdvOrani}
                kdvTutar={useKart ? tek.kdvTutar : kdvTutar}
                genelToplam={useKart ? tek.total : genelToplam}
                paraBirimi={useKart ? tek.pb : teklif.paraBirimi}
                variant="light"
                amountRightOffsetPx={computeTotalsAmountRightOffset(teklif.satirlar, false)}
              />
              <KargoNotuSatiri />
            </td>
          </tr>
        </tbody>
      </table>
      );
    })() : (
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
                {/* Çoklu para birimi — her biri için TotalsCard (tek tip
                    modu ile birebir aynı yapı). Wrapper'dan border/bg/shadow
                    kaldırıldı; TotalsCard kendi kart görselini sağlar. */}
                {kullanilanParaKartlari.map((item) => (
                  <div key={item.pb} style={{ width: '220px', minWidth: '220px', flexShrink: 0 }}>
                    <TotalsCard araToplam={item.araToplam} iskontoOrani={iskontoOrani} iskontoTutar={item.iskontoTutar} kdvOrani={kdvOrani} kdvTutar={item.kdvTutar} genelToplam={item.total} paraBirimi={item.pb} variant="light" />
                  </div>
                ))}
              </div>
              <KargoNotuSatiri />
            </td>
          </tr>
        </tbody>
      </table>
    );

  // AnimatedNotesContainer kapanış animasyonu sırasında (~320ms) DOM'da
  // tutar; toggle ON/OFF arasında smooth bir geçiş sağlar. Toggle hiç
  // kullanılmadığında bile mount edilir ama 0 height + opacity 0 olduğu
  // için layout etkilemez.
  // ÖZEL DURUM: Kilit KAPALI (PDF görünüm modu) + boş içerik durumunda
  // PDF render ile birebir uyumlu olmak için container kapalı moda alınır
  // → editör boş etiket göstermez, PDF'te de görünmez. Düzenleme modunda
  // (kilit açık) boş içerik olsa bile etiket görünür ki kullanıcı yazabilsin.
  const notesIcerikVar = !!(teklif.notlar?.trim());
  const notesAcik = !!teklif.notlarGosterilsin && (notesIcerikVar || !readOnly);
  const renderNotes = () => (
    <AnimatedNotesContainer open={notesAcik}>
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
          // Placeholder sadece düzenleme modunda anlamlı (yazma daveti).
          // Kilit kapalıyken (PDF görünüm modu) kullanıcı yazamayacağı için
          // "burada not ekleyin..." daveti tutarsız → gizlenir. PDF render
          // (TeklifSablonu/TeklifPagedDocument) zaten placeholder kullanmıyor.
          placeholder={readOnly ? undefined : 'burada not ekleyin...'}
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
      ref={editorRootRef}
      className={
        // `belge-editor` → on-screen editor; PDF source (TeklifPagedDocument)
        // bu class'a SAHİP DEĞİL → PDF görsel modu sadece editöre uygulanır.
        [
          readOnly
            ? 'belge-inline belge-editor belge-readonly'
            : 'belge-inline belge-editor',
          rootClassName,
        ].filter(Boolean).join(' ')
      }
      onKeyDown={handleTab}
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
        /* Alıcı kartı: EditableField'ları yakalaması kolay olsun.
           Hit-area padding/margin ile genişletildi (görsel pozisyon korunur),
           imleç pointer + hover'da hafif tonlu zemin → tıklanabilir olduğu net.
           PDF capture etkilenmez (belge-editor sadece on-screen).
           LAYOUT SHIFT FIX: padding/margin/border-radius/transition KILIT
           DURUMUNDAN BAĞIMSIZ → kilit yeşil↔kırmızı geçişinde her alan
           2px daralırdı (5 alan × 2 = 10px dikey kayma). Şimdi her iki
           durumda da aynı kutu boyutu; sadece cursor + hover BG koşullu. */
        .belge-editor [data-alan="musteri"] .editable-field {
          padding: 1px 5px;
          margin: -1px -5px;
          border-radius: 4px;
          transition: background-color 120ms ease, box-shadow 120ms ease;
        }
        .belge-editor [data-alan="musteri"] .editable-field[data-editable="true"] {
          cursor: pointer;
        }
        .belge-editor [data-alan="musteri"] .editable-field[data-editable="true"]:hover {
          background-color: rgba(37, 99, 235, 0.08);
        }
        .belge-editor [data-alan="musteri"] .editable-field[data-editable="true"]:active {
          background-color: rgba(37, 99, 235, 0.14);
        }
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
        .belge-editor.belge-pdf-source {
          margin-top: 0 !important;
        }
        .belge-editor.belge-pdf-source::before {
          display: none !important;
          content: none !important;
        }
        .belge-editor.belge-pdf-source [data-pdf-page] {
          background-color: #ffffff !important;
          box-shadow: none !important;
          border: none !important;
        }
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
                <div style={SIGNATURE_BLOCK_ROW_STYLE}>

                  {/* SİPARİŞİ VEREN bloğu — Genel Toplam'dan bağımsız, tek başına. Ferah */}
                  <div style={{ flex: '0 0 70%', minWidth: 0, ...SIGNATURE_SECTION_STYLE }}>
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: '18px' }}>

                    {/* Sol: 2-satır dikey başlık — biraz büyütüldü, tracking arttırıldı */}
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
                        width: '100px',
                        textAlign: 'left',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        <div style={{
                          fontSize: '10.8px',
                          fontWeight: 600,
                          color: C.sigPrimary,
                          letterSpacing: '0.06em',
                          lineHeight: 1.1,
                          marginBottom: '4px',
                        }}>
                          SİPARİŞİ VEREN
                        </div>
                        <div style={{
                          fontSize: '8.64px',
                          fontWeight: 400,
                          color: C.sigSecondary,
                          letterSpacing: '0.04em',
                          lineHeight: 1.1,
                        }}>
                          Authorised Person
                        </div>
                      </div>
                    </div>

                    {/* Sağ: İçerik — isim, tarih, imza */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
                        <div style={{ flex: '0 0 40%', fontSize: '11px', lineHeight: '1.45' }}>
                          <div style={{ position: 'relative', top: '16px' }}>
                            <div style={{ marginRight: '0.6cm', borderBottom: `1px solid ${C.sigBorder}`, height: '30px' }} />
                            <div style={{ marginBottom: '6px', marginTop: '2px' }}>
                              <span style={{ fontWeight: 500, color: C.sigPrimary }}>İsim</span>
                              <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                              <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Name</span>
                            </div>
                          </div>
                          <div style={{ marginRight: '0.6cm', borderBottom: `1px solid ${C.sigBorder}`, height: '30px' }} />
                          <div style={{ marginTop: '2px' }}>
                            <span style={{ fontWeight: 500, color: C.sigPrimary }}>Tarih</span>
                            <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                            <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Date</span>
                          </div>
                        </div>
                        <div style={{ flex: '1', fontSize: '11px', lineHeight: '1.45', paddingTop: '54px' }}>
                          <div style={{ width: '170px', marginLeft: '-0.6cm', borderBottom: `1px solid ${C.sigBorder}`, height: '30px' }} />
                          <div style={{ marginTop: '2px', marginLeft: '-0.6cm' }}>
                            <span style={{ fontWeight: 500, color: C.sigPrimary }}>İmza / Kaşe</span>
                            <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                            <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Signature / Stamp</span>
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
          onEscapeRevert={handleCellEscapeRevert}
        />
      )}
      <ReferanslarDrawer
        open={!!referanslarSatir}
        onClose={() => setReferanslarSatir(null)}
        urunKod={referanslarSatir?.urunKod ?? ''}
        aciklama={referanslarSatir?.aciklama || referanslarSatir?.urunAdi || ''}
        marka={referanslarSatir?.marka || ''}
        aktifTeklifId={teklif.id}
        aktifCariId={teklif.cari?.id}
      />
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
