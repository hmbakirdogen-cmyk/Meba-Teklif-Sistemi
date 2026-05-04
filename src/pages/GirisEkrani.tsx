import { useState, useRef, useMemo, memo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useFirma } from '../context/useFirma';
import { useKullanici } from '../context/useKullanici';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Firma } from '../types/firma';
import { ROL_ETIKET, type KullaniciRol } from '../types/kullanici';
import { FIRMA_KART_LAYOUT } from '../components/FirmaSecimKartLayout';
import { LogoContainer } from '../components/LogoContainer';
import {
  api,
  getRememberedSifre, setRememberedSifre, clearRememberedSifre,
} from '../services/apiClient';
import { formatAdSoyad, formatUnvan, splitUnvanWithParen } from '../utils/formatters';

/** Login ekranindaki kart icin minimal personel modeli — backend'den gelir. */
interface PersonelKart {
  id: string;
  kullaniciAdi: string;
  adSoyad: string;
  unvan: string;
  rol: KullaniciRol;
  firmaId: string | null;
  profilFotoUrl: string | null;
  initials: string;
}

type Adim = 'firma' | 'kullanici';

/* ── Renk paleti — cinematic dark, nötr-soğuk ───────────── */
const ink    = (a: number) => `rgba(180,200,230,${a})`;   // genel "silver" hat
const accent = (a: number) => `rgba(120,180,255,${a})`;   // soğuk mavi vurgu

/* ─────────── ANIMATIONS (tek bir global stylesheet) ─────── */
const ANIMATIONS_CSS = `
  @keyframes gc-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes gc-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes gc-float-1 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
  @keyframes gc-float-2 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes gc-float-3 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes gc-aurora-1 {
    0%, 100% { transform: translate(-6%, -4%) scale(1);    opacity: 0.55; }
    50%      { transform: translate( 6%,  4%) scale(1.18); opacity: 0.78; }
  }
  @keyframes gc-aurora-2 {
    0%, 100% { transform: translate( 4%,  3%) scale(1.05); opacity: 0.42; }
    50%      { transform: translate(-5%, -6%) scale(1.20); opacity: 0.65; }
  }
  @keyframes gc-aurora-3 {
    0%, 100% { transform: translate(0,    8%) scale(0.95); opacity: 0.36; }
    50%      { transform: translate(3%,  -5%) scale(1.10); opacity: 0.58; }
  }
  @keyframes gc-particle-drift {
    0%   { transform: translate(0, 0) scale(0.85); opacity: 0; }
    18%  { opacity: 0.85; }
    82%  { opacity: 0.55; }
    100% { transform: translate(var(--gc-dx, 30px), var(--gc-dy, -60px)) scale(1.05); opacity: 0; }
  }
  @keyframes gc-twinkle {
    0%, 100% { filter: brightness(1)   saturate(1); }
    50%      { filter: brightness(2.6) saturate(1.3); }
  }
  @keyframes gc-twinkle-fast {
    0%, 100% { filter: brightness(0.9); }
    25%      { filter: brightness(1.8); }
    55%      { filter: brightness(2.8); }
    80%      { filter: brightness(1.4); }
  }
  @keyframes gc-pulse-soft { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
  @keyframes gc-shimmer-text {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes gc-sweep   { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
  @keyframes gc-ring    { 0% { transform: scale(0.94); opacity: 0; } 50% { opacity: 0.5; } 100% { transform: scale(1.18); opacity: 0; } }
  @keyframes gc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes gc-arrow-bob { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
  @keyframes gc-neon-pulse {
    0%, 100% { color: rgba(172,186,205,0.55); text-shadow: none; }
    50% {
      color: #f0f0f0;
      text-shadow:
        0 0 4px #ffffff,
        0 0 12px rgba(230,230,230,0.95),
        0 0 26px rgba(200,200,200,0.78),
        0 0 50px rgba(180,180,180,0.55);
    }
  }
`;

/* ─────────── Ambient cinematic background ────────────────
 *  Eski mühendislik CAD overlay'inin yerine sade ama derin bir
 *  sahne: 3 yumuşak aurora yığını, 20'lik parçacık alanı, mouse
 *  takipçi spot ışığı, tek katmanlı süt grid + radial maske.    */
function AmbientBackground({
  mouse,
  scenesOpacity = 1,
}: {
  mouse: { x: number; y: number };
  /** ELEKTRONIK/MEKANIK/OTOMASYON/ELEKTRIK/MUHENDISLIK karakterleri opaklik
   *  oncusu. Konumlari korunur — sadece soluklasir. Personel sec adiminda
   *  ~0.25 verilerek arkaplan ayni durur ama karakterler dikkat dagitmaz. */
  scenesOpacity?: number;
}) {
  const particles = useMemo(() => {
    const list: Array<{
      left: string; top: string; size: number;
      dx: number; dy: number; delay: number; duration: number; color: string;
      twinkle: boolean; twinkleFast: boolean;
      twinkleDelay: number; twinkleDuration: number;
      glowMul: number;
    }> = [];
    // Parcacik sayisi 42 → 110: bos kosmik alan dolar, daha cok yildiz
    // yanip soner, dah uzun mesafe kayar.
    for (let i = 0; i < 110; i++) {
      const r = (n: number) => {
        const x = Math.sin(i * 9301 + n * 4937) * 10000;
        return x - Math.floor(x);
      };
      const isStar = r(0) > 0.78;       // ~%22 büyük "yıldız" parçacık (daha cok)
      const colorRoll = r(8);
      const color =
        colorRoll > 0.66 ? 'rgba(255,255,255,0.96)' :  // beyaz parıltı
        colorRoll > 0.30 ? accent(0.96) :              // cyan
        ink(0.88);                                     // silver
      const twinkle = r(9) > 0.18;       // ~%82 parildar (daha cok yanip soner)
      const twinkleFast = twinkle && r(12) > 0.50;     // bunların ~%50'si hızlı
      list.push({
        left: `${(r(1) * 100).toFixed(2)}%`,
        top:  `${(r(2) * 100).toFixed(2)}%`,
        size: isStar ? 2.2 + r(3) * 2.8 : 0.7 + r(3) * 1.8,
        dx:   (r(4) - 0.5) * 160,        // daha uzun yatay kayma
        dy:  -(20 + r(5) * 140),         // daha uzun dikey kayma
        delay:    r(6) * 22,
        duration: 12 + r(7) * 18,        // 12-30 saniye arasi yavasca kayar
        color,
        twinkle,
        twinkleFast,
        twinkleDelay:    r(10) * 6,
        twinkleDuration: 1.2 + r(11) * 2.4,
        glowMul: isStar ? 8 : 4,
      });
    }
    return list;
  }, []);

  const spotX = mouse.x;
  const spotY = mouse.y;

  return (
    // Sabit (fixed) tam viewport arkaplan katmani. Sayfa boyutu / scroll'dan
    // bagimsiz, her zaman gorunen alanin tamamini kaplar. Form icerigi ayri
    // bir scale'li kapsayicida render edilir — bu sebeple buradaki gorseller
    // her zaman tam ekran sinematik kompozisyon korur.
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        clipPath: 'inset(0)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Aurora 1 — sol-üst soğuk mavi.
          Viewport köşelerinden taşan büyük yumuşak parıltı. Wrapper'da
          overflow: hidden + clip-path olduğu için sayfa dışına çıkmaz. */}
      <div style={{
        position: 'absolute', top: '-15%', left: '-12%',
        width: 'min(95vmax, 1700px)', height: 'min(95vmax, 1700px)',
        background:
          'radial-gradient(circle, rgba(40,90,180,0.55) 0%, rgba(20,45,100,0.30) 35%, transparent 65%)',
        filter: 'blur(46px)',
        animation: 'gc-aurora-1 22s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Aurora 2 — sağ-alt indigo */}
      <div style={{
        position: 'absolute', bottom: '-22%', right: '-15%',
        width: 'min(100vmax, 1900px)', height: 'min(100vmax, 1900px)',
        background:
          'radial-gradient(circle, rgba(80,55,150,0.45) 0%, rgba(35,20,75,0.28) 35%, transparent 65%)',
        filter: 'blur(54px)',
        animation: 'gc-aurora-2 28s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Aurora 3 — sağ-üst teal */}
      <div style={{
        position: 'absolute', top: '8%', right: '4%',
        width: 'min(60vmax, 1100px)', height: 'min(60vmax, 1100px)',
        background:
          'radial-gradient(circle, rgba(20,140,170,0.36) 0%, rgba(10,60,90,0.22) 35%, transparent 65%)',
        filter: 'blur(40px)',
        animation: 'gc-aurora-3 24s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Mühendislik / Elektrik / Elektronik / Otomasyon illüstrasyon katmanı —
          KONUMLAR HER ZAMAN AYNI; sadece opaklik degisir. Personel sec
          adiminda 0.25 ile soluklasir (degil, konumla yer degistirmez). */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: scenesOpacity,
        pointerEvents: 'none',
        transition: 'opacity 0.4s ease',
      }}>
        <EngineeringScene />
      </div>

      {/* Mouse-following spotlight */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background:
          `radial-gradient(circle 380px at ${spotX}px ${spotY}px, rgba(190,215,255,0.10) 0%, transparent 60%)`,
      }} />

      {/* İnce grid (tek katman) — radial maske ile köşelerde söner */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage:
          `linear-gradient(${ink(0.030)} 1px, transparent 1px),
           linear-gradient(90deg, ${ink(0.030)} 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 85%)',
        maskImage:       'radial-gradient(ellipse at center, black 30%, transparent 85%)',
      }} />

      {/* Floating + twinkling particles — boş ekran alanlarında parıltı */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {particles.map((p, i) => {
          const driftAnim = `gc-particle-drift ${p.duration}s ${p.delay}s linear infinite`;
          const twinkleAnim = p.twinkle
            ? `, ${p.twinkleFast ? 'gc-twinkle-fast' : 'gc-twinkle'} ${p.twinkleDuration}s ${p.twinkleDelay}s ease-in-out infinite`
            : '';
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: p.left, top: p.top,
                width: p.size, height: p.size,
                borderRadius: '50%',
                background: p.color,
                boxShadow: `0 0 ${p.size * p.glowMul}px ${p.color}, 0 0 ${p.size * (p.glowMul + 4)}px ${p.color}`,
                animation: driftAnim + twinkleAnim,
                opacity: 0,
                ['--gc-dx' as string]: `${p.dx}px`,
                ['--gc-dy' as string]: `${p.dy}px`,
              } as CSSProperties}
            />
          );
        })}
      </div>

      {/* Üst sweep hairline */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
        overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          width: '40%', height: '100%',
          background: `linear-gradient(90deg, transparent, ${accent(0.6)}, transparent)`,
          animation: 'gc-sweep 9s ease-in-out infinite',
        }} />
      </div>
      {/* Alt hairline */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${ink(0.20)} 50%, transparent)`,
        pointerEvents: 'none',
      }} />
      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
      }} />
    </div>
  );
}

