/**
 * KumandaPaneli — 3 net grup, sade tek-kaynak tasarım sistemi.
 *
 * GRUPLAR (sıra zorunlu):
 *   1) DÜZENLEME       → Düzenleme (özel) + Resim Ekle (action, toggle DEĞİL)
 *   2) SATIR AYARLARI  → Satır Bazlı İskonto, Satır Bazlı Para Birimi (toggle, row variant)
 *   3) GENEL FİNANS    → Katma Değer Vergisi, İskonto (+ İskonto Oranı input) (toggle, view variant)
 *
 * SINIFLAR (4 yapı taşı):
 *   .kp-edit    — Düzenleme (neon yeşil glow özel)
 *   .kp-action  — Aksiyon butonu (Resim Ekle) — TOGGLE DEĞİL, hover-only
 *   .kp-toggle  — Toggle (data-on="true" + data-variant="view|row")
 *   .kp-rate    — Inline rate input
 */
import { useRef, useState } from 'react';
import { LockOutlined, UnlockOutlined, PictureOutlined } from '@ant-design/icons';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;

// ── Design tokens ────────────────────────────────────────────────────────────
const K = {
  WIDTH:     220,            // full label "Satır Bazlı Para Birimi" tek satıra sığar
  PANEL_PAD: 12,
  GROUP_GAP: 14,
  ITEM_GAP:  6,
  // ── Üst hiza ──────────────────────────────────────────────────────
  // Referans: A4 sayfasının üst kenarı — BİREBİR HİZALI.
  //   BelgeToolbar height 56px + borderBottom 1px = 57px
  //   Belge alanı padding-top: 40px
  //   ⇒ A4 üst kenarı viewport'tan 97px
  // Panel top = A4 top = 97px. Tek referans, sabit değer.
  // position: fixed → scroll değişiminden etkilenmez.
  TOP:       97,
  // Kısa ekran güvenliği: panel ekranı taşmasın, scrollbar EKLEMEDEN clip edilsin.
  // 108 (top) + 24 (alt nefes) = 132px → max yükseklik kalan kadar.
  BOTTOM_GAP: 24,

  EDIT_H:    64,
  ACTION_H:  36,
  TOGGLE_H:  36,
  RATE_H:    30,
  EDIT_R:    12,
  BTN_R:     8,

  // ── Konum geometrisi ─────────────────────────────────────────────
  // A4 = 210mm = 793.7px. A4 yarı: 396.85px (50%'den itibaren).
  // Panel A4'ün sağına 32px boşlukla oturur:
  //   panel_right_offset = 50% - (A4_half + PANEL_W + GAP)
  //                      = 50% - (397 + 220 + 32) = 50% - 649px
  // Ekran kenarına min 24px nefes payı.
  EDGE_MIN:    24,
  RIGHT_CLOSED_OFFSET: 649,  // sağ panel kapalıyken A4 sağına yapışmasın
  // SagPanel = 360px, ondan 16px boşlukla solda dur.
  RIGHT_OPEN_OFFSET:   376,  // 360 + 16

  // Shell (metalik bordo)
  shellImg:   'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.07), transparent 30%), linear-gradient(150deg, #1A0A0F 0%, #2A0E14 50%, #38121A 100%)',
  shellSolid: '#1A0A0F',
  shellBdr:   '#4A1A22',

  txtLabel:   'rgba(255, 247, 242, 0.50)',

  // Düzenleme — neon yeşil
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

// ── Section label ─────────────────────────────────────────────────────────────
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

// ── Props ─────────────────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
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

  const kdvOn = kdvOrani     > 0;
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
        top: K.TOP,
        // Sağ panel kapalı → A4 sağına 32px boşlukla yerleş (overlap YOK).
        // Sağ panel açık   → SagPanel'in 16px soluna yerleş.
        // Her iki durumda ekran kenarına min 24px boşluk.
        right: sagPanelOpen
          ? `${K.RIGHT_OPEN_OFFSET}px`
          : `max(${K.EDGE_MIN}px, calc(50% - ${K.RIGHT_CLOSED_OFFSET}px))`,
        width: K.WIDTH,
        // Kısa ekran güvenliği: panel ekrana sığar, scrollbar OLMADAN clip edilir.
        maxHeight: `calc(100vh - ${K.TOP + K.BOTTOM_GAP}px)`,
        zIndex: 80,
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
        overflow: 'hidden',                     // SCROLL YASAK
      }}>
      <style>{`
        .kp-edit, .kp-action, .kp-toggle {
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease,
                      box-shadow 0.18s ease, transform 0.10s ease, filter 0.18s ease,
                      text-shadow 0.18s ease;
          font-family: inherit;
          position: relative;
        }
        .kp-edit:active, .kp-action:active, .kp-toggle:active { transform: translateY(1px); filter: brightness(0.95); }

        /* ── ACTION (Resim Ekle) — sky-blue accent, toggle'lardan AYRI ── */
        /* Bilinçli olarak Satır Ayarları (violet) ve Genel Finans (amber) ile
           HİÇBİR ortak rengi paylaşmaz; aksiyon olduğu görsel olarak okunur. */
        .kp-action {
          background: linear-gradient(180deg, rgba(56, 189, 248, 0.16), rgba(14, 165, 233, 0.12));
          border: 1px solid rgba(56, 189, 248, 0.42);
          color: #BAE6FD;
          cursor: pointer;
        }
        .kp-action:hover {
          background: linear-gradient(180deg, rgba(56, 189, 248, 0.26), rgba(14, 165, 233, 0.20));
          border-color: rgba(56, 189, 248, 0.62);
          filter: brightness(1.06);
        }

        /* ── TOGGLE (KDV / İskonto / Satır*) ── */
        .kp-toggle {
          background: rgba(255, 247, 242, 0.045);
          border: 1px solid rgba(255, 247, 242, 0.10);
          color: #FFF7F2;
          cursor: pointer;
        }
        .kp-toggle:hover { filter: brightness(1.10); }

        /* Aktif baz */
        .kp-toggle[data-on="true"] {
          background: rgba(255, 247, 242, 0.14);
          border-color: rgba(255, 247, 242, 0.36);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            inset 0 -2px 5px rgba(0,0,0,0.22),
            0 4px 14px rgba(0,0,0,0.30);
        }
        /* view variant — amber (KDV/İskonto aktif) */
        .kp-toggle[data-on="true"][data-variant="view"] {
          background: rgba(255, 215, 150, 0.18);
          border-color: rgba(255, 215, 150, 0.46);
          color: #FFF0D2;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -1px 6px rgba(0,0,0,0.18),
            0 0 16px rgba(255,215,150,0.22),
            0 0 24px rgba(255,215,150,0.10);
        }
        /* row variant — violet (Satır* aktif) */
        .kp-toggle[data-on="true"][data-variant="row"] {
          background: rgba(180, 135, 255, 0.18);
          border-color: rgba(180, 135, 255, 0.46);
          color: #EFE2FF;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -1px 6px rgba(0,0,0,0.18),
            0 0 16px rgba(180,135,255,0.24),
            0 0 24px rgba(180,135,255,0.10);
        }

        /* Değer etiketi (örn. "%20") — bilgi, durum DEĞİL */
        .kp-val {
          opacity: 0.92;
          font-size: 11px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          line-height: 1;
          flex-shrink: 0;
        }

        /* Düzenleme hover */
        .kp-edit:hover { filter: brightness(1.10); }

        /* Rate input */
        .kp-rate::-webkit-inner-spin-button,
        .kp-rate::-webkit-outer-spin-button { opacity: 0; }
        .kp-rate:focus { border-color: rgba(255,247,242,0.40) !important; outline: none; }
      `}</style>

      <div style={{ padding: K.PANEL_PAD }}>

        {/* ══════════════════════════════════════════════════════════════════
           1. DÜZENLEME
           ══════════════════════════════════════════════════════════════════ */}
        <SecLabel text="Düzenleme" />

        {/* Düzenleme — en baskın */}
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
            gap:            4,
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
            textShadow: readOnly ? undefined : `0 0 6px ${K.neonSoft}, 0 0 14px ${K.neonGlow}`,
          }}>
            {readOnly ? <LockOutlined /> : <UnlockOutlined />}
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em',
            textTransform: 'uppercase', lineHeight: 1,
            color: readOnly ? K.lkLkTxt : K.neon,
            textShadow: readOnly ? undefined : `0 0 5px ${K.neonSoft}, 0 0 12px ${K.neonGlow}`,
          }}>
            {readOnly ? 'Kilitli' : 'Düzenleme'}
          </span>
        </button>

        {/* Resim Ekle — AKSİYON (toggle DEĞİL) */}
        <button
          type="button"
          className="kp-action"
          onClick={onResimSec}
          style={{
            width: '100%', height: K.ACTION_H, borderRadius: K.BTN_R,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '0 10px', outline: 'none',
          }}
        >
          <PictureOutlined style={{ fontSize: 13 }} />
          <span style={{ fontSize: '11px', fontWeight: 600, lineHeight: 1 }}>Resim Ekle</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        <div style={{ height: K.GROUP_GAP }} />

        {/* ══════════════════════════════════════════════════════════════════
           2. SATIR AYARLARI — kare 2-kolon grid (toggle, row variant)
           ══════════════════════════════════════════════════════════════════ */}
        <SecLabel text="Satır Ayarları" />
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: K.ITEM_GAP,
        }}>
          <SquareToggle
            label="Satır Bazlı İskonto"
            on={satirBazliIskonto}
            variant="row"
            onClick={() => onSatirBazliIskontoDegistir(!satirBazliIskonto)}
          />
          <SquareToggle
            label="Satır Bazlı Para Birimi"
            on={satirBazliParaBirimi}
            variant="row"
            onClick={() => onSatirBazliParaBirimiDegistir(!satirBazliParaBirimi)}
          />
        </div>

        <div style={{ height: K.GROUP_GAP }} />

        {/* ══════════════════════════════════════════════════════════════════
           3. GENEL FİNANS — kare 2-kolon grid (toggle, view variant)
           ══════════════════════════════════════════════════════════════════ */}
        <SecLabel text="Genel Finans" />
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: K.ITEM_GAP,
        }}>
          <SquareToggle
            label="Katma Değer Vergisi"
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
        </div>

        {/* İskonto Oranı — yalnız iskonto aktifken */}
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
            <span style={{ fontSize: '10.5px', color: 'rgba(255,240,210,0.80)', flex: 1, fontWeight: 600, lineHeight: 1 }}>
              İskonto Oranı
            </span>
            <input
              type="number"
              className="kp-rate"
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
            <span style={{ fontSize: '10.5px', color: '#FFF0D2', fontWeight: 600, lineHeight: 1 }}>%</span>
          </div>
        )}

      </div>
      </div>
    </div>
  );
}

// ── SquareToggle (KDV / İskonto / Satır*) — kare grid butonu ──────────────────
// Etiket çok satıra sarar, ortalanmış. Aktifken altta value (%XX) görünür.
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
      className="kp-toggle"
      data-on={on}
      data-variant={variant}
      onClick={onClick}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        // aspectRatio fallback (eski tarayıcılar için): yaklaşık kare yükseklik
        minHeight: 72,
        borderRadius: K.BTN_R,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: value ? 4 : 0,
        padding: '4px 6px',
        outline: 'none',
      }}
    >
      <span style={{
        fontSize: '10.5px',
        fontWeight: on ? 700 : 600,
        lineHeight: 1.15,
        textAlign: 'center',
        whiteSpace: 'normal',
        overflowWrap: 'normal',
        wordBreak: 'normal',
        letterSpacing: '0.01em',
      }}>
        {label}
      </span>
      {value && <span className="kp-val">{value}</span>}
    </button>
  );
}
