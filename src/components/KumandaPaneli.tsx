import { useRef, useState } from 'react';
import {
  LockOutlined, UnlockOutlined, PictureOutlined,
  FilePdfOutlined, MailOutlined, SaveOutlined,
} from '@ant-design/icons';
import type { TeklifDurum } from '../types';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;

// ── Design tokens — premium, sade, hiyerarşik ────────────────────────────────
const K = {
  WIDTH:     172,

  // Tek noktadan ölçü kontratı
  LOCK_H:    54,            // Düzenleme — en baskın
  ACTION_H:  36,            // PDF / Mail / Kaydet
  BTN_H:     32,            // Resim Ekle
  STATUS_H:  24,            // Durum chip
  SQUARE_H:  56,            // Finans kare
  BTN_R:     8,
  STATUS_R:  6,
  LOCK_R:    11,
  SQUARE_R:  9,
  ICON:      13,

  // Shell — metalik bordo
  shellImg:   'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.08), transparent 28%), linear-gradient(145deg, #19060A 0%, #2A0B10 45%, #3A0F16 100%)',
  shellSolid: '#19060A',
  shellBdr:   '#4A1620',

  txtLabel:   'rgba(255, 247, 242, 0.55)',

  // Lock/Edit — neon yeşil
  neon:       '#39FFB6',
  neonSoft:   'rgba(57, 255, 182, 0.55)',
  neonGlow:   'rgba(57, 255, 182, 0.32)',
  neonAura1:  'rgba(57, 255, 182, 0.26)',
  neonAura2:  'rgba(57, 255, 182, 0.14)',
  neonRing:   'rgba(57, 255, 182, 0.20)',
  lkEdBg:     'rgba(57, 255, 182, 0.20)',
  lkEdBdr:    'rgba(57, 255, 182, 0.55)',
  lkLkBg:     '#24090E',
  lkLkBdr:    '#3A1318',
  lkLkIco:    '#CFA8A0',
  lkLkTxt:    '#F4C9B8',
} as const;

