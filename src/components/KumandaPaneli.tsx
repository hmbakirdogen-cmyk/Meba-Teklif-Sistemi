import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  EditPremiumIcon,
  ImageAddPremiumIcon,
  RowDiscountPremiumIcon,
  RowCurrencyPremiumIcon,
  KdvPremiumIcon,
  DiscountPremiumIcon,
} from './control-panel/PanelIcons';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;

const K = {
  WIDTH: 156,
  TOP: 97,
  BOTTOM_GAP: 24,
  EDGE_MIN: 24,
  RIGHT_CLOSED_OFFSET: 585, // 397 (A4 half) + 156 (panel) + 32 (gap)
  RIGHT_OPEN_OFFSET: 376,   // SagPanel 360 + 16px boşluk
} as const;

function SecLabel({ text }: { text: string }) {
  return <h3 className="panel-title">{text}</h3>;
}

interface KumandaPaneliProps {
  readOnly: boolean;
  onReadOnlyDegistir: (v: boolean) => void;
  kdvOrani: number;
  onKdvOraniDegistir: (v: number) => void;
  iskontoOrani: number;
  onIskontoOraniDegistir: (v: number) => void;
  satirBazliParaBirimi: boolean;
  onSatirBazliParaBirimiDegistir: (v: boolean) => void;
  satirBazliIskonto: boolean;
  onSatirBazliIskontoDegistir: (v: boolean) => void;
  sagPanelOpen: boolean;
  onResimEkle: (dataUrl: string) => void;
}

