import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  PremiumEditIcon,
  PremiumImageIcon,
  PremiumRowDiscountIcon,
  PremiumRowCurrencyIcon,
  PremiumKdvIcon,
  PremiumDiscountIcon,
  PremiumVisibilityIcon,
} from './premium-icons';
import type { SatirGrupRenk } from '../types';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;

// Grup renkleri — kurumsal yumuşak, sıcak → soğuk dağılım.
const SATIR_GRUP_RENK_DONGUSU: SatirGrupRenk[] = ['amber', 'mint', 'sky', 'lavender'];
const SATIR_GRUP_RENK_ETIKETI: Record<SatirGrupRenk, string> = {
  amber: 'Kehribar',
  mint: 'Mint',
  sky: 'Mavi',
  lavender: 'Mor',
};
// Dialog'taki swatch görseli için zemin + border (yumuşak premium ton).
const SATIR_GRUP_RENK_SWATCH: Record<SatirGrupRenk, { bg: string; border: string }> = {
  amber:    { bg: '#fff8eb', border: '#f4bf75' },
  mint:     { bg: '#eefcf6', border: '#92ddbf' },
  sky:      { bg: '#eef5ff', border: '#9ec1f7' },
  lavender: { bg: '#f5f0ff', border: '#c5aff6' },
};

const K = {
  WIDTH: 154,
  TOP: 97,
  // BOTTOM_GAP: panel'in viewport alt kenarına olan minimum mesafesi.
  // Dev imzası kartı için (~14px bottom + ~22px height + buffer) → 44px
  // ayrılır; böylece panel bottomReach ≤ viewportH-44 < signature.top.
  BOTTOM_GAP: 44,
  EDGE_MIN: 24,
  RIGHT_CLOSED_OFFSET: 583, // 397 (A4 half) + 154 (panel) + 32 (gap)
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
  grupModuAktif: boolean;
  onGrupModuDegistir: (v: boolean) => void;
  grupRenk: SatirGrupRenk;
  onGrupRenkDegistir: (v: SatirGrupRenk) => void;
  /** Bu teklifte halihazırda kullanılmış grup renkleri — yeni grup için
   *  en farklı (kullanılmayan) renk otomatik seçimi için. */
  kullanilanGrupRenkleri: SatirGrupRenk[];
  /** Not alanının A4 görünümünde + PDF'te gösterilip gösterilmeyeceği. */
  notlarGosterilsin: boolean;
  onNotlarGosterilsinDegistir: (v: boolean) => void;
  sagPanelOpen: boolean;
  onResimEkle: (dataUrl: string) => void;
  /** Görünürlük yetkisi: 'team' = ekibe açık (toggle ON), 'private' = gizli (OFF). */
  visibility: 'private' | 'team';
  onVisibilityDegistir: (v: 'private' | 'team') => void;
}

