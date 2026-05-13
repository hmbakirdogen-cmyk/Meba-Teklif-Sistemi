import React from 'react';
import type { Teklif } from '../types';
import { useTeklifFirmaBilgileri } from '../hooks/useTeklifFirma';
import { formatDate, formatDisplayNumber, formatTitleCaseTr, formatCariAdi, formatSehir, formatVKN, formatMarka, formatAdres, formatAdSoyad } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';
import { getAdaptiveLogoPlacement } from '../styles/logoStyles';
import { TotalsCard } from '../components/TotalsCard';
import {
  ACIKLAMA_OVERFLOW,
  CELL_PAD,
  URUN_KOD_OVERFLOW,
  createDocumentBrand,
  DOCUMENT_COLORS,
  DOCUMENT_PAGE,
  DOCUMENT_ROOT_STYLE,
  FOOTER_BAR_STYLE,
  LINE_ITEM_METRICS,
  getFullHeaderLayoutStyles,
  noBreak,
  NOTES_BOX_STYLE,
  OFFER_TABLE_ROW_GAP_PX,
  PARA_BIRIMI_ETIKETI,
  PARTY_GRID_STYLE,
  PARTY_CARD_STYLE,
  PARTY_LABEL_STYLE,
  PARTY_NAME_STYLE,
  PARTY_BODY_STYLE,
  PARTY_GREETING_STYLE,
  rcCell,
  computeSetGroupPos,
  computeMainItemIndex,
  computeSetSubitemIndex,
  renderSetSubitemNumber,
  SET_SUBITEM_NUMBER_STYLE,
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
  TABLE_STYLE,
  TABLE_TITLE_STYLE,
  TableColgroup,
  computeTotalsAmountRightOffset,
  buildSettingsItems,
  getOfferTableSeparatorClass,
  getOfferTableSeparatorStyle,
  getSetStepClass,
  getTableHeadCellStyle,
  DescText,
  OFFER_TABLE_COLUMN_COUNT,
  TABLE_TEXT,
  efektifSatirBazliParaBirimi,
} from './teklifDocumentShared';

const C = DOCUMENT_COLORS;

interface TeklifSablonuProps {
  teklif: Teklif;
  totals: TeklifToplam;
}

/**
 * KompaktAntet — Sayfa 2+ için küçültülmüş antet.
 * Tam sayfa genişliğinde (210mm) bağımsız olarak render edilir,
 * ardından PDF motorunda içerik dilimleriyle compositing yapılır.
 */
