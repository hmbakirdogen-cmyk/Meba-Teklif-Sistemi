/**
 * TipSpotlight.tsx
 * ─────────────────────────────────────────────────────────────────
 * A4 belgenin USTUNDE spotlight + icerik karti + gercekci animasyon.
 *
 * Davranis:
 *  • Portal ile document.body'e renderlanir — A4 transform/scroll'undan bagimsiz.
 *  • Backdrop koyu yari-saydam (rgba 15,23,42,0.55) → goze sok.
 *  • Hedef DOM elementi bounding rect'i alinir, etrafina spotlight cutout
 *    cizilir (SVG mask + rect). Hedef element net gorunur, etrafi karanlik.
 *  • Spotlight kenarinda MEBA mavi parlak halo + yumusak pulse animasyonu.
 *  • Konum-bagimli mini etiket (chip) hedefi isaret eder.
 *  • Alt kismda buyuk icerik karti (title + description + ANLADIM butonu).
 *  • Hedefin uzerinde scripted cursor animasyonu (tip-spesifik).
 *  • Sequence mode: birden cok tip arka arkaya, step gostergesi.
 *
 * Kullanim:
 *   <TipSpotlight
 *     visible={true}
 *     target={domElement}
 *     step={{ current: 1, total: 4 }}
 *     baslik="Satir Yuksekligini Buyut"
 *     aciklama="Mavi cizgiyi tutup asagi cek..."
 *     animasyon={<RowResizeAnim rect={rect} />}
 *     onAnladim={() => ...}
 *     onAtla={() => ...}
 *   />
 */
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface TipSpotlightProps {
  visible: boolean;
  /** PRIMARY DOM target — animasyon + mini etiket + ok bu hedefe atfedilir. */
  target: HTMLElement | null;
  /** EK HEDEFLER — primary'ye ek olarak spotlight cutout + halo cizilir.
   *  Animasyon ve mini etiket KOYULMAZ — sadece "ben de varim" vurgusu. */
  ekHedefler?: HTMLElement[];
  /** Sequence mode icin step gostergesi. Yoksa tek tip. */
  step?: { current: number; total: number };
  baslik: string;
  aciklama: string;
  /** Hedefi gosteren BUYUK yon oku — icerik kartindan target'a uzanir. */
  gostericiOk?: boolean;
  /** Hedef yakininda mini etiket (kucuk balon). "Bu butona bas" gibi. */
  miniEtiket?: string;
  /**
   * Hedefin USTUNE/ICINE renderlanan tip-spesifik animasyon. Spotlight rect
   * (viewport koordinatlari) parametre olarak verilir; component absolute
   * pozisyonla yerlesir.
   */
  animasyon?: (rect: DOMRect) => React.ReactNode;
  /** "ANLADIM" tiklaminda — production: mark seen + close. Sequence: next. */
  onAnladim: () => void;
  /** "ATLA" / X — production: close (mark seen). Sequence: skip rest. */
  onAtla?: () => void;
  /** Sequence sonraki buton metni (varsa). Default "SONRAKI". */
  ileriEtiket?: string;
  /** Son tip ise bu true; buton "BITIR" olur. */
  sonAdim?: boolean;
  /**
   * Animasyonun hedefin altinda kapladigi yer ihtiyaci (px). TipDef'ten
   * gelir, kartin alt yerlesim hesabini etkiler. Default: 200 (tipik).
   * Ornek: satir-yukseklik 80, para-birimi 340, birim-fiyat 220.
   */
  animAltKaplama?: number;
  /**
   * Icerik kartinin max genisligi (px). TipDef'ten gelir. Default: 720
   * (A4 hucre tipleri). Toolbar tipleri 540 kullanir — daha ferah dengeli
   * yerlesim icin.
   */
  kartGenislik?: number;
}

interface RectState {
  x: number;
  y: number;
  width: number;
  height: number;
  vw: number;
  vh: number;
}

/** Hedef rect'i + viewport boyutunu donduren hook. Resize/scroll'da yenile. */
function useTargetRect(target: HTMLElement | null): RectState | null {
  const [rect, setRect] = useState<RectState | null>(null);

  useLayoutEffect(() => {
    if (!target) {
      // Hedef yokken eski rect'i temizle — yeni tip degisirken stale rect gosterilmesin.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRect(null);
      return;
    }
    const olc = () => {
      const r = target.getBoundingClientRect();
      setRect({
        x: r.left,
        y: r.top,
        width: r.width,
        height: r.height,
        vw: window.innerWidth,
        vh: window.innerHeight,
      });
    };
    olc();
    const ro = new ResizeObserver(olc);
    ro.observe(target);
    ro.observe(document.body);
    window.addEventListener('scroll', olc, true);
    window.addEventListener('resize', olc);
    const id = window.setInterval(olc, 250); // güvence — A4 scale değişimi
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', olc, true);
      window.removeEventListener('resize', olc);
      window.clearInterval(id);
    };
  }, [target]);

  return rect;
}

