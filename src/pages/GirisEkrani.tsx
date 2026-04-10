import { useState } from 'react';
import { KULLANICILAR } from '../types/kullanici';
import type { Kullanici } from '../types/kullanici';
import { useKullanici } from '../context/useKullanici';

/* ── Renk yardımcıları ─────────────────────────────────── */
const gold   = (a: number) => `rgba(185,148,52,${a})`;
const silver = (a: number) => `rgba(172,186,205,${a})`;

/* ── Dişli (Gear) SVG bileşeni ─────────────────────────── */
interface GearProps {
  cx: number; cy: number;
  r: number;        // iç daire yarıçapı
  R: number;        // diş ucu yarıçapı
  n: number;        // diş sayısı
  stroke: string;
  sw: number;       // strokeWidth
  hub?: boolean;    // merkez göbek göster
}
function Gear({ cx, cy, r, R, n, stroke, sw, hub = true }: GearProps) {
  const tw = (2 * Math.PI * r) / (n * 2);      // diş genişliği ≈ adımın %50'si
  const th = R - r;                              // diş yüksekliği
  const angles = Array.from({ length: n }, (_, i) => i * (360 / n));
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={sw} />
      {hub && (
        <>
          <circle cx={cx} cy={cy} r={r * 0.30} fill="none" stroke={stroke} strokeWidth={sw * 0.65} />
          <line x1={cx - r * 0.16} y1={cy} x2={cx + r * 0.16} y2={cy} stroke={stroke} strokeWidth={sw * 0.48} />
          <line x1={cx} y1={cy - r * 0.16} x2={cx} y2={cy + r * 0.16} stroke={stroke} strokeWidth={sw * 0.48} />
        </>
      )}
      {angles.map((a, i) => (
        <rect
          key={i}
          x={cx - tw / 2} y={cy - R}
          width={tw} height={th}
          rx={0.35}
          fill="none" stroke={stroke} strokeWidth={sw}
          transform={`rotate(${a},${cx},${cy})`}
        />
      ))}
    </g>
  );
}

