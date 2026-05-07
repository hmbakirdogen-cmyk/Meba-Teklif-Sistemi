import type { CSSProperties } from 'react';
import type { Firma } from '../types/firma';
import { getAdaptiveLogoPlacement } from '../styles/logoStyles';

/**
 * LogoContainer — uygulamadaki tüm firma logoları için tek standart görsel
 * çerçeve. Container hizalamayı yapar; logo görselinin kendisi doğal oranında
 * kalır ve hiçbir görsel efekt almaz.
 */

const LOGO_CONTAINER_LAYOUT = {
  width: 184,
  height: 120,
  padding: 12,
  borderRadius: 12,
  background: '#ffffff',
} as const;

const LOGO_CONTAINER_STYLE: CSSProperties = {
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

function logoImageStyle(firma: Firma, imgFilter?: string): CSSProperties {
  void imgFilter;
  return getAdaptiveLogoPlacement({
    firmaId: firma.id,
    logoPath: firma.logoPath,
    surface: 'card',
    objectPosition: 'center',
  }).imageStyle;
}

interface LogoContainerProps {
  firma: Firma;
  /** Logo görseli için ek filter (hover gibi). */
  imgFilter?: string;
  /** Container için ek style override. */
  style?: CSSProperties;
}

export function LogoContainer({ firma, imgFilter, style }: LogoContainerProps) {
  const adaptiveLogo = getAdaptiveLogoPlacement({
    firmaId: firma.id,
    logoPath: firma.logoPath,
    surface: 'card',
    objectPosition: 'center',
  });

  return (
    <div style={{ ...LOGO_CONTAINER_STYLE, ...style }}>
      <div style={adaptiveLogo.slotStyle}>
        <img
          src={firma.logoPath}
          alt={firma.kisaAd}
          draggable={false}
          style={logoImageStyle(firma, imgFilter)}
        />
      </div>
    </div>
  );
}
