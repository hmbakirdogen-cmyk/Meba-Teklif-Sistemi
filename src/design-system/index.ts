/**
 * design-system/index.ts
 * ─────────────────────────────────────────────────────────────────
 * Tasarım sistemi genel API'si — tek import noktası.
 *
 * Kullanım:
 *   import { FONT_SIZE, makeStyles, getAntdTokens, lightTheme } from '../design-system';
 */

// ── Token'lar ─────────────────────────────────────────────────────────────────
export {
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  LETTER_SPACING,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  BREAKPOINT,
  SIZE,
  BRAND,
  STATUS_COLORS,
  AVATAR_PALETTE,
  TRANSITION,
  Z_INDEX,
} from './tokens';

// ── Tema objeleri ─────────────────────────────────────────────────────────────
export { lightTheme, darkTheme, getTheme } from './theme';
export type { ThemeColors } from './theme';

// ── Bileşen stilleri ─────────────────────────────────────────────────────────
export {
  makeStyles,
  infoRow,
  numericValue,
  hStack,
  vStack,
  spaceBetween,
  srOnly,
} from './componentStyles';

// ── Ant Design token üreteci ──────────────────────────────────────────────────
export { getAntdTokens } from './antdTokens';