/* ─────────── Dişli (gear) yardımcı bileşeni ─────────── */
function Gear({ cx, cy, r, R, n, stroke, sw }: {
  cx: number; cy: number; r: number; R: number; n: number; stroke: string; sw: number;
}) {
  const tw = (2 * Math.PI * r) / (n * 2);
  const th = R - r;
  const angles = Array.from({ length: n }, (_, i) => i * (360 / n));
  return (
    <g>
      <circle cx={cx} cy={cy} r={r}        fill="none" stroke={stroke} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r * 0.32} fill="none" stroke={stroke} strokeWidth={sw * 0.65} />
      <line x1={cx - r * 0.18} y1={cy} x2={cx + r * 0.18} y2={cy} stroke={stroke} strokeWidth={sw * 0.5} />
      <line x1={cx} y1={cy - r * 0.18} x2={cx} y2={cy + r * 0.18} stroke={stroke} strokeWidth={sw * 0.5} />
      {angles.map((a, i) => (
        <rect
          key={i}
          x={cx - tw / 2} y={cy - R}
          width={tw} height={th}
          rx={0.3}
          fill="none" stroke={stroke} strokeWidth={sw}
          transform={`rotate(${a},${cx},${cy})`}
        />
      ))}
    </g>
  );
}

/* ─────────── EngineeringScene — 4 disipline özel illüstrasyon katmanı ─────────
 *  viewBox 200×100, slice ile tüm ekranı kaplar. Köşelere dağılmış 4 sahne:
 *  - Sol üst: ELEKTRONİK (PCB + akım akışı + MCU + LED'ler)
 *  - Sağ üst: OTOMASYON (3-eklemli hareketli robot kolu + PLC paneli)
 *  - Sol alt: MEKANİK (kenetli dönen dişliler + pnömatik silindir + piston)
 *  - Sağ alt: ELEKTRİK (osiloskop dalgaları + trafo + şimşek + iletim direği)
 *  Memoize edilir — mouse hareketinde re-render yapmaz.                         */
