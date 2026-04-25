/**
 * PremiumDiscountIcon — fiyat etiketi (pentagon + delik) + iç % glyph.
 */
interface Props {
  className?: string;
}

export default function PremiumDiscountIcon({ className = 'premium-panel-icon' }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* tag pentagon gövde */}
      <path
        d="M 32 6 H 54 a 4 4 0 0 1 4 4 V 32 L 34 56 a 4 4 0 0 1 -6 0 L 6 34 a 4 4 0 0 1 0 -6 Z"
        className="pi-body"
      />
      {/* etiket deliği — koyu */}
      <circle cx="46" cy="18" r="3.4" fill="rgba(0,0,0,0.45)" />
      {/* iç % sembolü */}
      <circle cx="22" cy="30" r="2.6" className="pi-detail" />
      <circle cx="38" cy="46" r="2.6" className="pi-detail" />
      <path d="M 42 26 L 18 50" className="pi-glyph" />
    </svg>
  );
}
