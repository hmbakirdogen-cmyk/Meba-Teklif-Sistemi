/**
 * PremiumRowDiscountIcon — 3 dolu satır + sağ-üstte % rozet.
 */
interface Props {
  className?: string;
}

export default function PremiumRowDiscountIcon({ className = 'premium-panel-icon' }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* tablo satırları */}
      <rect x="6" y="14" width="32" height="6" rx="2.2" className="pi-body" />
      <rect x="6" y="29" width="40" height="6" rx="2.2" className="pi-body" />
      <rect x="6" y="44" width="26" height="6" rx="2.2" className="pi-body" />
      {/* % rozet */}
      <circle cx="50" cy="16" r="11" className="pi-body" />
      <circle cx="46" cy="12" r="2.2" className="pi-detail" />
      <circle cx="54" cy="20" r="2.2" className="pi-detail" />
      <path d="M 55 9 L 45 23" className="pi-glyph" />
    </svg>
  );
}