/** Coklu hedef icin rect listesi — ek spotlight'lar (notlar tipinde buton). */
function useTargetRects(targets: HTMLElement[] | undefined): RectState[] {
  const [rects, setRects] = useState<RectState[]>([]);
  // Array reference'ini key ile sabitlemek icin element-id konkatenasyonu —
  // ayni elementler ise aynı key, effect tetiklenmez.
  const key = targets ? targets.map((el) => {
    const t = el as HTMLElement & { __mebaTipKey?: number };
    if (!t.__mebaTipKey) t.__mebaTipKey = Math.random();
    return t.__mebaTipKey;
  }).join('|') : '';

  useLayoutEffect(() => {
    if (!targets || targets.length === 0) {
      setRects([]);
      return;
    }
    const olc = () => {
      setRects(targets.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left, y: r.top, width: r.width, height: r.height,
          vw: window.innerWidth, vh: window.innerHeight,
        };
      }));
    };
    olc();
    const ro = new ResizeObserver(olc);
    targets.forEach((el) => ro.observe(el));
    ro.observe(document.body);
    window.addEventListener('scroll', olc, true);
    window.addEventListener('resize', olc);
    const id = window.setInterval(olc, 250);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', olc, true);
      window.removeEventListener('resize', olc);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return rects;
}

const PADDING = 14;
const HALO_RADIUS = 14;

