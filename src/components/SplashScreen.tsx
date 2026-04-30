import { useState, useEffect } from 'react';
import { useFirma } from '../context/useFirma';
import type { Firma } from '../types/firma';
import { FIRMA_KART_LAYOUT } from './FirmaSecimKartLayout';
import { LogoContainer } from './LogoContainer';

/**
 * SplashScreen — uygulama her açılışında oynayan görkemli intro animasyonu.
 * Her sayfa yenilenmesinde (refresh) yeniden oynar; "Atla" butonu ile geçilebilir.
 *
 * Kullanım: App.tsx üst seviyede mount, animasyon bitince/atlanınca onDone tetiklenir.
 */

const gold   = (a: number) => `rgba(185,148,52,${a})`;
const silver = (a: number) => `rgba(172,186,205,${a})`;

export const SPLASH_ANIMATIONS_CSS = `
  @keyframes gc-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes gc-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes gc-burst   { 0% { opacity: 0; transform: scale(0.4); } 60% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0; transform: scale(2.4); } }
  @keyframes gc-drop-l  { 0% { opacity: 0; transform: translateX(-160px) rotate(-12deg) scale(0.85); } 60% { transform: translateX(8px) rotate(2deg) scale(1.04); } 100% { opacity: 1; transform: translateX(0) rotate(0) scale(1); } }
  @keyframes gc-drop-c  { 0% { opacity: 0; transform: translateY(-180px) scale(0.8); } 70% { transform: translateY(14px) scale(1.06); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes gc-drop-r  { 0% { opacity: 0; transform: translateX(160px) rotate(12deg) scale(0.85); } 60% { transform: translateX(-8px) rotate(-2deg) scale(1.04); } 100% { opacity: 1; transform: translateX(0) rotate(0) scale(1); } }
  @keyframes gc-float-1 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes gc-float-2 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
  @keyframes gc-float-3 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
  @keyframes gc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes gc-sweep   { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
  @keyframes gc-ring    { 0% { transform: scale(0.92); opacity: 0; } 50% { opacity: 0.4; } 100% { transform: scale(1.15); opacity: 0; } }
  @keyframes gc-pulse-bg { 0%, 100% { opacity: 0.18; } 50% { opacity: 0.32; } }
  @keyframes gc-fadeout {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(1.015); }
  }
`;

function EngineeringOverlay() {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(${gold(0.036)} 1px, transparent 1px),
          linear-gradient(90deg, ${gold(0.036)} 1px, transparent 1px),
          linear-gradient(${silver(0.024)} 1px, transparent 1px),
          linear-gradient(90deg, ${silver(0.024)} 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          width: '40%', height: '100%',
          background: `linear-gradient(90deg, transparent, ${gold(0.7)}, transparent)`,
          animation: 'gc-sweep 7s ease-in-out infinite',
        }} />
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${silver(0.18)} 50%, transparent)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 700, height: 460,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(ellipse, rgba(15,40,100,0.32) 0%, transparent 70%)',
        animation: 'gc-pulse-bg 6s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
    </>
  );
}

