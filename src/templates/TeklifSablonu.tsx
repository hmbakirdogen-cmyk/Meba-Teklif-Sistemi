import React from 'react';
import type { Teklif } from '../types';
import { formatDate, formatDisplayNumber, formatTitleCaseTr, formatCariAdi } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';
import { FinansalOzetKartIci } from '../components/FinansalOzetKartIci';
import { TotalsCard } from '../components/TotalsCard';
import {
  ACIKLAMA_OVERFLOW,
  CELL_PAD,
  URUN_KOD_OVERFLOW,
  DOCUMENT_BRAND,
  DOCUMENT_COLORS,
  DOCUMENT_ROOT_STYLE,
  FOOTER_BAR_STYLE,
  HIGH_QUALITY_IMAGE_RENDERING,
  LINE_ITEM_METRICS,
  LOGO,
  LOGO_FILE_W,
  LOGO_OPT_H,
  LOGO_OPT_W,
  LOGO_OPT_TOP,
  LOGO_OPT_LEFT,
  noBreak,
  NOTES_BOX_STYLE,
  OFFER_TABLE_ROW_GAP_PX,
  PARA_BIRIMI_ETIKETI,
  PARTY_GRID_STYLE,
  PARTY_CARD_STYLE,
  PARTY_LABEL_STYLE,
  PARTY_NAME_STYLE,
  PARTY_BODY_STYLE,
  rcCell,
  computeSetGroupPos,
  SETTINGS_GRID_STYLE,
  SETTINGS_CARD_STYLE,
  SETTINGS_LABEL_STYLE,
  SETTINGS_TR_LABEL_STYLE,
  SETTINGS_SEP_STYLE,
  SETTINGS_EN_LABEL_STYLE,
  SETTINGS_VALUE_STYLE,
  SIGNATURE_SECTION_STYLE,
  TABLE_HEAD_SUBLABEL_STYLE,
  TABLE_STYLE,
  TABLE_TITLE_STYLE,
  TableColgroup,
  computeTotalsAmountRightOffset,
  buildSettingsItems,
  getTableHeadCellStyle,
  DescText,
  OFFER_TABLE_COLUMN_COUNT,
} from './teklifDocumentShared';

const C = DOCUMENT_COLORS;
const BRAND = DOCUMENT_BRAND;