export function KompaktAntet({ teklif }: { teklif: Teklif }) {
  const firmaBilgi = useTeklifFirmaBilgileri(teklif);
  const compactLogo = getAdaptiveLogoPlacement({
    firmaId: firmaBilgi.id,
    logoPath: firmaBilgi.logoPath,
    surface: 'a4-compact',
    objectPosition: 'left center',
  });

  return (
    <div style={{
          width: `${DOCUMENT_PAGE.widthMm}mm`,
      boxSizing: 'border-box',
      padding: '12mm 10mm 0',
      fontFamily: 'var(--font-sans)',
      backgroundColor: '#FAFAF8',
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
    } as React.CSSProperties}>
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
        {/* Firma bilgileri — aktif teklifin firmaId'sinden */}
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
        {/* Teklif no + tarih */}
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


export default function TeklifSablonu({ teklif, totals }: TeklifSablonuProps) {
  const firmaBilgi = useTeklifFirmaBilgileri(teklif);
  const BRAND = createDocumentBrand(firmaBilgi.renkBirincil);
  const fullHeaderLayout = getFullHeaderLayoutStyles(firmaBilgi.id);
  const fullLogo = getAdaptiveLogoPlacement({
    firmaId: firmaBilgi.id,
    logoPath: firmaBilgi.logoPath,
    surface: 'a4-full',
    objectPosition: 'left center',
  });
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;
  const satirBazliParaBirimi = teklif.satirBazliParaBirimi ?? false;
  const kullanilanParaKartlari = hesaplamaMotoru.kullanilanParaBirimiKartlariniHesapla(
    teklif.satirlar, teklif.paraBirimi, kdvOrani, iskontoOrani,
  );

  // Muhatap satırı: YETKILI → "Sayın İlgili" (isim göz ardı edilir);
  // isim varsa title-case + Bey/Hanım; yoksa yetkiliKisi fallback.
  const muhatapSatiri = teklif.contactTitle === 'YETKILI'
    ? 'Yetkili'
    : teklif.contactName?.trim()
      ? `${formatTitleCaseTr(teklif.contactName.trim())} ${teklif.contactTitle === 'HANIM' ? 'Hanım' : 'Bey'}`
      : (teklif.cari.yetkiliKisi || null);

  return (
    <div
      id="teklif-sablon"
      className="belge-inline"
      style={{
        ...DOCUMENT_ROOT_STYLE,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        colorAdjust: 'exact',
      } as React.CSSProperties}
    >
      <style>{`
        @media print {
          body, html {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          #teklif-sablon {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #teklif-sablon * {
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

      {/* İçerik alanı — flex: 1 ile footer'ı en alta iter */}
      <div style={{ flex: 1 }}>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      {/* alignItems:'stretch' → 3 sütun da bu yüksekliğe gerilir.  */}
      {/* Sütun 2: space-between → isim üst / adres alt sınıra oturur*/}
      {/* Sütun 3: space-between → badge üst / tablo alt sınıra oturur*/}
      <div style={fullHeaderLayout.rootStyle}>

        {/* ── Sütun 1: Logo — sadece genişlik sabitlenir, yükseklik doğal orana bırakılır */}
        <div style={fullHeaderLayout.logoColumnStyle}>
          <div style={fullLogo.slotStyle}>
            <img
              src={firmaBilgi.logoPath}
              alt={firmaBilgi.kisaAd}
              style={fullLogo.imageStyle}
            />
          </div>
        </div>

        {/* ── Sütun 2: Gönderen firma bilgileri — telefon hariç ─────── */}
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

        {/* ── Sütun 3: Teklif bilgi bloğu ────────────────────────── */}
        {/* 202px anchor: badge üstte (logo üst), tablo altta (logo   */}
        {/* alt). space-between her ikisini sınırlara sabitler.        */}
        {/* 32% × ~718px = 229px > 202px ✓                           */}
        <div style={fullHeaderLayout.quoteColumnStyle}>
          <div style={fullHeaderLayout.quotePanelStyle}>
            {/* TEKLİF başlık etiketi — logo üst sınırına oturur */}
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
              <span style={{ fontWeight: 700, fontSize: '14.5px', letterSpacing: '0.8px', color: BRAND.text }}>
                TEKLİF
              </span>
              <span style={{ fontSize: '9.5px', color: BRAND.textSub, letterSpacing: '0.02em' }}>
                / Quotation
              </span>
              {teklif.revizyonNo && teklif.revizyonNo > 0 && (
                <span style={{ fontSize: '9px', fontWeight: 600, color: BRAND.textSub, marginLeft: '6px' }}>
                  Rev.{String(teklif.revizyonNo).padStart(2, '0')}
                </span>
              )}
            </div>
            {/* Teklif meta tablosu — logo alt sınırına oturur         */}
            {/* Hiyerarşi: Teklif No (güçlü) > Tarih (orta) > Hazırlayan (sade) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '38%' }} />
                <col style={{ width: '62%' }} />
              </colgroup>
              <tbody>
                {/* lineHeight 1.3 → descender'lı harfler (ğ/y/p/g/ç) için
                     yeterli alt nefes payı; html2canvas yakalamasında alt
                     yarısı kırpılmaz. */}
                <tr>
                  <td style={{ fontSize: '8.5px', color: C.textMuted, padding: '2px 0 1px 0', lineHeight: 1.3, letterSpacing: '0.05em' }}>Teklif No</td>
                  <td style={{ fontSize: '11.5px', fontWeight: 700, color: C.navy, padding: '2px 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {teklif.teklifNo}
                  </td>
                </tr>
                {/* ── Tarih — secondary ── */}
                <tr>
                  <td style={{ fontSize: '8.5px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.05em' }}>Tarih</td>
                  <td style={{ fontSize: '10.2px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDate(teklif.tarih)}
                  </td>
                </tr>
                {/* ── Hazırlayan — tertiary ── */}
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

      {/* ══ GÖNDEREN / ALICI ════════════════════════════════════ */}
      <div style={PARTY_GRID_STYLE}>
        {/* Gönderen */}
        <div style={PARTY_CARD_STYLE}>
          <div style={PARTY_LABEL_STYLE}>
            Gönderen <span style={{ fontWeight: 400, opacity: 0.6 }}>/ From</span>
          </div>
          <div style={PARTY_NAME_STYLE}>
            {firmaBilgi.ad}
          </div>
          <div style={PARTY_BODY_STYLE}>
            {firmaBilgi.telefon && <div>Tel: {formatPhone(firmaBilgi.telefon.replace(/\s+/g, ''))}</div>}
            {firmaBilgi.iban && (
              <div style={{ fontSize: '9.5px', color: C.textMuted, letterSpacing: '0.02em', marginTop: '2px' }}>
                IBAN: {firmaBilgi.iban}
              </div>
            )}
          </div>
        </div>
        {/* Alıcı */}
        <div data-alan="musteri" style={PARTY_CARD_STYLE}>
          <div style={PARTY_LABEL_STYLE}>
            Alıcı <span style={{ fontWeight: 400, opacity: 0.6 }}>/ To</span>
          </div>
          <div style={PARTY_NAME_STYLE}>
            {formatCariAdi(teklif.cari.firmaAdi)}
          </div>
          <div style={PARTY_BODY_STYLE}>
            {muhatapSatiri && (
              <div style={PARTY_GREETING_STYLE}>Sayın {muhatapSatiri},</div>
            )}
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

      {/* ══ ÖDEME / PARA / KDV / KUR ════════════════════════════ */}
      {(() => {
        const settingsItems = buildSettingsItems(teklif, satirBazliParaBirimi);
        return (
          <div data-alan="ayarlar" style={getSettingsGridStyle(settingsItems.length)}>
            {settingsItems.map((item, i) => (
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

      {/* ══ TEKLİF KALEMLERİ TABLOSU ════════════════════════════ */}
      <div style={TABLE_TITLE_STYLE}>
        Teklif Kalemleri / Line Items
      </div>
      {/* Dikey çizgiler kaldırıldı: outer border yerine top+bottom,            */}
      {/* başlık ve hücreler arasındaki dikey ayraçlar da devre dışı.           */}
      <table style={TABLE_STYLE}>
        <TableColgroup satirBazliParaBirimi={satirBazliParaBirimi} teklifSatirlari={teklif.satirlar} />
        <thead id="pdf-thead">
          <tr>
            {[
              { key: 'no' as const, label: '#',           sub: '',            align: 'center' as const },
              { key: 'marka' as const, label: 'Marka',       sub: 'Brand',       align: 'center' as const },
              { key: 'urunKod' as const, label: 'Ürün Kodu',   sub: 'Item No',     align: 'left'   as const },
              { key: 'aciklama' as const, label: 'Açıklama',    sub: 'Description', align: 'left'   as const },
              { key: 'miktar' as const, label: 'Miktar',      sub: 'Qty',         align: 'left'   as const },
              satirBazliParaBirimi
                ? { key: 'paraBirimi' as const, label: 'Para Birimi', sub: 'Currency', align: 'center' as const }
                : { key: 'paraBirimi' as const, label: '',            sub: '',         align: 'center' as const },
              { key: 'birimFiyat' as const, label: 'Birim Fiyat', sub: 'Unit Price',  align: 'right'  as const },
              { key: 'toplam' as const, label: 'Toplam',      sub: 'Total',       align: 'right'  as const },
              { key: 'teslimat' as const, label: 'Teslimat',    sub: 'Delivery',    align: 'center' as const },
            ].map((col, i) => (
              <th
                key={i}
                className={getOfferTableSeparatorClass(col.key)}
                style={getTableHeadCellStyle(col.align, col.key)}
              >
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
          {/* Başlık çizgisi ile ilk kalem satırı arası boşluk */}
          <tr aria-hidden="true">
            <td colSpan={OFFER_TABLE_COLUMN_COUNT} style={{ height: '3px', padding: 0, border: 'none', background: 'transparent' }} />
          </tr>
          {teklif.satirlar.map((satir, idx) => {
            const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi);
            const setGroupPos = computeSetGroupPos(teklif.satirlar, idx);
            // Spacer: bir sonraki satır farklı bir gruba/satıra ait ise 2px hava;
            // grup içinde değilse de aynen 2px (eski border-spacing davranışı).
            const isLast = idx === teklif.satirlar.length - 1;
            const renderSpacer = !isLast && setGroupPos !== 'top' && setGroupPos !== 'middle';
            const applyCellStyle = (style: React.CSSProperties): React.CSSProperties => style;
            return (
              <React.Fragment key={satir.id}>
              <tr
                data-satir-id={satir.id}
                style={{
                  // background on <td> via rcCell — html2canvas 1.4.1 skips <tr> backgrounds
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                  ...(satir.rowHeight && satir.rowHeight > 0
                    ? { height: `${satir.rowHeight}px` }
                    : null),
                }}
              >
                {/* No */}
                <td style={applyCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: TABLE_TEXT.passive,
                  whiteSpace: 'nowrap',
                  ...rcCell('first', idx, undefined, setGroupPos),
                })}>
                  {satir.setAltKalem ? (
                    <span style={SET_SUBITEM_NUMBER_STYLE}>
                      {renderSetSubitemNumber(computeSetSubitemIndex(teklif.satirlar, idx) ?? 1)}
                    </span>
                  ) : (
                    String(computeMainItemIndex(teklif.satirlar, idx)).padStart(2, '0')
                  )}
                </td>
                {/* Marka */}
                <td className={getOfferTableSeparatorClass('marka')} style={applyCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: TABLE_TEXT.helper,
                  whiteSpace: 'nowrap',
                  ...getOfferTableSeparatorStyle('marka'),
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satir.marka ? formatMarka(satir.marka) : '—'}
                </td>
                {/* Ürün Kodu — tek satır, içerik kadar geniş, kesilmez */}
                <td className={`product-code-cell ${getOfferTableSeparatorClass('urunKod') ?? ''}`.trim()} style={applyCellStyle({
                  padding: CELL_PAD,
                  fontSize: `${LINE_ITEM_METRICS.codeFontSizePx}px`,
                  fontWeight: 600,
                  color: TABLE_TEXT.code,
                  verticalAlign: 'middle',
                  letterSpacing: '-0.1px',
                  ...URUN_KOD_OVERFLOW,
                  ...getOfferTableSeparatorStyle('urunKod'),
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satir.urunKod || '—'}
                </td>
                {/* Açıklama — kalan tüm alan; kesilmez, önce tek satır, sığmazsa 2 satır */}
                <td className={`description-cell ${getOfferTableSeparatorClass('aciklama') ?? ''}`.trim()} style={applyCellStyle({
                  padding: CELL_PAD,
                  fontWeight: 400,
                  color: TABLE_TEXT.description,
                  verticalAlign: 'middle',
                  ...ACIKLAMA_OVERFLOW,
                  ...getOfferTableSeparatorStyle('aciklama'),
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  <DescText text={satir.aciklama ?? ''} />
                </td>
                {/* Miktar */}
                <td className={getOfferTableSeparatorClass('miktar')} style={applyCellStyle({
                  padding: CELL_PAD,
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: TABLE_TEXT.numeric,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  ...getOfferTableSeparatorStyle('miktar'),
                  ...rcCell('mid', idx, undefined, setGroupPos),
                  // frame-close artık teslimat kolonunda — burada kaldırıldı
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
                  ) : '—'}
                </td>
                {/* Para Birimi — satirBazli'da etiket. Set alt kalemlerinde
                    çerçevenin sağ kapanış noktası: birimFiyat/toplam/teslimat
                    çerçeve dışına alındığından buraya sağ kenar + alt köşe radius. */}
                <td className={getOfferTableSeparatorClass('paraBirimi')} style={applyCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: TABLE_TEXT.helper,
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  ...getOfferTableSeparatorStyle('paraBirimi'),
                  ...rcCell('mid', idx, undefined, setGroupPos),
                  // frame-close artık teslimat kolonunda — burada kaldırıldı
                })}>
                  {satirBazliParaBirimi ? PARA_BIRIMI_ETIKETI[satirPb] : ''}
                </td>
                {/* Birim Fiyat — alt kalemde tamamen boş; set parent'ta merdiven basamağı. */}
                <td className={`${getOfferTableSeparatorClass('birimFiyat') ?? ''} ${getSetStepClass(satir.setAltKalem, setGroupPos)}`.trim() || undefined} style={applyCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: TABLE_TEXT.numeric,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  ...getOfferTableSeparatorStyle('birimFiyat'),
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satir.setAltKalem ? '' : (() => {
                    const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                    return Math.abs(nihai) >= 0.005 ? formatDisplayNumber(nihai, 2, 2) : '—';
                  })()}
                </td>
                {/* Toplam — alt kalemde tamamen boş; set parent'ta merdiven basamağı. */}
                <td className={`${getOfferTableSeparatorClass('toplam') ?? ''} ${getSetStepClass(satir.setAltKalem, setGroupPos)}`.trim() || undefined} style={applyCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: TABLE_TEXT.numeric,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  ...getOfferTableSeparatorStyle('toplam'),
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satir.setAltKalem ? '' : (Math.abs(satir.satirToplami) >= 0.005 ? formatDisplayNumber(satir.satirToplami, 2, 2) : '—')}
                </td>
                {/* Teslimat — alt kalemde tamamen boş; set parent'ta merdiven basamağı. */}
                <td className={`${getOfferTableSeparatorClass('teslimat') ?? ''} ${getSetStepClass(satir.setAltKalem, setGroupPos)}`.trim() || undefined} style={applyCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: `${LINE_ITEM_METRICS.deliveryFontSizePx}px`,
                  color: TABLE_TEXT.passive,
                  whiteSpace: 'nowrap',
                  lineHeight: LINE_ITEM_METRICS.deliveryLineHeight,
                  ...getOfferTableSeparatorStyle('teslimat'),
                  ...rcCell('last', idx, undefined, setGroupPos),
                })}>
                  {satir.setAltKalem ? '' : (satir.teslimTarihi || '—')}
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

      {/* ══ TOPLAM ALANI ════════════════════════════════════════ */}
      {/* Genel Toplam — her iki modda da tablonun hemen altında, sağa hizalı.
         Siparişi Veren'den tamamen bağımsız; bağımsız blok olarak konumlanır. */}
      <div id="pdf-totals-block">
      {/* Smart fallback: toggle açık ama tüm satırlar tek tip ise tek
          TotalsCard. Toggle açıkken hesap satır bazlı yapılır → kullanilanParaKartlari[0]
          doğru veri kaynağı; toggle kapalıyken belge default totals doğru. */}
      {!efektifSatirBazliParaBirimi(teklif) ? (() => {
        const tek = kullanilanParaKartlari[0];
        const useKart = satirBazliParaBirimi && !!tek;
        return (
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          marginTop: '14px', marginBottom: '0',
          tableLayout: 'fixed', borderLeft: 'none', borderRight: 'none',
          printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', ...noBreak,
        } as React.CSSProperties}>
          <colgroup>
            <col style={{ width: '56%' }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td style={{ borderTop: 'none', borderBottom: 'none' }} />
              <td style={{ padding: 0, borderTop: 'none', borderBottom: 'none', verticalAlign: 'top' }}>
                <TotalsCard
                  araToplam={useKart ? tek.araToplam : araToplam}
                  iskontoOrani={iskontoOrani}
                  iskontoTutar={useKart ? tek.iskontoTutar : iskontoTutar}
                  kdvOrani={kdvOrani}
                  kdvTutar={useKart ? tek.kdvTutar : kdvTutar}
                  genelToplam={useKart ? tek.total : genelToplam}
                  paraBirimi={useKart ? tek.pb : teklif.paraBirimi}
                  variant="dark"
                  amountRightOffsetPx={computeTotalsAmountRightOffset(teklif.satirlar, false)}
                />
              </td>
            </tr>
          </tbody>
        </table>
        );
      })() : (
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
          {(() => {
            const kartlar  = kullanilanParaKartlari;
            const KART_W   = 220;
            const KART_GAP = 10;

            return (
              <tr>
                <td colSpan={2} style={{ padding: '6px 10px 8px', borderBottom: 'none' }}>
                  {/* Outer wrapper kaldırıldı — kartlar direkt sayfa zemininde,
                      "Genel Toplamlar / Grand Total" başlığı silindi.            */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    justifyContent: kartlar.length >= 3 ? 'flex-start' : 'flex-end',
                    alignItems: 'flex-start',
                    gap: `${KART_GAP}px`,
                  }}>
                    {/* Çoklu para birimi — her biri için TotalsCard (tek tip
                        modunda kullanılan ile birebir aynı görünüm). */}
                    {kartlar.map((item) => (
                      <div key={item.pb} style={{
                        width:    `${KART_W}px`,
                        minWidth: `${KART_W}px`,
                        maxWidth: `${KART_W}px`,
                        flexShrink: 0,
                      }}>
                        <TotalsCard
                          araToplam={item.araToplam}
                          iskontoOrani={iskontoOrani}
                          iskontoTutar={item.iskontoTutar}
                          kdvOrani={kdvOrani}
                          kdvTutar={item.kdvTutar}
                          genelToplam={item.total}
                          paraBirimi={item.pb}
                          variant="dark"
                        />
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })()}
        </tbody>
      </table>
      )}
      </div>

      {/* ══ NOT ALANI — kontrol panelinden toggle ile yönetilir ══ */}
      {/* Editör ile birebir aynı flex layout: pagination yüksekliği bu     */}
      {/* DOM'dan ölçülür ve PDF'te de aynı görünür.                        */}
      {teklif.notlarGosterilsin && (
        <div
          id="pdf-notes-block"
          data-alan="notlar"
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
      )}

      {/* ══ KAŞE / İMZA + FOOTER ═════════════════════════════════ */}
      {/* pdf-bottom-block: PDF pipeline bu bloğun DOM pozisyonunu      */}
      {/* ölçer ve son sayfanın mutlak altına sabitler. İçerik alanı    */}
      {/* (flex:1) biter, bu blok her zaman sayfanın alt kısmında kalır.*/}
      </div>{/* içerik alanı sonu */}

      <div id="pdf-bottom-block">

        {/* ── SİPARİŞİ VEREN bloğu — Genel Toplam'dan bağımsız, tek başına ── */}
        <div id="pdf-signature-block" style={SIGNATURE_BLOCK_ROW_STYLE}>

          {/* SİPARİŞİ VEREN — sayfa genişliğinin %70'i, ferah iç boşluk */}
          <div style={{ flex: '0 0 70%', minWidth: 0, ...SIGNATURE_SECTION_STYLE }}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '18px' }}>

            {/* Sol: 2-satır dikey başlık — biraz büyük, daha ferah tracking */}
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

        {/* ── FOOTER (navy şerit) ── */}
        <div id="pdf-page-footer" style={FOOTER_BAR_STYLE}>
          <div>{firmaBilgi.ad}</div>
          <div style={{ fontSize: '8px', opacity: 0.7, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            Sayfa 1 / 1
          </div>
          <div>
            Teklif No: {teklif.teklifNo} &nbsp;|&nbsp; {formatDate(teklif.tarih)}
          </div>
        </div>

      </div>

    </div>
  );
}
