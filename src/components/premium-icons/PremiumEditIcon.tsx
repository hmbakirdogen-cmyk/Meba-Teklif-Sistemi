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
      {/* kilit kemeri — açık/kapalı durumda daha belirgin metal hissi */}
      {readOnly ? (
        <>
          <path d="M 22.8 28 V 22.4 a 9.2 9.2 0 0 1 18.4 0 V 28" fill="none" stroke="rgba(0,0,0,0.36)" strokeWidth={5} strokeLinecap="round" />
          <path d="M 22 28 V 22 a 10 10 0 0 1 20 0 V 28" className="pi-glyph" fill="none" style={{ strokeWidth: 3.6 }} />
          <path d="M 24.3 27.2 V 22.5 a 7.7 7.7 0 0 1 15.4 0 V 27.2" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth={1.4} strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M 41.8 28 V 22.4 a 9.2 9.2 0 0 0 -16.8 -4.8 L 14.8 24" fill="none" stroke="rgba(0,0,0,0.36)" strokeWidth={5} strokeLinecap="round" />
          <path d="M 42 28 V 22 a 10 10 0 0 0 -18 -5 L 14 24" className="pi-glyph" fill="none" style={{ strokeWidth: 3.6 }} />
          <path d="M 40.2 27.1 V 22.5 a 7.2 7.2 0 0 0 -12.8 -3.8 L 17.8 23" fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth={1.4} strokeLinecap="round" />
        </>
      )}

      {/* kilit gövdesi */}
      <rect x="14" y="28" width="36" height="28" rx="6" className="pi-body" />
      {/* iç panel: küçük ölçekte daha okunur premium gövde */}
      <rect x="17" y="33" width="30" height="18" rx="4" className="pi-detail" style={{ opacity: 0.42 }} />
      {/* bevel kenarlar */}
      <rect x="14.8" y="28.8" width="34.4" height="26.4" rx="5.3" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth={1} />
      <rect x="15.4" y="29.4" width="33.2" height="25.2" rx="4.8" fill="none" stroke="rgba(0,0,0,0.20)" strokeWidth={0.9} />
      {/* üst highlight + alt shadow */}
      <rect x="16" y="30" width="32" height="2.2" rx="1.1" fill="rgba(255,255,255,0.28)" />
      <rect x="16" y="52.2" width="32" height="1.3" rx="0.65" fill="rgba(0,0,0,0.30)" />
      {/* hafif fırçalanmış metal dokusu */}
      <rect x="18" y="36.2" width="28" height="0.8" rx="0.4" fill="rgba(255,255,255,0.12)" />
      <rect x="18" y="39.8" width="28" height="0.8" rx="0.4" fill="rgba(255,255,255,0.08)" />
      <rect x="18" y="43.4" width="28" height="0.8" rx="0.4" fill="rgba(0,0,0,0.08)" />
      <rect x="18" y="47" width="28" height="0.8" rx="0.4" fill="rgba(0,0,0,0.11)" />

      {/* anahtar deliği — ortalı, daha belirgin */}
      <circle cx="29" cy="39.7" r="3.1" className="pi-detail" />
      <rect x="27.7" y="42.4" width="2.6" height="7.2" rx="1.2" className="pi-detail" />
      <circle cx="29" cy="39.9" r="1.15" fill="rgba(0,0,0,0.32)" />
      <rect x="28.4" y="44" width="1.2" height="4.6" rx="0.5" fill="rgba(0,0,0,0.26)" />
      <rect x="27.9" y="42.6" width="2.2" height="1.1" rx="0.55" fill="rgba(255,255,255,0.26)" />

      {/* entegre kalem — sadece editing modunda */}
      {!readOnly && (
        <>
          {/* gövde gölgesi */}
          <path d="M 39 51 L 51 39 L 57 45 L 45 57 Z" fill="rgba(0,0,0,0.18)" />
          <path d="M 39 51 L 45 57 L 36 61 Z" fill="rgba(0,0,0,0.13)" />

          {/* ahşap uç — üst açık yüz */}
          <path d="M 38 50 L 41 53 L 35 59 Z" fill="rgba(210,175,110,0.38)" stroke="rgba(120,85,30,0.20)" strokeWidth={0.7} strokeLinejoin="round" />
          {/* ahşap uç — alt koyu yüz */}
          <path d="M 41 53 L 44 56 L 35 59 Z" fill="rgba(155,120,65,0.32)" stroke="rgba(120,85,30,0.20)" strokeWidth={0.7} strokeLinejoin="round" />
          {/* orta çizgi */}
          <path d="M 41 53 L 35 59" stroke="rgba(110,75,25,0.20)" strokeWidth={0.6} fill="none" strokeLinecap="round" />

          {/* kalem gövdesi — alt koyu yüz */}
          <path d="M 38 50 L 50 38 L 56 44 L 44 56 Z" fill="rgba(180,140,20,0.22)" />
          {/* üst aydınlık yüz */}
          <path d="M 38 50 L 50 38 L 53 41 L 41 53 Z" fill="rgba(240,210,80,0.18)" />
          {/* gövde dış kontur */}
          <path d="M 38 50 L 50 38 L 56 44 L 44 56 Z" fill="none" stroke="rgba(130,95,10,0.30)" strokeWidth={0.9} strokeLinejoin="miter" />
          {/* orta yüzey çizgisi */}
          <path d="M 41 53 L 53 41" stroke="rgba(100,70,5,0.15)" strokeWidth={0.6} fill="none" />
          {/* üst kenar highlight */}
          <path d="M 38.5 49.5 L 50.5 37.5" stroke="rgba(255,240,140,0.25)" strokeWidth={0.8} fill="none" strokeLinecap="round" />

          {/* ferrule — gümüş metal bant */}
          <path d="M 50 38 L 56 44 L 58 42 L 52 36 Z" fill="rgba(185,185,190,0.40)" stroke="rgba(120,120,125,0.20)" strokeWidth={0.5} strokeLinejoin="miter" />
          <path d="M 50 38 L 52 36" stroke="rgba(255,255,255,0.35)" strokeWidth={0.9} fill="none" strokeLinecap="round" />
          <path d="M 56 44 L 58 42" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} fill="none" />

          {/* silgi — pembe */}
          <path d="M 52 36 L 58 42 L 60 40 L 54 34 Z" fill="rgba(205,140,135,0.40)" stroke="rgba(160,85,80,0.18)" strokeWidth={0.5} strokeLinejoin="miter" />
          <path d="M 52 36 L 54 34" stroke="rgba(240,190,185,0.28)" strokeWidth={0.7} fill="none" strokeLinecap="round" />

          {/* kurşun uç */}
          <circle cx="35" cy="59" r="1.1" fill="rgba(50,50,60,0.55)" />
          <circle cx="34.5" cy="58.5" r="0.42" fill="rgba(200,200,215,0.35)" />
        </>
      )}
    </svg>
  );
}
