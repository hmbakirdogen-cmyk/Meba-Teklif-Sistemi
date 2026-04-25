/**
 * PremiumImageIcon — fotoğraf kartı (güneş + dağ) + sağ-altta plus rozet.
 */
interface Props {
  className?: string;
}

export default function PremiumImageIcon({ className = 'premium-panel-icon' }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* fotoğraf kartı */}
      <rect x="6" y="12" width="44" height="36" rx="5" className="pi-body" />
      {/* güneş */}
      <circle cx="17" cy="22" r="3.6" className="pi-detail" />
      {/* dağ silüeti */}
      <path d="M 8 44 L 22 26 L 32 36 L 38 30 L 50 44 Z" className="pi-detail" />
      {/* plus rozet — sağ alt: gövde + içinde haç */}
      <circle cx="50" cy="50" r="10" className="pi-body" />
      <path d="M 50 44 V 56 M 44 50 H 56" className="pi-glyph" />
    </svg>
  );
}
