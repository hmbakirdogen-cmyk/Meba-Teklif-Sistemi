/**
 * design-system/componentStyles.ts
 * ─────────────────────────────────────────────────────────────────
 * Hazır CSSProperties nesneleri — bileşenler bu objeleri spread eder.
 * İş mantığına bağımlı değildir; tüm değerler token'lara veya
 * theme objelerine atıfta bulunur.
 *
 * Kullanım:
 *   import { makeStyles } from '../design-system/componentStyles';
 *   const S = makeStyles(C);           // C = useColors() sonucu
 *   <div style={S.card}>…</div>
 */

import type { CSSProperties } from 'react';
import type { ThemeColors } from './theme';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING, TRANSITION } from './tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Fabrika — tema renklerini alır, CSSProperties objelerini üretir.
// ─────────────────────────────────────────────────────────────────────────────
export function makeStyles(C: ThemeColors) {
  return {

    // ── Sayfa düzeni ──────────────────────────────────────────────────────────
    page: {
      minHeight: '100vh',
      background: C.bgBody,  // gradient string — linear-gradient(...)
    } satisfies CSSProperties,

    pageInner: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: `${SPACING['6']} ${SPACING.pagePadding}`,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACING.pageGap,
    } satisfies CSSProperties,

    // ── Kart / Panel ──────────────────────────────────────────────────────────
    card: {
      background: `linear-gradient(180deg, ${C.bgSurface} 0%, ${C.bgElevated} 100%)`,
      border: C.cardBorder,
      borderRadius: RADIUS['2xl'],   // 14px — birincil kart radius
      boxShadow: C.shadowCard,
      overflow: 'hidden',
    } satisfies CSSProperties,

    cardBody: {
      padding: SPACING.cardBody,
    } satisfies CSSProperties,

    cardBodyLg: {
      padding: SPACING.cardBodyLg,
    } satisfies CSSProperties,

    // ── Bölüm başlığı (sayfa içi H2 düzeyinde) ───────────────────────────────
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.rowGap,
      marginBottom: SPACING.sectionGap,
    } satisfies CSSProperties,

    sectionTitle: {
      fontSize: FONT_SIZE.xl,
      fontWeight: FONT_WEIGHT.bold,
      color: C.textPrimary,
      letterSpacing: '-0.01em',
      lineHeight: 1.2,
    } satisfies CSSProperties,

    sectionSubtitle: {
      fontSize: FONT_SIZE.base,
      fontWeight: FONT_WEIGHT.regular,
      color: C.textSecondary,
      marginTop: 4,
      lineHeight: 1.45,
    } satisfies CSSProperties,

    // ── Form alanı grubu ──────────────────────────────────────────────────────
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: SPACING['2'],
    } satisfies CSSProperties,

    formLabel: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
      color: C.textSecondary,
      letterSpacing: '0.03em',
    } satisfies CSSProperties,

    // ── Tablo ─────────────────────────────────────────────────────────────────
    tableWrapper: {
      width: '100%',
      overflowX: 'auto',
      borderRadius: RADIUS.lg,
      border: `1px solid ${C.border}`,
    } satisfies CSSProperties,

    tableHead: {
      background: C.tableHead,
      color: C.tableHeadText,
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
    } satisfies CSSProperties,

    tableHeadCell: {
      padding: SPACING.tableCellPad,
      color: C.tableHeadText,
      fontWeight: FONT_WEIGHT.semibold,
      fontSize: FONT_SIZE.sm,
      whiteSpace: 'nowrap',
    } satisfies CSSProperties,

    tableRow: {
      background: C.tableRow,
      borderBottom: `1px solid ${C.tableBorder}`,
      transition: TRANSITION.color,
    } satisfies CSSProperties,

    tableRowAlt: {
      background: C.tableRowAlt,
      borderBottom: `1px solid ${C.tableBorder}`,
    } satisfies CSSProperties,

    tableCell: {
      padding: SPACING.tableCellPadSm,
      fontSize: FONT_SIZE.base,
      color: C.textPrimary,
      verticalAlign: 'middle',
    } satisfies CSSProperties,

    tableCellSecondary: {
      padding: SPACING.tableCellPadSm,
      fontSize: FONT_SIZE.sm,
      color: C.textSecondary,
      verticalAlign: 'middle',
    } satisfies CSSProperties,

    // ── Rozet / Chip ──────────────────────────────────────────────────────────
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: RADIUS.full,
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.semibold,
      letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    } satisfies CSSProperties,

    // ── Toplamlar paneli ──────────────────────────────────────────────────────
    totalsCard: {
      width: '100%',
      border: `1px solid ${C.totalsBorder}`,
      borderRadius: RADIUS['4xl'],   // 20px
      background: `linear-gradient(180deg, ${C.bgSurface} 0%, ${C.totalsPanel} 100%)`,
      boxShadow: '0 2px 8px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.7)',
      overflow: 'hidden',
    } satisfies CSSProperties,

    totalsRow: {
      display: 'grid',
      alignItems: 'center',
      padding: '13px 20px',
      borderBottom: `1px solid ${C.totalsRowBorder}`,
    } satisfies CSSProperties,

    totalsLabel: {
      fontSize: FONT_SIZE.base,
      fontWeight: FONT_WEIGHT.regular,
      color: C.textSecondary,
      lineHeight: 1.45,
    } satisfies CSSProperties,

    totalsValue: {
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.semibold,
      color: C.textPrimary,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.01em',
    } satisfies CSSProperties,

    totalsGrandValue: {
      fontSize: FONT_SIZE['3xl'],
      fontWeight: FONT_WEIGHT.extrabold,
      color: C.textPrimary,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.025em',
      lineHeight: 1.08,
    } satisfies CSSProperties,

    // ── Nihai tutar hero kartı (koyu gradient) ────────────────────────────────
    heroAmountCard: {
      borderRadius: RADIUS['4xl'],
      padding: '18px 20px',
      background: 'linear-gradient(112deg, #0d1b3e 0%, #132448 38%, #1a2f5e 100%)',
      boxShadow: '0 10px 28px rgba(15,31,69,0.22)',
      textAlign: 'right',
      overflow: 'hidden',
    } satisfies CSSProperties,

    heroAmountLabel: {
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.medium,
      color: 'rgba(255,255,255,0.60)',
      letterSpacing: '0.09em',
      textTransform: 'uppercase',
      marginBottom: 6,
    } satisfies CSSProperties,

    heroAmountValue: {
      fontSize: FONT_SIZE['3xl'],
      fontWeight: FONT_WEIGHT.extrabold,
      color: '#ffffff',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.025em',
      lineHeight: 1.08,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } satisfies CSSProperties,

    // ── Input genel ───────────────────────────────────────────────────────────
    input: {
      background: C.bgInput,
      border: `1px solid ${C.inputBorder}`,
      borderRadius: RADIUS.md,
      color: C.textPrimary,
      fontSize: FONT_SIZE.base,
      padding: SPACING.inputPad,
    } satisfies CSSProperties,

    // ── Modal ─────────────────────────────────────────────────────────────────
    modalBody: {
      background: C.bgSurface,
      color: C.textPrimary,
      borderRadius: RADIUS['2xl'],
    } satisfies CSSProperties,

    // ── Üst çubuk (AppHeader) ─────────────────────────────────────────────────
    header: {
      display: 'flex',
      alignItems: 'center',
      height: 56,
      background: C.bgHeader,
      borderBottom: `1px solid ${C.bgHeaderBorder}`,
      paddingLeft: SPACING.pagePadding,
      paddingRight: SPACING.pagePadding,
    } satisfies CSSProperties,

    // ── Caps etiket (uppercase küçük başlık) ──────────────────────────────────
    capsLabel: {
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.medium,
      color: C.textFaint,
      letterSpacing: '0.09em',
      textTransform: 'uppercase',
    } satisfies CSSProperties,

    // ── Ayırıcı çizgi ─────────────────────────────────────────────────────────
    divider: {
      border: 'none',
      borderTop: `1px solid ${C.border}`,
      margin: `${SPACING['3']} 0`,
    } satisfies CSSProperties,

    // ── Boş durum (empty state) ───────────────────────────────────────────────
    emptyState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING['3'],
      padding: `${SPACING['12']} ${SPACING.pagePadding}`,
      color: C.textFaint,
      textAlign: 'center',
    } satisfies CSSProperties,

    emptyStateText: {
      fontSize: FONT_SIZE.base,
      color: C.textSecondary,
      maxWidth: 340,
      lineHeight: 1.6,
    } satisfies CSSProperties,

    // ── İnline sayısal input (ToplamPaneli KDV/İskonto) ───────────────────────
    inlineRateInput: {
      width: 38,
      height: 20,
      fontSize: 11,
      padding: '0 4px',
      border: '1px solid #2563eb',
      borderRadius: RADIUS.xs,
      outline: 'none',
      textAlign: 'center',
      fontFamily: 'inherit',
      color: C.textPrimary,
      background: C.bgInput,
      boxShadow: '0 0 0 3px rgba(37,99,235,0.10)',
    } satisfies CSSProperties,

  } as const;
}

// ── Statik stiller (temadan bağımsız) ─────────────────────────────────────────
// Bu objeler her çağrıda yeniden oluşturulmaz; sabit export olarak yeterli.

/** Cari/Ürün detay info satırı */
export const infoRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1px 16px',
};

/** Sayısal değer için standart stil (tabular nums) */
export const numericValue: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.01em',
  whiteSpace: 'nowrap',
};

/** Flexbox yatay ortalama satırı */
export const hStack = (gap: number | string = 8): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap,
});

/** Flexbox dikey yığını */
export const vStack = (gap: number | string = 8): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap,
});

/** Tam genişlik flex-between */
export const spaceBetween: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

/** Yalnızca ekran okuyucular için görünür metin */
export const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};
