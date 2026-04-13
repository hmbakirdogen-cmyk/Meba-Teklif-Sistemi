/**
 * useColors — tema-duyarlı renk paleti.
 * Tüm bileşenler bu hook'u kullanarak inline stillerini tema değerine göre alır.
 * Apple / Linear kalitesinde dark palette.
 */
import { useMemo } from 'react';
import { useTheme } from '../context/useTheme';

// ── Light palette ──────────────────────────────────────────────────────────────
const L = {
  bgBody:        '#f5f6fa',
  bgSurface:     '#ffffff',
  bgElevated:    '#f8fafc',
  bgInput:       '#ffffff',
  bgHeader:      '#0f1f45',
  bgHeaderBorder:'#1e3060',

  textPrimary:   '#0f1f45',
  textSecondary: '#64748b',
  textFaint:     '#94a3b8',

  border:        '#e2e8f0',
  borderSubtle:  '#f0f4f8',
  borderInput:   '#d1d9e6',

  shadow:        '0 1px 3px rgba(15,31,69,0.07), 0 1px 2px rgba(15,31,69,0.04)',
  shadowCard:    '0 1px 3px rgba(15,31,69,0.07), 0 1px 2px rgba(15,31,69,0.04)',

  rowAlt:        '#fafbff',
  tableHead:     '#0f1f45',
  tableHeadText: '#ffffff',
  tableRow:      '#ffffff',
  tableRowAlt:   '#fafbff',
  tableBorder:   '#f0f4f8',

  totalsPanel:   '#fafbfd',
  totalsBorder:  '#e2e8f0',
  totalsRowBorder:'#f0f4f8',

  cardBorder:    '1px solid #e2e8f0',
  inputBorder:   '#d1d9e6',
  inputFocus:    '#2563eb',
};

// ── Dark palette — Apple / Linear inspired ────────────────────────────────────
const D = {
  bgBody:        '#0f1117',
  bgSurface:     '#181b25',
  bgElevated:    '#1c2132',
  bgInput:       '#141822',
  bgHeader:      '#0b0d16',
  bgHeaderBorder:'#1a2236',

  textPrimary:   '#dde4f0',
  textSecondary: '#8899b5',
  textFaint:     '#6b80a0',

  border:        '#242d42',
  borderSubtle:  '#181f32',
  borderInput:   '#2a3650',

  shadow:        '0 1px 4px rgba(0,0,0,0.5)',
  shadowCard:    '0 2px 8px rgba(0,0,0,0.4)',

  rowAlt:        '#141824',
  tableHead:     '#141a26',
  tableHeadText: '#8899b5',
  tableRow:      '#181b25',
  tableRowAlt:   '#141824',
  tableBorder:   '#1e2638',

  totalsPanel:   '#141822',
  totalsBorder:  '#242d42',
  totalsRowBorder:'#1e2638',

  cardBorder:    '1px solid #242d42',
  inputBorder:   '#2a3650',
  inputFocus:    '#3b82f6',
};

export type Colors = typeof L;

export function useColors(): Colors {
  const { isDark } = useTheme();
  return useMemo(() => (isDark ? D : L), [isDark]);
}
