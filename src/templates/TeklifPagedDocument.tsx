import React from 'react';
import type { Teklif } from '../types';
import { formatDate, formatDisplayNumber, formatTitleCaseTr, formatCariAdi } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';
import { FinansalOzetKartIci } from '../components/FinansalOzetKartIci';
import { TotalsCard } from '../components/TotalsCard';
import type { TeklifPagePlan } from '../services/documentPagination';
import {
  ACIKLAMA_OVERFLOW,
  CELL_PAD,
  HEADER_SURFACE,
  DOCUMENT_BRAND,
  DOCUMENT_COLORS,
  DOCUMENT_PAGE,
  DOCUMENT_ROOT_STYLE,
  FOOTER_BAR_STYLE,
  HIGH_QUALITY_IMAGE_RENDERING,
  LINE_ITEM_METRICS,
  LOGO,
  LOGO_FILE_W,
  LOGO_OPT_H,
  LOGO_OPT_LEFT,
  LOGO_OPT_TOP,
  LOGO_OPT_W,
  NOTES_BOX_STYLE,
  PARA_BIRIMI_ETIKETI,
  PARTY_BODY_STYLE,
  PARTY_CARD_STYLE,
  PARTY_GRID_STYLE,
  PARTY_LABEL_STYLE,
  PARTY_NAME_STYLE,
  SETTINGS_CARD_STYLE,
  SETTINGS_EN_LABEL_STYLE,
  SETTINGS_GRID_STYLE,
  SETTINGS_LABEL_STYLE,
  SETTINGS_SEP_STYLE,
  SETTINGS_TR_LABEL_STYLE,
  SETTINGS_VALUE_STYLE,
  SIGNATURE_SECTION_STYLE,
  TABLE_HEAD_SUBLABEL_STYLE,
  TABLE_STYLE,
  TABLE_TITLE_STYLE,
  TableColgroup,
  URUN_KOD_OVERFLOW,
  buildSettingsItems,
  getTableHeadCellStyle,
  noBreak,
  rcCell,
  DescText,
  OFFER_TABLE_COLUMN_COUNT,
} from './teklifDocumentShared';

const C = DOCUMENT_COLORS;
const BRAND = DOCUMENT_BRAND;

