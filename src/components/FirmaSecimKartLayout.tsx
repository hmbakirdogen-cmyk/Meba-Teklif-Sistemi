import type { CSSProperties } from 'react';
import type { Firma } from '../types/firma';

/**
 * Firma seçim kartlarının ortak layout'u — splash ekranı ve giriş ekranındaki
 * firma seçim kartlarının logo boyutu/konumu birebir aynı kalsın diye tek
 * merkezden yönetilir. İki ekran arasındaki sayfa geçişinde logo zıplaması/
 * kayması/yeniden boyutlanması olmasını engeller.
 */

export const FIRMA_KART_LAYOUT = {
  /** Kart dış genişliği (mobilde override edilir). */
  cardWidth: 220,
  /** Kart iç padding — üst-yan-alt: logonun ve slogan metninin konumunu sabitler. */
  cardPadding: '24px 18px 22px',
  /** Kart border radius. */
  cardBorderRadius: 16,
  /** Logo kutusu ile slogan arası boşluk. */
  cardInnerGap: 14,
  /** Kartlar arası yatay boşluk (satır içinde). */
  cardsRowGap: 26,
  /** Logo görselinin yerleştirildiği kutunun genişliği. */
  logoBoxWidth: 184,
  /** Logo kutusunun yüksekliği. */
  logoBoxHeight: 120,
  /** Logo kutusunun iç padding'i (kenar boşlukları). */
  logoBoxPadding: '6px 8px',
  /** Slogan metninin font boyutu. */
  sloganFontSize: 10,
  /** Slogan letter-spacing. */
  sloganLetterSpacing: 1.6,
} as const;

export const FIRMA_KART_LOGO_BOX_STYLE: CSSProperties = {
  width: FIRMA_KART_LAYOUT.logoBoxWidth,
  height: FIRMA_KART_LAYOUT.logoBoxHeight,
  padding: FIRMA_KART_LAYOUT.logoBoxPadding,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

/** Logo görseli için ortak stil — her iki ekranda birebir aynı. */
export function firmaLogoImgStyle(firma: Firma, extraFilter?: string): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    imageRendering: 'auto',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    transform: `scale(${firma.logoScale ?? 1}) translateZ(0)`,
    transformOrigin: 'center',
    filter: extraFilter ?? 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
    transition: 'filter 0.25s ease, transform 0.25s ease',
  };
}