const EngineeringScene = memo(function EngineeringScene() {
  const c = (a: number) => `rgba(120,200,255,${a})`;  // cyan / data
  const s = (a: number) => `rgba(180,200,230,${a})`;  // silver / structural
  const w = (a: number) => `rgba(255,200,80,${a})`;   // warm / spark / energy

  return (
    <svg
      viewBox="0 0 200 100"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        opacity: 0.70,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft neon glow — trace ve chip kenarlarını ışıltılı yapar */}
        <filter id="gc-neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.45" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Strong double-blur glow — sadece MÜHENDİSLİK hero başlığı için */}
        <filter id="gc-eng-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="blur1" />
          <feGaussianBlur stdDeviation="0.5" in="SourceGraphic" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Hero başlığı için gradient — açık-cyan → beyaz → açık-cyan */}
        <linearGradient id="gc-eng-title-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(120,200,255,0.92)" />
          <stop offset="50%"  stopColor="rgba(255,255,255,1)" />
          <stop offset="100%" stopColor="rgba(120,200,255,0.92)" />
        </linearGradient>
        {/* Holografik çekirdek için radial glow */}
        <radialGradient id="gc-core-glow">
          <stop offset="0%"   stopColor="rgba(255,255,255,1)" />
          <stop offset="35%"  stopColor="rgba(160,220,255,0.92)" />
          <stop offset="70%"  stopColor="rgba(60,140,220,0.42)" />
          <stop offset="100%" stopColor="rgba(15,28,55,0)" />
        </radialGradient>
        {/* Holografik tabandan yukarı scan beam */}
        <linearGradient id="gc-scan-beam" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%"   stopColor="rgba(120,200,255,0.55)" />
          <stop offset="100%" stopColor="rgba(120,200,255,0)" />
        </linearGradient>
      </defs>

      <style>{`
        @keyframes gc-flow      { to { stroke-dashoffset: -20; } }
        @keyframes gc-flow-rev  { to { stroke-dashoffset:  20; } }
        .gc-flow        { stroke-dasharray: 1.4 1.8; animation: gc-flow      6s linear infinite; }
        .gc-flow-fast   { stroke-dasharray: 1.0 1.4; animation: gc-flow      3s linear infinite; }
        .gc-flow-rev    { stroke-dasharray: 1.0 1.6; animation: gc-flow-rev  5s linear infinite; }

        @keyframes gc-blink-led { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
        .gc-blink   { animation: gc-blink-led 1.8s ease-in-out infinite; }
        .gc-blink-2 { animation: gc-blink-led 2.4s 0.5s ease-in-out infinite; }
        .gc-blink-3 { animation: gc-blink-led 1.4s 0.9s ease-in-out infinite; }

        @keyframes gc-pulse-r {
          0%, 100% { transform: scale(0.8); opacity: 0.45; }
          50%      { transform: scale(1.6); opacity: 1; }
        }
        .gc-pulse-node   { transform-origin: center; transform-box: fill-box; animation: gc-pulse-r 3.0s ease-in-out infinite; }
        .gc-pulse-node-2 { transform-origin: center; transform-box: fill-box; animation: gc-pulse-r 3.4s 0.4s ease-in-out infinite; }
        .gc-pulse-node-3 { transform-origin: center; transform-box: fill-box; animation: gc-pulse-r 2.8s 0.9s ease-in-out infinite; }

        @keyframes gc-piston-rod { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
        @keyframes gc-piston-in  { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
        .gc-piston-rod   { animation: gc-piston-rod 6s ease-in-out infinite; }
        .gc-piston-inner { animation: gc-piston-in  6s ease-in-out infinite; }

        @keyframes gc-spark-fire {
          0%, 92%, 100% { opacity: 0; }
          93%, 95%, 97% { opacity: 1; }
          94%, 96%      { opacity: 0.5; }
        }
        .gc-spark { animation: gc-spark-fire 5s linear infinite; }

        @keyframes gc-arm-shoulder { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(8deg); } }
        @keyframes gc-arm-elbow    { 0%, 100% { transform: rotate(10deg); } 50% { transform: rotate(-8deg); } }
        .gc-arm-shoulder { animation: gc-arm-shoulder 8s ease-in-out infinite; }
        .gc-arm-elbow    { animation: gc-arm-elbow    7s ease-in-out infinite; }

        @keyframes gc-cart-move {
          0%, 100% { transform: translateX(2px); }
          50%      { transform: translateX(-14px); }
        }
        .gc-cart { animation: gc-cart-move 11s ease-in-out infinite; }
        @keyframes gc-wheel-spin { to { transform: rotate(360deg); } }
        .gc-wheel { transform-origin: center; transform-box: fill-box; animation: gc-wheel-spin 4s linear infinite; }

        @keyframes gc-wave-scroll { to { transform: translateX(-12px); } }
        .gc-wave-1 { animation: gc-wave-scroll 5s linear infinite; }
        .gc-wave-2 { animation: gc-wave-scroll 4s linear infinite; }

        @keyframes gc-radar-ping {
          0%   { transform: scale(0.4); opacity: 0.85; }
          100% { transform: scale(7);   opacity: 0; }
        }
        .gc-radar-1 { transform-origin: center; transform-box: fill-box; animation: gc-radar-ping 3.6s ease-out infinite; }
        .gc-radar-2 { transform-origin: center; transform-box: fill-box; animation: gc-radar-ping 3.6s 1.5s ease-out infinite; }

        @keyframes gc-core-pulse {
          0%   { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        .gc-core-pulse-1 { transform-origin: center; transform-box: fill-box; animation: gc-core-pulse 3s ease-out infinite; }
        .gc-core-pulse-2 { transform-origin: center; transform-box: fill-box; animation: gc-core-pulse 3s 1.5s ease-out infinite; }
      `}</style>

      {/* ═════════════════ ELEKTRONİK — sol üst (0.8 ölçek, üstte 6 birim boşluk) ═════════════════ */}
      <g transform="translate(3 10) scale(0.8) translate(-3 -4)">
      <g filter="url(#gc-neon-glow)">
        {/* PCB outline */}
        <rect x="3" y="4" width="48" height="22" rx="0.6"
              fill="rgba(8,18,40,0.50)" stroke={c(0.20)} strokeWidth="0.20" />
        {/* PCB pad grid */}
        {[8, 14, 20, 26, 32, 38, 44, 50].flatMap((x) =>
          [7, 12, 17, 22].map((y) => (
            <circle key={`pad-${x}-${y}`} cx={x} cy={y} r="0.18" fill={c(0.18)} />
          )),
        )}
        {/* Trace 1 — sol → IC */}
        <path d="M 4 14 L 10 14 L 10 8 L 22 8 L 22 14 L 32 14"
              fill="none" stroke={c(0.32)} strokeWidth="0.30" />
        <path d="M 4 14 L 10 14 L 10 8 L 22 8 L 22 14 L 32 14"
              fill="none" stroke={c(0.85)} strokeWidth="0.20" className="gc-flow" />
        {/* Trace 2 — IC → sağ */}
        <path d="M 32 14 L 32 20 L 46 20"
              fill="none" stroke={c(0.30)} strokeWidth="0.28" />
        <path d="M 32 14 L 32 20 L 46 20"
              fill="none" stroke={c(0.85)} strokeWidth="0.16" className="gc-flow-fast" />
        {/* Trace 3 — alt PCB */}
        <path d="M 6 24 L 18 24 L 18 21"
              fill="none" stroke={c(0.22)} strokeWidth="0.24" />
        <path d="M 6 24 L 18 24 L 18 21"
              fill="none" stroke={c(0.70)} strokeWidth="0.14" className="gc-flow-rev" />

        {/* IC chip */}
        <rect x="26" y="11" width="12" height="8" rx="0.4"
              fill="rgba(15,28,55,0.88)" stroke={c(0.55)} strokeWidth="0.30" />
        <text x="32" y="16" textAnchor="middle" fontSize="2.2" fill={c(0.65)}
              fontFamily="Arial, sans-serif" letterSpacing="0.08em" fontWeight="600">MCU</text>
        {/* IC pins */}
        {[12.5, 14.5, 16.5, 18.5].map((y, i) => (
          <line key={`pl-${i}`} x1="26" y1={y} x2="24.5" y2={y} stroke={c(0.40)} strokeWidth="0.22" />
        ))}
        {[12.5, 14.5, 16.5, 18.5].map((y, i) => (
          <line key={`pr-${i}`} x1="38" y1={y} x2="39.5" y2={y} stroke={c(0.40)} strokeWidth="0.22" />
        ))}
        {/* IC orientation dot */}
        <circle cx="27.5" cy="12.5" r="0.3" fill={c(0.95)} className="gc-blink" />

        {/* Direnç (SMD görünümlü) */}
        <line x1="42" y1="14" x2="43" y2="14" stroke={c(0.32)} strokeWidth="0.26" />
        <rect x="43" y="13.3" width="3" height="1.4" fill="rgba(15,28,55,0.7)" stroke={c(0.40)} strokeWidth="0.18" />
        <line x1="46" y1="14" x2="47" y2="14" stroke={c(0.32)} strokeWidth="0.26" />

        {/* Kondansatör */}
        <line x1="14" y1="21" x2="14" y2="23" stroke={c(0.50)} strokeWidth="0.34" />
        <line x1="16" y1="21" x2="16" y2="23" stroke={c(0.50)} strokeWidth="0.34" />

        {/* LED'ler (alt sıra) */}
        <circle cx="6"  cy="22" r="0.5" fill={w(0.85)} className="gc-blink" />
        <circle cx="9"  cy="22" r="0.5" fill={c(0.85)} className="gc-blink-2" />
        <circle cx="12" cy="22" r="0.5" fill={c(0.85)} className="gc-blink-3" />

        {/* Junction pulse nodes */}
        <circle cx="22" cy="14" r="0.5" fill={c(0.95)} className="gc-pulse-node" />
        <circle cx="32" cy="20" r="0.5" fill={c(0.95)} className="gc-pulse-node-2" />
        <circle cx="18" cy="24" r="0.5" fill={c(0.95)} className="gc-pulse-node-3" />
      </g>
      <text x="14" y="32" fontSize="2.6" fill={c(0.45)}
            fontFamily="Arial, sans-serif" letterSpacing="0.20em" fontWeight="500">
        ELEKTRONİK
      </text>
      </g>

      {/* ═════════════════ OTOMASYON — sağ üst (0.8 ölçek, üstte 6 birim boşluk) ═════════════════ */}
      <g transform="translate(198 10) scale(0.8) translate(-198 -4)">
      <g>
        {/* Zemin */}
        <line x1="170" y1="32" x2="198" y2="32" stroke={s(0.32)} strokeWidth="0.4" />
        <line x1="170" y1="33" x2="198" y2="33" stroke={s(0.12)} strokeWidth="0.20" strokeDasharray="0.5 0.8" />

        {/* Hareketli araba (taban + pivot + tekerlekler + kol) */}
        <g className="gc-cart">
          {/* Taban */}
          <rect x="183" y="29" width="9" height="3" rx="0.3"
                fill="rgba(15,28,55,0.78)" stroke={s(0.45)} strokeWidth="0.30" />

          {/* Tekerlekler — dönen, zemine değen */}
          <g>
            <circle cx="184.8" cy="32" r="0.7"
                    fill="rgba(15,28,55,0.95)" stroke={s(0.55)} strokeWidth="0.22"
                    className="gc-wheel" />
            <line x1="184.4" y1="32" x2="185.2" y2="32" stroke={c(0.55)} strokeWidth="0.18"
                  className="gc-wheel" />
          </g>
          <g>
            <circle cx="190.2" cy="32" r="0.7"
                    fill="rgba(15,28,55,0.95)" stroke={s(0.55)} strokeWidth="0.22"
                    className="gc-wheel" />
            <line x1="189.8" y1="32" x2="190.6" y2="32" stroke={c(0.55)} strokeWidth="0.18"
                  className="gc-wheel" />
          </g>

          {/* Pivot point */}
          <circle cx="187.5" cy="29" r="0.7" fill="rgba(15,28,55,0.95)" stroke={c(0.65)} strokeWidth="0.22" />
          <circle cx="187.5" cy="29" r="0.3" fill={c(0.95)} />

          {/* Omuz kolu — pivot (187.5, 29) etrafında döner */}
          <g transform="translate(187.5 29)">
            <g className="gc-arm-shoulder">
              <line x1="0" y1="0" x2="-9.5" y2="-15"
                    stroke={s(0.55)} strokeWidth="1.1" strokeLinecap="round" />
              <line x1="0" y1="0" x2="-9.5" y2="-15"
                    stroke={c(0.35)} strokeWidth="0.40" strokeLinecap="round" />
              {/* Dirsek eklemi (-9.5, -15) */}
              <g transform="translate(-9.5 -15)">
                <circle cx="0" cy="0" r="1" fill="rgba(15,28,55,0.92)" stroke={s(0.55)} strokeWidth="0.26" />
                <circle cx="0" cy="0" r="0.4" fill={c(0.85)} />
                {/* Önkol (dirsek etrafında döner) */}
                <g className="gc-arm-elbow">
                  <line x1="0" y1="0" x2="-8" y2="-8"
                        stroke={s(0.55)} strokeWidth="0.95" strokeLinecap="round" />
                  <line x1="0" y1="0" x2="-8" y2="-8"
                        stroke={c(0.35)} strokeWidth="0.34" strokeLinecap="round" />
                  {/* Tool head (-8, -8) */}
                  <g transform="translate(-8 -8)">
                    <rect x="-1.5" y="-1.5" width="3" height="3" rx="0.3"
                          fill="rgba(15,28,55,0.92)" stroke={c(0.65)} strokeWidth="0.32" />
                    <circle cx="0" cy="0" r="0.45" fill={w(0.95)} className="gc-blink" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* PLC kontrol paneli */}
        <rect x="155" y="20" width="11" height="9" rx="0.4"
              fill="rgba(8,18,40,0.65)" stroke={s(0.30)} strokeWidth="0.22" />
        <line x1="155" y1="22.5" x2="166" y2="22.5" stroke={s(0.20)} strokeWidth="0.16" />
        <text x="160.5" y="24.6" textAnchor="middle" fontSize="1.5" fill={c(0.55)}
              fontFamily="Arial, sans-serif" fontWeight="600" letterSpacing="0.08em">PLC</text>
        {/* Kontrol panel LED'leri */}
        <circle cx="158" cy="27" r="0.4" fill={w(0.85)} className="gc-blink" />
        <circle cx="160" cy="27" r="0.4" fill={c(0.85)} className="gc-blink-2" />
        <circle cx="162" cy="27" r="0.4" fill={s(0.55)} className="gc-blink-3" />
        {/* Display ekran çizgisi */}
        <line x1="156" y1="26" x2="164" y2="26" stroke={c(0.18)} strokeWidth="0.16" />

        {/* PLC → robot taban kablosu */}
        <path d="M 166 24 L 175 24 L 175 28"
              fill="none" stroke={c(0.30)} strokeWidth="0.20" strokeDasharray="0.8 0.6" />
      </g>
      <text x="186" y="38" textAnchor="end" fontSize="2.6" fill={s(0.45)}
            fontFamily="Arial, sans-serif" letterSpacing="0.20em" fontWeight="500">
        OTOMASYON
      </text>
      </g>

      {/* ═════════════════ MEKANİK — sol alt (0.8 ölçek, altta 6 birim boşluk) ═════════════════ */}
      <g transform="translate(6 89) scale(0.8) translate(-6 -95)">
      <g>
        {/* Hex çerçeve */}
        <polygon points="14,66 26,66 32,75 26,84 14,84 8,75"
                 fill="none" stroke={s(0.20)} strokeWidth="0.30" />
        <polygon points="14,67 26,67 31,75 26,83 14,83 9,75"
                 fill="none" stroke={s(0.10)} strokeWidth="0.20" />

        {/* Dişli 1 — saat yönü dönüş */}
        <g>
          <Gear cx={20} cy={75} r={4.5} R={6.8} n={12} stroke={s(0.50)} sw={0.32} />
          <animateTransform
            attributeName="transform" type="rotate"
            from="0 20 75" to="360 20 75"
            dur="60s" repeatCount="indefinite"
          />
        </g>
        {/* Dişli 2 — saatin tersi (kenetli) */}
        <g>
          <Gear cx={31} cy={75} r={2.8} R={4.4} n={10} stroke={s(0.45)} sw={0.28} />
          <animateTransform
            attributeName="transform" type="rotate"
            from="0 31 75" to="-360 31 75"
            dur="40s" repeatCount="indefinite"
          />
        </g>

        {/* Pnömatik silindir gövdesi */}
        <rect x="6" y="89" width="20" height="6" rx="0.6"
              fill="rgba(15,28,55,0.55)" stroke={s(0.45)} strokeWidth="0.30" />
        {/* İç highlight */}
        <line x1="6.7" y1="89.7" x2="25.3" y2="89.7" stroke="rgba(255,255,255,0.12)" strokeWidth="0.18" />

        {/* İç piston — silindir içinde sağa-sola hareket */}
        <g className="gc-piston-inner">
          <rect x="9" y="89.5" width="2.2" height="5" rx="0.3"
                fill={s(0.50)} stroke={s(0.62)} strokeWidth="0.22" />
        </g>

        {/* Piston çubuğu + uç blok */}
        <g className="gc-piston-rod">
          <line x1="25.3" y1="92" x2="33" y2="92"
                stroke={s(0.60)} strokeWidth="0.7" strokeLinecap="round" />
          <line x1="25.3" y1="91.7" x2="33" y2="91.7"
                stroke="rgba(255,255,255,0.22)" strokeWidth="0.18" />
          <rect x="32" y="90.5" width="3" height="3" rx="0.3"
                fill={s(0.45)} stroke={s(0.60)} strokeWidth="0.24" />
        </g>

        {/* Hava giriş portları — warm/sarı vurgu (diğer disiplinlerle uyumlu) */}
        <circle cx="9"  cy="88.3" r="0.4" fill={w(0.85)} className="gc-pulse-node" />
        <circle cx="22" cy="88.3" r="0.4" fill={w(0.85)} className="gc-pulse-node-2" />
        <line x1="9"  y1="88.3" x2="9"  y2="86.5" stroke={w(0.40)} strokeWidth="0.18" />
        <line x1="22" y1="88.3" x2="22" y2="86.5" stroke={w(0.40)} strokeWidth="0.18" />
        {/* Silindir gövdesinde aktif "pressure" LED'i */}
        <circle cx="24" cy="90.5" r="0.4" fill={w(0.85)} className="gc-blink" />
      </g>
      <text x="14" y="64" fontSize="2.6" fill={s(0.45)}
            fontFamily="Arial, sans-serif" letterSpacing="0.20em" fontWeight="500">
        MEKANİK
      </text>
      </g>

      {/* ═════════════════ ELEKTRİK — sağ alt (0.8 ölçek, altta 6 birim boşluk) ═════════════════ */}
      <g transform="translate(198 89) scale(0.8) translate(-198 -95)">
      <g filter="url(#gc-neon-glow)">
        {/* Osiloskop paneli */}
        <rect x="155" y="64" width="40" height="14" rx="0.6"
              fill="rgba(8,18,40,0.65)" stroke={c(0.32)} strokeWidth="0.25" />
        {/* Header çizgi */}
        <line x1="155.3" y1="65.2" x2="194.7" y2="65.2" stroke={c(0.22)} strokeWidth="0.16" />

        {/* Scope grid */}
        {[160, 165, 170, 175, 180, 185, 190].map((x) => (
          <line key={`sv-${x}`} x1={x} y1="65.2" x2={x} y2="78" stroke={c(0.10)} strokeWidth="0.10" />
        ))}
        {[68, 72, 75].map((y) => (
          <line key={`sh-${y}`} x1="155" y1={y} x2="195" y2={y} stroke={c(0.10)} strokeWidth="0.10" />
        ))}

        {/* Scope clip — wave'ler bu alana sınırlı */}
        <clipPath id="gc-scope-clip">
          <rect x="155" y="65.2" width="40" height="12.6" />
        </clipPath>

        {/* Faz 1 — cyan (sürekli kayan) */}
        <g clipPath="url(#gc-scope-clip)">
          <g className="gc-wave-1">
            <path d="M 153 71.5 Q 155 67 157 71.5 T 161 71.5 T 165 71.5 T 169 71.5 T 173 71.5 T 177 71.5 T 181 71.5 T 185 71.5 T 189 71.5 T 193 71.5 T 197 71.5 T 201 71.5"
                  fill="none" stroke={c(0.75)} strokeWidth="0.34" />
          </g>
          {/* Faz 2 — amber (offset, biraz daha hızlı) */}
          <g className="gc-wave-2">
            <path d="M 153 74.5 Q 155 78 157 74.5 T 161 74.5 T 165 74.5 T 169 74.5 T 173 74.5 T 177 74.5 T 181 74.5 T 185 74.5 T 189 74.5 T 193 74.5 T 197 74.5 T 201 74.5"
                  fill="none" stroke={w(0.65)} strokeWidth="0.28" />
          </g>
        </g>

        {/* Scope label */}
        <text x="158" y="67" fontSize="1.3" fill={c(0.55)}
              fontFamily="Arial, sans-serif" fontWeight="600" letterSpacing="0.08em">
          50Hz · 380V
        </text>
        {/* REC göstergesi */}
        <circle cx="190" cy="66.5" r="0.4" fill={w(0.95)} className="gc-blink" />
        <text x="192" y="67" fontSize="1.2" fill={w(0.65)}
              fontFamily="Arial, sans-serif" fontWeight="600">REC</text>

        {/* Trafo */}
        <g stroke={s(0.50)} strokeWidth="0.30" fill="none">
          <path d="M 158 86 q 1.2 -1.5 2.4 0 q 1.2 -1.5 2.4 0 q 1.2 -1.5 2.4 0 q 1.2 -1.5 2.4 0" />
          <path d="M 158 89 q 1.2 -1.5 2.4 0 q 1.2 -1.5 2.4 0 q 1.2 -1.5 2.4 0 q 1.2 -1.5 2.4 0" />
          <line x1="157.5" y1="84.6" x2="168.5" y2="84.6" />
          <line x1="157.5" y1="90.6" x2="168.5" y2="90.6" />
        </g>

        {/* Şimşek — flaşlayan */}
        <path d="M 178 84 L 183 84 L 180 88 L 185 88 L 179 95 L 181.5 90.5 L 177.5 90.5 Z"
              fill={w(0.42)} stroke={w(0.95)} strokeWidth="0.22"
              className="gc-spark" />

        {/* İletim direği */}
        <line x1="190"   y1="95"   x2="190"   y2="84" stroke={s(0.45)} strokeWidth="0.32" />
        <line x1="188.5" y1="95"   x2="190"   y2="93" stroke={s(0.32)} strokeWidth="0.20" />
        <line x1="191.5" y1="95"   x2="190"   y2="93" stroke={s(0.32)} strokeWidth="0.20" />
        <line x1="187"   y1="86"   x2="193"   y2="86" stroke={s(0.40)} strokeWidth="0.24" />
        <line x1="187.5" y1="84.5" x2="192.5" y2="84.5" stroke={s(0.40)} strokeWidth="0.24" />
        {/* Yüksek gerilim hatları */}
        <path d="M 187 86 Q 184 87.5 181 88" fill="none" stroke={c(0.32)} strokeWidth="0.20" />
        <path d="M 193 86 Q 196 87.5 198 88" fill="none" stroke={c(0.32)} strokeWidth="0.20" />
      </g>
      <text x="186" y="62" textAnchor="end" fontSize="2.6" fill={s(0.45)}
            fontFamily="Arial, sans-serif" letterSpacing="0.20em" fontWeight="500">
        ELEKTRİK
      </text>
      </g>

      {/* ═════════════════ MÜHENDİSLİK — alt orta hero centerpiece ═════════════════
       *  Holografik mühendislik çekirdeği: 3 katmanlı dönen halkalar (farklı yön/hız),
       *  radial flow akımları, gradient çekirdek ile pulse halkalar, 4 teknik
       *  annotation callout, holografik scan beam ve neon-gradient hero başlığı.    */}
      <g transform="translate(100 86) scale(0.6) translate(-100 -86)">
      <g>
        {/* Holografik taban — 3 ellipse footprint */}
        <ellipse cx="100" cy="98" rx="14" ry="1.4"
                 fill="none" stroke={c(0.32)} strokeWidth="0.20" />
        <ellipse cx="100" cy="98" rx="11" ry="1.0"
                 fill="none" stroke={c(0.20)} strokeWidth="0.16" strokeDasharray="0.4 0.6" />
        <ellipse cx="100" cy="98" rx="7" ry="0.7"
                 fill="none" stroke={c(0.15)} strokeWidth="0.14" />

        {/* Holografik scan beam — tabandan yukarı yansıyan ışık konisi */}
        <polygon points="100,98 88,76 112,76" fill="url(#gc-scan-beam)" opacity="0.30" />

        {/* Outer ring — 50s yavaş CW dönüş */}
        <g>
          <circle cx="100" cy="86" r="10" fill="none" stroke={c(0.32)} strokeWidth="0.30"
                  strokeDasharray="0.6 1.4" />
          <circle cx="100" cy="86" r="10" fill="none" stroke={c(0.16)} strokeWidth="0.18" />
          <animateTransform attributeName="transform" type="rotate"
            from="0 100 86" to="360 100 86" dur="50s" repeatCount="indefinite" />
        </g>

        {/* 12 derece tick marks (her 30°) — sabit, dönmez */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30) * Math.PI / 180;
          const major = i % 3 === 0;
          const r1 = 9.4;
          const r2 = major ? 10.8 : 10.4;
          return (
            <line key={`dt-${i}`}
              x1={100 + r1 * Math.sin(a)} y1={86 - r1 * Math.cos(a)}
              x2={100 + r2 * Math.sin(a)} y2={86 - r2 * Math.cos(a)}
              stroke={c(major ? 0.55 : 0.30)} strokeWidth={major ? 0.32 : 0.22} />
          );
        })}

        {/* Mid ring — gear teeth ile 30s CCW dönüş */}
        <g>
          <circle cx="100" cy="86" r="7" fill="none" stroke={c(0.30)} strokeWidth="0.24" />
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i * 22.5) * Math.PI / 180;
            return (
              <line key={`mt-${i}`}
                x1={100 + 7 * Math.sin(a)} y1={86 - 7 * Math.cos(a)}
                x2={100 + 7.8 * Math.sin(a)} y2={86 - 7.8 * Math.cos(a)}
                stroke={c(0.55)} strokeWidth="0.22" />
            );
          })}
          <animateTransform attributeName="transform" type="rotate"
            from="360 100 86" to="0 100 86" dur="30s" repeatCount="indefinite" />
        </g>

        {/* Inner ring — crosshair + dashed, 18s hızlı CW */}
        <g>
          <circle cx="100" cy="86" r="4.5" fill="none" stroke={c(0.45)} strokeWidth="0.30"
                  strokeDasharray="0.4 0.6" />
          <line x1="93.5" y1="86"   x2="95.5" y2="86"   stroke={c(0.65)} strokeWidth="0.30" />
          <line x1="104.5" y1="86"  x2="106.5" y2="86"  stroke={c(0.65)} strokeWidth="0.30" />
          <line x1="100" y1="79.5"  x2="100" y2="81.5"  stroke={c(0.65)} strokeWidth="0.30" />
          <line x1="100" y1="90.5"  x2="100" y2="92.5"  stroke={c(0.65)} strokeWidth="0.30" />
          <animateTransform attributeName="transform" type="rotate"
            from="0 100 86" to="360 100 86" dur="18s" repeatCount="indefinite" />
        </g>

        {/* 8 yönlü radial flow akımları — animasyonlu dash flow */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45) * Math.PI / 180;
          return (
            <line key={`spk-${i}`}
              x1={100 + 4.8 * Math.sin(a)} y1={86 - 4.8 * Math.cos(a)}
              x2={100 + 6.7 * Math.sin(a)} y2={86 - 6.7 * Math.cos(a)}
              stroke={c(0.65)} strokeWidth="0.22"
              className="gc-flow-fast" />
          );
        })}

        {/* Merkezi çekirdek — radial gradient halo + pulsing inner dot */}
        <circle cx="100" cy="86" r="3" fill="url(#gc-core-glow)" />
        <circle cx="100" cy="86" r="1.8" fill="rgba(15,28,55,0.6)" stroke={c(0.95)} strokeWidth="0.30" />
        <circle cx="100" cy="86" r="0.85" fill={w(0.95)} className="gc-pulse-node" />

        {/* Çekirdekten yayılan iki ambient pulse halkası (3s'de bir) */}
        <circle cx="100" cy="86" r="3" fill="none" stroke={c(0.65)} strokeWidth="0.28"
                className="gc-core-pulse-1" />
        <circle cx="100" cy="86" r="3" fill="none" stroke={c(0.45)} strokeWidth="0.28"
                className="gc-core-pulse-2" />
      </g>
      </g>

      {/* MÜHENDİSLİK etiketi — centerpiece'in sağ yanında, diğer disiplin etiketleriyle aynı stil */}
      <text x="110" y="87" fontSize="2.6" fill={s(0.45)}
            fontFamily="Arial, sans-serif" letterSpacing="0.20em" fontWeight="500">
        MÜHENDİSLİK
      </text>

    </svg>
  );
});

