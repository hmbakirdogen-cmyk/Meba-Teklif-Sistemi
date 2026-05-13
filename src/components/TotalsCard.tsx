/**
 * TotalsCard — Genel Toplam kartı (single-currency mode için)
 *
 * Hizalama prensibi:
 *   • Kart, kalem tablosunun "Toplam" kolonu ile aynı sağ kenara hizalanır.
 *     Bunu sağlamak için kart `TableColgroup` ile colspan=5 (aciklama..toplam)
 *     hücre içinde render edilir; col 9 (teslimat) boş bırakılır.
 *   • Tüm parasal değerler (Ara Toplam / KDV / İskonto / Genel Toplam)
 *     paylaşılan `--total-amount-pr` padding-right ile aynı X'te biter.
 *   • Detay rakamları `--total-amount-font-size` (= tablo "Toplam" sütunu
 *     ile aynı = LINE_ITEM_METRICS.baseFontSizePx) kullanır.
 *   • Genel Toplam rakamı daha vurgulu (`--total-grand-font-size`) ama aynı
 *     sağ ekseni paylaşır.
 *   • Para birimi kısaltması absolute top-right'ta küçük rozet olarak durur,
 *     hiçbir koşulda rakamların üstüne binemez (z-index:0 + pointer-events).
 *   • KDV/iskonto açılıp kapandığında layout pozisyonları DEĞİŞMEZ — alt
 *     "Genel Toplam" satırı her zaman aynı kart içinde aynı sağ X'te durur,
 *     üst alana detay satırları akar.
 */
import type { CSSProperties } from 'react';
import {
  DOCUMENT_BRAND,
  HEADER_SURFACE,
  LINE_ITEM_METRICS,
  SEMBOL,
} from '../templates/teklifDocumentShared';

export interface TotalsCardProps {
  araToplam: number;
  iskontoOrani?: number;
  iskontoTutar?: number;
  kdvOrani?: number;
  kdvTutar?: number;
  genelToplam: number;
  paraBirimi: string;
  /** light: krem zemin (Paged + Inline editor), dark: lacivert gradient (Sablonu) */
  variant?: 'light' | 'dark';
  /**
   * Rakamların sağ kenarının kart sağından uzaklığı (px). Kart çerçevesi
   * sayfanın tüm sağına uzasa bile bu değer sayesinde rakamlar tablonun
   * "Toplam" kolonu değer X'iyle hizalanır.
   * `computeTotalsAmountRightOffset(rows, satirBazli)` ile hesaplanır.
   * Verilmezse CELL_PAD (4px) kullanılır.
   */
  amountRightOffsetPx?: number;
}

// Paylaşılan ölçüler — tek kaynak (tablo "Toplam" kolonu ile birebir eşleşir)
const AMOUNT_FS    = `${LINE_ITEM_METRICS.baseFontSizePx}px`;        // 11px
const AMOUNT_FW    = 700;
const LABEL_FS     = '8.5px';
const PB_LABEL_FS  = '7.5px';
const SYMBOL_FS    = '12px';

const PB_SHORT: Record<string, string> = {
  TRY: 'TL', EUR: 'EUR', USD: 'USD', GBP: 'GBP', CHF: 'CHF',
};

