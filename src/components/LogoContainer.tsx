import type { CSSProperties } from 'react';
import type { Firma } from '../types/firma';

/**
 * LogoContainer — uygulamadaki tüm firma logoları için tek standart görsel
 * çerçeve. Width / height / padding / border-radius / background renk
 * sabittir; logo görseli kutu içinde hem yatay hem dikey ortalanır.
 *
 * Tüm sayfalarda (splash, giriş ekranı firma seçimi, firma profili) bu
 * component üzerinden çağrıldığında logo arka beyaz zemin ölçüleri birebir
 * aynı görünür.
 */

/** Logo arka beyaz zeminin ortak ölçüleri (sabit referans). */
export const LOGO_CONTAINER_LAYOUT = {
  width: 184,
  height: 120,
  padding: 12,
  borderRadius: 12,
  background: '#ffffff',
} as const;

/** Logo arka zeminin ortak stili — inline kullanım için. */
export const LOGO_CONTAINER_STYLE: CSSProperties = {
  width: LOGO_CONTAINER_LAYOUT.width,
  height: LOGO_CONTAINER_LAYOUT.height,
  padding: LOGO_CONTAINER_LAYOUT.padding,
  borderRadius: LOGO_CONTAINER_LAYOUT.borderRadius,
  background: LOGO_CONTAINER_LAYOUT.background,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  boxSizing: 'border-box',
  flexShrink: 0,
};

/** Logo görseli için ortak stil — kutu içinde tam ortalı, taşmaz, sıkışmaz. */
export function logoImageStyle(firma: Firma, extraFilter?: string): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center',
    imageRendering: 'auto',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    transform: `scale(${firma.logoScale ?? 1}) translateZ(0)`,
    transformOrigin: 'center',
    filter: extraFilter ?? 'drop-shadow(0 1px 2px rgba(0,0,0,0.10))',
    transition: 'filter 0.25s ease, transform 0.25s ease',
  };
}

interface LogoContainerProps {
  firma: Firma;
  /** Logo görseli için ek filter (hover gibi). */
  imgFilter?: string;
  /** Container için ek style override. */
  style?: CSSProperties;
}

/**
 * LogoContainer — tüm sayfalarda çağrılan ortak logo wrapper component'i.
 * Width / height / padding / borderRadius / background sabittir.
 */
export function LogoContainer({ firma, imgFilter, style }: LogoContainerProps) {
  return (
    <div style={{ ...LOGO_CONTAINER_STYLE, ...style }}>
      <img
        src={firma.logoPath}
        alt={firma.kisaAd}
        draggable={false}
        style={logoImageStyle(firma, imgFilter)}
      />
    </div>
  );
}