/* ─────────── Firma kartı (premium glass + 3D tilt + mikro-aksiyon) ─────────── */
function FirmaKarti({ firma, onSecim, isMobile, index }: {
  firma: Firma;
  onSecim: (f: Firma) => void;
  isMobile: boolean;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 }); // % cinsinden iç glow konumu

  const floatAnimMap: Record<string, string> = {
    meba:  'gc-float-1 5.5s ease-in-out infinite',
    elmos: 'gc-float-2 6.2s ease-in-out infinite',
    mesa:  'gc-float-3 5.8s ease-in-out infinite',
  };
  const idleAnim = floatAnimMap[firma.id] || 'gc-float-1 6s ease-in-out infinite';

  function handleMouseMove(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -7, y: dx * 9 });
    setGlow({
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  }

  const haloColor = firma.renkVurgu || accent(0.7);

  const cardStyle: CSSProperties = {
    width: isMobile ? '100%' : FIRMA_KART_LAYOUT.cardWidth,
    maxWidth: 260,
    padding: FIRMA_KART_LAYOUT.cardPadding,
    borderRadius: FIRMA_KART_LAYOUT.cardBorderRadius,
    cursor: 'pointer',
    border: `1px solid ${hovered ? haloColor : ink(0.14)}`,
    background: pressed
      ? 'rgba(7,12,28,0.96)'
      : hovered
      ? 'rgba(11,18,38,0.92)'
      : 'rgba(8,14,30,0.78)',
    boxShadow: hovered
      ? `0 30px 70px rgba(0,0,0,0.62), 0 0 0 1px ${haloColor}33, 0 0 60px ${haloColor}22, inset 0 1px 0 rgba(255,255,255,0.06)`
      : '0 22px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.03)',
    transform: hovered
      ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(10px)`
      : 'perspective(900px) rotateX(0) rotateY(0) translateZ(0)',
    animation: hovered ? 'none' : idleAnim,
    transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: FIRMA_KART_LAYOUT.cardInnerGap,
    userSelect: 'none',
    position: 'relative',
    overflow: 'hidden',
    outline: 'none',
    boxSizing: 'border-box',
    animationDelay: hovered ? undefined : `${index * 120}ms`,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSecim(firma)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); setTilt({ x: 0, y: 0 }); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={(e) => e.key === 'Enter' && onSecim(firma)}
      style={cardStyle}
    >
      {/* Üst gradient hairline (premium glass aksesuarı) */}
      <div style={{
        position: 'absolute', top: 0, left: '12%', right: '12%', height: 1,
        background: `linear-gradient(90deg, transparent, ${haloColor}${hovered ? 'cc' : '55'}, transparent)`,
        transition: 'all 0.25s ease',
      }} />

      {/* İç radial glow — mouse pozisyonuna göre */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(circle 240px at ${glow.x}% ${glow.y}%, ${haloColor}1f 0%, transparent 60%)`,
          transition: 'background 0.18s ease-out',
        }} />
      )}

      {/* Hover halkası */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: -4, borderRadius: 18,
          border: `1.5px solid ${haloColor}66`,
          animation: 'gc-ring 1.6s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Shimmer overlay (hover) */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(110deg, transparent 30%, ${haloColor}20 50%, transparent 70%)`,
          backgroundSize: '200% 100%',
          animation: 'gc-shimmer 1.6s linear infinite',
        }} />
      )}

      {/* Logo */}
      <LogoContainer
        firma={firma}
        imgFilter={
          hovered
            ? `drop-shadow(0 6px 18px ${haloColor}55)`
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.10))'
        }
      />

      {/* Slogan */}
      <div style={{
        fontSize: 10, letterSpacing: 1.6,
        color: hovered ? 'rgba(225,235,250,0.88)' : ink(0.55),
        textTransform: 'uppercase',
        textAlign: 'center', lineHeight: 1.55,
        transition: 'color 0.25s ease',
      }}>
        {firma.slogan}
        {firma.id === 'meba' && (
          <>
            {' · '}
            <span style={{ animation: 'gc-neon-pulse 3.2s ease-in-out infinite' }}>
              Yazılım
            </span>
          </>
        )}
      </div>

      {/* Mikro-aksiyon: hover'da "Giriş yap →" */}
      <div style={{
        marginTop: 4,
        height: 16,
        fontSize: 10, letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: hovered ? haloColor : 'transparent',
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.22s ease, transform 0.22s ease, color 0.25s ease',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>Giriş yap</span>
        <span style={{ animation: hovered ? 'gc-arrow-bob 1.4s ease-in-out infinite' : 'none' }}>
          →
        </span>
      </div>

      {/* Alt aksent */}
      <div style={{
        position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 1.5,
        background: `linear-gradient(90deg, transparent, ${haloColor}${hovered ? 'cc' : '33'}, transparent)`,
        transition: 'all 0.25s ease',
      }} />
    </div>
  );
}

