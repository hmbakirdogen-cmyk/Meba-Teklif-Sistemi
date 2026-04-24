import React, { useState } from 'react';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import type { TeklifDurum } from '../types';

// ── Design tokens — Metalik Tesla Bordo premium ────────────────────────────────
const K = {
  WIDTH: 184,

  // ── Shell (metalik bordo — derin + soft ışık oyunu) ──
  shellImg: 'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.08), transparent 28%), linear-gradient(145deg, #19060A 0%, #2A0B10 45%, #3A0F16 100%)',
  shellSolid: '#19060A',

  // ── Default control ──
  btn:     '#25090E',   // daha koyu default
  btnBdr:  '#4A1620',

  // ── Inner borders ──
  bdrFine: '#3A1218',

  // ── Text tokens ──
  txt:        '#FFF7F2',
  txtSec:     '#F4C9B8',
  txtGold:    '#FFD7A1',
  txtPassive: '#CFA8A0',

  // ── Neon Green (EDIT MODE — kilit açık) ──
  neon:       '#39FFB6',
  neonSoft:   'rgba(57, 255, 182, 0.6)',
  neonGlow:   'rgba(57, 255, 182, 0.35)',
  neonAura:   'rgba(57, 255, 182, 0.15)',
  lkEdBg:     '#0E2318',
  lkEdBdr:    '#1F4030',

  // ── Lock (LOCKED — kilitli) ──
  lkLkBg:     '#24090E',
  lkLkBdr:    '#3A1318',
  lkLkTxt:    '#F4C9B8',
  lkLkIco:    '#CFA8A0',

  // ── KDV active (mavi-gümüş / finansal) ──
  kdvBg:   '#14243A',
  kdvBdr:  '#284A6E',
  kdvTxt:  '#9BC8E8',

  // ── İskonto active (amber/gold — indirim) ──
  iskBg:   '#2E200A',
  iskBdr:  '#5C4420',
  iskTxt:  '#FFD19B',
  iskInp:  '#1A1206',

  // ── Satır Para Birimi (cyan — soğuk / akış) ──
  cyBg:    '#0E2A30',
  cyBdr:   '#1F4A55',
  cyTxt:   '#7FE8E0',

  // ── Satır İskontosu (violet — ikincil ayar) ──
  viBg:    '#251A38',
  viBdr:   '#3E2B5E',
  viTxt:   '#C4A8FF',
} as const;

