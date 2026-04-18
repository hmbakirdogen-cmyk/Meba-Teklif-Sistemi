/**
 * documentTokens.ts
 * ─────────────────────────────────────────────────────────────────
 * Merkezi A4 belge tasarım tokenleri.
 * TeklifSablonu'ndaki dağınık sabitler burada birleştirildi.
 * Tüm belge bileşenleri bu dosyadan import eder.
 */
import type React from 'react';

// ── Marka Renkleri — MEBA logosu referanslı gradient ailesi ──────────────────
export const DOC_BRAND = {
  g:         'linear-gradient(180deg, #1a3567 0%, #0d1f45 55%, #060d20 100%)',
  border:    '#0a1630',
  shadow:    '0 4px 24px rgba(4,8,24,0.55), 0 1px 8px rgba(4,8,24,0.36)',
  shadowSm:  '0 2px 10px rgba(4,8,24,0.50)',
  text:      '#ffffff',
  textSub:   'rgba(255,255,255,0.88)',
  textLabel: 'rgba(255,255,255,0.70)',
  sep:       'rgba(255,255,255,0.25)',
} as const;

// ── PDF Renk Paleti ──────────────────────────────────────────────────────────
export const DOC_C = {
  navy:        '#0c1e3c',
  navyLight:   '#102858',
  navyBorder:  '#3a6890',
  accent:      '#102858',
  border:      '#9ab8d4',
  borderSoft:  '#b4cce0',
  rowAlt:      '#f5f8fc',
  text:        '#060608',
  textMid:     '#0e0e12',
  textSoft:    '#181820',
  textMuted:   '#242430',
  white:       '#ffffff',
  bg:          '#dce8f5',
  stripeBg:    '#bed0ea',
  stripeText:  '#0c1e3c',
  stripeSub:   '#182e4e',
  stripeSep:   '#8aaed0',
} as const;

// ── Para Birimi Sembolleri ────────────────────────────────────────────────────
export const SEMBOL: Record<string, string> = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', CHF: '₣' };
export const PARA_BIRIMI_ETIKETI: Record<string, string> = { TRY: 'TL', EUR: 'EUR', USD: 'USD' };

// ── Sütun Genişlikleri — Normal mod ──────────────────────────────────────────
export const COL = {
  no:         '3%',
  marka:      '7%',
  urunKod:    '16%',
  aciklama:   '31%',
  miktar:     '6%',
  birimFiyat: '13%',
  toplam:     '13%',
  teslimat:   '8%',
} as const;

// ── Sütun Genişlikleri — Satır Bazlı Para Birimi ────────────────────────────
export const COL_PB = {
  no:         '3%',
  marka:      '7%',
  urunKod:    '15%',
  aciklama:   '26%',
  miktar:     '6%',
  paraBirimi: '11%',
  birimFiyat: '12%',
  toplam:     '12%',
  teslimat:   '8%',
} as const;

// ── LOGO Optik Metrikleri ────────────────────────────────────────────────────
export const LOGO = {
  PNG_AR:        1858 / 846,
  OPT_TOP_FRAC:  87 / 846,
  OPT_BOT_FRAC:  646 / 846,
  OPT_LEFT_FRAC: 82 / 1858,
  OPT_RIGHT_FRAC:1738 / 1858,
  FILE_HEIGHT:   128,
} as const;

export const LOGO_FILE_W   = LOGO.FILE_HEIGHT * LOGO.PNG_AR;
export const LOGO_OPT_H    = LOGO.FILE_HEIGHT * (LOGO.OPT_BOT_FRAC - LOGO.OPT_TOP_FRAC);
export const LOGO_OPT_W    = LOGO_FILE_W      * (LOGO.OPT_RIGHT_FRAC - LOGO.OPT_LEFT_FRAC);
export const LOGO_OPT_TOP  = -(LOGO.FILE_HEIGHT * LOGO.OPT_TOP_FRAC);
export const LOGO_OPT_LEFT = -(LOGO_FILE_W      * LOGO.OPT_LEFT_FRAC);

// ── Kalem Satır Kart Sistemi ─────────────────────────────────────────────────
export const ROW_CARD = {
  bg:        '#ffffff',
  borderClr: '#aabdd4',
  radius:    '6px',
  shadow:    '0 1px 4px rgba(10,20,50,0.10)',
} as const;

export const noBreak: React.CSSProperties = {
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
};

type CellPos = 'first' | 'mid' | 'last';
export function rcCell(pos: CellPos, idx: number = 0): React.CSSProperties {
  const b = `0.75px solid ${ROW_CARD.borderClr}`;
  const r = ROW_CARD.radius;
  return {
    background:              idx % 2 === 0 ? ROW_CARD.bg : DOC_C.rowAlt,
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

// ── Belge Etkileşim Renkleri (yalnızca ekran — baskıda görünmez) ─────────────
export const DOC_INTERACTION = {
  hoverBg:      'rgba(37, 99, 235, 0.04)',
  hoverBorder:  'rgba(37, 99, 235, 0.25)',
  selectedBg:   'rgba(37, 99, 235, 0.06)',
  selectedBorder: 'rgba(37, 99, 235, 0.45)',
  focusRing:    '0 0 0 2px rgba(37, 99, 235, 0.20)',
} as const;