export function TotalsCard({
  araToplam,
  iskontoOrani = 0,
  iskontoTutar = 0,
  kdvOrani     = 0,
  kdvTutar     = 0,
  genelToplam,
  paraBirimi,
  variant = 'light',
  amountRightOffsetPx,
}: TotalsCardProps) {
  const amountRightPx = `${amountRightOffsetPx ?? LINE_ITEM_METRICS.cellPaddingXpx}px`;
  const isDark    = variant === 'dark';
  const sembol    = SEMBOL[paraBirimi]   ?? paraBirimi;
  const pbLabel   = PB_SHORT[paraBirimi] ?? paraBirimi;
  const hasDetail = iskontoOrani > 0 || kdvOrani > 0;
  const fmtN      = (n: number) =>
    n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const cl = isDark
    ? {
        bg:        'linear-gradient(180deg, #1E3350 0%, #152740 55%, #0F1D30 100%)',
        border:    '#1A2B42',
        text:      DOCUMENT_BRAND.text,
        textSub:   DOCUMENT_BRAND.textSub,
        textLabel: DOCUMENT_BRAND.textLabel,
        separator: DOCUMENT_BRAND.separator,
        shadow:    '0 2px 8px rgba(15,25,40,0.10)',
        negRed:    '#fca5a5',
        posGreen:  '#86efac',
      }
    : {
        bg:        HEADER_SURFACE.bg,
        border:    HEADER_SURFACE.border,
        text:      HEADER_SURFACE.text,
        textSub:   HEADER_SURFACE.textSub,
        textLabel: HEADER_SURFACE.textLabel,
        separator: HEADER_SURFACE.separator,
        shadow:    HEADER_SURFACE.shadow,
        negRed:    HEADER_SURFACE.negRed,
        posGreen:  HEADER_SURFACE.posGreen,
      };

  const grandFs = genelToplam >= 1e6 ? '15px' : '17px';

  // ── Detay satır renderer ────────────────────────────────────────────────
  // sol: etiket (ince) | sağ: rakam (tablo "Toplam" font + sağ pad eşleşik)
  const detailRow = (
    label: string,
    value: number,
    color: string,
    sign: '' | '–' | '+',
  ): React.ReactNode => (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      marginBottom: '2px',
    }}>
      <span style={{
        flex: 1,
        paddingLeft: '8px',
        fontSize: LABEL_FS,
        lineHeight: 1.2,
        color: cl.textSub,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: AMOUNT_FS,
        fontWeight: AMOUNT_FW,
        lineHeight: 1.2,
        color,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        textAlign: 'right',
        paddingRight: amountRightPx,
      }}>
        {sign && <span style={{ marginRight: 2 }}>{sign}</span>}
        {fmtN(value)}
      </span>
    </div>
  );

  const baseStyle: CSSProperties = {
    position: 'relative',
    border: `0.75px solid ${cl.border}`,
    borderRadius: '8px',
    background: cl.bg,
    boxShadow: cl.shadow,
    overflow: 'hidden',
    printColorAdjust: 'exact',
    WebkitPrintColorAdjust: 'exact',
  };

  return (
    <div style={baseStyle}>
      {/* Para birimi rozeti — ABSOLUTE top-CENTER, layout'tan tamamen bağımsız.
          Ortalanmış konum sayesinde sağdaki Ara Toplam rakamlarıyla çakışmaz,
          ek dikey boşluğa gerek kalmaz; kart kompakt kalır. */}
      <span style={{
        position: 'absolute',
        top: '5px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: PB_LABEL_FS,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: cl.textLabel,
        lineHeight: 1,
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        {pbLabel}
      </span>

      {/* Detay alanı — KDV/iskonto/ara toplam, hepsi aynı sağ X'te biter.
          PB rozeti ortalandığı için sağda yer var; küçük üst padding yeterli. */}
      {hasDetail && (
        <div style={{
          paddingTop:    '6px',
          paddingBottom: '5px',
          borderBottom:  `0.75px solid ${cl.separator}`,
        }}>
          {detailRow('Ara Toplam', araToplam, cl.text, '')}
          {iskontoOrani > 0 && detailRow(`İskonto %${iskontoOrani}`, iskontoTutar, cl.negRed, '–')}
          {kdvOrani    > 0 && detailRow(`KDV %${kdvOrani}`,          kdvTutar,     cl.posGreen, '+')}
        </div>
      )}

      {/* Genel Toplam satırı — sol: etiket, sağ: büyük rakam (aynı X)
          Padding KDV/iskonto/ara toplam aktif/pasif farketmez aynı kalır;
          böylece detay açılıp kapanırken Genel Toplam zıplamaz. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 0 8px 8px',
      }}>
        <div>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: cl.text,
            lineHeight: 1.1,
          }}>
            Genel Toplam
          </div>
          <div style={{
            fontSize: '7.5px',
            color: cl.textLabel,
            lineHeight: 1.2,
            marginTop: '1px',
          }}>
            Grand Total
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Sembol + rakam: kendi içinde flex (sembol bağımsız konum), birlikte
            sağa AMOUNT_PR padding ile yerleşir — detay rakamlarıyla aynı X */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
          paddingRight: amountRightPx,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: SYMBOL_FS,
            fontWeight: 900,
            color: cl.text,
            lineHeight: 1,
            alignSelf: 'flex-end',
            paddingBottom: '1px',
          }}>
            {sembol}
          </span>
          <span style={{
            fontSize: grandFs,
            fontWeight: 900,
            lineHeight: 1.06,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.025em',
            color: cl.text,
            whiteSpace: 'nowrap',
          }}>
            {fmtN(genelToplam)}
          </span>
        </div>
      </div>
    </div>
  );
}
