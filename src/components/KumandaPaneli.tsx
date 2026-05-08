import React, { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Tooltip } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import {
  PremiumEditIcon,
  PremiumImageIcon,
  PremiumRowDiscountIcon,
  PremiumRowCurrencyIcon,
  PremiumKdvIcon,
  PremiumDiscountIcon,
  PremiumVisibilityIcon,
} from './premium-icons';
import { useKullanici } from '../context/useKullanici';
import { isYonetici as isYoneticiRol } from '../utils/yetkiUtils';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;

const K = {
  WIDTH: 154,
  TOP: 97,
  // BOTTOM_GAP: panel'in viewport alt kenarına olan minimum mesafesi.
  // Dev imzası kartı için (~14px bottom + ~22px height + buffer) â†’ 44px
  // ayrılır; böylece panel bottomReach â‰¤ viewportH-44 < signature.top.
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
  /** Not alanının A4 görünümünde + PDF'te gösterilip gösterilmeyeceği. */
  notlarGosterilsin: boolean;
  onNotlarGosterilsinDegistir: (v: boolean) => void;
  sagPanelOpen: boolean;
  onResimEkle: (dataUrl: string) => void;
  /** Görünürlük yetkisi: 'team' = ekibe açık (toggle ON), 'private' = gizli (OFF). */
  visibility: 'private' | 'team';
  onVisibilityDegistir: (v: 'private' | 'team') => void;
  /** Serbest çizim modu aktif mi */
  serberstCizimAktif: boolean;
  onSerberstCizimToggle: () => void;
  /** Geri bildirim drawer'ını aç (TeklifEditor parent'ı yönetir) */
  onGeriBildirimAc?: () => void;
}

