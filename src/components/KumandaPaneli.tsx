import React, { useState } from 'react';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import type { TeklifDurum } from '../types';

// ── Design tokens ──────────────────────────────────────────────────────────────
const K = {
  WIDTH: 184,

  // ── Surfaces ──
  shell:    '#1A1816',    // main panel bg
  surface:  '#222020',    // subtle elevated
  btn:      '#2A2826',    // standard control bg

  // ── Text (high contrast — no muted grays) ──
  txt:        '#F5F5F5',   // primary — all main button text
  txtMute:    '#E2DDD6',   // secondary — Kapalı/Açık badges (still very readable)
  txtLabel:   '#C8C3BD',   // section labels

  // ── Borders (thin, soft) ──
  bdr:      '#2D2A28',
  bdrFine:  '#252320',

  // ── Lock — EDIT mode (active, unlocked) ──
  lkEdBg:   '#1C2F24',
  lkEdBdr:  '#365942',
  lkEdTxt:  '#EAF5EF',
  lkEdIco:  '#70D69E',

  // ── Lock — LOCKED mode ──
  lkLkBg:   '#1A1816',
  lkLkBdr:  '#302D2A',
  lkLkTxt:  '#E2DDD8',
  lkLkIco:  '#B5B0AA',

  // ── KDV active ──
  kdvBg:    '#182B47',
  kdvBdr:   '#29487C',
  kdvTxt:   '#E8F2FA',

  // ── İskonto active ──
  iskBg:    '#2C1E0A',
  iskBdr:   '#4C3410',
  iskTxt:   '#FAEFDE',
  iskInp:   '#1C1408',

  // ── Toggle active (green) ──
  togBg:    '#1C2F24',
  togBdr:   '#365942',
  togTxt:   '#EAF5EF',

  // ── Durum pills ──
  durABg:   '#2E2C28',
  durABdr:  '#5A5450',
  durATxt:  '#F5F5F5',
  durIBdr:  '#2B2825',
  durITxt:  '#D5D0CB',
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
  return <div style={{ height: 1, background: K.bdrFine, margin: '13px 0' }} />;
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
        // Fixed — stays absolutely still during page scroll
        position:  'fixed',
        top:       '50%',
        right:     sagPanelOpen
          ? 'max(8px, calc(50% - 413px))'  // with SagPanel (360px): shift right by SagPanel/2
          : 'max(8px, calc(50% - 593px))', // without: at A4's right edge + gap
        transform: 'translateY(-50%)',
        zIndex:    50,
        // Fixed compact width
        width:     K.WIDTH,
        // Clean UI panel — not a physical device
        borderRadius: 14,
        background:   K.shell,
        border:       `1px solid ${K.bdr}`,
        boxShadow:    '0 4px 16px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.18)',
        // Safety: clip if viewport is tiny (no internal scrollbar)
        maxHeight: 'calc(100vh - 20px)',
        overflow:  'hidden',
      }}
    >
      <style>{`
        .kp-lock:hover  { filter: brightness(1.12); }
        .kp-lock:active { transform: translateY(1px); filter: brightness(0.94); }
        .kp-ctrl:hover  { filter: brightness(1.10); }
        .kp-ctrl:active { transform: translateY(1px); filter: brightness(0.93); }
        .kp-tog:hover   { filter: brightness(1.10); }
        .kp-tog:active  { transform: translateY(0.5px); filter: brightness(0.93); }
        .kp-dur:hover   { filter: brightness(1.15); }
        .kp-dur:active  { transform: translateY(0.5px); }
        .kp-rate::-webkit-inner-spin-button,
        .kp-rate::-webkit-outer-spin-button { opacity: 0; }
        .kp-rate:focus { border-color: #6A5230 !important; outline: none; }
      `}</style>

      {/* Content — natural height, no internal scroll */}
      <div style={{
        padding:       '13px 12px 14px',
        display:       'flex',
        flexDirection: 'column',
      }}>

        {/* ── MAIN: Lock / Edit toggle ── */}
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
              ? 'inset 0 2px 6px rgba(0,0,0,0.3)'
              : 'inset 0 1px 0 rgba(255,255,255,0.05)',
            transition:     'all 0.2s ease',
          }}
        >
          <span style={{
            fontSize: 22, lineHeight: 1,
            color: readOnly ? K.lkLkIco : K.lkEdIco,
            transition: 'color 0.2s',
          }}>
            {readOnly ? <LockOutlined /> : <UnlockOutlined />}
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', lineHeight: 1,
            color: readOnly ? K.lkLkTxt : K.lkEdTxt,
            transition: 'color 0.2s',
          }}>
            {readOnly ? 'Kilitli Görünüm' : 'Düzenleme Modu'}
          </span>
        </button>

        {/* ── Belge Durumu ── */}
        <SecLabel text="Belge Durumu" />
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 4, marginBottom: 13,
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
                  height:       28,
                  borderRadius: 7,
                  background:   a ? K.durABg : 'transparent',
                  border:       `1px solid ${a ? K.durABdr : K.durIBdr}`,
                  color:        a ? K.durATxt : K.durITxt,
                  fontSize:     '10px',
                  fontWeight:   a ? 600 : 500,
                  cursor:       'pointer',
                  outline:      'none',
                  padding:      '0 4px',
                  whiteSpace:   'nowrap',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  transition:   'all 0.14s ease',
                  gridColumn:   d === 'iptal' ? '1 / -1' : undefined,
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
            border: `1.5px solid ${kdvOn ? K.kdvBdr : K.bdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 11px', cursor: 'pointer', outline: 'none', marginBottom: 5,
            transition: 'all 0.17s ease',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: kdvOn ? K.kdvTxt : K.txt }}>
            KDV
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {kdvOn && (
              <span style={{
                fontSize: '10px', fontWeight: 700,
                color: K.kdvTxt, fontVariantNumeric: 'tabular-nums',
              }}>
                %{kdvOrani}
              </span>
            )}
            <span style={{
              fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: kdvOn ? K.kdvTxt : K.txtMute,
            }}>
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
            border: `1.5px solid ${iskOn ? K.iskBdr : K.bdr}`,
            borderBottom: iskOn ? 'none' : undefined,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 11px', cursor: 'pointer', outline: 'none',
            transition: 'background 0.17s ease, border-color 0.17s ease',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: iskOn ? K.iskTxt : K.txt }}>
            İskonto
          </span>
          <span style={{
            fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: iskOn ? K.iskTxt : K.txtMute,
          }}>
            {iskOn ? 'Aktif' : 'Kapalı'}
          </span>
        </button>

        {/* İskonto rate */}
        {iskOn && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 11px 9px',
            background: K.iskInp,
            borderRadius: '0 0 10px 10px',
            border: `1.5px solid ${K.iskBdr}`,
            borderTop: `1px solid ${K.iskBdr}`,
          }}>
            <span style={{ fontSize: '10px', color: K.iskTxt, flex: 1, fontWeight: 600 }}>Oran</span>
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
                background: K.shell,
                border: `1px solid ${K.iskBdr}`,
                color: K.iskTxt, fontSize: '11px', fontWeight: 700,
                textAlign: 'center', padding: '0 4px',
                fontVariantNumeric: 'tabular-nums',
                transition: 'border-color 0.14s ease',
              }}
            />
            <span style={{ fontSize: '10px', color: K.iskTxt, fontWeight: 600 }}>%</span>
          </div>
        )}

        <Divider />

        {/* ── Satır Ayarları ── */}
        <SecLabel text="Satır Ayarları" />
        <TogRow label="Satır Para Birimi" checked={satirBazliParaBirimi} onChange={onSatirBazliParaBirimiDegistir} />
        <div style={{ height: 4 }} />
        <TogRow label="Satır İskontosu" checked={satirBazliIskonto} onChange={onSatirBazliIskontoDegistir} />

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
        width: '100%', height: 37, borderRadius: 9,
        background: checked ? K.togBg : 'transparent',
        border: `1px solid ${checked ? K.togBdr : K.bdrFine}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 11px', cursor: 'pointer', outline: 'none',
        transition: 'all 0.14s ease',
      }}
    >
      <span style={{
        fontSize: '11px', fontWeight: 500,
        color: checked ? K.togTxt : K.txt,
        lineHeight: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: checked ? K.togTxt : K.txtMute,
        lineHeight: 1,
      }}>
        {checked ? 'Açık' : 'Kapalı'}
      </span>
    </button>
  );
}
