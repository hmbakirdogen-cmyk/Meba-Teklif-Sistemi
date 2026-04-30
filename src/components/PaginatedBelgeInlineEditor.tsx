import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Select, Input, DatePicker } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Teklif, Cari, TeklifSatiri, ParaBirimi, SatirGrupRenk } from '../types';
import { useTeklifFirmaBilgileri } from '../hooks/useTeklifFirma';
import { formatDate, formatDisplayNumber, formatTitleCaseTr, formatCariAdi } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
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
} from './InlineTableRowShared';
import {
  HEADER_SURFACE,
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
  SatirCellEditor,
  SatirAksiyonlariPanel,
  SatirIskontoRozeti,
} from './InlineSatirEditor';
import type { SatirCellField } from './inlineSatirEditorShared';
import type { TeklifPagePlan } from '../services/documentPagination';

const C = DOCUMENT_COLORS;
const BRAND = DOCUMENT_BRAND;
const PAGE_GAP_PX = 24;
const DEFAULT_TEKLIF_EMAIL = 'info@mebamekanik.com';

const SATIR_GRUP_GORSEL: Record<NonNullable<TeklifSatiri['grupRenk']>, { bg: string; border: string }> = {
  amber:    { bg: '#fff8eb', border: '#f4bf75' },
  mint:     { bg: '#eefcf6', border: '#92ddbf' },
  sky:      { bg: '#eef5ff', border: '#9ec1f7' },
  lavender: { bg: '#f5f0ff', border: '#c5aff6' },
  blush:    { bg: '#ffeff2', border: '#f4a8b6' },
  peach:    { bg: '#fff2e8', border: '#fbb276' },
  sage:     { bg: '#f0f4ec', border: '#a9b88c' },
  slate:    { bg: '#eef1f4', border: '#94a3b8' },
};

export type { EditingAlan } from './belgeInlineConstants';

interface PaginatedBelgeInlineEditorProps {
  teklif: Teklif;
  totals: TeklifToplam;
  pages: TeklifPagePlan[];
  editingAlan: EditingAlan;
  onEditingAlanDegistir: (alan: EditingAlan) => void;
  onCariDegistir: (cari: Cari) => void;
  onCariEPostaDegistir: (email: string) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM') => void;
  onTarihDegistir: (tarih: string) => void;
  onParaBirimiDegistir: (pb: ParaBirimi) => void;
  satirBazliParaBirimi: boolean;
  satirBazliIskonto: boolean;
  grupModuAktif: boolean;
  seciliGrupRenk: SatirGrupRenk;
  onKdvOraniDegistir: (oran: number) => void;
  onOdemeVadesiDegistir: (vade: string) => void;
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
  contactName,
  contactTitle,
  onContactNameDegistir,
  onContactTitleDegistir,
  onTarihDegistir,
  onParaBirimiDegistir,
  satirBazliParaBirimi,
  satirBazliIskonto,
  grupModuAktif,
  seciliGrupRenk,
  onKdvOraniDegistir,
  onOdemeVadesiDegistir,
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

  const isMusteriEditing = !readOnly && editingAlan === 'musteri';
  const isAnyAyarEditing = !readOnly && (editingAlan?.startsWith('ayar-') ?? false);
  const editingSatirId   = !readOnly && editingAlan?.startsWith('satir-') ? editingAlan.slice(6) : null;

  const muhatapRef = useRef<InputRef>(null);
  const notesTextareaRef = useRef<{ focus: (opts?: { cursor?: 'start' | 'end' | 'all' }) => void } | null>(null);
  const prevMusteriEditing = useRef(false);
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