const SATIR_GRUP_GORSEL: Record<NonNullable<Teklif['satirlar'][number]['grupRenk']>, { bg: string; border: string; pattern: string }> = {
  amber: {
    bg: '#fff8eb',
    border: '#f4bf75',
    pattern: 'none',
  },
  mint: {
    bg: '#eefcf6',
    border: '#92ddbf',
    pattern: 'none',
  },
  sky: {
    bg: '#eef5ff',
    border: '#9ec1f7',
    pattern: 'none',
  },
  lavender: {
    bg: '#f5f0ff',
    border: '#c5aff6',
    pattern: 'none',
  },
};

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
  // S: optH = LOGO_OPT_H × S ≈ metin bloğu yüksekliği
  // Metin bloğu: 3 satır (10.4px×1.25 + 9px×1.3 × 2) + 2×gap(2px) ≈ 40.4px
  // LOGO_OPT_H (FILE_HEIGHT=128) ≈ 84.58px → S = 40.4 / 84.58 ≈ 0.478
  const S = 0.478;
  const logoW  = LOGO_FILE_W      * S;
  const logoH  = LOGO.FILE_HEIGHT * S;
  const optW   = LOGO_OPT_W       * S;
  const optH   = LOGO_OPT_H       * S;
  const optTop = LOGO_OPT_TOP     * S;
  const optLeft= LOGO_OPT_LEFT    * S;

  return (
    <div style={{
      width: '210mm',
      boxSizing: 'border-box',
      padding: '12mm 10mm 0',
      fontFamily: '"Inter","SF Pro Text",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
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
        {/* Mini logo — optik bounding box ile kırpılmış */}
        <div style={{
          position: 'relative',
          width: `${optW}px`,
          height: `${optH}px`,
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <img
            src="/logo-meba.png"
            alt="MEBA"
            style={{
              position: 'absolute',
              top:  `${optTop}px`,
              left: `${optLeft}px`,
              width:  `${logoW}px`,
              height: `${logoH}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              display: 'block',
              imageRendering:          HIGH_QUALITY_IMAGE_RENDERING,
              printColorAdjust:        'exact',
              WebkitPrintColorAdjust:  'exact',
            }}
          />
        </div>
        {/* MEBA firma bilgileri — müşteri bilgisi yok */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '10.4px', fontWeight: 800, color: C.navy, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
            MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik San. Tic. Ltd. Şti.
          </span>
          <span style={{ fontSize: '9px', color: C.textSoft, lineHeight: 1.3 }}>
            Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ
          </span>
          <span style={{ fontSize: '9px', color: C.textSoft, lineHeight: 1.3 }}>
            Tel: 0352 502 07 80 &nbsp;·&nbsp; info@mebamekanik.com &nbsp;·&nbsp; www.mebamekanik.com
          </span>
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
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;
  const satirBazliParaBirimi = teklif.satirBazliParaBirimi ?? false;
  const kullanilanParaKartlari = hesaplamaMotoru.kullanilanParaBirimiKartlariniHesapla(
    teklif.satirlar, teklif.paraBirimi, kdvOrani, iskontoOrani,
  );

  // Muhatap satırı: isim varsa title-case + hitap, yoksa yetkiliKisi
  const muhatapSatiri = teklif.contactName?.trim()
    ? `${formatTitleCaseTr(teklif.contactName.trim())} ${teklif.contactTitle === 'HANIM' ? 'Hanım' : 'Bey'}`
    : (teklif.cari.yetkiliKisi || null);

  return (
    <div
      id="teklif-sablon"
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
      {/* Referans: LOGO_OPT_H — logonun gerçek görsel yüksekliği.  */}
      {/* alignItems:'stretch' → 3 sütun da bu yüksekliğe gerilir.  */}
      {/* Sütun 2: space-between → isim üst / adres alt sınıra oturur*/}
      {/* Sütun 3: space-between → badge üst / tablo alt sınıra oturur*/}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        width: '100%',
        height: `${LOGO_OPT_H}px`,
        marginBottom: '10px',
        ...noBreak,
      }}>

        {/* ── Sütun 1: Logo ──────────────────────────────────────── */}
        {/* Optik clipping wrapper: PNG beyaz boşlukları kesilir,    */}
        {/* sadece MEBA harfleri + badge görünür.                     */}
        {/* Col genişliği: 37% × ~718px = ~266px − 8px pad = 258px   */}
        {/* LOGO_OPT_W (FILE_HEIGHT=128) ≈ 250px < 258px ✓           */}
        <div style={{
          flex: '0 0 37%',
          maxWidth: '37%',
          paddingRight: '8px',
          boxSizing: 'border-box',
          lineHeight: 0,
        }}>
          <div style={{
            position: 'relative',
            width: `${LOGO_OPT_W}px`,
            height: `${LOGO_OPT_H}px`,
            overflow: 'hidden',
          }}>
            <img
              src="/logo-meba.png"
              alt="MEBA Mekanik"
              style={{
                position: 'absolute',
                top: `${LOGO_OPT_TOP}px`,
                left: `${LOGO_OPT_LEFT}px`,
                width: `${LOGO_FILE_W}px`,
                height: `${LOGO.FILE_HEIGHT}px`,
                maxWidth: 'none',
                maxHeight: 'none',
                display: 'block',
                imageRendering:         HIGH_QUALITY_IMAGE_RENDERING,
                printColorAdjust:       'exact',
                WebkitPrintColorAdjust: 'exact',
              }}
            />
          </div>
        </div>

        {/* ── Sütun 2: Firma bilgileri ────────────────────────────── */}
        {/* space-between → isim grubu logo üst sınırında,            */}
        {/* adres bloğu logo alt sınırında.                           */}
        <div style={{
          flex: '0 0 31%',
          maxWidth: '31%',
          paddingRight: '10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}>
          {/* Firma isim grubu — logonun üst sınırına oturur */}
          <div style={{ fontWeight: 800, fontSize: '11.5px', color: C.navy, lineHeight: '1.25', letterSpacing: '-0.012em' }}>
            MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik<br />
            San. Tic. Ltd. Şti.
          </div>
          {/* Adres — logonun alt sınırına oturur */}
          <div style={{ fontSize: '9.2px', lineHeight: '1.35', color: C.textSoft, letterSpacing: '0.01em' }}>
            Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv.<br />
            No:252/D Melikgazi / KAYSERİ
          </div>
        </div>

        {/* ── Sütun 3: Teklif bilgi bloğu ────────────────────────── */}
        {/* 202px anchor: badge üstte (logo üst), tablo altta (logo   */}
        {/* alt). space-between her ikisini sınırlara sabitler.        */}
        {/* 32% × ~718px = 229px > 202px ✓                           */}
        <div style={{
          flex: '0 0 32%',
          maxWidth: '32%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: '202px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            // overflow: visible → descender'lı harflerin (ğ/ç/y/p/g) alt
            // yarısı LOGO_OPT_H'a sıkışıp kırpılmasın.
            overflow: 'visible',
            boxSizing: 'border-box',
          }}>
            {/* TEKLİF başlık etiketi — logo üst sınırına oturur */}
            <div style={{
              background: BRAND.gradient,
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
              padding: '5px 14px 6px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              lineHeight: 1.2,
              borderRadius: '9px',
              border: `1px solid ${BRAND.border}`,
              boxShadow: BRAND.shadowSm,
            }}>
              <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.8px', color: BRAND.text }}>
                TEKLİF
              </span>
              <span style={{ fontSize: '10.4px', color: BRAND.textSub, letterSpacing: '0.02em' }}>
                / Quotation
              </span>
            </div>
            {/* Teklif meta tablosu — logo alt sınırına oturur         */}
            {/* Hiyerarşi: Teklif No (güçlü) > Tarih (orta) > Hazırlayan (sade) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '42%' }} />
                <col style={{ width: '58%' }} />
              </colgroup>
              <tbody>
                {/* lineHeight 1.3 → descender'lı harfler (ğ/y/p/g/ç) için
                     yeterli alt nefes payı; html2canvas yakalamasında alt
                     yarısı kırpılmaz. */}
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '2px 0 1px 0', lineHeight: 1.3, letterSpacing: '0.04em' }}>Teklif No</td>
                  <td style={{ fontSize: '12.1px', fontWeight: 800, color: C.navy, padding: '2px 0 1px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>
                    {teklif.teklifNo}
                  </td>
                </tr>
                {/* ── Tarih — secondary ── */}
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.04em' }}>Tarih</td>
                  <td style={{ fontSize: '10.9px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDate(teklif.tarih)}
                  </td>
                </tr>
                {/* ── Hazırlayan — tertiary ── */}
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.3, letterSpacing: '0.04em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '10px', fontWeight: 400, color: C.textSoft, padding: '0 0 1px 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {teklif.hazirlayanAdSoyad || 'MEBA Mekanik'}
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
            MEBA Mekanik Ltd. Şti.
          </div>
          <div style={PARTY_BODY_STYLE}>
            Tel: {formatPhone('03525020780')}<br />
            www.mebamekanik.com
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
              <div style={{ fontWeight: '500', marginBottom: '1px' }}>Sayın {muhatapSatiri}</div>
            )}
            {(teklif.cari.telefon || teklif.cari.ePosta) && (
              <div>
                {teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>}
                {teklif.cari.telefon && teklif.cari.ePosta && <span> &nbsp;|&nbsp; </span>}
                {teklif.cari.ePosta && <span>{teklif.cari.ePosta}</span>}
              </div>
            )}
            {teklif.cari.vergiNo && (
              <div>
                VKN: {teklif.cari.vergiNo}
                {teklif.cari.vergiDairesi && <span> &nbsp;—&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}
              </div>
            )}
            {teklif.cari.adres && (
              <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {teklif.cari.adres}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ ÖDEME / PARA / KDV / KUR ════════════════════════════ */}
      <div data-alan="ayarlar" style={SETTINGS_GRID_STYLE}>
        {buildSettingsItems(teklif, satirBazliParaBirimi).map((item, i) => (
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
              { label: '#',           sub: '',            align: 'center' as const },
              { label: 'Marka',       sub: 'Brand',       align: 'center' as const },
              { label: 'Ürün Kodu',   sub: 'Item No',     align: 'left'   as const },
              { label: 'Açıklama',    sub: 'Description', align: 'left'   as const },
              { label: 'Miktar',      sub: 'Qty',         align: 'left'   as const },
              satirBazliParaBirimi
                ? { label: 'Para Birimi', sub: 'Currency', align: 'center' as const }
                : { label: '',            sub: '',         align: 'center' as const },
              { label: 'Birim Fiyat', sub: 'Unit Price',  align: 'right'  as const },
              { label: 'Toplam',      sub: 'Total',       align: 'right'  as const },
              { label: 'Teslimat',    sub: 'Delivery',    align: 'center' as const },
            ].map((col, i) => (
              <th
                key={i}
                style={getTableHeadCellStyle(col.align)}
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
            const grupGorsel = satir.grupRenk ? SATIR_GRUP_GORSEL[satir.grupRenk] : null;
            const setGroupPos = computeSetGroupPos(teklif.satirlar, idx);
            // Spacer: bir sonraki satır farklı bir gruba/satıra ait ise 2px hava;
            // grup içinde değilse de aynen 2px (eski border-spacing davranışı).
            const isLast = idx === teklif.satirlar.length - 1;
            const renderSpacer = !isLast && setGroupPos !== 'top' && setGroupPos !== 'middle';
            const withGroupCellStyle = (style: React.CSSProperties): React.CSSProperties => {
              if (!grupGorsel) return style;
              return {
                ...style,
                backgroundColor: grupGorsel.bg,
                backgroundImage: grupGorsel.pattern,
                borderTopColor: grupGorsel.border,
                borderBottomColor: grupGorsel.border,
                borderLeftColor: grupGorsel.border,
                borderRightColor: grupGorsel.border,
              };
            };
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
                <td style={withGroupCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: C.textMuted,
                  whiteSpace: 'nowrap',
                  ...rcCell('first', idx, undefined, setGroupPos),
                })}>
                  {String(idx + 1).padStart(2, '0')}
                </td>
                {/* Marka */}
                <td style={withGroupCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: C.textMid,
                  whiteSpace: 'nowrap',
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satir.marka || '—'}
                </td>
                {/* Ürün Kodu — tek satır, içerik kadar geniş, kesilmez */}
                <td className="product-code-cell" style={withGroupCellStyle({
                  padding: CELL_PAD,
                  fontSize: `${LINE_ITEM_METRICS.codeFontSizePx}px`,
                  fontWeight: 600,
                  color: C.accent,
                  verticalAlign: 'middle',
                  letterSpacing: '-0.1px',
                  ...URUN_KOD_OVERFLOW,
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satir.urunKod || '—'}
                </td>
                {/* Açıklama — kalan tüm alan; kesilmez, önce tek satır, sığmazsa 2 satır */}
                <td className="description-cell" style={withGroupCellStyle({
                  padding: CELL_PAD,
                  fontWeight: 400,
                  color: C.textMid,
                  verticalAlign: 'middle',
                  ...ACIKLAMA_OVERFLOW,
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  <DescText text={satir.aciklama ?? ''} />
                </td>
                {/* Miktar */}
                <td style={withGroupCellStyle({
                  padding: CELL_PAD,
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: C.textMid,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satir.miktar !== 0 ? (
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 0 }}>
                      <span style={{ flex: '0 0 58%', minWidth: 0, textAlign: 'left', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {formatDisplayNumber(satir.miktar, 0, 4)}
                      </span>
                      <span style={{ flex: '1 1 0', minWidth: 0, textAlign: 'right', opacity: 0.6, fontSize: `${LINE_ITEM_METRICS.baseFontSizePx * LINE_ITEM_METRICS.quantityUnitScale}px`, paddingLeft: '8px', whiteSpace: 'nowrap' }}>
                        {/^adet$/i.test(satir.birim?.trim() ?? '') || !satir.birim ? 'Ad.' : satir.birim}
                      </span>
                    </div>
                  ) : '—'}
                </td>
                {/* Para Birimi (boş hücre değilse satirBazli'da etiket) */}
                <td style={withGroupCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: C.textMid,
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satirBazliParaBirimi ? PARA_BIRIMI_ETIKETI[satirPb] : ''}
                </td>
                {/* Birim Fiyat — alt kalem için boş, aksi halde değer */}
                <td style={withGroupCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: C.textMid,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satir.setAltKalem ? '' : (() => {
                    const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                    return nihai !== 0 ? formatDisplayNumber(nihai, 2, 2) : '—';
                  })()}
                </td>
                {/* Toplam — alt kalem için boş */}
                <td style={withGroupCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: C.navy,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  ...rcCell('mid', idx, undefined, setGroupPos),
                })}>
                  {satir.setAltKalem ? '' : (satir.satirToplami !== 0 ? formatDisplayNumber(satir.satirToplami, 2, 2) : '—')}
                </td>
                {/* Teslimat — son hücre, çerçevenin sağ kenarı */}
                <td style={withGroupCellStyle({
                  padding: CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: `${LINE_ITEM_METRICS.deliveryFontSizePx}px`,
                  color: C.textSoft,
                  whiteSpace: 'nowrap',
                  lineHeight: LINE_ITEM_METRICS.deliveryLineHeight,
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
      {/* Çerçeve eski 56%/44% yapıda (sayfa sağına kadar uzanır); rakamlar
         içeride amountRightOffsetPx ile "Toplam" kolonu değer X'ine hizalı. */}
      <div id="pdf-totals-block">
      {!satirBazliParaBirimi ? (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '4px',
          marginBottom: '14px',
          tableLayout: 'fixed',
          borderLeft: 'none',
          borderRight: 'none',
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
                  variant="dark"
                  amountRightOffsetPx={computeTotalsAmountRightOffset(teklif.satirlar, false)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '10px',
        marginBottom: '14px',
        tableLayout: 'fixed',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
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
            const KART_H   = 86;
            const KART_GAP = 8;

            return (
              <tr>
                <td colSpan={2} style={{ padding: '8px 10px 10px', borderBottom: 'none' }}>
                  {/* Dış çerçeve — sabit yapı, kart sayısına göre değişmez */}
                  <div style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: `${KART_H + 26}px`,
                    border: '0.75px solid #1A2B42',
                    borderRadius: '8px',
                    background: 'linear-gradient(180deg, #1E3350 0%, #152740 55%, #0F1D30 100%)',
                    padding: '7px 8px 8px',
                    boxShadow: '0 2px 8px rgba(15,25,40,0.10)',
                    printColorAdjust: 'exact',
                    WebkitPrintColorAdjust: 'exact',
                  } as React.CSSProperties}>
                    {/* Başlık */}
                    <div style={{
                      fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.13em',
                      textTransform: 'uppercase', color: BRAND.textLabel,
                      lineHeight: 1, paddingBottom: '6px', paddingLeft: '2px',
                    }}>
                      Genel Toplamlar / Grand Total
                    </div>

                    {/* Kart alanı
                        • overflow yok — son kartın kesilmesini önler
                        • 3 kart → flex-start | 1-2 kart → flex-end (sağa yaslı) */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'nowrap',
                      justifyContent: kartlar.length >= 3 ? 'flex-start' : 'flex-end',
                      alignItems: 'flex-start',
                      gap: `${KART_GAP}px`,
                    }}>
                      {kartlar.map((item) => (
                        <div key={item.pb} style={{
                          width:    `${KART_W}px`,
                          minWidth: `${KART_W}px`,
                          maxWidth: `${KART_W}px`,
                          height:    `${KART_H}px`,
                          minHeight: `${KART_H}px`,
                          maxHeight: `${KART_H}px`,
                          flexShrink: 0,
                          position: 'relative',
                          boxSizing: 'border-box',
                          borderRadius: '12px',
                          border: '0.75px solid #E8E6E3',
                          background: '#FFFFFF',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          printColorAdjust: 'exact',
                          WebkitPrintColorAdjust: 'exact',
                        } as React.CSSProperties}>
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
                  </div>
                </td>
              </tr>
            );
          })()}
        </tbody>
      </table>
      )}
      </div>

      {/* ══ NOT ALANI ════════════════════════════════════════════ */}
      <div
        id="pdf-notes-block"
        data-alan="notlar"
        style={{
          ...NOTES_BOX_STYLE,
          minHeight: teklif.notlar ? undefined : 44,
          ...noBreak,
        }}
      >
        {teklif.notlar ? (
          <>
            <strong style={{ color: C.navy }}>Notlar / Notes:&nbsp;</strong>
            <span style={{ color: C.textMid }}>{teklif.notlar}</span>
          </>
        ) : null}
      </div>

      {/* ══ KAŞE / İMZA + FOOTER ═════════════════════════════════ */}
      {/* pdf-bottom-block: PDF pipeline bu bloğun DOM pozisyonunu      */}
      {/* ölçer ve son sayfanın mutlak altına sabitler. İçerik alanı    */}
      {/* (flex:1) biter, bu blok her zaman sayfanın alt kısmında kalır.*/}
      </div>{/* içerik alanı sonu */}

      <div id="pdf-bottom-block">

        {/* ── SİPARİŞİ VEREN — 2 sütunlu kompakt düzen ── */}
        <div id="pdf-signature-block" style={SIGNATURE_SECTION_STYLE}>
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
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ fontWeight: 500, color: C.sigPrimary }}>İsim</span>
                    <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                    <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Name</span>
                  </div>
                  <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.sigBorder}`, height: '30px', marginBottom: '12px' }} />
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ fontWeight: 500, color: C.sigPrimary }}>Tarih</span>
                    <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                    <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Date</span>
                  </div>
                  <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.sigBorder}`, height: '30px' }} />
                </div>
                <div style={{ flex: '1', fontSize: '11px', lineHeight: '1.45', paddingTop: '0' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ fontWeight: 500, color: C.sigPrimary }}>İmza</span>
                    <span style={{ fontSize: '8.5px', color: C.sigSecondary }}> / </span>
                    <span style={{ fontSize: '8px', fontWeight: 400, color: C.sigSecondary }}>Signature</span>
                  </div>
                  <div style={{ borderBottom: `1px solid ${C.sigBorder}`, height: '30px' }} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── FOOTER (navy şerit) ── */}
        <div id="pdf-page-footer" style={FOOTER_BAR_STYLE}>
          <div>MEBA Pnömatik Hidrolik Makina &nbsp;|&nbsp; KAYSERİ &nbsp;|&nbsp; info@mebamekanik.com</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>
            Teklif No: {teklif.teklifNo} &nbsp;|&nbsp; {formatDate(teklif.tarih)} &nbsp;|&nbsp; www.mebamekanik.com
          </div>
        </div>

      </div>

    </div>
  );
}
