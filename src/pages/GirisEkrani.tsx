import { useState } from 'react';
import { KULLANICILAR } from '../types/kullanici';
import type { Kullanici } from '../types/kullanici';
import { useKullanici } from '../context/KullaniciContext';

// ── Mühendislik Zemin Katmanı ──────────────────────────────────────────────────
// Blueprint grid (CSS) + teknik çizgi detayları (SVG)
// Tüm elemanlar %3-8 opaklıkta - doku verir, dikkat dağıtmaz.
function EngineeringOverlay() {
  return (
    <>
      {/* Blueprint grid - ince + modül seviye */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(70,120,220,0.038) 1px, transparent 1px),
            linear-gradient(90deg, rgba(70,120,220,0.038) 1px, transparent 1px),
            linear-gradient(rgba(70,120,220,0.062) 1px, transparent 1px),
            linear-gradient(90deg, rgba(70,120,220,0.062) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px',
          pointerEvents: 'none',
        }}
      />

      {/*
        SVG teknik detaylar.
        viewBox="0 0 100 100" + preserveAspectRatio="none"
        koordinatlar 0-100 arasında, tam ekranı kapsar.
        strokeWidth çok ince, distorsiyon göze çarpmaz.
      */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Diyagonal yapı çizgileri - pnömatik şema hissi */}
        <line x1="0" y1="82" x2="100" y2="6"
          stroke="rgba(80,140,240,0.042)" strokeWidth="0.35" />
        <line x1="0" y1="96" x2="100" y2="20"
          stroke="rgba(80,140,240,0.032)" strokeWidth="0.35" />
        <line x1="8" y1="0" x2="100" y2="55"
          stroke="rgba(80,140,240,0.028)" strokeWidth="0.30" />

        {/* Pnömatik akış yayı - kesikli, sağ üst köşeye doğru */}
        <path
          d="M 50 0 Q 72 22 100 28"
          fill="none"
          stroke="rgba(80,150,250,0.040)"
          strokeWidth="0.40"
          strokeDasharray="1.8 3.2"
        />

        {/* Sağ üst köşe köşe izi */}
        <polyline
          points="85,2.2 97.8,2.2 97.8,12"
          fill="none"
          stroke="rgba(110,170,255,0.17)"
          strokeWidth="0.55"
        />
        <circle cx="97.8" cy="2.2" r="1.4"
          fill="none" stroke="rgba(110,170,255,0.22)" strokeWidth="0.50" />

        {/* Sol alt köşe izi */}
        <polyline
          points="2.2,88 2.2,97.8 12,97.8"
          fill="none"
          stroke="rgba(110,170,255,0.13)"
          strokeWidth="0.55"
        />
        <circle cx="2.2" cy="97.8" r="1.4"
          fill="none" stroke="rgba(110,170,255,0.17)" strokeWidth="0.50" />

        {/* Seyreltik düğüm noktaları - ızgara kesişimleri */}
        <circle cx="18" cy="14" r="1.0" fill="rgba(110,170,255,0.09)" />
        <circle cx="82" cy="86" r="1.0" fill="rgba(110,170,255,0.07)" />
        <circle cx="14" cy="70" r="0.7" fill="rgba(110,170,255,0.07)" />
        <circle cx="86" cy="30" r="0.7" fill="rgba(110,170,255,0.06)" />

        {/* Yatay referans çizgileri - kenar ölçüm hissi */}
        <line x1="1.5" y1="50" x2="4.5" y2="50"
          stroke="rgba(110,170,255,0.12)" strokeWidth="0.40" />
        <line x1="95.5" y1="50" x2="98.5" y2="50"
          stroke="rgba(110,170,255,0.12)" strokeWidth="0.40" />
      </svg>
    </>
  );
}

