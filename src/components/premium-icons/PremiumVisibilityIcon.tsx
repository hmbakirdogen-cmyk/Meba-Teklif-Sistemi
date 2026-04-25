/**
 * PremiumVisibilityIcon — göz (team) / çizgili göz (private) dual state.
 * Toggle ON (team) → açık göz: ekibe görünür mesajı.
 * Toggle OFF (private) → çizgili göz: gizli mesajı.
 */
interface Props {
  className?: string;
  visible?: boolean; // true = team (eye), false = private (eye-slash)
}

export default function PremiumVisibilityIcon({
  className = 'premium-panel-icon',
  visible = false,
}: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* dış göz silüeti (almond shape) */}
      <path
        d="M 4 32 C 12 18, 24 12, 32 12 C 40 12, 52 18, 60 32 C 52 46, 40 52, 32 52 C 24 52, 12 46, 4 32 Z"
        className="pi-body"
      />
      {/* iris (orta dolu daire) */}
      <circle cx="32" cy="32" r="9" className="pi-detail" />
      {/* pupil (küçük koyu nokta) */}
      <circle cx="32" cy="32" r="3" fill="rgba(0,0,0,0.6)" />
      {/* private (kapalı) durumda diyagonal slash hattı */}
      {!visible && (
        <path d="M 10 10 L 54 54" className="pi-glyph" />
      )}
    </svg>
  );
}