function SplashContent({ firmalar, onDone, onSkip }: {
  firmalar: Firma[];
  onDone: () => void;
  onSkip: () => void;
}) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  // Toplam süre planı (kullanıcı animasyon biter bitmez firma seçimine geçsin):
  //  0–200ms:  faz 1 → altın patlama
  //  200–1100ms: faz 2 → "TEKLİF SİSTEMİ" başlığı
  //  1100–2300ms: faz 3 → 3 kart drop-in animasyonu (3. kart 0.36s gecikme + 1.0s drop = 1360ms)
  //  3700ms:  onDone — kartlar yere oturur oturmaz cross-fade tetiklenir
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 1100);
    const t3 = setTimeout(() => setPhase(3), 2300);
    const t4 = setTimeout(() => onDone(), 3700);
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, [onDone]);

  const firmaIds = ['meba', 'elmos', 'mesa'];
  const orderedFirmalar = firmaIds
    .map((id) => firmalar.find((f) => f.id === id))
    .filter((f): f is Firma => !!f);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center',
      gap: 30, zIndex: 5,
    }}>
      <button
        onClick={onSkip}
        style={{
          position: 'absolute', top: 22, right: 28,
          padding: '7px 16px', borderRadius: 999,
          background: 'rgba(8,16,34,0.55)',
          border: `1px solid ${gold(0.32)}`,
          color: 'rgba(225,210,160,0.85)',
          fontSize: 11, letterSpacing: 1.5,
          fontFamily: '"Segoe UI","Inter","Arial",sans-serif',
          fontWeight: 500, cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          textTransform: 'uppercase' as const,
          transition: 'all 0.2s ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,28,60,0.78)'; e.currentTarget.style.borderColor = gold(0.6); }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(8,16,34,0.55)'; e.currentTarget.style.borderColor = gold(0.32); }}
      >
        Atla →
      </button>

      {phase >= 1 && (
        <div style={{
          position: 'absolute', top: '38%', left: '50%',
          width: 560, height: 560, marginLeft: -280, marginTop: -280,
          background: 'radial-gradient(circle, rgba(255,225,160,0.85) 0%, rgba(185,148,52,0.5) 18%, transparent 60%)',
          animation: 'gc-burst 1.4s cubic-bezier(0.2,0.7,0.3,1) forwards',
          pointerEvents: 'none',
        }} />
      )}

      {phase >= 2 && (
        <div style={{
          textAlign: 'center' as const,
          animation: 'gc-fade-up 0.7s ease both',
        }}>
          <div style={{
            fontSize: 13, letterSpacing: 5, marginBottom: 10,
            color: silver(0.5),
            fontWeight: 300, textTransform: 'uppercase' as const,
            fontFamily: '"Arial",sans-serif',
          }}>
            Group Companies · Grup Şirketleri
          </div>
          <div style={{
            fontSize: 38, fontWeight: 800, letterSpacing: 4.5,
            background: 'linear-gradient(135deg, #f5d878 0%, #d4ac52 35%, #b99434 60%, #f5d878 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 2px 12px rgba(185,148,52,0.4)',
            fontFamily: '"Inter","Segoe UI",sans-serif',
          }}>
            TEKLİF SİSTEMİ
          </div>
          <div style={{
            marginTop: 6, fontSize: 10.5, letterSpacing: 6,
            color: gold(0.55), fontWeight: 300,
            fontFamily: '"Arial",sans-serif',
          }}>
            MEBA &nbsp;·&nbsp; ELMOS &nbsp;·&nbsp; MESA
          </div>
        </div>
      )}

      {phase >= 3 && (
        <div style={{
          display: 'flex', gap: FIRMA_KART_LAYOUT.cardsRowGap,
          flexWrap: 'wrap' as const, justifyContent: 'center',
          maxWidth: 920,
        }}>
          {orderedFirmalar.map((f, idx) => {
            const animMap: Record<number, string> = {
              0: 'gc-drop-l 1.0s cubic-bezier(0.2,0.6,0.3,1.2) both',
              1: 'gc-drop-c 1.0s cubic-bezier(0.2,0.6,0.3,1.2) 0.18s both',
              2: 'gc-drop-r 1.0s cubic-bezier(0.2,0.6,0.3,1.2) 0.36s both',
            };
            return (
              <div key={f.id} style={{
                width: FIRMA_KART_LAYOUT.cardWidth,
                padding: FIRMA_KART_LAYOUT.cardPadding,
                background: 'rgba(7,15,34,0.78)',
                border: `1px solid ${gold(0.18)}`,
                borderRadius: FIRMA_KART_LAYOUT.cardBorderRadius,
                animation: animMap[idx] ?? 'gc-fade-up 0.6s both',
                display: 'flex', flexDirection: 'column' as const,
                alignItems: 'center', gap: FIRMA_KART_LAYOUT.cardInnerGap,
                boxShadow: '0 22px 50px rgba(0,0,0,0.55)',
                boxSizing: 'border-box',
              }}>
                <LogoContainer firma={f} />

                <div style={{
                  fontSize: FIRMA_KART_LAYOUT.sloganFontSize,
                  letterSpacing: FIRMA_KART_LAYOUT.sloganLetterSpacing,
                  color: silver(0.55), textTransform: 'uppercase' as const,
                  textAlign: 'center' as const, lineHeight: 1.55,
                }}>
                  {f.slogan}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const { firmalar } = useFirma();
  const [closing, setClosing] = useState(false);

  function handleDone() {
    if (closing) return;
    setClosing(true);
    // 320ms cross-fade — splash opacity 1→0, alttaki firma seçim ekranı
    // zaten render edilmiş halde bekliyor → sert kesim olmadan akıcı geçiş.
    setTimeout(onDone, 320);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'linear-gradient(158deg, #060b18 0%, #0b1624 40%, #080f1c 100%)',
      overflow: 'hidden',
      animation: closing ? 'gc-fadeout 0.32s cubic-bezier(0.4, 0, 0.2, 1) forwards' : undefined,
      color: 'rgba(220,232,250,0.92)',
      fontFamily: '"Segoe UI","Inter","Arial",sans-serif',
    }}>
      <style>{SPLASH_ANIMATIONS_CSS}</style>
      <EngineeringOverlay />
      <SplashContent
        firmalar={firmalar}
        onDone={handleDone}
        onSkip={handleDone}
      />
    </div>
  );
}