// ── Avatar Monogram ────────────────────────────────────────────────────────────
function KullaniciAvatar({
  kullanici,
  boyut = 66,
}: {
  kullanici: Kullanici;
  boyut?: number;
}) {
  const isAdmin = kullanici.rol === 'admin';
  return (
    <div
      style={{
        width: boyut,
        height: boyut,
        borderRadius: '50%',
        background: isAdmin
          ? 'linear-gradient(135deg, rgba(185,148,52,0.18) 0%, rgba(100,76,20,0.08) 100%)'
          : 'linear-gradient(135deg, rgba(55,100,200,0.22) 0%, rgba(28,58,140,0.10) 100%)',
        border: isAdmin
          ? '1.5px solid rgba(195,158,65,0.42)'
          : '1.5px solid rgba(75,135,220,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: boyut * 0.295,
        fontWeight: 700,
        color: isAdmin ? '#d4ac52' : '#7ab4f2',
        letterSpacing: 0.5,
        boxShadow: isAdmin
          ? 'inset 0 1px 0 rgba(255,220,110,0.07), 0 0 14px rgba(185,148,52,0.09)'
          : 'inset 0 1px 0 rgba(120,180,255,0.07), 0 0 14px rgba(55,100,200,0.09)',
        fontFamily: '"Arial", sans-serif',
        flexShrink: 0,
      }}
    >
      {kullanici.initials}
    </div>
  );
}

// ── Kullanıcı Kartı ────────────────────────────────────────────────────────────
function KullaniciKarti({
  kullanici,
  onSecim,
}: {
  kullanici: Kullanici;
  onSecim: (k: Kullanici) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const isAdmin = kullanici.rol === 'admin';

  const borderColor = hovered || pressed
    ? isAdmin ? 'rgba(195,158,65,0.48)' : 'rgba(75,135,220,0.46)'
    : isAdmin ? 'rgba(195,158,65,0.18)'  : 'rgba(75,135,220,0.16)';

  const bg = pressed
    ? 'rgba(5, 10, 24, 0.96)'
    : hovered
    ? isAdmin ? 'rgba(10, 18, 36, 0.97)' : 'rgba(8, 16, 34, 0.97)'
    : 'rgba(7, 14, 28, 0.88)';

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
      role="button"
      tabIndex={0}
      onClick={() => onSecim(kullanici)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onKeyDown={(e) => e.key === 'Enter' && onSecim(kullanici)}
      style={{
        width: isAdmin ? 228 : 204,
        padding: '30px 24px 26px',
        borderRadius: 14,
        cursor: 'pointer',
        border: `1px solid ${borderColor}`,
        background: bg,
        boxShadow: shadow,
        transform,
        transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        textAlign: 'center' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: 15,
        userSelect: 'none' as const,
        position: 'relative' as const,
        overflow: 'hidden' as const,
        outline: 'none',
      }}
    >
      <KullaniciAvatar kullanici={kullanici} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
        <div style={{
          fontSize: isAdmin ? 14 : 14.5,
          fontWeight: 600,
          color: isAdmin ? '#c8a844' : '#d8e8fa',
          letterSpacing: isAdmin ? 0.35 : 0.15,
          lineHeight: 1.3,
          fontFamily: '"Segoe UI", "Inter", "Arial", sans-serif',
          whiteSpace: 'nowrap' as const,
        }}>
          {kullanici.adSoyad}
        </div>
        <div style={{
          fontSize: 10,
          color: 'rgba(120,155,205,0.58)',
          fontWeight: 400,
          letterSpacing: 0.4,
          fontFamily: '"Arial", sans-serif',
          textAlign: 'center' as const,
          lineHeight: 1.65,
          whiteSpace: 'pre-line' as const,
        }}>
          {kullanici.unvan}
        </div>
      </div>

      {/* Alt aksent çizgisi */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '28%',
        right: '28%',
        height: 1,
        background: isAdmin
          ? `linear-gradient(90deg, transparent, rgba(195,158,65,${hovered ? 0.38 : 0.09}), transparent)`
          : `linear-gradient(90deg, transparent, rgba(75,135,220,${hovered ? 0.40 : 0.09}), transparent)`,
        transition: 'all 0.22s ease',
      }} />

      {/* Üst highlight çizgisi */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '32%',
        right: '32%',
        height: 1,
        background: `linear-gradient(90deg, transparent, rgba(255,255,255,${hovered ? 0.048 : 0.018}), transparent)`,
        transition: 'all 0.22s ease',
      }} />
    </div>
  );
}

