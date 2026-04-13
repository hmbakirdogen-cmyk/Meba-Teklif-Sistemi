import React from 'react';
import type { Teklif } from '../types';
import { formatCurrency, formatDate, formatDisplayNumber, formatTitleCaseTr, stripParantez } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';
import { TeklifTotalsSection } from './TeklifTotalsSection';

const PARA_BIRIMI_ETIKETI: Record<string, string> = { TRY: 'TL', EUR: 'EUR', USD: 'USD' };
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
  urunKod:    '14%',
  aciklama:   '30%',
  miktar:     '8%',
  paraBirimi: '7%',
  birimFiyat: '13%',
  toplam:     '13%',
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
function TableColgroup({ satirBazliParaBirimi }: { satirBazliParaBirimi: boolean }) {
  return (
    <colgroup>
      <col style={{ width: COL.no }} />
      <col style={{ width: COL.marka }} />
      <col style={{ width: COL.urunKod }} />
      <col style={{ width: COL.aciklama }} />
      <col style={{ width: COL.miktar }} />
      {satirBazliParaBirimi && <col style={{ width: COL.paraBirimi }} />}
      <col style={{ width: COL.birimFiyat }} />
      <col style={{ width: COL.toplam }} />
      <col style={{ width: COL.teslimat }} />
    </colgroup>
  );
}

