import React from 'react';
import type { Teklif } from '../types';
import { formatCurrency, formatDate, formatTitleCaseTr, formatPdfAciklama, stripParantez } from '../utils/formatters';
import type { TeklifToplam } from '../services/hesaplamaMotoru';

const SEMBOL: Record<string, string> = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', CHF: '₣' };

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
        // minHeight kaldırıldı — template doğal içerik yüksekliğinde olur.
        // PDF pipeline A4 (297mm) sayfa boyutunu ve footer stamp'i yönetir.
        // minHeight:297mm → canvas her zaman ≥297mm → footerArea (~39mm)
        // çıkınca contentH=258mm, 297>258 → gereksiz 2. sayfa oluşuyordu.
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
      {/* Logo + tüm yazılar (Hazırlayan dahil) tek flex container içinde.        */}
      {/* align-items:flex-end + min-height = LOGO_OPT_H (logonun OPTİK alt       */}
      {/* sınırı referans). Tüm metinlerin alt bitiş noktası logonun gerçek       */}
      {/* görsel alt sınırı (MEKANİK badge altı) ile birebir aynı.                */}
      {/* min-height kullanılır ki içerik taşarsa container otomatik büyüsün.    */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
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
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          alignSelf: 'flex-end',
          margin: 0,
          padding: '0 10px 0 0',
          lineHeight: 'normal',
          boxSizing: 'border-box',
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', color: C.navy, margin: 0, padding: 0, lineHeight: '1.2' }}>
            MEBA Pnömatik Hidrolik Makina Elektrik
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '9.5px', color: C.navy, margin: '2px 0 4px 0', padding: 0, lineHeight: '1.2' }}>
            Elektronik Mühendislik San. Tic. Ltd. Şti.
          </div>
          <div style={{ fontSize: '8.5px', lineHeight: '1.35', color: C.textSoft, margin: 0, padding: 0 }}>
            Organize San. Bölgesi İnecik Mah. Fatih Sultan Mehmet Blv.<br />
            No:252/D Melikgazi, KAYSERİ / TÜRKİYE<br />
            T: +90 352 502 0780 &nbsp;|&nbsp; F: +90 352 502 0781
          </div>
        </div>

        {/* Teklif Bilgi Kutusu — "Hazırlayan" satırının alt bitişi logonun alt sınırı ile birebir */}
        <div style={{
          flex: '0 0 32%',
          maxWidth: '32%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          alignSelf: 'flex-end',
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
              backgroundColor: C.navy,
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
                  <td style={{ fontSize: '8.5px', color: C.textMuted, padding: '0 0 2px 0', lineHeight: 1.1 }}>Teklif No</td>
                  <td style={{ fontSize: '10px', fontWeight: 'bold', color: C.navy, padding: '0 0 2px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {teklif.teklifNo}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '8.5px', color: C.textMuted, padding: '0 0 2px 0', lineHeight: 1.1 }}>Tarih</td>
                  <td style={{ fontSize: '9.5px', fontWeight: 'bold', color: C.text, padding: '0 0 2px 0', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatDate(teklif.tarih)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '8.5px', color: C.textMuted, padding: 0, margin: 0, lineHeight: 1 }}>Hazırlayan</td>
                  <td style={{ fontSize: '9.5px', fontWeight: 'bold', color: C.text, padding: 0, margin: 0, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          <tr style={{ backgroundColor: C.navy, color: C.white }}>
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
                  padding: '6px 6px',
                  textAlign: col.align,
                  verticalAlign: 'middle',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  letterSpacing: '0.1px',
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
                    fontWeight: 'normal',
                    fontSize: '7px',
                    opacity: 0.65,
                    marginTop: '1px',
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
                  padding: '5px 4px',
                  textAlign: 'center',
                  fontSize: '8.5px',
                  color: C.textMuted,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
                  whiteSpace: 'nowrap',
                }}>
                  {String(idx + 1).padStart(2, '0')}
                </td>
                {/* Marka */}
                <td style={{
                  padding: '5px 6px',
                  textAlign: 'center',
                  fontSize: '8.5px',
                  color: C.textMid,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
                  whiteSpace: 'nowrap',
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
                  padding: '5px 6px',
                  fontSize: '8.5px',
                  color: C.textMid,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}>
                  {stripParantez(satir.urunAdi)}
                  {(() => {
                    // Manuel kayıt varsa onu, yoksa otomatik oluşturulan metni kullan
                    const sat2 = satir.manuelAltAciklama !== undefined
                      ? satir.manuelAltAciklama
                      : formatPdfAciklama(satir.urunAdi, satir.aciklama, satir.urunKod);
                    if (!sat2) return null;
                    return (
                      <span style={{
                        display: 'block',
                        fontSize: '7px',
                        opacity: 0.65,
                        marginTop: '1px',
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
                  padding: '5px 4px',
                  textAlign: 'right',
                  fontSize: '9px',
                  color: C.textMid,
                  borderBottom: `1px solid ${C.borderSoft}`,
                  borderRight: 'none',
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
                  borderRight: 'none',
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
                  borderRight: 'none',
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
                  {formatCurrency(araToplam, teklif.paraBirimi)}
                </td>
                <td style={{ borderBottom: `1px solid ${C.borderSoft}` }} />
              </tr>

              {/* İskonto — sadece iskontoOrani > 0 ise */}
              {iskontoOrani > 0 && (
                <tr>
                  <td colSpan={6} style={{
                    padding: '4px 8px 4px 10px',
                    fontSize: '8.5px',
                    color: '#b91c1c',
                    textAlign: 'right',
                    borderBottom: `1px solid ${C.borderSoft}`,
                  }}>
                    (–) İskonto / Discount (%{iskontoOrani})
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
                    – {formatCurrency(iskontoTutar, teklif.paraBirimi)}
                  </td>
                  <td style={{ borderBottom: `1px solid ${C.borderSoft}` }} />
                </tr>
              )}

              {/* İndirim (satır bazlı) — sadece > 0 ise */}
              {teklif.toplamIndirim > 0 && (
                <tr>
                  <td colSpan={6} style={{
                    padding: '4px 8px 4px 10px',
                    fontSize: '8.5px',
                    color: '#b91c1c',
                    textAlign: 'right',
                    borderBottom: `1px solid ${C.borderSoft}`,
                  }}>
                    (–) İndirim / Line Discount
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

              {/* KDV — sadece kdvOrani > 0 ise */}
              {kdvOrani > 0 && (
                <tr>
                  <td colSpan={6} style={{
                    padding: '4px 8px 4px 10px',
                    fontSize: '8.5px',
                    color: C.textMid,
                    textAlign: 'right',
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    KDV / VAT (%{kdvOrani})
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
              {formatCurrency(genelToplam, teklif.paraBirimi)}
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

      {/* ══ KAŞE / İMZA + FOOTER ═════════════════════════════════ */}
      {/* id="kase-imza-block" → PDF pipeline bu BLOK'u ayrı canvas    */}
      {/* olarak yakalar ve her sayfanın EN ALTINA stamp eder.          */}
      {/* Footer (navy bar) bu bloğun İÇİNDE — ikisi birlikte         */}
      {/* yakalanır, birlikte stamp edilir. Ana içerik doğal flow'da   */}
      {/* kalır, zorla 297mm'e esnetilmez → 2. sayfa tetiklenmez.     */}
      <div id="kase-imza-block" style={{ marginTop: '20px', ...noBreak }}>
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
        <div style={{ display: 'flex', gap: '20px', marginTop: '28px' }}>
          {/* Müşteri imza alanı */}
          <div style={{ flex: 1, fontSize: '9px', lineHeight: '1.8', color: C.textMid }}>
            <div style={{ color: C.textMuted }}>Siparişi Veren / Authorised Person</div>
            <div style={{ fontWeight: 'bold', fontSize: '10px', color: C.navy }}>{teklif.cari.firmaAdi}</div>
            <div style={{ color: C.textMuted }}>Tarih / Date: _______________</div>
          </div>
          {/* MEBA imza alanı */}
          <div style={{ flex: 1, fontSize: '9px', lineHeight: '1.8', color: C.textMid }}>
            <div style={{ color: C.textMuted }}>Düzenleyen / Prepared by</div>
            <div style={{ fontWeight: 'bold', fontSize: '10px', color: C.navy }}>MEBA Mekanik Ltd. Şti.</div>
            <div>{teklif.hazirlayanAdSoyad || 'MEBA Mekanik'}</div>
            <div style={{ color: C.textMuted }}>Tarih / Date: _______________</div>
          </div>
        </div>

        {/* ── FOOTER (navy şerit) — kaşe-imza ile birlikte stamp edilir ── */}
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
          <div>MEBA Pnömatik Hidrolik Makina &nbsp;|&nbsp; KAYSERİ &nbsp;|&nbsp; info@mebamekanik.com</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>
            Teklif No: {teklif.teklifNo} &nbsp;|&nbsp; {formatDate(teklif.tarih)} &nbsp;|&nbsp; www.mebamekanik.com
          </div>
        </div>
      </div>

    </div>
  );
}