// ── Ana Giriş Ekranı ───────────────────────────────────────────────────────────
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
        background: 'linear-gradient(160deg, #060c1a 0%, #0c1828 45%, #07101f 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Segoe UI", "Inter", "Arial", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Zemin Katmanları ── */}
      <EngineeringOverlay />

      {/* Logo arkasındaki odak ışıması */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 520,
        height: 360,
        background: 'radial-gradient(ellipse, rgba(18,48,120,0.22) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Üst kenar aksent çizgisi */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: 'linear-gradient(90deg, transparent 0%, rgba(55,110,220,0.32) 25%, rgba(75,140,255,0.58) 50%, rgba(55,110,220,0.32) 75%, transparent 100%)',
      }} />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .giris-ekrani ::selection { background: transparent; }
      `}</style>

      {/* ── LOGO — merkezde, tasarımın odağı ── */}
      <div style={{
        marginBottom: 26,
        animation: 'fadeUp 0.46s ease both',
        animationDelay: '0.04s',
        position: 'relative',
      }}>
        {/* Logo yüzeyi - derin cam malzeme */}
        <div style={{
          padding: '22px 48px',
          borderRadius: 18,
          background: 'rgba(7, 16, 36, 0.72)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(65,115,210,0.15)',
          boxShadow: [
            '0 36px 90px rgba(0,0,0,0.58)',
            '0 8px 24px rgba(0,0,0,0.42)',
            'inset 0 1px 0 rgba(110,175,255,0.065)',
            'inset 0 -1px 0 rgba(0,0,0,0.28)',
            'inset 0 0 36px rgba(8,24,72,0.32)',
          ].join(', '),
        }}>
          <img
            src="/logo-meba.png"
            alt="MEBA Mekanik"
            style={{
              height: 128,
              width: 'auto',
              display: 'block',
              imageRendering: '-webkit-optimize-contrast',
              filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.45))',
            }}
          />
        </div>
      </div>

      {/* ── BAŞLIK ── */}
      <div style={{
        marginBottom: 42,
        textAlign: 'center',
        animation: 'fadeUp 0.46s ease both',
        animationDelay: '0.11s',
      }}>
        {/* Disiplin etiketi */}
        <div style={{
          fontSize: 9.5,
          letterSpacing: 3.2,
          color: 'rgba(100,150,230,0.48)',
          fontWeight: 400,
          textTransform: 'uppercase' as const,
          marginBottom: 9,
          fontFamily: '"Arial", sans-serif',
        }}>
          Pnömatik &nbsp;·&nbsp; Hidrolik &nbsp;·&nbsp; Makina &nbsp;·&nbsp; Mühendislik
        </div>

        {/* Ana başlık */}
        <div style={{
          fontSize: 21,
          letterSpacing: 1.2,
          color: 'rgba(215,228,248,0.88)',
          fontWeight: 700,
          lineHeight: 1.25,
          textShadow: '0 1px 4px rgba(0,0,0,0.38)',
        }}>
          Teklif Yönetim Sistemi
        </div>
      </div>

      {/* ── KULLANICI KARTLARI ── */}
      <div style={{
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap' as const,
        justifyContent: 'center',
        padding: '0 24px',
        maxWidth: 720,
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
          fontSize: 10.5,
          letterSpacing: 2.0,
          color: 'rgba(95,138,200,0.36)',
          fontWeight: 400,
          textTransform: 'uppercase' as const,
          textAlign: 'center' as const,
          userSelect: 'none' as const,
          WebkitUserSelect: 'none' as const,
        }}>
          Hesabınızı seçerek devam edin
        </div>
      </div>

    </div>
  );
}
