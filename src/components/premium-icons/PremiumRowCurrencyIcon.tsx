/**
 * PremiumRowCurrencyIcon — 3 dolu satır + sağ-üstte ₺ rozet.
 */
interface Props {
  className?: string;
}

export default function PremiumRowCurrencyIcon({ className = 'premium-panel-icon' }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* tablo satırları */}
      <rect x="6" y="14" width="32" height="6" rx="2.2" className="pi-body" />
      <rect x="6" y="29" width="40" height="6" rx="2.2" className="pi-body" />
      <rect x="6" y="44" width="26" height="6" rx="2.2" className="pi-body" />
      {/* ₺ rozet */}
      <circle cx="50" cy="16" r="11" className="pi-body" />
      <path d="M 50 7 V 25" className="pi-glyph" />
      <path d="M 44 13 L 56 10" className="pi-glyph" />
      <path d="M 44 17 L 56 14" className="pi-glyph" />
    </svg>
  );
}
