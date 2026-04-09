import React from 'react';
import type { Teklif, ParaBirimi } from '../types';
import { formatCurrency, formatDate, formatTitleCaseTr } from '../utils/formatters';

const SEMBOL: Record<ParaBirimi, string> = { TRY: '₺', EUR: '€', USD: '$' };

// ── PDF Tasarım Sabitleri ─────────────────────────────────────────────────────
const C = {
  navy:       '#0f1f45',
  navyLight:  '#1a2f5e',
  navyBorder: '#1e3464',
  accent:     '#1a3a8f',
  border:     '#d0d7e4',
  borderSoft: '#e8edf4',
  rowAlt:     '#f2f5fb',
  text:       '#111827',
  textMid:    '#374151',
  textSoft:   '#4b5563',
  textMuted:  '#6b7280',
  white:      '#ffffff',
  bg:         '#fafbfd',
};

// Sütun genişlikleri — içerik bazlı otomatik boyutlandırma
// İçerik analizi (190mm kullanılabilir genişlik):
//   NO        : "01"–"99"           →  3%  ≈  5.7mm
//   Marka     : "FESTO"             →  8%  ≈ 15.2mm
//   Ürün Kodu : "CP96SDB80-200"     → 12%  ≈ 22.8mm
//   Açıklama  : açık metin          → 39%  ≈ 74.1mm  ← esnek, en geniş
//   Miktar    : "100 Adet"          →  7%  ≈ 13.3mm
//   Birim Fyt : "1.234,56"          → 12%  ≈ 22.8mm
//   Toplam    : "12.345,67"         → 12%  ≈ 22.8mm
//   Teslimat  : "2-3 Gün"           →  7%  ≈ 13.3mm
//                                    100%
const COL = {
  no:         '3%',
  marka:      '8%',
  urunKod:    '12%',
  aciklama:   '39%',
  miktar:     '7%',
  birimFiyat: '12%',
  toplam:     '12%',
  teslimat:   '7%',
};

const noBreak: React.CSSProperties = {
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
};
// ─────────────────────────────────────────────────────────────────────────────

interface TeklifSablonuProps {
  teklif: Teklif;
}

function temizleAciklama(text: string, urunKod: string): string {
  if (!text || !urunKod) return text;
  const idx = text.indexOf('(');
  if (idx === -1) return text;
  if (text.slice(idx + 1).includes(urunKod)) return text.slice(0, idx).trimEnd();
  return text;
}

/** Ortak colgroup — tablo hizalamayı garanti eder */
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

