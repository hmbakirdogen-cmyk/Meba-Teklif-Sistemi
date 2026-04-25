import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Select, Input, DatePicker } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Teklif, Cari, TeklifSatiri, ParaBirimi } from '../types';
import { formatDate, formatDisplayNumber, formatTitleCaseTr, formatCariAdi } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';
import { FinansalOzetKartIci } from './FinansalOzetKartIci';
import { TotalsCard } from './TotalsCard';
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
  LOGO,
  LOGO_FILE_W,
  LOGO_OPT_H,
  LOGO_OPT_W,
  LOGO_OPT_TOP,
  LOGO_OPT_LEFT,
  LINE_ITEM_CSS_VARS,
  OFFER_TABLE_COLUMN_COUNT,
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
} from '../templates/teklifDocumentShared';
import { FIELD_CSS, type EditingAlan } from './belgeInlineConstants';
import {
  SatirCellEditor,
  SatirAksiyonlariPanel,
  SATIR_CELL_NAV_ORDER,
  type SatirCellField,
} from './InlineSatirEditor';
import type { TeklifPagePlan } from '../services/documentPagination';

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
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;
  onSatirArayaEkle: (afterIndex: number) => void;
  onNotlarDegistir: (notlar: string) => void;
  readOnly?: boolean;
}

