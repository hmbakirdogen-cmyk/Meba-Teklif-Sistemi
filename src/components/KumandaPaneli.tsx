import { useRef, useState } from 'react';
import { LockOutlined, UnlockOutlined, PictureOutlined } from '@ant-design/icons';
import type { TeklifDurum } from '../types';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;

// ── Design tokens — sade, kompakt, premium ───────────────────────────────────
const K = {
  WIDTH:     156,

  // Ölçüler — tek noktadan, tüm butonlarda tutarlı
  BTN_H:     32,
  BTN_R:     8,
  STATUS_H:  26,
  STATUS_R:  7,
  LOCK_H:    44,
  LOCK_R:    10,
  ICON:      12,

  // ── Shell (metalik bordo — derin + soft ışık oyunu) ──
  shellImg:   'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.08), transparent 28%), linear-gradient(145deg, #19060A 0%, #2A0B10 45%, #3A0F16 100%)',
  shellSolid: '#19060A',
  shellBdr:   '#4A1620',

  // ── Text ──
  txtLabel:   'rgba(255, 247, 242, 0.55)',

  // ── Neon Green — sadece kilit EDIT modu için ──
  neon:       '#39FFB6',
  neonSoft:   'rgba(57, 255, 182, 0.55)',
  neonGlow:   'rgba(57, 255, 182, 0.32)',
  neonAura1:  'rgba(57, 255, 182, 0.22)',
  neonAura2:  'rgba(57, 255, 182, 0.12)',
  neonRing:   'rgba(57, 255, 182, 0.18)',
  lkEdBg:     'rgba(57, 255, 182, 0.18)',
  lkEdBdr:    'rgba(57, 255, 182, 0.50)',

  // ── Lock (LOCKED — kilitli, sakin) ──
  lkLkBg:     '#24090E',
  lkLkBdr:    '#3A1318',
  lkLkIco:    '#CFA8A0',
  lkLkTxt:    '#F4C9B8',
} as const;

const DURUM_LABELS: Record<TeklifDurum, string> = {
  taslak: 'Taslak', hazir: 'Hazır', gonderildi: 'Gönderildi',
  onaylandi: 'Onaylandı', iptal: 'İptal',
};
const DURUM_LIST: TeklifDurum[] = ['taslak', 'hazir', 'gonderildi', 'onaylandi', 'iptal'];

