import React, { useState } from 'react';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import type { TeklifDurum } from '../types';

// ── Design tokens — Metalik Tesla Bordo + Unified subdued buttons ──────────────
const K = {
  WIDTH: 184,

  // ── Shell (metalik bordo — derin + soft ışık oyunu) ──
  shellImg:   'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.08), transparent 28%), linear-gradient(145deg, #19060A 0%, #2A0B10 45%, #3A0F16 100%)',
  shellSolid: '#19060A',
  shellBdr:   '#4A1620',

  // ── Text ──
  txt:        '#FFF7F2',
  txtLabel:   'rgba(255, 247, 242, 0.55)',   // section labels (SecLabel)
  txtBadge:   'rgba(255, 247, 242, 0.60)',   // inactive Açık/Kapalı badges
  txtBadgeOn: 'rgba(255, 247, 242, 0.85)',   // active badges (elegant lift)

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
} as const;

// ── UNIFIED button style — "Genel Toplam" etiketi sadeliğinde, warm-white overlay ──
const U = {
  bgOff:      'rgba(255, 247, 242, 0.055)',
  bgOn:       'rgba(255, 247, 242, 0.13)',
  bdrOff:     'rgba(255, 247, 242, 0.12)',
  bdrOn:      'rgba(255, 247, 242, 0.30)',
  // 3-layer active shadow: inset highlight + soft drop + subtle outer glow
  insetOn: [
    'inset 0 1px 0 rgba(255,255,255,0.10)',
    '0 4px 14px rgba(0,0,0,0.26)',
    '0 0 0 1px rgba(255,247,242,0.06)',
  ].join(', '),
  bgSub:      'rgba(255, 247, 242, 0.04)',
  inputBg:    'rgba(0, 0, 0, 0.28)',
} as const;