interface TeklifPagedDocumentProps {
  teklif: Teklif;
  totals: TeklifToplam;
  pages: TeklifPagePlan[];
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

function FullHeaderBlock({ teklif }: { teklif: Teklif }) {
  const muhatapSatiri = teklif.contactName?.trim()
    ? `${formatTitleCaseTr(teklif.contactName.trim())} ${teklif.contactTitle === 'HANIM' ? 'Hanım' : 'Bey'}`
    : (teklif.cari.yetkiliKisi || null);

  return (
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
                imageRendering: HIGH_QUALITY_IMAGE_RENDERING,
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact',
              }}
            />
          </div>
        </div>
        <div style={{ flex: '0 0 31%', maxWidth: '31%', paddingRight: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <div style={{ fontWeight: 800, fontSize: '11.5px', color: C.navy, lineHeight: '1.25', letterSpacing: '-0.012em' }}>
            MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik<br />
            San. Tic. Ltd. Şti.
          </div>
          <div style={{ fontSize: '9.2px', lineHeight: '1.35', color: C.textSoft, letterSpacing: '0.01em' }}>
            Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv.<br />
            No:252/D Melikgazi / KAYSERİ
          </div>
        </div>
        <div style={{ flex: '0 0 32%', maxWidth: '32%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', boxSizing: 'border-box' }}>
          <div style={{ width: '202px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', boxSizing: 'border-box' }}>
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
              <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.8px', color: BRAND.text }}>TEKLİF</span>
              <span style={{ fontSize: '10.4px', color: BRAND.textSub, letterSpacing: '0.02em' }}>/ Quotation</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <colgroup><col style={{ width: '42%' }} /><col style={{ width: '58%' }} /></colgroup>
              <tbody>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '2px 0 1px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Teklif No</td>
                  <td style={{ fontSize: '12.1px', fontWeight: 800, color: C.navy, padding: '2px 0 1px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>
                    {teklif.teklifNo}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Tarih</td>
                  <td style={{ fontSize: '10.9px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDate(teklif.tarih)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: 0, lineHeight: 1.2, letterSpacing: '0.04em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '10px', fontWeight: 400, color: C.textSoft, padding: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {teklif.hazirlayanAdSoyad || 'MEBA Mekanik'}
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
          <div style={PARTY_NAME_STYLE}>MEBA Mekanik Ltd. Şti.</div>
          <div style={PARTY_BODY_STYLE}>Tel: {formatPhone('03525020780')}<br />www.mebamekanik.com</div>
        </div>
        <div style={PARTY_CARD_STYLE}>
          <div style={PARTY_LABEL_STYLE}>Alıcı <span style={{ fontWeight: 400, opacity: 0.6 }}>/ To</span></div>
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
              <div>
                VKN: {teklif.cari.vergiNo}
                {teklif.cari.vergiDairesi && <span> &nbsp;-&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}
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

      <div style={SETTINGS_GRID_STYLE}>
        {buildSettingsItems(teklif, teklif.satirBazliParaBirimi ?? false).map((item, i) => (
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
              { label: '#', sub: '', align: 'center' as const },
              { label: 'Marka', sub: 'Brand', align: 'center' as const },
              { label: 'Ürün Kodu', sub: 'Item No', align: 'left' as const },
              { label: 'Açıklama', sub: 'Description', align: 'left' as const },
              { label: 'Miktar', sub: 'Qty', align: 'left' as const },
              satirBazliParaBirimi
                ? { label: 'Para Birimi', sub: 'Currency', align: 'center' as const }
                : { label: '',            sub: '',         align: 'center' as const },
              { label: 'Birim Fiyat', sub: 'Unit Price', align: 'right' as const },
              { label: 'Toplam', sub: 'Total', align: 'right' as const },
              { label: 'Teslimat', sub: 'Delivery', align: 'center' as const },
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
            <td colSpan={OFFER_TABLE_COLUMN_COUNT} style={{ height: '3px', padding: 0, border: 'none', background: 'transparent' }} />
          </tr>
          {satirlar.map((satir, localIndex) => {
            const idx = rowStart + localIndex;
            const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi);

            return (
              <tr key={satir.id} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: C.textMuted, whiteSpace: 'nowrap', ...rcCell('first', idx) }}>
                  {String(idx + 1).padStart(2, '0')}
                </td>
                <td style={{ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'nowrap', ...rcCell('mid', idx) }}>
                  {satir.marka || '-'}
                </td>
                <td className="product-code-cell" style={{ padding: CELL_PAD, fontSize: `${LINE_ITEM_METRICS.codeFontSizePx}px`, fontWeight: 600, color: C.accent, verticalAlign: 'middle', letterSpacing: '-0.1px', ...URUN_KOD_OVERFLOW, ...rcCell('mid', idx) }}>
                  {satir.urunKod || '-'}
                </td>
                <td className="description-cell" style={{ padding: CELL_PAD, fontWeight: 400, color: C.textMid, verticalAlign: 'middle', ...ACIKLAMA_OVERFLOW, ...rcCell('mid', idx) }}>
                  <DescText text={satir.aciklama ?? ''} />
                </td>
                <td style={{ padding: CELL_PAD, verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...rcCell('mid', idx) }}>
                  {satir.miktar !== 0 ? (
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 0 }}>
                      <span style={{ flex: '0 0 58%', minWidth: 0, textAlign: 'left', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {formatDisplayNumber(satir.miktar, 0, 4)}
                      </span>
                      <span style={{ flex: '1 1 0', minWidth: 0, textAlign: 'right', opacity: 0.6, fontSize: `${LINE_ITEM_METRICS.baseFontSizePx * LINE_ITEM_METRICS.quantityUnitScale}px`, paddingLeft: '8px', whiteSpace: 'nowrap' }}>
                        {/^adet$/i.test(satir.birim?.trim() ?? '') || !satir.birim ? 'Ad.' : satir.birim}
                      </span>
                    </div>
                  ) : '-'}
                </td>
                <td style={{ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'nowrap', fontWeight: 700, letterSpacing: '0.03em', ...rcCell('mid', idx) }}>
                  {satirBazliParaBirimi ? PARA_BIRIMI_ETIKETI[satirPb] : ''}
                </td>
                <td style={{ padding: CELL_PAD, textAlign: 'right', verticalAlign: 'middle', fontSize: '11px', color: C.textMid, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...rcCell('mid', idx) }}>
                  {(() => {
                    const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                    return nihai !== 0 ? formatDisplayNumber(nihai, 2, 2) : '-';
                  })()}
                </td>
                <td style={{ padding: CELL_PAD, textAlign: 'right', verticalAlign: 'middle', fontSize: '11px', fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...rcCell('mid', idx) }}>
                  {satir.satirToplami !== 0 ? formatDisplayNumber(satir.satirToplami, 2, 2) : '-'}
                </td>
                <td style={{ padding: CELL_PAD, textAlign: 'center', verticalAlign: 'middle', fontSize: `${LINE_ITEM_METRICS.deliveryFontSizePx}px`, color: C.textSoft, whiteSpace: 'nowrap', lineHeight: LINE_ITEM_METRICS.deliveryLineHeight, ...rcCell('last', idx) }}>
                  {satir.teslimTarihi || '-'}
                </td>
              </tr>
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

  // Single-currency: kart kalem tablosunun "Toplam" kolonu ile aynı sağ
  // kenara hizalanır. Bunun için tablo aynı TableColgroup'u kullanır;
  // kart aciklama..toplam (cols 4-8) colspan'ında durur, teslimat kolonu
  // boş kalır → kart sağı = "Toplam" sütununun sağı.
  if (!satirBazliParaBirimi) {
    return (
      <div style={{ ...noBreak }}>
        <table style={{
          ...TABLE_STYLE,
          marginTop: '4px',
          marginBottom: '14px',
          ...noBreak,
        } as React.CSSProperties}>
          <TableColgroup satirBazliParaBirimi={false} teklifSatirlari={teklif.satirlar} />
          <tbody>
            <tr>
              <td colSpan={3} style={{ padding: 0, borderTop: 'none', borderBottom: 'none' }} />
              <td colSpan={5} style={{ padding: '8px 0 10px 0', verticalAlign: 'top', borderTop: 'none', borderBottom: 'none' }}>
                <TotalsCard
                  araToplam={araToplam}
                  iskontoOrani={iskontoOrani}
                  iskontoTutar={iskontoTutar}
                  kdvOrani={kdvOrani}
                  kdvTutar={kdvTutar}
                  genelToplam={genelToplam}
                  paraBirimi={teklif.paraBirimi}
                  variant="light"
                />
              </td>
              <td style={{ padding: 0, borderTop: 'none', borderBottom: 'none' }} />
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // satirBazli=true: çoklu para birimi kartları (mevcut yapı)
  return (
    <div style={{ ...noBreak }}>
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
                <div style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: HEADER_SURFACE.textLabel, lineHeight: 1, paddingBottom: '6px', paddingLeft: '2px' }}>
                  Genel Toplamlar / Grand Total
                </div>
                <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: kullanilanParaKartlari.length >= 3 ? 'flex-start' : 'flex-end', alignItems: 'flex-start', gap: '8px' }}>
                  {kullanilanParaKartlari.map((item) => (
                    <div key={item.pb} style={{ width: '220px', minWidth: '220px', height: '86px', flexShrink: 0, position: 'relative', boxSizing: 'border-box', borderRadius: '12px', border: `0.75px solid ${C.border}`, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(26,43,66,0.05)' }}>
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
        </tbody>
      </table>
    </div>
  );
}

function NotesBlock({ teklif }: { teklif: Teklif }) {
  if (!teklif.notlar) return null;

  return (
    <div style={{ ...NOTES_BOX_STYLE, ...noBreak }}>
      <strong style={{ color: C.navy }}>Notlar / Notes:&nbsp;</strong>
      <span style={{ color: C.textMid }}>{teklif.notlar}</span>
    </div>
  );
}

function SignatureBlock() {
  return (
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

export default function TeklifPagedDocument({ teklif, totals, pages }: TeklifPagedDocumentProps) {
  return (
    <div>
      {pages.map((page) => (
        <div
          key={page.pageNumber}
          data-pdf-page="true"
          style={{
            ...DOCUMENT_ROOT_STYLE,
            height: `${DOCUMENT_PAGE.heightMm}mm`,
            minHeight: `${DOCUMENT_PAGE.heightMm}mm`,
            overflow: 'hidden',
            marginBottom: page.pageNumber < pages.length ? '6mm' : 0,
          } as React.CSSProperties}
        >
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ minHeight: 0 }}>
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
        </div>
      ))}
    </div>
  );
}
