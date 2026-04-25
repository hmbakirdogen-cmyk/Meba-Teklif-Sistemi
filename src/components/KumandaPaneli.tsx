import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  CalculatorOutlined,
  LockOutlined,
  PercentageOutlined,
  PictureOutlined,
  SwapOutlined,
  TagsOutlined,
  UnlockOutlined,
} from '@ant-design/icons';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;

const K = {
  WIDTH: 240,
  TOP: 97,
  BOTTOM_GAP: 24,
  EDGE_MIN: 24,
  RIGHT_CLOSED_OFFSET: 669, // 397 (A4 half) + 240 (panel) + 32 (gap)
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
          --panel-bg-1: #1a0308;
          --panel-bg-2: #2b0610;
          --panel-bg-3: #090103;

          --panel-glow: rgba(255, 80, 110, 0.18);
          --panel-border: rgba(255, 120, 140, 0.28);

          --panel-shadow:
            0 30px 80px rgba(5, 0, 2, 0.65),
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.6);

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
          padding: 20px;
          border-radius: 28px;
          color: var(--text-main);
          background:
            radial-gradient(circle at top left, var(--panel-glow), transparent 40%),
            linear-gradient(160deg,
              var(--panel-bg-2) 0%,
              var(--panel-bg-1) 45%,
              var(--panel-bg-3) 100%
            );
          border: 1px solid var(--panel-border);
          box-shadow: var(--panel-shadow);
          overflow: hidden;
        }

        .panel-section {
          margin: 0;
        }

        .panel-section + .panel-section {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 111, 132, 0.18);
        }

        .panel-title {
          margin: 0 0 14px;
          font-size: 11px;
          letter-spacing: 0.25em;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-soft);
          user-select: none;
        }

        .control-panel button {
          cursor: pointer;
          font-family: inherit;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            filter 180ms ease;
          will-change: transform, box-shadow;
          position: relative;
        }

        /* Hover — hafif yukarı kalkma + parlama */
        .control-panel button:hover {
          transform: translateY(-1px);
          filter: brightness(1.06);
        }

        /* Pressed — fiziksel buton hissi: hafif içeri bas + scale */
        .control-panel button:active {
          transform: translateY(1px) scale(0.985);
          filter: brightness(0.96);
        }

        .control-panel button:focus-visible,
        .kp-rate:focus-visible {
          outline: 2px solid rgba(255, 180, 190, 0.55);
          outline-offset: 2px;
        }

        /* ── Düzenleme / Kilitli buton ── */
        .lock-button {
          width: 100%;
          height: 90px;
          border-radius: 18px;
          border: 1px solid rgba(255, 100, 120, 0.4);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 100, 120, 0.15), transparent),
            linear-gradient(180deg, #4a0814, #1b0307);
          color: var(--accent);
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: inset 0 0 25px rgba(255, 60, 90, 0.12);
        }

        .lock-button[data-readonly="false"] {
          border-color: rgba(255, 143, 155, 0.64);
          box-shadow:
            0 0 28px rgba(255, 88, 116, 0.18),
            inset 0 0 25px rgba(255, 60, 90, 0.12),
            inset 0 1px 0 rgba(255,255,255,0.10);
        }

        /* ── Düzenleme/Kilitli premium hover/active — ana buton, hissi güçlü ── */
        .lock-button:hover {
          box-shadow:
            0 0 30px rgba(255, 80, 110, 0.22),
            0 12px 32px rgba(12, 0, 4, 0.36),
            inset 0 0 28px rgba(255, 60, 90, 0.16);
        }

        .lock-button:active {
          box-shadow:
            inset 0 6px 18px rgba(0, 0, 0, 0.35),
            inset 0 0 24px rgba(255, 60, 90, 0.18);
        }

        /* Düzenleme aktifken (kilitli=false) sakin sürekli iç ışık */
        .lock-button[data-readonly="false"] {
          animation: lockEditGlow 3.4s ease-in-out infinite;
        }

        @keyframes lockEditGlow {
          0%, 100% {
            box-shadow:
              0 0 24px rgba(255, 88, 116, 0.18),
              inset 0 0 25px rgba(255, 60, 90, 0.12),
              inset 0 1px 0 rgba(255, 255, 255, 0.10);
          }
          50% {
            box-shadow:
              0 0 32px rgba(255, 88, 116, 0.26),
              inset 0 0 30px rgba(255, 60, 90, 0.18),
              inset 0 1px 0 rgba(255, 255, 255, 0.12);
          }
        }

        .lock-button__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          line-height: 1;
          text-shadow: 0 0 16px rgba(255, 111, 132, 0.20);
        }

        .lock-button__label {
          font-size: 16px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.10em;
        }

        /* ── Resim Ekle (aksiyon, blue) ── */
        .image-add {
          width: 100%;
          height: 60px;
          margin-top: 12px;
          border-radius: 16px;
          border: 1px solid var(--blue-border);
          background:
            radial-gradient(circle at top, rgba(120, 160, 255, 0.30), transparent),
            linear-gradient(180deg, var(--blue-1), var(--blue-2));
          color: white;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow:
            0 0 25px rgba(63, 124, 255, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.20);
        }

        .image-add__icon {
          font-size: 16px;
          line-height: 1;
        }

        /* ── Resim Ekle hover/active — mavi aksiyon glow ── */
        .image-add:hover {
          box-shadow:
            0 0 34px rgba(63, 124, 255, 0.48),
            0 10px 28px rgba(20, 40, 120, 0.30),
            inset 0 1px 0 rgba(255, 255, 255, 0.26);
        }

        .image-add:active {
          box-shadow:
            0 0 18px rgba(63, 124, 255, 0.34),
            inset 0 4px 14px rgba(0, 0, 0, 0.28);
        }

        /* ── Grid (Satır Ayarları + Genel Finans) ── */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* ── Kare buton ── */
        .square-btn {
          aspect-ratio: 1;
          border-radius: 16px;
          border: 1px solid var(--card-border);
          background:
            radial-gradient(circle at top, rgba(255, 110, 130, 0.12), transparent),
            linear-gradient(180deg, var(--card-bg-1), var(--card-bg-2));
          color: var(--text-main);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 6px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -15px 25px rgba(0, 0, 0, 0.20);
        }

        /* Square buton hover — premium ışık yayılması */
        .square-btn:hover {
          border-color: rgba(255, 150, 165, 0.52);
          box-shadow:
            0 10px 26px rgba(12, 0, 4, 0.38),
            0 0 18px rgba(255, 90, 115, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -15px 25px rgba(0, 0, 0, 0.22);
        }

        .square-btn.active {
          background:
            radial-gradient(circle at top, rgba(255, 130, 150, 0.25), transparent),
            linear-gradient(180deg, var(--active-bg-1), var(--active-bg-2));
          border: 1px solid var(--active-border);
          box-shadow:
            0 0 25px rgba(255, 80, 110, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.10);
          /* Sakin sürekli glow — premium cihaz ışığı, neon değil */
          animation: premiumToggleGlow 2.8s ease-in-out infinite;
        }

        @keyframes premiumToggleGlow {
          0%, 100% {
            box-shadow:
              0 0 18px rgba(255, 80, 110, 0.18),
              inset 0 1px 0 rgba(255, 255, 255, 0.10);
          }
          50% {
            box-shadow:
              0 0 28px rgba(255, 80, 110, 0.30),
              inset 0 1px 0 rgba(255, 255, 255, 0.14);
          }
        }

        .square-btn__icon {
          font-size: 18px;
          line-height: 1;
          color: var(--accent);
        }

        .square-btn__label {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.10;
          letter-spacing: 0.06em;
          white-space: normal;
          word-break: normal;
        }

        .square-btn__value {
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.02em;
          color: var(--text-main);
          font-variant-numeric: tabular-nums;
        }

        /* KDV özel — daha büyük tipografi */
        .square-btn.kdv .square-btn__label {
          font-size: 20px;
          letter-spacing: 0.12em;
          line-height: 1;
        }

        /* ── İskonto Oranı input ── */
        .panel-rate {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 14px;
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
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          line-height: 1.15;
          color: var(--text-soft);
        }

        .panel-rate__input-wrap {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }

        .panel-rate__input {
          width: 48px;
          height: 26px;
          border-radius: 8px;
          background: rgba(14, 2, 6, 0.76);
          border: 1px solid rgba(255, 143, 155, 0.38);
          color: var(--text-main);
          font-size: 12px;
          font-weight: 800;
          text-align: center;
          padding: 0 6px;
          font-variant-numeric: tabular-nums;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .panel-rate__suffix {
          font-size: 11px;
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
          .square-btn.active,
          .lock-button[data-readonly="false"] {
            animation: none !important;
            transition: none !important;
          }
          .control-panel button:hover,
          .control-panel button:active {
            transform: none !important;
          }
        }
      `}</style>

      <div className="control-panel">
        <section className="panel-section">
          <SecLabel text="Düzenleme" />

          <button
            type="button"
            className="lock-button"
            data-readonly={readOnly}
            onClick={() => onReadOnlyDegistir(!readOnly)}
          >
            <span className="lock-button__icon">
              {readOnly ? <LockOutlined /> : <UnlockOutlined />}
            </span>
            <span className="lock-button__label">
              {readOnly ? 'KİLİTLİ' : 'DÜZENLEME'}
            </span>
          </button>

          <button
            type="button"
            className="image-add"
            onClick={onResimSec}
          >
            <PictureOutlined className="image-add__icon" />
            <span>RESİM EKLE</span>
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
              labelLines={['SATIR BAZLI', 'İSKONTO']}
              icon={<PercentageOutlined />}
              on={satirBazliIskonto}
              onClick={() => onSatirBazliIskontoDegistir(!satirBazliIskonto)}
            />
            <SquareToggle
              labelLines={['SATIR BAZLI', 'PARA BİRİMİ']}
              icon={<SwapOutlined />}
              on={satirBazliParaBirimi}
              onClick={() => onSatirBazliParaBirimiDegistir(!satirBazliParaBirimi)}
            />
          </div>
        </section>

        <section className="panel-section">
          <SecLabel text="Genel Finans" />
          <div className="grid">
            <SquareToggle
              labelLines={['KDV']}
              extraClass="kdv"
              icon={<CalculatorOutlined />}
              value={kdvOn ? `%${kdvOrani}` : undefined}
              on={kdvOn}
              onClick={toggleKdv}
            />
            <SquareToggle
              labelLines={['İSKONTO']}
              icon={<TagsOutlined />}
              value={iskOn ? `%${iskontoOrani}` : undefined}
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
  icon,
  value,
  on,
  onClick,
  extraClass,
}: {
  labelLines: readonly string[];
  icon: ReactNode;
  value?: string;
  on: boolean;
  onClick: () => void;
  extraClass?: string;
}) {
  const cls = `square-btn${on ? ' active' : ''}${extraClass ? ' ' + extraClass : ''}`;
  return (
    <button type="button" className={cls} onClick={onClick}>
      <span className="square-btn__icon">{icon}</span>
      <span className="square-btn__label">
        {labelLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
      {value && <span className="square-btn__value">{value}</span>}
    </button>
  );
}
