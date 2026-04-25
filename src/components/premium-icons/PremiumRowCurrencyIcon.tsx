/**
 * PremiumRowCurrencyIcon — 3 satır + ortadaki "vurgulu" satıra bağlı para
 * rozeti. "Genel para" değil, "satır-özel para birimi" mesajını net verir.
 */
interface Props {
  className?: string;
}

export default function PremiumRowCurrencyIcon({ className = 'premium-panel-icon' }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* satır 1 — pasif çubuk */}
      <rect x="6" y="14" width="28" height="6" rx="2.2" className="pi-body" />
      {/* satır 2 — vurgulu (para birimi uygulanan satır) */}
      <rect x="6" y="29" width="34" height="6" rx="2.2" className="pi-detail" />
      {/* satır 3 — pasif çubuk */}
      <rect x="6" y="44" width="22" height="6" rx="2.2" className="pi-body" />
      {/* satır 2'ye bağlı para rozeti — sağ tarafta */}
      <circle cx="50" cy="32" r="11" className="pi-body" />
      {/* ₺ stilize glyph — vertical strok + 2 yatay vurgu */}
      <path d="M 50 24 V 40" className="pi-glyph" />
      <path d="M 44 28.5 L 56 26" className="pi-glyph" />
      <path d="M 44 32.5 L 56 30" className="pi-glyph" />
    </svg>
  );
}