// ── Durum pills — her biri kendi karakterinde ──
const DURUM_COLORS: Record<TeklifDurum, { bg: string; bdr: string; txt: string }> = {
  taslak:     { bg: '#2E1A1A', bdr: '#4E2E30', txt: '#F4C9B8' }, // warm neutral
  hazir:      { bg: '#152838', bdr: '#284A6E', txt: '#9BC8E8' }, // blue — hazır
  gonderildi: { bg: '#2E200A', bdr: '#4E3820', txt: '#FFD19B' }, // amber — gönderildi
  onaylandi:  { bg: '#122A1E', bdr: '#1F4A3A', txt: '#7FE5BC' }, // green — onaylandı
  iptal:      { bg: '#2E1010', bdr: '#4E2020', txt: '#F4A0A0' }, // red-bordo — iptal
};

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
      textTransform: 'uppercase', color: K.txtSec,
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
        // Fixed — absolutely still during page scroll
        position:  'fixed',
        top:       '50%',
        right:     sagPanelOpen
          ? 'max(8px, calc(50% - 413px))'
          : 'max(8px, calc(50% - 593px))',
        transform: 'translateY(-50%)',
        zIndex:    50,
        width:     K.WIDTH,
        borderRadius: 14,
        backgroundImage: K.shellImg,
        backgroundColor: K.shellSolid,
        border:    `1px solid ${K.btnBdr}`,
        boxShadow: [
          '0 6px 24px rgba(0,0,0,0.55)',
          '0 1px 4px rgba(0,0,0,0.4)',
          'inset 0 1px 0 rgba(255,255,255,0.05)',
          'inset 0 -1px 0 rgba(0,0,0,0.45)',
        ].join(', '),
        maxHeight: 'calc(100vh - 20px)',
        overflow:  'hidden',
      }}
    >
      <style>{`
        /* Universal transitions */
        .kp-lock, .kp-ctrl, .kp-tog, .kp-dur {
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease,
                      filter 0.18s ease, box-shadow 0.22s ease, transform 0.15s ease,
                      text-shadow 0.22s ease;
        }

        /* Lock button */
        .kp-lock:hover  { filter: brightness(1.12); }
        .kp-lock:active { transform: translateY(1px); filter: brightness(0.92); }

        /* KDV / İskonto control buttons */
        .kp-ctrl:hover  { filter: brightness(1.10); }
        .kp-ctrl:active { transform: translateY(1px); filter: brightness(0.88); }
        .kp-ctrl:active .kp-main-lbl { color: var(--kp-accent) !important; }

        /* Toggle rows */
        .kp-tog:hover   { filter: brightness(1.10); }
        .kp-tog:active  { transform: translateY(0.5px); filter: brightness(0.88); }
        .kp-tog:active .kp-main-lbl { color: var(--kp-accent) !important; }

        /* Durum pills */
        .kp-dur:hover   { filter: brightness(1.18); }
        .kp-dur:active  { transform: translateY(0.5px); filter: brightness(0.88); }

        /* Rate input */
        .kp-rate::-webkit-inner-spin-button,
        .kp-rate::-webkit-outer-spin-button { opacity: 0; }
        .kp-rate:focus { border-color: ${K.txtGold} !important; outline: none; }
      `}</style>

      <div style={{
        padding:       '13px 12px 14px',
        display:       'flex',
        flexDirection: 'column',
      }}>

        {/* ── MAIN: Lock / Edit toggle — NEON GREEN on edit mode ── */}
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
            color: readOnly ? K.lkLkTxt : K.neon,
            textShadow: readOnly
              ? undefined
              : `0 0 4px ${K.neonSoft}, 0 0 10px ${K.neonGlow}`,
          }}>
            {readOnly ? 'Kilitli Görünüm' : 'Düzenleme Modu'}
          </span>
        </button>

        {/* ── Belge Durumu — her durum kendi karakter renginde ── */}
        <SecLabel text="Belge Durumu" />
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 4, marginBottom: 13,
        }}>
          {DURUM_LIST.map(d => {
            const a = durum === d;
            const c = DURUM_COLORS[d];
            return (
              <button
                key={d}
                type="button"
                className="kp-dur"
                onClick={() => onDurumDegistir(d)}
                style={{
                  height:       28,
                  borderRadius: 7,
                  background:   a ? c.bg : 'transparent',
                  border:       `1px solid ${a ? c.bdr : K.bdrFine}`,
                  color:        a ? c.txt : K.txtSec,
                  fontSize:     '10px',
                  fontWeight:   a ? 600 : 500,
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

        {/* ── Görüntüleme ── */}
        <SecLabel text="Görüntüleme" />

        {/* KDV — mavi-gümüş karakteri */}
        <button
          type="button" className="kp-ctrl" onClick={toggleKdv}
          style={{
            ['--kp-accent' as string]: K.kdvTxt,
            width: '100%', height: 42, borderRadius: 10,
            background: kdvOn ? K.kdvBg : K.btn,
            border: `1.5px solid ${kdvOn ? K.kdvBdr : K.btnBdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 11px', cursor: 'pointer', outline: 'none', marginBottom: 5,
          } as React.CSSProperties}
        >
          <span className="kp-main-lbl" style={{ fontSize: '12px', fontWeight: 600, color: kdvOn ? K.kdvTxt : K.txt }}>
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
              color: kdvOn ? K.kdvTxt : K.txtSec,
            }}>
              {kdvOn ? 'Aktif' : 'Kapalı'}
            </span>
          </div>
        </button>

        {/* İskonto — amber karakteri */}
        <button
          type="button" className="kp-ctrl" onClick={toggleIsk}
          style={{
            ['--kp-accent' as string]: K.iskTxt,
            width: '100%', height: 42,
            borderRadius: iskOn ? '10px 10px 0 0' : 10,
            background: iskOn ? K.iskBg : K.btn,
            border: `1.5px solid ${iskOn ? K.iskBdr : K.btnBdr}`,
            borderBottom: iskOn ? 'none' : undefined,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 11px', cursor: 'pointer', outline: 'none',
          } as React.CSSProperties}
        >
          <span className="kp-main-lbl" style={{ fontSize: '12px', fontWeight: 600, color: iskOn ? K.iskTxt : K.txt }}>
            İskonto
          </span>
          <span style={{
            fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: iskOn ? K.iskTxt : K.txtSec,
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
                background: K.shellSolid,
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

        {/* ── Satır Ayarları — ikisi farklı karakter ── */}
        <SecLabel text="Satır Ayarları" />
        <TogRow
          label="Satır Para Birimi"
          checked={satirBazliParaBirimi}
          onChange={onSatirBazliParaBirimiDegistir}
          accent={{ bg: K.cyBg, bdr: K.cyBdr, txt: K.cyTxt }}
        />
        <div style={{ height: 4 }} />
        <TogRow
          label="Satır İskontosu"
          checked={satirBazliIskonto}
          onChange={onSatirBazliIskontoDegistir}
          accent={{ bg: K.viBg, bdr: K.viBdr, txt: K.viTxt }}
        />

      </div>
    </div>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────────
function TogRow({
  label, checked, onChange, accent,
}: {
  label:    string;
  checked:  boolean;
  onChange: (v: boolean) => void;
  accent:   { bg: string; bdr: string; txt: string };
}) {
  return (
    <button
      type="button" className="kp-tog"
      onClick={() => onChange(!checked)}
      style={{
        ['--kp-accent' as string]: accent.txt,
        width: '100%', height: 37, borderRadius: 9,
        background: checked ? accent.bg : 'transparent',
        border: `1px solid ${checked ? accent.bdr : K.bdrFine}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 11px', cursor: 'pointer', outline: 'none',
      } as React.CSSProperties}
    >
      <span className="kp-main-lbl" style={{
        fontSize: '11px', fontWeight: 500,
        color: checked ? accent.txt : K.txt,
        lineHeight: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: checked ? accent.txt : K.txtSec,
        lineHeight: 1,
      }}>
        {checked ? 'Açık' : 'Kapalı'}
      </span>
    </button>
  );
}
