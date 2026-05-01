import { useState, useRef, forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { useFirma } from '../context/useFirma';
import { useKullanici } from '../context/useKullanici';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Firma } from '../types/firma';
import type { Kullanici } from '../types/kullanici';
import { FIRMA_KART_LAYOUT } from '../components/FirmaSecimKartLayout';
import { LogoContainer } from '../components/LogoContainer';

type Adim = 'firma' | 'kullanici' | 'sifre';

/* ── Renk yardımcıları ─────────────────────────────────── */
// Önceki "gold" tonu (185,148,52) saf nötr griye çevrildi — giriş ekranında
// hiçbir kahve/altın hue kalmaz. Aynı değişken adı korundu.
const gold   = (a: number) => `rgba(180,180,180,${a})`;
const silver = (a: number) => `rgba(172,186,205,${a})`;

/* ─────────── ANIMATIONS (CSS @keyframes) ─────────────── */
const ANIMATIONS_CSS = `
  @keyframes gc-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes gc-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes gc-burst   { 0% { opacity: 0; transform: scale(0.4); } 60% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0; transform: scale(2.4); } }
  @keyframes gc-typew   { from { width: 0; } to { width: 100%; } }
  @keyframes gc-blink   { 50% { opacity: 0.4; } }
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
  @keyframes gc-glow-pulse {
    0%, 100% {
      box-shadow: 0 0 10px rgba(255,210,80,0.42), 0 0 20px rgba(255,180,40,0.22), inset 0 0 6px rgba(255,220,120,0.18);
      transform: scale(1);
      filter: brightness(1);
    }
    50% {
      box-shadow: 0 0 28px rgba(255,225,120,0.95), 0 0 60px rgba(255,200,60,0.55), 0 0 100px rgba(255,200,60,0.30), inset 0 0 14px rgba(255,235,150,0.45);
      transform: scale(1.07);
      filter: brightness(1.25);
    }
  }
  @keyframes gc-text-shimmer {
    0%, 100% { text-shadow: 0 0 6px rgba(255,225,120,0.85), 0 0 14px rgba(255,200,60,0.55); }
    50%      { text-shadow: 0 0 10px rgba(255,245,180,1), 0 0 22px rgba(255,220,90,0.85), 0 0 36px rgba(255,200,40,0.55); }
  }
  /* Neon pulse — sönükken silver, yandığında MEBA çerçevesi nötr gri neon */
  @keyframes gc-neon-pulse {
    0%, 100% {
      color: rgba(172,186,205,0.55);
      text-shadow: none;
    }
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

/* ─────────── Engineering CAD overlay ─────────── */
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
      {/* Üst altın çizgi (sweep) */}
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
      {/* Alt gümüş çizgi */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${silver(0.18)} 50%, transparent)`,
      }} />
      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)',
      }} />
      {/* Merkezi pulse glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 700, height: 460,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(ellipse, rgba(15,40,100,0.32) 0%, transparent 70%)',
        animation: 'gc-pulse-bg 6s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* ══ MÜHENDİSLİK / MEKANİK / ELEKTRİK / ELEKTRONİK SEMBOLLERİ ══ */}
      <EngineeringSymbols />
    </>
  );
}

/* Mühendislik sembolleri SVG katmanı — dişli, direnç, kondansatör, sensör,
 * pnömatik silindir/valf, ölçü çizgileri (CAD), GND, voltmetre, akış oku.
 * viewBox 200×100 → preserveAspectRatio slice ile tüm ekrana yayılır.
 * Hafif blur + düşük opaklık (form okunabilir kalır). */
