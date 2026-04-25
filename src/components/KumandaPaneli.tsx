/**
 * KumandaPaneli — Sade, kompakt, scroll-suz, hiyerarsik kontrol paneli.
 *
 * SADECE 2 GRUP:
 *   A) DÜZENLEME  → Düzenleme (dominant), Resim Ekle
 *   B) FİNANSAL   → KDV, İskonto, Satır Bazlı İskonto, Satır Bazlı Para Birimi
 *
 * YASAK:
 *   - PDF / E-posta / Kaydet (BelgeToolbar'da kalır)
 *   - Durum değiştirici (BelgeToolbar tag göstergesi)
 *   - Scroll
 *   - "Açık/Kapalı" yazıları
 *   - Kısaltılmış buton metni
 */
import { useRef, useState } from 'react';
import { LockOutlined, UnlockOutlined, PictureOutlined } from '@ant-design/icons';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;

// ── Design tokens — tek kaynak ───────────────────────────────────────────────
const K = {
  WIDTH:     186,

  EDIT_H:    62,            // Düzenleme — en baskın
  COMPACT_H: 34,            // Resim Ekle
  SQUARE_H:  62,            // Finans kare
  RATE_H:    34,
  BTN_R:     9,
  EDIT_R:    12,
  ICON:      14,

  PANEL_PAD: 12,
  GROUP_GAP: 12,            // gruplar arası
  ITEM_GAP:  6,             // grup içi öğeler arası

  // Edge / A4 nefes
  EDGE_MIN:  20,            // ekran kenarı min margin

  // Shell
  shellImg:   'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.07), transparent 30%), linear-gradient(150deg, #1A0A0F 0%, #2A0E14 50%, #38121A 100%)',
  shellSolid: '#1A0A0F',
  shellBdr:   '#4A1A22',

  txtLabel:   'rgba(255, 247, 242, 0.50)',

  // Düzenleme — neon yeşil (özel)
  neon:       '#39FFB6',
  neonSoft:   'rgba(57, 255, 182, 0.55)',
  neonGlow:   'rgba(57, 255, 182, 0.30)',
  neonAura1:  'rgba(57, 255, 182, 0.24)',
  neonAura2:  'rgba(57, 255, 182, 0.12)',
  neonRing:   'rgba(57, 255, 182, 0.18)',
  lkEdBg:     'rgba(57, 255, 182, 0.18)',
  lkEdBdr:    'rgba(57, 255, 182, 0.50)',
  lkLkBg:     '#22090E',
  lkLkBdr:    '#391218',
  lkLkIco:    '#CFA8A0',
  lkLkTxt:    '#F4C9B8',
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
function SecLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: K.txtLabel,
      marginBottom: 6, paddingLeft: 1, userSelect: 'none',
    }}>
      {text}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface KumandaPaneliProps {
  readOnly:                       boolean;
  onReadOnlyDegistir:             (v: boolean) => void;
  kdvOrani:                       number;
  onKdvOraniDegistir:             (v: number) => void;
  iskontoOrani:                   number;
  onIskontoOraniDegistir:         (v: number) => void;
  satirBazliParaBirimi:           boolean;
  onSatirBazliParaBirimiDegistir: (v: boolean) => void;
  satirBazliIskonto:              boolean;
  onSatirBazliIskontoDegistir:    (v: boolean) => void;
  sagPanelOpen:                   boolean;
  onResimEkle:                    (dataUrl: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function KumandaPaneli({
  readOnly, onReadOnlyDegistir,
  kdvOrani, onKdvOraniDegistir,
  iskontoOrani, onIskontoOraniDegistir,
  satirBazliParaBirimi, onSatirBazliParaBirimiDegistir,
  satirBazliIskonto, onSatirBazliIskontoDegistir,
  sagPanelOpen, onResimEkle,
}: KumandaPaneliProps) {
  const [lastKdv, setLastKdv] = useState(() => kdvOrani     > 0 ? kdvOrani     : 20);
  const [lastIsk, setLastIsk] = useState(() => iskontoOrani > 0 ? iskontoOrani : 10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const kdvOn = kdvOrani > 0;
  const iskOn = iskontoOrani > 0;

  const toggleKdv = () => {
    if (kdvOn) { setLastKdv(kdvOrani); onKdvOraniDegistir(0); }
    else onKdvOraniDegistir(lastKdv);
  };
  const toggleIsk = () => {
    if (iskOn) { setLastIsk(iskontoOrani); onIskontoOraniDegistir(0); }
    else onIskontoOraniDegistir(lastIsk);
  };

  const onResimSec = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div
      className="no-print"
      style={{
        position: 'fixed',
        top: 96,
        right: sagPanelOpen
          ? `max(${K.EDGE_MIN}px, calc(50% - 405px))`
          : `max(${K.EDGE_MIN}px, calc(50% - 585px))`,
        width: K.WIDTH,
        zIndex: 80,
        // Scroll YOK — height auto, içerik tek ekrana sığar
        pointerEvents: 'auto',
      }}
    >
      <div style={{
        width: '100%',
        borderRadius: 14,
        backgroundImage: K.shellImg,
        backgroundColor: K.shellSolid,
        border: `1px solid ${K.shellBdr}`,
        boxShadow: [
          '0 8px 28px rgba(0,0,0,0.55)',
          '0 1px 4px rgba(0,0,0,0.4)',
          'inset 0 1px 0 rgba(255,255,255,0.05)',
          'inset 0 -1px 0 rgba(0,0,0,0.45)',
        ].join(', '),
        // KESİNLİKLE scroll yok
        overflow: 'hidden',
      }}>
      <style>{`
        .kp-edit, .kp-btn, .kp-square {
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease,
                      box-shadow 0.18s ease, transform 0.10s ease, filter 0.18s ease,
                      text-shadow 0.18s ease;
          position: relative;
          font-family: inherit;
        }

        /* PASİF baz */
        .kp-btn, .kp-square {
          background: rgba(255, 247, 242, 0.045);
          border: 1px solid rgba(255, 247, 242, 0.10);
          color: #FFF7F2;
        }

        /* AKTİF baz — dolu zemin + iç-shadow + variant rengi */
        .kp-btn[data-on="true"],
        .kp-square[data-on="true"] {
          background: rgba(255, 247, 242, 0.14);
          border-color: rgba(255, 247, 242, 0.36);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            inset 0 -2px 5px rgba(0,0,0,0.22),
            0 4px 14px rgba(0,0,0,0.30);
        }

        /* Variant — view (KDV/İskonto) — amber/altın */
        .kp-btn[data-on="true"][data-variant="view"],
        .kp-square[data-on="true"][data-variant="view"] {
          background: rgba(255, 215, 150, 0.18);
          border-color: rgba(255, 215, 150, 0.46);
          color: #FFF0D2;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -1px 6px rgba(0,0,0,0.18),
            0 0 16px rgba(255,215,150,0.22),
            0 0 24px rgba(255,215,150,0.10);
        }
        /* Variant — row (Satır*) — violet */
        .kp-btn[data-on="true"][data-variant="row"],
        .kp-square[data-on="true"][data-variant="row"] {
          background: rgba(180, 135, 255, 0.18);
          border-color: rgba(180, 135, 255, 0.46);
          color: #EFE2FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -1px 6px rgba(0,0,0,0.18),
            0 0 16px rgba(180,135,255,0.24),
            0 0 24px rgba(180,135,255,0.10);
        }
        /* Variant — settings (Resim Ekle hover state, pasif) — violet ince */
        .kp-btn[data-variant="settings"]:hover {
          background: rgba(180, 135, 255, 0.10);
          border-color: rgba(180, 135, 255, 0.30);
          color: #EFE2FF;
        }

        /* Hover */
        .kp-edit:hover  { filter: brightness(1.10); }
        .kp-edit:active { transform: translateY(1px); filter: brightness(0.92); }
        .kp-btn:hover, .kp-square:hover { filter: brightness(1.10); }
        .kp-btn:active, .kp-square:active { transform: translateY(1px); filter: brightness(0.95); }

        /* Değer etiketi (örn. "%20") — bilgi, durum DEĞİL */
        .kp-val {
          opacity: 0.92;
          font-size: 11px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          line-height: 1;
        }

        /* Rate input */
        .kp-rate::-webkit-inner-spin-button,
        .kp-rate::-webkit-outer-spin-button { opacity: 0; }
        .kp-rate:focus { border-color: rgba(255,247,242,0.40) !important; outline: none; }
      `}</style>

      <div style={{ padding: K.PANEL_PAD }}>

        {/* ══════════════════════════════════════════════════════════════════
           A) DÜZENLEME  →  Düzenleme + Resim Ekle
           ══════════════════════════════════════════════════════════════════ */}
        <SecLabel text="Düzenleme" />

        {/* Düzenleme — EN BASKIN buton */}
        <button
          type="button"
          className="kp-edit"
          onClick={() => onReadOnlyDegistir(!readOnly)}
          style={{
            width:          '100%',
            height:         K.EDIT_H,
            borderRadius:   K.EDIT_R,
            background:     readOnly ? K.lkLkBg : K.lkEdBg,
            border:         `1.5px solid ${readOnly ? K.lkLkBdr : K.lkEdBdr}`,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            5,
            cursor:         'pointer',
            outline:        'none',
            padding:        0,
            marginBottom:   K.ITEM_GAP,
            boxShadow:      readOnly
              ? 'inset 0 2px 6px rgba(0,0,0,0.45)'
              : `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px ${K.neonRing}, 0 0 22px ${K.neonAura1}, 0 0 36px ${K.neonAura2}`,
          }}
        >
          <span style={{
            fontSize: 22, lineHeight: 1, display: 'inline-flex',
            color: readOnly ? K.lkLkIco : K.neon,
            textShadow: readOnly
              ? undefined
              : `0 0 6px ${K.neonSoft}, 0 0 14px ${K.neonGlow}`,
          }}>
            {readOnly ? <LockOutlined /> : <UnlockOutlined />}
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em',
            textTransform: 'uppercase', lineHeight: 1,
            color: readOnly ? K.lkLkTxt : K.neon,
            textShadow: readOnly
              ? undefined
              : `0 0 5px ${K.neonSoft}, 0 0 12px ${K.neonGlow}`,
          }}>
            {readOnly ? 'Kilitli' : 'Düzenleme'}
          </span>
        </button>

        {/* Resim Ekle — kompakt */}
        <button
          type="button"
          className="kp-btn"
          data-variant="settings"
          onClick={onResimSec}
          style={{
            width: '100%', height: K.COMPACT_H, borderRadius: K.BTN_R,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '0 10px', cursor: 'pointer', outline: 'none',
          }}
        >
          <PictureOutlined style={{ fontSize: K.ICON }} />
          <span style={{ fontSize: '11px', fontWeight: 600, lineHeight: 1 }}>Resim Ekle</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        {/* Group gap */}
        <div style={{ height: K.GROUP_GAP }} />

        {/* ══════════════════════════════════════════════════════════════════
           B) FİNANSAL  →  KDV / İskonto / Satır Bazlı İskonto / Satır Bazlı PB
           ══════════════════════════════════════════════════════════════════ */}
        <SecLabel text="Finansal" />

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: K.ITEM_GAP,
        }}>
          <SquareToggle
            label="KDV"
            value={kdvOn ? `%${kdvOrani}` : undefined}
            on={kdvOn}
            variant="view"
            onClick={toggleKdv}
          />
          <SquareToggle
            label="İskonto"
            value={iskOn ? `%${iskontoOrani}` : undefined}
            on={iskOn}
            variant="view"
            onClick={toggleIsk}
          />
          <SquareToggle
            label={'Satır Bazlı\nİskonto'}
            on={satirBazliIskonto}
            variant="row"
            onClick={() => onSatirBazliIskontoDegistir(!satirBazliIskonto)}
          />
          <SquareToggle
            label={'Satır Bazlı\nPara Birimi'}
            on={satirBazliParaBirimi}
            variant="row"
            onClick={() => onSatirBazliParaBirimiDegistir(!satirBazliParaBirimi)}
          />
        </div>

        {/* İskonto rate input — yalnız İskonto aktifken */}
        {iskOn && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            marginTop: K.ITEM_GAP,
            padding: '0 10px',
            height: K.RATE_H,
            background: 'rgba(255, 215, 150, 0.07)',
            borderRadius: K.BTN_R,
            border: '1px solid rgba(255, 215, 150, 0.28)',
          }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,240,210,0.78)', flex: 1, fontWeight: 600 }}>
              İskonto Oranı
            </span>
            <input
              type="number" className="kp-rate"
              min={0.5} max={100} step={0.5}
              value={iskontoOrani}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0 && v <= 100) { setLastIsk(v); onIskontoOraniDegistir(v); }
              }}
              style={{
                width: 50, height: 22, borderRadius: 5,
                background: 'rgba(0,0,0,0.30)',
                border: '1px solid rgba(255, 215, 150, 0.32)',
                color: '#FFF0D2', fontSize: '11px', fontWeight: 700,
                textAlign: 'center', padding: '0 4px',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            <span style={{ fontSize: '10px', color: '#FFF0D2', fontWeight: 600 }}>%</span>
          </div>
        )}

      </div>
      </div>
    </div>
  );
}

// ── Kare toggle (Finans grid) ──────────────────────────────────────────────────
function SquareToggle({
  label, value, on, variant, onClick,
}: {
  label: string;
  value?: string;
  on: boolean;
  variant: 'view' | 'row';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="kp-square"
      data-on={on}
      data-variant={variant}
      onClick={onClick}
      style={{
        height: K.SQUARE_H,
        borderRadius: K.BTN_R,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: value ? 4 : 0,
        padding: '0 4px',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <span style={{
        fontSize: '10.5px',
        fontWeight: on ? 700 : 600,
        lineHeight: 1.15,
        whiteSpace: 'pre-line',
        textAlign: 'center',
        letterSpacing: '0.01em',
      }}>
        {label}
      </span>
      {value && (
        <span className="kp-val">{value}</span>
      )}
    </button>
  );
}