export default function KumandaPaneli({
  readOnly, onReadOnlyDegistir,
  kdvOrani, onKdvOraniDegistir,
  iskontoOrani, onIskontoOraniDegistir,
  satirBazliParaBirimi, onSatirBazliParaBirimiDegistir,
  satirBazliIskonto, onSatirBazliIskontoDegistir,
  grupModuAktif, onGrupModuDegistir,
  grupRenk, onGrupRenkDegistir,
  kullanilanGrupRenkleri,
  notlarGosterilsin, onNotlarGosterilsinDegistir,
  sagPanelOpen, onResimEkle,
  visibility, onVisibilityDegistir,
}: KumandaPaneliProps) {
  const [lastKdv, setLastKdv] = useState(() => (kdvOrani > 0 ? kdvOrani : 20));
  const [lastIsk, setLastIsk] = useState(() => (iskontoOrani > 0 ? iskontoOrani : 10));
  const [iskontoDraft, setIskontoDraft] = useState(() => String(iskontoOrani > 0 ? iskontoOrani : 10));
  const [grupRenkPenceresiAcik, setGrupRenkPenceresiAcik] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Kilit'in altındaki tüm section'lar (Resim Ekle, Satır Ayarları,
  // Genel Finans, Paylaşım) varsayılan KAPALI. Genişletme butonuyla açılır.
  const [panelGenis, setPanelGenis] = useState(false);

  const kdvOn = kdvOrani > 0;
  const iskOn = iskontoOrani > 0;

  useEffect(() => {
    if (!iskOn) return;
    setIskontoDraft(String(iskontoOrani));
  }, [iskOn, iskontoOrani]);

  const commitIskontoDraft = () => {
    const normalized = iskontoDraft.trim().replace(',', '.');
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed)) {
      setIskontoDraft(String(iskontoOrani));
      return;
    }

    const clamped = Math.min(100, Math.max(0.5, parsed));
    const stepped = Math.round(clamped * 2) / 2;
    setLastIsk(stepped);
    onIskontoOraniDegistir(stepped);
    setIskontoDraft(String(stepped));
  };

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

  // Grup modu butonu — renk paletini açar. Pasif iken renk seçilince mod
  // aktifleşir. Aktif iken paletten yeni renk seçmek mevcut grupRenk'i
  // değiştirir; "Geri Al" seçeneği grup modunu pasif yapar.
  const handleGrupModuButonu = () => {
    setGrupRenkPenceresiAcik(true);
  };

  const handleGrupRenkSec = (renk: SatirGrupRenk) => {
    onGrupRenkDegistir(renk);
    if (!grupModuAktif) onGrupModuDegistir(true);
    setGrupRenkPenceresiAcik(false);
  };

  const handleGrupModunuKapat = () => {
    onGrupModuDegistir(false);
    setGrupRenkPenceresiAcik(false);
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

  // A4'ün konumu ölçülür → panel A4'ün üst-sağ köşesine yerleşir;
  // viewport daralırsa SCALE DOWN olur (min 0.55 — okunabilirlik sınırı).
  //
  // top = rect.top + scrollY → A4'ün DOCUMENT-MUTLAK Y'si. Sayfa scroll
  // edildiğinde rect.top azalır, scrollY aynı oranda artar; toplam sabit
  // kalır. position:fixed bu değere bağlı olduğu için panel scroll'dan
  // bağımsız olarak A4'ün ilk hizasında durmaya devam eder.
  const [pos, setPos] = useState<{ top: number; left: number; scale: number }>(
    { top: K.TOP, left: 0, scale: 1 },
  );
  const measureA4 = () => {
    const a4El = document.querySelector<HTMLElement>('.belge-screen-view');
    if (!a4El) return;
    const rect = a4El.getBoundingClientRect();
    const a4Right = Math.round(rect.right);
    const docTop = Math.round(rect.top + window.scrollY);
    const sagPanelExtra = sagPanelOpen ? K.RIGHT_OPEN_OFFSET - K.EDGE_MIN : 0;
    const desiredLeft = a4Right + 16 + sagPanelExtra;
    // Panel ile viewport arası mevcut yatay alan
    const availableWidth = window.innerWidth - desiredLeft - K.EDGE_MIN;
    const scale =
      availableWidth >= K.WIDTH
        ? 1
        : Math.max(0.55, availableWidth / K.WIDTH);
    const nextLeft = Math.max(K.EDGE_MIN, desiredLeft);
    const nextTop = docTop > 0 ? docTop : K.TOP;
    setPos((prev) =>
      prev.top === nextTop && prev.left === nextLeft && prev.scale === scale
        ? prev
        : { top: nextTop, left: nextLeft, scale },
    );
  };

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(measureA4));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sagPanelOpen]);

  useEffect(() => {
    const onResize = () => measureA4();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sagPanelOpen]);

  return (
    <div
      className="no-print"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: K.WIDTH,
        maxHeight: `calc((100vh - ${pos.top + K.BOTTOM_GAP}px) / ${pos.scale})`,
        zIndex: 80,
        pointerEvents: 'auto',
        transform: `scale(${pos.scale})`,
        transformOrigin: 'top left',
        transition: 'transform 200ms ease, left 200ms ease',
        overflow: 'visible',
      }}
    >
      <style>{`
        :root {
          --panel-scale: 0.62;
          --panel-bg-1: #1a0308;
          --panel-bg-2: #2b0610;
          --panel-bg-3: #090103;

          --panel-glow: rgba(255, 80, 110, 0.18);
          --panel-border: rgba(255, 120, 140, 0.28);
          --panel-edge-glow: rgba(255, 112, 134, 0.12);
          --panel-inner-light: rgba(255, 255, 255, 0.08);

          --panel-shadow:
            0 34px 82px rgba(5, 0, 2, 0.68),
            0 0 28px var(--panel-edge-glow),
            inset 0 1px 0 var(--panel-inner-light),
            inset 0 0 0 1px rgba(255,255,255,0.03),
            inset 0 -18px 30px rgba(0,0,0,0.34);

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
          padding: calc(16px * var(--panel-scale));
          border-radius: calc(28px * var(--panel-scale));
          color: var(--text-main);
          background:
            radial-gradient(circle at 14% -4%, rgba(255, 115, 138, 0.22), transparent 34%),
            radial-gradient(circle at 84% 4%, rgba(255, 255, 255, 0.06), transparent 26%),
            radial-gradient(circle at 50% 120%, rgba(0, 0, 0, 0.28), transparent 45%),
            linear-gradient(160deg,
              #3a0814 0%,
              var(--panel-bg-2) 24%,
              var(--panel-bg-1) 52%,
              var(--panel-bg-3) 100%
            );
          border: 1px solid var(--panel-border);
          box-shadow: var(--panel-shadow);
          overflow: hidden;
          transition:
            border-color 280ms ease,
            box-shadow 320ms ease;
        }

        /* Düzenleme aktifken (Düzenle butonu basılı): tüm panel çerçevesi
           ince yeşil neon hat olur ve dışa ışık saçar. Renkler EditPremiumIcon
           accent ailesiyle aynı (rgba 70 255 160). */
        .control-panel[data-editing="true"] {
          border: 1px solid rgba(90, 255, 175, 0.85);
          box-shadow:
            0 0 18px rgba(70, 255, 160, 0.45),
            0 0 50px rgba(70, 255, 160, 0.30),
            0 0 110px rgba(70, 255, 160, 0.18),
            inset 0 0 0 1px rgba(70, 255, 160, 0.20),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -18px 30px rgba(0, 0, 0, 0.34);
        }

        .panel-section {
          margin: 0;
        }

        .panel-section + .panel-section {
          margin-top: calc(14px * var(--panel-scale));
          padding-top: calc(12px * var(--panel-scale));
          border-top: 1px solid rgba(255, 111, 132, 0.18);
        }

        .panel-title {
          margin: 0 0 calc(10px * var(--panel-scale));
          font-size: calc(11px * var(--panel-scale));
          letter-spacing: 0.18em;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-soft);
          user-select: none;
        }

        .control-panel button {
          cursor: pointer;
          font-family: inherit;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          backdrop-filter: blur(0px);
          -webkit-backdrop-filter: blur(0px);
          transition:
            transform 180ms ease,
            box-shadow 220ms ease,
            filter 180ms ease,
            border-color 180ms ease,
            color 180ms ease,
            text-shadow 180ms ease,
            background 220ms ease,
            backdrop-filter 220ms ease,
            -webkit-backdrop-filter 220ms ease;
          will-change: transform, box-shadow, backdrop-filter;
        }

        /* ── Kilit kapalıyken (readOnly): tüm tuşlar pasif ──
           Lock butonu HARİÇ — onun disabled prop'u verilmediği için her zaman
           tıklanabilir. Native :disabled tıklamayı tamamen engeller; CSS ile
           soluk + cursor not-allowed feedback. */
        .control-panel button:disabled {
          opacity: 0.32;
          cursor: not-allowed;
          filter: grayscale(0.4);
          pointer-events: none;
        }
        .control-panel button:disabled:hover,
        .control-panel button:disabled:active {
          transform: none;
          background: inherit;
          box-shadow: none;
          backdrop-filter: blur(0px);
          -webkit-backdrop-filter: blur(0px);
        }
        .control-panel input.kp-rate:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* Default karakter — .control-panel'e konuldu (en düşük specificity).
           Per-buton class'lar (.button-tax vb.) bunu rahatça override eder. */
        .control-panel {
          --button-accent: rgba(255, 105, 135, 0.95);
          --button-glow:   rgba(255, 105, 135, 0.28);
        }

        /* ── Per-buton karakter renk paleti ──────────────────────────── */
        /* .control-panel button. prefix ile specificity (0,2,1) →
           .control-panel button (0,1,1) override edilir. */
        /* Kurumsal muted palette — oyuncak neon yerine ciddi tonlar.
           Lock butonu özel: is-editing/is-locked class'larıyla güçlü
           ışık alır (yeşil/kırmızı), diğer butonlardan ayrışır. */
        .control-panel button.button-image        { --button-accent: #6f8fbf; --button-glow: rgba(111, 143, 191, 0.30); }
        /* Pembe → kurumsal şarap kırmızısı */
        .control-panel button.button-row-discount { --button-accent: #d94f64; --button-glow: rgba(217,  79, 100, 0.32); }
        /* Purple → kurumsal teal/petrol mavisi */
        .control-panel button.button-row-currency { --button-accent: #3fb7a3; --button-glow: rgba( 63, 183, 163, 0.30); }
        .control-panel button.button-row-group    { --button-accent: #7b8cf0; --button-glow: rgba(123, 140, 240, 0.30); }
        .control-panel button.button-tax          { --button-accent: #d8a24f; --button-glow: rgba(216, 162,  79, 0.30); }
        .control-panel button.button-discount     { --button-accent: #c46f48; --button-glow: rgba(196, 111,  72, 0.28); }
        /* Görünürlük (Paylaşım) — kurumsal slate-mavi (göz ikonu) */
        .control-panel button.button-visibility   { --button-accent: #6b8ba6; --button-glow: rgba(107, 139, 166, 0.28); }

        .group-color-dialog-overlay {
          position: fixed;
          inset: 0;
          background: rgba(8, 5, 10, 0.48);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          z-index: 150;
          display: grid;
          place-items: center;
          padding: 18px;
        }

        .group-color-dialog {
          width: min(420px, calc(100vw - 30px));
          border-radius: 18px;
          border: 1px solid rgba(167, 139, 250, 0.45);
          background:
            radial-gradient(circle at 24% 0%, rgba(124, 58, 237, 0.22), transparent 45%),
            linear-gradient(180deg, rgba(40, 14, 58, 0.95), rgba(20, 7, 30, 0.98));
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.55),
            0 0 34px rgba(167, 139, 250, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          padding: 18px;
          color: var(--text-main);
        }

        .group-color-dialog__title {
          margin: 0 0 6px;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .group-color-dialog__hint {
          margin: 0 0 14px;
          color: rgba(255, 220, 215, 0.82);
          font-size: 12px;
        }

        .group-color-dialog__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .group-color-option {
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 12px 10px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .group-color-option.is-selected {
          border-color: rgba(255, 255, 255, 0.55);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.18),
            0 0 20px rgba(167, 139, 250, 0.24);
        }

        .group-color-option__swatch {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          flex-shrink: 0;
          border: 1px solid transparent;
        }

        .group-color-option__name {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .group-color-dialog__actions {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .group-color-dialog__action {
          flex: 1;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-main);
          height: 38px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .group-color-dialog__action.close {
          border-color: rgba(148, 163, 184, 0.5);
        }

        .group-color-dialog__action.disable {
          border-color: rgba(248, 113, 113, 0.55);
          background: rgba(239, 68, 68, 0.16);
        }

        /* Lock state vars — yeşil (editing) / kırmızı (locked) güçlü neon */
        .control-panel button.lock-button.is-editing {
          --button-accent: #42ff9b;
          --button-glow:   rgba( 66, 255, 155, 0.62);
        }
        .control-panel button.lock-button.is-locked {
          --button-accent: #ff3f5f;
          --button-glow:   rgba(255,  63,  95, 0.62);
        }

        /* ── Aktif / basılı: saydam cam + neon karakter ──────────────────
           backdrop-filter ile ardalan bulanıklaşır; gradient bg color-mix
           ile karakter rengine hafif boyanır; içte beyaz highlight + altta
           derinlik gölgesi. Buton tek renge boyanmaz; ışık içten yayılır. */
        /* Aktif/basılı: kurumsal — karakter rengi netleşir, arka plan
           bağırmaz. Dark bordo gradient + ince radyal character glow. */
        .control-panel button.is-active,
        .control-panel button:active {
          color: var(--button-accent);
          border-color: color-mix(in srgb, var(--button-accent) 70%, transparent);
          background:
            radial-gradient(
              circle at 50% 35%,
              color-mix(in srgb, var(--button-glow) 22%, transparent),
              transparent 62%
            ),
            linear-gradient(180deg, rgba(65, 16, 26, 0.78), rgba(18, 4, 9, 0.88));
          box-shadow:
            0 0 20px color-mix(in srgb, var(--button-glow) 45%, transparent),
            inset 0 0 22px color-mix(in srgb, var(--button-glow) 20%, transparent),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        /* ── Panel genişlet/kapat (chevron toggle) — lock'un altında, sade ── */
        .panel-expand-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: calc(20px * var(--panel-scale));
          margin-top: calc(6px * var(--panel-scale));
          padding: 0;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: calc(8px * var(--panel-scale));
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 220, 215, 0.55);
          opacity: 0.85;
        }
        .panel-expand-toggle:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 220, 215, 0.85);
          border-color: rgba(255, 255, 255, 0.18);
          opacity: 1;
        }

        /* ── Lock butonu özel: yeşil (editing) / kırmızı (locked) güçlü neon
           Diğer butonlardan ÇOK daha parlak ve net. Specificity (0,3,1) +
           class kombinasyonu — generic .is-active'i (0,2,1) override eder. */
        .control-panel button.lock-button.is-editing {
          color: var(--button-accent);
          border-color: rgba(66, 255, 155, 0.95);
          background:
            radial-gradient(
              circle at 50% 35%,
              rgba(66, 255, 155, 0.18),
              transparent 65%
            ),
            linear-gradient(180deg, rgba(20, 50, 35, 0.78), rgba(8, 22, 14, 0.88));
          box-shadow:
            0 0 24px rgba(66, 255, 155, 0.55),
            0 0 64px rgba(66, 255, 155, 0.28),
            inset 0 0 26px rgba(66, 255, 155, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .control-panel button.lock-button.is-locked {
          color: var(--button-accent);
          border-color: rgba(255, 63, 95, 0.95);
          background:
            radial-gradient(
              circle at 50% 35%,
              rgba(255, 63, 95, 0.18),
              transparent 65%
            ),
            linear-gradient(180deg, rgba(60, 18, 26, 0.78), rgba(22, 6, 11, 0.88));
          box-shadow:
            0 0 24px rgba(255, 63, 95, 0.55),
            0 0 64px rgba(255, 63, 95, 0.28),
            inset 0 0 26px rgba(255, 63, 95, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        /* Lock butonu ikonu — strong glow filter (her iki state'te) */
        .control-panel button.lock-button.is-editing .premium-panel-icon,
        .control-panel button.lock-button.is-locked  .premium-panel-icon {
          filter:
            drop-shadow(0 2px 2px rgba(255, 255, 255, 0.14))
            drop-shadow(0 8px 16px rgba(0, 0, 0, 0.42))
            drop-shadow(0 0 20px var(--button-glow));
        }

        /* ── Premium filled-symbol ikon ailesi ──
           Yarı dolgulu ana form (.pi-body) + ince stroke 1.7 + iç sembol
           (.pi-glyph stroke 2 / .pi-detail filled accent). Çizgi ikon, neon
           tüp, emoji yok. Apple/Tesla tarzı kurumsal anlam-yoğun pictogram.
           Boyutlar --panel-scale ile orantılı → panel küçüldükçe ikon da
           küçülür, butonun içinde her zaman uygun nefes payıyla durur. */
        .premium-panel-icon {
          width: calc(68px * var(--panel-scale));
          height: calc(68px * var(--panel-scale));
          color: var(--button-accent);
          flex-shrink: 0;
          filter:
            drop-shadow(0 1px 1px rgba(255, 255, 255, 0.10))
            drop-shadow(0 5px 10px rgba(0, 0, 0, 0.32));
          transition: filter 220ms ease;
        }

        /* Ana yarı dolgulu form — saydam karakter rengi + ince stroke kenar */
        .premium-panel-icon .pi-body {
          fill: color-mix(in srgb, var(--button-accent) 18%, rgba(255, 255, 255, 0.04));
          stroke: color-mix(in srgb, var(--button-accent) 82%, rgba(255, 255, 255, 0.08));
          stroke-width: 1.7;
          stroke-linejoin: round;
        }

        /* İç dolu accent — küçük saturate parça (anahtar deliği, dağ, vb.) */
        .premium-panel-icon .pi-detail {
          fill: color-mix(in srgb, var(--button-accent) 75%, white 8%);
          stroke: none;
        }

        /* İç sembol/glyph — iskeletsel net çizgi (% diagonal, plus, ₺) */
        .premium-panel-icon .pi-glyph {
          fill: none;
          stroke: color-mix(in srgb, var(--button-accent) 88%, white 8%);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* KDV wordmark text — fill solid accent, stroke yok */
        .premium-panel-icon .pi-text {
          font-family: -apple-system, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.06em;
          fill: color-mix(in srgb, var(--button-accent) 90%, white 6%);
          stroke: none;
        }

        /* Buton-bazlı ikon boyutları — hepsi --panel-scale ile orantılı.
           Notional değerler scale=1 referansı; her ikon kendi butonunda
           içeride ~%70-80 doluluk ile durur, ~2-4px nefes payı kalır. */
        .lock-button .premium-panel-icon { width: calc(70px * var(--panel-scale)); height: calc(70px * var(--panel-scale)); }
        .image-add  .premium-panel-icon { width: calc(36px * var(--panel-scale)); height: calc(36px * var(--panel-scale)); }
        /* Kare butonlarda etiket yok — ikon ortalı + parent flex gap'i value
           ile arada boşluk yönetir. */
        .square-btn .premium-panel-icon { width: calc(70px * var(--panel-scale)); height: calc(70px * var(--panel-scale)); }

        /* Aktif/basılı — daha parlak + daha canlı + per-buton renkte hafif
           glow halesi. Neon değil; kurumsal yoğunlaşma. */
        .control-panel button.is-active .premium-panel-icon,
        .control-panel button:active .premium-panel-icon {
          filter:
            drop-shadow(0 2px 2px rgba(255, 255, 255, 0.12))
            drop-shadow(0 8px 16px rgba(0, 0, 0, 0.38))
            drop-shadow(0 0 16px color-mix(in srgb, var(--button-glow) 45%, transparent));
        }

        /* press-glow (premiumPressGlow keyframe) için per-buton renk */
        .control-panel button { --press-glow: var(--button-glow); }

        /* Hover — hafif cam hissi + per-buton renkte saydam glow */
        .control-panel button:hover {
          transform: translateY(-2px);
          filter: brightness(1.08) saturate(1.08);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          background:
            linear-gradient(
              160deg,
              rgba(255,255,255,0.04),
              rgba(255,255,255,0.01)
            );
          box-shadow:
            0 14px 32px rgba(0, 0, 0, 0.42),
            0 0 20px color-mix(in srgb, var(--button-glow) 28%, transparent),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }

        /* Pressed — fiziksel buton hissi: hafif içeri bas + scale */
        .control-panel button:active {
          transform: translateY(2px) scale(0.975);
          filter: brightness(0.96);
        }

        /* Cam üst highlight overlay — pasifte görünmez, aktif/basılı durumda
           üstte yumuşak cam parlaması olarak belirir (opacity 0 → 0.55). */
        .control-panel button::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,0.25),
              rgba(255,255,255,0.06) 35%,
              rgba(255,255,255,0.02) 60%
            );
          z-index: 1;
          transition: opacity 220ms ease;
        }

        .control-panel button.is-active::before,
        .control-panel button:active::before {
          opacity: 0.55;
        }

        .control-panel button > * {
          position: relative;
          z-index: 2;
        }

        .control-panel button .button-sweep {
          position: absolute;
          top: -40%;
          left: -80%;
          width: 45%;
          height: 180%;
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(255,255,255,0.04) 35%,
            rgba(255,255,255,0.16) 50%,
            rgba(255,255,255,0.04) 65%,
            transparent 100%
          );
          transform: rotate(8deg);
          opacity: 0;
          pointer-events: none;
          z-index: 1;
        }

        .control-panel button::after {
          content: "";
          position: absolute;
          inset: -18px;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          z-index: 0;
          background: radial-gradient(circle, var(--press-glow, rgba(255, 90, 120, 0.35)) 0%, transparent 62%);
          transform: scale(0.72);
        }

        .control-panel button:active::after {
          animation: premiumPressGlow 520ms ease-out forwards;
        }

        .control-panel button:hover .button-sweep {
          animation: premiumLightSweep 900ms ease-out forwards;
        }

        @keyframes premiumPressGlow {
          0% {
            opacity: 0;
            transform: scale(0.65);
            filter: blur(2px);
          }
          35% {
            opacity: 1;
            transform: scale(1.05);
            filter: blur(6px);
          }
          100% {
            opacity: 0;
            transform: scale(1.38);
            filter: blur(14px);
          }
        }

        .control-panel button:focus-visible,
        .kp-rate:focus-visible {
          outline: 2px solid rgba(255, 180, 190, 0.55);
          outline-offset: 2px;
        }

        .square-btn,
        .image-add,
        .lock-button {
          box-shadow:
            0 16px 34px rgba(0,0,0,0.48),
            0 0 18px rgba(255,80,110,0.10),
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -14px 28px rgba(0,0,0,0.44);
        }

        /* Per-buton-tipi shared hover box-shadow override KALDIRILDI:
           generic .control-panel button:hover artık tek noktadan hover glow'u
           yönetiyor (yeni rafine spec — daha hafif + per-buton color-mix). */

        /* ── Düzenleme / Kilitli buton ── */
        .lock-button {
          --press-glow: rgba(255, 80, 120, 0.42);
          width: 100%;
          height: calc(78px * var(--panel-scale));
          border-radius: calc(18px * var(--panel-scale));
          border: 1px solid rgba(255, 100, 120, 0.4);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 100, 120, 0.15), transparent),
            linear-gradient(180deg, #4a0814, #1b0307);
          color: var(--accent);
          font-size: calc(22px * var(--panel-scale));
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: calc(6px * var(--panel-scale));
        }

        /* lock-button[data-readonly="false"] aktif border/box-shadow:
           generic .control-panel button.is-active glass treatment yönetir
           (button-edit yeşil accent var'ı üzerinden). Burada özel rose
           override YOK — cam efekti tüm butonlar için tek noktadan gelir. */

        .lock-button:active {
          box-shadow:
            0 10px 20px rgba(0,0,0,0.42),
            inset 0 6px 18px rgba(0, 0, 0, 0.35),
            inset 0 -8px 18px rgba(0, 0, 0, 0.40);
        }

        /* Düzenleme aktifken (kilitli=false) sakin sürekli iç ışık */
        .lock-button .button-sweep {
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(255,255,255,0.05) 35%,
            rgba(255,225,232,0.18) 50%,
            rgba(255,255,255,0.05) 65%,
            transparent 100%
          );
        }

        /* ── Resim Ekle (aksiyon, saydam cam mavi) ── */
        .image-add {
          --press-glow: rgba(80, 150, 255, 0.45);
          width: 100%;
          height: calc(52px * var(--panel-scale));
          margin-top: calc(8px * var(--panel-scale));
          border-radius: calc(16px * var(--panel-scale));
          border: 1px solid rgba(120, 160, 255, 0.42);
          background:
            radial-gradient(circle at 50% 0%, rgba(120, 160, 255, 0.18), transparent 60%),
            linear-gradient(180deg, rgba(63, 124, 255, 0.22), rgba(27, 47, 138, 0.32));
          backdrop-filter: blur(10px) saturate(1.05);
          -webkit-backdrop-filter: blur(10px) saturate(1.05);
          color: white;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: calc(13px * var(--panel-scale));
          display: flex;
          align-items: center;
          justify-content: center;
          gap: calc(10px * var(--panel-scale));
        }

        /* ── Resim Ekle hover/active — mavi aksiyon glow ── */
        .image-add:hover {
          border-color: rgba(122, 171, 255, 0.92);
        }

        .image-add:active {
          box-shadow:
            0 12px 24px rgba(19, 34, 90, 0.32),
            inset 0 6px 18px rgba(0, 0, 0, 0.28),
            inset 0 -8px 18px rgba(0, 0, 0, 0.36);
        }

        .image-add .button-sweep {
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(227, 240, 255, 0.04) 35%,
            rgba(244, 249, 255, 0.22) 50%,
            rgba(171, 207, 255, 0.08) 65%,
            transparent 100%
          );
        }


        /* ── Grid (Satır Ayarları + Genel Finans) ── */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: calc(9px * var(--panel-scale));
        }
        /* Tek-toggle grid (Paylaşım) — sağ cell boş kalmasın diye full-width */
        .grid.grid-single {
          grid-template-columns: 1fr;
        }

        /* Visibility (Gizli) toggle — kompakt yatay layout, kare değil.
           Aktif olunca üzerinde "GİZLİ" yazısı belirir (icon + label yan yana). */
        .square-btn.visibility-compact {
          aspect-ratio: auto;
          height: calc(36px * var(--panel-scale));
          padding: calc(4px * var(--panel-scale)) calc(10px * var(--panel-scale));
          flex-direction: row;
          gap: calc(8px * var(--panel-scale));
          justify-content: center;
        }
        .square-btn.visibility-compact .premium-panel-icon {
          width: calc(34px * var(--panel-scale));
          height: calc(34px * var(--panel-scale));
          margin: 0;
        }
        .square-btn.visibility-compact .square-btn__label {
          font-size: calc(11px * var(--panel-scale));
          font-weight: 800;
          letter-spacing: 0.10em;
          line-height: 1;
        }

        /* ── Kare buton ── */
        .square-btn {
          --press-glow: rgba(255, 95, 125, 0.36);
          aspect-ratio: 1;
          border-radius: calc(16px * var(--panel-scale));
          border: 1px solid var(--card-border);
          background:
            radial-gradient(circle at top, rgba(255, 110, 130, 0.12), transparent),
            linear-gradient(180deg, var(--card-bg-1), var(--card-bg-2));
          color: var(--text-main);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: calc(6px * var(--panel-scale));
          padding: calc(8px * var(--panel-scale)) calc(6px * var(--panel-scale));
        }

        @keyframes premiumLightSweep {
          0% {
            left: -80%;
            opacity: 0;
          }
          18% {
            opacity: 1;
          }
          100% {
            left: 130%;
            opacity: 0;
          }
        }

        /* Square buton hover — narin beyaz border (rose kaldırıldı) */
        .square-btn:hover {
          border-color: rgba(255, 255, 255, 0.18);
        }

        /* ── Pasif kare buton: panel arkasına gömülü kurumsal görünüm ── */
        .square-btn:not(.is-active) {
          --button-accent: rgba(230, 220, 220, 0.62);
          --button-glow: transparent;
          background:
            linear-gradient(180deg, rgba(45, 10, 18, 0.42), rgba(12, 2, 6, 0.72));
          border-color: rgba(255, 255, 255, 0.07);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            inset 0 -12px 22px rgba(0, 0, 0, 0.35);
        }

        .square-btn:not(.is-active) .premium-panel-icon {
          opacity: 0.68;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.42));
        }

        /* ── Aktif kare buton: tüm yüzey karakter renginde saydam cam ──
           Specificity (0,3,1) — generic .control-panel button.is-active'i
           (0,2,1) override eder. Renkler --button-accent üzerinden gelir. */
        .control-panel button.square-btn.is-active {
          color: var(--button-accent);
          border-color: color-mix(in srgb, var(--button-accent) 78%, transparent);
          background:
            radial-gradient(
              circle at 50% 20%,
              color-mix(in srgb, var(--button-accent) 34%, transparent) 0%,
              color-mix(in srgb, var(--button-accent) 18%, transparent) 42%,
              rgba(255, 255, 255, 0.025) 74%
            ),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--button-accent) 22%, rgba(255, 255, 255, 0.04)),
              rgba(10, 2, 6, 0.82)
            );
          box-shadow:
            0 0 22px color-mix(in srgb, var(--button-accent) 38%, transparent),
            inset 0 0 24px color-mix(in srgb, var(--button-accent) 22%, transparent),
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            inset 0 -14px 26px rgba(0, 0, 0, 0.38);
        }

        .square-btn.finance,
        .square-btn.kdv,
        .square-btn.discount {
          --press-glow: rgba(255, 185, 90, 0.32);
        }

        .square-btn,
        .image-add,
        .lock-button {
          box-shadow:
            0 16px 34px rgba(0,0,0,0.48),
            0 0 18px rgba(255,80,110,0.10),
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -14px 28px rgba(0,0,0,0.44);
        }

        /* Per-buton-tipi shared hover box-shadow override KALDIRILDI:
           generic .control-panel button:hover artık tek noktadan hover glow'u
           yönetiyor (yeni rafine spec — daha hafif + per-buton color-mix). */

        /* lock-button[data-readonly="false"] ve .square-btn.is-active rose
           box-shadow override'ları kaldirildi. Generic .control-panel
           button.is-active glass + neon treatment tek doğru. */

        .square-btn::after,
        .image-add::after,
        .lock-button::after {
          content: "";
          position: absolute;
          inset: -18px;
          top: auto;
          left: auto;
          width: auto;
          height: auto;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          z-index: 0;
          background: radial-gradient(circle, var(--press-glow, rgba(255, 90, 120, 0.35)) 0%, transparent 62%);
          transform: scale(0.72);
        }

        .square-btn:hover::after,
        .image-add:hover::after,
        .lock-button:hover::after {
          animation: none !important;
          opacity: 0;
        }

        .control-panel button:active::after {
          animation: premiumPressGlow 520ms ease-out forwards !important;
        }

        .lock-button .button-sweep {
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(255,255,255,0.05) 35%,
            rgba(255,225,232,0.18) 50%,
            rgba(255,255,255,0.05) 65%,
            transparent 100%
          );
        }

        .square-btn__label {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: calc(10px * var(--panel-scale));
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: 0.04em;
          white-space: normal;
          word-break: normal;
        }

        /* .square-btn__value ve .square-btn.kdv .square-btn__label CSS
           kuralları kaldırıldı: kare butonlarda artık hiçbir text node
           render edilmiyor (yalnızca premium SVG ikon). */

        /* ── İskonto Oranı input ── */
        .panel-rate {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: calc(10px * var(--panel-scale));
          margin-top: calc(8px * var(--panel-scale));
          padding: calc(8px * var(--panel-scale)) calc(10px * var(--panel-scale));
          border-radius: calc(14px * var(--panel-scale));
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
          font-size: calc(10px * var(--panel-scale));
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          line-height: 1.15;
          color: var(--text-soft);
        }

        .panel-rate__input-wrap {
          display: flex;
          align-items: center;
          gap: calc(5px * var(--panel-scale));
          flex-shrink: 0;
        }

        .panel-rate__input {
          width: calc(44px * var(--panel-scale));
          height: calc(24px * var(--panel-scale));
          border-radius: calc(8px * var(--panel-scale));
          background: rgba(14, 2, 6, 0.76);
          border: 1px solid rgba(255, 143, 155, 0.38);
          color: var(--text-main);
          font-size: calc(12px * var(--panel-scale));
          font-weight: 800;
          text-align: center;
          padding: 0 calc(6px * var(--panel-scale));
          font-variant-numeric: tabular-nums;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .panel-rate__suffix {
          font-size: calc(11px * var(--panel-scale));
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
          .square-btn.is-active,
          .lock-button[data-readonly="false"] {
            animation: none !important;
            transition: none !important;
          }
          .control-panel button .button-sweep,
          .square-btn::after,
          .image-add::after,
          .lock-button::after {
            animation: none !important;
            display: none;
          }
          .control-panel button:hover,
          .control-panel button:active {
            transform: none !important;
          }
        }
      `}</style>

      <div className="control-panel" data-editing={!readOnly}>
        <section className="panel-section">
          <SecLabel text="Düzenleme" />

          <button
            type="button"
            className={`lock-button button-edit ${readOnly ? 'is-locked' : 'is-editing'}`}
            data-readonly={readOnly}
            onClick={() => onReadOnlyDegistir(!readOnly)}
            title={readOnly ? 'Kilitli — düzenlemeyi aç' : 'Düzenleme açık — kilitle'}
            aria-label={readOnly ? 'Kilitli' : 'Düzenleme'}
            aria-pressed={!readOnly}
          >
            <span className="button-sweep" aria-hidden="true" />
            <PremiumEditIcon readOnly={readOnly} />
          </button>

          {/* Genişlet/Kapat — kilit'in altındaki tüm section'ları toggle eder */}
          <button
            type="button"
            className="panel-expand-toggle"
            onClick={() => setPanelGenis((g) => !g)}
            title={panelGenis ? 'Paneli kapat' : 'Paneli aç'}
            aria-label={panelGenis ? 'Paneli kapat' : 'Paneli aç'}
            aria-expanded={panelGenis}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <polyline
                points={panelGenis ? '6 15 12 9 18 15' : '6 9 12 15 18 9'}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </section>

        {panelGenis && (
        <>
        <section className="panel-section">
          <button
            type="button"
            className="image-add button-image"
            onClick={onResimSec}
            disabled={readOnly}
            title="Resim Ekle"
            aria-label="Resim Ekle"
          >
            <span className="button-sweep" aria-hidden="true" />
            <PremiumImageIcon />
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
              labelLines={[]}
              ariaLabel="Satır Bazlı İskonto"
              extraClass="button-row-discount"
              icon={<PremiumRowDiscountIcon />}
              on={satirBazliIskonto}
              onClick={() => onSatirBazliIskontoDegistir(!satirBazliIskonto)}
              disabled={readOnly}
            />
            <SquareToggle
              labelLines={[]}
              ariaLabel="Satır Bazlı Para Birimi"
              extraClass="button-row-currency"
              icon={<PremiumRowCurrencyIcon />}
              on={satirBazliParaBirimi}
              onClick={() => onSatirBazliParaBirimiDegistir(!satirBazliParaBirimi)}
              disabled={readOnly}
            />
            <SquareToggle
              labelLines={[]}
              ariaLabel={grupModuAktif ? `Grup modu açık — renk ${SATIR_GRUP_RENK_ETIKETI[grupRenk]}` : 'Grup modu kapalı'}
              extraClass="button-row-group"
              icon={<GroupModeIcon />}
              on={grupModuAktif}
              onClick={handleGrupModuButonu}
              disabled={readOnly}
            />
            <SquareToggle
              labelLines={[]}
              ariaLabel={notlarGosterilsin ? 'Not alanı gösteriliyor' : 'Not alanı gizli'}
              extraClass="button-row-notes"
              icon={<NotesToggleIcon />}
              on={notlarGosterilsin}
              onClick={() => onNotlarGosterilsinDegistir(!notlarGosterilsin)}
              disabled={readOnly}
            />
          </div>
        </section>

        <section className="panel-section">
          <SecLabel text="Genel Finans" />
          <div className="grid">
            <SquareToggle
              labelLines={[]}
              ariaLabel={kdvOn ? `KDV açık — %${kdvOrani}` : 'KDV kapalı'}
              extraClass="finance kdv button-tax"
              icon={<PremiumKdvIcon />}
              on={kdvOn}
              onClick={toggleKdv}
              disabled={readOnly}
            />
            <SquareToggle
              labelLines={[]}
              ariaLabel={iskOn ? `İskonto açık — %${iskontoOrani}` : 'İskonto kapalı'}
              extraClass="finance discount button-discount"
              icon={<PremiumDiscountIcon />}
              on={iskOn}
              onClick={toggleIsk}
              disabled={readOnly}
            />
          </div>

          {iskOn && (
            <div className="panel-rate">
              <span className="panel-rate__label">İskonto Oranı</span>
              <div className="panel-rate__input-wrap">
                <input
                  type="text"
                  inputMode="decimal"
                  className="kp-rate panel-rate__input"
                  disabled={readOnly}
                  value={iskontoDraft}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (/^\d*(?:[.,]\d*)?$/.test(raw)) {
                      setIskontoDraft(raw);
                    }
                  }}
                  onBlur={commitIskontoDraft}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitIskontoDraft();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
                <span className="panel-rate__suffix">%</span>
              </div>
            </div>
          )}
        </section>

        <section className="panel-section">
          <SecLabel text="Paylaşım" />
          <div className="grid grid-single">
            <SquareToggle
              labelLines={visibility === 'private' ? ['GİZLİ'] : []}
              ariaLabel={
                visibility === 'private'
                  ? 'Gizli — sadece hazırlayan ve yönetici görür'
                  : 'Personel görebilir — toggle kapalı'
              }
              extraClass="button-visibility visibility-compact"
              icon={<PremiumVisibilityIcon visible={visibility === 'team'} />}
              on={visibility === 'private'}
              onClick={() =>
                onVisibilityDegistir(visibility === 'private' ? 'team' : 'private')
              }
              disabled={readOnly}
            />
          </div>
        </section>
        </>
        )}
      </div>

      {grupRenkPenceresiAcik && !readOnly && (
        <div
          role="presentation"
          onClick={() => setGrupRenkPenceresiAcik(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(8, 14, 28, 0.32)',
            backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Grup rengi seç"
            onClick={(e) => e.stopPropagation()}
            style={{
              minWidth: 280, padding: '18px 18px 14px',
              background: '#FFFFFF',
              border: '1px solid rgba(26, 43, 66, 0.10)',
              borderRadius: 12,
              boxShadow: '0 12px 40px rgba(15, 25, 40, 0.22), 0 2px 8px rgba(15,25,40,0.08)',
              fontFamily: 'inherit',
            }}
          >
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#1A2B42', marginBottom: 4,
            }}>
              Grup Rengi
            </div>
            <div style={{ fontSize: 11, color: '#717176', marginBottom: 14, lineHeight: 1.4 }}>
              Bir renk seçin; aktif satırlar bu renge boyanır.
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8, marginBottom: 12,
            }}>
              {SATIR_GRUP_RENK_DONGUSU.map((renk) => {
                const swatch = SATIR_GRUP_RENK_SWATCH[renk];
                const isSelected = grupModuAktif && grupRenk === renk;
                const isUsed = kullanilanGrupRenkleri.includes(renk);
                return (
                  <button
                    key={renk}
                    type="button"
                    onClick={() => handleGrupRenkSec(renk)}
                    aria-label={`Grup rengi ${SATIR_GRUP_RENK_ETIKETI[renk]}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px',
                      background: isSelected ? swatch.bg : '#FFFFFF',
                      border: `1.5px solid ${isSelected ? swatch.border : 'rgba(26,43,66,0.12)'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = swatch.bg;
                        e.currentTarget.style.borderColor = swatch.border;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#FFFFFF';
                        e.currentTarget.style.borderColor = 'rgba(26,43,66,0.12)';
                      }
                    }}
                  >
                    <span style={{
                      width: 22, height: 22, flexShrink: 0,
                      background: swatch.bg, border: `1.5px solid ${swatch.border}`,
                      borderRadius: 5,
                    }} />
                    <span style={{
                      flex: 1, minWidth: 0,
                      fontSize: 12, fontWeight: 600, color: '#1A2B42',
                    }}>
                      {SATIR_GRUP_RENK_ETIKETI[renk]}
                    </span>
                    {isUsed && (
                      <span style={{
                        fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em',
                        textTransform: 'uppercase', color: '#717176',
                        background: 'rgba(26,43,66,0.05)',
                        border: '0.75px solid rgba(26,43,66,0.10)',
                        borderRadius: 3, padding: '2px 5px',
                      }}>
                        Kullanımda
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleGrupModunuKapat}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: '#FFFFFF',
                border: '1px solid rgba(185, 28, 28, 0.32)',
                borderRadius: 8,
                color: '#b91c1c',
                fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(185,28,28,0.06)';
                e.currentTarget.style.borderColor = 'rgba(185,28,28,0.55)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.borderColor = 'rgba(185,28,28,0.32)';
              }}
            >
              ↺ Geri Al — Grup Modunu Kapat
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function GroupModeIcon() {
  return (
    <svg className="premium-panel-icon" viewBox="0 0 64 64" aria-hidden="true">
      <rect className="pi-body" x="9" y="10" width="46" height="44" rx="10" />
      <path className="pi-glyph" d="M20 24h24M20 33h16M20 42h20" />
      <circle className="pi-detail" cx="46" cy="33" r="4" />
    </svg>
  );
}

function NotesToggleIcon() {
  return (
    <svg className="premium-panel-icon" viewBox="0 0 64 64" aria-hidden="true">
      <rect className="pi-body" x="12" y="9" width="40" height="46" rx="6" />
      <path className="pi-glyph" d="M21 22h22M21 30h22M21 38h16" />
      <path className="pi-detail" d="M40 44l4 4 8-8" />
    </svg>
  );
}

function SquareToggle({
  labelLines,
  ariaLabel,
  icon,
  on,
  onClick,
  extraClass,
  disabled,
}: {
  labelLines: readonly string[];
  ariaLabel: string;
  icon: ReactNode;
  on: boolean;
  onClick: () => void;
  extraClass?: string;
  disabled?: boolean;
}) {
  const cls = `square-btn${on ? ' is-active' : ''}${extraClass ? ' ' + extraClass : ''}`;
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      disabled={disabled}
      title={ariaLabel}
      aria-label={ariaLabel}
      aria-pressed={on}
    >
      <span className="button-sweep" aria-hidden="true" />
      {icon}
      {labelLines.length > 0 && (
        <span className="square-btn__label">
          {labelLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      )}
    </button>
  );
}
