/**
 * PremiumPdfBadge — 3D rendered PNG PDF ikonu.
 *
 * Vite asset import ile import edilir; build sırasında hash'lenip optimize
 * edilir. SVG yerine PNG kullanma sebebi: 3D rendered (claymorphism) görsel
 * SVG ile birebir yeniden çizilemiyordu, kullanıcı tercihi PNG asset.
 */

import pdfIconPng from './20-200926_small-pdf-icon-png-pdf-clipart-transparent-png.png';

interface Props {
  className?: string;
  isDark?: boolean;
  /** Container'da fit etmek için boyut (px). Omit edilirse parent kontrol eder. */
  size?: number;
}

export default function PremiumPdfBadge({
  className = 'premium-pdf-badge',
  isDark = false,
  size,
}: Props) {
  void isDark;
  const style: React.CSSProperties = {
    display: 'block',
    objectFit: 'contain',
    ...(size != null ? { width: size, height: size } : { width: '100%', height: '100%' }),
  };
  return (
    <img
      src={pdfIconPng}
      className={className}
      alt=""
      aria-hidden="true"
      style={style}
      draggable={false}
    />
  );
}