function EngineeringSymbols() {
  return (
    <svg
      viewBox="0 0 200 100"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        filter: 'blur(0.4px)',
        zIndex: 0,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Yavaş döner dişli + piston in/out animasyonu */}
      <style>{`
        .gear-rot-cw  { transform-origin: center; transform-box: fill-box; animation: gc-spin 90s linear infinite; }
        .gear-rot-ccw { transform-origin: center; transform-box: fill-box; animation: gc-spin 110s linear infinite reverse; }
        @keyframes gc-spin { to { transform: rotate(360deg); } }
        @keyframes gc-current { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -20; } }
        .current-flow { stroke-dasharray: 1.4 1.6; animation: gc-current 7s linear infinite; }
        /* Piston rod ileri-geri hareket (pnömatik strok) — yavaş ve küçük */
        @keyframes gc-piston-stroke {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(5px); }
        }
        .piston-rod { animation: gc-piston-stroke 7s ease-in-out infinite; }
        @keyframes gc-piston-inner {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(5px); }
        }
        .piston-inner { animation: gc-piston-inner 7s ease-in-out infinite; }
        /* Hava akışı pulse */
        @keyframes gc-air-pulse {
          0%, 100% { opacity: 0.18; r: 0.55; }
          50%      { opacity: 0.55; r: 0.9; }
        }
        .air-port { animation: gc-air-pulse 6s ease-in-out infinite; }
        .air-port-2 { animation: gc-air-pulse 6s ease-in-out infinite reverse; }
      `}</style>

      {/* ═══ SOL ÜST: BÜYÜK DİŞLİ (mekanik) ═══ */}
      <g className="gear-rot-cw">
        <Gear cx={8} cy={8} r={9} R={13} n={12} stroke={gold(0.13)} sw={0.32} />
      </g>
      {/* Sol orta dişli (büyütüldü) */}
      <g className="gear-rot-ccw">
        <Gear cx={20} cy={50} r={8} R={12} n={14} stroke={gold(0.14)} sw={0.32} />
      </g>
      {/* MEKANİK etiketi — dişlinin altında, soluk, diğer disiplinlerle aynı stil */}
      <text x="20" y="66.5" textAnchor="middle" fontSize="2.6" fill={gold(0.32)}
            fontFamily="Arial, sans-serif" letterSpacing="0.20em" fontWeight="500">
        MEKANİK
      </text>
      {/* Sol dişlileri bağlayan kayış (dashed) */}
      <line x1="14" y1="18" x2="19" y2="40" stroke={gold(0.06)} strokeWidth="0.22" strokeDasharray="1.4 2.4" />

      {/* Sağ alt: orta boy dişli (kısmen kırpılmış) */}
      <g className="gear-rot-ccw">
        <Gear cx={188} cy={92} r={9} R={13} n={12} stroke={silver(0.12)} sw={0.32} />
      </g>
      {/* Sağ üst küçük dişli */}
      <g className="gear-rot-cw">
        <Gear cx={178} cy={12} r={4} R={6} n={8} stroke={silver(0.10)} sw={0.26} />
      </g>

      {/* ═══ ELEKTRİK DEVRESİ — SAĞ ÜST ═══ */}
      {/* Giriş hattı */}
      <line x1="104" y1="22" x2="116" y2="22" stroke={silver(0.13)} strokeWidth="0.30" />
      {/* Direnç (zigzag) */}
      <polyline
        points="116,22 117.2,19.2 118.8,24.8 120.4,19.2 122.0,24.8 123.6,19.2 125,22"
        fill="none" stroke={silver(0.18)} strokeWidth="0.32"
      />
      {/* Direnç -> Kondansatör arası */}
      <line x1="125" y1="22" x2="135" y2="22" stroke={silver(0.13)} strokeWidth="0.30" />
      {/* Kondansatör (paralel iki çizgi) */}
      <line x1="135" y1="18" x2="135" y2="26" stroke={silver(0.20)} strokeWidth="0.45" />
      <line x1="137" y1="18" x2="137" y2="26" stroke={silver(0.20)} strokeWidth="0.45" />
      {/* Kondansatör çıkışı */}
      <line x1="137" y1="22" x2="148" y2="22" stroke={silver(0.13)} strokeWidth="0.30" />
      {/* Akım akışı animasyonu (üstteki çizgi) */}
      <line x1="104" y1="22" x2="148" y2="22"
            stroke={gold(0.45)} strokeWidth="0.18"
            className="current-flow" opacity="0.55" />

      {/* Toprak (GND) - kondansatörden aşağı */}
      <line x1="122" y1="22" x2="122" y2="32" stroke={silver(0.10)} strokeWidth="0.26" />
      <line x1="118.5" y1="32" x2="125.5" y2="32" stroke={silver(0.18)} strokeWidth="0.45" />
      <line x1="119.8" y1="33.5" x2="124.2" y2="33.5" stroke={silver(0.13)} strokeWidth="0.32" />
      <line x1="120.8" y1="35" x2="123.2" y2="35" stroke={silver(0.10)} strokeWidth="0.26" />

      {/* ═══ TRANSFORMATÖR (alt orta-sağ) ═══ */}
      <g stroke={gold(0.16)} strokeWidth="0.28" fill="none">
        {/* Bobin 1 (4 yarı çember) */}
        <path d="M 142 70 q 1.5 -2 3 0 q 1.5 -2 3 0 q 1.5 -2 3 0 q 1.5 -2 3 0" />
        {/* Bobin 2 */}
        <path d="M 142 73 q 1.5 -2 3 0 q 1.5 -2 3 0 q 1.5 -2 3 0 q 1.5 -2 3 0" />
        {/* Çekirdek çizgileri */}
        <line x1="141" y1="68.5" x2="155" y2="68.5" />
        <line x1="141" y1="74.5" x2="155" y2="74.5" />
      </g>

      {/* ═══ VOLTMETRE / SENSOR (sağ üst köşe) ═══ */}
      <circle cx="160" cy="35" r="3.2" fill="none" stroke={silver(0.18)} strokeWidth="0.30" />
      <text x="160" y="36.4" textAnchor="middle" fontSize="3" fill={silver(0.40)}
            fontFamily="Arial, sans-serif" fontWeight="600">V</text>
      <line x1="156.8" y1="35" x2="153" y2="35" stroke={silver(0.14)} strokeWidth="0.28" />
      <line x1="163.2" y1="35" x2="167" y2="35" stroke={silver(0.14)} strokeWidth="0.28" />

      {/* Ampermetre (sol orta-üst) */}
      <circle cx="36" cy="32" r="2.8" fill="none" stroke={gold(0.16)} strokeWidth="0.30" />
      <text x="36" y="33.2" textAnchor="middle" fontSize="2.6" fill={gold(0.40)}
            fontFamily="Arial, sans-serif" fontWeight="600">A</text>

      {/* ═══ PNÖMATİK SİLİNDİR — sol alt boş alan ═══ */}
      {/* Konum: x=4..26, y=82..90 — sol alt köşeye yakın, dişlilerden ve diyottan
          uzak. Rod max strok=31, diyot x=68'de başlar → çakışma yok. */}
      <g opacity="0.45">
        {/* Silindir gövdesi (22x8) */}
        <rect x="4" y="82" width="22" height="8" rx="0.8"
              fill="rgba(30,40,70,0.35)"
              stroke={gold(0.42)} strokeWidth="0.32" />
        {/* Iç gölge */}
        <rect x="4.7" y="82.7" width="20.6" height="6.6" rx="0.4"
              fill="none"
              stroke="rgba(0,0,0,0.30)" strokeWidth="0.16" />
        {/* Üst metalik highlight */}
        <line x1="4.7" y1="83.4" x2="25.3" y2="83.4" stroke="rgba(255,230,160,0.32)" strokeWidth="0.22" />

        {/* İç piston (silindir içinde sağa-sola hareket) */}
        <g className="piston-inner">
          <rect x="7" y="82.4" width="2.2" height="7.2" rx="0.3"
                fill={gold(0.45)} stroke={gold(0.55)} strokeWidth="0.24" />
          {/* Piston seal */}
          <line x1="7" y1="84.2" x2="9.2" y2="84.2" stroke="rgba(0,0,0,0.4)" strokeWidth="0.18" />
          <line x1="7" y1="87.8" x2="9.2" y2="87.8" stroke="rgba(0,0,0,0.4)" strokeWidth="0.18" />
        </g>

        {/* Piston rod + uç blok */}
        <g className="piston-rod">
          <line x1="25.3" y1="86" x2="32.5" y2="86"
                stroke={gold(0.50)} strokeWidth="0.7" strokeLinecap="round" />
          <line x1="25.3" y1="85.7" x2="32.5" y2="85.7"
                stroke="rgba(255,235,160,0.30)" strokeWidth="0.18" />
          <rect x="31.5" y="84.4" width="3" height="3.2" rx="0.3"
                fill={gold(0.42)} stroke={gold(0.55)} strokeWidth="0.24" />
          <circle cx="33" cy="86" r="0.5" fill="rgba(30,20,5,0.5)" stroke={gold(0.55)} strokeWidth="0.14" />
        </g>

        {/* Hava giriş portları — pulse */}
        <circle className="air-port" cx="7.5" cy="81.7" r="0.4" fill={gold(0.50)} />
        <circle className="air-port-2" cx="22.5" cy="81.7" r="0.4" fill={gold(0.50)} />
        <line x1="7.5" y1="81.7" x2="7.5" y2="79.5" stroke={gold(0.20)} strokeWidth="0.18" />
        <line x1="22.5" y1="81.7" x2="22.5" y2="79.5" stroke={gold(0.20)} strokeWidth="0.18" />

        {/* Etiket — pistonun sağında, hizada */}
        <text x="40" y="87" textAnchor="start" fontSize="2.0" fill={gold(0.32)}
              fontFamily="Arial, sans-serif" letterSpacing="0.18em" fontWeight="500">PNÖMATİK</text>
      </g>

      {/* ═══ PNÖMATİK 5/2 VALF — alt orta, OTOMASYON etiketinin üstünde ═══ */}
      <g stroke={silver(0.16)} strokeWidth="0.28" fill="none">
        <rect x="110" y="82" width="14" height="6" />
        <line x1="117" y1="82" x2="117" y2="88" />
        {/* Sol oklar */}
        <path d="M 112 85 L 115 83.5 M 112 85 L 115 86.5 M 112 85 L 114.5 85" strokeWidth="0.22" />
        {/* Sağ oklar */}
        <path d="M 122 85 L 119 83.5 M 122 85 L 119 86.5 M 122 85 L 119.5 85" strokeWidth="0.22" />
        {/* Solenoid bobini sol */}
        <rect x="106" y="83" width="3" height="4" fill="none" />
        <line x1="106.5" y1="83" x2="106.5" y2="87" strokeWidth="0.18" />
        <line x1="107.5" y1="83" x2="107.5" y2="87" strokeWidth="0.18" />
        <line x1="108.5" y1="83" x2="108.5" y2="87" strokeWidth="0.18" />
      </g>

      {/* ═══ CAD ÖLÇÜ ÇİZGİLERİ (üst orta - mekanik) ═══ */}
      <line x1="40" y1="20" x2="80" y2="20" stroke={gold(0.13)} strokeWidth="0.25" />
      <line x1="40" y1="18.5" x2="40" y2="21.5" stroke={gold(0.13)} strokeWidth="0.25" />
      <line x1="80" y1="18.5" x2="80" y2="21.5" stroke={gold(0.13)} strokeWidth="0.25" />
      <text x="60" y="17.8" textAnchor="middle" fontSize="2.5" fill={gold(0.22)}
            fontFamily="Arial, sans-serif">40</text>

      {/* CAD köşeleri (4 köşe) */}
      <polyline points="3,10 3,3 10,3"   fill="none" stroke={silver(0.22)} strokeWidth="0.45" />
      <polyline points="190,3 197,3 197,10"  fill="none" stroke={silver(0.20)} strokeWidth="0.45" />
      <polyline points="3,90 3,97 10,97"  fill="none" stroke={silver(0.16)} strokeWidth="0.40" />
      <polyline points="190,97 197,97 197,90" fill="none" stroke={silver(0.16)} strokeWidth="0.40" />

      {/* ═══ ENERJİ HATTI (yıldırım/şimşek) — sağ alt, indüktör yanında ═══ */}
      <path d="M 174 73 L 179 73 L 176.5 77 L 181 77 L 176 83 L 178 79 L 174 79 Z"
            fill={gold(0.18)} stroke={gold(0.32)} strokeWidth="0.20"  />

      {/* ═══ AKIŞ OKU (orta) — PROCESS FLOW ═══ */}
      <line x1="100" y1="50" x2="118" y2="50" stroke={silver(0.10)} strokeWidth="0.25"
            strokeDasharray="2 2" />
      <polygon points="118,50 115,49 115,51" fill={silver(0.20)} />

      {/* ═══ NİŞAN/HEDEF (CAD aim) ═══ */}
      <circle cx="170" cy="55" r="4" fill="none" stroke={silver(0.10)} strokeWidth="0.28" />
      <circle cx="170" cy="55" r="1.2" fill="none" stroke={silver(0.13)} strokeWidth="0.25" />
      <line x1="164.5" y1="55" x2="167.5" y2="55" stroke={silver(0.13)} strokeWidth="0.24" />
      <line x1="172.5" y1="55" x2="175.5" y2="55" stroke={silver(0.13)} strokeWidth="0.24" />
      <line x1="170" y1="49.5" x2="170" y2="52.5" stroke={silver(0.13)} strokeWidth="0.24" />
      <line x1="170" y1="57.5" x2="170" y2="60.5" stroke={silver(0.13)} strokeWidth="0.24" />

      {/* ═══ DİYOT (alt-orta) ═══ */}
      <line x1="68" y1="86" x2="74" y2="86" stroke={silver(0.16)} strokeWidth="0.30" />
      <polygon points="74,84 74,88 78,86" fill={silver(0.20)} />
      <line x1="78" y1="84" x2="78" y2="88" stroke={silver(0.20)} strokeWidth="0.40" />
      <line x1="78" y1="86" x2="84" y2="86" stroke={silver(0.16)} strokeWidth="0.30" />

      {/* ═══ INDÜKTÖR (alt-sağ) ═══ */}
      <path d="M 158 80 q 1 -2 2 0 q 1 -2 2 0 q 1 -2 2 0 q 1 -2 2 0"
            fill="none" stroke={gold(0.18)} strokeWidth="0.30" />

      {/* ═══ EKSEN HATLARI (kesik, merkez) ═══ */}
      <line x1="50" y1="50" x2="86" y2="50"
            stroke={gold(0.05)} strokeWidth="0.22" strokeDasharray="2 3" />
      <line x1="68" y1="36" x2="68" y2="60"
            stroke={gold(0.04)} strokeWidth="0.20" strokeDasharray="2 3" />

      {/* ═══ NÜMERİK CETVEL (en alt) ═══ */}
      {Array.from({ length: 25 }, (_, i) => {
        const x = 80 + i * 1.4;
        const major = i % 5 === 0;
        return (
          <line key={i} x1={x} y1={major ? 96 : 96.6} x2={x} y2="97.4"
                stroke={silver(major ? 0.18 : 0.08)} strokeWidth={major ? 0.30 : 0.20} />
        );
      })}

      {/* ═══ DÜĞÜM NOKTALARI ═══ */}
      <circle cx="40" cy="20" r="0.7" fill={gold(0.18)} />
      <circle cx="80" cy="20" r="0.7" fill={gold(0.18)} />
      <circle cx="116" cy="22" r="0.7" fill={silver(0.18)} />
      <circle cx="148" cy="22" r="0.7" fill={silver(0.18)} />
      <circle cx="68" cy="66" r="0.7" fill={gold(0.20)} />

      {/* ═══ DİSİPLİN ETİKETLERİ — soluk, ince tipografi ═══ */}
      {/* MÜHENDİSLİK — sol üst, dişli yakını */}
      <text x="14" y="26" textAnchor="middle" fontSize="2.6" fill={gold(0.32)}
            fontFamily="Arial, sans-serif" letterSpacing="0.20em" fontWeight="500">MÜHENDİSLİK</text>
      {/* ELEKTRİK — sağ üst köşeye yakın (dişli ve devre arası boş alan) */}
      <text x="158" y="8" textAnchor="middle" fontSize="2.6" fill={silver(0.32)}
            fontFamily="Arial, sans-serif" letterSpacing="0.20em" fontWeight="500">ELEKTRİK</text>
      {/* ELEKTRONİK — sağ alt-orta, voltmetre/diyot bölgesinden uzakta */}
      <text x="184" y="50" textAnchor="end" fontSize="2.6" fill={silver(0.32)}
            fontFamily="Arial, sans-serif" letterSpacing="0.20em" fontWeight="500">ELEKTRONİK</text>
      {/* OTOMASYON — alt orta, valf'ın altında, hemen yanında */}
      <text x="139" y="86" textAnchor="start" fontSize="2.6" fill={silver(0.32)}
            fontFamily="Arial, sans-serif" letterSpacing="0.20em" fontWeight="500">OTOMASYON</text>
    </svg>
  );
}