export default function KumandaPaneli({
  readOnly, onReadOnlyDegistir,
  kdvOrani, onKdvOraniDegistir,
  iskontoOrani, onIskontoOraniDegistir,
  satirBazliParaBirimi, onSatirBazliParaBirimiDegistir,
  satirBazliIskonto, onSatirBazliIskontoDegistir,
  sagPanelOpen, onResimEkle,
}: KumandaPaneliProps) {
  const [lastKdv, setLastKdv] = useState(() => (kdvOrani > 0 ? kdvOrani : 20));
  const [lastIsk, setLastIsk] = useState(() => (iskontoOrani > 0 ? iskontoOrani : 10));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const kdvOn = kdvOrani > 0;
  const iskOn = iskontoOrani > 0;

  const toggleKdv = () => {
    if (kdvOn) {
      setLastKdv(kdvOrani);
      onKdvOraniDegistir(0);
      return;
    }
    onKdvOraniDegistir(lastKdv);
  };

  const toggleIsk = () => {
    if (iskOn) {
      setLastIsk(iskontoOrani);
      onIskontoOraniDegistir(0);
      return;
    }
    onIskontoOraniDegistir(lastIsk);
  };

  const onResimSec = () => fileInputRef.current?.click();
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') onResimEkle(result);
    };
    reader.readAsDataURL(file);
  };

  const [a4Top, setA4Top] = useState<number>(K.TOP);
  const measureA4 = () => {
    const a4El = document.querySelector<HTMLElement>('.belge-screen-view');
    if (!a4El) return;
    const top = Math.round(a4El.getBoundingClientRect().top);
    if (top > 0) setA4Top(top);
  };

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(measureA4));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onResize = () => measureA4();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      className="no-print"
      style={{
        position: 'fixed',
        top: a4Top,
        right: sagPanelOpen
          ? `${K.RIGHT_OPEN_OFFSET}px`
          : `max(${K.EDGE_MIN}px, calc(50% - ${K.RIGHT_CLOSED_OFFSET}px))`,
        width: K.WIDTH,
        maxHeight: `calc(100vh - ${a4Top + K.BOTTOM_GAP}px)`,
        zIndex: 80,
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      <style>{`
        :root {
          --panel-scale: 0.65;
          --panel-bg-1: #1a0308;
          --panel-bg-2: #2b0610;
          --panel-bg-3: #090103;

          --panel-glow: rgba(255, 80, 110, 0.18);
          --panel-border: rgba(255, 120, 140, 0.28);
          --panel-edge-glow: rgba(255, 112, 134, 0.12);
          --panel-inner-light: rgba(255, 255, 255, 0.08);

          --panel-shadow:
            0 34px 82px rgba(5, 0, 2, 0.68),
            0 0 28px var(--panel-edge-glow),
            inset 0 1px 0 var(--panel-inner-light),
            inset 0 0 0 1px rgba(255,255,255,0.03),
            inset 0 -18px 30px rgba(0,0,0,0.34);

          --card-bg-1: #3a0a14;
          --card-bg-2: #160307;
          --card-border: rgba(255, 120, 140, 0.25);

          --active-bg-1: #5a1322;
          --active-bg-2: #22060c;
          --active-border: rgba(255, 140, 160, 0.7);

          --blue-1: #3f7cff;
          --blue-2: #1b2f8a;
          --blue-border: #6ea1ff;

          --text-main: #fff5f2;
          --text-soft: rgba(255, 220, 215, 0.7);

          --accent: #ff8f9b;
        }

        .control-panel {
          width: 100%;
          box-sizing: border-box;
          padding: calc(20px * var(--panel-scale));
          border-radius: calc(28px * var(--panel-scale));
          color: var(--text-main);
          background:
            radial-gradient(circle at 14% -4%, rgba(255, 115, 138, 0.22), transparent 34%),
            radial-gradient(circle at 84% 4%, rgba(255, 255, 255, 0.06), transparent 26%),
            radial-gradient(circle at 50% 120%, rgba(0, 0, 0, 0.28), transparent 45%),
            linear-gradient(160deg,
              #3a0814 0%,
              var(--panel-bg-2) 24%,
              var(--panel-bg-1) 52%,
              var(--panel-bg-3) 100%
            );
          border: 1px solid var(--panel-border);
          box-shadow: var(--panel-shadow);
          overflow: hidden;
          transition:
            border-color 280ms ease,
            box-shadow 320ms ease;
        }

        /* Düzenleme aktifken (Düzenle butonu basılı): tüm panel çerçevesi
           ince yeşil neon hat olur ve dışa ışık saçar. Renkler EditPremiumIcon
           accent ailesiyle aynı (rgba 70 255 160). */
        .control-panel[data-editing="true"] {
          border: 1px solid rgba(90, 255, 175, 0.85);
          box-shadow:
            0 0 18px rgba(70, 255, 160, 0.45),
            0 0 50px rgba(70, 255, 160, 0.30),
            0 0 110px rgba(70, 255, 160, 0.18),
            inset 0 0 0 1px rgba(70, 255, 160, 0.20),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -18px 30px rgba(0, 0, 0, 0.34);
        }

        .panel-section {
          margin: 0;
        }

        .panel-section + .panel-section {
          margin-top: calc(20px * var(--panel-scale));
          padding-top: calc(18px * var(--panel-scale));
          border-top: 1px solid rgba(255, 111, 132, 0.18);
        }

        .panel-title {
          margin: 0 0 calc(14px * var(--panel-scale));
          font-size: calc(11px * var(--panel-scale));
          letter-spacing: 0.18em;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-soft);
          user-select: none;
        }

        .control-panel button {
          cursor: pointer;
          font-family: inherit;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          backdrop-filter: blur(0px);
          -webkit-backdrop-filter: blur(0px);
          transition:
            transform 180ms ease,
            box-shadow 220ms ease,
            filter 180ms ease,
            border-color 180ms ease,
            color 180ms ease,
            text-shadow 180ms ease,
            background 220ms ease,
            backdrop-filter 220ms ease,
            -webkit-backdrop-filter 220ms ease;
          will-change: transform, box-shadow, backdrop-filter;
        }

        /* Default karakter — .control-panel'e konuldu (en düşük specificity).
           Per-buton class'lar (.button-tax vb.) bunu rahatça override eder. */
        .control-panel {
          --button-accent: rgba(255, 105, 135, 0.95);
          --button-glow:   rgba(255, 105, 135, 0.28);
        }

        /* ── Per-buton karakter renk paleti ──────────────────────────── */
        /* .control-panel button. prefix ile specificity (0,2,1) →
           .control-panel button (0,1,1) override edilir. */
        .control-panel button.button-edit         { --button-accent: rgba( 70, 255, 160, 0.95); --button-glow: rgba( 70, 255, 160, 0.45); }
        /* Kilitli durumda kilit ikonu sıcak kırmızı; düzenleme aktifken yeşil. */
        .control-panel button.button-edit[data-readonly="true"] {
          --button-accent: rgba(255,  95, 115, 0.95);
          --button-glow:   rgba(255,  95, 115, 0.40);
        }
        .control-panel button.button-image        { --button-accent: rgba( 95, 165, 255, 0.95); --button-glow: rgba( 95, 165, 255, 0.34); }
        .control-panel button.button-row-discount { --button-accent: rgba(255, 105, 145, 0.95); --button-glow: rgba(255, 105, 145, 0.30); }
        .control-panel button.button-row-currency { --button-accent: rgba(185, 120, 255, 0.95); --button-glow: rgba(185, 120, 255, 0.28); }
        .control-panel button.button-tax          { --button-accent: rgba(255, 190,  95, 0.95); --button-glow: rgba(255, 190,  95, 0.30); }
        .control-panel button.button-discount     { --button-accent: rgba(255, 135,  80, 0.95); --button-glow: rgba(255, 135,  80, 0.28); }

        /* ── Aktif / basılı: saydam cam + neon karakter ──────────────────
           backdrop-filter ile ardalan bulanıklaşır; gradient bg color-mix
           ile karakter rengine hafif boyanır; içte beyaz highlight + altta
           derinlik gölgesi. Buton tek renge boyanmaz; ışık içten yayılır. */
        .control-panel button.is-active,
        .control-panel button:active {
          backdrop-filter: blur(12px) saturate(1.2);
          -webkit-backdrop-filter: blur(12px) saturate(1.2);
          background:
            linear-gradient(
              160deg,
              color-mix(in srgb, var(--button-accent) 18%, transparent),
              rgba(255,255,255,0.02)
            );
          color: var(--button-accent);
          border-color: var(--button-accent);
          text-shadow:
            0 0 10px var(--button-glow),
            0 0 24px var(--button-glow);
          box-shadow:
            0 0 22px var(--button-glow),
            0 0 60px color-mix(in srgb, var(--button-glow) 70%, transparent),
            inset 0 1px 0 rgba(255,255,255,0.22),
            inset 0 -14px 28px rgba(0,0,0,0.42);
        }

        /* ── Premium SVG ikon ailesi (özel pictogram) ──
           Tek parça SVG'ler currentColor üzerinden var(--button-accent)
           inherit eder. Pasifte yumuşak glow, aktif/basili'da yoğun. */
        .panel-icon {
          color: var(--button-accent);
          flex-shrink: 0;
          filter:
            drop-shadow(0 0 6px var(--button-glow))
            drop-shadow(0 0 14px var(--button-glow));
          transition: filter 220ms ease;
        }

        .lock-button .panel-icon { width: 52px; height: 52px; }
        .image-add  .panel-icon { width: 36px; height: 36px; }
        /* Kare butonlarda etiket yok — ikon büyük ve parent flex gap'i (6px*scale)
           ile value'dan ayrılır. margin-bottom verilmez (yoksa tek ikon halinde
           merkezleme aşağı kayar). */
        .square-btn .panel-icon { width: 54px; height: 54px; }

        .control-panel button.is-active .panel-icon,
        .control-panel button:active .panel-icon {
          filter:
            drop-shadow(0 0 8px var(--button-glow))
            drop-shadow(0 0 20px var(--button-glow))
            drop-shadow(0 0 36px var(--button-glow));
        }

        /* press-glow (premiumPressGlow keyframe) için per-buton renk */
        .control-panel button { --press-glow: var(--button-glow); }

        /* Hover — hafif cam hissi: subtle blur + ince şeffaf bg */
        .control-panel button:hover {
          transform: translateY(-2px);
          filter: brightness(1.08) saturate(1.08);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          background:
            linear-gradient(
              160deg,
              rgba(255,255,255,0.04),
              rgba(255,255,255,0.01)
            );
        }

        /* Pressed — fiziksel buton hissi: hafif içeri bas + scale */
        .control-panel button:active {
          transform: translateY(2px) scale(0.975);
          filter: brightness(0.96);
        }

        /* Cam üst highlight overlay — pasifte görünmez, aktif/basılı durumda
           üstte yumuşak cam parlaması olarak belirir (opacity 0 → 0.55). */
        .control-panel button::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,0.25),
              rgba(255,255,255,0.06) 35%,
              rgba(255,255,255,0.02) 60%
            );
          z-index: 1;
          transition: opacity 220ms ease;
        }

        .control-panel button.is-active::before,
        .control-panel button:active::before {
          opacity: 0.55;
        }

        .control-panel button > * {
          position: relative;
          z-index: 2;
        }

        .control-panel button .button-sweep {
          position: absolute;
          top: -40%;
          left: -80%;
          width: 45%;
          height: 180%;
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(255,255,255,0.04) 35%,
            rgba(255,255,255,0.16) 50%,
            rgba(255,255,255,0.04) 65%,
            transparent 100%
          );
          transform: rotate(8deg);
          opacity: 0;
          pointer-events: none;
          z-index: 1;
        }

        .control-panel button::after {
          content: "";
          position: absolute;
          inset: -18px;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          z-index: 0;
          background: radial-gradient(circle, var(--press-glow, rgba(255, 90, 120, 0.35)) 0%, transparent 62%);
          transform: scale(0.72);
        }

        .control-panel button:active::after {
          animation: premiumPressGlow 520ms ease-out forwards;
        }

        .control-panel button:hover .button-sweep {
          animation: premiumLightSweep 900ms ease-out forwards;
        }

        @keyframes premiumPressGlow {
          0% {
            opacity: 0;
            transform: scale(0.65);
            filter: blur(2px);
          }
          35% {
            opacity: 1;
            transform: scale(1.05);
            filter: blur(6px);
          }
          100% {
            opacity: 0;
            transform: scale(1.38);
            filter: blur(14px);
          }
        }

        .control-panel button:focus-visible,
        .kp-rate:focus-visible {
          outline: 2px solid rgba(255, 180, 190, 0.55);
          outline-offset: 2px;
        }

        .square-btn,
        .image-add,
        .lock-button {
          box-shadow:
            0 16px 34px rgba(0,0,0,0.48),
            0 0 18px rgba(255,80,110,0.10),
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -14px 28px rgba(0,0,0,0.44);
        }

        .square-btn:hover,
        .image-add:hover,
        .lock-button:hover {
          box-shadow:
            0 22px 46px rgba(0,0,0,0.58),
            0 0 26px var(--press-glow, rgba(255,80,110,0.22)),
            inset 0 1px 0 rgba(255,255,255,0.20),
            inset 0 -16px 30px rgba(0,0,0,0.48);
        }

        /* ── Düzenleme / Kilitli buton ── */
        .lock-button {
          --press-glow: rgba(255, 80, 120, 0.42);
          width: 100%;
          height: calc(90px * var(--panel-scale));
          border-radius: calc(18px * var(--panel-scale));
          border: 1px solid rgba(255, 100, 120, 0.4);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 100, 120, 0.15), transparent),
            linear-gradient(180deg, #4a0814, #1b0307);
          color: var(--accent);
          font-size: calc(22px * var(--panel-scale));
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: calc(6px * var(--panel-scale));
        }

        /* lock-button[data-readonly="false"] aktif border/box-shadow:
           generic .control-panel button.is-active glass treatment yönetir
           (button-edit yeşil accent var'ı üzerinden). Burada özel rose
           override YOK — cam efekti tüm butonlar için tek noktadan gelir. */

        .lock-button:active {
          box-shadow:
            0 10px 20px rgba(0,0,0,0.42),
            inset 0 6px 18px rgba(0, 0, 0, 0.35),
            inset 0 -8px 18px rgba(0, 0, 0, 0.40);
        }

        /* Düzenleme aktifken (kilitli=false) sakin sürekli iç ışık */
        .lock-button .button-sweep {
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(255,255,255,0.05) 35%,
            rgba(255,225,232,0.18) 50%,
            rgba(255,255,255,0.05) 65%,
            transparent 100%
          );
        }

        /* ── Resim Ekle (aksiyon, blue) ── */
        .image-add {
          --press-glow: rgba(80, 150, 255, 0.45);
          width: 100%;
          height: calc(60px * var(--panel-scale));
          margin-top: calc(12px * var(--panel-scale));
          border-radius: calc(16px * var(--panel-scale));
          border: 1px solid var(--blue-border);
          background:
            radial-gradient(circle at top, rgba(120, 160, 255, 0.30), transparent),
            linear-gradient(180deg, var(--blue-1), var(--blue-2));
          color: white;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: calc(13px * var(--panel-scale));
          display: flex;
          align-items: center;
          justify-content: center;
          gap: calc(10px * var(--panel-scale));
        }

        /* ── Resim Ekle hover/active — mavi aksiyon glow ── */
        .image-add:hover {
          border-color: rgba(122, 171, 255, 0.92);
        }

        .image-add:active {
          box-shadow:
            0 12px 24px rgba(19, 34, 90, 0.32),
            inset 0 6px 18px rgba(0, 0, 0, 0.28),
            inset 0 -8px 18px rgba(0, 0, 0, 0.36);
        }

        .image-add .button-sweep {
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(227, 240, 255, 0.04) 35%,
            rgba(244, 249, 255, 0.22) 50%,
            rgba(171, 207, 255, 0.08) 65%,
            transparent 100%
          );
        }

        /* ── Grid (Satır Ayarları + Genel Finans) ── */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: calc(12px * var(--panel-scale));
        }

        /* ── Kare buton ── */
        .square-btn {
          --press-glow: rgba(255, 95, 125, 0.36);
          aspect-ratio: 1;
          border-radius: calc(16px * var(--panel-scale));
          border: 1px solid var(--card-border);
          background:
            radial-gradient(circle at top, rgba(255, 110, 130, 0.12), transparent),
            linear-gradient(180deg, var(--card-bg-1), var(--card-bg-2));
          color: var(--text-main);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: calc(6px * var(--panel-scale));
          padding: calc(8px * var(--panel-scale)) calc(6px * var(--panel-scale));
        }

        @keyframes premiumLightSweep {
          0% {
            left: -80%;
            opacity: 0;
          }
          18% {
            opacity: 1;
          }
          100% {
            left: 130%;
            opacity: 0;
          }
        }

        /* Square buton hover — premium ışık yayılması */
        .square-btn:hover {
          border-color: rgba(255, 150, 165, 0.52);
        }

        /* .square-btn.is-active rose bg/border/animation override KALDIRILDI:
           cam + neon karakter generic .control-panel button.is-active'ten gelir
           (--button-accent + --button-glow per-buton var ile renklenir).
           premiumToggleGlow keyframe artık kullanilmiyor. */

        .square-btn.finance,
        .square-btn.kdv,
        .square-btn.discount {
          --press-glow: rgba(255, 185, 90, 0.32);
        }

        .square-btn,
        .image-add,
        .lock-button {
          box-shadow:
            0 16px 34px rgba(0,0,0,0.48),
            0 0 18px rgba(255,80,110,0.10),
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -14px 28px rgba(0,0,0,0.44);
        }

        .square-btn:hover,
        .image-add:hover,
        .lock-button:hover {
          box-shadow:
            0 22px 46px rgba(0,0,0,0.58),
            0 0 26px var(--press-glow, rgba(255,80,110,0.22)),
            inset 0 1px 0 rgba(255,255,255,0.20),
            inset 0 -16px 30px rgba(0,0,0,0.48);
        }

        /* lock-button[data-readonly="false"] ve .square-btn.is-active rose
           box-shadow override'ları kaldirildi. Generic .control-panel
           button.is-active glass + neon treatment tek doğru. */

        .square-btn::after,
        .image-add::after,
        .lock-button::after {
          content: "";
          position: absolute;
          inset: -18px;
          top: auto;
          left: auto;
          width: auto;
          height: auto;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          z-index: 0;
          background: radial-gradient(circle, var(--press-glow, rgba(255, 90, 120, 0.35)) 0%, transparent 62%);
          transform: scale(0.72);
        }

        .square-btn:hover::after,
        .image-add:hover::after,
        .lock-button:hover::after {
          animation: none !important;
          opacity: 0;
        }

        .control-panel button:active::after {
          animation: premiumPressGlow 520ms ease-out forwards !important;
        }

        .lock-button .button-sweep {
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(255,255,255,0.05) 35%,
            rgba(255,225,232,0.18) 50%,
            rgba(255,255,255,0.05) 65%,
            transparent 100%
          );
        }

        .square-btn__label {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: calc(10px * var(--panel-scale));
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: 0.04em;
          white-space: normal;
          word-break: normal;
        }

        /* .square-btn__value ve .square-btn.kdv .square-btn__label CSS
           kuralları kaldırıldı: kare butonlarda artık hiçbir text node
           render edilmiyor (yalnızca premium SVG ikon). */

        /* ── İskonto Oranı input ── */
        .panel-rate {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: calc(10px * var(--panel-scale));
          margin-top: calc(12px * var(--panel-scale));
          padding: calc(10px * var(--panel-scale)) calc(12px * var(--panel-scale));
          border-radius: calc(14px * var(--panel-scale));
          border: 1px solid rgba(255, 112, 132, 0.24);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 113, 140, 0.10), transparent 62%),
            linear-gradient(180deg, rgba(59, 12, 22, 0.88), rgba(25, 5, 11, 0.92));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -10px 18px rgba(0, 0, 0, 0.18);
        }

        .panel-rate__label {
          flex: 1;
          min-width: 0;
          font-size: calc(10px * var(--panel-scale));
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          line-height: 1.15;
          color: var(--text-soft);
        }

        .panel-rate__input-wrap {
          display: flex;
          align-items: center;
          gap: calc(5px * var(--panel-scale));
          flex-shrink: 0;
        }

        .panel-rate__input {
          width: calc(48px * var(--panel-scale));
          height: calc(26px * var(--panel-scale));
          border-radius: calc(8px * var(--panel-scale));
          background: rgba(14, 2, 6, 0.76);
          border: 1px solid rgba(255, 143, 155, 0.38);
          color: var(--text-main);
          font-size: calc(12px * var(--panel-scale));
          font-weight: 800;
          text-align: center;
          padding: 0 calc(6px * var(--panel-scale));
          font-variant-numeric: tabular-nums;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .panel-rate__suffix {
          font-size: calc(11px * var(--panel-scale));
          font-weight: 800;
          color: var(--text-main);
        }

        .kp-rate::-webkit-inner-spin-button,
        .kp-rate::-webkit-outer-spin-button {
          opacity: 0;
        }

        .kp-rate:focus {
          border-color: rgba(255, 180, 190, 0.55) !important;
          outline: none;
        }

        /* ── Erişilebilirlik: hareket azaltma ── */
        @media (prefers-reduced-motion: reduce) {
          .control-panel button,
          .square-btn.is-active,
          .lock-button[data-readonly="false"] {
            animation: none !important;
            transition: none !important;
          }
          .control-panel button .button-sweep,
          .square-btn::after,
          .image-add::after,
          .lock-button::after {
            animation: none !important;
            display: none;
          }
          .control-panel button:hover,
          .control-panel button:active {
            transform: none !important;
          }
        }
      `}</style>

      <div className="control-panel" data-editing={!readOnly}>
        <section className="panel-section">
          <SecLabel text="Düzenleme" />

          <button
            type="button"
            className={`lock-button button-edit${!readOnly ? ' is-active' : ''}`}
            data-readonly={readOnly}
            onClick={() => onReadOnlyDegistir(!readOnly)}
            title={readOnly ? 'Kilitli — düzenlemeyi aç' : 'Düzenleme açık — kilitle'}
            aria-label={readOnly ? 'Kilitli' : 'Düzenleme'}
            aria-pressed={!readOnly}
          >
            <span className="button-sweep" aria-hidden="true" />
            <EditPremiumIcon readOnly={readOnly} />
          </button>

          <button
            type="button"
            className="image-add button-image"
            onClick={onResimSec}
            title="Resim Ekle"
            aria-label="Resim Ekle"
          >
            <span className="button-sweep" aria-hidden="true" />
            <ImageAddPremiumIcon />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
        </section>

        <section className="panel-section">
          <SecLabel text="Satır Ayarları" />
          <div className="grid">
            <SquareToggle
              labelLines={[]}
              ariaLabel="Satır Bazlı İskonto"
              extraClass="button-row-discount"
              icon={<RowDiscountPremiumIcon />}
              on={satirBazliIskonto}
              onClick={() => onSatirBazliIskontoDegistir(!satirBazliIskonto)}
            />
            <SquareToggle
              labelLines={[]}
              ariaLabel="Satır Bazlı Para Birimi"
              extraClass="button-row-currency"
              icon={<RowCurrencyPremiumIcon />}
              on={satirBazliParaBirimi}
              onClick={() => onSatirBazliParaBirimiDegistir(!satirBazliParaBirimi)}
            />
          </div>
        </section>

        <section className="panel-section">
          <SecLabel text="Genel Finans" />
          <div className="grid">
            <SquareToggle
              labelLines={[]}
              ariaLabel={kdvOn ? `KDV açık — %${kdvOrani}` : 'KDV kapalı'}
              extraClass="finance kdv button-tax"
              icon={<KdvPremiumIcon />}
              on={kdvOn}
              onClick={toggleKdv}
            />
            <SquareToggle
              labelLines={[]}
              ariaLabel={iskOn ? `İskonto açık — %${iskontoOrani}` : 'İskonto kapalı'}
              extraClass="finance discount button-discount"
              icon={<DiscountPremiumIcon />}
              on={iskOn}
              onClick={toggleIsk}
            />
          </div>

          {iskOn && (
            <div className="panel-rate">
              <span className="panel-rate__label">İskonto Oranı</span>
              <div className="panel-rate__input-wrap">
                <input
                  type="number"
                  className="kp-rate panel-rate__input"
                  min={0.5}
                  max={100}
                  step={0.5}
                  value={iskontoOrani}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v > 0 && v <= 100) {
                      setLastIsk(v);
                      onIskontoOraniDegistir(v);
                    }
                  }}
                />
                <span className="panel-rate__suffix">%</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SquareToggle({
  labelLines,
  ariaLabel,
  icon,
  on,
  onClick,
  extraClass,
}: {
  labelLines: readonly string[];
  ariaLabel: string;
  icon: ReactNode;
  on: boolean;
  onClick: () => void;
  extraClass?: string;
}) {
  const cls = `square-btn${on ? ' is-active' : ''}${extraClass ? ' ' + extraClass : ''}`;
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      title={ariaLabel}
      aria-label={ariaLabel}
      aria-pressed={on}
    >
      <span className="button-sweep" aria-hidden="true" />
      {icon}
      {labelLines.length > 0 && (
        <span className="square-btn__label">
          {labelLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      )}
    </button>
  );
}
