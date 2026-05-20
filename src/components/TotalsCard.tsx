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
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  DOCUMENT_BRAND,
  HEADER_SURFACE,
  LINE_ITEM_METRICS,
  SEMBOL,
} from '../templates/teklifDocumentShared';

/**
 * Hedef değere doğru easeOutCubic tween — sayı değiştikçe gösterilen değer
 * eski'den yeni'ye yumuşak interpole olur. İlk render'da hedef = displayed
 * olduğu için animasyon başlamaz (PDF capture'ında statik kalır). Reduced
 * motion tercihinde veya `enabled=false` ise tween devre dışı — direkt
 * yeni değer atanır.
 */
function useTweenNumber(target: number, opts: { duration?: number; enabled?: boolean } = {}): number {
  const duration = opts.duration ?? 420;
  const enabled = opts.enabled !== false;
  const [displayed, setDisplayed] = useState(target);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    if (prevTargetRef.current === target) return;
    prevTargetRef.current = target;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!enabled || reduceMotion) {
      setDisplayed(target);
      return;
    }

    // Closure'da freeze edilmiş "from" — efekt yeniden çalışana kadar sabit
    const from = displayed;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplayed(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // displayed bilerek dependency-array dışı: tween "efektin çalıştığı an
  // gösterilen değer"den başlar; her ara frame'de re-trigger olmaz.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, enabled]);

  return displayed;
}

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
  /**
   * Değişen rakamları yumuşak tween + pulse ile gösterir. Sadece canlı
   * editor'da true; PDF kaynağında (offscreen html2canvas hedefi) false
   * geçilir ki capture sırasında mid-tween yakalama riski olmasın.
   */
  animate?: boolean;
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
  animate = true,
}: TotalsCardProps) {
  const amountRightPx = `${amountRightOffsetPx ?? LINE_ITEM_METRICS.cellPaddingXpx}px`;
  const isDark    = variant === 'dark';
  const sembol    = SEMBOL[paraBirimi]   ?? paraBirimi;
  const pbLabel   = PB_SHORT[paraBirimi] ?? paraBirimi;
  const hasDetail = iskontoOrani > 0 || kdvOrani > 0;
  const fmtN      = (n: number) =>
    n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Tween edilmiş değerler ──────────────────────────────────────────────
  // Her parasal değer değiştiğinde easeOutCubic ile yeni hedefe interpole
  // olur. PDF'te değerler statik (efektin "değişim algılaması" tetiklenmez)
  // → tarayıcıda canlı düzenleme sırasında animasyon, PDF'te değişmez render.
  const animAraToplam   = useTweenNumber(araToplam,   { enabled: animate });
  const animIskontoTutar = useTweenNumber(iskontoTutar, { enabled: animate });
  const animKdvTutar    = useTweenNumber(kdvTutar,    { enabled: animate });
  const animGenelToplam = useTweenNumber(genelToplam, { enabled: animate });

  // Genel Toplam pulse — değer değiştiğinde 600ms'lik scale+glow keyframe.
  // React state yerine ref + classList ile yapılır: setState-in-effect'ten
  // kaçınmak için (lint kuralı + ekstra render maliyeti yok).
  const grandRef = useRef<HTMLDivElement>(null);
  const prevGenelRef = useRef(genelToplam);
  useEffect(() => {
    if (prevGenelRef.current === genelToplam) return;
    prevGenelRef.current = genelToplam;
    if (!animate) return;
    const el = grandRef.current;
    if (!el) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    // Class kaldırılır → reflow ile keyframe yeniden tetiklenir → eklenir
    el.classList.remove('totals-grand-pulse');
    void el.offsetWidth;
    el.classList.add('totals-grand-pulse');
  }, [genelToplam, animate]);

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
      {/* Para birimi rozeti — kart'ın GERÇEK sağ-üst köşesi (rakam hizasından
          bağımsız sabit 6px inset). Soft pill zemini ile metadata badge
          karakteri net görünür. Tek/çoklu para birimi modlarının ikisinde de
          aynı konumda — single mode'da kart geniş olsa bile köşede kalır. */}
      <span style={{
        position: 'absolute',
        top: '4px',
        right: `${LINE_ITEM_METRICS.cellPaddingXpx}px`,
        padding: '1.5px 6px',
        borderRadius: '4px',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(26, 43, 66, 0.08)',
        fontSize: PB_LABEL_FS,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: cl.text,
        lineHeight: 1,
        pointerEvents: 'none',
        zIndex: 1,
      }}>
        {pbLabel}
      </span>

      {/* Detay alanı — KDV/iskonto/ara toplam, hepsi aynı sağ X'te biter.
          paddingTop=16px: rozet pill (top:4 + ~11px yükseklik) için ayrılmış
          alan; rakam asla rozetin altına gelmez. */}
      {hasDetail && (
        <div style={{
          paddingTop:    '16px',
          paddingBottom: '5px',
          borderBottom:  `0.75px solid ${cl.separator}`,
        }}>
          {detailRow('Ara Toplam', animAraToplam, cl.text, '')}
          {iskontoOrani > 0 && detailRow(`İskonto %${iskontoOrani}`, animIskontoTutar, cl.negRed, '–')}
          {kdvOrani    > 0 && detailRow(`KDV %${kdvOrani}`,          animKdvTutar,     cl.posGreen, '+')}
        </div>
      )}

      {/* Genel Toplam satırı — sol: etiket, sağ: büyük rakam (aynı X)
          Padding KDV/iskonto/ara toplam aktif/pasif farketmez aynı kalır;
          böylece detay açılıp kapanırken Genel Toplam zıplamaz. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        // hasDetail=false ise detay container yok → rozet için bu alanın
        // üstünde nefes payı bırak (pill rozet ~15px alan kaplar).
        // hasDetail=true ise detay container 16px paddingTop ile rozeti
        // karşıladı, burada normal 8px yeterli.
        padding: hasDetail ? '8px 0 8px 8px' : '17px 0 8px 8px',
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
            sağa AMOUNT_PR padding ile yerleşir — detay rakamlarıyla aynı X.
            Pulse: ref ile classList toggle (keyframe ../styles altında).
            transform-origin sağ kenardan → hizalama bozulmaz. */}
        <div
          ref={grandRef}
          className={isDark ? 'totals-grand-wrap is-dark' : 'totals-grand-wrap'}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px',
            paddingRight: amountRightPx,
            flexShrink: 0,
            transformOrigin: 'right center',
            willChange: 'transform, filter',
          }}
        >
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
            {fmtN(animGenelToplam)}
          </span>
        </div>
      </div>
    </div>
  );
}
