/**
 * MEBA Mekanik – Global Logo Component
 *
 * variant:
 *   'dark-bg'  → ME in white  + BA in blue  (header, login screen)
 *   'light-bg' → ME in black  + BA in blue  (PDF, light surfaces)
 *
 * size: 'sm' | 'md' | 'lg' | 'xl'
 *
 * showBadge: show the "MEKANİK" grey pill beneath the letters
 */

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'dark-bg' | 'light-bg';
  showBadge?: boolean;
  style?: React.CSSProperties;
}

/* ── Rendered widths per size (height is derived from aspect ratio) ── */
const SIZE_W = {
  sm:  82,
  md:  140,
  lg:  210,
  xl:  290,
} as const;

/* ── Authoritative brand colors ── */
const BLUE     = '#47B4DF';  // cornflower blue from the MEBA logo
const GREY_BOX = '#5f6368';  // MEKANİK badge background

/*
 * Fixed SVG canvas:
 *   viewBox width  = 420
 *   viewBox height = 195 (badge visible) | 165 (badge hidden)
 *
 * The MEBA text sits on baseline y=155, spanning x=5 to x=415 (textLength=410).
 * The MEKANİK badge rect starts at y=158 (overlapping the text baseline slightly).
 */

export default function Logo({
  size = 'md',
  variant = 'dark-bg',
  showBadge = true,
  style,
}: LogoProps) {
  const meColor = variant === 'dark-bg' ? '#ffffff' : '#111111';
  const renderWidth  = SIZE_W[size];
  const viewBoxH     = showBadge ? 195 : 162;
  const renderHeight = Math.round(renderWidth * (viewBoxH / 420));

  return (
    <svg
      viewBox={`0 0 420 ${viewBoxH}`}
      width={renderWidth}
      height={renderHeight}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MEBA Mekanik"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {/* ── MEBA lettering ── */}
      <text
        fontFamily='"Arial Black", "Arial Bold", Arial, sans-serif'
        fontWeight="900"
        fontSize="152"
        y="155"
        x="5"
        textLength="410"
        lengthAdjust="spacingAndGlyphs"
      >
        <tspan fill={meColor}>ME</tspan>
        <tspan fill={BLUE}>BA</tspan>
      </text>

      {/* ── MEKANİK badge ── */}
      {showBadge && (
        <>
          <rect
            x="88"
            y="158"
            width="245"
            height="33"
            rx="6"
            fill={GREY_BOX}
          />
          <text
            x="210"
            y="180"
            fontFamily="Arial, sans-serif"
            fontWeight="700"
            fontSize="17"
            fill="#ffffff"
            textAnchor="middle"
            letterSpacing="2.5"
          >
            MEKANİK
          </text>
        </>
      )}
    </svg>
  );
}