/* ─────────── Ana Giriş Ekranı ─────────── */
export default function GirisEkrani() {
  const isMobile = useIsMobile(640);
  const { firmalar } = useFirma();
  const { loginYap } = useKullanici();

  const [adim, setAdim] = useState<Adim>('firma');
  const [secilenFirma, setSecilenFirma] = useState<Firma | null>(null);
  const [firmaPersoneli, setFirmaPersoneli] = useState<PersonelKart[]>([]);
  const [yukleniyorPersonel, setYukleniyorPersonel] = useState(false);
  const [personelHata, setPersonelHata] = useState<string | null>(null);
  const [mouse, setMouse] = useState({ x: -9999, y: -9999 });

  // Sayfa kucuk viewport'lara fit-to-screen ile sigsin: tasarim 1200×800
  // boyutunda kalir, viewport daha kucukse uniform olarak scale edilir
  // (her sey orantili olarak kuculur, hicbir sey tasmaz / kirpilmaz).
  // Viewport tasarim boyutundan buyukse 1× kalir (asiri buyumesin).
  const DESIGN_W = 1200;
  const DESIGN_H = 800;
  const [scale, setScale] = useState(1);
  useEffect(() => {
    function compute() {
      const sw = window.innerWidth / DESIGN_W;
      const sh = window.innerHeight / DESIGN_H;
      setScale(Math.min(1, sw, sh));
    }
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, []);

  async function firmaSec(f: Firma) {
    setSecilenFirma(f);
    setPersonelHata(null);
    setFirmaPersoneli([]);
    setAdim('kullanici');
    setYukleniyorPersonel(true);
    try {
      const liste = await api.firmalar.personel(f.id);
      setFirmaPersoneli(liste as PersonelKart[]);
    } catch (err) {
      setPersonelHata(err instanceof Error ? err.message : 'Personel listesi alinamadi.');
    } finally {
      setYukleniyorPersonel(false);
    }
  }

  function geriDon() {
    setAdim('firma');
    setSecilenFirma(null);
    setFirmaPersoneli([]);
    setPersonelHata(null);
  }

  /** Tek bir kart icinden gelen login denemesi. Backend secilenFirma'ya gore
   *  yetki kontrolu yapar; karta sonucu return edip onun gostermesini sagla. */
  async function loginDene(p: PersonelKart, sifre: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const kullaniciAdi = p.kullaniciAdi.trim().toLocaleLowerCase('tr-TR');
    const r = await loginYap(kullaniciAdi, sifre, secilenFirma?.id ?? null);
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true };
  }

  const haloColor = secilenFirma?.renkVurgu || accent(0.6);

  return (
    // DIS STAGE: viewport'u tamamen kaplar, koyu degrade arkaplan + ortala.
    // Burayi mouse takip eden de bu div, cunku icteki scale'li kutu kucult-
    // ulduğunde de mouse koordinatlarinin viewport-relative kalmasini istiyoruz.
    <div
      onMouseMove={(e) => setMouse({
        // Mouse'u tasarim boyutuna donustur: kullanici nereye geldiyse
        // scale'lı icteki cocuga dogru noktaya denk gelsin
        x: (e.clientX - (window.innerWidth - DESIGN_W * scale) / 2) / scale,
        y: (e.clientY - (window.innerHeight - DESIGN_H * scale) / 2) / scale,
      })}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'linear-gradient(160deg, #04081a 0%, #0a132a 45%, #060c1c 100%)',
        display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue","Inter","Arial",sans-serif',
        overflow: 'hidden',
        color: 'rgba(220,232,250,0.92)',
      }}
    >
      <style>{ANIMATIONS_CSS}</style>
      {/* AMBIENT BACKGROUND — arkaplan katmanlari her zaman tam viewport'u
          kaplar (sinematik tam-ekran his). Scale uygulanmaz. Form icerigi
          ayri bir scale'li kapsayicida. */}
      <AmbientBackground mouse={mouse} scenesOpacity={adim === 'firma' ? 1 : 0.25} />

      {/* FORM SAHNESI: tasarim 1200×800. transform: scale() ile viewport'a
          oranli olarak kuculur. Arkaplan tam viewport'ta kalirken sadece
          form/baslik/kartlar bu kapsayici icinde olcekleneceginden, kucuk
          ekranlarda "hepsi sigsin" davranisini saglar; tam ekranda ise
          tasarim boyutunda gorunur. */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}
      >

      {/* FIRMA SEÇİMİ */}
      {adim === 'firma' && (
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          width: '100%',
          // Hero centerpiece'e nefes alanı bırakmak için içeriği yukarı çek
          marginBottom: 140,
        }}>
          {/* Başlık bloğu */}
          <div style={{
            textAlign: 'center', marginBottom: 38,
            animation: 'gc-fade-up 0.55s both',
          }}>
            {/* Eyebrow — sadece İngilizce */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '5px 14px', borderRadius: 999,
              border: `1px solid ${ink(0.14)}`,
              background: 'rgba(10,18,38,0.55)',
              backdropFilter: 'blur(10px)',
              fontSize: 10, letterSpacing: 4,
              color: ink(0.55), textTransform: 'uppercase',
              marginBottom: 22,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: accent(0.85),
                boxShadow: `0 0 8px ${accent(0.85)}`,
                animation: 'gc-pulse-soft 2.4s ease-in-out infinite',
              }} />
              Group Companies
            </div>

            {/* Ana başlık — zarif çelik-krom gradient (statik, animasyonsuz) */}
            <div style={{
              fontSize: isMobile ? 40 : 64,
              fontWeight: 500,
              letterSpacing: isMobile ? 1.4 : 2.4,
              lineHeight: 1.05,
              fontFamily:
                '"Manrope","Inter","Helvetica Neue","Arial",sans-serif',
              background:
                'linear-gradient(180deg, #ffffff 0%, #e8eef8 28%, #b8c8de 65%, #7a8eb0 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 24px rgba(120,170,240,0.22)',
            }}>
              TEKLİF SİSTEMİ
            </div>

            {/* MEBA · ELMOS · MESA — sade banner (Manrope) */}
            <div style={{
              marginTop: 28, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 18,
              fontSize: isMobile ? 11 : 13, letterSpacing: 5,
              fontWeight: 500,
              fontFamily:
                '"Manrope","Inter","Helvetica Neue","Arial",sans-serif',
              textTransform: 'uppercase',
              color: ink(0.62),
            }}>
              <span style={{
                width: 70, height: 1,
                background: `linear-gradient(90deg, transparent, ${ink(0.45)})`,
              }} />
              <span>MEBA &nbsp;·&nbsp; ELMOS &nbsp;·&nbsp; MESA</span>
              <span style={{
                width: 70, height: 1,
                background: `linear-gradient(90deg, ${ink(0.45)}, transparent)`,
              }} />
            </div>

            <div style={{
              marginTop: 32, fontSize: 12, color: ink(0.5),
              letterSpacing: 1.8, fontWeight: 400,
              textTransform: 'uppercase',
            }}>
              Devam etmek için bir firma seçin
            </div>
          </div>

          {/* Kart sırası */}
          <div style={{
            display: 'flex', gap: FIRMA_KART_LAYOUT.cardsRowGap,
            flexWrap: 'wrap', justifyContent: 'center',
            padding: '0 24px', maxWidth: 920,
            animation: 'gc-fade-up 0.6s 0.1s both',
          }}>
            {(['meba', 'elmos', 'mesa']
              .map((id) => firmalar.find((f) => f.id === id))
              .filter(Boolean) as Firma[]
            ).map((f, idx) => (
              <FirmaKarti
                key={f.id}
                firma={f}
                onSecim={firmaSec}
                isMobile={isMobile}
                index={idx}
              />
            ))}
          </div>

          {firmalar.length === 0 && (
            <div style={{
              marginTop: 26, fontSize: 12, color: ink(0.5),
              letterSpacing: 1.2,
            }}>
              Sunucuya bağlanılıyor...
            </div>
          )}
        </div>
      )}

      {/* PERSONEL KART SECIMI (kart kendisi giris butonudur — sifre kart icinde) */}
      {adim === 'kullanici' && secilenFirma && (
        <PersonelKartSecimi
          firma={secilenFirma}
          personel={firmaPersoneli}
          yukleniyor={yukleniyorPersonel}
          hata={personelHata}
          haloColor={haloColor}
          isMobile={isMobile}
          onLoginDene={loginDene}
          onGeri={geriDon}
        />
      )}

      </div>
    </div>
  );
}

