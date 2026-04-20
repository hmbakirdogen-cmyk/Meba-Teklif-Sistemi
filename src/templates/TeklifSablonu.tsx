import React from 'react';
import type { Teklif } from '../types';
import { formatDate, formatDisplayNumber, formatTitleCaseTr, stripParantez } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';
import { formatCariAdi } from '../utils/formatters';
import { FinansalOzetKartIci } from '../components/FinansalOzetKartIci';
import {
  CELL_PAD as DOC_CELL_PAD,
  DOCUMENT_BRAND as DOC_BRAND,
  DOCUMENT_ROOT_STYLE,
  FOOTER_BAR_STYLE,
  NOTES_BOX_STYLE,
  PARA_BIRIMI_ETIKETI as DOC_PARA_BIRIMI_ETIKETI,
  SIGNATURE_SECTION_STYLE,
  SEMBOL as DOC_SEMBOL,
  TABLE_HEAD_SUBLABEL_STYLE,
  TABLE_STYLE,
  TABLE_TITLE_STYLE,
  TableColgroup as SharedTableColgroup,
  getTableHeadCellStyle,
} from './teklifDocumentShared';

const PARA_BIRIMI_ETIKETI = DOC_PARA_BIRIMI_ETIKETI;
function firstLine(text: string): string {
  return text.split(/\r?\n/)[0]?.trim() ?? '';
}

const SEMBOL = DOC_SEMBOL;

// ── Marka Mavisi — MEBA logosundaki "BA" harflerinden alınan renk ailesi ─────
// Teklif badge, genel toplam kartı ve alt şeritlerde ORTAK kullanılır.
// Premium kahverengi ton ailesi — zengin kakao/konyak gradient.
const BRAND = DOC_BRAND;

// ── PDF Tasarım Sabitleri ─────────────────────────────────────────────────────
const C = {
  navy:        '#1A2B42',   // Derin lacivert — vurgu, başlık
  navyLight:   '#2E4460',   // İkincil lacivert
  navyBorder:  '#D5D3CF',   // Tablo başlık alt çizgisi — sıcak gri
  accent:      '#1A2B42',   // Ürün kodu
  border:      '#E2E0DC',   // Sıcak açık gri — birincil border
  borderSoft:  '#EDEBE8',   // İkincil border — çok hafif
  rowAlt:      '#F7F6F4',   // Kalem satır alt zemin — sıcak kırık beyaz
  text:        '#2C2C2E',   // Koyu antrasit — ana metin
  textMid:     '#4A4A4E',   // Birincil gövde metni
  textSoft:    '#717176',   // İkincil metin
  textMuted:   '#9B9BA0',   // Üçüncül metin
  white:       '#FAFAF8',   // Kırık beyaz
  bg:          '#F7F6F4',   // Not alanı — sıcak açık zemin
  // ── Şerit sistemi ────────────────────────────────────────────────────
  stripeBg:    '#F0EFEC',   // Sıcak nötr zemin
  stripeText:  '#2C2C2E',   // Şerit metin — antrasit
  stripeSub:   '#4A4A4E',   // Alt metin
  stripeSep:   '#E2E0DC',   // Şerit ayraç — sıcak gri
};

// Sütun genişlikleri — içerik bazlı otomatik boyutlandırma
// İçerik analizi (190mm kullanılabilir genişlik):
//   NO        : "01"–"99"            →  3%  ≈  5.7mm
//   Marka     : "FESTO","BOSCH REX"  →  7%  ≈ 13.3mm
//   Ürün Kodu : "CP96SDB80-200C"     → 16%  ≈ 30.4mm  — asla kırpılmaz, sarılır
//   Açıklama  : açık metin (esnek)   → 31%  ≈ 58.9mm  — esnek ana kolon
//   Miktar    : "100 Adet"           →  6%  ≈ 11.4mm
//   Birim Fyt : "1.234,56"           → 13%  ≈ 24.7mm
//   Toplam    : "12.345,67"          → 13%  ≈ 24.7mm
//   Teslimat  : "5-7 İş Günü"        →  8%  ≈ 15.2mm
//   Toplam                             97%
const COL = {
  no:         '3%',
  marka:      '7%',
  urunKod:    '16%',
  aciklama:   '31%',
  miktar:     '6%',
  birimFiyat: '13%',
  toplam:     '13%',
  teslimat:   '8%',
};

