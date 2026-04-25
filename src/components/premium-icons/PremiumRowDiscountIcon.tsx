/**
 * PremiumRowDiscountIcon — 3 satır + ortadaki "vurgulu" satıra bağlı %
 * rozet. "Genel %" değil, "satır-özel iskonto" mesajını net verir.
 */
interface Props {
  className?: string;
}

export default function PremiumRowDiscountIcon({ className = 'premium-panel-icon' }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* satır 1 — pasif çubuk */}
      <rect x="6" y="14" width="28" height="6" rx="2.2" className="pi-body" />
      {/* satır 2 — vurgulu (iskonto uygulanan satır) */}
      <rect x="6" y="29" width="34" height="6" rx="2.2" className="pi-detail" />
      {/* satır 3 — pasif çubuk */}
      <rect x="6" y="44" width="22" height="6" rx="2.2" className="pi-body" />
      {/* satır 2'ye bağlı % rozet — sağ tarafta */}
      <circle cx="50" cy="32" r="11" className="pi-body" />
      {/* % glyph — iki daire + diagonal */}
      <circle cx="46" cy="28" r="2.2" className="pi-detail" />
      <circle cx="54" cy="36" r="2.2" className="pi-detail" />
      <path d="M 55 25 L 45 39" className="pi-glyph" />
    </svg>
  );
}