/* Dişli (gear) yardımcı bileşeni */
function Gear({ cx, cy, r, R, n, stroke, sw }: {
  cx: number; cy: number; r: number; R: number; n: number; stroke: string; sw: number;
}) {
  const tw = (2 * Math.PI * r) / (n * 2);
  const th = R - r;
  const angles = Array.from({ length: n }, (_, i) => i * (360 / n));
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r * 0.30} fill="none" stroke={stroke} strokeWidth={sw * 0.65} />
      <line x1={cx - r * 0.16} y1={cy} x2={cx + r * 0.16} y2={cy} stroke={stroke} strokeWidth={sw * 0.48} />
      <line x1={cx} y1={cy - r * 0.16} x2={cx} y2={cy + r * 0.16} stroke={stroke} strokeWidth={sw * 0.48} />
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


/* ─────────── Firma kartı (etkileşimli) ─────────── */
function FirmaKarti({ firma, onSecim, isMobile }: {
  firma: Firma;
  onSecim: (f: Firma) => void;
  isMobile: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const floatAnimMap: Record<string, string> = {
    meba: 'gc-float-1 5.5s ease-in-out infinite',
    elmos: 'gc-float-2 6.2s ease-in-out infinite',
    mesa: 'gc-float-3 5.8s ease-in-out infinite',
  };
  const idleAnim = floatAnimMap[firma.id] || 'gc-float-1 6s ease-in-out infinite';

  function handleMouseMove(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -8, y: dx * 10 });
  }

  const haloColor = firma.renkVurgu || gold(0.6);
  const cardBg = pressed
    ? 'rgba(5,10,24,0.96)'
    : hovered
    ? 'rgba(10,18,36,0.97)'
    : 'rgba(7,14,28,0.88)';

  const cardStyle: CSSProperties = {
    width: isMobile ? '100%' : FIRMA_KART_LAYOUT.cardWidth,
    maxWidth: 260,
    padding: FIRMA_KART_LAYOUT.cardPadding,
    borderRadius: FIRMA_KART_LAYOUT.cardBorderRadius,
    cursor: 'pointer',
    border: `1px solid ${hovered ? haloColor : gold(0.18)}`,
    background: cardBg,
    boxShadow: hovered
      ? `0 28px 70px rgba(0,0,0,0.62), 0 0 0 1px ${haloColor}33, 0 0 50px ${haloColor}22, inset 0 1px 0 rgba(255,255,255,0.04)`
      : '0 22px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.025)',
    transform: hovered
      ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(8px)`
      : 'perspective(900px) rotateX(0) rotateY(0) translateZ(0)',
    animation: hovered ? 'none' : idleAnim,
    transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
    backdropFilter: 'blur(20px)',
    textAlign: 'center' as const,
    display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', gap: FIRMA_KART_LAYOUT.cardInnerGap,
    userSelect: 'none' as const,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onSecim(firma)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); setTilt({ x: 0, y: 0 }); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={(e) => e.key === 'Enter' && onSecim(firma)}
      style={cardStyle}
    >
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
          background: `linear-gradient(110deg, transparent 30%, ${haloColor}22 50%, transparent 70%)`,
          backgroundSize: '200% 100%',
          animation: 'gc-shimmer 1.4s linear infinite',
        }} />
      )}
      {/* Logo — splash ekranı ile birebir aynı kutu/boyut/konum */}
      <LogoContainer
        firma={firma}
        imgFilter={
          hovered
            ? `drop-shadow(0 4px 14px ${haloColor}44)`
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.10))'
        }
      />
      {/* Slogan — MEBA için sonuna parlayan "Yazılım" eklenir, aynı stilde */}
      <div style={{
        fontSize: 10, letterSpacing: 1.6,
        color: hovered ? 'rgba(225,235,250,0.85)' : silver(0.55),
        textTransform: 'uppercase' as const,
        textAlign: 'center' as const, lineHeight: 1.55,
        transition: 'color 0.25s ease',
      }}>
        {firma.slogan}
        {firma.id === 'meba' && (
          <>
            {' · '}
            <span style={{
              animation: 'gc-neon-pulse 3.2s ease-in-out infinite',
            }}>
              Yazılım
            </span>
          </>
        )}
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

  // Splash artik App.tsx'te en ust seviyede her acilista oynuyor.
  // Burada dogrudan firma secim ekrani ile basla.
  const [adim, setAdim] = useState<Adim>('firma');
  const [secilenFirma, setSecilenFirma] = useState<Firma | null>(null);
  const [secilenKullanici, setSecilenKullanici] = useState<Kullanici | null>(null);
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const sifreInputRef = useRef<HTMLInputElement | null>(null);

  function firmaSec(f: Firma) {
    setSecilenFirma(f);
    setSecilenKullanici(null);
    setSifre('');
    setHata(null);
    setAdim('sifre');  // firma seçilince doğrudan kullanıcı adı + şifre formuna git
    setTimeout(() => sifreInputRef.current?.focus(), 100);
  }

  function geriDon() {
    if (adim === 'kullanici') { setAdim('firma'); setSecilenFirma(null); return; }
    if (adim === 'sifre') {
      if (secilenKullanici) { setSecilenKullanici(null); setSifre(''); setHata(null); return; }
      setAdim('firma'); setSecilenFirma(null); setSifre(''); setHata(null); return;
    }
  }

  async function loginGonder(kullaniciAdi: string) {
    setYukleniyor(true);
    setHata(null);
    const r = await loginYap(kullaniciAdi, sifre);
    setYukleniyor(false);
    if (!r.ok) {
      setHata(r.error);
      setSifre('');
      setTimeout(() => sifreInputRef.current?.focus(), 50);
      return;
    }
    // Login basarili — KullaniciContext aktifKullanici'yi set etti, AppRouter
    // otomatik olarak ana uygulamaya yonlendirecek.
  }

  const ortaPanelStyle: CSSProperties = {
    background: 'rgba(7,15,34,0.78)',
    backdropFilter: 'blur(28px)',
    border: `1px solid ${gold(0.16)}`,
    borderRadius: 18,
    padding: isMobile ? '28px 22px' : '36px 42px',
    boxShadow: '0 36px 90px rgba(0,0,0,0.58), 0 8px 24px rgba(0,0,0,0.42)',
    minWidth: isMobile ? '88%' : 380,
    maxWidth: 480,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(158deg, #060b18 0%, #0b1624 40%, #080f1c 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue","Inter","Arial",sans-serif',
      position: 'relative', overflow: 'hidden',
      color: 'rgba(220,232,250,0.92)',
    }}>
      <style>{ANIMATIONS_CSS}</style>
      <EngineeringOverlay />

      {/* FIRMA SECIMI */}
      {adim === 'firma' && (
        <>
          <div style={{
            textAlign: 'center', marginBottom: 30,
            animation: 'gc-fade-up 0.5s both',
          }}>
            <div style={{
              fontSize: 11, letterSpacing: 4, marginBottom: 8,
              color: silver(0.5), textTransform: 'uppercase' as const,
            }}>
              Group Companies · Grup Şirketleri
            </div>
            <div style={{
              fontSize: isMobile ? 18 : 24, fontWeight: 700,
              letterSpacing: 1.5,
              background: 'linear-gradient(135deg, #ffffff 0%, #c8c8c8 50%, #909090 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Firma Seçimi
            </div>
            <div style={{
              fontSize: 10, marginTop: 10, color: silver(0.32),
              letterSpacing: 1.2,
            }}>
              Devam etmek için bir firma seçin
            </div>
          </div>

          <div style={{
            display: 'flex', gap: FIRMA_KART_LAYOUT.cardsRowGap,
            flexWrap: 'wrap' as const, justifyContent: 'center',
            padding: '0 24px', maxWidth: 920,
            animation: 'gc-fade-up 0.6s 0.1s both',
          }}>
            {(['meba', 'elmos', 'mesa'].map((id) => firmalar.find((f) => f.id === id)).filter(Boolean) as Firma[]).map((f) => (
              <FirmaKarti key={f.id} firma={f} onSecim={firmaSec} isMobile={isMobile} />
            ))}
          </div>

          {firmalar.length === 0 && (
            <div style={{
              marginTop: 20, fontSize: 12, color: silver(0.5),
            }}>
              Sunucuya bağlanılıyor...
            </div>
          )}
        </>
      )}

      {/* SIFRE GIRISI */}
      {adim === 'sifre' && secilenFirma && (
        <div style={ortaPanelStyle}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 18,
            marginBottom: 22, paddingBottom: 18,
            borderBottom: `1px solid ${gold(0.12)}`,
          }}>
            <LogoContainer firma={secilenFirma} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(225,235,250,0.92)' }}>
                {secilenFirma.ad}
              </div>
              <div style={{ fontSize: 9.5, color: silver(0.5), letterSpacing: 1.2, textTransform: 'uppercase' as const }}>
                {secilenFirma.slogan}
              </div>
            </div>
          </div>

          <KullaniciSifreFormu
            ref={sifreInputRef}
            sifre={sifre}
            onSifreChange={setSifre}
            onSubmit={loginGonder}
            hata={hata}
            yukleniyor={yukleniyor}
          />

          <div style={{
            marginTop: 18, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <button
              onClick={geriDon}
              style={{
                background: 'transparent',
                border: `1px solid ${silver(0.22)}`,
                color: silver(0.65), padding: '7px 14px',
                borderRadius: 8, cursor: 'pointer',
                fontSize: 11, letterSpacing: 1.2,
                textTransform: 'uppercase' as const,
              }}
            >
              ← Firma değiştir
            </button>
            <span style={{ fontSize: 10, color: silver(0.32) }}>
              Şifrenizi unuttuysanız yöneticinize başvurun
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Şifre formu ─────────── */

interface SifreFormProps {
  sifre: string;
  onSifreChange: (v: string) => void;
  onSubmit: (kullaniciAdi: string) => void;
  hata: string | null;
  yukleniyor: boolean;
}

const KullaniciSifreFormu = forwardRef<HTMLInputElement, SifreFormProps>(
  function KullaniciSifreFormu({ sifre, onSifreChange, onSubmit, hata, yukleniyor }, ref) {
    const [kullaniciAdi, setKullaniciAdi] = useState('');

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!kullaniciAdi.trim() || !sifre) return;
      onSubmit(kullaniciAdi.trim().toLowerCase());
    }

    const inputBase: CSSProperties = {
      width: '100%', padding: '12px 14px',
      background: 'rgba(5,12,28,0.7)',
      border: `1px solid ${gold(0.18)}`,
      borderRadius: 10,
      color: 'rgba(225,235,250,0.96)',
      fontSize: 14, fontFamily: 'inherit',
      outline: 'none',
      transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
    };

    return (
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{
            display: 'block', fontSize: 10, letterSpacing: 1.2,
            color: silver(0.5), marginBottom: 6,
            textTransform: 'uppercase' as const,
          }}>
            Kullanıcı Adı
          </label>
          <input
            type="text"
            value={kullaniciAdi}
            onChange={(e) => setKullaniciAdi(e.target.value)}
            placeholder="örn. mehmet"
            autoComplete="username"
            disabled={yukleniyor}
            style={inputBase}
            onFocus={(e) => { e.currentTarget.style.borderColor = gold(0.55); e.currentTarget.style.boxShadow = `0 0 0 3px ${gold(0.12)}`; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = gold(0.18); e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block', fontSize: 10, letterSpacing: 1.2,
            color: silver(0.5), marginBottom: 6,
            textTransform: 'uppercase' as const,
          }}>
            Şifre
          </label>
          <input
            ref={ref}
            type="password"
            value={sifre}
            onChange={(e) => onSifreChange(e.target.value)}
            placeholder="••••••"
            autoComplete="current-password"
            disabled={yukleniyor}
            style={inputBase}
            onFocus={(e) => { e.currentTarget.style.borderColor = gold(0.55); e.currentTarget.style.boxShadow = `0 0 0 3px ${gold(0.12)}`; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = gold(0.18); e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {hata && (
          <div style={{
            marginBottom: 12, padding: '8px 12px',
            background: 'rgba(180,40,55,0.18)',
            border: '1px solid rgba(220,80,95,0.42)',
            borderRadius: 8, color: 'rgba(255,200,200,0.95)',
            fontSize: 12,
          }}>
            {hata}
          </div>
        )}

        <button
          type="submit"
          disabled={yukleniyor || !kullaniciAdi.trim() || !sifre}
          style={{
            width: '100%', padding: '12px 16px',
            background: yukleniyor
              ? 'linear-gradient(135deg, rgba(110,110,110,0.45), rgba(75,75,75,0.45))'
              : 'linear-gradient(135deg, #c8c8c8, #909090)',
            color: '#0a0a0a',
            border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 700, letterSpacing: 1.2,
            textTransform: 'uppercase' as const,
            cursor: yukleniyor || !kullaniciAdi.trim() || !sifre ? 'not-allowed' : 'pointer',
            opacity: !kullaniciAdi.trim() || !sifre ? 0.5 : 1,
            boxShadow: '0 6px 20px rgba(180,180,180,0.32)',
            transition: 'all 0.15s ease',
          }}
        >
          {yukleniyor ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
    );
  }
);