const DURUM_LABELS: Record<TeklifDurum, string> = {
  taslak: 'Taslak', hazir: 'Hazır', gonderildi: 'Gönd.',
  onaylandi: 'Onay', iptal: 'İptal',
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
  onPdfIndir:                     () => void;
  onEMailGonder:                  () => void;
  onKaydet:                       () => void;
  uretiliyor:                     boolean;
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
  onPdfIndir, onEMailGonder, onKaydet, uretiliyor,
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
        overflow:      'hidden auto',
        pointerEvents: 'auto',
      }}>
      <style>{`
        .kp-lock, .kp-btn, .kp-square {
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease,
                      box-shadow 0.18s ease, transform 0.10s ease, filter 0.18s ease,
                      text-shadow 0.18s ease;
          position: relative;
        }

        /* Pasif baz — sade */
        .kp-btn, .kp-square {
          background: rgba(255, 247, 242, 0.045);
          border: 1px solid rgba(255, 247, 242, 0.10);
          color: #FFF7F2;
        }

        /* Aktif baz */
        .kp-btn[data-on="true"],
        .kp-square[data-on="true"] {
          background: rgba(255, 247, 242, 0.14);
          border-color: rgba(255, 247, 242, 0.36);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            inset 0 -2px 5px rgba(0,0,0,0.22),
            0 4px 14px rgba(0,0,0,0.30);
        }

        /* Variant — view (KDV/İskonto) amber */
        .kp-btn[data-on="true"][data-variant="view"],
        .kp-square[data-on="true"][data-variant="view"] {
          background: rgba(255, 215, 150, 0.18);
          border-color: rgba(255, 215, 150, 0.44);
          color: #FFF0D2;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(255,215,150,0.22),
            0 0 22px rgba(255,215,150,0.10);
        }
        /* Variant — row (Satır*) violet */
        .kp-btn[data-on="true"][data-variant="row"],
        .kp-square[data-on="true"][data-variant="row"] {
          background: rgba(180, 135, 255, 0.18);
          border-color: rgba(180, 135, 255, 0.44);
          color: #EFE2FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(180,135,255,0.24),
            0 0 22px rgba(180,135,255,0.10);
        }
        /* Variant — save green */
        .kp-btn[data-on="true"][data-variant="save"] {
          background: rgba(65, 210, 120, 0.18);
          border-color: rgba(65, 210, 120, 0.46);
          color: #B9FFD0;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(65,210,120,0.24),
            0 0 22px rgba(65,210,120,0.12);
        }
        /* Variant — pdf blue */
        .kp-btn[data-on="true"][data-variant="pdf"] {
          background: rgba(118, 172, 255, 0.18);
          border-color: rgba(118, 172, 255, 0.46);
          color: #D8E8FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(118,172,255,0.24),
            0 0 22px rgba(118,172,255,0.12);
        }
        /* Variant — cancel red */
        .kp-btn[data-on="true"][data-variant="cancel"] {
          background: rgba(255, 95, 95, 0.18);
          border-color: rgba(255, 95, 95, 0.44);
          color: #FFD6D6;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(255,95,95,0.22),
            0 0 22px rgba(255,95,95,0.10);
        }
        /* Variant — settings violet */
        .kp-btn[data-on="true"][data-variant="settings"] {
          background: rgba(180, 135, 255, 0.18);
          border-color: rgba(180, 135, 255, 0.44);
          color: #EFE2FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 0 14px rgba(180,135,255,0.24),
            0 0 22px rgba(180,135,255,0.10);
        }

        /* Action button (PDF/Mail/Kaydet) — varsayılan dolu zemin */
        .kp-action {
          background: rgba(118, 172, 255, 0.10);
          border-color: rgba(118, 172, 255, 0.30);
          color: #D8E8FF;
        }
        .kp-action[data-variant="save"] {
          background: rgba(65, 210, 120, 0.10);
          border-color: rgba(65, 210, 120, 0.30);
          color: #B9FFD0;
        }
        .kp-action[data-variant="mail"] {
          background: rgba(255, 215, 150, 0.10);
          border-color: rgba(255, 215, 150, 0.30);
          color: #FFF0D2;
        }
        .kp-action:hover {
          background: rgba(118, 172, 255, 0.20);
          border-color: rgba(118, 172, 255, 0.50);
        }
        .kp-action[data-variant="save"]:hover {
          background: rgba(65, 210, 120, 0.20);
          border-color: rgba(65, 210, 120, 0.50);
        }
        .kp-action[data-variant="mail"]:hover {
          background: rgba(255, 215, 150, 0.20);
          border-color: rgba(255, 215, 150, 0.50);
        }
        .kp-action:disabled {
          opacity: 0.45;
          cursor: not-allowed !important;
        }

        /* Değer etiketi (örn. "%20") */
        .kp-val {
          opacity: 0.92;
          font-size: 10px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
        }

        /* Hover */
        .kp-lock:hover  { filter: brightness(1.10); }
        .kp-lock:active { transform: translateY(1px); filter: brightness(0.92); }
        .kp-btn:hover, .kp-square:hover { filter: brightness(1.10); }
        .kp-btn:active, .kp-square:active { transform: translateY(1px); filter: brightness(0.95); }

        .kp-rate::-webkit-inner-spin-button,
        .kp-rate::-webkit-outer-spin-button { opacity: 0; }
        .kp-rate:focus { border-color: rgba(255,247,242,0.36) !important; outline: none; }
      `}</style>

      <div style={{
        padding:       '11px 11px 12px',
        display:       'flex',
        flexDirection: 'column',
      }}>

        {/* ══ 1. DÜZENLEME — En baskın buton ══ */}
        <button
          type="button"
          className="kp-lock"
          onClick={() => onReadOnlyDegistir(!readOnly)}
          style={{
            width:          '100%',
            height:         K.LOCK_H,
            borderRadius:   K.LOCK_R,
            background:     readOnly ? K.lkLkBg : K.lkEdBg,
            border:         `1.5px solid ${readOnly ? K.lkLkBdr : K.lkEdBdr}`,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            3,
            cursor:         'pointer',
            outline:        'none',
            padding:        0,
            marginBottom:   2,
            boxShadow:      readOnly
              ? 'inset 0 2px 5px rgba(0,0,0,0.4)'
              : `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px ${K.neonRing}, 0 0 18px ${K.neonAura1}, 0 0 28px ${K.neonAura2}`,
          }}
        >
          <span style={{
            fontSize: 18, lineHeight: 1, display: 'inline-flex',
            color: readOnly ? K.lkLkIco : K.neon,
            textShadow: readOnly
              ? undefined
              : `0 0 6px ${K.neonSoft}, 0 0 12px ${K.neonGlow}`,
          }}>
            {readOnly ? <LockOutlined /> : <UnlockOutlined />}
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', lineHeight: 1,
            color: readOnly ? K.lkLkTxt : K.neon,
            textShadow: readOnly
              ? undefined
              : `0 0 5px ${K.neonSoft}, 0 0 10px ${K.neonGlow}`,
          }}>
            {readOnly ? 'Kilitli' : 'Düzenleme'}
          </span>
        </button>

        <Divider />

        {/* ══ 2. ANA İŞLEMLER ══ */}
        <SecLabel text="Ana İşlemler" />
        <ActionBtn
          label="PDF Oluştur"
          icon={<FilePdfOutlined />}
          variant="pdf"
          onClick={onPdfIndir}
          disabled={uretiliyor}
        />
        <div style={{ height: 4 }} />
        <ActionBtn
          label="E-posta Gönder"
          icon={<MailOutlined />}
          variant="mail"
          onClick={onEMailGonder}
          disabled={uretiliyor}
        />
        <div style={{ height: 4 }} />
        <ActionBtn
          label="Kaydet"
          icon={<SaveOutlined />}
          variant="save"
          onClick={onKaydet}
          disabled={uretiliyor}
        />

        <Divider />

        {/* ══ 3. BELGE — Resim Ekle ══ */}
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

        {/* ══ 4. FİNANSAL — 2x2 kare grid ══ */}
        <SecLabel text="Finansal" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
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
            label="Satır İsk."
            on={satirBazliIskonto}
            variant="row"
            onClick={() => onSatirBazliIskontoDegistir(!satirBazliIskonto)}
          />
          <SquareToggle
            label="Satır PB"
            on={satirBazliParaBirimi}
            variant="row"
            onClick={() => onSatirBazliParaBirimiDegistir(!satirBazliParaBirimi)}
          />
        </div>

        {/* İskonto rate input — aktifken grid altında */}
        {iskOn && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            marginTop: 6,
            padding: '6px 10px',
            background: 'rgba(255, 215, 150, 0.06)',
            borderRadius: K.BTN_R,
            border: '1px solid rgba(255, 215, 150, 0.26)',
          }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,240,210,0.78)', flex: 1, fontWeight: 600 }}>
              İsk. Oran
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
                width: 48, height: 22, borderRadius: 5,
                background: 'rgba(0,0,0,0.28)',
                border: '1px solid rgba(255, 215, 150, 0.30)',
                color: '#FFF0D2', fontSize: '11px', fontWeight: 700,
                textAlign: 'center', padding: '0 4px',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            <span style={{ fontSize: '10px', color: '#FFF0D2', fontWeight: 600 }}>%</span>
          </div>
        )}

        <Divider />

        {/* ══ 5. DURUM — yardımcı, alt ══ */}
        <SecLabel text="Durum" />
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 4,
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
        borderRadius: K.SQUARE_R,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: '0 4px',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <span style={{
        fontSize: '11px',
        fontWeight: on ? 700 : 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      {value && (
        <span className="kp-val" style={{ lineHeight: 1 }}>{value}</span>
      )}
    </button>
  );
}

// ── Ana işlem aksiyon butonu ───────────────────────────────────────────────────
function ActionBtn({
  label, icon, variant, onClick, disabled,
}: {
  label: string;
  icon: React.ReactNode;
  variant: 'pdf' | 'mail' | 'save';
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="kp-action"
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height: K.ACTION_H,
        borderRadius: K.BTN_R,
        border: '1px solid transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '0 10px',
        cursor: 'pointer',
        outline: 'none',
        transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease, filter 0.18s ease',
      }}
    >
      <span style={{ fontSize: K.ICON, lineHeight: 1, display: 'inline-flex' }}>{icon}</span>
      <span style={{ fontSize: '11px', fontWeight: 600, lineHeight: 1 }}>{label}</span>
    </button>
  );
}