export default function KumandaPaneli({
  readOnly, onReadOnlyDegistir,
  kdvOrani, onKdvOraniDegistir,
  iskontoOrani, onIskontoOraniDegistir,
  satirBazliParaBirimi, onSatirBazliParaBirimiDegistir,
  satirBazliIskonto, onSatirBazliIskontoDegistir,
  notlarGosterilsin, onNotlarGosterilsinDegistir,
  sagPanelOpen, onResimEkle,
  visibility, onVisibilityDegistir,
  serberstCizimAktif, onSerberstCizimToggle,
  onGeriBildirimAc,
}: KumandaPaneliProps) {
  const { aktifKullanici } = useKullanici();
  const isYonetici = isYoneticiRol(aktifKullanici?.rol);

  const lastKdvRef = useRef(kdvOrani > 0 ? kdvOrani : 20);
  const lastIskRef = useRef(iskontoOrani > 0 ? iskontoOrani : 10);
  const [iskontoDraft, setIskontoDraft] = useState(() => String(iskontoOrani > 0 ? iskontoOrani : 10));
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Kilit'in altındaki tüm section'lar (Resim Ekle, Satır Ayarları,
  // Genel Finans, Paylaşım) varsayılan KAPALI. Genişletme butonuyla açılır.
  const [panelGenis, setPanelGenis] = useState(false);

  const kdvOn = kdvOrani > 0;
  const iskOn = iskontoOrani > 0;

  useEffect(() => {
    if (kdvOrani > 0) lastKdvRef.current = kdvOrani;
  }, [kdvOrani]);

  useEffect(() => {
    if (iskontoOrani > 0) lastIskRef.current = iskontoOrani;
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
    lastIskRef.current = stepped;
    onIskontoOraniDegistir(stepped);
    setIskontoDraft(String(stepped));
  };

  const toggleKdv = () => {
    if (kdvOn) {
      lastKdvRef.current = kdvOrani;
      onKdvOraniDegistir(0);
      return;
    }
    onKdvOraniDegistir(lastKdvRef.current);
  };

  const toggleIsk = () => {
    if (iskOn) {
      lastIskRef.current = iskontoOrani;
      onIskontoOraniDegistir(0);
      return;
    }
    onIskontoOraniDegistir(lastIskRef.current);
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

  // A4'ün konumu ölçülür â†’ panel A4'ün üst-sağ köşesine yerleşir;
  // viewport daralırsa SCALE DOWN olur (min 0.55 — okunabilirlik sınırı).
  //
  // top = rect.top + scrollY â†’ A4'ün DOCUMENT-MUTLAK Y'si. Sayfa scroll
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
      <svg
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pi-body-grad" x1="0.05" y1="0" x2="0.95" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="white"        stopOpacity={0.75} />
            <stop offset="18%"  stopColor="white"        stopOpacity={0.30} />
            <stop offset="48%"  stopColor="currentColor" stopOpacity={0.28} />
            <stop offset="100%" stopColor="black"        stopOpacity={0.40} />
          </linearGradient>
          <linearGradient id="pi-detail-grad" x1="0.05" y1="0" x2="0.95" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="white"        stopOpacity={0.90} />
            <stop offset="25%"  stopColor="currentColor" stopOpacity={0.95} />
            <stop offset="100%" stopColor="black"        stopOpacity={0.25} />
          </linearGradient>
        </defs>
      </svg>

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
          /* overflow:hidden KALDIRILDI — will-change:transform ile birlikte
             Chrome'da child SVG filter (drop-shadow) GPU katmanında yanlış
             clip ediliyordu → ikon basınca kayboluyor. Sweep/overlay'ler
             için clip-path kullanıyoruz. */
          isolation: isolate;
          transition:
            transform 180ms ease,
            box-shadow 220ms ease,
            border-color 180ms ease,
            color 180ms ease,
            text-shadow 180ms ease,
            background 220ms ease;
        }

        /* â”€â”€ Kilit kapalıyken (readOnly): tüm tuşlar pasif â”€â”€
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

        /* â”€â”€ Per-buton karakter renk paleti â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        /* .control-panel button. prefix ile specificity (0,2,1) â†’
           .control-panel button (0,1,1) override edilir. */
        /* Kurumsal muted palette — oyuncak neon yerine ciddi tonlar.
           Lock butonu özel: is-editing/is-locked class'larıyla güçlü
           ışık alır (yeşil/kırmızı), diğer butonlardan ayrışır. */
        .control-panel button.button-image        { --button-accent: #6f8fbf; --button-glow: rgba(111, 143, 191, 0.30); }
        /* Serbest çizim — kurumsal yeşil-teal (kalem/fırça) */
        .control-panel button.button-draw         { --button-accent: #3dba8c; --button-glow: rgba( 61, 186, 140, 0.32); }
        .control-panel button.button-draw.is-active {
          color: #3dba8c;
          border-color: rgba(61, 186, 140, 0.80);
          background:
            radial-gradient(circle at 50% 30%, rgba(61,186,140,0.20), transparent 65%),
            linear-gradient(180deg, rgba(10,40,28,0.82), rgba(4,18,12,0.90));
          box-shadow:
            0 0 18px rgba(61,186,140,0.45),
            0 0 48px rgba(61,186,140,0.20),
            inset 0 0 20px rgba(61,186,140,0.14),
            inset 0 1px 0 rgba(255,255,255,0.15);
        }
        /* Pembe â†’ kurumsal şarap kırmızısı */
        .control-panel button.button-row-discount { --button-accent: #d94f64; --button-glow: rgba(217,  79, 100, 0.32); }
        /* Purple â†’ kurumsal teal/petrol mavisi */
        .control-panel button.button-row-currency { --button-accent: #3fb7a3; --button-glow: rgba( 63, 183, 163, 0.30); }
        /* Notlar — kurumsal lavanta/mor (iskonto kırmızısından net ayrışır) */
        .control-panel button.button-row-notes    { --button-accent: #8b7fc5; --button-glow: rgba(139, 127, 197, 0.30); }
        .control-panel button.button-tax          { --button-accent: #d8a24f; --button-glow: rgba(216, 162,  79, 0.30); }
        .control-panel button.button-discount     { --button-accent: #c46f48; --button-glow: rgba(196, 111,  72, 0.28); }
        /* Görünürlük (Paylaşım) — kurumsal slate-mavi (göz ikonu) */
        .control-panel button.button-visibility   { --button-accent: #6b8ba6; --button-glow: rgba(107, 139, 166, 0.28); }

        /* Lock state vars — yeşil (editing) / kırmızı (locked) güçlü neon */
        .control-panel button.lock-button.is-editing {
          --button-accent: #42ff9b;
          --button-glow:   rgba( 66, 255, 155, 0.62);
        }
        .control-panel button.lock-button.is-locked {
          --button-accent: #ff3f5f;
          --button-glow:   rgba(255,  63,  95, 0.62);
        }

        /* â”€â”€ Aktif / basılı: saydam cam + neon karakter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        /* â”€â”€ Panel genişlet/kapat (chevron toggle) — lock'un altında, sade â”€â”€ */
        .panel-expand-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: calc(5px * var(--panel-scale));
          width: 100%;
          height: calc(28px * var(--panel-scale));
          margin-top: calc(6px * var(--panel-scale));
          padding: 0;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: calc(8px * var(--panel-scale));
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 220, 215, 0.55);
          opacity: 0.85;
          font-size: calc(10px * var(--panel-scale));
          font-weight: 600;
          letter-spacing: 0.015em;
        }
        .panel-expand-toggle:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 220, 215, 0.85);
          border-color: rgba(255, 255, 255, 0.18);
          opacity: 1;
        }

        /* â”€â”€ Lock butonu özel: yeşil (editing) / kırmızı (locked) güçlü neon
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

        /* â”€â”€ Premium filled-symbol ikon ailesi â”€â”€
           Yarı dolgulu ana form (.pi-body) + ince stroke 1.7 + iç sembol
           (.pi-glyph stroke 2 / .pi-detail filled accent). Çizgi ikon, neon
           tüp, emoji yok. Apple/Tesla tarzı kurumsal anlam-yoğun pictogram.
           Boyutlar --panel-scale ile orantılı â†’ panel küçüldükçe ikon da
           küçülür, butonun içinde her zaman uygun nefes payıyla durur. */
        .premium-panel-icon {
          width: calc(68px * var(--panel-scale));
          height: calc(68px * var(--panel-scale));
          color: var(--button-accent);
          flex-shrink: 0;
          /*
           * Gerçekçi kabartma (raised relief) tekniği:
           * 1) Sol-üst beyaz kenar  â†’ üstten gelen ışık vurgusu (bevel highlight)
           * 2) Sağ-alt koyu kenar  â†’ gölge kenarı (bevel shadow) — yüksek durma hissi
           * 3) Sert temas gölgesi  â†’ ikon zeminden ~3px yüksekte
           * 4) Orta yumuşak gölge  â†’ hacim/kalınlık
           * 5) Geniş ortam gölgesi â†’ sahne derinliği
           * 1+2 birlikte klasik fiziksel buton bevel'ini verir;
           * 3+4+5 ikonu zeminden kaldırır.
           */
          /* Ortam gölgesi (küçük offset â†’ button overflow:hidden kesmez) */
          filter:
            drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.55))
            drop-shadow(0px 4px 7px rgba(0, 0, 0, 0.32));
          transition: filter 220ms ease;
        }

        /*
         * Ana form — lineerGradient ile 3D speküler aydınlatma.
         * url(#pi-body-grad): sol-üst beyaz vurgu â†’ sağ-alt saydam gölge.
         * currentColor (gradient içinde) â†’ her butonun kendi accent rengi.
         * Fallback (ikinci değer): accent rengi, gradient yüklenmezse devreye girer.
         */
        .premium-panel-icon .pi-body {
          fill: url(#pi-body-grad) color-mix(in srgb, var(--button-accent) 20%, transparent);
          stroke: color-mix(in srgb, var(--button-accent) 70%, rgba(255, 255, 255, 0.22));
          stroke-width: 1.7;
          stroke-linejoin: round;
          paint-order: stroke fill;
        }

        /* İç dolu accent — üst reflex + dolu accent gradient */
        .premium-panel-icon .pi-detail {
          fill: url(#pi-detail-grad) color-mix(in srgb, var(--button-accent) 76%, white 8%);
          stroke: none;
        }

        /* İç sembol/glyph — değişmedi */
        .premium-panel-icon .pi-glyph {
          fill: none;
          stroke: color-mix(in srgb, var(--button-accent) 88%, white 8%);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* Fiyat etiketi delik efekti — açık overlay (delik hissi) */
        .premium-panel-icon .pi-hole {
          fill: rgba(255, 255, 255, 0.55);
          stroke: rgba(255, 255, 255, 0.30);
          stroke-width: 1.2;
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

        /* Aktif/basılı — sade gölge zinciri.
           Eski 5-katmanlı drop-shadow + color-mix() Chrome'da SVG fill: url(#...)
           gradient referansını GPU compositing'de kaybediyordu → ikon parçalanır
           / siyahlaşır. 2 katman drop-shadow + sabit rgba ile aynı premium
           hissi, ikon bozulmadan. */
        .control-panel button.is-active .premium-panel-icon,
        .control-panel button:active .premium-panel-icon {
          filter:
            drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.55))
            drop-shadow(0px 0px 14px rgba(255, 255, 255, 0.18));
        }

        /* press-glow (premiumPressGlow keyframe) için per-buton renk */
        .control-panel button { --press-glow: var(--button-glow); }

        /* Hover — buton yükseliyor: gölge büyür, üst highlight belirginleşir */
        /* NOT: filter:brightness() yok — overflow:hidden + child drop-shadow ile
           compositing context sorunu yaratıyor (ikon kesilir). Parlaklık artışı
           box-shadow highlight + ::before overlay ile sağlanıyor. */
        .control-panel button:hover {
          transform: translateY(-2px);
          background:
            linear-gradient(
              160deg,
              rgba(255,255,255,0.07),
              rgba(255,255,255,0.02)
            );
          box-shadow:
            inset 0  1px  0   rgba(255, 255, 255, 0.28),
            inset 0 -2px  0   rgba(0, 0, 0, 0.50),
                  0  6px 16px rgba(0, 0, 0, 0.55),
                  0 12px 28px rgba(0, 0, 0, 0.35),
                  0  0   22px color-mix(in srgb, var(--button-glow) 38%, transparent);
        }

        /* Pressed — transform yok (compositing katmanı oluşturur, drop-shadow ikonlarla çakışır)
           Press feedback sadece box-shadow + ::before overlay ile. */
        .control-panel button:active {
          box-shadow:
            inset 0  1px  0   rgba(255, 255, 255, 0.08),
            inset 0 -1px  0   rgba(0, 0, 0, 0.60),
            inset 0  4px 12px rgba(0, 0, 0, 0.45),
                  0  1px  3px rgba(0, 0, 0, 0.60);
        }

        /* Cam üst highlight overlay — pasifte görünmez, aktif/basılı durumda
           üstte yumuşak cam parlaması olarak belirir (opacity 0 â†’ 0.55). */
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
          overflow: hidden;
        }

        /* is-active (toggle açık): hafif overlay — ikon görünür kalır */
        .control-panel button.is-active::before {
          opacity: 0.18;
        }
        /* :active (anlık basılı): daha belirgin overlay — press feedback */
        .control-panel button:active::before {
          opacity: 0.40;
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
          overflow: hidden;
        }

        .control-panel button::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          z-index: 0;
          background: radial-gradient(circle, var(--press-glow, rgba(255, 90, 120, 0.45)) 0%, transparent 70%);
          transform: scale(0.72);
        }

        .control-panel button:active::after {
          animation: premiumPressGlow 520ms ease-out forwards;
        }

        .control-panel button:hover .button-sweep {
          animation: premiumLightSweep 900ms ease-out forwards;
        }

        @keyframes premiumPressGlow {
          0%   { opacity: 0;   transform: scale(0.65); }
          35%  { opacity: 0.9; transform: scale(1.05); }
          100% { opacity: 0;   transform: scale(1.38); }
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

        /* â”€â”€ Düzenleme / Kilitli buton â”€â”€ */
        .lock-button {
          --press-glow: rgba(255, 80, 120, 0.42);
          width: 100%;
          height: calc(78px * var(--panel-scale));
          transition: height 0.25s ease;
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

        /* Panel kapalıyken lock-button daha yüksek */
        .control-panel[data-collapsed="true"] .lock-button {
          height: calc(116px * var(--panel-scale));
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

        /* â”€â”€ Resim Ekle (aksiyon, saydam cam mavi) â”€â”€ */
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

        /* â”€â”€ Resim Ekle hover/active — mavi aksiyon glow â”€â”€ */
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


        /* â”€â”€ Grid (Satır Ayarları + Genel Finans) â”€â”€ */
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

        /* â”€â”€ Kare buton â”€â”€ */
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

        /* â”€â”€ Pasif kare buton: panel arkasına gömülü kurumsal görünüm â”€â”€ */
        .square-btn:not(.is-active) {
          --button-accent: rgba(230, 220, 220, 0.62);
          --button-glow: transparent;
          background:
            linear-gradient(160deg,
              rgba(55, 14, 22, 0.55) 0%,
              rgba(28,  6, 12, 0.68) 45%,
              rgba(10,  2,  5, 0.88) 100%
            );
          border-color: rgba(255, 255, 255, 0.09);
          /*
           * Fiziksel kabartılmış (embossed) buton kutusu:
           * inset üst â†’ üstten gelen ışık yansıması (kenar highlight)
           * inset alt â†’ gölge tarafı (altta koyu kenar)
           * dış alt    â†’ zeminde derin düşme gölgesi (yüksek durma hissi)
           * dış üst    â†’ küçük negatif Y ambient reflex
           */
          box-shadow:
            inset 0  1px  0   rgba(255, 255, 255, 0.18),
            inset 0  2px  4px rgba(255, 255, 255, 0.06),
            inset 0 -2px  0   rgba(0,   0,   0,   0.55),
            inset 0 -4px  8px rgba(0,   0,   0,   0.40),
                  0  4px  8px rgba(0,   0,   0,   0.55),
                  0  8px 18px rgba(0,   0,   0,   0.35),
                  0 -1px  2px rgba(255, 255, 255, 0.04);
        }

        .square-btn:not(.is-active) .premium-panel-icon {
          opacity: 0.68;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.42));
        }

        /* â”€â”€ Aktif kare buton: tüm yüzey karakter renginde saydam cam â”€â”€
           Specificity (0,3,1) — generic .control-panel button.is-active'i
           (0,2,1) override eder. Renkler --button-accent üzerinden gelir. */
        .control-panel button.square-btn.is-active {
          color: var(--button-accent);
          border-color: color-mix(in srgb, var(--button-accent) 78%, transparent);
          background:
            radial-gradient(
              ellipse at 50% 15%,
              color-mix(in srgb, var(--button-accent) 40%, rgba(255,255,255,0.10)) 0%,
              color-mix(in srgb, var(--button-accent) 20%, transparent) 48%,
              rgba(8, 2, 4, 0.85) 100%
            );
          /*
           * Aktifken: üst kenar parlıyor (ışık içeriden vuruyor gibi),
           * alt+dış gölge azalıyor — buton zemine "bastı" hissi değil,
           * ışık kaynağına dönüştü hissi.
           */
          box-shadow:
            inset 0  1px  0   rgba(255, 255, 255, 0.28),
            inset 0  3px 10px color-mix(in srgb, var(--button-accent) 28%, transparent),
            inset 0 -2px  0   rgba(0, 0, 0, 0.42),
            inset 0 -6px 14px rgba(0, 0, 0, 0.32),
                  0  2px  6px rgba(0, 0, 0, 0.38),
                  0  0   24px color-mix(in srgb, var(--button-accent) 42%, transparent),
                  0  0   48px color-mix(in srgb, var(--button-accent) 18%, transparent);
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

        /* â”€â”€ İskonto Oranı input â”€â”€ */
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

        /* â”€â”€ Erişilebilirlik: hareket azaltma â”€â”€ */
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

      <div className="control-panel" data-editing={!readOnly} data-collapsed={!panelGenis}>
        <section className="panel-section">
          <SecLabel text="Düzenleme" />

          <Tooltip
            title={readOnly ? 'Kilitli — düzenlemeyi aç' : 'Düzenleme açık — kilitle'}
            placement="left"
            mouseEnterDelay={1}
            color={TOOLTIP_COLOR}
            styles={{ container: TOOLTIP_STYLE, root: { pointerEvents: 'none' } }}
          >
            <button
              type="button"
              className={`lock-button button-edit ${readOnly ? 'is-locked' : 'is-editing'}`}
              data-readonly={readOnly}
              onClick={() => onReadOnlyDegistir(!readOnly)}
              aria-label={readOnly ? 'Kilitli' : 'Düzenleme'}
              aria-pressed={!readOnly}
            >
              <span className="button-sweep" aria-hidden="true" />
              <PremiumEditIcon readOnly={readOnly} />
            </button>
          </Tooltip>

          <Tooltip
            title={panelGenis ? 'Paneli kapat' : 'Paneli aç'}
            placement="left"
            mouseEnterDelay={1}
            color={TOOLTIP_COLOR}
            styles={{ container: TOOLTIP_STYLE, root: { pointerEvents: 'none' } }}
          >
            <button
              type="button"
              className="panel-expand-toggle"
              onClick={() => setPanelGenis((g) => !g)}
              aria-label={panelGenis ? 'Paneli kapat' : 'Paneli aç'}
              aria-expanded={panelGenis}
            >
              <span>{panelGenis ? 'Kapat' : 'Aç'}</span>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
          </Tooltip>
        </section>

        {panelGenis && (
        <>
        <section className="panel-section">
          <Tooltip
            title="Resim Ekle"
            placement="left"
            mouseEnterDelay={1}
            color={TOOLTIP_COLOR}
            styles={{ container: TOOLTIP_STYLE, root: { pointerEvents: 'none' } }}
          >
            <button
              type="button"
              className="image-add button-image"
              onClick={onResimSec}
              disabled={readOnly}
              aria-label="Resim Ekle"
            >
              <span className="button-sweep" aria-hidden="true" />
              <PremiumImageIcon />
            </button>
          </Tooltip>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
        </section>

        <section className="panel-section">
          <Tooltip
            title={readOnly ? 'Düzenleme modunda kullanılabilir' : (serberstCizimAktif ? 'Çizimi Kilitle (çizim kalır)' : 'Serbest Çizim — düzenle/sil için aç')}
            placement="left"
            mouseEnterDelay={1}
            color={TOOLTIP_COLOR}
            styles={{ container: TOOLTIP_STYLE, root: { pointerEvents: 'none' } }}
          >
            <button
              type="button"
              className={`image-add button-draw ${serberstCizimAktif ? 'is-active' : ''}`}
              onClick={() => { if (!readOnly) onSerberstCizimToggle(); }}
              aria-label={serberstCizimAktif ? 'Çizimi Kilitle' : 'Serbest Çizim'}
              aria-pressed={serberstCizimAktif}
              style={{
                opacity: readOnly ? 0.3 : undefined,
                cursor: readOnly ? 'not-allowed' : undefined,
                pointerEvents: readOnly ? 'none' as const : undefined,
              }}
            >
              <span className="button-sweep" aria-hidden="true" />
              <DrawIcon />
            </button>
          </Tooltip>
        </section>

        {onGeriBildirimAc && (
          <section className="panel-section">
            <Tooltip
              title="Geri Bildirim Gönder"
              placement="left"
              mouseEnterDelay={1}
              color={TOOLTIP_COLOR}
              styles={{ container: TOOLTIP_STYLE, root: { pointerEvents: 'none' } }}
            >
              <button
                type="button"
                className="image-add"
                onClick={onGeriBildirimAc}
                aria-label="Geri Bildirim"
              >
                <span className="button-sweep" aria-hidden="true" />
                <MessageOutlined style={{ fontSize: 16 }} />
              </button>
            </Tooltip>
          </section>
        )}

        <section className="panel-section">
          <SecLabel text="Satır Ayarları" />
          <div className="grid">
            <SquareToggle
              labelLines={[]}
              ariaLabel={satirBazliIskonto ? 'Satır İskontosu: Açık' : 'Satır İskontosu: Kapalı'}
              extraClass="button-row-discount"
              icon={<PremiumRowDiscountIcon />}
              on={satirBazliIskonto}
              onClick={() => onSatirBazliIskontoDegistir(!satirBazliIskonto)}
              disabled={readOnly}
            />
            <SquareToggle
              labelLines={[]}
              ariaLabel={satirBazliParaBirimi ? 'Satır Para Birimi: Açık' : 'Satır Para Birimi: Kapalı'}
              tooltipPlacement="right"
              extraClass="button-row-currency"
              icon={<PremiumRowCurrencyIcon />}
              on={satirBazliParaBirimi}
              onClick={() => onSatirBazliParaBirimiDegistir(!satirBazliParaBirimi)}
              disabled={readOnly}
            />
            <SquareToggle
              labelLines={[]}
              ariaLabel={notlarGosterilsin ? 'Notlar: Gösteriliyor' : 'Notlar: Gizli'}
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
              ariaLabel={kdvOn ? `KDV: Açık (%${kdvOrani})` : 'KDV: Kapalı'}
              extraClass="finance kdv button-tax"
              icon={<PremiumKdvIcon />}
              on={kdvOn}
              onClick={toggleKdv}
              disabled={readOnly}
            />
            <SquareToggle
              labelLines={[]}
              ariaLabel={iskOn ? `Genel İskonto: Açık (%${iskontoOrani})` : 'Genel İskonto: Kapalı'}
              tooltipPlacement="right"
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

        {isYonetici && (
          <section className="panel-section">
            <SecLabel text="Paylaşım" />
            <div className="grid grid-single">
              <SquareToggle
                labelLines={visibility === 'private' ? ['GİZLİ'] : []}
                ariaLabel={visibility === 'private' ? 'Görünürlük: Gizli' : 'Görünürlük: Herkese Açık'}
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
        )}
        </>
        )}
      </div>

    </div>
  );
}

function DrawIcon() {
  return (
    <svg className="premium-panel-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none">
      {/* Gölge */}
      <ellipse cx="32" cy="57" rx="18" ry="3" fill="rgba(0,0,0,0.18)" />

      {/* Kalem gövdesi — ana silindir */}
      <rect className="pi-body" x="26" y="8" width="12" height="38" rx="4" />
      {/* Parlama — sol kenar */}
      <rect x="27.5" y="9.5" width="3" height="34" rx="1.5" fill="rgba(255,255,255,0.22)" />
      {/* Gölge — sağ kenar */}
      <rect x="35" y="10" width="2" height="34" rx="1" fill="rgba(0,0,0,0.15)" />

      {/* Silgi (üst) */}
      <rect x="26" y="8" width="12" height="7" rx="3" fill="rgba(255,150,160,0.75)" />
      <rect x="27" y="9" width="5" height="4" rx="1.5" fill="rgba(255,200,205,0.45)" />

      {/* Metal bant */}
      <rect x="26" y="15" width="12" height="3" rx="0" fill="rgba(180,180,210,0.60)" />
      <rect x="26" y="15.5" width="12" height="1" fill="rgba(255,255,255,0.30)" />

      {/* Kalem uç — şeklendirilmiş konik */}
      <path d="M 26 46 L 30.5 56 L 33.5 56 L 38 46 Z" fill="rgba(210,175,110,0.70)" stroke="rgba(120,80,20,0.30)" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M 29 46 L 30.5 56 L 33.5 56 L 35 46 Z" fill="rgba(240,210,140,0.55)" />
      {/* Maden kalem ucu */}
      <path d="M 30.5 54 L 32 58 L 33.5 54 Z" className="pi-glyph" strokeWidth="0" style={{ fill: 'currentColor', opacity: 0.85 }} />

      {/* Yatay çizgi detayları (gövdede) */}
      <line x1="26" y1="22" x2="38" y2="22" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8" />
      <line x1="26" y1="28" x2="38" y2="28" stroke="rgba(0,0,0,0.10)" strokeWidth="0.8" />

      {/* Fırça efekti — çizgi izleri sol altta */}
      <path d="M 9 50 Q 14 46 18 50 Q 22 54 26 49" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="pi-glyph" opacity="0.65" />
      <path d="M 8 56 Q 12 53 15 56" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pi-glyph" opacity="0.40" />
    </svg>
  );
}

function NotesToggleIcon() {
  return (
    <svg className="premium-panel-icon" viewBox="0 0 64 64" aria-hidden="true">
      {/* bloknot gövde gölgesi */}
      <rect x="13" y="12" width="34" height="42" rx="5" fill="rgba(0,0,0,0.14)" />

      {/* bloknot gövde */}
      <rect className="pi-body" x="11" y="10" width="34" height="42" rx="5" />
      {/* üst kenar highlight */}
      <rect x="12" y="11" width="32" height="2" rx="1" fill="rgba(255,255,255,0.26)" />
      {/* dış bevel — aydınlık */}
      <rect x="11.8" y="10.8" width="32.4" height="40.4" rx="4.3" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1" />
      {/* dış bevel — koyu */}
      <rect x="12.4" y="11.4" width="31.2" height="39.2" rx="3.8" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="0.9" />

      {/* spiral halkalar — sol kenar */}
      <circle cx="11" cy="20" r="3" fill="none" className="pi-glyph" strokeWidth="2" />
      <circle cx="11" cy="31" r="3" fill="none" className="pi-glyph" strokeWidth="2" />
      <circle cx="11" cy="42" r="3" fill="none" className="pi-glyph" strokeWidth="2" />
      {/* spiral bağlantı çizgisi */}
      <line x1="11" y1="17" x2="11" y2="28" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <line x1="11" y1="34" x2="11" y2="39" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />

      {/* yazı satırları */}
      <path className="pi-glyph" d="M19 22h18M19 30h18M19 38h12" strokeWidth="2.2" />

      {/* kalem — sağ alt köşe çapraz */}
      {/* gövde gölgesi */}
      <path d="M 39 46 L 48 37 L 52 41 L 43 50 Z" fill="rgba(0,0,0,0.16)" />
      {/* ahşap uç */}
      <path d="M 38 45 L 40 47 L 36 51 Z" fill="rgba(210,175,110,0.55)" stroke="rgba(120,85,30,0.25)" strokeWidth="0.7" strokeLinejoin="round" />
      <path d="M 40 47 L 42 49 L 36 51 Z" fill="rgba(155,120,65,0.48)" stroke="rgba(120,85,30,0.25)" strokeWidth="0.7" strokeLinejoin="round" />
      {/* kalem gövde — koyu yüz */}
      <path d="M 38 45 L 47 36 L 51 40 L 42 49 Z" fill="rgba(180,140,20,0.28)" />
      {/* kalem gövde — aydınlık yüz */}
      <path d="M 38 45 L 47 36 L 49 38 L 40 47 Z" fill="rgba(240,210,80,0.22)" />
      {/* kontur */}
      <path d="M 38 45 L 47 36 L 51 40 L 42 49 Z" fill="none" stroke="rgba(130,95,10,0.38)" strokeWidth="0.9" strokeLinejoin="miter" />
      {/* ferrule */}
      <path d="M 47 36 L 51 40 L 53 38 L 49 34 Z" fill="rgba(185,185,190,0.50)" stroke="rgba(120,120,125,0.25)" strokeWidth="0.5" strokeLinejoin="miter" />
      {/* silgi */}
      <path d="M 49 34 L 53 38 L 55 36 L 51 32 Z" fill="rgba(205,140,135,0.50)" stroke="rgba(160,85,80,0.22)" strokeWidth="0.5" strokeLinejoin="miter" />
      {/* kurşun uç */}
      <circle cx="36" cy="51" r="1.0" fill="rgba(50,50,60,0.60)" />
    </svg>
  );
}

const TOOLTIP_STYLE: React.CSSProperties = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', 'Inter', 'Arial', sans-serif",
  color: 'rgba(255,232,238,0.92)',
  fontSize: 10,
  fontWeight: 350,
  lineHeight: 1.5,
  letterSpacing: '-0.01em',
  padding: '3px 6px',
  minHeight: 0,
};

const TOOLTIP_COLOR = 'rgba(18,14,22,0.62)';

const SquareToggle = React.forwardRef<HTMLButtonElement, {
  labelLines: readonly string[];
  ariaLabel: string;
  icon: ReactNode;
  on: boolean;
  onClick: () => void;
  extraClass?: string;
  disabled?: boolean;
  tooltipPlacement?: 'left' | 'right';
}>(function SquareToggle({
  labelLines,
  ariaLabel,
  icon,
  on,
  onClick,
  extraClass,
  disabled,
  tooltipPlacement = 'left',
}, ref) {
  const cls = `square-btn${on ? ' is-active' : ''}${extraClass ? ' ' + extraClass : ''}`;
  return (
    <Tooltip
      title={ariaLabel}
      placement={tooltipPlacement}
      mouseEnterDelay={1}
      styles={{ container: TOOLTIP_STYLE, root: { pointerEvents: 'none' } }}
      color={TOOLTIP_COLOR}
    >
      <button
        ref={ref}
        type="button"
        className={cls}
        onClick={onClick}
        disabled={disabled}
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
    </Tooltip>
  );
});