// Satır bazlı para birimi aktifken kullanılan sütun genişlikleri.
// "Para Birimi" başlığı (11 karakter @ 9.8px) 11%'de (≈80px) sığar.
// Toplam: 3+7+15+26+6+11+12+12+8 = 100%
const COL_PB = {
  no:         '3%',
  marka:      '7%',
  urunKod:    '15%',
  aciklama:   '26%',    // daraltıldı: Para Birimi sütununa alan açıldı
  miktar:     '6%',
  paraBirimi: '11%',    // "Para Birimi" başlık metninin sığması için
  birimFiyat: '12%',
  toplam:     '12%',
  teslimat:   '8%',
};

const noBreak: React.CSSProperties = {
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
};

// ── Kalem Satır Sistemi ────────────────────────────────────────────────────
// Her satır ayrı çerçeveli kart — temiz beyaz, ince gri border, hafif gölge
const ROW_CARD = {
  bg:        '#FFFFFF',
  borderClr: '#E8E6E3',
  radius:    '6px',
  shadow:    '0 1px 2px rgba(0,0,0,0.03)',
} as const;

type CellPos = 'first' | 'mid' | 'last';
function rcCell(pos: CellPos, idx: number = 0): React.CSSProperties {
  const b = `0.75px solid ${ROW_CARD.borderClr}`;
  const r = ROW_CARD.radius;
  return {
    // background on <td> (not <tr>) — html2canvas 1.4.1 doesn't render <tr> backgrounds
    background:              idx % 2 === 0 ? ROW_CARD.bg : C.rowAlt,
    printColorAdjust:        'exact' as const,
    WebkitPrintColorAdjust:  'exact' as const,
    borderTop:               b,
    borderBottom:            b,
    borderLeft:              pos === 'first' ? b : 'none',
    borderRight:             pos === 'last'  ? b : 'none',
    borderTopLeftRadius:     pos === 'first' ? r : 0,
    borderBottomLeftRadius:  pos === 'first' ? r : 0,
    borderTopRightRadius:    pos === 'last'  ? r : 0,
    borderBottomRightRadius: pos === 'last'  ? r : 0,
    boxShadow:               pos === 'first' ? ROW_CARD.shadow : 'none',
  };
}

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
  FILE_HEIGHT:   128,            // SC=1.31 — sütun genişliği dolduracak max (~128px); html2canvas %76 native res
} as const;

const LOGO_FILE_W   = LOGO.FILE_HEIGHT * LOGO.PNG_AR;                                // ~248.17 px (FILE_HEIGHT=113)
const LOGO_OPT_H    = LOGO.FILE_HEIGHT * (LOGO.OPT_BOT_FRAC - LOGO.OPT_TOP_FRAC);    // ~74.67 px
const LOGO_OPT_W    = LOGO_FILE_W      * (LOGO.OPT_RIGHT_FRAC - LOGO.OPT_LEFT_FRAC); // ~221.22 px
const LOGO_OPT_TOP  = -(LOGO.FILE_HEIGHT * LOGO.OPT_TOP_FRAC);                       // ~-11.62 px
const LOGO_OPT_LEFT = -(LOGO_FILE_W      * LOGO.OPT_LEFT_FRAC);                      // ~-10.96 px
// ─────────────────────────────────────────────────────────────────────────────

interface TeklifSablonuProps {
  teklif: Teklif;
  totals: TeklifToplam;
}

// temizleAciklama kaldırıldı — formatAciklama (formatters.ts) ortak kullanılır.

