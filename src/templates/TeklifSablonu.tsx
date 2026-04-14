import React from 'react';
import type { Teklif } from '../types';
import { formatCurrency, formatDate, formatDisplayNumber, formatTitleCaseTr, stripParantez } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';
import { TeklifTotalsSection } from './TeklifTotalsSection';
import { formatCariAdi } from '../utils/formatters';

const PARA_BIRIMI_ETIKETI: Record<string, string> = { TRY: 'TL', EUR: 'EUR', USD: 'USD' };
function firstLine(text: string): string {
  return text.split(/\r?\n/)[0]?.trim() ?? '';
}

const SEMBOL: Record<string, string> = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', CHF: '₣' };

// ── PDF Tasarım Sabitleri ─────────────────────────────────────────────────────
const C = {
  navy:        '#1a2f50',   // Koyu lacivert — metin, vurgu
  navyLight:   '#1e3668',   // İkincil lacivert
  navyBorder:  '#8eaabf',   // (#b6c4d6 → koyulaştırıldı, baskıda net çizgi)
  accent:      '#1e3668',   // Ürün kodu
  border:      '#bfc5cc',   // (#e2e6eb → koyulaştırıldı, baskıda kaybolan çizgiler için)
  borderSoft:  '#cdd3da',   // (#edf0f4 → koyulaştırıldı)
  rowAlt:      '#edf0f4',   // (#f5f7fa → hafif zebra, baskıda görünür)
  text:        '#1c1c1e',
  textMid:     '#2e2e30',   // (#3a3a3c → daha koyu)
  textSoft:    '#3c3c42',   // (#636366 → baskıda kaybolmayan koyu gri)
  textMuted:   '#4a4a52',   // (#8e8e93 → #888 seviyesinden çıkarıldı, belirgin koyu gri)
  white:       '#ffffff',
  bg:          '#e5e9ef',   // (#f1f4f8 → ödeme satırı bg, baskıda görünür)
  // ── Şerit sistemi (tüm mavi şeritlerde tek kaynak) ──────────────────
  stripeBg:    '#d6e4f5',   // Soft çelik mavi — desatüre, mat, göz yormaz
  stripeText:  '#1a2f50',   // Koyu lacivert — net, keskin, beyaz değil
  stripeSub:   '#2d4a61',   // (#4a6680 → koyulaştırıldı, Quotation yazısı baskıda net)
  stripeSep:   '#b8cfe8',   // Şerit içi ince ayraç (varsa)
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

/**
 * KompaktAntet — Sayfa 2+ için küçültülmüş antet.
 * Tam sayfa genişliğinde (210mm) bağımsız olarak render edilir,
 * ardından PDF motorunda içerik dilimleriyle compositing yapılır.
 */
export function KompaktAntet({ teklif }: { teklif: Teklif }) {
  // S: optH = LOGO_OPT_H × S ≈ metin bloğu yüksekliği
  // Metin bloğu: 3 satır (9px×1.25 + 7.8px×1.3 × 2) + 2×gap(2px) ≈ 35.5px
  // S = 35.5 / 64.87 ≈ 0.548
  const S = 0.548;
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
      backgroundColor: '#ffffff',
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
    } as React.CSSProperties}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        paddingBottom: '3.5mm',
        borderBottom: `1.5px solid ${C.stripeBg}`,
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
            }}
          />
        </div>
        {/* MEBA firma bilgileri — müşteri bilgisi yok */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: C.navy, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik San. Tic. Ltd. Şti.
          </span>
          <span style={{ fontSize: '7.8px', color: C.textSoft, lineHeight: 1.3 }}>
            Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ
          </span>
          <span style={{ fontSize: '7.8px', color: C.textSoft, lineHeight: 1.3 }}>
            Tel: 0352 502 07 80 &nbsp;·&nbsp; info@mebamekanik.com &nbsp;·&nbsp; www.mebamekanik.com
          </span>
        </div>
        {/* Teklif no + tarih */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: C.navy, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
            {teklif.teklifNo}
          </div>
          <div style={{ fontSize: '7.5px', color: C.textMuted, marginTop: 1, letterSpacing: '0.01em' }}>
            {formatDate(teklif.tarih)}
          </div>
        </div>
      </div>
    </div>
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
      {/* Referans: LOGO_OPT_H — logonun gerçek görsel yüksekliği.  */}
      {/* alignItems:'stretch' → 3 sütun da bu yüksekliğe gerilir.  */}
      {/* Sütun 2: space-between → isim üst / adres alt sınıra oturur*/}
      {/* Sütun 3: space-between → badge üst / tablo alt sınıra oturur*/}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        width: '100%',
        height: `${LOGO_OPT_H}px`,
        marginBottom: '9px',
        ...noBreak,
      }}>

        {/* ── Sütun 1: Logo ──────────────────────────────────────── */}
        {/* Optik clipping wrapper: PNG beyaz boşlukları kesilir,    */}
        {/* sadece MEBA harfleri + badge görünür.                     */}
        <div style={{
          flex: '0 0 31%',
          maxWidth: '31%',
          paddingRight: '12px',
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
                imageRendering: 'auto',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            />
          </div>
        </div>

        {/* ── Sütun 2: Firma bilgileri ────────────────────────────── */}
        {/* space-between → isim grubu logo üst sınırında,            */}
        {/* adres bloğu logo alt sınırında.                           */}
        <div style={{
          flex: '0 0 37%',
          maxWidth: '37%',
          paddingRight: '10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}>
          {/* Firma isim grubu — logonun üst sınırına oturur */}
          <div>
            <div style={{ fontWeight: 700, fontSize: '12.8px', color: C.navy, lineHeight: '1.18', letterSpacing: '-0.01em' }}>
              MEBA Pnömatik Hidrolik Makina Elektrik
            </div>
            <div style={{ fontWeight: 600, fontSize: '11.1px', color: C.navyLight, lineHeight: '1.15', letterSpacing: '0.01em' }}>
              Elektronik Mühendislik San. Tic. Ltd. Şti.
            </div>
          </div>
          {/* Adres — logonun alt sınırına oturur */}
          <div style={{ fontSize: '9.9px', lineHeight: '1.35', color: C.textSoft, letterSpacing: '0.01em' }}>
            Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv.<br />
            No:252/D Melikgazi / KAYSERİ
          </div>
        </div>

        {/* ── Sütun 3: Teklif bilgi bloğu ────────────────────────── */}
        {/* 175px anchor: badge üstte (logo üst), tablo altta (logo   */}
        {/* alt). space-between her ikisini sınırlara sabitler.        */}
        <div style={{
          flex: '0 0 32%',
          maxWidth: '32%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: '175px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}>
            {/* TEKLİF başlık etiketi — logo üst sınırına oturur */}
            {/* 14px @ lh1.2 + 3+3px padding = 22.8px badge yüksekliği */}
            <div style={{
              background: C.stripeBg,
              padding: '3px 12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '5px',
              lineHeight: 1.2,
            }}>
              <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.8px', color: C.stripeText }}>
                TEKLİF
              </span>
              <span style={{ fontSize: '9px', color: C.stripeSub, letterSpacing: '0.02em' }}>
                / Quotation
              </span>
            </div>
            {/* Teklif meta tablosu — logo alt sınırına oturur         */}
            {/* Hiyerarşi: Teklif No (güçlü) > Tarih (orta) > Hazırlayan (sade) */}
            {/* Etiketler küçük+soluk, değerler belirgin — toplam ~38.8px */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '42%' }} />
                <col style={{ width: '58%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ fontSize: '8px', color: C.textMuted, padding: '0 0 2px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Teklif No</td>
                  <td style={{ fontSize: '10.5px', fontWeight: 700, color: C.navy, padding: '0 0 2px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>
                    {teklif.teklifNo}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '8px', color: C.textMuted, padding: '0 0 2px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Tarih</td>
                  <td style={{ fontSize: '9.5px', fontWeight: 500, color: C.text, padding: '0 0 2px 0', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDate(teklif.tarih)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '8px', color: C.textMuted, padding: 0, lineHeight: 1.2, letterSpacing: '0.04em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '9px', fontWeight: 500, color: C.textSoft, padding: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
        marginBottom: '9px',
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
                marginBottom: '2px',
              }}>
                Gönderen / From
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
              padding: '8px 10px',
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
                {formatCariAdi(teklif.cari.firmaAdi)}
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
        <thead id="pdf-thead">
          <tr>
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
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  color: C.navy,
                  borderRight: 'none',
                  borderLeft: 'none',
                  borderBottom: '2px solid #5b8aac',
                  lineHeight: '1.3',
                  whiteSpace: 'nowrap',
                  background: 'transparent',
                }}
              >
                {col.label}
                {col.sub && (
                  <span style={{
                    display: 'block',
                    fontWeight: 500,
                    fontSize: '8.4px',
                    color: C.textSoft,
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
            // Her finansal satır: colSpan=6 (etiket sağa) + Toplam td (rakam sağa) + Teslimat td (boş)
            // Tüm rakamlar Toplam sütunuyla aynı padding/textAlign → virgül hizası garantili
            const hasDetail = iskontoOrani > 0 || kdvOrani > 0;
            const tdLabel = (pt: string, pb: string): React.CSSProperties => ({
              padding: `${pt} 0 ${pb} 0`, textAlign: 'right' as const,
              borderBottom: 'none', borderTop: 'none', verticalAlign: 'middle',
            });
            const tdVal = (pt: string, pb: string): React.CSSProperties => ({
              padding: `${pt} 6px ${pb} 6px`, textAlign: 'right' as const,
              borderBottom: 'none', borderTop: 'none', verticalAlign: 'middle',
              whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums' as const,
            });
            const tdEmpty: React.CSSProperties = { borderBottom: 'none', borderTop: 'none' };
            return (
              <>
                {/* Ara Toplam — yalnızca iskonto/KDV varsa */}
                {hasDetail && (
                  <tr>
                    <td colSpan={6} style={tdLabel('6px', '2px')}>
                      <span style={{ fontSize: '9px', fontWeight: 500, color: C.textSoft, whiteSpace: 'nowrap' }}>Ara Toplam</span>
                    </td>
                    <td style={{ ...tdVal('6px', '2px'), fontSize: '9px', fontWeight: 600, color: C.textMid }}>
                      {formatCurrency(araToplam, teklif.paraBirimi)}
                    </td>
                    <td style={tdEmpty} />
                  </tr>
                )}
                {/* İskonto */}
                {iskontoOrani > 0 && (
                  <tr>
                    <td colSpan={6} style={tdLabel('2px', '2px')}>
                      <span style={{ fontSize: '9px', fontWeight: 500, color: C.textSoft, whiteSpace: 'nowrap' }}>{`İskonto %${iskontoOrani}`}</span>
                    </td>
                    <td style={{ ...tdVal('2px', '2px'), fontSize: '9px', fontWeight: 600, color: C.textMid }}>
                      {`– ${formatCurrency(iskontoTutar, teklif.paraBirimi)}`}
                    </td>
                    <td style={tdEmpty} />
                  </tr>
                )}
                {/* KDV */}
                {kdvOrani > 0 && (
                  <tr>
                    <td colSpan={6} style={tdLabel('2px', '2px')}>
                      <span style={{ fontSize: '9px', fontWeight: 500, color: C.textSoft, whiteSpace: 'nowrap' }}>{`KDV %${kdvOrani}`}</span>
                    </td>
                    <td style={{ ...tdVal('2px', '2px'), fontSize: '9px', fontWeight: 600, color: C.textMid }}>
                      {`+ ${formatCurrency(kdvTutar, teklif.paraBirimi)}`}
                    </td>
                    <td style={tdEmpty} />
                  </tr>
                )}
                {/* Ayraç */}
                {hasDetail && (
                  <tr>
                    <td colSpan={6} style={{ padding: '4px 0', borderBottom: 'none', borderTop: 'none' }}>
                      <div style={{ borderTop: '0.75px solid #c8d5e4', marginRight: 0 }} />
                    </td>
                    <td style={{ padding: '4px 6px', borderBottom: 'none', borderTop: 'none' }}>
                      <div style={{ borderTop: '0.75px solid #c8d5e4' }} />
                    </td>
                    <td style={tdEmpty} />
                  </tr>
                )}
                {/* Genel Toplam */}
                <tr>
                  <td colSpan={6} style={tdLabel('3px', '6px')}>
                    <span style={{ fontSize: '8.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: C.textMid, whiteSpace: 'nowrap' }}>
                      Genel Toplam
                    </span>
                  </td>
                  <td style={{ ...tdVal('3px', '6px') }}>
                    <span style={{ fontSize: genelToplam >= 1000000 ? '14.5px' : '16px', fontWeight: 800, lineHeight: 1.06, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em', color: C.navy }}>
                      {formatCurrency(genelToplam, teklif.paraBirimi)}
                    </span>
                  </td>
                  <td style={tdEmpty} />
                </tr>
              </>
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
      {/* pdf-bottom-block: PDF pipeline bu bloğun DOM pozisyonunu      */}
      {/* ölçer ve son sayfanın mutlak altına sabitler. İçerik alanı    */}
      {/* (flex:1) biter, bu blok her zaman sayfanın alt kısmında kalır.*/}
      </div>{/* içerik alanı sonu */}

      <div id="pdf-bottom-block">

        {/* ── SİPARİŞİ VEREN — 2 sütunlu kompakt düzen ── */}
        <div style={{
          marginTop: '16px',
          padding: '6px 0 6px',
          ...noBreak,
        }}>
          <div style={{ color: C.textMuted, fontSize: '10.2px', marginBottom: '8px' }}>
            Siparişi Veren / Authorised Person
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>

            {/* Sol: İsim + Tarih (%40) — çizgiler sağdan 2cm kısa */}
            <div style={{ flex: '0 0 40%', fontSize: '10.2px', lineHeight: '1.45', color: C.textMid }}>
              <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.border}`, height: '22px' }} />
              <div style={{ color: C.textMuted, marginBottom: '8px', marginTop: '3px' }}>İsim / Name</div>
              <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.border}`, height: '22px' }} />
              <div style={{ color: C.textMuted, marginTop: '3px' }}>Tarih / Date</div>
            </div>

            {/* Sağ: İmza — paddingTop ile Tarih çizgisi seviyesine hizalanır */}
            {/* paddingTop: İsim çizgisi(22) + İsim etiketi bloğu(~26) = ~48px */}
            <div style={{ flex: '1', fontSize: '10.2px', lineHeight: '1.45', color: C.textMid, paddingTop: '48px' }}>
              <div style={{ width: '100px', marginLeft: '-2cm', borderBottom: `1px solid ${C.border}`, height: '22px' }} />
              <div style={{ color: C.textMuted, marginTop: '3px', marginLeft: '-2cm' }}>İmza / Signature</div>
            </div>

          </div>
        </div>

        {/* ── FOOTER (navy şerit) ── */}
        <div style={{
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

    </div>
  );
}
