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
      {/* etiket deliği — yarı saydam koyu overlay (delik efekti) */}
      <circle cx="46" cy="18" r="3.4" className="pi-hole" />
      {/* iç % sembolü */}
      <circle cx="26" cy="26" r="1.3" className="pi-glyph" />
      <circle cx="36" cy="36" r="1.3" className="pi-glyph" />
      <path d="M 37 25 L 25 37" className="pi-glyph" />
    </svg>
  );
}