/** Ortak colgroup — tablo hizalamayı garanti eder */
function TableColgroup({ satirBazliParaBirimi }: { satirBazliParaBirimi: boolean }) {
  const cols = satirBazliParaBirimi ? COL_PB : COL;
  return (
    <colgroup>
      <col style={{ width: cols.no }} />
      <col style={{ width: cols.marka }} />
      <col style={{ width: cols.urunKod }} />
      <col style={{ width: cols.aciklama }} />
      <col style={{ width: cols.miktar }} />
      {satirBazliParaBirimi && <col style={{ width: COL_PB.paraBirimi }} />}
      <col style={{ width: cols.birimFiyat }} />
      <col style={{ width: cols.toplam }} />
      <col style={{ width: cols.teslimat }} />
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
              imageRendering:          'high-quality' as any,
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
        ...DOCUMENT_ROOT_STYLE,
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
                imageRendering:         'high-quality' as any,
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
            overflow: 'hidden',
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
                {/* ── Teklif No — primary (en güçlü) ──
                     paddingTop:2 → üst nefes alanı
                     paddingBottom:1 → Row2 bottom 1px'e düşürüldü
                     Toplam dikey padding: (2+1)+(1+0)+(0) = 4px — öncekiyle AYNI (taşma yok) */}
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '2px 0 1px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Teklif No</td>
                  <td style={{ fontSize: '12.1px', fontWeight: 800, color: C.navy, padding: '2px 0 1px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>
                    {teklif.teklifNo}
                  </td>
                </tr>
                {/* ── Tarih — secondary ── */}
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Tarih</td>
                  <td style={{ fontSize: '10.9px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDate(teklif.tarih)}
                  </td>
                </tr>
                {/* ── Hazırlayan — tertiary ── */}
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

      {/* ══ GÖNDEREN / ALICI ════════════════════════════════════ */}
      {/* ROW_CARD tasarım diliyle aynı aileden premium bilgi paneli  */}
      <div style={{
        display: 'flex',
        width: '100%',
        background: '#FAFAF8',
        marginBottom: '8px',
        columnGap: '16px',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        ...noBreak,
      }}>
        {/* Gönderen */}
        <div style={{
          width: '50%',
          padding: '4px 0 8px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            fontSize: '9.5px',
            fontWeight: 600,
            color: C.textMuted,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            marginBottom: '8px',
            paddingBottom: '5px',
            borderBottom: `0.75px solid ${C.border}`,
            lineHeight: 1.2,
          }}>
            Gönderen / From
          </div>
          <div style={{ fontWeight: 800, fontSize: '13.9px', color: C.navy, marginBottom: '2px', letterSpacing: '-0.015em' }}>
            MEBA Mekanik Ltd. Şti.
          </div>
          <div style={{ fontSize: '11.8px', lineHeight: '1.38', color: C.textMid }}>
            Tel: {formatPhone('03525020780')}<br />
            www.mebamekanik.com
          </div>
        </div>
        {/* Alıcı */}
        <div data-alan="musteri" style={{
          width: '50%',
          padding: '4px 0 8px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            fontSize: '9.5px',
            fontWeight: 600,
            color: C.textMuted,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            marginBottom: '8px',
            paddingBottom: '5px',
            borderBottom: `0.75px solid ${C.border}`,
            lineHeight: 1.2,
          }}>
            Alıcı / To
          </div>
          <div style={{ fontWeight: 800, fontSize: '13.9px', color: C.navy, marginBottom: '2px', lineHeight: '1.3', letterSpacing: '-0.015em' }}>
            {formatCariAdi(teklif.cari.firmaAdi)}
          </div>
          <div style={{ fontSize: '11.8px', lineHeight: '1.38', color: C.textMid, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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
      <div data-alan="ayarlar" style={{
        display: 'flex',
        width: '100%',
        gap: '5px',
        marginBottom: '8px',
        ...noBreak,
      }}>
        {[
          { tr: 'Para Birimi',   en: 'Currency',      value: satirBazliParaBirimi ? 'Satır Bazlı' : (sembol !== teklif.paraBirimi ? `${teklif.paraBirimi} (${sembol})` : teklif.paraBirimi) },
          { tr: 'Ödeme Vadesi',  en: 'Payment',       value: teklif.odemeVadesi || '45 Gün' },
          { tr: 'KDV Oranı',     en: 'VAT',           value: satirBazliParaBirimi ? 'Satır Bazlı' : (teklif.kdvOrani > 0 ? `%${teklif.kdvOrani}` : 'Hariç') },
          { tr: 'Kur',           en: 'Exchange Rate',  value: 'TCMB Fatura' },
          { tr: 'Geçerlilik',    en: 'Validity',      value: teklif.gecerlilikSuresi ?? '1 Hafta' },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: '7px 10px 8px',
              textAlign: 'center',
              background: 'linear-gradient(180deg, #F8F7F5 0%, #F0EFEC 100%)',
              border: `0.75px solid ${C.border}`,
              borderRadius: '8px',
              boxShadow: 'none',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          >
            <div style={{
              fontSize: '9.5px',
              fontWeight: 700,
              color: C.textSoft,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {item.tr}
              <span style={{ fontWeight: 400, opacity: 0.65 }}> / {item.en}</span>
            </div>
            <div style={{
              fontWeight: 700,
              fontSize: '13px',
              color: C.navy,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {item.value}
            </div>
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
        <SharedTableColgroup satirBazliParaBirimi={satirBazliParaBirimi} />
        <thead id="pdf-thead">
          <tr>
            {[
              { label: '#',           sub: '',            align: 'center' as const },
              { label: 'Marka',       sub: 'Brand',       align: 'center' as const },
              { label: 'Ürün Kodu',   sub: 'Item No',     align: 'left'   as const },
              { label: 'Açıklama',    sub: 'Description', align: 'left'   as const },
              { label: 'Miktar',      sub: 'Qty',         align: 'left'   as const },
              ...(satirBazliParaBirimi ? [{ label: 'Para Birimi', sub: 'Currency', align: 'center' as const, fontSize: '9.8px' }] : []),
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
            <td colSpan={satirBazliParaBirimi ? 9 : 8} style={{ height: '5px', padding: 0, border: 'none', background: 'transparent' }} />
          </tr>
          {teklif.satirlar.map((satir, idx) => {
            const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi);
            return (
              <tr
                key={satir.id}
                data-satir-id={satir.id}
                style={{
                  // background on <td> via rcCell — html2canvas 1.4.1 skips <tr> backgrounds
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                }}
              >
                {/* No */}
                <td style={{
                  padding: DOC_CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: C.textMuted,
                  whiteSpace: 'nowrap',
                  ...rcCell('first', idx),
                }}>
                  {String(idx + 1).padStart(2, '0')}
                </td>
                {/* Marka */}
                <td style={{
                  padding: DOC_CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: C.textMid,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  ...rcCell('mid', idx),
                }}>
                  {satir.marka || '—'}
                </td>
                {/* Ürün Kodu — asla kırpılmaz; sığmazsa alt satıra geçer */}
                <td style={{
                  padding: DOC_CELL_PAD,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: C.accent,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  verticalAlign: 'middle',
                  letterSpacing: '-0.1px',
                  ...rcCell('mid', idx),
                }}>
                  {satir.urunKod || '—'}
                </td>
                {/* Açıklama — esnek; sığmazsa alt satıra geçer, asla kısaltılmaz */}
                <td style={{
                  padding: DOC_CELL_PAD,
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: C.textMid,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  verticalAlign: 'middle',
                  ...rcCell('mid', idx),
                }}>
                  {firstLine(stripParantez(satir.urunAdi))}
                </td>
                {/* Miktar */}
                <td style={{
                  padding: DOC_CELL_PAD,
                  verticalAlign: 'middle',
                  fontSize: '11.5px',
                  color: C.textMid,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  ...rcCell('mid', idx),
                }}>
                  {satir.miktar !== 0 ? (
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                      <span style={{ width: '50%', textAlign: 'right', paddingRight: '4px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {formatDisplayNumber(satir.miktar, 0, 4)}
                      </span>
                      <span style={{ width: '50%', textAlign: 'left', paddingLeft: '4px', opacity: 0.68, fontSize: '0.85em' }}>
                        {/^adet$/i.test(satir.birim?.trim() ?? '') || !satir.birim ? 'Ad.' : satir.birim}
                      </span>
                    </div>
                  ) : '—'}
                </td>
                {satirBazliParaBirimi && (
                  <td style={{
                    padding: DOC_CELL_PAD,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '11px',
                    color: C.textMid,
                    whiteSpace: 'nowrap',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    ...rcCell('mid', idx),
                  }}>
                    {PARA_BIRIMI_ETIKETI[satirPb]}
                  </td>
                )}
                {/* Birim Fiyat — nihai (bireysel iskonto uygulanmış) */}
                <td style={{
                  padding: DOC_CELL_PAD,
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  fontSize: '11.5px',
                  color: C.textMid,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  ...rcCell('mid', idx),
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
                  padding: DOC_CELL_PAD,
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: C.navy,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  ...rcCell('mid', idx),
                }}>
                  {satir.satirToplami !== 0
                    ? `${formatDisplayNumber(satir.satirToplami, 2, 2)}${satirBazliParaBirimi ? ` ${PARA_BIRIMI_ETIKETI[satirPb]}` : ''}`
                    : '—'}
                </td>
                {/* Teslimat — kısa metin; sığmazsa alt satıra geçer, asla kırpılmaz */}
                <td style={{
                  padding: DOC_CELL_PAD,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '11px',
                  color: C.textSoft,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  ...rcCell('last', idx),
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
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        ...noBreak,
      } as React.CSSProperties}>
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
            // Tek para birimi — her iki durum için aynı kart yapısı:
            //
            // Tablo sütunları (COL, 8 kolon):
            //   1:No  2:Marka  3:UrunKod  4:Aciklama  |  5:Miktar  6:BirimFiyat  7:Toplam  8:Teslimat
            //   3%    6%       14%        30%          |  7%        13%           13%       10%
            //
            // colSpan={4} (sütun 1-4) → boş spacer
            // colSpan={4} (sütun 5-8) → kart (sonuna kadar uzanır)
            //
            // Kart paddingRight=7px → Toplam sütunu ile hizalı (ürün td padding: '7px 7px')
            const hasDetail = iskontoOrani > 0 || kdvOrani > 0;

            const kartStyle: React.CSSProperties = {
              boxSizing: 'border-box',
              border: '0.75px solid #1A2B42',
              borderRadius: '8px',
              background: 'linear-gradient(180deg, #1E3350 0%, #152740 55%, #0F1D30 100%)',
              boxShadow: '0 2px 8px rgba(15,25,40,0.10)',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            };

            const fmtN = (n: number) =>
              n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Satır renkleri — açık zemin için koyu varyantlar
            const pbLabel = teklif.paraBirimi === 'TRY' ? 'TL' : teklif.paraBirimi;

            // ── Detay satırı (3 kolon: etiket | işaret | rakam) ───────────────────────
            const detayRow = (
              label: string, value: number, color: string, sign: '' | '–' | '+',
            ) => {
              const s   = fmtN(value);
              const ci  = s.lastIndexOf(',');
              const int = ci >= 0 ? s.slice(0, ci) : s;
              const dec = ci >= 0 ? s.slice(ci)    : '';
              return (
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2px' }}>
                  <span style={{ flex: 1, paddingLeft: '3px', fontSize: '8.5px', lineHeight: 1.2, color, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {label}
                  </span>
                  <span style={{ width: 8, flexShrink: 0, textAlign: 'right', fontSize: '8.5px', lineHeight: 1.2, color, fontWeight: sign ? 700 : undefined }}>
                    {sign || null}
                  </span>
                  {/* Rakam: [tam kısım flex:1 sağ-hizalı] + [ondalık 16px sabit] → virgüller aynı eksende */}
                  <span style={{ width: 64, flexShrink: 0, display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ flex: 1, textAlign: 'right', fontSize: '8.5px', lineHeight: 1.2, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color, whiteSpace: 'nowrap' }}>
                      {int}
                    </span>
                    <span style={{ width: 16, flexShrink: 0, fontSize: '8.5px', lineHeight: 1.2, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color, whiteSpace: 'nowrap' }}>
                      {dec}
                    </span>
                  </span>
                  {/* Hizalama spacer — total ile aynı eksen (Teslimat genişliği + Toplam padding) */}
                  <div style={{ width: 'calc(23.26% + 7px)', flexShrink: 0 }} />
                </div>
              );
            };

            return (
              <tr>
                {/* Sütun 1-4: boş spacer */}
                <td colSpan={4} style={{ borderTop: 'none', borderBottom: 'none' }} />

                {/* Sütun 5-8: kart (sayfa sonuna kadar uzanır) */}
                <td colSpan={4} style={{ padding: '8px 0 10px', borderTop: 'none', borderBottom: 'none', verticalAlign: 'top' }}>
                  {/* Spacer hesabı:
                      Teslimat sütunu = COL.teslimat = 10% tablo genişliği
                      colSpan=4 içeriği = (7+13+13+10)% = 43% tablo genişliği
                      Teslimat olarak kart içi % = 10/43×100 ≈ 23.26%
                      + Toplam td sağ padding 7px
                      → rakam sağ kenarı = Toplam sütunu sağ kenarı − 7px  ✓        */}
                  {!hasDetail ? (
                    // ── Sade tek-toplam: etiket 2 satır + rakam dikey ortalı ─────
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      padding: '12px 0 12px 12px',
                      ...kartStyle,
                    }}>
                      {/* Sol: etiket 2 satırda — Türkçe büyük, İngilizce alt metin */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: BRAND.text, lineHeight: 1 }}>Genel Toplam</span>
                        <span style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.04em', color: BRAND.textSub, lineHeight: 1 }}>Grand Total</span>
                      </div>
                      {/* Esnek boşluk */}
                      <div style={{ flex: 1 }} />
                      {/* Rakam dikey ortalı */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px', flexShrink: 0 }}>
                        <span style={{ fontSize: '9px', color: BRAND.textLabel, lineHeight: 1, alignSelf: 'flex-end', paddingBottom: '1px' }}>{sembol}</span>
                        <span style={{ fontSize: genelToplam >= 1e6 ? '14px' : '17px', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: BRAND.text, whiteSpace: 'nowrap' }}>
                          {fmtN(genelToplam)}
                        </span>
                      </div>
                      {/* Hizalama spacer */}
                      <div style={{ width: '23.26%', flexShrink: 0 }} />
                    </div>
                  ) : (
                    // ── Detaylı kart: başlık + satırlar + ayraç + toplam ─────────
                    <div style={{ padding: '8px 0 8px 12px', ...kartStyle }}>
                      {/* Başlık */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: BRAND.text, lineHeight: 1 }}>Genel Toplam</span>
                        <span style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.04em', color: BRAND.textSub, lineHeight: 1 }}>Grand Total</span>
                      </div>
                      {/* Detay satırları */}
                      {detayRow('Ara Toplam', araToplam, BRAND.textSub, '')}
                      {iskontoOrani > 0 && detayRow(`İskonto %${iskontoOrani}`, iskontoTutar, '#fca5a5', '–')}
                      {kdvOrani    > 0 && detayRow(`KDV %${kdvOrani}`,          kdvTutar,     '#86efac', '+')}
                      {/* Ayraç */}
                      <div style={{ borderTop: `0.75px solid ${BRAND.separator}`, margin: '5px 0 4px' }} />
                      {/* Alt: PB etiketi (sol) + büyük toplam + hizalama spacer */}
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: BRAND.textSub, lineHeight: 1 }}>
                          {pbLabel}
                        </span>
                        <div style={{ flex: 1 }} />
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px', flexShrink: 0 }}>
                          <span style={{ fontSize: '9px', color: BRAND.textLabel, lineHeight: 1, alignSelf: 'flex-end', paddingBottom: '1px' }}>{sembol}</span>
                          <span style={{ fontSize: genelToplam >= 1e6 ? '14px' : '17px', fontWeight: 900, lineHeight: 1.06, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: BRAND.text, whiteSpace: 'nowrap' }}>
                            {fmtN(genelToplam)}
                          </span>
                        </div>
                        {/* Hizalama spacer */}
                        <div style={{ width: 'calc(23.26% + 7px)', flexShrink: 0 }} />
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })() : (() => {
            // Çok para birimi — sabit boyutlu kart dizisi
            // A4 içerik genişliği: 210mm − 2×10mm = ~718px
            //   <td> padding 10px×2 = 20px → td iç: 698px
            //   wrapper padding  8px×2 = 16px → wrapper iç: 682px
            // 3 × 220px + 2 × 8px = 676px ≤ 682px ✓  (6px nefes payı)
            const kartlar  = kullanilanParaKartlari;
            const KART_W   = 220; // px — sabit genişlik
            const KART_H   = 86;  // px — sabit yükseklik
            const KART_GAP = 8;   // px — kartlar arası

            return (
              <tr>
                <td colSpan={9} style={{ padding: '8px 10px 10px', borderBottom: 'none' }}>
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

      {/* ══ NOT ALANI ════════════════════════════════════════════ */}
      {teklif.notlar && (
        <div data-alan="notlar" style={{ ...NOTES_BOX_STYLE, ...noBreak }}>
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
        <div style={SIGNATURE_SECTION_STYLE}>
          <div style={{ color: C.textMuted, fontSize: '11.7px', fontWeight: 500, letterSpacing: '0.01em', marginBottom: '9px' }}>
            Siparişi Veren / Authorised Person
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>

            {/* Sol: İsim + Tarih (%40) — çizgiler sağdan 2cm kısa */}
            <div style={{ flex: '0 0 40%', fontSize: '11.7px', lineHeight: '1.45', color: C.textMid }}>
              <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.border}`, height: '25px' }} />
              <div style={{ color: C.textMuted, marginBottom: '9px', marginTop: '3px' }}>İsim / Name</div>
              <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.border}`, height: '25px' }} />
              <div style={{ color: C.textMuted, marginTop: '3px' }}>Tarih / Date</div>
            </div>

            {/* Sağ: İmza — paddingTop ile Tarih çizgisi seviyesine hizalanır */}
            {/* paddingTop: İsim çizgisi(25) + İsim etiketi bloğu(~3+17+9=29) = ~54px */}
            <div style={{ flex: '1', fontSize: '11.7px', lineHeight: '1.45', color: C.textMid, paddingTop: '54px' }}>
              <div style={{ width: '115px', marginLeft: '-2cm', borderBottom: `1px solid ${C.border}`, height: '25px' }} />
              <div style={{ color: C.textMuted, marginTop: '3px', marginLeft: '-2cm' }}>İmza / Signature</div>
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
