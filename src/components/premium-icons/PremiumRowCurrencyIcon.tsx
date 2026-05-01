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
      <defs>
        {/* Bar cast-shadow filtresi */}
        <filter id="rc-shadow" x="-8%" y="-8%" width="120%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.2" floodColor="rgba(0,0,0,0.55)" />
        </filter>
      </defs>

      {/* satır 1 — pasif çubuk + üst bevel highlight */}
      <rect x="6" y="14" width="28" height="6" rx="2.2" className="pi-body" filter="url(#rc-shadow)" />
      <rect x="7.2" y="14.5" width="25.6" height="1.5" rx="1" fill="rgba(255,255,255,0.25)" />

      {/* satır 2 — vurgulu + üst bevel highlight */}
      <rect x="6" y="29" width="34" height="6" rx="2.2" className="pi-detail"
            style={{ opacity: 1, fillOpacity: 1, strokeWidth: 1, stroke: 'rgba(255,255,255,0.30)' }}
            filter="url(#rc-shadow)" />
      <rect x="7.2" y="29.5" width="31.6" height="1.5" rx="1" fill="rgba(255,255,255,0.32)" />

      {/* satır 3 — pasif çubuk + üst bevel highlight */}
      <rect x="6" y="44" width="22" height="6" rx="2.2" className="pi-body" filter="url(#rc-shadow)" />
      <rect x="7.2" y="44.5" width="19.6" height="1.5" rx="1" fill="rgba(255,255,255,0.25)" />

      {/* ₺ glyph — satır çubuklarıyla aynı yapı/stil */}
      <path d="M 50 24 V 40" className="pi-body" style={{ fill: 'none', strokeWidth: 3.0 }} />
      <path d="M 44 28.5 L 56 26" className="pi-body" style={{ fill: 'none', strokeWidth: 3.0 }} />
      <path d="M 44 32.5 L 56 30" className="pi-body" style={{ fill: 'none', strokeWidth: 3.0 }} />
    </svg>
  );
}