const DURUM_VARIANTS: Record<TeklifDurum, string> = {
  taslak:     'settings',
  hazir:      'save',
  gonderildi: 'pdf',
  onaylandi:  'save',
  iptal:      'cancel',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function SecLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.13em',
      textTransform: 'uppercase', color: K.txtLabel,
      marginBottom: 6, paddingLeft: 2, userSelect: 'none',
    }}>
      {text}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,247,242,0.08)', margin: '9px 0' }} />;
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface KumandaPaneliProps {
  readOnly:                       boolean;
  onReadOnlyDegistir:             (v: boolean) => void;
  durum:                          TeklifDurum;
  onDurumDegistir:                (d: TeklifDurum) => void;
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
  durum, onDurumDegistir,
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
        top:      96,
        bottom:   24,
        right:    sagPanelOpen
          ? 'max(8px, calc(50% - 413px))'
          : 'max(8px, calc(50% - 593px))',
        width:    K.WIDTH,
        display:    'flex',
        alignItems: 'center',
        zIndex:     80,
        pointerEvents: 'none',
      }}
    >
      <div style={{
        width:         '100%',
        maxHeight:     '100%',
        borderRadius:  12,
        backgroundImage: K.shellImg,
        backgroundColor: K.shellSolid,
        border:        `1px solid ${K.shellBdr}`,
        boxShadow: [
          '0 6px 24px rgba(0,0,0,0.55)',
          '0 1px 4px rgba(0,0,0,0.4)',
          'inset 0 1px 0 rgba(255,255,255,0.05)',
          'inset 0 -1px 0 rgba(0,0,0,0.45)',
        ].join(', '),
        overflow:      'hidden',
        pointerEvents: 'auto',
      }}>
      <style>{`
        /* Base passive .kp-btn — şeffaf zemin, ince border */
        .kp-lock, .kp-btn {
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease,
                      box-shadow 0.18s ease, transform 0.10s ease, filter 0.18s ease,
                      text-shadow 0.18s ease;
          position: relative;
        }
        .kp-btn {
          background: rgba(255, 247, 242, 0.045);
          border: 1px solid rgba(255, 247, 242, 0.10);
          color: #FFF7F2;
        }

        /* Aktif baz — dolu zemin + iç-shadow */
        .kp-btn[data-on="true"] {
          background: rgba(255, 247, 242, 0.14);
          border-color: rgba(255, 247, 242, 0.36);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            inset 0 -2px 5px rgba(0,0,0,0.22),
            0 4px 14px rgba(0,0,0,0.30);
        }

        /* Variant aktif — yumuşatılmış glow */
        .kp-btn[data-on="true"][data-variant="view"] {
          background: rgba(255, 215, 150, 0.16);
          border-color: rgba(255, 215, 150, 0.42);
          color: #FFF0D2;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(255,215,150,0.20),
            0 0 22px rgba(255,215,150,0.10);
        }
        .kp-btn[data-on="true"][data-variant="row"] {
          background: rgba(180, 135, 255, 0.16);
          border-color: rgba(180, 135, 255, 0.42);
          color: #EFE2FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(180,135,255,0.22),
            0 0 22px rgba(180,135,255,0.10);
        }
        .kp-btn[data-on="true"][data-variant="save"] {
          background: rgba(65, 210, 120, 0.17);
          border-color: rgba(65, 210, 120, 0.44);
          color: #B9FFD0;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(65,210,120,0.22),
            0 0 22px rgba(65,210,120,0.12);
        }
        .kp-btn[data-on="true"][data-variant="pdf"],
        .kp-btn[data-on="true"][data-variant="print"] {
          background: rgba(118, 172, 255, 0.17);
          border-color: rgba(118, 172, 255, 0.44);
          color: #D8E8FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(118,172,255,0.22),
            0 0 22px rgba(118,172,255,0.12);
        }
        .kp-btn[data-on="true"][data-variant="cancel"],
        .kp-btn[data-on="true"][data-variant="delete"] {
          background: rgba(255, 95, 95, 0.16);
          border-color: rgba(255, 95, 95, 0.42);
          color: #FFD6D6;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(255,95,95,0.22),
            0 0 22px rgba(255,95,95,0.10);
        }
        .kp-btn[data-on="true"][data-variant="settings"] {
          background: rgba(180, 135, 255, 0.16);
          border-color: rgba(180, 135, 255, 0.42);
          color: #EFE2FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(180,135,255,0.22),
            0 0 22px rgba(180,135,255,0.10);
        }

        /* Değer etiketi (örn. "%20") — durum değil, bilgi */
        .kp-btn .kp-val {
          opacity: 0.92;
          font-size: 10px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
        }

        /* Hover — filter only, variant rengini koru */
        .kp-lock:hover  { filter: brightness(1.10); }
        .kp-lock:active { transform: translateY(1px); filter: brightness(0.92); }
        .kp-btn:hover   { filter: brightness(1.10); }
        .kp-btn:active  { transform: translateY(1px); filter: brightness(0.95); }

        /* Rate input */
        .kp-rate::-webkit-inner-spin-button,
        .kp-rate::-webkit-outer-spin-button { opacity: 0; }
        .kp-rate:focus { border-color: rgba(255,247,242,0.36) !important; outline: none; }
      `}</style>

      <div style={{
        padding:       '10px 10px 12px',
        display:       'flex',
        flexDirection: 'column',
      }}>

        {/* ── 1. LOCK / EDIT — Neon yeşil özel ── */}
        <button
          type="button"
          className="kp-lock"
          data-variant="edit"
          onClick={() => onReadOnlyDegistir(!readOnly)}
          style={{
            width:          '100%',
            height:         K.LOCK_H,
            borderRadius:   K.LOCK_R,
            background:     readOnly ? K.lkLkBg : K.lkEdBg,
            border:         `1.5px solid ${readOnly ? K.lkLkBdr : K.lkEdBdr}`,
            display:        'flex',
            flexDirection:  'row',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            7,
            cursor:         'pointer',
            outline:        'none',
            padding:        0,
            marginBottom:   10,
            boxShadow:      readOnly
              ? 'inset 0 2px 5px rgba(0,0,0,0.4)'
              : `inset 0 1px 0 rgba(255,255,255,0.16), 0 0 0 1px ${K.neonRing}, 0 0 14px ${K.neonAura1}, 0 0 22px ${K.neonAura2}`,
          }}
        >
          <span style={{
            fontSize: 16, lineHeight: 1, display: 'inline-flex',
            color: readOnly ? K.lkLkIco : K.neon,
            textShadow: readOnly
              ? undefined
              : `0 0 5px ${K.neonSoft}, 0 0 10px ${K.neonGlow}`,
          }}>
            {readOnly ? <LockOutlined /> : <UnlockOutlined />}
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', lineHeight: 1,
            color: readOnly ? K.lkLkTxt : K.neon,
            textShadow: readOnly
              ? undefined
              : `0 0 4px ${K.neonSoft}, 0 0 9px ${K.neonGlow}`,
          }}>
            {readOnly ? 'Kilitli' : 'Düzenleme'}
          </span>
        </button>

        {/* ── 2. DURUM — 5 chip grid ── */}
        <SecLabel text="Durum" />
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 4, marginBottom: 2,
        }}>
          {DURUM_LIST.map(d => {
            const on = durum === d;
            return (
              <button
                key={d}
                type="button"
                className="kp-btn"
                data-on={on}
                data-variant={DURUM_VARIANTS[d]}
                onClick={() => onDurumDegistir(d)}
                style={{
                  height:       K.STATUS_H,
                  borderRadius: K.STATUS_R,
                  fontSize:     '9.5px',
                  fontWeight:   on ? 700 : 500,
                  cursor:       'pointer',
                  outline:      'none',
                  padding:      '0 4px',
                  whiteSpace:   'nowrap',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  gridColumn:   d === 'iptal' ? '1 / -1' : undefined,
                }}
              >
                {DURUM_LABELS[d]}
              </button>
            );
          })}
        </div>

        <Divider />

        {/* ── 3. BELGE — Resim Ekle ── */}
        <SecLabel text="Belge" />
        <button
          type="button"
          className="kp-btn"
          data-variant="settings"
          onClick={onResimSec}
          style={{
            width: '100%', height: K.BTN_H, borderRadius: K.BTN_R,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 7, padding: '0 10px', cursor: 'pointer', outline: 'none',
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

        <Divider />

        {/* ── 4. FİNANSAL — KDV / İskonto / Satır Ayarları ── */}
        <SecLabel text="Finansal" />

        {/* KDV */}
        <button
          type="button"
          className="kp-btn"
          data-on={kdvOn}
          data-variant="view"
          onClick={toggleKdv}
          style={{
            width: '100%', height: K.BTN_H, borderRadius: K.BTN_R,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 10px', cursor: 'pointer', outline: 'none', marginBottom: 4,
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, lineHeight: 1 }}>KDV</span>
          {kdvOn && <span className="kp-val">%{kdvOrani}</span>}
        </button>

        {/* İskonto */}
        <button
          type="button"
          className="kp-btn"
          data-on={iskOn}
          data-variant="view"
          onClick={toggleIsk}
          style={{
            width: '100%', height: K.BTN_H,
            borderRadius: iskOn ? `${K.BTN_R}px ${K.BTN_R}px 0 0` : K.BTN_R,
            borderBottom: iskOn ? 'none' : undefined,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 10px', cursor: 'pointer', outline: 'none',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, lineHeight: 1 }}>İskonto</span>
          {iskOn && <span className="kp-val">%{iskontoOrani}</span>}
        </button>

        {/* İskonto rate input (attached expansion) */}
        {iskOn && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 10px 8px',
            background: 'rgba(255, 215, 150, 0.05)',
            borderRadius: `0 0 ${K.BTN_R}px ${K.BTN_R}px`,
            border: '1px solid rgba(255, 215, 150, 0.24)',
            borderTop: '1px solid rgba(255, 215, 150, 0.10)',
            marginBottom: 4,
          }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,240,210,0.78)', flex: 1, fontWeight: 600 }}>Oran</span>
            <input
              type="number" className="kp-rate"
              min={0.5} max={100} step={0.5}
              value={iskontoOrani}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0 && v <= 100) { setLastIsk(v); onIskontoOraniDegistir(v); }
              }}
              style={{
                width: 48, height: 22, borderRadius: 5,
                background: 'rgba(0,0,0,0.28)',
                border: '1px solid rgba(255, 215, 150, 0.28)',
                color: '#FFF0D2', fontSize: '11px', fontWeight: 700,
                textAlign: 'center', padding: '0 4px',
                fontVariantNumeric: 'tabular-nums',
                transition: 'border-color 0.14s ease',
              }}
            />
            <span style={{ fontSize: '10px', color: '#FFF0D2', fontWeight: 600 }}>%</span>
          </div>
        )}

        <div style={{ height: 4 }} />

        <TogRow
          label="Satır İskontosu"
          checked={satirBazliIskonto}
          onChange={onSatirBazliIskontoDegistir}
        />
        <div style={{ height: 4 }} />
        <TogRow
          label="Satır Para Birimi"
          checked={satirBazliParaBirimi}
          onChange={onSatirBazliParaBirimiDegistir}
        />

      </div>
      </div>
    </div>
  );
}

// ── Toggle row — variant="row" ─────────────────────────────────────────────────
function TogRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className="kp-btn"
      data-on={checked}
      data-variant="row"
      onClick={() => onChange(!checked)}
      style={{
        width: '100%', height: K.BTN_H, borderRadius: K.BTN_R,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
        padding: '0 10px', cursor: 'pointer', outline: 'none',
      }}
    >
      <span style={{
        fontSize: '11px', fontWeight: checked ? 600 : 500, lineHeight: 1,
      }}>
        {label}
      </span>
    </button>
  );
}
