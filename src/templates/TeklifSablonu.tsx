import React from 'react';
import type { Teklif } from '../types';
import { formatCurrency, formatDate, formatDisplayNumber, formatTitleCaseTr, stripParantez } from '../utils/formatters';
import type { TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';

function firstLine(text: string): string {
  return text.split(/\r?\n/)[0]?.trim() ?? '';
}

const SEMBOL: Record<string, string> = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', CHF: '₣' };

// ── PDF Tasarım Sabitleri ─────────────────────────────────────────────────────
const C = {
  navy:       '#14274e',   // Oxford Navy — derin kurumsal lacivert
  navyLight:  '#1e3668',   // Orta lacivert — alt başlık & vurgu
  navyBorder: '#b6c4d6',   // Lacivert tonlu açık kenarlık
  accent:     '#1e3668',   // Ürün kodu metin rengi
  border:     '#e2e6eb',
  borderSoft: '#edf0f4',
  rowAlt:     '#f4f7fb',   // Hafif lacivert tonu — çift satır
  text:       '#1c1c1e',
  textMid:    '#3a3a3c',
  textSoft:   '#636366',
  textMuted:  '#8e8e93',
  white:      '#ffffff',
  bg:         '#f1f4f8',   // Hafif lacivert tonu — arka plan alanları
};

// Sütun genişlikleri — içerik bazlı otomatik boyutlandırma
// İçerik analizi (190mm kullanılabilir genişlik):
//   NO        : "01"–"99"            →  3%  ≈  5.7mm
//   Marka     : "SMC"                →  7%  ≈ 13.3mm
//   Ürün Kodu : "CP96SDB80-200C"     → 16%  ≈ 30.4mm  ← genişletildi (tek satır)
//   Açıklama  : açık metin           → 35%  ≈ 66.5mm  ← 4% Ürün Kodu'na verildi
//   Miktar    : "100 Adet"           →  7%  ≈ 13.3mm
//   Birim Fyt : "1.234,56"           → 12%  ≈ 22.8mm
//   Toplam    : "12.345,67"          → 12%  ≈ 22.8mm
//   Teslimat  : "2-3 Gün"            →  8%  ≈ 15.2mm
//                                     100%
const COL = {
  no:         '3%',
  marka:      '7%',
  urunKod:    '16%',
  aciklama:   '35%',
  miktar:     '7%',
  birimFiyat: '12%',
  toplam:     '12%',
  teslimat:   '8%',
};

const noBreak: React.CSSProperties = {
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
};

// ── LOGO Optik Metrikleri ─────────────────────────────────────────────────────
// PNG'nin (1858×846) alpha + non-white scan'inden ölçüldü.
// Logonun gerçek görsel sınırları (MEBA harf üstü → MEKANİK badge altı):
//   x: 82..1738 px  (4.41% .. 93.54%)
//   y: 87..646  px  (10.28% .. 76.36%)
// Yani PNG çerçevesinin sadece ~%66 yüksekliği × ~%89 genişliği gerçek görsel.
// Hizalamalar bu optik bounding box'a göre yapılır, dış çerçeveye göre değil.
const LOGO = {
  PNG_AR:        1858 / 846,     // 2.1962 — dosya en/boy oranı
  OPT_TOP_FRAC:  87 / 846,       // 0.10284 — üst beyaz padding oranı
  OPT_BOT_FRAC:  646 / 846,      // 0.76360 — optik içerik alt sınırı (top'tan)
  OPT_LEFT_FRAC: 82 / 1858,      // 0.04413 — sol beyaz padding oranı
  OPT_RIGHT_FRAC:1738 / 1858,    // 0.93540 — optik içerik sağ sınırı (left'ten)
  FILE_HEIGHT:   98,             // mevcut görsel boyut korunur (px)
} as const;

const LOGO_FILE_W   = LOGO.FILE_HEIGHT * LOGO.PNG_AR;                                // ~215.23 px
const LOGO_OPT_H    = LOGO.FILE_HEIGHT * (LOGO.OPT_BOT_FRAC - LOGO.OPT_TOP_FRAC);    // ~64.87 px
const LOGO_OPT_W    = LOGO_FILE_W      * (LOGO.OPT_RIGHT_FRAC - LOGO.OPT_LEFT_FRAC); // ~191.95 px
const LOGO_OPT_TOP  = -(LOGO.FILE_HEIGHT * LOGO.OPT_TOP_FRAC);                       // ~-10.08 px
const LOGO_OPT_LEFT = -(LOGO_FILE_W      * LOGO.OPT_LEFT_FRAC);                      // ~-9.50 px
// ─────────────────────────────────────────────────────────────────────────────

interface TeklifSablonuProps {
  teklif: Teklif;
  totals: TeklifToplam;
}

// temizleAciklama kaldırıldı — formatAciklama (formatters.ts) ortak kullanılır.

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

export default function TeklifSablonu({ teklif, totals }: TeklifSablonuProps) {
  const sembol = SEMBOL[teklif.paraBirimi] ?? teklif.paraBirimi;
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;

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
        display: 'flex',
        flexDirection: 'column',
        margin: '0 auto',
        backgroundColor: C.white,
        fontFamily: '"Inter", "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '10.15px',
        lineHeight: '1.52',
        letterSpacing: '0.01em',
        color: C.text,
        boxSizing: 'border-box',
        padding: '9mm 10mm 8mm 10mm',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'geometricPrecision',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}
    >

      {/* İçerik alanı — flex: 1 ile footer'ı en alta iter */}
      <div style={{ flex: 1 }}>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      {/* Logo + tüm yazılar (Hazırlayan dahil) tek flex container içinde.        */}
      {/* align-items:flex-end + min-height = LOGO_OPT_H (logonun OPTİK alt       */}
      {/* sınırı referans). Tüm metinlerin alt bitiş noktası logonun gerçek       */}
      {/* görsel alt sınırı (MEKANİK badge altı) ile birebir aynı.                */}
      {/* min-height kullanılır ki içerik taşarsa container otomatik büyüsün.    */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        width: '100%',
        minHeight: `${LOGO_OPT_H}px`,
        marginBottom: '7px',
        lineHeight: 'normal',
        ...noBreak,
      }}>

        {/* Logo — OPTİK bounding box (dış çerçeve değil, gerçek görsel sınırlar) */}
        {/* PNG'nin üst (~10%) ve alt (~24%) beyaz padding'leri overflow:hidden  */}
        {/* + negatif top offset ile gizlenir. Wrapper sadece gerçek logonun     */}
        {/* yazı bölümünü gösterir; alt sınırı = MEKANİK badge'in alt çizgisi.   */}
        <div style={{
          flex: '0 0 31%',
          maxWidth: '31%',
          minHeight: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
          alignSelf: 'flex-end',
          margin: 0,
          padding: '0 12px 0 0',
          lineHeight: 0,
          boxSizing: 'border-box',
        }}>
          {/* Optik clipping wrapper — width × height = logonun görsel sınırları */}
          <div style={{
            position: 'relative',
            width: `${LOGO_OPT_W}px`,
            height: `${LOGO_OPT_H}px`,
            overflow: 'hidden',
            display: 'block',
            margin: 0,
            padding: 0,
            lineHeight: 0,
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
                imageRendering: 'auto',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                padding: 0,
                margin: 0,
                lineHeight: 0,
                verticalAlign: 'bottom',
              }}
            />
          </div>
        </div>

        {/* Şirket Bilgisi — alt bitiş noktası logonun alt sınırı ile birebir */}
        <div style={{
          flex: '0 0 37%',
          maxWidth: '37%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          alignSelf: 'flex-start',
          margin: 0,
          padding: '0 10px 0 0',
          lineHeight: 'normal',
          boxSizing: 'border-box',
        }}>
          <div style={{ fontWeight: 700, fontSize: '12.8px', color: C.navy, margin: 0, padding: 0, lineHeight: '1.18', letterSpacing: '-0.01em' }}>
            MEBA Pnömatik Hidrolik Makina Elektrik
          </div>
          <div style={{ fontWeight: 600, fontSize: '11.1px', color: C.navyLight, margin: '3px 0 5px 0', padding: 0, lineHeight: '1.2', letterSpacing: '0.01em' }}>
            Elektronik Mühendislik San. Tic. Ltd. Şti.
          </div>
          <div style={{ fontSize: '9.9px', lineHeight: '1.48', color: C.textSoft, margin: 0, padding: 0, letterSpacing: '0.01em' }}>
            Organize San. Bölgesi İnecik Mah.<br />
            Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ
          </div>
        </div>

        {/* Teklif Bilgi Kutusu — "Hazırlayan" satırının alt bitişi logonun alt sınırı ile birebir */}
        <div style={{
          flex: '0 0 32%',
          maxWidth: '32%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
          alignSelf: 'flex-start',
          textAlign: 'right',
          margin: 0,
          padding: 0,
          lineHeight: 'normal',
          boxSizing: 'border-box',
        }}>
          {/* ── ANCHOR WRAPPER ──                                              */}
          {/* Hem TEKLİF başlığı hem "Teklif No" satırı bu wrapper'ın sol       */}
          {/* kenarını paylaşır → ortak sol referans çizgisi (layout anchor).   */}
          {/* Sabit width: badge + meta-table aynı genişlikte, aynı x'te başlar.*/}
          <div style={{
            width: '175px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
          }}>
            {/* Teklif başlık etiketi — şerit içinde tam ortalı */}
            <div style={{
              background: `linear-gradient(135deg, ${C.navy} 0%, #1e3668 100%)`,
              color: C.white,
              padding: '6px 12px',
              margin: '0 0 5px 0',
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              lineHeight: 1.2,
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.5px' }}>
                TEKLİF
              </span>
              <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.65)' }}>
                / Quotation
              </span>
            </div>
            {/* Teklif meta — width:100% ile aynı anchor'a snap. "Teklif No"    */}
            {/* hücresinin sol kenarı = badge'in sol kenarı (her ikisi de       */}
            {/* wrapper'ın x=0 noktası).                                         */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', margin: 0, padding: 0, lineHeight: 1, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '42%' }} />
                <col style={{ width: '58%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ fontSize: '10.1px', color: C.textMuted, padding: '0 0 4px 0', lineHeight: 1.2, letterSpacing: '0.03em' }}>Teklif No</td>
                  <td style={{ fontSize: '12.1px', fontWeight: 700, color: C.navy, padding: '0 0 4px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>
                    {teklif.teklifNo}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '10.1px', color: C.textMuted, padding: '0 0 4px 0', lineHeight: 1.2, letterSpacing: '0.03em' }}>Tarih</td>
                  <td style={{ fontSize: '11.8px', fontWeight: 600, color: C.text, padding: '0 0 4px 0', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDate(teklif.tarih)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '10.1px', color: C.textMuted, padding: 0, margin: 0, lineHeight: 1.2, letterSpacing: '0.03em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '11.8px', fontWeight: 600, color: C.text, padding: 0, margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {teklif.hazirlayanAdSoyad || 'MEBA Mekanik'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ══ GÖNDEREN / ALICI ════════════════════════════════════ */}
      {/* Dikey çizgiler kaldırıldı: outer border yerine sadece top+bottom,    */}
      {/* hücre borderRight devre dışı.                                        */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        borderLeft: 'none',
        borderRight: 'none',
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
              borderRight: 'none',
              borderLeft: 'none',
            }}>
              <div style={{
                fontSize: '8.7px',
                fontWeight: 600,
                color: C.navy,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}>
                Gönderen / From
              </div>
              <div style={{ fontWeight: 700, fontSize: '12.1px', color: C.navy, marginBottom: '4px', letterSpacing: '-0.01em' }}>
                MEBA Mekanik Ltd. Şti.
              </div>
              <div style={{ fontSize: '10.3px', lineHeight: '1.72', color: C.textMid }}>
                Tel: {formatPhone('03525020780')}<br />
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
                fontSize: '8.7px',
                fontWeight: 600,
                color: C.navy,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}>
                Alıcı / To
              </div>
              <div style={{ fontWeight: 700, fontSize: '12.1px', color: C.navy, marginBottom: '4px', lineHeight: '1.35', letterSpacing: '-0.01em' }}>
                {teklif.cari.firmaAdi}
              </div>
              <div style={{ fontSize: '10.3px', lineHeight: '1.72', color: C.textMid, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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
      {/* Dikey çizgiler kaldırıldı: outer border yerine top+bottom,            */}
      {/* hücreler arasındaki dikey ayraç da devre dışı.                        */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        borderLeft: 'none',
        borderRight: 'none',
        marginBottom: '7px',
        ...noBreak,
      }}>
        <tbody>
          <tr>
            {[
              { label: 'Para Birimi / Currency',  value: sembol !== teklif.paraBirimi ? `${teklif.paraBirimi} (${sembol})` : teklif.paraBirimi },
              { label: 'Ödeme Vadesi / Payment',  value: teklif.odemeVadesi || '45 Gün' },
              { label: 'KDV Oranı / VAT',         value: teklif.kdvOrani > 0 ? `%${teklif.kdvOrani}` : 'Hariç' },
              { label: 'Kur / Exchange Rate',     value: 'TCMB Fatura' },
              { label: 'Geçerlilik / Validity', value: teklif.gecerlilikSuresi ?? '1 Hafta' },
            ].map((item, i, arr) => (
              <td
                key={i}
                style={{
                  padding: '7px 10px',
                  textAlign: 'center',
                  width: `${(100 / arr.length).toFixed(2)}%`,
                  borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                  borderLeft: 'none',
                  backgroundColor: C.bg,
                }}
              >
                <div style={{ color: C.textMuted, fontSize: '9.7px', marginBottom: '3px', letterSpacing: '0.2px' }}>
                  {item.label}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '12px', color: C.navy }}>
                  {item.value}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* ══ TEKLİF KALEMLERİ TABLOSU ════════════════════════════ */}
      <div style={{
        fontSize: '8.7px',
        fontWeight: 600,
        color: C.textMuted,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        marginBottom: '6px',
      }}>
        Teklif Kalemleri / Line Items
      </div>
      {/* Dikey çizgiler kaldırıldı: outer border yerine top+bottom,            */}
      {/* başlık ve hücreler arasındaki dikey ayraçlar da devre dışı.           */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        borderLeft: 'none',
        borderRight: 'none',
        marginBottom: '0px',
        tableLayout: 'fixed',
      }}>
        <TableColgroup />
        <thead>
          <tr style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6a 100%)`, color: C.white }}>
            {[
              { label: '#',           sub: '',            align: 'center' as const },
              { label: 'Marka',       sub: 'Brand',       align: 'center' as const },
              { label: 'Ürün Kodu',   sub: 'Item No',     align: 'left'   as const },
              { label: 'Açıklama',    sub: 'Description', align: 'left'   as const },
              { label: 'Miktar',      sub: 'Qty',         align: 'right'  as const },
              { label: 'Birim Fiyat', sub: 'Unit Price',  align: 'right'  as const },
              { label: 'Toplam',      sub: 'Total',       align: 'right'  as const },
              { label: 'Teslimat',    sub: 'Delivery',    align: 'center' as const },
            ].map((col, i) => (
              <th
                key={i}
                style={{
                  padding: '7px 6px',
                  textAlign: col.align,
                  verticalAlign: 'middle',
                  fontSize: '10.6px',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  borderRight: 'none',
                  borderLeft: 'none',
                  lineHeight: '1.3',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
                {col.sub && (
                  <span style={{
                    display: 'block',
                    fontWeight: 500,
                    fontSize: '8.4px',
                    color: 'rgba(255,255,255,0.82)',
                    marginTop: '2px',
                    textAlign: col.align,
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
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontSize: '10.3px',
                  color: C.textMuted,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
                  whiteSpace: 'nowrap',
                }}>
                  {String(idx + 1).padStart(2, '0')}
                </td>
                {/* Marka */}
                <td style={{
                  padding: '6px 6px',
                  textAlign: 'center',
                  fontSize: '10.3px',
                  color: C.textMid,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
                  whiteSpace: 'nowrap',
                }}>
                  {satir.marka || '—'}
                </td>
                {/* Ürün Kodu */}
                <td style={{
                  padding: '6px 6px',
                  fontSize: '10.3px',
                  fontWeight: 600,
                  color: C.accent,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  letterSpacing: '-0.1px',
                }}>
                  {satir.urunKod || '—'}
                </td>
                {/* Açıklama — özel CSS override edildi, diğer body hücreleriyle */}
                {/* aynı <td> + <span display:block> hizalama sistemi kullanılır.  */}
                <td style={{
                  padding: '6px 6px',
                  fontSize: '10.4px',
                  color: C.textMid,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}>
                  {firstLine(stripParantez(satir.urunAdi))}
                  {(() => {
                    // Manuel kayıt varsa onu, yoksa otomatik oluşturulan metni kullan
                    const sat2 = '';
                    if (!sat2) return null;
                    return (
                      <span style={{
                        display: 'block',
                        fontSize: '9px',
                        opacity: 0.72,
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {sat2}
                      </span>
                    );
                  })()}
                </td>
                {/* Miktar */}
                <td style={{
                  padding: '6px 4px',
                  textAlign: 'right',
                  fontSize: '10.6px',
                  color: C.textMid,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {satir.miktar !== 0
                    ? `${formatDisplayNumber(satir.miktar, 0, 4)}${satir.birim ? '\u00a0' + satir.birim : ''}`
                    : '—'}
                </td>
                {/* Birim Fiyat */}
                <td style={{
                  padding: '6px 6px',
                  textAlign: 'right',
                  fontSize: '10.6px',
                  color: C.textMid,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {satir.birimFiyat !== 0
                    ? formatDisplayNumber(satir.birimFiyat, 2, 2)
                    : '—'}
                </td>
                {/* Satır Toplam */}
                <td style={{
                  padding: '6px 6px',
                  textAlign: 'right',
                  fontSize: '10.6px',
                  fontWeight: 700,
                  color: C.navy,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {satir.satirToplami !== 0
                    ? formatDisplayNumber(satir.satirToplami, 2, 2)
                    : '—'}
                </td>
                {/* Teslimat */}
                <td style={{
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontSize: '10.1px',
                  color: C.textSoft,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
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
      {/* Dikey çizgiler (borderLeft / borderRight) kaldırıldı.       */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '14px',
        tableLayout: 'fixed',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: `1px solid ${C.border}`,
        ...noBreak,
      }}>
        <TableColgroup />
        <tbody>
          {/* ── Koşullu satırlar: Ara Toplam → İskonto → KDV ──
               Ara Toplam: KDV veya iskonto varsa gösterilir
               İskonto: iskontoOrani > 0 ise gösterilir
               KDV: kdvOrani > 0 ise gösterilir
               Genel Toplam: her zaman gösterilir                          */}
          {(kdvOrani > 0 || iskontoOrani > 0 || teklif.toplamIndirim > 0) && (
            <>
              {/* Ara Toplam */}
              <tr>
                <td colSpan={6} style={{
                  padding: '5px 8px 5px 10px',
                  fontSize: '10.2px',
                  color: C.textMid,
                  textAlign: 'right',
                  borderBottom: `1px solid ${C.borderSoft}`,
                }}>
                  Ara Toplam / Sub Total
                </td>
                <td style={{
                  padding: '5px 6px',
                  fontSize: '10.6px',
                  borderBottom: `1px solid ${C.borderSoft}`,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  color: C.text,
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                }}>
                  {formatCurrency(araToplam, teklif.paraBirimi)}
                </td>
                <td style={{ borderBottom: `1px solid ${C.borderSoft}` }} />
              </tr>

              {/* İskonto — sadece iskontoOrani > 0 ise */}
              {iskontoOrani > 0 && (
                <tr>
                  <td colSpan={6} style={{
                    padding: '5px 8px 5px 10px',
                    fontSize: '10.2px',
                    color: '#8f4e4e',
                    textAlign: 'right',
                    borderBottom: `1px solid ${C.borderSoft}`,
                  }}>
                    (–) İskonto / Discount (%{iskontoOrani})
                  </td>
                  <td style={{
                    padding: '5px 6px',
                    fontSize: '10.6px',
                    color: '#8f4e4e',
                    borderBottom: `1px solid ${C.borderSoft}`,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                  }}>
                    – {formatCurrency(iskontoTutar, teklif.paraBirimi)}
                  </td>
                  <td style={{ borderBottom: `1px solid ${C.borderSoft}` }} />
                </tr>
              )}

              {/* İndirim (satır bazlı) — sadece > 0 ise */}
              {teklif.toplamIndirim > 0 && (
                <tr>
                  <td colSpan={6} style={{
                    padding: '5px 8px 5px 10px',
                    fontSize: '10.2px',
                    color: '#8f4e4e',
                    textAlign: 'right',
                    borderBottom: `1px solid ${C.borderSoft}`,
                  }}>
                    (–) İndirim / Line Discount
                  </td>
                  <td style={{
                    padding: '5px 6px',
                    fontSize: '10.6px',
                    color: '#8f4e4e',
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

              {/* KDV — sadece kdvOrani > 0 ise */}
              {kdvOrani > 0 && (
                <tr>
                  <td colSpan={6} style={{
                    padding: '5px 8px 5px 10px',
                    fontSize: '10.2px',
                    color: C.textMid,
                    textAlign: 'right',
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    KDV / VAT (%{kdvOrani})
                  </td>
                  <td style={{
                    padding: '5px 6px',
                    fontSize: '10.6px',
                    borderBottom: `1px solid ${C.border}`,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: C.text,
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                  }}>
                    {formatCurrency(kdvTutar, teklif.paraBirimi)}
                  </td>
                  <td style={{ borderBottom: `1px solid ${C.border}` }} />
                </tr>
              )}
            </>
          )}

          {/* Genel Toplam — her zaman gösterilir */}
          <tr>
            <td colSpan={6} style={{
              background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6a 100%)`,
              color: C.white,
              fontWeight: 700,
              fontSize: '11.8px',
              padding: '9px 8px 9px 10px',
              textAlign: 'right',
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
            }}>
              GENEL TOPLAM / Grand Total
            </td>
            <td style={{
              background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6a 100%)`,
              color: C.white,
              fontWeight: 700,
              fontSize: '14.6px',
              padding: '9px 6px',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              letterSpacing: '0.01em',
            }}>
              {formatCurrency(genelToplam, teklif.paraBirimi)}
            </td>
            <td style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6a 100%)` }} />
          </tr>
        </tbody>
      </table>

      {/* ══ NOT ALANI ════════════════════════════════════════════ */}
      {teklif.notlar && (
        <div style={{
          fontSize: '11.2px',
          marginBottom: '14px',
          padding: '9px 11px',
          border: `1px solid ${C.borderSoft}`,
          lineHeight: '1.72',
          backgroundColor: C.bg,
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          ...noBreak,
        }}>
          <strong style={{ color: C.navy }}>Notlar / Notes:&nbsp;</strong>
          <span style={{ color: C.textMid }}>{teklif.notlar}</span>
        </div>
      )}

      {/* ══ KAŞE / İMZA + FOOTER ═════════════════════════════════ */}
      {/* id="kase-imza-block" → PDF pipeline bu BLOK'u ayrı canvas    */}
      {/* olarak yakalar ve her sayfanın EN ALTINA stamp eder.          */}
      {/* Footer (navy bar) bu bloğun İÇİNDE — ikisi birlikte         */}
      {/* yakalanır, birlikte stamp edilir. Ana içerik doğal flow'da   */}
      {/* kalır, zorla 297mm'e esnetilmez → 2. sayfa tetiklenmez.     */}
      </div>{/* içerik alanı sonu */}

      {/* ── SİPARİŞİ VEREN — footer'ın hemen üstünde, sağa hizalı ── */}
      <div id="kase-imza-block" style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 10px', ...noBreak }}>
        <div style={{ fontSize: '10.2px', lineHeight: '1.85', color: C.textMid, textAlign: 'right', minWidth: '180px' }}>
          <div style={{ color: C.textMuted, marginBottom: '14px' }}>Siparişi Veren / Authorised Person</div>
          <div style={{ borderBottom: `1px solid ${C.border}`, marginBottom: '5px', height: '18px' }} />
          <div style={{ color: C.textMuted, marginBottom: '10px' }}>İsim / Name</div>
          <div style={{ borderBottom: `1px solid ${C.border}`, marginBottom: '5px', height: '18px' }} />
          <div style={{ color: C.textMuted }}>Tarih / Date</div>
        </div>
      </div>

      {/* ── FOOTER (navy şerit) — sayfanın en altında ── */}
      <div style={{
        marginTop: '20px',
        borderTop: `1px solid ${C.navyBorder}`,
        background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6a 100%)`,
        color: 'rgba(255,255,255,0.82)',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '8.5px',
        padding: '6px 9px',
        lineHeight: '1.55',
        letterSpacing: '0.02em',
      }}>
        <div>MEBA Pnömatik Hidrolik Makina &nbsp;|&nbsp; KAYSERİ &nbsp;|&nbsp; info@mebamekanik.com</div>
        <div style={{ fontVariantNumeric: 'tabular-nums' }}>
          Teklif No: {teklif.teklifNo} &nbsp;|&nbsp; {formatDate(teklif.tarih)} &nbsp;|&nbsp; www.mebamekanik.com
        </div>
      </div>

    </div>
  );
}
