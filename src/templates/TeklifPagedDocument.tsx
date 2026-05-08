import React from 'react';
import type { Teklif } from '../types';
import { useTeklifFirmaBilgileri } from '../hooks/useTeklifFirma';
import { formatDate, formatDisplayNumber, formatTitleCaseTr, formatCariAdi, formatSehir, formatVKN, formatMarka, formatAdres, formatAdSoyad } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';
import { getAdaptiveLogoPlacement } from '../styles/logoStyles';
import { FinansalOzetKartIci } from '../components/FinansalOzetKartIci';
import { TotalsCard } from '../components/TotalsCard';
import type { TeklifPagePlan } from '../services/documentPagination';
import {
  ACIKLAMA_OVERFLOW,
  CELL_PAD,
  createDocumentBrand,
  DOCUMENT_COLORS,
  DOCUMENT_PAGE,
  DOCUMENT_ROOT_STYLE,
  FOOTER_BAR_STYLE,
  LINE_ITEM_METRICS,
  getFullHeaderLayoutStyles,
  NOTES_BOX_STYLE,
  OFFER_TABLE_ROW_GAP_PX,
  PARA_BIRIMI_ETIKETI,
  PARTY_BODY_STYLE,
  PARTY_CARD_STYLE,
  PARTY_GRID_STYLE,
  PARTY_LABEL_STYLE,
  PARTY_NAME_STYLE,
  SETTINGS_CARD_STYLE,
  SETTINGS_EN_LABEL_STYLE,
  getSettingsGridStyle,
  SETTINGS_LABEL_STYLE,
  SETTINGS_SEP_STYLE,
  SETTINGS_TR_LABEL_STYLE,
  SETTINGS_VALUE_STYLE,
  SIGNATURE_BLOCK_ROW_STYLE,
  SIGNATURE_CONTENT_ROW_STYLE,
  SIGNATURE_FIELD_STYLE,
  SIGNATURE_FIELDS_GRID_STYLE,
  SIGNATURE_FIELDS_HOST_STYLE,
  SIGNATURE_LABEL_STYLE,
  SIGNATURE_LINE_STYLE,
  SIGNATURE_METRICS,
  SIGNATURE_SECTION_STYLE,
  TABLE_HEAD_SUBLABEL_STYLE,
  TABLE_STYLE,
  TABLE_TITLE_STYLE,
  TableColgroup,
  computeTotalsAmountRightOffset,
  URUN_KOD_OVERFLOW,
  buildSettingsItems,
  getOfferTableSeparatorClass,
  getOfferTableSeparatorStyle,
  getSetAltKalemEmptyCellStyle,
  getSetAltKalemFrameCloseStyle,
  getSetStepClass,
  getTableHeadCellStyle,
  noBreak,
  rcCell,
  computeSetGroupPos,
  computeMainItemIndex,
  computeSetSubitemIndex,
  renderSetSubitemNumber,
  SET_SUBITEM_NUMBER_STYLE,
  DescText,
  OFFER_TABLE_COLUMN_COUNT,
  TABLE_TEXT,
} from './teklifDocumentShared';

const C = DOCUMENT_COLORS;

