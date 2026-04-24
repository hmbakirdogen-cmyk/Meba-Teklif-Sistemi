import React, { useState } from 'react';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import type { TeklifDurum } from '../types';

// ── Design tokens — Metalik Tesla Bordo + Variant-based active colors ─────────
const K = {
  WIDTH: 184,

  // ── Shell (metalik bordo — derin + soft ışık oyunu) ──
  shellImg:   'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.08), transparent 28%), linear-gradient(145deg, #19060A 0%, #2A0B10 45%, #3A0F16 100%)',
  shellSolid: '#19060A',
  shellBdr:   '#4A1620',

  // ── Text ──
  txtLabel:   'rgba(255, 247, 242, 0.55)',   // section labels (SecLabel)

  // ── Neon Green — sadece kilit EDIT modu için ──
  neon:       '#39FFB6',
  neonSoft:   'rgba(57, 255, 182, 0.6)',
  neonGlow:   'rgba(57, 255, 182, 0.35)',
  neonAura:   'rgba(57, 255, 182, 0.15)',
  lkEdBg:     '#0E2318',
  lkEdBdr:    '#1F4030',

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

// ── Each durum maps to a variant (semantic color) ──
const DURUM_VARIANTS: Record<TeklifDurum, string> = {
  taslak:     'settings',  // violet muted — draft
  hazir:      'save',      // green — ready
  gonderildi: 'pdf',       // blue — sent
  onaylandi:  'save',      // green — approved
  iptal:      'cancel',    // red — cancelled
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function SecLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '9px', fontWeight: 700, letterSpacing: '0.13em',
      textTransform: 'uppercase', color: K.txtLabel,
      marginBottom: 7, paddingLeft: 2, userSelect: 'none',
    }}>
      {text}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,247,242,0.08)', margin: '13px 0' }} />;
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
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function KumandaPaneli({
  readOnly, onReadOnlyDegistir,
  durum, onDurumDegistir,
  kdvOrani, onKdvOraniDegistir,
  iskontoOrani, onIskontoOraniDegistir,
  satirBazliParaBirimi, onSatirBazliParaBirimiDegistir,
  satirBazliIskonto, onSatirBazliIskontoDegistir,
  sagPanelOpen,
}: KumandaPaneliProps) {
  const [lastKdv, setLastKdv] = useState(() => kdvOrani     > 0 ? kdvOrani     : 20);
  const [lastIsk, setLastIsk] = useState(() => iskontoOrani > 0 ? iskontoOrani : 10);

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
        borderRadius:  14,
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
        /* Base transitions + position for sweep */
        .kp-lock, .kp-btn {
          transition: background 0.22s ease, border-color 0.22s ease, color 0.22s ease,
                      box-shadow 0.22s ease, transform 0.12s ease, filter 0.2s ease,
                      text-shadow 0.22s ease;
          position: relative;
          overflow: hidden;
        }

        /* ── Base passive .kp-btn style (no inline bg/border) ── */
        .kp-btn {
          background: rgba(255, 247, 242, 0.055);
          border: 1px solid rgba(255, 247, 242, 0.12);
          color: #FFF7F2;
        }

        /* ── Active base (fallback — used if no matching variant) ── */
        .kp-btn[data-on="true"] {
          background: rgba(255, 247, 242, 0.13);
          border-color: rgba(255, 247, 242, 0.30);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.10),
            0 4px 14px rgba(0,0,0,0.26),
            0 0 0 1px rgba(255,247,242,0.06);
        }

        /* ── Variant active styles — her buton kendi karakterinde ── */
        /* view (KDV, İskonto — görüntüleme) — amber/gold */
        .kp-btn[data-on="true"][data-variant="view"] {
          background: rgba(255, 215, 150, 0.12);
          border-color: rgba(255, 215, 150, 0.34);
          color: #FFF0D2;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.10),
            0 4px 14px rgba(0,0,0,0.22),
            0 0 14px rgba(255,215,150,0.12),
            0 0 0 1px rgba(255,215,150,0.06);
        }

        /* row (Satır Para Birimi, Satır İskontosu) — violet */
        .kp-btn[data-on="true"][data-variant="row"] {
          background: rgba(180, 135, 255, 0.12);
          border-color: rgba(180, 135, 255, 0.34);
          color: #EFE2FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.10),
            0 4px 14px rgba(0,0,0,0.22),
            0 0 14px rgba(180,135,255,0.12),
            0 0 0 1px rgba(180,135,255,0.06);
        }

        /* save (Hazır, Onaylandı) — green */
        .kp-btn[data-on="true"][data-variant="save"] {
          background: rgba(65, 210, 120, 0.13);
          border-color: rgba(65, 210, 120, 0.36);
          color: #B9FFD0;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.10),
            0 4px 14px rgba(0,0,0,0.22),
            0 0 14px rgba(65,210,120,0.14),
            0 0 0 1px rgba(65,210,120,0.06);
        }

        /* pdf (Gönderildi) — blue */
        .kp-btn[data-on="true"][data-variant="pdf"] {
          background: rgba(118, 172, 255, 0.13);
          border-color: rgba(118, 172, 255, 0.36);
          color: #D8E8FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.10),
            0 4px 14px rgba(0,0,0,0.22),
            0 0 14px rgba(118,172,255,0.14),
            0 0 0 1px rgba(118,172,255,0.06);
        }

        /* cancel (İptal) — red */
        .kp-btn[data-on="true"][data-variant="cancel"] {
          background: rgba(255, 95, 95, 0.12);
          border-color: rgba(255, 95, 95, 0.34);
          color: #FFD6D6;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.10),
            0 4px 14px rgba(0,0,0,0.22),
            0 0 14px rgba(255,95,95,0.12),
            0 0 0 1px rgba(255,95,95,0.06);
        }

        /* settings (Taslak) — violet muted */
        .kp-btn[data-on="true"][data-variant="settings"] {
          background: rgba(180, 135, 255, 0.10);
          border-color: rgba(180, 135, 255, 0.28);
          color: #E5D9FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 4px 14px rgba(0,0,0,0.22),
            0 0 12px rgba(180,135,255,0.10),
            0 0 0 1px rgba(180,135,255,0.05);
        }

        /* Badge (Açık/Kapalı/Aktif) — inherits color from button, varies opacity */
        .kp-btn .kp-badge { opacity: 0.62; }
        .kp-btn[data-on="true"] .kp-badge { opacity: 0.88; }
        .kp-btn .kp-val { opacity: 0.92; }

        /* Sweep light (::after) — kontrollü premium ışık süzülmesi */
        .kp-btn::after {
          content: "";
          position: absolute;
          top: -40%;
          left: -60%;
          width: 45%;
          height: 180%;
          background: linear-gradient(
            110deg,
            transparent 0%,
            rgba(255,255,255,0.06) 45%,
            rgba(255,255,255,0.14) 50%,
            rgba(255,255,255,0.06) 55%,
            transparent 100%
          );
          transform: translateX(-140%) rotate(8deg);
          opacity: 0;
          pointer-events: none;
        }
        .kp-btn:hover::after,
        .kp-btn[data-on="true"]::after {
          animation: kpSweep 0.75s ease-out 1;
        }
        @keyframes kpSweep {
          from { transform: translateX(-140%) rotate(8deg); opacity: 0; }
          35%  { opacity: 0.60; }
          to   { transform: translateX(320%)  rotate(8deg); opacity: 0; }
        }

        /* Reduced-motion support: sweep tamamen devre dışı */
        @media (prefers-reduced-motion: reduce) {
          .kp-btn::after {
            animation: none !important;
            display: none;
          }
        }

        /* Hover — filter only, preserves variant colors */
        .kp-lock:hover  { filter: brightness(1.12); }
        .kp-lock:active { transform: translateY(1px); filter: brightness(0.92); }
        .kp-btn:hover   { filter: brightness(1.14); }
        .kp-btn:active  { transform: translateY(1px); filter: brightness(0.95); }

        /* Rate input */
        .kp-rate::-webkit-inner-spin-button,
        .kp-rate::-webkit-outer-spin-button { opacity: 0; }
        .kp-rate:focus { border-color: rgba(255,247,242,0.36) !important; outline: none; }
      `}</style>

      <div style={{
        padding:       '13px 12px 14px',
        display:       'flex',
        flexDirection: 'column',
      }}>

        {/* ── MAIN: Lock / Edit toggle — NEON GREEN (kendi özel stili) ── */}
        <button
          type="button"
          className="kp-lock"
          data-variant="edit"
          onClick={() => onReadOnlyDegistir(!readOnly)}
          style={{
            width:          '100%',
            height:         62,
            borderRadius:   12,
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
            marginBottom:   12,
            boxShadow:      readOnly
              ? 'inset 0 2px 6px rgba(0,0,0,0.4)'
              : `inset 0 1px 0 rgba(57,255,182,0.06), 0 2px 14px ${K.neonAura}`,
          }}
        >
          <span style={{
            fontSize: 22, lineHeight: 1,
            color: readOnly ? K.lkLkIco : K.neon,
            textShadow: readOnly
              ? undefined
              : `0 0 6px ${K.neonSoft}, 0 0 12px ${K.neonGlow}`,
          }}>
            {readOnly ? <LockOutlined /> : <UnlockOutlined />}
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', lineHeight: 1,
            color: readOnly ? K.lkLkTxt : K.neon,
            textShadow: readOnly
              ? undefined
              : `0 0 4px ${K.neonSoft}, 0 0 10px ${K.neonGlow}`,
          }}>
            {readOnly ? 'Kilitli Görünüm' : 'Düzenleme Modu'}
          </span>
        </button>

        {/* ── Belge Durumu — semantic variants per durum ── */}
        <SecLabel text="Belge Durumu" />
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 4, marginBottom: 13,
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
                  height:       28,
                  borderRadius: 8,
                  fontSize:     '10px',
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

        {/* ── Görüntüleme — variant="view" (amber/gold) ── */}
        <SecLabel text="Görüntüleme" />

        {/* KDV */}
        <button
          type="button"
          className="kp-btn"
          data-on={kdvOn}
          data-variant="view"
          onClick={toggleKdv}
          style={{
            width: '100%', height: 42, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', cursor: 'pointer', outline: 'none', marginBottom: 5,
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            KDV
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {kdvOn && (
              <span className="kp-val" style={{
                fontSize: '10px', fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}>
                %{kdvOrani}
              </span>
            )}
            <span className="kp-badge" style={{
              fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {kdvOn ? 'Aktif' : 'Kapalı'}
            </span>
          </div>
        </button>

        {/* İskonto */}
        <button
          type="button"
          className="kp-btn"
          data-on={iskOn}
          data-variant="view"
          onClick={toggleIsk}
          style={{
            width: '100%', height: 42,
            borderRadius: iskOn ? '10px 10px 0 0' : 10,
            borderBottom: iskOn ? 'none' : undefined,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', cursor: 'pointer', outline: 'none',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            İskonto
          </span>
          <span className="kp-badge" style={{
            fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {iskOn ? 'Aktif' : 'Kapalı'}
          </span>
        </button>

        {/* İskonto rate (attached expansion) */}
        {iskOn && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px 9px',
            background: 'rgba(255, 215, 150, 0.06)',
            borderRadius: '0 0 10px 10px',
            border: '1px solid rgba(255, 215, 150, 0.28)',
            borderTop: '1px solid rgba(255, 215, 150, 0.14)',
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
                width: 52, height: 25, borderRadius: 6,
                background: 'rgba(0,0,0,0.28)',
                border: '1px solid rgba(255, 215, 150, 0.30)',
                color: '#FFF0D2', fontSize: '11px', fontWeight: 700,
                textAlign: 'center', padding: '0 4px',
                fontVariantNumeric: 'tabular-nums',
                transition: 'border-color 0.14s ease',
              }}
            />
            <span style={{ fontSize: '10px', color: '#FFF0D2', fontWeight: 600 }}>%</span>
          </div>
        )}

        <Divider />

        {/* ── Satır Ayarları — variant="row" (violet) ── */}
        <SecLabel text="Satır Ayarları" />
        <TogRow
          label="Satır Para Birimi"
          checked={satirBazliParaBirimi}
          onChange={onSatirBazliParaBirimiDegistir}
        />
        <div style={{ height: 4 }} />
        <TogRow
          label="Satır İskontosu"
          checked={satirBazliIskonto}
          onChange={onSatirBazliIskontoDegistir}
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
        width: '100%', height: 37, borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', cursor: 'pointer', outline: 'none',
      }}
    >
      <span style={{
        fontSize: '11px', fontWeight: checked ? 600 : 500, lineHeight: 1,
      }}>
        {label}
      </span>
      <span className="kp-badge" style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', lineHeight: 1,
      }}>
        {checked ? 'Açık' : 'Kapalı'}
      </span>
    </button>
  );
}
