/**
 * PremiumEditIcon — kilit (kapalı/açık) + editing'de entegre kalem.
 * Yarı dolgulu pi-body + glyph kemer. readOnly state'iyle dual görünüm.
 */
interface Props {
  className?: string;
  readOnly?: boolean;
}

export default function PremiumEditIcon({ className = 'premium-panel-icon', readOnly = true }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* kilit kemeri — kapalı / açık */}
      {readOnly ? (
        <path d="M 22 28 V 22 a 10 10 0 0 1 20 0 V 28" className="pi-glyph" fill="none" />
      ) : (
        <path d="M 42 28 V 22 a 10 10 0 0 0 -18 -5 L 14 24" className="pi-glyph" fill="none" />
      )}
      {/* kilit gövdesi */}
      <rect x="14" y="28" width="36" height="28" rx="6" className="pi-body" />
      {/* anahtar deliği */}
      <circle cx="26" cy="40" r="2.6" className="pi-detail" />
      <rect x="24.6" y="42" width="2.8" height="6.5" rx="1.2" className="pi-detail" />
      {/* entegre kalem — sadece editing modunda */}
      {!readOnly && (
        <>
          <path d="M 38 50 L 50 38 L 56 44 L 44 56 Z" className="pi-detail" />
          <path d="M 38 50 L 36 58 L 44 56 Z" className="pi-detail" />
        </>
      )}
    </svg>
  );
}