  useEffect(() => {
    const justOpened = isMusteriEditing && !prevMusteriEditing.current;
    prevMusteriEditing.current = isMusteriEditing;
    if (justOpened && teklif.cari.firmaAdi) {
      const timer = setTimeout(() => muhatapRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [isMusteriEditing, teklif.cari.firmaAdi]);

  const [satirFocusCell, setSatirFocusCell] = useState<SatirCellField>('urunKod');
  // Hover edilen satırın id'si — aktif değilken bile Sil ikonu portal'da
  // gözüksün diye (active panel ile aynı pozisyonda).
  const [hoverRowId, setHoverRowId] = useState<string | null>(null);

  const grupModuMetinTiklamasi = (target: EventTarget | null): boolean => {
    if (!(target instanceof Node)) return false;
    const el = target instanceof HTMLElement ? target : target.parentElement;
    return Boolean(el?.closest('[data-group-paint-trigger="true"]'));
  };

  const handleSatirCellClick = useCallback(
    (satir: TeklifSatiri, cell: SatirCellField) => (e: React.MouseEvent) => {
      if (readOnly) return;
      e.stopPropagation();

      if (grupModuAktif) {
        if (!grupModuMetinTiklamasi(e.target)) return;
        const nextRenk = satir.grupRenk === seciliGrupRenk ? undefined : seciliGrupRenk;
        onSatirGuncelle(satir.id, 'grupRenk', nextRenk);
        setHoverRowId(null);
        onEditingAlanDegistir(null);
        return;
      }

      setSatirFocusCell(cell);
      onEditingAlanDegistir(`satir-${satir.id}`);
    },
    [grupModuAktif, onEditingAlanDegistir, onSatirGuncelle, readOnly, seciliGrupRenk],
  );

  const handleEnterNext = useCallback(() => {
    setHoverRowId(null);
    onEditingAlanDegistir(null);
  }, [onEditingAlanDegistir]);

  const handleGlobalEnter = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly || !editingAlan) return;
    if (e.nativeEvent.isComposing || e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    setHoverRowId(null);
    onEditingAlanDegistir(null);
  }, [editingAlan, onEditingAlanDegistir, readOnly]);

  const handleAlanClick = (alan: EditingAlan, e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    if (alan === 'musteri' && editingAlan !== alan) {
      setCariSearchText(formatCariAdi(teklif.cari.firmaAdi));
    }
    if (editingAlan !== alan) onEditingAlanDegistir(alan);
  };

  const editFrameStyle = (isEditing: boolean): React.CSSProperties => ({
    transition: 'background 0.18s ease',
    cursor: readOnly ? 'default' : (isEditing ? 'default' : 'pointer'),
    ...(isEditing && !readOnly ? { background: 'rgba(237, 242, 251, 0.35)' } : {}),
  });

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
                  <td style={{ fontSize: '12.1px', fontWeight: 800, color: C.navy, padding: '2px 0 1px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>{teklif.teklifNo}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.04em' }}>Tarih</td>
                  <td style={{ fontSize: '10.9px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {isAnyAyarEditing ? (
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
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.04em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '10px', fontWeight: 400, color: C.textSoft, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teklif.hazirlayanAdSoyad || firmaBilgi.kisaAd}</td>
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
          <div style={PARTY_NAME_STYLE}>{firmaBilgi.kisaAd}{firmaBilgi.kisaAd === 'MEBA Mekanik' ? ' Ltd. Şti.' : ''}</div>
          <div style={PARTY_BODY_STYLE}>
            {firmaBilgi.telefon ? <>Tel: {formatPhone(firmaBilgi.telefon.replace(/\s+/g, ''))}<br /></> : null}
            {firmaBilgi.web}
          </div>
        </div>
        <div data-alan="musteri" onClick={(e) => handleAlanClick('musteri', e)} style={{ ...PARTY_CARD_STYLE, cursor: isMusteriEditing ? 'default' : 'pointer', background: 'transparent' }}>
          <div style={PARTY_LABEL_STYLE}>
            Alıcı <span style={{ fontWeight: 400, opacity: 0.6 }}>/ To</span>
          </div>
          {isMusteriEditing ? (
            <div className="field-group">
              <div style={PARTY_NAME_STYLE}>
                <InlineCariAutocompleteField
                  autoFocus={!teklif.cari.firmaAdi}
                  style={{ width: '100%' }}
                  value={cariSearchText}
                  onChange={setCariSearchText}
                  onCariSelect={(cari) => {
                    if (cari) {
                      setCariSearchText(formatCariAdi(cari.firmaAdi));
                      onCariDegistir(cari);
                      setTimeout(() => muhatapRef.current?.focus(), 50);
                    }
                  }}
                  placeholder={formatCariAdi(teklif.cari.firmaAdi) || 'Firma adı veya cari kod...'}
                  popupMinWidth={300}
                />
              </div>
              <div style={PARTY_BODY_STYLE}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, marginBottom: '1px' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Sayın</span>
                  <Input
                    ref={muhatapRef}
                    size="small"
                    variant="borderless"
                    style={{ flex: 1, maxWidth: 160 }}
                    value={contactName}
                    onChange={(e) => onContactNameDegistir(e.target.value)}
                    placeholder="muhatap adı"
                    onFocus={(e) => e.target.select()}
                  />
                  <Select
                    size="small"
                    variant="borderless"
                    suffixIcon={null}
                    style={{ width: 72 }}
                    value={contactTitle}
                    onChange={onContactTitleDegistir}
                    options={[{ value: 'BEY', label: 'Bey' }, { value: 'HANIM', label: 'Hanım' }]}
                    popupMatchSelectWidth={false}
                    dropdownStyle={{ minWidth: 90 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>}
                  {teklif.cari.telefon && <span> &nbsp;|&nbsp; </span>}
                  <Input
                    size="small"
                    variant="borderless"
                    style={{ flex: 1, minWidth: 120 }}
                    value={teklif.cari.ePosta || ''}
                    onChange={(e) => onCariEPostaDegistir(e.target.value)}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (!next) onCariEPostaDegistir(DEFAULT_TEKLIF_EMAIL);
                    }}
                    placeholder={DEFAULT_TEKLIF_EMAIL}
                  />
                </div>
                {teklif.cari.vergiNo && (
                  <div>VKN: {teklif.cari.vergiNo}{teklif.cari.vergiDairesi && <span> &nbsp;-&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}</div>
                )}
                {teklif.cari.adres && <div>{teklif.cari.adres}</div>}
              </div>
            </div>
          ) : (
            <>
              <div style={PARTY_NAME_STYLE}>{formatCariAdi(teklif.cari.firmaAdi)}</div>
              <div style={PARTY_BODY_STYLE}>
                {muhatapSatiri && <div style={{ fontWeight: '500', marginBottom: '1px' }}>Sayın {muhatapSatiri}</div>}
                {(teklif.cari.telefon || teklif.cari.ePosta || DEFAULT_TEKLIF_EMAIL) && (
                  <div>
                    {teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>}
                    {teklif.cari.telefon && <span> &nbsp;|&nbsp; </span>}
                    <span>{teklif.cari.ePosta || DEFAULT_TEKLIF_EMAIL}</span>
                  </div>
                )}
                {teklif.cari.vergiNo && (
                  <div>VKN: {teklif.cari.vergiNo}{teklif.cari.vergiDairesi && <span> &nbsp;-&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}</div>
                )}
                {teklif.cari.adres && <div>{teklif.cari.adres}</div>}
              </div>
            </>
          )}
        </div>
      </div>

      {(() => {
        const ayarAlanIds = ['ayar-paraBirimi', 'ayar-odemeVadesi', 'ayar-kdvOrani', 'ayar-kur', 'ayar-gecerlilik'] as const;
        const items = buildSettingsItems(teklif, satirBazliParaBirimi);

        return (
          <div style={SETTINGS_GRID_STYLE}>
            {items.map((item, i) => {
              const alanId = ayarAlanIds[i];
              const isEditing = editingAlan === alanId;
              const isReadonly = i === 3 || i === 4;

              return (
                <div
                  key={alanId}
                  data-alan={alanId}
                  onClick={(isReadonly || readOnly) ? undefined : (e) => handleAlanClick(alanId, e)}
                  style={{
                    ...SETTINGS_CARD_STYLE,
                    cursor: (isReadonly || readOnly) ? 'default' : (isEditing ? 'default' : 'pointer'),
                  }}
                >
                  <div style={SETTINGS_LABEL_STYLE}>
                    <span style={SETTINGS_TR_LABEL_STYLE}>{item.tr}</span>
                    <span style={SETTINGS_SEP_STYLE}>/</span>
                    <span style={SETTINGS_EN_LABEL_STYLE}>{item.en}</span>
                  </div>
                  {isEditing ? (
                    <div style={SETTINGS_VALUE_STYLE}>
                      {i === 0 && (
                        <Select size="small" variant="borderless" suffixIcon={null} style={{ width: '100%' }} value={teklif.paraBirimi} onChange={onParaBirimiDegistir} options={[{ value: 'TRY', label: 'TL' }, { value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }]} popupMatchSelectWidth={100} />
                      )}
                      {i === 1 && (
                        <Select size="small" variant="borderless" suffixIcon={null} style={{ width: '100%' }} value={teklif.odemeVadesi || '45 Gün'} onChange={onOdemeVadesiDegistir} options={['Peşin', '15 Gün', '30 Gün', '45 Gün', '60 Gün', '90 Gün'].map((v) => ({ value: v, label: v }))} popupMatchSelectWidth={100} />
                      )}
                      {i === 2 && (
                        <Select size="small" variant="borderless" suffixIcon={null} style={{ width: '100%' }} value={teklif.kdvOrani} onChange={onKdvOraniDegistir} options={[{ value: 0, label: 'Hariç' }, { value: 1, label: '%1' }, { value: 10, label: '%10' }, { value: 20, label: '%20' }]} popupMatchSelectWidth={80} />
                      )}
                    </div>
                  ) : (
                    <div style={SETTINGS_VALUE_STYLE}>{item.value}</div>
                  )}
                </div>
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
              const grupGorsel = satir.grupRenk ? SATIR_GRUP_GORSEL[satir.grupRenk] : null;
              const setGroupPos = computeSetGroupPos(teklif.satirlar, idx);
              const isInsideSetGroup = setGroupPos === 'top' || setGroupPos === 'middle';
              const colCount = OFFER_TABLE_COLUMN_COUNT;

              const withGroupCellStyle = (style: React.CSSProperties): React.CSSProperties => {
                if (!grupGorsel) return style;
                return {
                  ...style,
                  background: grupGorsel.bg,
                  borderTopColor: grupGorsel.border,
                  borderBottomColor: grupGorsel.border,
                  borderLeftColor: grupGorsel.border,
                  borderRightColor: grupGorsel.border,
                };
              };

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


              const cellClick = (cell: SatirCellField) => handleSatirCellClick(satir, cell);
              const isActiveCell = (cell: SatirCellField) => isRowActive && satirFocusCell === cell;
              const activeClass = (cell: SatirCellField) => (isActiveCell(cell) ? 'is-active-cell' : undefined);
              const enterNext = (cell: SatirCellField) => () => {
                void cell;
                handleEnterNext();
              };

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
                    <RowCell idx={idx} pos="first" setGroupPos={setGroupPos} onClick={cellClick('urunKod')} style={withGroupCellStyle({ ...ROW_TEXT.no, cursor: 'pointer' })}>
                      {satir.setAltKalem ? (
                        <span data-group-paint-trigger="true" style={SET_SUBITEM_NUMBER_STYLE}>
                          {renderSetSubitemNumber(computeSetSubitemIndex(teklif.satirlar, idx) ?? 1)}
                        </span>
                      ) : (
                        <span data-group-paint-trigger="true">
                          {String(computeMainItemIndex(teklif.satirlar, idx)).padStart(2, '0')}
                        </span>
                      )}
                    </RowCell>
                    <RowCell idx={idx} pos="mid" setGroupPos={setGroupPos} onClick={cellClick('marka')} className={activeClass('marka')} style={withGroupCellStyle({ cursor: 'pointer', textAlign: 'center' })}>
                      {isActiveCell('marka') ? (
                        <SatirCellEditor
                          field="marka"
                          satir={satir}
                          paraBirimi={teklif.paraBirimi}
                          autoFocus
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onEnterNext={enterNext('marka')}
                        />
                      ) : (
                        <span data-group-paint-trigger="true" style={ROW_TEXT.brand}>{satir.marka || '-'}</span>
                      )}
                    </RowCell>
                    <RowCell idx={idx} pos="mid" setGroupPos={setGroupPos} onClick={cellClick('urunKod')} className={`product-code-cell ${activeClass('urunKod') ?? ''}`.trim()} style={withGroupCellStyle({ cursor: 'pointer', textAlign: 'left' })}>
                      {isActiveCell('urunKod') ? (
                        <SatirCellEditor
                          field="urunKod"
                          satir={satir}
                          paraBirimi={teklif.paraBirimi}
                          autoFocus
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onSetUygula={(setId) => onSatiraSetUygula(satir.id, setId)}
                          onEnterNext={enterNext('urunKod')}
                        />
                      ) : (
                        <span data-group-paint-trigger="true" style={ROW_TEXT.code}>{satir.urunKod || '-'}</span>
                      )}
                    </RowCell>
                    <RowCell idx={idx} pos="mid" setGroupPos={setGroupPos} onClick={cellClick('aciklama')} className={`description-cell ${activeClass('aciklama') ?? ''}`.trim()} style={withGroupCellStyle({ cursor: 'pointer', textAlign: 'left' })}>
                      {isActiveCell('aciklama') ? (
                        <SatirCellEditor
                          field="aciklama"
                          satir={satir}
                          paraBirimi={teklif.paraBirimi}
                          autoFocus
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onEnterNext={enterNext('aciklama')}
                        />
                      ) : (
                        <span data-group-paint-trigger="true">
                          <DescText text={satir.aciklama || '-'} />
                        </span>
                      )}
                    </RowCell>
                    <RowCell
                      idx={idx}
                      pos="mid"
                      setGroupPos={setGroupPos}
                      onClick={cellClick('miktar')}
                      className={activeClass('miktar')}
                      style={withGroupCellStyle({
                        cursor: 'pointer',
                        textAlign: 'left',
                      })}
                    >
                      {isActiveCell('miktar') ? (
                        <SatirCellEditor
                          field="miktar"
                          satir={satir}
                          paraBirimi={teklif.paraBirimi}
                          autoFocus
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onEnterNext={enterNext('miktar')}
                        />
                      ) : (
                        satir.miktar !== 0 ? (
                          <div data-group-paint-trigger="true" style={ROW_SHELL.quantityWrap}>
                            <span style={{ ...ROW_TEXT.quantityValue, ...ROW_SHELL.quantityValueWrap }}>{formatDisplayNumber(satir.miktar, 0, 4)}</span>
                            <span style={{ ...ROW_TEXT.quantityUnit, ...ROW_SHELL.quantityUnitWrap }}>{formatBirimAbbrev(satir.birim)}</span>
                          </div>
                        ) : <span data-group-paint-trigger="true">-</span>
                      )}
                    </RowCell>
                    {/* Para Birimi — set alt kaleminde de aynı hücre; satirBazli'da
                        para birimi etiketi gösterilir, değilse boş. */}
                    <RowCell
                      idx={idx}
                      pos="mid"
                      setGroupPos={setGroupPos}
                      onClick={satirBazliParaBirimi ? cellClick('paraBirimi') : undefined}
                      className={activeClass('paraBirimi')}
                      style={withGroupCellStyle({ cursor: satirBazliParaBirimi ? 'pointer' : 'default', textAlign: 'center' })}
                    >
                      {satirBazliParaBirimi ? (
                        isActiveCell('paraBirimi') ? (
                          <SatirCellEditor
                            field="paraBirimi"
                            satir={satir}
                            paraBirimi={teklif.paraBirimi}
                            autoFocus
                            onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                            onEnterNext={enterNext('paraBirimi')}
                          />
                        ) : (
                          <span data-group-paint-trigger="true" style={ROW_TEXT.currency}>{formatParaBirimiLabel(satirPb)}</span>
                        )
                      ) : null}
                    </RowCell>
                    {/* Birim Fiyat — alt kalemde tıklanamaz, değer 0 → '-' gösterimi */}
                    <RowCell
                      idx={idx}
                      pos="mid"
                      setGroupPos={setGroupPos}
                      onClick={satir.setAltKalem ? undefined : cellClick('birimFiyat')}
                      className={!satir.setAltKalem ? activeClass('birimFiyat') : undefined}
                      style={withGroupCellStyle({ cursor: satir.setAltKalem ? 'default' : 'pointer', textAlign: 'right' })}
                    >
                      {!satir.setAltKalem && isActiveCell('birimFiyat') ? (
                        <SatirCellEditor
                          field="birimFiyat"
                          satir={satir}
                          paraBirimi={teklif.paraBirimi}
                          autoFocus
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onEnterNext={enterNext('birimFiyat')}
                        />
                      ) : satir.setAltKalem ? null : (
                        <span data-group-paint-trigger="true" style={ROW_TEXT.price}>{(() => {
                          const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                          return nihai !== 0 ? formatDisplayNumber(nihai, 2, 2) : '-';
                        })()}</span>
                      )}
                    </RowCell>
                    {/* Toplam — alt kalemde boş; aksi halde değer */}
                    <RowCell
                      idx={idx}
                      pos="mid"
                      setGroupPos={setGroupPos}
                      onClick={satir.setAltKalem ? undefined : cellClick('birimFiyat')}
                      style={withGroupCellStyle({ cursor: satir.setAltKalem ? 'default' : 'pointer', textAlign: 'right' })}
                    >
                      {satir.setAltKalem ? null : (
                        <span data-group-paint-trigger="true" style={ROW_TEXT.total}>
                          {satir.satirToplami !== 0 ? formatDisplayNumber(satir.satirToplami, 2, 2) : '-'}
                        </span>
                      )}
                    </RowCell>
                    {/* Teslimat — alt kalemde tıklanamaz; tüm satırlar için aksiyon paneli burada */}
                    <RowCell
                      idx={idx}
                      pos="last"
                      setGroupPos={setGroupPos}
                      onClick={satir.setAltKalem ? undefined : cellClick('teslimat')}
                      className={!satir.setAltKalem ? activeClass('teslimat') : undefined}
                      style={withGroupCellStyle({ position: 'relative', cursor: satir.setAltKalem ? 'default' : 'pointer', textAlign: 'center' })}
                    >
                      {!satir.setAltKalem && isActiveCell('teslimat') ? (
                        <SatirCellEditor
                          field="teslimat"
                          satir={satir}
                          paraBirimi={teklif.paraBirimi}
                          autoFocus
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onEnterNext={enterNext('teslimat')}
                        />
                      ) : satir.setAltKalem ? null : (
                        <span data-group-paint-trigger="true" style={ROW_TEXT.delivery}>{satir.teslimTarihi || '-'}</span>
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
                    padding: '14px 7px', textAlign: 'center', fontSize: '11px', color: C.textMuted,
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
      // Çerçeve eski 56%/44% yapıda; rakamlar amountRightOffsetPx ile
      // tablonun "Toplam" kolonu değer X'iyle birebir hizalanır.
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        marginTop: '6px', marginBottom: '14px',
        tableLayout: 'fixed', borderLeft: 'none', borderRight: 'none',
        printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', ...noBreak,
      } as React.CSSProperties}>
        <colgroup><col style={{ width: '56%' }} /><col /></colgroup>
        <tbody>
          <tr>
            <td style={{ borderTop: 'none', borderBottom: 'none' }} />
            <td style={{ padding: '8px 0 10px', borderTop: 'none', borderBottom: 'none', verticalAlign: 'top' }}>
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
            fontSize: '12.1px',
            letterSpacing: 'inherit',
            lineHeight: 1.68,
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
            fontSize: '12.1px',
            lineHeight: 1.68,
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
      onKeyDown={handleGlobalEnter}
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
            {page.includeTotals && renderTotals()}
            {/* Notes wrapper son sayfada her zaman mount; AnimatedNotesContainer */}
            {/* açık/kapalı animasyonunu yönetir (kapanışta ~320ms mounted kalır). */}
            {page.pageNumber === pages.length && renderNotes()}
            </div>
            {page.includeSignature && (
              <div style={{ marginTop: 'auto' }}>
                <div style={SIGNATURE_SECTION_STYLE}>
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: '10px' }}>

                    {/* Sol: 2-satır dikey başlık */}
                    <div style={{
                      flexShrink: 0,
                      position: 'relative',
                      width: '28px',
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
                          textTransform: 'uppercase',
                          lineHeight: 1.1,
                          marginBottom: '4px',
                        }}>
                          Siparişi Veren
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
            )}
          </div>
          <FooterBlock teklif={teklif} pageNumber={page.pageNumber} totalPages={pages.length} />
          {renderPageOverlay?.(pageIdx)}
        </div>
      ))}
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
      setRender(true);
      const id = window.requestAnimationFrame(() => setExpanded(true));
      return () => window.cancelAnimationFrame(id);
    }
    setExpanded(false);
    const t = window.setTimeout(() => setRender(false), 320);
    return () => window.clearTimeout(t);
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