function CompactHeaderBlock({ teklif }: { teklif: Teklif }) {
  const S = 0.478;
  const logoW = LOGO_FILE_W * S;
  const logoH = LOGO.FILE_HEIGHT * S;
  const optW = LOGO_OPT_W * S;
  const optH = LOGO_OPT_H * S;
  const optTop = LOGO_OPT_TOP * S;
  const optLeft = LOGO_OPT_LEFT * S;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        paddingBottom: '3.5mm',
        borderBottom: `1.5px solid ${C.panelStrong}`,
      }}>
        <div style={{ position: 'relative', width: `${optW}px`, height: `${optH}px`, overflow: 'hidden', flexShrink: 0 }}>
          <img
            src="/logo-meba.png"
            alt="MEBA"
            style={{
              position: 'absolute',
              top: `${optTop}px`,
              left: `${optLeft}px`,
              width: `${logoW}px`,
              height: `${logoH}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              display: 'block',
              imageRendering: HIGH_QUALITY_IMAGE_RENDERING,
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '10.4px', fontWeight: 800, color: C.navy, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
            MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik San. Tic. Ltd. Şti.
          </span>
          <span style={{ fontSize: '9px', color: C.textSoft, lineHeight: 1.3 }}>
            Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ
          </span>
          <span style={{ fontSize: '9px', color: C.textSoft, lineHeight: 1.3 }}>
            Tel: 0352 502 07 80 | info@mebamekanik.com | www.mebamekanik.com
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

function FooterBlock({ teklif, pageNumber, totalPages }: { teklif: Teklif; pageNumber: number; totalPages: number }) {
  return (
    <div style={{ ...FOOTER_BAR_STYLE, marginTop: 'auto' }}>
      <div>MEBA Pnömatik Hidrolik Makina | KAYSERİ | info@mebamekanik.com</div>
      <div style={{ fontVariantNumeric: 'tabular-nums' }}>Teklif No: {teklif.teklifNo} | {formatDate(teklif.tarih)}</div>
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
  onSatirGuncelle,
  onSatirSil,
  onSatirEkle,
  onSatirArayaEkle,
  onNotlarDegistir,
  readOnly = false,
}: PaginatedBelgeInlineEditorProps) {
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;
  const kullanilanParaKartlari = hesaplamaMotoru.kullanilanParaBirimiKartlariniHesapla(
    teklif.satirlar, teklif.paraBirimi, kdvOrani, iskontoOrani,
  );

  const muhatapSatiri = teklif.contactName?.trim()
    ? `${formatTitleCaseTr(teklif.contactName.trim())} ${teklif.contactTitle === 'HANIM' ? 'Hanım' : 'Bey'}`
    : (teklif.cari.yetkiliKisi || null);

  const isMusteriEditing = !readOnly && editingAlan === 'musteri';
  const isAnyAyarEditing = !readOnly && (editingAlan?.startsWith('ayar-') ?? false);
  const isNotlarEditing  = !readOnly && editingAlan === 'notlar';
  const editingSatirId   = !readOnly && editingAlan?.startsWith('satir-') ? editingAlan.slice(6) : null;

  const muhatapRef = useRef<InputRef>(null);
  const prevMusteriEditing = useRef(false);
  const [cariSearchText, setCariSearchText] = useState(() => formatCariAdi(teklif.cari.firmaAdi));

  useEffect(() => {
    const justOpened = isMusteriEditing && !prevMusteriEditing.current;
    prevMusteriEditing.current = isMusteriEditing;
    if (justOpened && teklif.cari.firmaAdi) {
      const timer = setTimeout(() => muhatapRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [isMusteriEditing, teklif.cari.firmaAdi]);

  const [satirFocusCell, setSatirFocusCell] = useState<SatirCellField>('urunKod');

  const handleSatirCellClick = useCallback(
    (satirId: string, cell: SatirCellField) => (e: React.MouseEvent) => {
      if (readOnly) return;
      e.stopPropagation();
      setSatirFocusCell(cell);
      onEditingAlanDegistir(`satir-${satirId}`);
    },
    [onEditingAlanDegistir, readOnly],
  );

  const handleEnterNext = useCallback(
    (satirId: string, currentCell: SatirCellField, rowIdx: number) => {
      const idx = SATIR_CELL_NAV_ORDER.indexOf(currentCell);
      if (idx >= 0 && idx < SATIR_CELL_NAV_ORDER.length - 1) {
        setSatirFocusCell(SATIR_CELL_NAV_ORDER[idx + 1]);
        onEditingAlanDegistir(`satir-${satirId}`);
      } else {
        onSatirArayaEkle(rowIdx);
      }
    },
    [onEditingAlanDegistir, onSatirArayaEkle],
  );

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
          <div style={{ position: 'relative', width: `${LOGO_OPT_W}px`, height: `${LOGO_OPT_H}px`, overflow: 'hidden' }}>
            <img src="/logo-meba.png" alt="MEBA Mekanik" style={{
              position: 'absolute', top: `${LOGO_OPT_TOP}px`, left: `${LOGO_OPT_LEFT}px`,
              width: `${LOGO_FILE_W}px`, height: `${LOGO.FILE_HEIGHT}px`,
              maxWidth: 'none', maxHeight: 'none', display: 'block',
              imageRendering: HIGH_QUALITY_IMAGE_RENDERING,
              printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
            }} />
          </div>
        </div>
        <div style={{ flex: '0 0 31%', maxWidth: '31%', paddingRight: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <div style={{ fontWeight: 800, fontSize: '11.5px', color: C.navy, lineHeight: '1.25', letterSpacing: '-0.012em' }}>
            MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik<br />San. Tic. Ltd. Şti.
          </div>
          <div style={{ fontSize: '9.2px', lineHeight: '1.35', color: C.textSoft, letterSpacing: '0.01em' }}>
            Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv.<br />No:252/D Melikgazi / KAYSERİ
          </div>
        </div>
        <div style={{ flex: '0 0 32%', maxWidth: '32%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', boxSizing: 'border-box' }}>
          <div style={{ width: '202px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', boxSizing: 'border-box' }}>
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
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '2px 0 1px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Teklif No</td>
                  <td style={{ fontSize: '12.1px', fontWeight: 800, color: C.navy, padding: '2px 0 1px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>{teklif.teklifNo}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Tarih</td>
                  <td style={{ fontSize: '10.9px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
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
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: 0, lineHeight: 1.2, letterSpacing: '0.04em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '10px', fontWeight: 400, color: C.textSoft, padding: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teklif.hazirlayanAdSoyad || 'MEBA Mekanik'}</td>
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
          <div style={PARTY_NAME_STYLE}>MEBA Mekanik Ltd. Şti.</div>
          <div style={PARTY_BODY_STYLE}>Tel: {formatPhone('03525020780')}<br />www.mebamekanik.com</div>
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
                {(teklif.cari.telefon || teklif.cari.ePosta) && (
                  <div>
                    {teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>}
                    {teklif.cari.telefon && teklif.cari.ePosta && <span> &nbsp;|&nbsp; </span>}
                    {teklif.cari.ePosta && <span>{teklif.cari.ePosta}</span>}
                  </div>
                )}
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
                {(teklif.cari.telefon || teklif.cari.ePosta) && (
                  <div>
                    {teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>}
                    {teklif.cari.telefon && teklif.cari.ePosta && <span> &nbsp;|&nbsp; </span>}
                    {teklif.cari.ePosta && <span>{teklif.cari.ePosta}</span>}
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

    return (
      <>
        <div style={{ ...TABLE_TITLE_STYLE, display: page.showFullHeader ? 'block' : 'none' }}>
          Teklif Kalemleri <span style={{ fontWeight: 400, opacity: 0.55 }}>/ Line Items</span>
        </div>
        <table className="offer-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '0 2px', marginBottom: 0 }}>
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
              const colCount = OFFER_TABLE_COLUMN_COUNT;

              const insertIndicator = (
                <tr key={`insert-${satir.id}`} className="satir-araya-ekle-zone" style={{ height: 0 }}>
                  <td colSpan={colCount} style={{ padding: 0, border: 'none', position: 'relative', height: 0, overflow: 'visible' }}>
                    <div
                      className="satir-araya-ekle-btn"
                      onClick={readOnly ? undefined : (e) => { e.stopPropagation(); onSatirArayaEkle(idx); }}
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


              const cellClick = (cell: SatirCellField) => handleSatirCellClick(satir.id, cell);
              const isActiveCell = (cell: SatirCellField) => isRowActive && satirFocusCell === cell;
              const activeClass = (cell: SatirCellField) => (isActiveCell(cell) ? 'is-active-cell' : undefined);
              const enterNext = (cell: SatirCellField) => () => handleEnterNext(satir.id, cell, idx);

              return (
                <React.Fragment key={satir.id}>
                  <tr data-satir-id={satir.id} style={{ ...noBreak }}>
                    <RowCell idx={idx} pos="first" onClick={cellClick('urunKod')} style={{ ...ROW_TEXT.no, cursor: 'pointer' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </RowCell>
                    <RowCell idx={idx} pos="mid" onClick={cellClick('marka')} className={activeClass('marka')} style={{ cursor: 'pointer' }}>
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
                        <span style={ROW_TEXT.brand}>{satir.marka || '-'}</span>
                      )}
                    </RowCell>
                    <RowCell idx={idx} pos="mid" onClick={cellClick('urunKod')} className={`product-code-cell ${activeClass('urunKod') ?? ''}`.trim()} style={{ cursor: 'pointer' }}>
                      {isActiveCell('urunKod') ? (
                        <SatirCellEditor
                          field="urunKod"
                          satir={satir}
                          paraBirimi={teklif.paraBirimi}
                          autoFocus
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onEnterNext={enterNext('urunKod')}
                        />
                      ) : (
                        <span style={ROW_TEXT.code}>{satir.urunKod || '-'}</span>
                      )}
                    </RowCell>
                    <RowCell idx={idx} pos="mid" onClick={cellClick('aciklama')} className={`description-cell ${activeClass('aciklama') ?? ''}`.trim()} style={{ cursor: 'pointer' }}>
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
                        <DescText text={satir.aciklama || '-'} />
                      )}
                    </RowCell>
                    <RowCell idx={idx} pos="mid" onClick={cellClick('miktar')} className={activeClass('miktar')} style={{ cursor: 'pointer' }}>
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
                          <div style={ROW_SHELL.quantityWrap}>
                            <span style={{ ...ROW_TEXT.quantityValue, ...ROW_SHELL.quantityValueWrap }}>{formatDisplayNumber(satir.miktar, 0, 4)}</span>
                            <span style={{ ...ROW_TEXT.quantityUnit, ...ROW_SHELL.quantityUnitWrap }}>{formatBirimAbbrev(satir.birim)}</span>
                          </div>
                        ) : '-'
                      )}
                    </RowCell>
                    <RowCell
                      idx={idx}
                      pos="mid"
                      onClick={satirBazliParaBirimi ? cellClick('paraBirimi') : undefined}
                      className={activeClass('paraBirimi')}
                      style={{ cursor: satirBazliParaBirimi ? 'pointer' : 'default' }}
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
                          <span style={ROW_TEXT.currency}>{formatParaBirimiLabel(satirPb)}</span>
                        )
                      ) : null}
                    </RowCell>
                    <RowCell idx={idx} pos="mid" onClick={cellClick('birimFiyat')} className={activeClass('birimFiyat')} style={{ cursor: 'pointer' }}>
                      {isActiveCell('birimFiyat') ? (
                        <SatirCellEditor
                          field="birimFiyat"
                          satir={satir}
                          paraBirimi={teklif.paraBirimi}
                          autoFocus
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onEnterNext={enterNext('birimFiyat')}
                        />
                      ) : (
                        <span style={ROW_TEXT.price}>{(() => {
                          const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                          return nihai !== 0 ? formatDisplayNumber(nihai, 2, 2) : '-';
                        })()}</span>
                      )}
                    </RowCell>
                    <RowCell idx={idx} pos="mid" onClick={cellClick('birimFiyat')} style={{ cursor: 'pointer' }}>
                      <span style={ROW_TEXT.total}>
                        {satir.satirToplami !== 0 ? formatDisplayNumber(satir.satirToplami, 2, 2) : '-'}
                      </span>
                    </RowCell>
                    <RowCell idx={idx} pos="last" onClick={cellClick('teslimat')} className={activeClass('teslimat')} style={{ position: 'relative', cursor: 'pointer' }}>
                      {isActiveCell('teslimat') ? (
                        <SatirCellEditor
                          field="teslimat"
                          satir={satir}
                          paraBirimi={teklif.paraBirimi}
                          autoFocus
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onEnterNext={enterNext('teslimat')}
                        />
                      ) : (
                        <span style={ROW_TEXT.delivery}>{satir.teslimTarihi || '-'}</span>
                      )}
                      {(satir.indirimOrani || 0) > 0 && !isRowActive && (
                        <span style={{ position: 'absolute', top: 2, right: 2, fontSize: '7.5px', fontWeight: 700, color: C.accent, background: 'rgba(37,99,235,0.08)', borderRadius: '3px', padding: '1px 3px', lineHeight: 1, letterSpacing: '0.02em', pointerEvents: 'none' }}>
                          -{satir.indirimOrani}%
                        </span>
                      )}
                      {isRowActive && !readOnly ? (
                        <SatirAksiyonlariPanel
                          satir={satir}
                          satirBazliIskonto={satirBazliIskonto}
                          onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                          onSil={() => onSatirSil(satir.id)}
                        />
                      ) : (
                        <div className="belge-satir-hover-actions" style={{ position: 'absolute', right: -2, top: '50%', transform: 'translateY(-50%)', zIndex: 40, display: 'flex', gap: '2px' }}>
                          <span
                            onClick={readOnly ? undefined : (e) => { e.stopPropagation(); onSatirSil(satir.id); }}
                            style={{
                              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 20, height: 20, borderRadius: '4px',
                              background: 'rgba(255,255,255,0.95)', border: `0.75px solid ${C.borderSoft}`,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: '#b91c1c', fontSize: '9px',
                            }}
                            title="Satırı sil"
                          >
                            <DeleteOutlined />
                          </span>
                        </div>
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
        {page.pageNumber === pages.length && teklif.satirlar.length > 0 && !readOnly && (
          <div
            className="belge-kalem-ekle-bar"
            onClick={(e) => { e.stopPropagation(); onSatirEkle(); }}
            style={{
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
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.55'; }}
          >
            <PlusOutlined style={{ fontSize: 9 }} /> Yeni kalem ekle
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
        marginTop: '10px', marginBottom: '14px',
        tableLayout: 'fixed', borderLeft: 'none', borderRight: 'none',
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', ...noBreak,
      } as React.CSSProperties}>
        <colgroup><col style={{ width: '56%' }} /><col /></colgroup>
        <tbody>
          <tr>
            <td colSpan={2} style={{ padding: '8px 10px 10px', borderBottom: 'none' }}>
              <div style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: '112px',
                border: `0.75px solid ${HEADER_SURFACE.border}`,
                borderRadius: '8px',
                background: HEADER_SURFACE.bg,
                boxShadow: HEADER_SURFACE.shadow,
                padding: '7px 8px 8px',
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact',
              }}>
                <div style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: HEADER_SURFACE.textLabel, lineHeight: 1, paddingBottom: '6px', paddingLeft: '2px' }}>Genel Toplamlar / Grand Total</div>
                <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: kullanilanParaKartlari.length >= 3 ? 'flex-start' : 'flex-end', alignItems: 'flex-start', gap: '8px' }}>
                  {kullanilanParaKartlari.map((item) => (
                    <div key={item.pb} style={{ width: '220px', minWidth: '220px', height: '86px', flexShrink: 0, position: 'relative', boxSizing: 'border-box', borderRadius: '10px', border: `0.75px solid ${C.border}`, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(26,43,66,0.05)' }}>
                      <FinansalOzetKartIci araToplam={item.araToplam} iskontoOrani={iskontoOrani} iskontoTutar={item.iskontoTutar} kdvOrani={kdvOrani} kdvTutar={item.kdvTutar} genelToplam={item.total} paraBirimi={item.pb} variant="pdf" />
                    </div>
                  ))}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );

  const renderNotes = () => (
    <div
      data-alan="notlar"
      onClick={(e) => handleAlanClick('notlar', e)}
      style={{ ...NOTES_BOX_STYLE, minHeight: isNotlarEditing ? 60 : (teklif.notlar ? undefined : 44), ...noBreak, ...editFrameStyle(isNotlarEditing) } as React.CSSProperties}
    >
      {isNotlarEditing ? (
        <div className="field-group">
          <div style={{ fontSize: '8.5px', fontWeight: 700, color: C.navy, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5, opacity: 0.7 }}>
            Notlar <span style={{ fontWeight: 400, opacity: 0.6 }}>/ Notes</span>
          </div>
          <Input.TextArea autoFocus variant="borderless" value={teklif.notlar} onChange={(e) => onNotlarDegistir(e.target.value)} autoSize={{ minRows: 2, maxRows: 8 }} style={{ fontSize: '12.5px', lineHeight: '1.65', color: C.textMid, padding: 0 }} placeholder="Not ekleyin..." />
        </div>
      ) : teklif.notlar ? (
        <>
          <strong style={{ color: C.navy, fontSize: '11px', letterSpacing: '0.02em' }}>Notlar / Notes:&nbsp;</strong>
          <span style={{ color: C.textMid }}>{teklif.notlar}</span>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 24 }}>
          <span style={{ color: C.textMuted, fontStyle: 'italic', fontSize: '11px', opacity: 0.65 }}>Not eklemek için tıklayın...</span>
        </div>
      )}
    </div>
  );

  return (
    <div className={readOnly ? 'belge-inline belge-readonly' : 'belge-inline'}>
      <style>{FIELD_CSS}{`
        .belge-inline .offer-table {
          ${LINE_ITEM_CSS_VARS}
        }
        .satir-aksiyonlari { pointer-events: auto; }
        .belge-satir-hover-actions { opacity: 0; pointer-events: none; transition: opacity 0.18s; }
        tr:hover > td > .belge-satir-hover-actions,
        tr:focus-within > td > .belge-satir-hover-actions { opacity: 1; pointer-events: auto; }
        .belge-readonly .belge-satir-hover-actions { display: none !important; }
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
        .satir-araya-ekle-zone:hover { pointer-events: auto; }
        .satir-araya-ekle-zone:hover .satir-araya-ekle-btn,
        tr[data-satir-id]:hover + .satir-araya-ekle-zone .satir-araya-ekle-btn { opacity: 1 !important; pointer-events: auto !important; }
      `}</style>

      {pages.map((page) => (
        <div
          key={page.pageNumber}
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
            {page.includeNotes && renderNotes()}
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
        </div>
      ))}
    </div>
  );
}