/* ─────────── Personel Avatar — VESIKALIK 3:4 dik dortgen ─────────── */
function PersonelAvatar({
  kullanici, haloColor, size = 56,
}: { kullanici: PersonelKart; haloColor: string; size?: number }) {
  const isYonetici = kullanici.rol === 'super_admin' || kullanici.rol === 'admin' || kullanici.rol === 'firma_admin';
  const ringColor = isYonetici ? 'rgba(251,191,36,0.55)' : haloColor;
  // Vesikalık format: width = size, height = size * 4/3 (3:4 oran)
  const w = size;
  const h = Math.round(size * 4 / 3);
  if (kullanici.profilFotoUrl) {
    return (
      <img
        src={kullanici.profilFotoUrl}
        alt={formatAdSoyad(kullanici.adSoyad)}
        draggable={false}
        style={{
          width: w, height: h, borderRadius: 8,
          objectFit: 'cover', objectPosition: 'center top',
          flexShrink: 0,
          border: `1.5px solid ${ringColor}`,
          boxShadow: `0 4px 14px rgba(0,0,0,0.45), 0 0 0 3px ${ringColor}22`,
        }}
      />
    );
  }
  return (
    <div style={{
      width: w, height: h, borderRadius: 8,
      background: `linear-gradient(135deg, ${haloColor}33, rgba(8,15,32,0.85))`,
      border: `1.5px solid ${ringColor}`,
      boxShadow: `0 4px 14px rgba(0,0,0,0.45), 0 0 0 3px ${ringColor}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.40), fontWeight: 700,
      color: 'rgba(232,242,255,0.92)',
      letterSpacing: 0.5, flexShrink: 0,
      fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Arial",sans-serif',
    }}>
      {kullanici.initials}
    </div>
  );
}

/* ─────────── Personel Kart Secimi ekrani ─────────── */
interface PersonelKartSecimiProps {
  firma: Firma;
  personel: PersonelKart[];
  yukleniyor: boolean;
  hata: string | null;
  haloColor: string;
  isMobile: boolean;
  onLoginDene: (p: PersonelKart, sifre: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onGeri: () => void;
}

function PersonelKartSecimi({
  firma, personel, yukleniyor, hata, haloColor, isMobile,
  onLoginDene, onGeri,
}: PersonelKartSecimiProps) {
  return (
    <div style={{
      position: 'relative', zIndex: 2,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: '100%', maxWidth: 1280,
      padding: isMobile ? '12px 12px 16px' : '14px 24px 18px',
      maxHeight: '100vh',
      boxSizing: 'border-box',
      animation: 'gc-fade-up 0.4s both',
    }}>
      {/* Üst başlık + Geri butonu — kompakt tek satir */}
      <div style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 14,
      }}>
        <LogoContainer
          firma={firma}
          style={{ width: 96, height: 64, padding: 6, borderRadius: 8, flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 9, letterSpacing: 2.2, color: ink(0.4),
            textTransform: 'uppercase', marginBottom: 2,
          }}>
            {firma.kisaAd}
          </div>
          <div style={{
            fontSize: isMobile ? 15 : 17, fontWeight: 500, letterSpacing: 0.3,
            fontFamily: '"Manrope","Inter","Helvetica Neue","Arial",sans-serif',
            color: 'rgba(232,242,255,0.96)',
            textShadow: '0 1px 12px rgba(120,170,240,0.18)',
            wordBreak: 'break-word', lineHeight: 1.25,
          }}>
            {firma.ad}
          </div>
          <div style={{
            fontSize: 10, color: ink(0.55), letterSpacing: 0.8, marginTop: 1,
          }}>
            Giriş yapacak personeli seçiniz
          </div>
        </div>
        <button
          onClick={onGeri}
          style={{
            flexShrink: 0,
            background: 'transparent', border: `1px solid ${ink(0.18)}`,
            color: ink(0.7), padding: '6px 12px',
            borderRadius: 999, cursor: 'pointer',
            fontSize: 10.5, letterSpacing: 1.2,
            textTransform: 'uppercase',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = ink(0.35);
            e.currentTarget.style.color = 'rgba(225,235,250,0.92)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = ink(0.18);
            e.currentTarget.style.color = ink(0.7);
          }}
        >
          ← Firma değiştir
        </button>
      </div>

      {/* Yükleniyor / Hata / Boş durumlar */}
      {yukleniyor && (
        <div style={{
          padding: 40, color: ink(0.55), fontSize: 13, letterSpacing: 1,
        }}>
          Personel listesi yükleniyor…
        </div>
      )}
      {!yukleniyor && hata && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(180,40,55,0.18)',
          border: '1px solid rgba(220,80,95,0.42)',
          borderRadius: 10, color: 'rgba(255,200,200,0.95)',
          fontSize: 12, letterSpacing: 0.3, marginBottom: 16,
        }}>
          {hata}
        </div>
      )}
      {!yukleniyor && !hata && personel.length === 0 && (
        <div style={{
          padding: 40, color: ink(0.5), fontSize: 13, letterSpacing: 0.5,
          textAlign: 'center',
        }}>
          Bu firmada henüz kayıtlı personel yok.<br />
          <span style={{ fontSize: 11, color: ink(0.4) }}>
            Yöneticinizden personel eklemesini isteyebilirsiniz.
          </span>
        </div>
      )}

      {/* Yoneticiler ve Personel ayri bolumlerde — yoneticiler HERZAMAN ustte
          Tum kartlar FLEX layout ile esit dagilimli; tek ekrana sigsin diye
          flex-wrap + flex-grow:1 ile mevcut alani paylasirlar. */}
      {!yukleniyor && personel.length > 0 && (() => {
        const yoneticiRolleri = ['super_admin', 'admin', 'firma_admin'];
        const yoneticiler = personel.filter((p) => yoneticiRolleri.includes(p.rol));
        const personeller = personel.filter((p) => !yoneticiRolleri.includes(p.rol));
        const flexRowStyle: React.CSSProperties = {
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          width: '100%',
          justifyContent: 'center',
        };
        const flexItemStyle: React.CSSProperties = {
          flex: '1 1 200px',
          minWidth: 180,
          maxWidth: 300,
          display: 'flex',
        };
        const baslikStyle: React.CSSProperties = {
          fontSize: 10, letterSpacing: 2.5,
          color: ink(0.45), textTransform: 'uppercase',
          fontWeight: 600,
          marginBottom: 8,
          paddingLeft: 2,
          width: '100%',
        };

        return (
          <>
            {yoneticiler.length > 0 && (
              <div style={{ width: '100%', marginBottom: personeller.length > 0 ? 18 : 0 }}>
                <div style={{
                  ...baslikStyle,
                  color: 'rgba(251,191,36,0.65)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ flexShrink: 0 }}>Yöneticiler</span>
                  <span style={{
                    flex: 1, height: 1,
                    background: 'linear-gradient(90deg, rgba(251,191,36,0.30), transparent)',
                  }} />
                </div>
                <div style={flexRowStyle}>
                  {yoneticiler.map((p) => (
                    <div key={p.id} style={flexItemStyle}>
                      <PersonelKart
                        kullanici={p}
                        haloColor={haloColor}
                        onLoginDene={(sifre) => onLoginDene(p, sifre)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {personeller.length > 0 && (
              <div style={{ width: '100%' }}>
                <div style={{
                  ...baslikStyle,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ flexShrink: 0 }}>Personel</span>
                  <span style={{
                    flex: 1, height: 1,
                    background: `linear-gradient(90deg, ${ink(0.20)}, transparent)`,
                  }} />
                </div>
                <div style={flexRowStyle}>
                  {personeller.map((p) => (
                    <div key={p.id} style={flexItemStyle}>
                      <PersonelKart
                        kullanici={p}
                        haloColor={haloColor}
                        onLoginDene={(sifre) => onLoginDene(p, sifre)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

/* ─────────── Tek personel kartı — KARTIN TAMAMI GIRIS BUTONUDUR ───────────
 *
 * Davranis ozeti:
 *   - Kart elemani role="button"; tum yuzeyi tikla (ya da Enter/Space) =>
 *     login denemesi yapilir.
 *   - Eger sifre "Sifreyi Hatirla" ile daha onceden saklandiysa → input
 *     gozukmez, kart tikla = saklanmis sifre ile direkt login.
 *   - Sifre saklanmiyorsa → kart icinde elit bir sifre input + "Hatirla"
 *     checkbox gorunur. Input/checkbox'a tikla yine kart click'ini tetikler
 *     ama input olduysan kendi click davranisi devam eder (focus/checked).
 *   - Login basarili olursa hatirla isaretliyse sifre saklanir; islem
 *     basarisiz olursa eski saklanan sifre temizlenir (stale ise).
 */
function PersonelKart({
  kullanici, haloColor,
  onLoginDene,
}: {
  kullanici: PersonelKart;
  haloColor: string;
  onLoginDene: (sifre: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const isYonetici = kullanici.rol === 'super_admin' || kullanici.rol === 'admin' || kullanici.rol === 'firma_admin';
  const [hatirlanmis, setHatirlanmis] = useState<boolean>(
    () => getRememberedSifre(kullanici.id) !== null,
  );
  // `acik`: sifre giris alani gorunur mu? Kart varsayilan KAPALI gelir
  // (yalnizca avatar+ad+unvan); kullanici karta tiklayinca acilir, input
  // odaklanir. Sifre saklanmissa hicbir alan gozukmez.
  const [acik, setAcik] = useState(false);
  const [sifre, setSifre] = useState('');
  const [hatirla, setHatirla] = useState<boolean>(true);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [hover, setHover] = useState(false);
  const sifreInputRef = useRef<HTMLInputElement | null>(null);

  async function dene() {
    if (yukleniyor) return;
    // Sifre saklanmissa → direkt login
    if (hatirlanmis) {
      const aktifSifre = getRememberedSifre(kullanici.id) || '';
      if (!aktifSifre) {
        // Storage bos cikti — hatirla state'i guncel degilmis, ac
        setHatirlanmis(false);
        setAcik(true);
        setTimeout(() => sifreInputRef.current?.focus(), 50);
        return;
      }
      setYukleniyor(true);
      setHata(null);
      const r = await onLoginDene(aktifSifre);
      setYukleniyor(false);
      if (!r.ok) {
        setHata(r.error);
        clearRememberedSifre(kullanici.id);
        setHatirlanmis(false);
        setAcik(true);
        setSifre('');
        setTimeout(() => sifreInputRef.current?.focus(), 50);
      }
      return;
    }
    // Sifre saklanmiyorsa: ilk tikla → ac + odakla; ikinci tikla → submit
    if (!acik) {
      setAcik(true);
      setTimeout(() => sifreInputRef.current?.focus(), 50);
      return;
    }
    if (!sifre) {
      // Acik ama sifre yazilmamis → odaga geri don
      sifreInputRef.current?.focus();
      return;
    }
    setYukleniyor(true);
    setHata(null);
    const r = await onLoginDene(sifre);
    setYukleniyor(false);
    if (!r.ok) {
      setHata(r.error);
      setSifre('');
      setTimeout(() => sifreInputRef.current?.focus(), 50);
      return;
    }
    // Basarili: hatirla isaretliyse sakla, degilse temizle
    if (hatirla) setRememberedSifre(kullanici.id, sifre);
    else clearRememberedSifre(kullanici.id);
  }

  function unutBeni(e: React.MouseEvent) {
    e.stopPropagation();
    clearRememberedSifre(kullanici.id);
    setHatirlanmis(false);
    setAcik(true);
    setSifre('');
    setHata(null);
    setTimeout(() => sifreInputRef.current?.focus(), 50);
  }

  function kartKey(e: React.KeyboardEvent) {
    // Kart kendisi buton: Enter veya Space ile login dene
    if (e.key === 'Enter' || e.key === ' ') {
      // Input/checkbox aktif degilse karti tetikle
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT') return; // input'un kendi davranisi
      e.preventDefault();
      void dene();
    }
  }

  // Kart hover renkleri / box shadow yonetimi
  const baseBorder = isYonetici ? 'rgba(251,191,36,0.30)' : ink(0.14);
  const hoverBorder = isYonetici ? 'rgba(251,191,36,0.85)' : `${haloColor}cc`;
  const aktifBorder = hover ? hoverBorder : baseBorder;
  const baseShadow = '0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)';
  const hoverShadow = isYonetici
    ? '0 18px 40px rgba(0,0,0,0.55), 0 0 32px rgba(251,191,36,0.30), inset 0 1px 0 rgba(255,255,255,0.10)'
    : `0 18px 40px rgba(0,0,0,0.55), 0 0 32px ${haloColor}55, inset 0 1px 0 rgba(255,255,255,0.10)`;

  // input'lara click event'i bubble etmesin diye stopPropagation
  function stop(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${formatAdSoyad(kullanici.adSoyad)} olarak giris yap`}
      onClick={() => void dene()}
      onKeyDown={kartKey}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'rgba(8,15,32,0.72)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: `1px solid ${aktifBorder}`,
        borderRadius: 14,
        padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: yukleniyor ? 'wait' : 'pointer',
        transform: hover && !yukleniyor ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hover ? hoverShadow : baseShadow,
        transition: 'all 0.18s ease',
        outline: 'none',
        userSelect: 'none',
        // Flex parent doldur — kart eninde flex-item olarak davranir
        flex: '1 1 auto',
        width: '100%',
        boxSizing: 'border-box',
        minHeight: 0,
      }}
    >
      {/* Üst kısım: avatar (sol) + (ad → unvan → etiket) kolonu (sag).
          alignItems: flex-start → ISIM resmin UST kenari ile ayni seviyede.
          Sira: name -> kucuk bosluk -> unvan -> (varsa) etiket en altta.
          Hicbir boyuta dokunulmaz: avatar 56×75 sabit, etiket 80×30 sabit. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <PersonelAvatar kullanici={kullanici} haloColor={haloColor} size={56} />
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          // Aradaki bosluk: 5 (mevcut 10'un yarisi)
          gap: 5,
          // minHeight YOK — aksi halde alt bos alana yayilir, gap'in
          // gorsel etkisi gizlenir. Avatar zaten 75px tall; row align-items
          // flex-start ile isim avatarin TOP kenarinda baslar.
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            fontSize: 14.5, fontWeight: 600,
            color: 'rgba(232,242,255,0.96)',
            fontFamily: '"Manrope","Inter","Helvetica Neue","Arial",sans-serif',
            letterSpacing: 0.1,
            // 2 satir yer rezerve et — kisa isimli kartlarda da uzun isimli
            // kartlarla ayni yukseklik, ayni unvan baslangic noktasi.
            minHeight: 35,
          }}>
            <span style={{
              flex: 1, minWidth: 0,
              wordBreak: 'break-word',
              lineHeight: 1.2,
            }}>
              {formatAdSoyad(kullanici.adSoyad)}
            </span>
            {hatirlanmis && (
              <button
                type="button"
                onClick={unutBeni}
                title="Şifre hatırlanıyor — kaldırmak için tıkla"
                aria-label="Hatirlanan sifreyi kaldir"
                style={{
                  flexShrink: 0,
                  width: 28, height: 28, borderRadius: 6,
                  border: '1px solid rgba(110,200,140,0.7)',
                  background: 'rgba(70,150,90,0.22)',
                  color: 'rgba(190,235,210,0.98)',
                  fontSize: 16, fontWeight: 700, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                  boxShadow: '0 2px 6px rgba(70,150,90,0.18), inset 0 1px 0 rgba(255,255,255,0.10)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(220,80,95,0.22)';
                  e.currentTarget.style.borderColor = 'rgba(220,80,95,0.7)';
                  e.currentTarget.style.color = 'rgba(255,200,200,0.98)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,80,95,0.22), inset 0 1px 0 rgba(255,255,255,0.10)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(70,150,90,0.22)';
                  e.currentTarget.style.borderColor = 'rgba(110,200,140,0.7)';
                  e.currentTarget.style.color = 'rgba(190,235,210,0.98)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(70,150,90,0.18), inset 0 1px 0 rgba(255,255,255,0.10)';
                }}
              >
                ✓
              </button>
            )}
          </div>
          {(() => {
            const raw = kullanici.unvan || ROL_ETIKET[kullanici.rol];
            const { ana, paren } = splitUnvanWithParen(formatUnvan(raw));
            return (
              <div style={{
                fontSize: 10.5, color: ink(0.6), letterSpacing: 0.5,
                wordBreak: 'break-word', lineHeight: 1.3,
              }}>
                <span>{ana}</span>
                {paren && (
                  <>
                    <br />
                    <span style={{ color: ink(0.45), fontStyle: 'italic' }}>{paren}</span>
                  </>
                )}
              </div>
            );
          })()}

          {/* Yonetici rol etiketi — TUM etiketler ayni ebatta (80 x 30).
              Avatar+isim+unvan'in ALTINDA, kucuk bir bosluk sonrasi inline.
              Kelime sayisina gore satira ayrilir, icerik dikey+yatay ortali. */}
          {isYonetici && (
            <div style={{
              alignSelf: 'flex-start',
              width: 80, minHeight: 30,
              fontSize: 8.5, fontWeight: 700, letterSpacing: 0.5,
              color: 'rgba(251,191,36,0.95)',
              background: 'rgba(251,191,36,0.10)',
              border: '1px solid rgba(251,191,36,0.32)',
              padding: '3px 6px', borderRadius: 6,
              textTransform: 'uppercase',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              lineHeight: 1.1, textAlign: 'center',
              boxSizing: 'border-box',
            }}>
              {ROL_ETIKET[kullanici.rol].split(' ').map((word, i) => (
                <span key={i}>{word}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sifre alanı + "hatirla" — sifre hatirlaniyorsa veya kart KAPALI ise GORUNMEZ.
          Kart kapali → kullanici tiklar → acik=true → input belirir + auto-focus */}
      {!hatirlanmis && acik && (
        <div onClick={stop} onKeyDown={stop}>
          <input
            ref={sifreInputRef}
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void dene();
              }
            }}
            placeholder="Şifre"
            autoComplete="current-password"
            disabled={yukleniyor}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px',
              background: 'rgba(5,11,26,0.7)',
              border: `1px solid ${ink(0.18)}`,
              borderRadius: 10,
              color: 'rgba(225,235,250,0.96)',
              fontSize: 13, fontFamily: 'inherit', letterSpacing: 1,
              outline: 'none',
              transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = haloColor;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${haloColor}1f`;
              e.currentTarget.style.background = 'rgba(8,16,34,0.85)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = ink(0.18);
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = 'rgba(5,11,26,0.7)';
            }}
          />
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 9, fontSize: 11, color: ink(0.65),
            cursor: 'pointer', userSelect: 'none',
            letterSpacing: 0.4,
          }}>
            <input
              type="checkbox"
              checked={hatirla}
              onChange={(e) => setHatirla(e.target.checked)}
              disabled={yukleniyor}
              style={{
                width: 14, height: 14, accentColor: haloColor,
                cursor: 'pointer', margin: 0,
              }}
            />
            Şifreyi hatırla
          </label>
        </div>
      )}

      {/* Hata mesajı (login basarisiz) */}
      {hata && (
        <div style={{
          padding: '7px 10px',
          background: 'rgba(180,40,55,0.18)',
          border: '1px solid rgba(220,80,95,0.42)',
          borderRadius: 8,
          color: 'rgba(255,200,200,0.95)',
          fontSize: 11, letterSpacing: 0.3,
        }}>
          {hata}
        </div>
      )}

      {/* Yukleniyor sirasinda gorsel feedback (yazi yok, sadece nabiz) */}
      {yukleniyor && (
        <div style={{
          marginTop: 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 4,
        }}>
          <div style={{
            width: '40%', height: 2, borderRadius: 999,
            background: `linear-gradient(90deg, transparent, ${haloColor}, transparent)`,
            backgroundSize: '200% 100%',
            animation: 'gc-shimmer 1.2s linear infinite',
          }} />
        </div>
      )}
    </div>
  );
}
