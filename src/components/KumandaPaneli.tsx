import React, { useState } from 'react';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import type { TeklifDurum } from '../types';

// ── Design tokens ──────────────────────────────────────────────────────────────
const K = {
  // Layout — slot takes space in flex row; device floats inside aligned with A4 top
  SLOT_W:    188,   // total flex column width
  PAD_L:     6,     // slot left padding
  PAD_R:     10,    // slot right padding (creates gap toward SagPanel)
  // A4 scroll container has padding-top: 40px — match here so device top aligns with A4 top
  PAD_TOP:   40,

  // ── Slot & device surfaces
  slotBg:    '#E0DDD9',   // same as document scroll area — seamless blend
  shell:     '#1C1917',
  shellBdr:  '#343230',
  groove:    '#131210',

  // Controls
  btn:       '#2A2826',
  btnHover:  '#333130',

  // Text
  t1:  '#ECE8E3',
  t2:  '#9A9590',
  t3:  '#504B46',
  t4:  '#363030',   // micro-label, barely visible

  // Borders
  bdrFine: '#272422',

  // ── Lock — edit mode (unlocked, editing active)
  lkEdBg:  '#1B2D22',
  lkEdBdr: '#2B4838',
  lkEdTxt: '#6DB894',
  lkEdIco: '#52A076',
  lkEdGlw: 'rgba(82,160,118,0.14)',

  // ── Lock — locked mode
  lkLkBg:  '#1A1816',
  lkLkBdr: '#252220',
  lkLkTxt: '#6A6460',
  lkLkIco: '#484240',

  // ── KDV active (muted blue-steel)
  kdvBg:  '#192535',
  kdvBdr: '#1E3254',
  kdvTxt: '#5888AC',

  // ── İskonto active (muted amber)
  iskBg:  '#2A1D0A',
  iskBdr: '#44310A',
  iskTxt: '#A07838',
  iskInp: '#221808',

  // ── Toggle active (green accent)
  togBg:  '#1B2D22',
  togBdr: '#2B4838',
  togTxt: '#6DB894',

  // ── Durum pills
  durABg:  '#2C2A28',
  durABdr: '#4C4844',
  durATxt: '#C8C4BE',
  durIBdr: '#222020',
  durITxt: '#47433E',
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
const DURUM_LABELS: Record<TeklifDurum, string> = {
  taslak: 'Taslak', hazir: 'Hazır', gonderildi: 'Gönderildi',
  onaylandi: 'Onaylandı', iptal: 'İptal',
};
const DURUM_LIST: TeklifDurum[] = ['taslak', 'hazir', 'gonderildi', 'onaylandi', 'iptal'];

function MicroLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.18em',
      textTransform: 'uppercase', color: K.t4, textAlign: 'center',
      marginBottom: 10, userSelect: 'none',
    }}>
      {text}
    </div>
  );
}

function SecLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: K.t3,
      marginBottom: 6, paddingLeft: 2, userSelect: 'none',
    }}>
      {text}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: K.groove, margin: '12px 0' }} />;
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
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function KumandaPaneli({
  readOnly, onReadOnlyDegistir,
  durum, onDurumDegistir,
  kdvOrani, onKdvOraniDegistir,
  iskontoOrani, onIskontoOraniDegistir,
  satirBazliParaBirimi, onSatirBazliParaBirimiDegistir,
  satirBazliIskonto, onSatirBazliIskontoDegistir,
}: KumandaPaneliProps) {
  const [lastKdv, setLastKdv]   = useState(() => kdvOrani     > 0 ? kdvOrani     : 20);
  const [lastIsk, setLastIsk]   = useState(() => iskontoOrani > 0 ? iskontoOrani : 10);

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

  const deviceW = K.SLOT_W - K.PAD_L - K.PAD_R;

  return (
    <div
      className="no-print"
      style={{
        // Takes up fixed space in the flex row
        width:     K.SLOT_W,
        minWidth:  K.SLOT_W,
        flexShrink: 0,
        // Full height of main area — provides seamless bg below the device
        height:    '100%',
        background: K.slotBg,
        // Top padding aligns device top with A4 page top
        paddingTop:   K.PAD_TOP,
        paddingBottom: 0,
        paddingLeft:  K.PAD_L,
        paddingRight: K.PAD_R,
        boxSizing:    'border-box',
        // Align device to top — don't stretch it to full height
        display:      'flex',
        alignItems:   'flex-start',
      }}
    >
      {/* ── Button interaction styles ── */}
      <style>{`
        .kp-lock:hover  { filter: brightness(1.12); }
        .kp-lock:active { transform: translateY(1px); filter: brightness(0.93); }
        .kp-ctrl:hover  { filter: brightness(1.09); }
        .kp-ctrl:active { transform: translateY(1px); filter: brightness(0.91); }
        .kp-tog:hover   { filter: brightness(1.09); }
        .kp-tog:active  { transform: translateY(0.5px); filter: brightness(0.91); }
        .kp-dur:hover   { filter: brightness(1.14); }
        .kp-dur:active  { transform: translateY(0.5px); }
        .kp-rate::-webkit-inner-spin-button,
        .kp-rate::-webkit-outer-spin-button { opacity: 0; }
        .kp-rate:focus  { border-color: #6A5230 !important; outline: none; }
      `}</style>

      {/* ── Device ── */}
      <div style={{
        width:        deviceW,
        // Natural height — NOT 100% — compact device, not a full-height panel
        borderRadius: 18,
        background:   K.shell,
        border:       `1px solid ${K.shellBdr}`,
        boxShadow: [
          '0 20px 56px rgba(0,0,0,0.62)',
          '0 6px 18px rgba(0,0,0,0.46)',
          '0 2px 5px rgba(0,0,0,0.56)',
          'inset 0 1.5px 0 rgba(255,255,255,0.07)',
          'inset 0 -1px 0 rgba(0,0,0,0.65)',
        ].join(', '),
        overflow:      'hidden',
        // maxHeight caps the device to roughly 50-65% viewport for very large screens
        maxHeight:     'min(520px, 66vh)',
        display:       'flex',
        flexDirection: 'column',
      }}>

        {/* Top rim */}
        <div style={{
          height:     2,
          flexShrink: 0,
          background: 'linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.05) 65%, transparent 92%)',
        }} />

        {/* Scrollable content */}
        <div style={{
          flex:          1,
          overflowY:     'auto',
          overflowX:     'hidden',
          padding:       '10px 11px 16px',
          display:       'flex',
          flexDirection: 'column',
        }}>
          <MicroLabel text="Kontrol" />

          {/* ── MAIN: Lock / Edit toggle ── */}
          <button
            type="button"
            className="kp-lock"
            onClick={() => onReadOnlyDegistir(!readOnly)}
            style={{
              width:          '100%',
              height:         62,
              borderRadius:   13,
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
                ? 'inset 0 3px 10px rgba(0,0,0,0.55)'
                : `inset 0 1px 0 rgba(255,255,255,0.06), 0 5px 16px ${K.lkEdGlw}`,
              transition:     'all 0.22s ease',
              position:       'relative',
              overflow:       'hidden',
            }}
          >
            {!readOnly && (
              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%',
                height: 1, pointerEvents: 'none',
                background: `linear-gradient(90deg, transparent, ${K.lkEdBdr}, transparent)`,
              }} />
            )}
            <span style={{ fontSize: 21, lineHeight: 1, transition: 'color 0.22s', color: readOnly ? K.lkLkIco : K.lkEdIco }}>
              {readOnly ? <LockOutlined /> : <UnlockOutlined />}
            </span>
            <span style={{
              fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase', lineHeight: 1,
              transition: 'color 0.22s', color: readOnly ? K.lkLkTxt : K.lkEdTxt,
            }}>
              {readOnly ? 'Kilitli Görünüm' : 'Düzenleme Modu'}
            </span>
          </button>

          {/* ── Belge Durumu ── */}
          <SecLabel text="Belge Durumu" />
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 3, marginBottom: 14,
          }}>
            {DURUM_LIST.map(d => {
              const a = durum === d;
              return (
                <button
                  key={d}
                  type="button"
                  className="kp-dur"
                  onClick={() => onDurumDegistir(d)}
                  style={{
                    height: 27, borderRadius: 7,
                    background: a ? K.durABg : 'transparent',
                    border: `1px solid ${a ? K.durABdr : K.durIBdr}`,
                    color: a ? K.durATxt : K.durITxt,
                    fontSize: '9.5px', fontWeight: a ? 600 : 500,
                    cursor: 'pointer', outline: 'none',
                    padding: '0 3px', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    transition: 'all 0.14s ease',
                    gridColumn: d === 'iptal' ? '1 / -1' : undefined,
                  }}
                >
                  {DURUM_LABELS[d]}
                </button>
              );
            })}
          </div>

          <Divider />

          {/* ── Görüntüleme ── */}
          <SecLabel text="Görüntüleme" />

          {/* KDV */}
          <button
            type="button" className="kp-ctrl" onClick={toggleKdv}
            style={{
              width: '100%', height: 42, borderRadius: 10,
              background: kdvOn ? K.kdvBg : K.btn,
              border: `1.5px solid ${kdvOn ? K.kdvBdr : K.bdrFine}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 11px', cursor: 'pointer', outline: 'none', marginBottom: 5,
              boxShadow: kdvOn ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              transition: 'all 0.17s ease',
            }}
          >
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: kdvOn ? K.kdvTxt : K.t2 }}>KDV</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {kdvOn && <span style={{ fontSize: '9.5px', fontWeight: 700, color: K.kdvTxt, fontVariantNumeric: 'tabular-nums' }}>%{kdvOrani}</span>}
              <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: kdvOn ? K.kdvTxt : K.t3 }}>
                {kdvOn ? 'Aktif' : 'Kapalı'}
              </span>
            </div>
          </button>

          {/* İskonto */}
          <button
            type="button" className="kp-ctrl" onClick={toggleIsk}
            style={{
              width: '100%', height: 42,
              borderRadius: iskOn ? '10px 10px 0 0' : 10,
              background: iskOn ? K.iskBg : K.btn,
              border: `1.5px solid ${iskOn ? K.iskBdr : K.bdrFine}`,
              borderBottom: iskOn ? 'none' : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 11px', cursor: 'pointer', outline: 'none',
              boxShadow: iskOn ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              transition: 'background 0.17s ease, border-color 0.17s ease',
            }}
          >
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: iskOn ? K.iskTxt : K.t2 }}>İskonto</span>
            <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: iskOn ? K.iskTxt : K.t3 }}>
              {iskOn ? 'Aktif' : 'Kapalı'}
            </span>
          </button>

          {/* İskonto rate (attached expansion) */}
          {iskOn && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 11px 9px',
              background: K.iskInp,
              borderRadius: '0 0 10px 10px',
              border: `1.5px solid ${K.iskBdr}`,
              borderTop: `1px solid ${K.iskBdr}`,
              marginBottom: 0,
            }}>
              <span style={{ fontSize: '9.5px', color: K.iskTxt, flex: 1, fontWeight: 500 }}>Oran</span>
              <input
                type="number" className="kp-rate"
                min={0.5} max={100} step={0.5}
                value={iskontoOrani}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v > 0 && v <= 100) { setLastIsk(v); onIskontoOraniDegistir(v); }
                }}
                style={{
                  width: 50, height: 24, borderRadius: 6,
                  background: K.groove, border: `1px solid ${K.iskBdr}`,
                  color: K.iskTxt, fontSize: '10.5px', fontWeight: 700,
                  textAlign: 'center', padding: '0 3px',
                  fontVariantNumeric: 'tabular-nums',
                  transition: 'border-color 0.14s ease',
                }}
              />
              <span style={{ fontSize: '9.5px', color: K.iskTxt, fontWeight: 600 }}>%</span>
            </div>
          )}

          <Divider />

          {/* ── Satır Ayarları ── */}
          <SecLabel text="Satır Ayarları" />
          <TogRow label="Satır Para Birimi" checked={satirBazliParaBirimi} onChange={onSatirBazliParaBirimiDegistir} />
          <div style={{ height: 3 }} />
          <TogRow label="Satır İskontosu" checked={satirBazliIskonto} onChange={onSatirBazliIskontoDegistir} />
        </div>

        {/* Bottom rim */}
        <div style={{ height: 2, flexShrink: 0, background: K.groove }} />
      </div>
    </div>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────────
function TogRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button" className="kp-tog"
      onClick={() => onChange(!checked)}
      style={{
        width: '100%', height: 36, borderRadius: 9,
        background: checked ? K.togBg : 'transparent',
        border: `1px solid ${checked ? K.togBdr : K.bdrFine}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', cursor: 'pointer', outline: 'none',
        transition: 'all 0.14s ease',
      }}
    >
      <span style={{ fontSize: '10.5px', fontWeight: 500, color: checked ? K.togTxt : K.t2, lineHeight: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: checked ? K.togTxt : K.t3, lineHeight: 1 }}>
        {checked ? 'Açık' : 'Kapalı'}
      </span>
    </button>
  );
}