const DURUM_LABELS: Record<TeklifDurum, string> = {
  taslak: 'Taslak', hazir: 'Hazır', gonderildi: 'Gönderildi',
  onaylandi: 'Onaylandı', iptal: 'İptal',
};
const DURUM_LIST: TeklifDurum[] = ['taslak', 'hazir', 'gonderildi', 'onaylandi', 'iptal'];

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
        // Safe-area wrapper: never crosses toolbar (56 + 40 breathing = 96) and stays 24 from bottom
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
        /* Unified transitions + position/overflow for sweep */
        .kp-lock, .kp-btn {
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease,
                      box-shadow 0.18s ease, transform 0.12s ease, filter 0.18s ease;
          position: relative;
          overflow: hidden;
        }

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

        /* Reduced-motion support: efekt tamamen devre dışı */
        @media (prefers-reduced-motion: reduce) {
          .kp-btn::after {
            animation: none !important;
            display: none;
          }
        }

        /* Lock button — special (neon), kendi glow'u var */
        .kp-lock:hover  { filter: brightness(1.12); }
        .kp-lock:active { transform: translateY(1px); filter: brightness(0.92); }

        /* Unified buttons — hover (pasif & aktif ayrı) */
        .kp-btn:hover  {
          background: rgba(255,247,242,0.085) !important;
          border-color: rgba(255,247,242,0.20) !important;
        }
        .kp-btn[data-on="true"]:hover {
          background: rgba(255,247,242,0.16) !important;
          border-color: rgba(255,247,242,0.36) !important;
        }
        .kp-btn:active { transform: translateY(1px); filter: brightness(0.95); }

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

        {/* ── MAIN: Lock / Edit toggle — NEON GREEN on edit (special case) ── */}
        <button
          type="button"
          className="kp-lock"
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
            color: readOnly ? K.txt : K.neon,
            textShadow: readOnly
              ? undefined
              : `0 0 4px ${K.neonSoft}, 0 0 10px ${K.neonGlow}`,
          }}>
            {readOnly ? 'Kilitli Görünüm' : 'Düzenleme Modu'}
          </span>
        </button>

        {/* ── Belge Durumu — unified subdued pills ── */}
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
                onClick={() => onDurumDegistir(d)}
                style={{
                  height:       28,
                  borderRadius: 8,
                  background:   on ? U.bgOn   : U.bgOff,
                  border:       `1px solid ${on ? U.bdrOn : U.bdrOff}`,
                  color:        on ? K.txt : K.txtBadgeOn,
                  fontSize:     '10px',
                  fontWeight:   on ? 700 : 500,
                  cursor:       'pointer',
                  outline:      'none',
                  padding:      '0 4px',
                  whiteSpace:   'nowrap',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  boxShadow:    on ? U.insetOn : undefined,
                  gridColumn:   d === 'iptal' ? '1 / -1' : undefined,
                }}
              >
                {DURUM_LABELS[d]}
              </button>
            );
          })}
        </div>

        <Divider />

        {/* ── Görüntüleme — unified subdued ── */}
        <SecLabel text="Görüntüleme" />

        {/* KDV */}
        <button
          type="button"
          className="kp-btn"
          data-on={kdvOn}
          onClick={toggleKdv}
          style={{
            width: '100%', height: 42, borderRadius: 10,
            background: kdvOn ? U.bgOn : U.bgOff,
            border: `1px solid ${kdvOn ? U.bdrOn : U.bdrOff}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', cursor: 'pointer', outline: 'none', marginBottom: 5,
            boxShadow: kdvOn ? U.insetOn : undefined,
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: K.txt }}>
            KDV
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {kdvOn && (
              <span style={{
                fontSize: '10px', fontWeight: 700,
                color: K.txtBadgeOn, fontVariantNumeric: 'tabular-nums',
              }}>
                %{kdvOrani}
              </span>
            )}
            <span style={{
              fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: kdvOn ? K.txtBadgeOn : K.txtBadge,
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
          onClick={toggleIsk}
          style={{
            width: '100%', height: 42,
            borderRadius: iskOn ? '10px 10px 0 0' : 10,
            background: iskOn ? U.bgOn : U.bgOff,
            border: `1px solid ${iskOn ? U.bdrOn : U.bdrOff}`,
            borderBottom: iskOn ? 'none' : undefined,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', cursor: 'pointer', outline: 'none',
            boxShadow: iskOn ? U.insetOn : undefined,
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: K.txt }}>
            İskonto
          </span>
          <span style={{
            fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: iskOn ? K.txtBadgeOn : K.txtBadge,
          }}>
            {iskOn ? 'Aktif' : 'Kapalı'}
          </span>
        </button>

        {/* İskonto rate — attached expansion (unified sub-bg) */}
        {iskOn && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px 9px',
            background: U.bgSub,
            borderRadius: '0 0 10px 10px',
            border: `1px solid ${U.bdrOn}`,
            borderTop: `1px solid rgba(255,247,242,0.08)`,
          }}>
            <span style={{ fontSize: '10px', color: K.txtBadge, flex: 1, fontWeight: 600 }}>Oran</span>
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
                background: U.inputBg,
                border: `1px solid rgba(255,247,242,0.18)`,
                color: K.txt, fontSize: '11px', fontWeight: 700,
                textAlign: 'center', padding: '0 4px',
                fontVariantNumeric: 'tabular-nums',
                transition: 'border-color 0.14s ease',
              }}
            />
            <span style={{ fontSize: '10px', color: K.txtBadgeOn, fontWeight: 600 }}>%</span>
          </div>
        )}

        <Divider />

        {/* ── Satır Ayarları — unified subdued ── */}
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

// ── Toggle row — unified ───────────────────────────────────────────────────────
function TogRow({
  label, checked, onChange,
}: {
  label:    string;
  checked:  boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="kp-btn"
      data-on={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: '100%', height: 37, borderRadius: 9,
        background: checked ? U.bgOn : U.bgOff,
        border: `1px solid ${checked ? U.bdrOn : U.bdrOff}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', cursor: 'pointer', outline: 'none',
        boxShadow: checked ? U.insetOn : undefined,
      }}
    >
      <span style={{
        fontSize: '11px', fontWeight: checked ? 600 : 500,
        color: K.txt, lineHeight: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: checked ? K.txtBadgeOn : K.txtBadge,
        lineHeight: 1,
      }}>
        {checked ? 'Açık' : 'Kapalı'}
      </span>
    </button>
  );
}