/* ── Mühendislik Zemin Katmanı ─────────────────────────── */
function EngineeringOverlay() {
  return (
    <>
      {/* Teknik çizim grid — altın/gümüş tonlarında, çok hafif */}
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

      {/*
        Ana mühendislik SVG katmanı
        viewBox 160×90 — 16:9 oranı, şekiller deforme olmaz.
        preserveAspectRatio "slice": ekranı tam doldurur, kenarlar kırpılabilir.
        blur(0.7px): belirgin ama keskin değil, doku hissi verir.
      */}
      <svg
        viewBox="0 0 160 90"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
          filter: 'blur(0.7px)',
          overflow: 'hidden',
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ══ DİŞLİLER ════════════════════════════════════════ */}

        {/* Büyük dişli — sol üst, kısmen ekran dışı, ALTIN */}
        <Gear cx={6}   cy={7}   r={12}  R={17}  n={12} stroke={gold(0.11)}   sw={0.38} hub />
        {/* Küçük dişli — sol merkez, ALTIN */}
        <Gear cx={14}  cy={54}  r={5}   R={7.5} n={8}  stroke={gold(0.10)}   sw={0.32} hub />
        {/* Orta dişli — sağ alt, kısmen ekran dışı, GÜMÜŞ */}
        <Gear cx={153} cy={83}  r={11}  R={15.5} n={12} stroke={silver(0.10)} sw={0.36} hub />
        {/* Küçük dişli — sağ üst, GÜMÜŞ */}
        <Gear cx={144} cy={13}  r={4.5} R={6.5} n={8}  stroke={silver(0.09)}  sw={0.28} hub={false} />

        {/* Dişli bağlantı hattı (sol, kesik) */}
        <line x1="14" y1="19" x2="13" y2="49"
          stroke={gold(0.055)} strokeWidth="0.24" strokeDasharray="1.4 2.4" />

        {/* ══ KAD KÖŞELERİ ══════════════════════════════════ */}

        {/* Sol üst */}
        <polyline points="2.8,11 2.8,2.8 11,2.8"
          fill="none" stroke={silver(0.22)} strokeWidth="0.55" />
        <circle cx="2.8" cy="2.8" r="0.8" fill="none" stroke={silver(0.26)} strokeWidth="0.42" />

        {/* Sağ üst */}
        <polyline points="149,2.8 157.2,2.8 157.2,11"
          fill="none" stroke={silver(0.20)} strokeWidth="0.55" />
        <circle cx="157.2" cy="2.8" r="0.8" fill="none" stroke={silver(0.24)} strokeWidth="0.42" />

        {/* Sol alt */}
        <polyline points="2.8,79 2.8,87.2 11,87.2"
          fill="none" stroke={silver(0.16)} strokeWidth="0.48" />
        <circle cx="2.8" cy="87.2" r="0.8" fill="none" stroke={silver(0.20)} strokeWidth="0.38" />

        {/* Sağ alt */}
        <polyline points="149,87.2 157.2,87.2 157.2,79"
          fill="none" stroke={silver(0.16)} strokeWidth="0.48" />
        <circle cx="157.2" cy="87.2" r="0.8" fill="none" stroke={silver(0.20)} strokeWidth="0.38" />

        {/* ══ BOYUT ÇIZGILERI (teknik çizim, ALTIN) ═══════════ */}

        {/* Yatay boyut çizgisi */}
        <line x1="34" y1="24" x2="84" y2="24"
          stroke={gold(0.14)} strokeWidth="0.30" />
        <line x1="34" y1="22.4" x2="34" y2="25.6" stroke={gold(0.14)} strokeWidth="0.30" />
        <line x1="84" y1="22.4" x2="84" y2="25.6" stroke={gold(0.14)} strokeWidth="0.30" />

        {/* Dikey boyut çizgisi */}
        <line x1="29" y1="32" x2="29" y2="68"
          stroke={gold(0.12)} strokeWidth="0.28" />
        <line x1="27.4" y1="32" x2="30.6" y2="32" stroke={gold(0.12)} strokeWidth="0.28" />
        <line x1="27.4" y1="68" x2="30.6" y2="68" stroke={gold(0.12)} strokeWidth="0.28" />

        {/* Eğik referans hattı */}
        <line x1="36" y1="30" x2="66" y2="74"
          stroke={gold(0.070)} strokeWidth="0.26" strokeDasharray="1.8 3.0" />

        {/* Boyut yardımcı hatları */}
        <line x1="34" y1="28" x2="34" y2="24.5" stroke={gold(0.08)} strokeWidth="0.22" />
        <line x1="84" y1="28" x2="84" y2="24.5" stroke={gold(0.08)} strokeWidth="0.22" />

        {/* ══ DEVRE ŞEMASI (sağ üst, GÜMÜŞ) ════════════════ */}

        {/* Giriş hattı */}
        <line x1="106" y1="20" x2="118" y2="20"
          stroke={silver(0.14)} strokeWidth="0.32" />
        {/* Direnç (zigzag) */}
        <polyline
          points="118,20 119.2,17.2 120.8,22.8 122.4,17.2 124.0,22.8 125.6,17.2 127,20"
          fill="none" stroke={silver(0.17)} strokeWidth="0.34" />
        {/* Çıkış hattı */}
        <line x1="127" y1="20" x2="139" y2="20"
          stroke={silver(0.14)} strokeWidth="0.32" />
        {/* Kapasitör bağlantısı */}
        <line x1="122" y1="20" x2="122" y2="29" stroke={silver(0.11)} strokeWidth="0.28" />
        <line x1="118.2" y1="29" x2="125.8" y2="29"
          stroke={silver(0.17)} strokeWidth="0.42" />
        <line x1="118.2" y1="32.2" x2="125.8" y2="32.2"
          stroke={silver(0.17)} strokeWidth="0.42" />
        <line x1="122" y1="32.2" x2="122" y2="39" stroke={silver(0.11)} strokeWidth="0.28" />
        {/* GND sembolü */}
        <line x1="119.5" y1="39" x2="124.5" y2="39" stroke={silver(0.12)} strokeWidth="0.28" />
        <line x1="120.5" y1="40.5" x2="123.5" y2="40.5" stroke={silver(0.09)} strokeWidth="0.24" />
        <line x1="121.3" y1="41.8" x2="122.7" y2="41.8" stroke={silver(0.07)} strokeWidth="0.20" />
        {/* Sağ bağlantı */}
        <line x1="139" y1="20" x2="139" y2="29" stroke={silver(0.10)} strokeWidth="0.26" />
        <line x1="135" y1="29" x2="143" y2="29"
          stroke={silver(0.14)} strokeWidth="0.36" />
        {/* Devre annotasyon hattı */}
        <line x1="139" y1="20" x2="156" y2="20"
          stroke={silver(0.07)} strokeWidth="0.24" strokeDasharray="1.8 2.5" />
        <line x1="156" y1="16.5" x2="156" y2="23.5"
          stroke={silver(0.11)} strokeWidth="0.30" />

        {/* ══ NİŞAN / HEDEF İŞARETLERİ ═══════════════════════ */}

        {/* Sağ merkez hedef */}
        <circle cx="112" cy="54" r="5.0" fill="none" stroke={silver(0.11)} strokeWidth="0.30" />
        <circle cx="112" cy="54" r="1.4" fill="none" stroke={silver(0.13)} strokeWidth="0.28" />
        <line x1="105.5" y1="54" x2="108.2" y2="54" stroke={silver(0.13)} strokeWidth="0.28" />
        <line x1="115.8" y1="54" x2="118.5" y2="54" stroke={silver(0.13)} strokeWidth="0.28" />
        <line x1="112"   y1="47.5" x2="112"   y2="50.2" stroke={silver(0.13)} strokeWidth="0.28" />
        <line x1="112"   y1="57.8" x2="112"   y2="60.5" stroke={silver(0.13)} strokeWidth="0.28" />

        {/* Alt merkez hedef, ALTIN */}
        <circle cx="74" cy="80" r="3.8" fill="none" stroke={gold(0.10)} strokeWidth="0.28" />
        <circle cx="74" cy="80" r="1.0" fill="none" stroke={gold(0.11)} strokeWidth="0.25" />
        <line x1="68.5" y1="80" x2="71.2" y2="80" stroke={gold(0.10)} strokeWidth="0.25" />
        <line x1="76.8" y1="80" x2="79.5" y2="80" stroke={gold(0.10)} strokeWidth="0.25" />
        <line x1="74" y1="74.5" x2="74" y2="77.2" stroke={gold(0.10)} strokeWidth="0.25" />
        <line x1="74" y1="82.8" x2="74" y2="85.5" stroke={gold(0.10)} strokeWidth="0.25" />

        {/* ══ ÖLÇÜM CETVELİ (alt, GÜMÜŞ) ══════════════════ */}
        <line x1="44" y1="86.2" x2="96" y2="86.2"
          stroke={silver(0.15)} strokeWidth="0.32" />
        {Array.from({ length: 53 }, (_, i) => {
          const x = 44 + i;
          const major = i % 10 === 0;
          const mid   = i % 5 === 0 && !major;
          return (
            <line key={i}
              x1={x} y1={major ? 84.4 : mid ? 84.9 : 85.3}
              x2={x} y2="86.2"
              stroke={silver(major ? 0.17 : mid ? 0.11 : 0.07)}
              strokeWidth={major ? 0.30 : 0.22}
            />
          );
        })}

        {/* ══ REFERANS EKSEN HATLARI (merkez, kesik, ALTIN) ═══ */}
        <line x1="38" y1="45" x2="96" y2="45"
          stroke={gold(0.048)} strokeWidth="0.24" strokeDasharray="2.5 3.5" />
        <line x1="67" y1="26" x2="67" y2="72"
          stroke={gold(0.042)} strokeWidth="0.22" strokeDasharray="2.5 3.5" />

        {/* ══ SAĞ PANEL TEKNİK HATLAR (GÜMÜŞ) ════════════ */}
        <line x1="120" y1="50" x2="158" y2="50" stroke={silver(0.08)} strokeWidth="0.28" />
        <line x1="120" y1="54" x2="156" y2="54" stroke={silver(0.060)} strokeWidth="0.24" />
        <line x1="120" y1="58" x2="150" y2="58" stroke={silver(0.045)} strokeWidth="0.20" />

        {/* ══ SOL ÜST BÖLGESİ — diyagonal akış hattı ════ */}
        <path d="M 22 5 Q 45 18 42 38"
          fill="none" stroke={gold(0.060)} strokeWidth="0.28" strokeDasharray="2 3" />

        {/* ══ DÜĞÜM NOKTALARI ══════════════════════════════ */}
        <circle cx="20"  cy="14"  r="1.1" fill="none" stroke={gold(0.10)}   strokeWidth="0.30" />
        <circle cx="84"  cy="24"  r="0.8" fill={gold(0.07)}   />
        <circle cx="34"  cy="24"  r="0.8" fill={gold(0.07)}   />
        <circle cx="84"  cy="68"  r="0.7" fill={silver(0.08)} />
        <circle cx="29"  cy="32"  r="0.8" fill={gold(0.08)}   />
        <circle cx="29"  cy="68"  r="0.8" fill={gold(0.08)}   />
        <circle cx="122" cy="20"  r="0.9" fill={silver(0.11)} />
        <circle cx="139" cy="20"  r="0.9" fill={silver(0.11)} />
        <circle cx="122" cy="29"  r="0.9" fill={silver(0.09)} />

        {/* ══ SOL ALT KÜÇÜK MÜHENDİSLİK DETAY ══════════ */}
        <rect x="5" y="72" width="8" height="5" rx="0.5"
          fill="none" stroke={gold(0.09)} strokeWidth="0.28" />
        <line x1="7" y1="72" x2="7" y2="77" stroke={gold(0.06)} strokeWidth="0.22" />
        <line x1="9" y1="72" x2="9" y2="77" stroke={gold(0.06)} strokeWidth="0.22" />
        <line x1="11" y1="72" x2="11" y2="77" stroke={gold(0.06)} strokeWidth="0.22" />

        {/* Sağ alt devre + dişli bağlantı hattı */}
        <line x1="143" y1="29" x2="143" y2="69"
          stroke={silver(0.065)} strokeWidth="0.24" strokeDasharray="1.6 2.6" />
        <circle cx="143" cy="69" r="0.9" fill="none" stroke={silver(0.09)} strokeWidth="0.26" />
      </svg>

      {/* Merkezi odak ışıması — form arkasında, nötr */}
      <div style={{
        position: 'absolute',
        top: '38%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 560, height: 380,
        background: 'radial-gradient(ellipse, rgba(12,28,80,0.28) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
    </>
  );
}

/* ── Avatar Monogram ─────────────────────────────────────── */
function KullaniciAvatar({ kullanici, boyut = 66 }: { kullanici: Kullanici; boyut?: number }) {
  const isAdmin = kullanici.rol === 'admin';
  return (
    <div style={{
      width: boyut, height: boyut, borderRadius: '50%',
      background: isAdmin
        ? 'linear-gradient(135deg, rgba(185,148,52,0.18) 0%, rgba(100,76,20,0.08) 100%)'
        : 'linear-gradient(135deg, rgba(55,100,200,0.22) 0%, rgba(28,58,140,0.10) 100%)',
      border: isAdmin
        ? '1.5px solid rgba(195,158,65,0.42)'
        : '1.5px solid rgba(75,135,220,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: boyut * 0.295, fontWeight: 700,
      color: isAdmin ? '#d4ac52' : '#7ab4f2',
      letterSpacing: 0.5,
      boxShadow: isAdmin
        ? 'inset 0 1px 0 rgba(255,220,110,0.07), 0 0 14px rgba(185,148,52,0.09)'
        : 'inset 0 1px 0 rgba(120,180,255,0.07), 0 0 14px rgba(55,100,200,0.09)',
      fontFamily: '"Arial", sans-serif', flexShrink: 0,
    }}>
      {kullanici.initials}
    </div>
  );
}

/* ── Kullanıcı Kartı ─────────────────────────────────────── */
function KullaniciKarti({ kullanici, onSecim }: { kullanici: Kullanici; onSecim: (k: Kullanici) => void }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const isAdmin = kullanici.rol === 'admin';

  const borderColor = hovered || pressed
    ? isAdmin ? 'rgba(195,158,65,0.48)' : 'rgba(75,135,220,0.46)'
    : isAdmin ? 'rgba(195,158,65,0.18)'  : 'rgba(75,135,220,0.16)';

  const bg = pressed
    ? 'rgba(5,10,24,0.96)'
    : hovered
    ? isAdmin ? 'rgba(10,18,36,0.97)' : 'rgba(8,16,34,0.97)'
    : 'rgba(7,14,28,0.88)';

  const shadow = pressed
    ? '0 4px 16px rgba(0,0,0,0.55), inset 0 2px 6px rgba(0,0,0,0.35)'
    : hovered
    ? isAdmin
      ? '0 22px 64px rgba(0,0,0,0.55), 0 6px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(220,180,80,0.055), inset 0 -1px 0 rgba(0,0,0,0.22)'
      : '0 22px 64px rgba(0,0,0,0.55), 0 6px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(120,180,255,0.055), inset 0 -1px 0 rgba(0,0,0,0.22)'
    : '0 6px 28px rgba(0,0,0,0.52), 0 2px 8px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)';

  const transform = pressed
    ? 'scale(0.97) translateY(1px)'
    : hovered
    ? 'translateY(-4px)'
    : 'translateY(0)';

  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onSecim(kullanici)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onKeyDown={(e) => e.key === 'Enter' && onSecim(kullanici)}
      style={{
        width: isAdmin ? 228 : 204,
        padding: '30px 24px 26px',
        borderRadius: 14, cursor: 'pointer',
        border: `1px solid ${borderColor}`,
        background: bg, boxShadow: shadow, transform,
        transition: 'all 0.25s cubic-bezier(0.25,0.46,0.45,0.94)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        textAlign: 'center' as const,
        display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', gap: 15,
        userSelect: 'none' as const, position: 'relative' as const,
        overflow: 'hidden' as const, outline: 'none',
      }}
    >
      <KullaniciAvatar kullanici={kullanici} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
        <div style={{
          fontSize: isAdmin ? 14 : 14.5, fontWeight: 600,
          color: isAdmin ? '#c8a844' : '#d8e8fa',
          letterSpacing: isAdmin ? 0.35 : 0.15,
          lineHeight: 1.3, whiteSpace: 'nowrap' as const,
          fontFamily: '"Segoe UI","Inter","Arial",sans-serif',
        }}>
          {kullanici.adSoyad}
        </div>
        <div style={{
          fontSize: 10, color: 'rgba(120,155,205,0.58)',
          fontWeight: 400, letterSpacing: 0.4,
          fontFamily: '"Arial",sans-serif',
          textAlign: 'center' as const, lineHeight: 1.65,
          whiteSpace: 'pre-line' as const,
        }}>
          {kullanici.unvan}
        </div>
      </div>

      {/* Alt aksent çizgisi */}
      <div style={{
        position: 'absolute', bottom: 0, left: '28%', right: '28%', height: 1,
        background: isAdmin
          ? `linear-gradient(90deg, transparent, rgba(195,158,65,${hovered ? 0.38 : 0.09}), transparent)`
          : `linear-gradient(90deg, transparent, rgba(75,135,220,${hovered ? 0.40 : 0.09}), transparent)`,
        transition: 'all 0.22s ease',
      }} />
      {/* Üst highlight çizgisi */}
      <div style={{
        position: 'absolute', top: 0, left: '32%', right: '32%', height: 1,
        background: `linear-gradient(90deg, transparent, rgba(255,255,255,${hovered ? 0.048 : 0.018}), transparent)`,
        transition: 'all 0.22s ease',
      }} />
    </div>
  );
}

