/**
 * PremiumKdvIcon — belge gövdesi (sağ üst köşe katlı) + içinde net "KDV"
 * wordmark. Buton üstünde yazı yok, ikon ne yaptığını tek bakışta anlatır.
 */
interface Props {
  className?: string;
}

export default function PremiumKdvIcon({ className = 'premium-panel-icon' }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* belge gövdesi */}
      <path
        d="M 12 8 H 44 L 54 18 V 54 a 2.5 2.5 0 0 1 -2.5 2.5 H 12 a 2.5 2.5 0 0 1 -2.5 -2.5 V 10.5 a 2.5 2.5 0 0 1 2.5 -2.5 Z"
        className="pi-body"
      />
      {/* katlama */}
      <path d="M 44 8 V 18 H 54" className="pi-glyph" fill="none" />
      {/* KDV wordmark */}
      <text x="32" y="42" textAnchor="middle" className="pi-text">
        KDV
      </text>
    </svg>
  );
}