export default function TipSpotlight({
  visible,
  target,
  ekHedefler,
  step,
  baslik,
  aciklama,
  gostericiOk,
  miniEtiket,
  animasyon,
  onAnladim,
  onAtla,
  ileriEtiket,
  sonAdim,
  animAltKaplama,
  kartGenislik,
}: TipSpotlightProps) {
  const rect = useTargetRect(target);
  const ekRectler = useTargetRects(ekHedefler);
  // animKey doğrudan baslik'tan turetilir — tip degistiginde key degisir,
  // React inner JSX'i (animasyon wrapper'i) remount eder, CSS keyframes basa doner.
  const animKey = baslik;

  // ESC ile atla
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onAtla) onAtla();
      if (e.key === 'Enter') onAnladim();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onAnladim, onAtla]);

  if (!visible || !rect) return null;

  // Spotlight cutout — hedef rect + padding
  const sX = Math.max(0, rect.x - PADDING);
  const sY = Math.max(0, rect.y - PADDING);
  const sW = Math.min(rect.vw - sX, rect.width + PADDING * 2);
  const sH = Math.min(rect.vh - sY, rect.height + PADDING * 2);

  // Icerik karti konumu — animasyonlarin cogu hedefin ALTINA cizilir
  // (dropdown, modal, yeni satir indikatoru, drag phantom...). O nedenle
  // kart UST'e oncelikli yerlestirilir. Ust yer yetmezse alta kayar AMA
  // animasyonun olasi alanini (200px) atlatip onun altina iner.
  const altBosluk = rect.vh - (sY + sH);
  const ustBosluk = sY;
  const KART_YUKSEKLIK_TAHMIN = step ? 230 : 200;
  // animAltKaplama prop'undan (TipDef pool field'i) gelir — her tip kendi
  // animasyonunun kapladigi alt alani belirtir. Yoksa default 200 (tipik).
  const ANIM_ALT_KAPLAMA = animAltKaplama ?? 200;
  const ustYeterli = ustBosluk >= KART_YUKSEKLIK_TAHMIN + 36;
  const altAnimSonra = altBosluk - ANIM_ALT_KAPLAMA;
  const kartAlt = !ustYeterli && altAnimSonra >= KART_YUKSEKLIK_TAHMIN;
  const kartTop = kartAlt
    ? sY + sH + ANIM_ALT_KAPLAMA
    : Math.max(24, sY - KART_YUKSEKLIK_TAHMIN - 36);
  // Kart yatay konumu: hedefin merkezine yapis, viewport sinirlarinda clamp.
  // kartGenislik prop'undan (TipDef pool field'i) gelir — toolbar tipleri
  // 540 (ferah), A4 hucre tipleri 720 (default). Yoksa 720'a duser.
  const KART_GENISLIK = Math.min(kartGenislik ?? 720, rect.vw - 48);
  const targetCenterX = sX + sW / 2;
  const kartMinCenterX = KART_GENISLIK / 2 + 24;
  const kartMaxCenterX = rect.vw - KART_GENISLIK / 2 - 24;
  const kartCenterX = Math.max(kartMinCenterX, Math.min(kartMaxCenterX, targetCenterX));
  // Yon oku gometrisi — karttan spotlight'a egri cizgi
  const targetEdgeY = kartAlt ? sY + sH + 6 : sY - 6; // halo kenarinin DISI
  const cardEdgeY = kartAlt ? kartTop - 14 : kartTop + KART_YUKSEKLIK_TAHMIN + 14;
  // Egri kontrol noktasi — yumusak bezier
  const okOrtaX = (kartCenterX + targetCenterX) / 2;
  const okOrtaY = (cardEdgeY + targetEdgeY) / 2;

  const ileriMetin = sonAdim ? 'BİTİR' : (ileriEtiket || 'SONRAKİ');

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        // Faz 18 KRITIK: pointerEvents:'none' wrapper'a — overlay yanlislikla
        // stuck visible kalsa bile tum viewport'u bloklayip navbar/sekme
        // tikleri yutmaz. Interaktif cocuklarda (icerik karti, butonlar)
        // pointerEvents:'auto' ile geri acilir.
        position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'none',
        animation: 'meba-tip-overlay-in 240ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Backdrop — SVG mask ile spotlight cutout (primary + ek hedefler) */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox={`0 0 ${rect.vw} ${rect.vh}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="meba-tip-spotlight-mask">
            <rect x="0" y="0" width={rect.vw} height={rect.vh} fill="white" />
            <rect x={sX} y={sY} width={sW} height={sH} rx={HALO_RADIUS} fill="black" />
            {ekRectler.map((er, i) => {
              const eX = Math.max(0, er.x - PADDING);
              const eY = Math.max(0, er.y - PADDING);
              const eW = Math.min(er.vw - eX, er.width + PADDING * 2);
              const eH = Math.min(er.vh - eY, er.height + PADDING * 2);
              return <rect key={i} x={eX} y={eY} width={eW} height={eH} rx={HALO_RADIUS} fill="black" />;
            })}
          </mask>
        </defs>
        <rect
          x="0" y="0" width={rect.vw} height={rect.vh}
          fill="rgba(15, 23, 42, 0.55)"
          mask="url(#meba-tip-spotlight-mask)"
        />
      </svg>

      {/* Primary halo + pulse ring */}
      <div
        style={{
          position: 'absolute',
          left: sX, top: sY, width: sW, height: sH,
          borderRadius: HALO_RADIUS,
          boxShadow: '0 0 0 2px #5b8def, 0 0 30px rgba(91, 141, 239, 0.55), 0 0 80px rgba(91, 141, 239, 0.25)',
          pointerEvents: 'none',
          animation: 'meba-tip-halo-pulse 2.4s ease-in-out infinite',
        }}
      />

      {/* Ek hedef halolari — daha hafif vurgu (ikincil) */}
      {ekRectler.map((er, i) => {
        const eX = Math.max(0, er.x - PADDING);
        const eY = Math.max(0, er.y - PADDING);
        const eW = Math.min(er.vw - eX, er.width + PADDING * 2);
        const eH = Math.min(er.vh - eY, er.height + PADDING * 2);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: eX, top: eY, width: eW, height: eH,
              borderRadius: HALO_RADIUS,
              boxShadow: '0 0 0 2px rgba(91, 141, 239, 0.7), 0 0 22px rgba(91, 141, 239, 0.40), 0 0 60px rgba(91, 141, 239, 0.18)',
              pointerEvents: 'none',
              animation: 'meba-tip-halo-pulse 2.4s ease-in-out infinite',
            }}
          />
        );
      })}

      {/* BUYUK YON OKU — icerik kartindan target'a uzanir, goze sok */}
      {gostericiOk && (
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox={`0 0 ${rect.vw} ${rect.vh}`}
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="meba-tip-ok-ucu"
              viewBox="0 0 12 12"
              refX="6" refY="6"
              markerWidth="8" markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 1 1 L 11 6 L 1 11 L 3.5 6 Z" fill="#fbbf24" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round" />
            </marker>
          </defs>
          {/* Tek temiz path: ic sari 4px + ince siluet kontur 6.5px (siyah).
              Glow yok — sade + okunakli. pathLength 1 ile boyut bagimsiz. */}
          <path
            d={`M ${kartCenterX} ${cardEdgeY} Q ${okOrtaX} ${okOrtaY}, ${targetCenterX} ${targetEdgeY}`}
            stroke="#0f172a"
            strokeWidth="6.5"
            strokeLinecap="round"
            fill="none"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset="1"
            style={{ animation: 'meba-tip-ok-ciz 700ms cubic-bezier(0.16, 1, 0.3, 1) 280ms forwards' }}
          />
          <path
            d={`M ${kartCenterX} ${cardEdgeY} Q ${okOrtaX} ${okOrtaY}, ${targetCenterX} ${targetEdgeY}`}
            stroke="#fbbf24"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset="1"
            markerEnd="url(#meba-tip-ok-ucu)"
            style={{
              animation: 'meba-tip-ok-ciz 700ms cubic-bezier(0.16, 1, 0.3, 1) 320ms forwards',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
            }}
          />
        </svg>
      )}

      {/* Mini etiket — 4 yonde akilli placement.
          - Genis hedef (kart vb. width>240): UST/ALT'a yerlesim (yan yetmez)
          - Dar hedef (buton/hucre): SAG/SOL'a yerlesim
          - Hangisinde bos yer fazlaysa orada
          - Tail her zaman hedefe dogru bakar */}
      {miniEtiket && (() => {
        const ETIKET_GENISLIK = 240;
        const ETIKET_YUKSEKLIK = 44;
        const yatayGenis = rect.width > 240;
        const sagBosluk = rect.vw - (sX + sW);
        const solBosluk = sX;
        const ustBosluk = sY;
        const altBosluk = rect.vh - (sY + sH);
        type Yon = 'sag' | 'sol' | 'ust' | 'alt';
        let yon: Yon;
        if (yatayGenis) {
          yon = ustBosluk >= ETIKET_YUKSEKLIK + 20 ? 'ust'
              : altBosluk >= ETIKET_YUKSEKLIK + 20 ? 'alt'
              : sagBosluk >= solBosluk ? 'sag' : 'sol';
        } else {
          yon = sagBosluk >= ETIKET_GENISLIK ? 'sag'
              : solBosluk >= ETIKET_GENISLIK ? 'sol'
              : altBosluk >= ETIKET_YUKSEKLIK + 20 ? 'alt' : 'ust';
        }
        // Etiket merkez konumu (hedefin uygun kenarinin disinda)
        const merkez = (() => {
          switch (yon) {
            case 'sag': return { left: sX + sW + 18, top: sY + sH / 2 };
            case 'sol': return { right: rect.vw - sX + 18, top: sY + sH / 2 };
            case 'ust': return { left: sX + sW / 2, top: sY - 16 };
            case 'alt': return { left: sX + sW / 2, top: sY + sH + 16 };
          }
        })();
        const tailRenk = '#0f172a';
        return (
          <div
            style={{
              position: 'absolute',
              ...merkez,
              transform:
                yon === 'sag' || yon === 'sol' ? 'translateY(-50%)'
                : yon === 'ust' ? 'translate(-50%, -100%)'
                : 'translate(-50%, 0)',
              padding: '8px 14px',
              background: '#fff',
              border: `3px solid ${tailRenk}`,
              borderRadius: 12,
              boxShadow: `4px 4px 0 ${tailRenk}`,
              fontSize: 15, fontWeight: 800,
              color: tailRenk,
              whiteSpace: 'nowrap',
              animation: 'meba-tip-mini-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) 420ms backwards',
              pointerEvents: 'none',
            }}
          >
            {miniEtiket}
            {/* Tail dis kontur (siyah) + ic dolgu (beyaz) — hedef tarafina bakar */}
            {(yon === 'sag' || yon === 'sol') && (
              <>
                <span style={{
                  position: 'absolute', top: '50%',
                  width: 0, height: 0,
                  transform: 'translateY(-50%)',
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  ...(yon === 'sag'
                    ? { left: -14, borderRight: `12px solid ${tailRenk}` }
                    : { right: -14, borderLeft: `12px solid ${tailRenk}` }),
                }} />
                <span style={{
                  position: 'absolute', top: '50%',
                  width: 0, height: 0,
                  transform: 'translateY(-50%)',
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                  ...(yon === 'sag'
                    ? { left: -9, borderRight: '9px solid #fff' }
                    : { right: -9, borderLeft: '9px solid #fff' }),
                }} />
              </>
            )}
            {(yon === 'ust' || yon === 'alt') && (
              <>
                <span style={{
                  position: 'absolute', left: '50%',
                  width: 0, height: 0,
                  transform: 'translateX(-50%)',
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  ...(yon === 'ust'
                    ? { bottom: -14, borderTop: `12px solid ${tailRenk}` }
                    : { top: -14, borderBottom: `12px solid ${tailRenk}` }),
                }} />
                <span style={{
                  position: 'absolute', left: '50%',
                  width: 0, height: 0,
                  transform: 'translateX(-50%)',
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  ...(yon === 'ust'
                    ? { bottom: -9, borderTop: '9px solid #fff' }
                    : { top: -9, borderBottom: '9px solid #fff' }),
                }} />
              </>
            )}
          </div>
        );
      })()}

      {/* Tip-spesifik animasyon — hedefin uzerinde */}
      {animasyon && (
        <div
          key={animKey}
          style={{
            position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
            pointerEvents: 'none',
          }}
        >
          {animasyon({
            x: rect.x, y: rect.y, width: rect.width, height: rect.height,
            top: rect.y, left: rect.x, right: rect.x + rect.width, bottom: rect.y + rect.height,
            toJSON: () => ({}),
          } as DOMRect)}
        </div>
      )}

      {/* Icerik karti — hedefe yatay olarak hizali, viewport icinde clamp.
          Faz 18: pointerEvents:'auto' — wrapper'in 'none' override'ini geri
          ac (butonlar tiklanabilir kalmali). */}
      <div
        style={{
          position: 'absolute',
          left: kartCenterX, top: kartTop,
          transform: 'translateX(-50%)',
          width: KART_GENISLIK,
          background: '#fff',
          borderRadius: 16,
          border: '1px solid rgba(91, 141, 239, 0.28)',
          boxShadow: '0 24px 64px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(255,255,255,0.05)',
          padding: '22px 28px 18px 28px',
          animation: 'meba-tip-card-in 340ms cubic-bezier(0.16, 1, 0.3, 1) 80ms backwards',
          pointerEvents: 'auto',
        }}
      >
        {/* Step gostergesi */}
        {step && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {Array.from({ length: step.total }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i + 1 === step.current ? 26 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i + 1 <= step.current ? '#5b8def' : 'rgba(91, 141, 239, 0.20)',
                    transition: 'all 240ms ease',
                  }}
                />
              ))}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: '#5b8def',
              letterSpacing: '0.04em',
            }}>
              {step.current} / {step.total}
            </div>
          </div>
        )}

        {/* Baslik */}
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: 22, fontWeight: 800, color: '#0f172a',
          letterSpacing: '-0.015em', lineHeight: 1.25,
        }}>
          {baslik}
        </h2>

        {/* Aciklama */}
        <p style={{
          margin: '0 0 18px 0',
          fontSize: 15, lineHeight: 1.55, color: '#475569',
        }}>
          {aciklama}
        </p>

        {/* Butonlar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          {onAtla && (
            <button
              type="button"
              onClick={onAtla}
              style={{
                background: 'transparent', border: 'none',
                color: '#64748b', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, padding: '8px 14px',
                borderRadius: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {step ? 'Hepsini atla' : 'Şimdilik geç'}
            </button>
          )}
          <button
            type="button"
            onClick={onAnladim}
            autoFocus
            style={{
              background: 'linear-gradient(135deg, #5b8def 0%, #4f7ee0 100%)',
              border: 'none', color: '#fff',
              padding: '12px 28px', borderRadius: 10,
              fontSize: 14, fontWeight: 800, letterSpacing: '0.03em',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(91, 141, 239, 0.45)',
              transition: 'transform 120ms ease, box-shadow 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(91, 141, 239, 0.55)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(91, 141, 239, 0.45)';
            }}
          >
            {ileriMetin}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes meba-tip-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes meba-tip-card-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes meba-tip-halo-pulse {
          0%, 100% {
            box-shadow: 0 0 0 2px #5b8def, 0 0 30px rgba(91, 141, 239, 0.55), 0 0 80px rgba(91, 141, 239, 0.25);
          }
          50% {
            box-shadow: 0 0 0 3px #7ba3f3, 0 0 44px rgba(91, 141, 239, 0.75), 0 0 110px rgba(91, 141, 239, 0.40);
          }
        }
        @keyframes meba-tip-ok-ciz {
          to { stroke-dashoffset: 0; }
        }
        @keyframes meba-tip-mini-pop {
          0%   { opacity: 0; transform: scale(0.4) translateX(-12px); }
          60%  { opacity: 1; transform: scale(1.08) translateX(0); }
          100% { opacity: 1; transform: scale(1) translateX(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