/* ── Ana Giriş Ekranı ────────────────────────────────────── */
export default function GirisEkrani() {
  const { girisYap } = useKullanici();
  const [secilenId, setSecilenId] = useState<string | null>(null);

  function handleSecim(kullanici: Kullanici) {
    if (secilenId) return;
    setSecilenId(kullanici.id);
    setTimeout(() => girisYap(kullanici), 280);
  }

  return (
    <div
      className="giris-ekrani"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(158deg, #060b18 0%, #0b1624 40%, #080f1c 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Segoe UI","Inter","Arial",sans-serif',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* ── Zemin Katmanları ── */}
      <EngineeringOverlay />

      {/* Üst kenar aksent çizgisi — mat altın */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,
          transparent 0%,
          ${gold(0.18)} 20%,
          ${gold(0.42)} 50%,
          ${gold(0.18)} 80%,
          transparent 100%
        )`,
      }} />

      {/* Alt kenar aksent çizgisi — mat gümüş, daha hafif */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg,
          transparent 0%,
          ${silver(0.10)} 30%,
          ${silver(0.18)} 50%,
          ${silver(0.10)} 70%,
          transparent 100%
        )`,
      }} />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .giris-ekrani ::selection { background: transparent; }
      `}</style>

      {/* ── LOGO ── */}
      <div style={{
        marginBottom: 26,
        animation: 'fadeUp 0.46s ease both',
        animationDelay: '0.04s',
        position: 'relative',
      }}>
        <div style={{
          padding: '22px 48px', borderRadius: 18,
          background: 'rgba(7,15,34,0.74)',
          backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          border: `1px solid ${gold(0.12)}`,
          boxShadow: [
            '0 36px 90px rgba(0,0,0,0.58)',
            '0 8px 24px rgba(0,0,0,0.42)',
            `inset 0 1px 0 ${gold(0.07)}`,
            'inset 0 -1px 0 rgba(0,0,0,0.28)',
            'inset 0 0 36px rgba(6,12,30,0.36)',
          ].join(', '),
        }}>
          <img
            src="/logo-meba.png"
            alt="MEBA Mekanik"
            style={{
              height: 128, width: 'auto', display: 'block',
              imageRendering: 'auto',
              filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.45))',
            }}
          />
        </div>
        {/* Logo köşe işaretleri — CAD estetik */}
        {[
          { top: -2, left: -2, b: 'none', r: 'none' },
          { top: -2, right: -2, b: 'none', l: 'none' },
          { bottom: -2, left: -2, t: 'none', r: 'none' },
          { bottom: -2, right: -2, t: 'none', l: 'none' },
        ].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', ...pos,
            width: 10, height: 10,
            borderTop:    'top'    in pos ? `1.5px solid ${gold(0.45)}` : 'none',
            borderBottom: 'bottom' in pos ? `1.5px solid ${gold(0.45)}` : 'none',
            borderLeft:   'left'   in pos ? `1.5px solid ${gold(0.45)}` : 'none',
            borderRight:  'right'  in pos ? `1.5px solid ${gold(0.45)}` : 'none',
          }} />
        ))}
      </div>

      {/* ── BAŞLIK ── */}
      <div style={{
        marginBottom: 42, textAlign: 'center',
        animation: 'fadeUp 0.46s ease both',
        animationDelay: '0.11s',
      }}>
        <div style={{
          fontSize: 9.5, letterSpacing: 3.2,
          color: `${silver(0.40)}`,
          fontWeight: 400, textTransform: 'uppercase' as const,
          marginBottom: 9, fontFamily: '"Arial",sans-serif',
        }}>
          Pnömatik &nbsp;·&nbsp; Hidrolik &nbsp;·&nbsp; Makina &nbsp;·&nbsp; Mühendislik
        </div>
        <div style={{
          fontSize: 21, letterSpacing: 1.2,
          color: 'rgba(215,228,248,0.88)',
          fontWeight: 700, lineHeight: 1.25,
          textShadow: '0 1px 4px rgba(0,0,0,0.38)',
        }}>
          Teklif Yönetim Sistemi
        </div>
      </div>

      {/* ── KULLANICI KARTLARI ── */}
      <div style={{
        display: 'flex', gap: 20,
        flexWrap: 'wrap' as const, justifyContent: 'center',
        padding: '0 24px', maxWidth: 720,
        animation: 'fadeUp 0.46s ease both',
        animationDelay: '0.19s',
        opacity: secilenId ? 0.45 : 1,
        transition: 'opacity 0.24s ease',
        pointerEvents: secilenId ? 'none' : 'auto',
      }}>
        {KULLANICILAR.map((k) => (
          <KullaniciKarti key={k.id} kullanici={k} onSecim={handleSecim} />
        ))}
      </div>

      {/* ── KILAVUZ METİN ── */}
      <div style={{
        marginTop: 34,
        animation: 'fadeUp 0.46s ease both',
        animationDelay: '0.27s',
      }}>
        <div style={{
          fontSize: 10.5, letterSpacing: 2.0,
          color: silver(0.28),
          fontWeight: 400, textTransform: 'uppercase' as const,
          textAlign: 'center' as const,
          userSelect: 'none' as const, WebkitUserSelect: 'none' as const,
        }}>
          Hesabınızı seçerek devam edin
        </div>
      </div>
    </div>
  );
}