export default function TeklifSablonu({ teklif, totals }: TeklifSablonuProps) {
  const sembol = SEMBOL[teklif.paraBirimi] ?? teklif.paraBirimi;
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;
  const satirBazliParaBirimi = teklif.satirBazliParaBirimi ?? false;
  const satirParaToplamlari = hesaplamaMotoru.paraBirimineGoreToplamlar(teklif.satirlar, teklif.paraBirimi);
  const kullanilanParaKartlari = (['TRY', 'EUR', 'USD'] as const)
    .filter((pb) => teklif.satirlar.some((satir) => hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi) === pb))
    .map((pb) => {
      const hesap = hesaplamaMotoru.teklifToplamlariniHesapla({
        araToplam: satirParaToplamlari[pb],
        kdvOrani,
        iskontoOrani,
      });

      return {
        pb,
        short: PARA_BIRIMI_ETIKETI[pb],
        araToplam: hesap.araToplam,
        iskontoTutar: hesap.iskontoTutar,
        kdvTutar: hesap.kdvTutar,
        total: hesap.genelToplam,
      };
    });

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
        alignItems: 'stretch',
        width: '100%',
        minHeight: `${LOGO_OPT_H}px`,
        marginBottom: '3px',
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
          display: 'flex',
          alignItems: 'flex-start',
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
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          margin: 0,
          padding: '0 10px 0 0',
          lineHeight: 'normal',
          boxSizing: 'border-box',
        }}>
          <div style={{ fontWeight: 700, fontSize: '12.8px', color: C.navy, margin: 0, padding: 0, lineHeight: '1.18', letterSpacing: '-0.01em' }}>
            MEBA Pnömatik Hidrolik Makina Elektrik
          </div>
          <div style={{ fontWeight: 600, fontSize: '11.1px', color: C.navyLight, margin: '1px 0 2px 0', padding: 0, lineHeight: '1.15', letterSpacing: '0.01em' }}>
            Elektronik Mühendislik San. Tic. Ltd. Şti.
          </div>
          <div style={{ fontSize: '9.9px', lineHeight: '1.35', color: C.textSoft, margin: 0, padding: 0, letterSpacing: '0.01em' }}>
            Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv.<br />
            No:252/D Melikgazi / KAYSERİ
          </div>
        </div>

        {/* Teklif Bilgi Kutusu — "Hazırlayan" satırının alt bitişi logonun alt sınırı ile birebir */}
        <div style={{
          flex: '0 0 32%',
          maxWidth: '32%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
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
              padding: '5px 12px',
              margin: '0 0 4px 0',
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
                  <td style={{ fontSize: '10.1px', color: C.textMuted, padding: '0 0 3px 0', lineHeight: 1.2, letterSpacing: '0.03em' }}>Teklif No</td>
                  <td style={{ fontSize: '12.1px', fontWeight: 700, color: C.navy, padding: '0 0 3px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>
                    {teklif.teklifNo}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '10.1px', color: C.textMuted, padding: '0 0 3px 0', lineHeight: 1.2, letterSpacing: '0.03em' }}>Tarih</td>
                  <td style={{ fontSize: '11.8px', fontWeight: 600, color: C.text, padding: '0 0 3px 0', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
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
        marginBottom: '4px',
        ...noBreak,
      }}>
        <tbody>
          <tr>
            {/* Gönderen */}
            <td style={{
              width: '50%',
              padding: '5px 11px',
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
                marginBottom: '2px',
              }}>
              </div>
              <div style={{ fontWeight: 700, fontSize: '12.1px', color: C.navy, marginBottom: '1px', letterSpacing: '-0.01em' }}>
                MEBA Mekanik Ltd. Şti.
              </div>
              <div style={{ fontSize: '10.3px', lineHeight: '1.38', color: C.textMid }}>
                Tel: {formatPhone('03525020780')}<br />
                www.mebamekanik.com
              </div>
            </td>
            {/* Alıcı */}
            <td style={{
              width: '50%',
              padding: '5px 10px',
              verticalAlign: 'top',
            }}>
              <div style={{
                fontSize: '8.7px',
                fontWeight: 600,
                color: C.navy,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '3px',
              }}>
                Alıcı / To
              </div>
              <div style={{ fontWeight: 700, fontSize: '12.1px', color: C.navy, marginBottom: '2px', lineHeight: '1.3', letterSpacing: '-0.01em' }}>
                {teklif.cari.firmaAdi}
              </div>
              <div style={{ fontSize: '10.3px', lineHeight: '1.38', color: C.textMid, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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
              { label: 'Para Birimi / Currency',  value: satirBazliParaBirimi ? 'Satir Bazli (TL / EUR / USD)' : (sembol !== teklif.paraBirimi ? `${teklif.paraBirimi} (${sembol})` : teklif.paraBirimi) },
              { label: 'Ödeme Vadesi / Payment',  value: teklif.odemeVadesi || '45 Gün' },
              { label: 'KDV Oranı / VAT',         value: satirBazliParaBirimi ? 'Satır bazlı toplamlar' : (teklif.kdvOrani > 0 ? `%${teklif.kdvOrani}` : 'Hariç') },
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
        <TableColgroup satirBazliParaBirimi={satirBazliParaBirimi} />
        <thead>
          <tr style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6a 100%)`, color: C.white }}>
            {[
              { label: '#',           sub: '',            align: 'center' as const },
              { label: 'Marka',       sub: 'Brand',       align: 'center' as const },
              { label: 'Ürün Kodu',   sub: 'Item No',     align: 'left'   as const },
              { label: 'Açıklama',    sub: 'Description', align: 'left'   as const },
              { label: 'Miktar',      sub: 'Qty',         align: 'right'  as const },
              ...(satirBazliParaBirimi ? [{ label: 'Para Birimi', sub: 'Currency', align: 'center' as const }] : []),
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
            const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi);
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
                {satirBazliParaBirimi && (
                  <td style={{
                    padding: '6px 4px',
                    textAlign: 'center',
                    fontSize: '10.1px',
                    color: C.textMid,
                    borderBottom: `1px solid ${C.borderSoft}`,
                    borderRight: 'none',
                    whiteSpace: 'nowrap',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                  }}>
                    {PARA_BIRIMI_ETIKETI[satirPb]}
                  </td>
                )}
                {/* Birim Fiyat — nihai (bireysel iskonto uygulanmış) */}
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
                  {(() => {
                    const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                    return nihai !== 0
                      ? `${formatDisplayNumber(nihai, 2, 2)}${satirBazliParaBirimi ? ` ${PARA_BIRIMI_ETIKETI[satirPb]}` : ''}`
                      : '—';
                  })()}
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
                    ? `${formatDisplayNumber(satir.satirToplami, 2, 2)}${satirBazliParaBirimi ? ` ${PARA_BIRIMI_ETIKETI[satirPb]}` : ''}`
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
        marginTop: satirBazliParaBirimi ? '10px' : '4px',
        marginBottom: '14px',
        tableLayout: 'fixed',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: satirBazliParaBirimi ? `1px solid ${C.border}` : 'none',
        borderBottom: satirBazliParaBirimi ? `1px solid ${C.border}` : 'none',
        ...noBreak,
      }}>
        <TableColgroup satirBazliParaBirimi={satirBazliParaBirimi} />
        <tbody>
          {/* ── Genel Toplam Kartları (her iki mod için ortak) ──────────
               satirBazliParaBirimi aktifse  → per-currency kartlar
               satirBazliParaBirimi pasifse  → tek kart (teklif para birimi)
               Görsel tasarım her iki durumda da birebir aynı.           */}
          {/* ── Genel Toplam ─────────────────────────────────────────────
               satirBazliParaBirimi kapalı → tek satır, sağa yaslı kart
               satirBazliParaBirimi açık  → çok para birimi kart dizisi    */}
          {!satirBazliParaBirimi ? (() => {
            // Tek para birimi — native sütun hizası:
            //   colSpan=6 (no..birimFiyat) : Ara Toplam / İskonto / KDV döküm + etiket
            //   Toplam td               : yalnızca büyük rakam, padding: '6px 6px'
            //   Teslimat td             : boş
            // → Genel Toplam rakamı üstteki tüm Toplam sütun değerleriyle AYNI sütun,
            //   AYNI padding, AYNI textAlign — virgül hizası garantili.
            const hasDetail = iskontoOrani > 0 || kdvOrani > 0;
            return (
              <tr>
                {/* Sol 6 kolon: döküm + "Genel Toplam" etiketi */}
                <td colSpan={6} style={{ padding: hasDetail ? '5px 0 4px 0' : '5px 0', borderBottom: 'none', borderTop: 'none', verticalAlign: 'bottom' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ paddingRight: '6px' }}>
                      {hasDetail && (
                        <table style={{ borderCollapse: 'separate', borderSpacing: '0 1px', marginBottom: '4px', tableLayout: 'auto' }}>
                          <tbody>
                            <tr>
                              <td style={{ fontSize: '8.5px', lineHeight: 1.22, color: C.textSoft, textAlign: 'left', whiteSpace: 'nowrap', padding: '0 12px 0 0' }}>
                                Ara Toplam
                              </td>
                              <td style={{ fontSize: '8.5px', lineHeight: 1.22, color: C.textMid, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: 0, fontWeight: 600 }}>
                                {formatCurrency(araToplam, teklif.paraBirimi)}
                              </td>
                            </tr>
                            {iskontoOrani > 0 && (
                              <tr>
                                <td style={{ fontSize: '8.5px', lineHeight: 1.22, color: C.textSoft, textAlign: 'left', whiteSpace: 'nowrap', padding: '0 12px 0 0' }}>
                                  {`İskonto %${iskontoOrani}`}
                                </td>
                                <td style={{ fontSize: '8.5px', lineHeight: 1.22, color: C.textMid, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: 0, fontWeight: 600 }}>
                                  – {formatCurrency(iskontoTutar, teklif.paraBirimi)}
                                </td>
                              </tr>
                            )}
                            {kdvOrani > 0 && (
                              <tr>
                                <td style={{ fontSize: '8.5px', lineHeight: 1.22, color: C.textSoft, textAlign: 'left', whiteSpace: 'nowrap', padding: '0 12px 0 0' }}>
                                  {`KDV %${kdvOrani}`}
                                </td>
                                <td style={{ fontSize: '8.5px', lineHeight: 1.22, color: C.textMid, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: 0, fontWeight: 600 }}>
                                  + {formatCurrency(kdvTutar, teklif.paraBirimi)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      )}
                      {hasDetail && <div style={{ borderTop: '0.75px solid #d0dae4', marginBottom: '4px' }} />}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMid, lineHeight: 1, whiteSpace: 'nowrap' }}>
                          Genel Toplam
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                {/* Toplam kolonu — native hiza, padding satırlarla identik */}
                <td style={{ padding: '5px 6px', textAlign: 'right', verticalAlign: 'bottom', borderBottom: 'none', borderTop: 'none', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: genelToplam >= 1000000 ? '14.5px' : '16px', fontWeight: 900, lineHeight: 1.06, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em', color: C.navy }}>
                    {formatCurrency(genelToplam, teklif.paraBirimi)}
                  </span>
                </td>
                {/* Teslimat kolonu — boş */}
                <td style={{ borderBottom: 'none', borderTop: 'none' }} />
              </tr>
            );
          })() : (() => {
            // Çok para birimi — tam genişlik kart dizisi
            const hasDetail = iskontoOrani > 0 || kdvOrani > 0;
            const kartlar = kullanilanParaKartlari;
            return (
              <tr>
                <td colSpan={9} style={{ padding: '9px 10px 10px', borderBottom: 'none' }}>
                  <div
                    style={{
                      border: '0.6px solid #d0dce8',
                      borderRadius: '14px',
                      background: 'linear-gradient(180deg, #fbfdff 0%, #f0f4f9 100%)',
                      padding: '8px 9px 9px',
                      boxShadow: '0 2px 12px rgba(20,39,78,0.05)',
                    }}
                  >
                    <div style={{ width: '100%', margin: '0 auto' }}>
                      <table
                        style={{
                          width: '100%',
                          tableLayout: 'fixed',
                          borderCollapse: 'separate',
                          borderSpacing: '10px 0',
                        }}
                      >
                        <tbody>
                          <tr>
                            {kartlar.map((item) => (
                              <td
                                key={item.pb}
                                style={{
                                  width: `${100 / Math.max(kartlar.length, 1)}%`,
                                  verticalAlign: 'top',
                                  padding: 0,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: '14px',
                                    border: '0.5px solid #c6d4e2',
                                    background: 'linear-gradient(180deg, #ffffff 0%, #f3f7fb 100%)',
                                    boxShadow: '0 4px 20px rgba(20,39,78,0.07), 0 1px 4px rgba(20,39,78,0.04), inset 0 1px 0 rgba(255,255,255,0.95)',
                                    padding: hasDetail ? '8px 11px 7px' : '6px 11px 6px',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {/* Para birimi kodu — temiz, inline */}
                                  <div
                                    style={{
                                      fontSize: '7.5px',
                                      fontWeight: 700,
                                      letterSpacing: '0.14em',
                                      color: C.textMuted,
                                      marginBottom: '3px',
                                      textTransform: 'uppercase',
                                      textAlign: 'center',
                                      lineHeight: 1,
                                    }}
                                  >
                                    {item.pb === 'TRY' ? 'TL' : item.pb}
                                  </div>
                                  {/* Toplam rakamı */}
                                  <div
                                    style={{
                                      fontSize: item.total >= 1000000 ? '14.5px' : '16px',
                                      fontWeight: 900,
                                      lineHeight: 1.06,
                                      fontVariantNumeric: 'tabular-nums',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      letterSpacing: '-0.025em',
                                      color: C.navy,
                                      textAlign: 'center',
                                    }}
                                  >
                                    {formatCurrency(item.total, item.pb)}
                                  </div>
                                  {/* Ayraç + Detay satırları */}
                                  {hasDetail && <div style={{ borderTop: '0.75px solid #c8d8e8', margin: '5px 0 4px' }} />}
                                  {hasDetail && (
                                    <table
                                      style={{
                                        width: '100%',
                                        borderCollapse: 'separate',
                                        borderSpacing: '0 1px',
                                        marginBottom: 0,
                                      }}
                                    >
                                      <tbody>
                                        <tr>
                                          <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: C.textSoft, textAlign: 'left', whiteSpace: 'nowrap', padding: '0 8px 0 0' }}>
                                            Ara Toplam
                                          </td>
                                          <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: C.textMid, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: 0, fontWeight: 600 }}>
                                            {formatCurrency(item.araToplam, item.pb)}
                                          </td>
                                        </tr>
                                        {iskontoOrani > 0 && (
                                          <tr>
                                            <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: C.textSoft, textAlign: 'left', whiteSpace: 'nowrap', padding: '0 8px 0 0' }}>
                                              {`İskonto %${iskontoOrani}`}
                                            </td>
                                            <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: C.textMid, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: 0, fontWeight: 600 }}>
                                              – {formatCurrency(item.iskontoTutar, item.pb)}
                                            </td>
                                          </tr>
                                        )}
                                        {kdvOrani > 0 && (
                                          <tr>
                                            <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: C.textSoft, textAlign: 'left', whiteSpace: 'nowrap', padding: '0 8px 0 0' }}>
                                              {`KDV %${kdvOrani}`}
                                            </td>
                                            <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: C.textMid, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: 0, fontWeight: 600 }}>
                                              + {formatCurrency(item.kdvTutar, item.pb)}
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })()}
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

      {/* ── SİPARİŞİ VEREN — footer'ın hemen üstünde, sola hizalı ── */}
      <div id="kase-imza-block" style={{ display: 'flex', justifyContent: 'flex-start', padding: '6px 0 6px', marginTop: '44px', ...noBreak }}>
        <div style={{ fontSize: '10.2px', lineHeight: '1.45', color: C.textMid, textAlign: 'left', minWidth: '160px' }}>
          <div style={{ color: C.textMuted, marginBottom: '8px' }}>Siparişi Veren / Authorised Person</div>
          <div style={{ borderBottom: `1px solid ${C.border}`, marginBottom: '3px', height: '14px' }} />
          <div style={{ color: C.textMuted, marginBottom: '6px' }}>İsim / Name</div>
          <div style={{ borderBottom: `1px solid ${C.border}`, marginBottom: '3px', height: '14px' }} />
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