export default function TeklifSablonu({ teklif }: TeklifSablonuProps) {
  const sembol = SEMBOL[teklif.paraBirimi];

  // Muhatap satırı: isim varsa title-case + hitap, yoksa yetkiliKisi
  const muhatapSatiri = teklif.contactName?.trim()
    ? `${formatTitleCaseTr(teklif.contactName.trim())} ${teklif.contactTitle === 'HANIM' ? 'Hanım' : 'Bey'}`
    : (teklif.cari.yetkiliKisi || null);

  return (
    <div
      id="teklif-sablon"
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        backgroundColor: C.white,
        fontFamily: '"Arial", "Helvetica", sans-serif',
        fontSize: '10px',
        lineHeight: '1.45',
        color: C.text,
        boxSizing: 'border-box',
        padding: '9mm 10mm 8mm 10mm',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}
    >

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      {/* Grid: 31% logo | 37% şirket | 32% teklif bilgisi      */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '7px', ...noBreak }}>
        <colgroup>
          <col style={{ width: '31%' }} />
          <col style={{ width: '37%' }} />
          <col style={{ width: '32%' }} />
        </colgroup>
        <tbody>
          <tr>

            {/* Logo */}
            <td style={{ verticalAlign: 'middle', paddingRight: '12px' }}>
              <img
                src="/logo-meba.png"
                alt="MEBA Mekanik"
                style={{
                  maxHeight: '92px',
                  maxWidth: '100%',
                  width: 'auto',
                  height: 'auto',
                  display: 'block',
                  // auto → tarayıcı varsayılanı (bicubic), hem keskin hem doğal
                  // -webkit-optimize-contrast yapay kontrast artırır — kaldırıldı
                  imageRendering: 'auto',
                  // GPU composite layer → sub-piksel kenar artefaktlarını önler
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              />
            </td>

            {/* Şirket Bilgisi */}
            <td style={{ verticalAlign: 'top', paddingRight: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11px', color: C.navy, marginBottom: '2px', lineHeight: '1.35' }}>
                MEBA Pnömatik Hidrolik Makina Elektrik
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '9.5px', color: C.navy, marginBottom: '5px', lineHeight: '1.35' }}>
                Elektronik Mühendislik San. Tic. Ltd. Şti.
              </div>
              <div style={{ fontSize: '8.5px', lineHeight: '1.65', color: C.textSoft }}>
                Organize San. Bölgesi İnecik Mah. Fatih Sultan Mehmet Blv.<br />
                No:252/D Melikgazi, KAYSERİ / TÜRKİYE<br />
                T: +90 352 502 0780 &nbsp;|&nbsp; F: +90 352 502 0781
              </div>
            </td>

            {/* Teklif Bilgi Kutusu */}
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              {/* Teklif etiketi */}
              <div style={{
                backgroundColor: C.navy,
                color: C.white,
                padding: '5px 12px',
                marginBottom: '7px',
                display: 'inline-block',
                minWidth: '140px',
                textAlign: 'left',
              }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.5px' }}>
                  TEKLİF
                </span>
                <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.65)', marginLeft: '6px' }}>
                  / Quotation
                </span>
              </div>
              {/* Teklif meta */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <colgroup>
                  <col style={{ width: '42%' }} />
                  <col style={{ width: '58%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={{ fontSize: '8.5px', color: C.textMuted, paddingBottom: '3px' }}>Teklif No</td>
                    <td style={{ fontSize: '10px', fontWeight: 'bold', color: C.navy, paddingBottom: '3px', fontVariantNumeric: 'tabular-nums' }}>
                      {teklif.teklifNo}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: '8.5px', color: C.textMuted, paddingBottom: '3px' }}>Tarih</td>
                    <td style={{ fontSize: '9.5px', fontWeight: 'bold', color: C.text, paddingBottom: '3px' }}>
                      {formatDate(teklif.tarih)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: '8.5px', color: C.textMuted }}>Hazırlayan</td>
                    <td style={{ fontSize: '9.5px', fontWeight: 'bold', color: C.text }}>
                      {teklif.hazirlayanAdSoyad || 'MEBA Mekanik'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>

          </tr>
        </tbody>
      </table>

      {/* ══ GÖNDEREN / ALICI ════════════════════════════════════ */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: `1px solid ${C.border}`,
        marginBottom: '6px',
        ...noBreak,
      }}>
        <tbody>
          <tr>
            {/* Gönderen */}
            <td style={{
              width: '50%',
              padding: '8px 11px',
              verticalAlign: 'top',
              borderRight: `1px solid ${C.border}`,
            }}>
              <div style={{
                fontSize: '8px',
                fontWeight: 'bold',
                color: C.navy,
                letterSpacing: '0.9px',
                textTransform: 'uppercase',
                marginBottom: '5px',
              }}>
                Gönderen / From
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '10.5px', color: C.navy, marginBottom: '3px' }}>
                MEBA Mekanik Ltd. Şti.
              </div>
              <div style={{ fontSize: '9px', lineHeight: '1.65', color: C.textMid }}>
                Organize San. Bölgesi İnecik Mah.<br />
                Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ<br />
                VKN: 613 083 5945 &nbsp;—&nbsp; Mimarsinan V.D.<br />
                www.mebamekanik.com
              </div>
            </td>
            {/* Alıcı */}
            <td style={{
              width: '50%',
              padding: '8px 11px',
              verticalAlign: 'top',
            }}>
              <div style={{
                fontSize: '8px',
                fontWeight: 'bold',
                color: C.navy,
                letterSpacing: '0.9px',
                textTransform: 'uppercase',
                marginBottom: '5px',
              }}>
                Alıcı / To
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '11px', color: C.navy, marginBottom: '3px', lineHeight: '1.3' }}>
                {teklif.cari.firmaAdi}
              </div>
              <div style={{ fontSize: '9px', lineHeight: '1.65', color: C.textMid, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {muhatapSatiri && (
                  <div style={{ fontWeight: '500', marginBottom: '1px' }}>Sayın {muhatapSatiri}</div>
                )}
                {(teklif.cari.telefon || teklif.cari.ePosta) && (
                  <div>
                    {teklif.cari.telefon && <span>Tel: {teklif.cari.telefon}</span>}
                    {teklif.cari.telefon && teklif.cari.ePosta && <span> &nbsp;|&nbsp; </span>}
                    {teklif.cari.ePosta && <span>{teklif.cari.ePosta}</span>}
                  </div>
                )}
                {teklif.cari.adres && (
                  <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    {teklif.cari.adres}
                  </div>
                )}
                {teklif.cari.vergiNo && (
                  <div>
                    VKN: {teklif.cari.vergiNo}
                    {teklif.cari.vergiDairesi && <span> &nbsp;—&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}
                  </div>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══ ÖDEME / PARA / KDV / KUR ════════════════════════════ */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: `1px solid ${C.border}`,
        marginBottom: '7px',
        ...noBreak,
      }}>
        <tbody>
          <tr>
            {[
              { label: 'Para Birimi / Currency',  value: `${teklif.paraBirimi} (${sembol})` },
              { label: 'Ödeme Vadesi / Payment',  value: '45 Gün Net' },
              { label: 'KDV Oranı / VAT',         value: teklif.kdvOrani > 0 ? `%${teklif.kdvOrani}` : 'Hariç' },
              { label: 'Kur / Exchange Rate',     value: 'TCMB Fatura' },
            ].map((item, i, arr) => (
              <td
                key={i}
                style={{
                  padding: '7px 10px',
                  textAlign: 'center',
                  width: '25%',
                  borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                  backgroundColor: C.bg,
                }}
              >
                <div style={{ color: C.textMuted, fontSize: '8px', marginBottom: '3px', letterSpacing: '0.2px' }}>
                  {item.label}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '10px', color: C.navy }}>
                  {item.value}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* ══ TEKLİF KALEMLERİ TABLOSU ════════════════════════════ */}
      <div style={{
        fontSize: '8px',
        fontWeight: 'bold',
        color: C.textMuted,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        marginBottom: '4px',
      }}>
        Teklif Kalemleri / Line Items
      </div>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: `1px solid ${C.border}`,
        marginBottom: '0px',
        tableLayout: 'fixed',
      }}>
        <TableColgroup />
        <thead>
          <tr style={{ backgroundColor: C.navy, color: C.white }}>
            {[
              { label: 'No',          sub: '',            align: 'center', px: '4px 4px' },
              { label: 'Marka',       sub: 'Brand',       align: 'left',   px: '7px 6px' },
              { label: 'Ürün Kodu',   sub: 'Item No',     align: 'left',   px: '7px 6px' },
              { label: 'Açıklama',    sub: 'Description', align: 'left',   px: '7px 6px' },
              { label: 'Miktar',      sub: 'Qty',         align: 'center', px: '7px 4px' },
              { label: 'Birim Fiyat', sub: 'Unit Price',  align: 'right',  px: '7px 6px' },
              { label: 'Toplam',      sub: 'Total',       align: 'right',  px: '7px 6px' },
              { label: 'Teslimat',    sub: 'Delivery',    align: 'center', px: '7px 4px' },
            ].map((col, i) => (
              <th
                key={i}
                style={{
                  padding: col.px,
                  textAlign: col.align as 'left' | 'center' | 'right',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  letterSpacing: '0.1px',
                  borderRight: i < 7 ? `1px solid ${C.navyBorder}` : 'none',
                  lineHeight: '1.3',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
                {col.sub && (
                  <span style={{
                    display: 'block',
                    fontWeight: 'normal',
                    fontSize: '7px',
                    opacity: 0.65,
                    marginTop: '1px',
                    textAlign: col.align as 'left' | 'center' | 'right',
                  }}>
                    {col.sub}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teklif.satirlar.map((satir, idx) => {
            const isOdd = idx % 2 === 1;
            const bg = isOdd ? C.rowAlt : C.white;
            return (
              <tr
                key={satir.id}
                style={{ backgroundColor: bg, pageBreakInside: 'avoid', breakInside: 'avoid' }}
              >
                {/* No */}
                <td style={{
                  padding: '5px 4px',
                  textAlign: 'center',
                  fontSize: '8.5px',
                  color: C.textMuted,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: `1px solid ${C.borderSoft}`,
                  whiteSpace: 'nowrap',
                }}>
                  {String(idx + 1).padStart(2, '0')}
                </td>
                {/* Marka */}
                <td style={{
                  padding: '5px 6px',
                  fontSize: '8.5px',
                  color: C.textMid,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: `1px solid ${C.borderSoft}`,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}>
                  {satir.marka || '—'}
                </td>
                {/* Ürün Kodu */}
                <td style={{
                  padding: '5px 6px',
                  fontSize: '8.5px',
                  fontWeight: '600',
                  color: C.accent,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: `1px solid ${C.borderSoft}`,
                  wordBreak: 'break-all',
                  letterSpacing: '-0.1px',
                }}>
                  {satir.urunKod || '—'}
                </td>
                {/* Açıklama — en geniş kolon, iki satır */}
                <td style={{
                  padding: '5px 6px',
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: `1px solid ${C.borderSoft}`,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}>
                  <div style={{ fontWeight: '500', fontSize: '9px', lineHeight: '1.4', color: C.text }}>
                    {temizleAciklama(satir.urunAdi, satir.urunKod || '')}
                  </div>
                  {satir.aciklama && satir.aciklama !== satir.urunAdi && (
                    <div style={{ fontSize: '7.5px', color: C.textSoft, marginTop: '2px', lineHeight: '1.45' }}>
                      {temizleAciklama(satir.aciklama, satir.urunKod || '')}
                    </div>
                  )}
                </td>
                {/* Miktar */}
                <td style={{
                  padding: '5px 4px',
                  textAlign: 'center',
                  fontSize: '9px',
                  color: C.textMid,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: `1px solid ${C.borderSoft}`,
                  whiteSpace: 'nowrap',
                }}>
                  {satir.miktar !== 0
                    ? `${satir.miktar}${satir.birim ? '\u00a0' + satir.birim : ''}`
                    : '—'}
                </td>
                {/* Birim Fiyat */}
                <td style={{
                  padding: '5px 6px',
                  textAlign: 'right',
                  fontSize: '9px',
                  color: C.textMid,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: `1px solid ${C.borderSoft}`,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {satir.birimFiyat !== 0
                    ? satir.birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '—'}
                </td>
                {/* Satır Toplam */}
                <td style={{
                  padding: '5px 6px',
                  textAlign: 'right',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: C.navy,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: `1px solid ${C.borderSoft}`,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {satir.satirToplami !== 0
                    ? satir.satirToplami.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '—'}
                </td>
                {/* Teslimat */}
                <td style={{
                  padding: '5px 4px',
                  textAlign: 'center',
                  fontSize: '8px',
                  color: C.textSoft,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}>
                  {satir.teslimTarihi || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ══ TOPLAM ALANI ════════════════════════════════════════ */}
      {/* Aynı colgroup → değerler "Toplam" sütununun tam altına düşer */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '14px',
        tableLayout: 'fixed',
        borderLeft: `1px solid ${C.border}`,
        borderRight: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        ...noBreak,
      }}>
        <TableColgroup />
        <tbody>
          {/* Ara Toplam */}
          <tr>
            <td colSpan={6} style={{
              padding: '4px 8px 4px 10px',
              fontSize: '8.5px',
              color: C.textMid,
              textAlign: 'right',
              borderBottom: `1px solid ${C.borderSoft}`,
            }}>
              Ara Toplam / Sub Total
            </td>
            <td style={{
              padding: '4px 6px',
              fontSize: '9px',
              borderBottom: `1px solid ${C.borderSoft}`,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              color: C.text,
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}>
              {formatCurrency(teklif.araToplam, teklif.paraBirimi)}
            </td>
            <td style={{ borderBottom: `1px solid ${C.borderSoft}` }} />
          </tr>

          {/* İndirim — sadece > 0 ise */}
          {teklif.toplamIndirim > 0 && (
            <tr>
              <td colSpan={6} style={{
                padding: '4px 8px 4px 10px',
                fontSize: '8.5px',
                color: '#b91c1c',
                textAlign: 'right',
                borderBottom: `1px solid ${C.borderSoft}`,
              }}>
                (–) İndirim / Discount
              </td>
              <td style={{
                padding: '4px 6px',
                fontSize: '9px',
                color: '#b91c1c',
                borderBottom: `1px solid ${C.borderSoft}`,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: '500',
                whiteSpace: 'nowrap',
              }}>
                {formatCurrency(teklif.toplamIndirim, teklif.paraBirimi)}
              </td>
              <td style={{ borderBottom: `1px solid ${C.borderSoft}` }} />
            </tr>
          )}

          {/* KDV — sadece > 0 ise */}
          {teklif.toplamVergi > 0 && (
            <tr>
              <td colSpan={6} style={{
                padding: '4px 8px 4px 10px',
                fontSize: '8.5px',
                color: C.textMid,
                textAlign: 'right',
                borderBottom: `1px solid ${C.border}`,
              }}>
                KDV / VAT {teklif.kdvOrani > 0 ? `(%${teklif.kdvOrani})` : ''}
              </td>
              <td style={{
                padding: '4px 6px',
                fontSize: '9px',
                borderBottom: `1px solid ${C.border}`,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                color: C.text,
                fontWeight: '500',
                whiteSpace: 'nowrap',
              }}>
                {formatCurrency(teklif.toplamVergi, teklif.paraBirimi)}
              </td>
              <td style={{ borderBottom: `1px solid ${C.border}` }} />
            </tr>
          )}

          {/* Genel Toplam */}
          <tr>
            <td colSpan={6} style={{
              background: C.navy,
              color: C.white,
              fontWeight: 'bold',
              fontSize: '10px',
              padding: '8px 8px 8px 10px',
              textAlign: 'right',
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
            }}>
              GENEL TOPLAM / Grand Total
            </td>
            <td style={{
              background: C.navy,
              color: C.white,
              fontWeight: 'bold',
              fontSize: '12.5px',
              padding: '8px 6px',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              letterSpacing: '0.1px',
            }}>
              {formatCurrency(teklif.genelToplam, teklif.paraBirimi)}
            </td>
            <td style={{ background: C.navy }} />
          </tr>
        </tbody>
      </table>

      {/* ══ NOT ALANI ════════════════════════════════════════════ */}
      {teklif.notlar && (
        <div style={{
          fontSize: '9px',
          marginBottom: '14px',
          padding: '7px 10px',
          border: `1px solid ${C.borderSoft}`,
          lineHeight: '1.65',
          backgroundColor: C.bg,
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          ...noBreak,
        }}>
          <strong style={{ color: C.navy }}>Notlar / Notes:&nbsp;</strong>
          <span style={{ color: C.textMid }}>{teklif.notlar}</span>
        </div>
      )}

      {/* ══ KAŞE / İMZA ══════════════════════════════════════════ */}
      <div style={{ marginTop: '20px', ...noBreak }}>
        <div style={{
          fontSize: '8px',
          fontWeight: 'bold',
          color: C.navy,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          marginBottom: '6px',
        }}>
          Kaşe – İmza / Authorised Signature
        </div>
        <div style={{ fontSize: '9px', marginTop: '28px', lineHeight: '1.8', color: C.textMid }}>
          <div style={{ color: C.textMuted }}>Siparişi Veren / Authorised Person</div>
          <div style={{ fontWeight: 'bold', fontSize: '10px', color: C.navy }}>{teklif.cari.firmaAdi}</div>
          <div style={{ color: C.textMuted }}>Tarih / Date: _______________</div>
        </div>
      </div>

      {/* ══ FOOTER ═══════════════════════════════════════════════ */}
      <div style={{
        marginTop: '18px',
        borderTop: `2px solid ${C.navy}`,
        backgroundColor: C.navy,
        color: 'rgba(255,255,255,0.80)',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '7.5px',
        padding: '5px 9px',
        lineHeight: '1.5',
        letterSpacing: '0.1px',
      }}>
        <div>MEBA Pnömatik Hidrolik Makina &middot; KAYSERİ &nbsp;|&nbsp; info@mebamekanik.com</div>
        <div style={{ fontVariantNumeric: 'tabular-nums' }}>
          Teklif No: {teklif.teklifNo} &nbsp;|&nbsp; {formatDate(teklif.tarih)} &nbsp;|&nbsp; www.mebamekanik.com
        </div>
      </div>

    </div>
  );
}