interface TeklifPagedDocumentProps {
  teklif: Teklif;
  totals: TeklifToplam;
  pages: TeklifPagePlan[];
  renderPageOverlay?: (pageIndex: number) => React.ReactNode;
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

function FullHeaderBlock({ teklif }: { teklif: Teklif }) {
  const firmaBilgi = useTeklifFirmaBilgileri(teklif);
  const BRAND = createDocumentBrand(firmaBilgi.renkBirincil);
  const fullHeaderLayout = getFullHeaderLayoutStyles(firmaBilgi.id);
  const fullLogo = getAdaptiveLogoPlacement({
    firmaId: firmaBilgi.id,
    logoPath: firmaBilgi.logoPath,
    surface: 'a4-full',
    objectPosition: 'left center',
  });
  const muhatapSatiri = teklif.contactName?.trim()
    ? `${formatTitleCaseTr(teklif.contactName.trim())} ${teklif.contactTitle === 'HANIM' ? 'Hanım' : 'Bey'}`
    : (teklif.cari.yetkiliKisi || null);

  return (
    <>
      <div style={fullHeaderLayout.rootStyle}>
        <div style={fullHeaderLayout.logoColumnStyle}>
          <div style={fullLogo.slotStyle}>
            <img
              src={firmaBilgi.logoPath}
              alt={firmaBilgi.kisaAd}
              style={fullLogo.imageStyle}
            />
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
              background: BRAND.gradient,
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
              padding: '4px 12px 5px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              lineHeight: 1.2,
              borderRadius: '9px',
              border: `1px solid ${BRAND.border}`,
              boxShadow: BRAND.shadowSm,
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
                  <td style={{ fontSize: '11.5px', fontWeight: 700, color: C.navy, padding: '2px 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {teklif.teklifNo}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '8.5px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.05em' }}>Tarih</td>
                  <td style={{ fontSize: '10.2px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDate(teklif.tarih)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '8.5px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.05em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '9.5px', fontWeight: 400, color: C.textSoft, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {teklif.hazirlayanAdSoyad ? formatAdSoyad(teklif.hazirlayanAdSoyad) : firmaBilgi.kisaAd}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={PARTY_GRID_STYLE}>
        <div style={PARTY_CARD_STYLE}>
          <div style={PARTY_LABEL_STYLE}>Gönderen <span style={{ fontWeight: 400, opacity: 0.6 }}>/ From</span></div>
          <div style={PARTY_NAME_STYLE}>{firmaBilgi.ad}</div>
          <div style={PARTY_BODY_STYLE}>
            {firmaBilgi.telefon && <div>Tel: {formatPhone(firmaBilgi.telefon.replace(/\s+/g, ''))}</div>}
            {firmaBilgi.iban && (
              <div style={{ fontSize: '9.5px', color: C.textMuted, letterSpacing: '0.02em', marginTop: '2px' }}>
                IBAN: {firmaBilgi.iban}
              </div>
            )}
          </div>
        </div>
        <div style={PARTY_CARD_STYLE}>
          <div style={PARTY_LABEL_STYLE}>Alıcı <span style={{ fontWeight: 400, opacity: 0.6 }}>/ To</span></div>
          <div style={PARTY_NAME_STYLE}>{formatCariAdi(teklif.cari.firmaAdi)}</div>
          <div style={PARTY_BODY_STYLE}>
            {muhatapSatiri && <div style={{ fontWeight: '500', marginBottom: '1px' }}>Sayın {muhatapSatiri}</div>}
            {teklif.cari.adres && (
              <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {formatAdres(teklif.cari.adres)}
              </div>
            )}
            {(teklif.cari.sehir || teklif.cari.telefon || teklif.cari.ePosta) && (
              <div>
                {teklif.cari.sehir && <span>{formatSehir(teklif.cari.sehir)}</span>}
                {teklif.cari.sehir && teklif.cari.telefon && <span> &nbsp;|&nbsp; </span>}
                {teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>}
                {(teklif.cari.sehir || teklif.cari.telefon) && teklif.cari.ePosta && <span> &nbsp;|&nbsp; </span>}
                {teklif.cari.ePosta && <span>{teklif.cari.ePosta}</span>}
              </div>
            )}
            {teklif.cari.vergiNo && (
              <div>
                VKN: {formatVKN(teklif.cari.vergiNo)}
                {teklif.cari.vergiDairesi && <span> &nbsp;—&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const items = buildSettingsItems(teklif, teklif.satirBazliParaBirimi ?? false);
        return (
          <div style={getSettingsGridStyle(items.length)}>
            {items.map((item, i) => (
              <div key={i} style={SETTINGS_CARD_STYLE}>
                <div style={SETTINGS_LABEL_STYLE}>
                  <span style={SETTINGS_TR_LABEL_STYLE}>{item.tr}</span>
                  <span style={SETTINGS_SEP_STYLE}>/</span>
                  <span style={SETTINGS_EN_LABEL_STYLE}>{item.en}</span>
                </div>
                <div style={SETTINGS_VALUE_STYLE}>{item.value}</div>
              </div>
            ))}
          </div>
        );
      })()}
    </>
  );
}

function TableSection({
  teklif,
  rowStart,
  rowEnd,
  showTitle,
}: {
  teklif: Teklif;
  rowStart: number;
  rowEnd: number;
  showTitle: boolean;
}) {
  const satirBazliParaBirimi = teklif.satirBazliParaBirimi ?? false;
  const satirlar = teklif.satirlar.slice(rowStart, rowEnd);

  if (satirlar.length === 0) return null;

  return (
    <>
      {showTitle && (
        <div style={TABLE_TITLE_STYLE}>
          Teklif Kalemleri / Line Items
        </div>
      )}
      <table style={TABLE_STYLE}>
        <TableColgroup satirBazliParaBirimi={satirBazliParaBirimi} teklifSatirlari={teklif.satirlar} />
        <thead>
          <tr>
            {[
              { key: 'no' as const, label: '#', sub: '', align: 'center' as const },
              { key: 'marka' as const, label: 'Marka', sub: 'Brand', align: 'center' as const },
              { key: 'urunKod' as const, label: 'Ürün Kodu', sub: 'Item No', align: 'left' as const },
              { key: 'aciklama' as const, label: 'Açıklama', sub: 'Description', align: 'left' as const },
              { key: 'miktar' as const, label: 'Miktar', sub: 'Qty', align: 'left' as const },
              satirBazliParaBirimi
                ? { key: 'paraBirimi' as const, label: 'Para Birimi', sub: 'Currency', align: 'center' as const }
                : { key: 'paraBirimi' as const, label: '',            sub: '',         align: 'center' as const },
              { key: 'birimFiyat' as const, label: 'Birim Fiyat', sub: 'Unit Price', align: 'right' as const },
              { key: 'toplam' as const, label: 'Toplam', sub: 'Total', align: 'right' as const },
              { key: 'teslimat' as const, label: 'Teslimat', sub: 'Delivery', align: 'center' as const },
            ].map((col, i) => (
              <th key={i} className={getOfferTableSeparatorClass(col.key)} style={getTableHeadCellStyle(col.align, col.key)}>
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
            <td colSpan={OFFER_TABLE_COLUMN_COUNT} style={{ height: '3px', padding: 0, border: 'none', background: 'transparent' }} />
          </tr>
          {satirlar.map((satir, localIndex) => {
            const idx = rowStart + localIndex;
            const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi);
            const setGroupPos = computeSetGroupPos(teklif.satirlar, idx);
            const isLastInPage = localIndex === satirlar.length - 1;
            const renderSpacer = !isLastInPage && setGroupPos !== 'top' && setGroupPos !== 'middle';
            const applyCellStyle = (style: React.CSSProperties): React.CSSProperties => style;

            return (
              <React.Fragment key={satir.id}>
              <tr
                data-satir-id={satir.id}
                style={{
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                  ...(satir.rowHeight && satir.rowHeight > 0
                    ? { height: `${satir.rowHeight}px` }
                    : null),
                }}
              >
                <td style={applyCellStyle({ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: TABLE_TEXT.passive, whiteSpace: 'nowrap', ...rcCell('first', idx, undefined, setGroupPos) })}>
                  {satir.setAltKalem ? (
                    <span style={SET_SUBITEM_NUMBER_STYLE}>
                      {renderSetSubitemNumber(computeSetSubitemIndex(teklif.satirlar, idx) ?? 1)}
                    </span>
                  ) : (
                    String(computeMainItemIndex(teklif.satirlar, idx)).padStart(2, '0')
                  )}
                </td>
                <td className={getOfferTableSeparatorClass('marka')} style={applyCellStyle({ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: TABLE_TEXT.helper, whiteSpace: 'nowrap', ...getOfferTableSeparatorStyle('marka'), ...rcCell('mid', idx, undefined, setGroupPos) })}>
                  {satir.marka ? formatMarka(satir.marka) : '-'}
                </td>
                <td className={`product-code-cell ${getOfferTableSeparatorClass('urunKod') ?? ''}`.trim()} style={applyCellStyle({ padding: CELL_PAD, fontSize: `${LINE_ITEM_METRICS.codeFontSizePx}px`, fontWeight: 600, color: TABLE_TEXT.code, verticalAlign: 'middle', letterSpacing: '-0.1px', ...URUN_KOD_OVERFLOW, ...getOfferTableSeparatorStyle('urunKod'), ...rcCell('mid', idx, undefined, setGroupPos) })}>
                  {satir.urunKod || '-'}
                </td>
                <td className={`description-cell ${getOfferTableSeparatorClass('aciklama') ?? ''}`.trim()} style={applyCellStyle({ padding: CELL_PAD, fontWeight: 400, color: TABLE_TEXT.description, verticalAlign: 'middle', ...ACIKLAMA_OVERFLOW, ...getOfferTableSeparatorStyle('aciklama'), ...rcCell('mid', idx, undefined, setGroupPos) })}>
                  <DescText text={satir.aciklama ?? ''} />
                </td>
                <td className={getOfferTableSeparatorClass('miktar')} style={applyCellStyle({
                  padding: CELL_PAD,
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: TABLE_TEXT.numeric,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  ...getOfferTableSeparatorStyle('miktar'),
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satir.miktar !== 0 ? (
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 0 }}>
                      <span style={{ flex: '0 0 58%', minWidth: 0, textAlign: 'left', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: TABLE_TEXT.numeric }}>
                        {formatDisplayNumber(satir.miktar, 0, 4)}
                      </span>
                      <span style={{ flex: '1 1 0', minWidth: 0, textAlign: 'right', color: TABLE_TEXT.helper, fontSize: `${LINE_ITEM_METRICS.baseFontSizePx * LINE_ITEM_METRICS.quantityUnitScale}px`, paddingLeft: '8px', whiteSpace: 'nowrap' }}>
                        {/^adet$/i.test(satir.birim?.trim() ?? '') || !satir.birim ? 'Ad.' : satir.birim}
                      </span>
                    </div>
                  ) : '-'}
                </td>
                <td className={getOfferTableSeparatorClass('paraBirimi')} style={applyCellStyle({ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: TABLE_TEXT.helper, whiteSpace: 'nowrap', fontWeight: 700, letterSpacing: '0.03em', ...getOfferTableSeparatorStyle('paraBirimi'), ...rcCell('mid', idx, undefined, setGroupPos), ...getSetAltKalemFrameCloseStyle(satir.setAltKalem, setGroupPos === 'bottom') })}>
                  {satirBazliParaBirimi ? PARA_BIRIMI_ETIKETI[satirPb] : ''}
                </td>
                <td className={`${getOfferTableSeparatorClass('birimFiyat') ?? ''} ${getSetStepClass(satir.setAltKalem, setGroupPos)}`.trim() || undefined} style={applyCellStyle({ padding: CELL_PAD, textAlign: 'right', verticalAlign: 'middle', fontSize: '11px', color: TABLE_TEXT.numeric, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...getOfferTableSeparatorStyle('birimFiyat'), ...rcCell('mid', idx, undefined, satir.setAltKalem ? null : setGroupPos), ...getSetAltKalemEmptyCellStyle(satir.setAltKalem) })}>
                  {satir.setAltKalem ? '' : (() => {
                    const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                    return Math.abs(nihai) >= 0.005 ? formatDisplayNumber(nihai, 2, 2) : '-';
                  })()}
                </td>
                <td className={`${getOfferTableSeparatorClass('toplam') ?? ''} ${getSetStepClass(satir.setAltKalem, setGroupPos)}`.trim() || undefined} style={applyCellStyle({ padding: CELL_PAD, textAlign: 'right', verticalAlign: 'middle', fontSize: '11px', fontWeight: 700, color: TABLE_TEXT.numeric, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...getOfferTableSeparatorStyle('toplam'), ...rcCell('mid', idx, undefined, satir.setAltKalem ? null : setGroupPos), ...getSetAltKalemEmptyCellStyle(satir.setAltKalem) })}>
                  {satir.setAltKalem ? '' : (Math.abs(satir.satirToplami) >= 0.005 ? formatDisplayNumber(satir.satirToplami, 2, 2) : '-')}
                </td>
                <td className={`${getOfferTableSeparatorClass('teslimat') ?? ''} ${getSetStepClass(satir.setAltKalem, setGroupPos)}`.trim() || undefined} style={applyCellStyle({ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: `${LINE_ITEM_METRICS.deliveryFontSizePx}px`, color: TABLE_TEXT.passive, whiteSpace: 'nowrap', lineHeight: LINE_ITEM_METRICS.deliveryLineHeight, ...getOfferTableSeparatorStyle('teslimat'), ...rcCell('last', idx, undefined, satir.setAltKalem ? null : setGroupPos), ...getSetAltKalemEmptyCellStyle(satir.setAltKalem) })}>
                  {satir.setAltKalem ? '' : (satir.teslimTarihi || '-')}
                </td>
              </tr>
              {renderSpacer && (
                <tr aria-hidden="true">
                  <td colSpan={OFFER_TABLE_COLUMN_COUNT} style={{ height: `${OFFER_TABLE_ROW_GAP_PX}px`, padding: 0, border: 'none', background: 'transparent' }} />
                </tr>
              )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function TotalsBlock({ teklif, totals }: { teklif: Teklif; totals: TeklifToplam }) {
  const satirBazliParaBirimi = teklif.satirBazliParaBirimi ?? false;
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;
  const kullanilanParaKartlari = hesaplamaMotoru.kullanilanParaBirimiKartlariniHesapla(
    teklif.satirlar, teklif.paraBirimi, kdvOrani, iskontoOrani,
  );

  // Single-currency: TotalsCard tablonun hemen altında, sağa hizalı
  // (56%/44% colgroup), Siparişi Veren'den tamamen bağımsız.
  if (!satirBazliParaBirimi) {
    return (
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
            <td style={{ padding: 0, borderTop: 'none', borderBottom: 'none', verticalAlign: 'top' }}>
              <TotalsCard
                araToplam={araToplam}
                iskontoOrani={iskontoOrani}
                iskontoTutar={iskontoTutar}
                kdvOrani={kdvOrani}
                kdvTutar={kdvTutar}
                genelToplam={genelToplam}
                paraBirimi={teklif.paraBirimi}
                variant="dark"
                amountRightOffsetPx={computeTotalsAmountRightOffset(teklif.satirlar, false)}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  // satirBazli=true: çoklu para birimi kartları (mevcut yapı)
  return (
    <div style={{ ...noBreak }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '32px',
        marginBottom: '14px',
        tableLayout: 'fixed',
        border: 'none',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        ...noBreak,
      } as React.CSSProperties}>
        <colgroup>
          <col style={{ width: '56%' }} />
          <col />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={2} style={{ padding: '6px 10px 8px', borderBottom: 'none' }}>
              <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: kullanilanParaKartlari.length >= 3 ? 'flex-start' : 'flex-end', alignItems: 'flex-start', gap: '10px' }}>
                {kullanilanParaKartlari.map((item) => (
                  <div key={item.pb} style={{ width: '220px', minWidth: '220px', flexShrink: 0, position: 'relative', boxSizing: 'border-box', borderRadius: '12px', border: `0.75px solid ${C.border}`, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(26,43,66,0.05)' }}>
                    <FinansalOzetKartIci
                      araToplam={item.araToplam}
                      iskontoOrani={iskontoOrani}
                      iskontoTutar={item.iskontoTutar}
                      kdvOrani={kdvOrani}
                      kdvTutar={item.kdvTutar}
                      genelToplam={item.total}
                      paraBirimi={item.pb}
                      variant="pdf"
                    />
                  </div>
                ))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function NotesBlock({ teklif }: { teklif: Teklif }) {
  // Toggle kapalıysa hiç render etme. Toggle açıkken (boş içerik dahil)
  // editörle birebir aynı flex layout PDF'e gider.
  if (!teklif.notlarGosterilsin) return null;

  return (
    <div
      style={{
        ...NOTES_BOX_STYLE,
        ...noBreak,
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
      }}
    >
      <strong style={{ color: C.navy, flexShrink: 0, whiteSpace: 'nowrap' }}>
        Notlar / Notes:
      </strong>
      <span style={{ color: C.textMid, flex: 1, minWidth: 0 }}>
        {teklif.notlar}
      </span>
    </div>
  );
}

function SignatureBlock() {
  const SF_FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue","Inter","Arial",sans-serif';

  return (
    <div style={{ ...SIGNATURE_BLOCK_ROW_STYLE, fontFamily: SF_FONT } as React.CSSProperties}>

      {/* SİPARİŞİ VEREN bloğu — tam genişlik, 3 sütunlu (İsim+Tarih | Kaşe | İmza) */}
      <div style={{ flex: '0 0 100%', minWidth: 0, ...SIGNATURE_SECTION_STYLE } as React.CSSProperties}>
      <div style={SIGNATURE_CONTENT_ROW_STYLE}>

        {/* Sol: 2-satır dikey başlık — biraz büyütüldü, tracking arttırıldı */}
        <div style={{
          flexShrink: 0,
          width: '56px',
          minHeight: '74px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        }}>
          <div style={{
            transform: 'rotate(-90deg)',
            width: '120px',
            textAlign: 'left',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            fontFamily: SF_FONT,
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

        {/* Sağ: İçerik — isim+tarih | imza & kaşe */}
        <div style={SIGNATURE_FIELDS_HOST_STYLE}>
          <div style={SIGNATURE_FIELDS_GRID_STYLE}>
            <div style={{ ...SIGNATURE_FIELD_STYLE, fontFamily: SF_FONT, display: 'flex', flexDirection: 'column', gap: `${SIGNATURE_METRICS.detailsFieldGapPx}px` }}>
              <div style={{ ...SIGNATURE_FIELD_STYLE, width: '100%', maxWidth: '100%', fontFamily: SF_FONT }}>
                <div style={SIGNATURE_LINE_STYLE} />
                <div style={SIGNATURE_LABEL_STYLE}>
                  <span style={{ fontWeight: 500, color: C.sigPrimary }}>İsim</span>
                  <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                  <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Name</span>
                </div>
              </div>
              <div style={{ ...SIGNATURE_FIELD_STYLE, width: '100%', maxWidth: '100%', fontFamily: SF_FONT }}>
                <div style={SIGNATURE_LINE_STYLE} />
                <div style={SIGNATURE_LABEL_STYLE}>
                  <span style={{ fontWeight: 500, color: C.sigPrimary }}>Tarih</span>
                  <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                  <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Date</span>
                </div>
              </div>
            </div>
            <div style={{ ...SIGNATURE_FIELD_STYLE, width: `${SIGNATURE_METRICS.fieldsGridStampWidthMm}mm`, maxWidth: `${SIGNATURE_METRICS.fieldsGridStampWidthMm}mm`, fontFamily: SF_FONT }}>
              <div style={{ ...SIGNATURE_LINE_STYLE, width: `${SIGNATURE_METRICS.fieldsGridStampWidthMm}mm`, maxWidth: `${SIGNATURE_METRICS.fieldsGridStampWidthMm}mm` }} />
              <div style={SIGNATURE_LABEL_STYLE}>
                <span style={{ fontWeight: 500, color: C.sigPrimary }}>İmza & Kaşe</span>
                <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Signature & Stamp</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      </div>

    </div>
  );
}

function FooterBlock({ teklif, pageNumber, totalPages }: { teklif: Teklif; pageNumber: number; totalPages: number }) {
  const firmaBilgi = useTeklifFirmaBilgileri(teklif);
  return (
    <div style={{ ...FOOTER_BAR_STYLE, marginTop: 'auto' }}>
      <div>{firmaBilgi.ad}</div>
      <div style={{ fontSize: '8px', opacity: 0.7, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        Sayfa {pageNumber} / {totalPages}
      </div>
      <div>Teklif No: {teklif.teklifNo} | {formatDate(teklif.tarih)}</div>
    </div>
  );
}

export default function TeklifPagedDocument({ teklif, totals, pages, renderPageOverlay }: TeklifPagedDocumentProps) {
  return (
    <div style={{
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
      colorAdjust: 'exact',
    } as React.CSSProperties}>
      <style>{`
        @media print {
          body, html {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          [data-pdf-page] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background: #fff !important;
            page-break-after: always;
          }
          [data-pdf-page] * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            max-width: none !important;
            max-height: none !important;
          }
        }
      `}</style>
      {pages.map((page, idx) => (
        <div
          key={page.pageNumber}
          data-pdf-page="true"
          className="belge-inline"
          style={{
            ...DOCUMENT_ROOT_STYLE,
            height: `${DOCUMENT_PAGE.heightMm}mm`,
            minHeight: `${DOCUMENT_PAGE.heightMm}mm`,
            overflow: 'hidden',
            marginBottom: page.pageNumber < pages.length ? '6mm' : 0,
          } as React.CSSProperties}
        >
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              minHeight: 0,
              // Genel Toplam / İmza ile son kalem arasında tam 1 satırlık (rowHeight) garantili boşluk.
              marginBottom: page.includeSignature ? `${LINE_ITEM_METRICS.rowHeightPx}px` : 0,
            }}>
            {page.showFullHeader && <FullHeaderBlock teklif={teklif} />}
            {page.showCompactHeader && <CompactHeaderBlock teklif={teklif} />}
            {page.showTableHeader && (
              <TableSection
                teklif={teklif}
                rowStart={page.rowStartIndex}
                rowEnd={page.rowEndIndex}
                showTitle={page.showFullHeader}
              />
            )}
            {page.includeTotals && <TotalsBlock teklif={teklif} totals={totals} />}
            {page.includeNotes && <NotesBlock teklif={teklif} />}
            </div>
            {page.includeSignature && (
              <div style={{ marginTop: 'auto' }}>
                <SignatureBlock />
              </div>
            )}
          </div>
          <FooterBlock teklif={teklif} pageNumber={page.pageNumber} totalPages={pages.length} />
          {renderPageOverlay?.(idx)}
        </div>
      ))}
    </div>
  );
}
