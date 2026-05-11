/**
 * ToolbarIcons.tsx
 * Tekliflerim üst operasyon satırı için tek ikon ailesi.
 *
 * Tüm ikonlar:
 *   • aynı 24×24 viewBox
 *   • aynı lacivert gradient (#27405F → #152332) — kapak
 *   • aynı açık ton gradient (#3F587C → #2A4060) — ön cep / belge
 *   • aynı 0.9px stroke (premium, çok ince değil — çok kalın değil)
 *   • aynı 1.6 corner radius
 *   • aynı tab geometrisi → klasör/belge aynı sistemin türevi
 *
 * `tone='dark'` aktif/full-render: koyu lacivert gradient.
 * `tone='light'` idle: surface üstünde okunabilen açık tonlu gradient.
 */
import React from 'react';

type Tone = 'dark' | 'light';

interface IconProps {
  size?: number;
  tone?: Tone;
}

function paletteFor(tone: Tone) {
  if (tone === 'dark') {
    return {
      bodyTop:  '#3B5C82',
      bodyMid:  '#1E3A5F',
      bodyBot:  '#0F1E33',
      tabTop:   '#3B5C82',
      tabBot:   '#1B2C42',
      pageTop:  '#F5F2EA',
      pageBot:  '#E0DCD0',
      lineCol:  'rgba(255,255,255,0.78)',
      lineSoft: 'rgba(255,255,255,0.42)',
      strokeOuter: 'rgba(10,21,37,0.55)',
    };
  }
  return {
    bodyTop:  '#5A7BA5',
    bodyMid:  '#3B5C82',
    bodyBot:  '#27405F',
    tabTop:   '#3B5C82',
    tabBot:   '#27405F',
    pageTop:  '#FFFFFF',
    pageBot:  '#EDE9E0',
    lineCol:  'rgba(255,255,255,0.72)',
    lineSoft: 'rgba(255,255,255,0.38)',
    strokeOuter: 'rgba(10,21,37,0.45)',
  };
}

let _uidSeq = 0;
function nextUid() { _uidSeq += 1; return `tb-${_uidSeq}`; }

/* ─── 1) Tek klasör — Benim Tekliflerim ──────────────────────────────────── */
export function FolderSingleIcon({ size = 22, tone = 'dark' }: IconProps) {
  const p = paletteFor(tone);
  const uid = React.useMemo(() => nextUid(), []);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`bg-${uid}`} x1="2" y1="8" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.bodyTop}/>
          <stop offset="55%" stopColor={p.bodyMid}/>
          <stop offset="100%" stopColor={p.bodyBot}/>
        </linearGradient>
        <linearGradient id={`tb-${uid}`} x1="2" y1="3" x2="2" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.tabTop}/>
          <stop offset="100%" stopColor={p.tabBot}/>
        </linearGradient>
      </defs>
      {/* Tab */}
      <path d="M3 4.6 C3 3.85 3.6 3.25 4.35 3.25 H9.5 C9.95 3.25 10.36 3.45 10.62 3.79 L11.55 5.0 H3 V4.6 Z" fill={`url(#tb-${uid})`} stroke={p.strokeOuter} strokeWidth="0.45"/>
      {/* Body */}
      <path d="M2.5 7.6 C2.5 6.72 3.22 6.0 4.1 6.0 H19.9 C20.78 6.0 21.5 6.72 21.5 7.6 V18.4 C21.5 19.28 20.78 20.0 19.9 20.0 H4.1 C3.22 20.0 2.5 19.28 2.5 18.4 V7.6 Z" fill={`url(#bg-${uid})`} stroke={p.strokeOuter} strokeWidth="0.55"/>
      {/* Top edge highlight */}
      <path d="M3.6 7.6 H20.4 V8.4 H3.6 Z" fill={p.lineSoft} opacity="0.55"/>
      {/* Inner content lines (klasör içi belge ima) */}
      <rect x="6" y="12.4" width="12" height="0.85" rx="0.4" fill={p.lineCol}/>
      <rect x="6" y="14.6" width="9" height="0.85" rx="0.4" fill={p.lineSoft}/>
    </svg>
  );
}

/* ─── 2) Klasör yığını — Tüm Teklifler ───────────────────────────────────── */
export function FolderStackIcon({ size = 22, tone = 'dark' }: IconProps) {
  const p = paletteFor(tone);
  const uid = React.useMemo(() => nextUid(), []);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`fbg-${uid}`} x1="2" y1="8" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.bodyTop}/>
          <stop offset="55%" stopColor={p.bodyMid}/>
          <stop offset="100%" stopColor={p.bodyBot}/>
        </linearGradient>
        <linearGradient id={`fbg2-${uid}`} x1="2" y1="6" x2="22" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.bodyTop} stopOpacity="0.85"/>
          <stop offset="100%" stopColor={p.bodyMid} stopOpacity="0.85"/>
        </linearGradient>
        <linearGradient id={`ftb-${uid}`} x1="0" y1="2" x2="0" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.tabTop}/>
          <stop offset="100%" stopColor={p.tabBot}/>
        </linearGradient>
      </defs>
      {/* Arka klasör — sadece üst kenarı görünür (offset üst-arkada) */}
      <path d="M5 4.4 C5 3.7 5.55 3.15 6.25 3.15 H10.6 C11.0 3.15 11.36 3.32 11.6 3.62 L12.45 4.7 H5 V4.4 Z" fill={`url(#ftb-${uid})`} opacity="0.78"/>
      <path d="M4.5 6.6 C4.5 5.85 5.1 5.25 5.85 5.25 H18.15 C18.9 5.25 19.5 5.85 19.5 6.6 V8.5 H4.5 V6.6 Z" fill={`url(#fbg2-${uid})`} opacity="0.85" stroke={p.strokeOuter} strokeWidth="0.4"/>
      {/* Ön klasör (esas) */}
      <path d="M2 9.6 C2 8.85 2.6 8.25 3.35 8.25 H8.5 C8.95 8.25 9.36 8.45 9.62 8.79 L10.55 9.95 H2 V9.6 Z" fill={`url(#ftb-${uid})`} stroke={p.strokeOuter} strokeWidth="0.4"/>
      <path d="M1.5 12.0 C1.5 11.12 2.22 10.4 3.1 10.4 H20.9 C21.78 10.4 22.5 11.12 22.5 12.0 V19.4 C22.5 20.28 21.78 21.0 20.9 21.0 H3.1 C2.22 21.0 1.5 20.28 1.5 19.4 V12.0 Z" fill={`url(#fbg-${uid})`} stroke={p.strokeOuter} strokeWidth="0.55"/>
      {/* Top edge highlight */}
      <path d="M2.6 12.0 H21.4 V12.8 H2.6 Z" fill={p.lineSoft} opacity="0.55"/>
      {/* Inner lines */}
      <rect x="5.5" y="15.6" width="13" height="0.85" rx="0.4" fill={p.lineCol}/>
      <rect x="5.5" y="17.6" width="10" height="0.85" rx="0.4" fill={p.lineSoft}/>
    </svg>
  );
}

/* ─── 3) Tek belge — Benim PDF'lerim ─────────────────────────────────────── */
export function DocumentSingleIcon({ size = 18, tone = 'dark' }: IconProps) {
  const p = paletteFor(tone);
  const uid = React.useMemo(() => nextUid(), []);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`db-${uid}`} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.bodyTop}/>
          <stop offset="55%" stopColor={p.bodyMid}/>
          <stop offset="100%" stopColor={p.bodyBot}/>
        </linearGradient>
      </defs>
      {/* Belge gövdesi (kıvrık üst-sağ köşe) */}
      <path d="M5 4.6 C5 3.85 5.6 3.25 6.35 3.25 H14.0 L19.0 8.25 V19.4 C19.0 20.15 18.4 20.75 17.65 20.75 H6.35 C5.6 20.75 5.0 20.15 5.0 19.4 V4.6 Z" fill={`url(#db-${uid})`} stroke={p.strokeOuter} strokeWidth="0.55"/>
      {/* Köşe kıvrımı (folded corner) */}
      <path d="M14 3.25 V7.5 C14 7.92 14.33 8.25 14.75 8.25 H19 L14 3.25 Z" fill={p.bodyBot} opacity="0.85" stroke={p.strokeOuter} strokeWidth="0.4"/>
      {/* Üst kenar parıltı */}
      <path d="M6.0 4.6 H13.4 V5.4 H6.0 Z" fill={p.lineSoft} opacity="0.5"/>
      {/* İçerik çizgileri */}
      <rect x="7.5" y="11.4" width="9.0" height="0.85" rx="0.4" fill={p.lineCol}/>
      <rect x="7.5" y="13.6" width="9.0" height="0.85" rx="0.4" fill={p.lineSoft}/>
      <rect x="7.5" y="15.8" width="6.5" height="0.85" rx="0.4" fill={p.lineSoft}/>
    </svg>
  );
}

/* ─── 4) Belge yığını — Tüm PDF'ler ──────────────────────────────────────── */
export function DocumentStackIcon({ size = 18, tone = 'dark' }: IconProps) {
  const p = paletteFor(tone);
  const uid = React.useMemo(() => nextUid(), []);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`dsb-${uid}`} x1="3" y1="6" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.bodyTop}/>
          <stop offset="55%" stopColor={p.bodyMid}/>
          <stop offset="100%" stopColor={p.bodyBot}/>
        </linearGradient>
        <linearGradient id={`dsb2-${uid}`} x1="3" y1="3" x2="20" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.bodyTop} stopOpacity="0.78"/>
          <stop offset="100%" stopColor={p.bodyMid} stopOpacity="0.78"/>
        </linearGradient>
      </defs>
      {/* Arka belge — sağa yukarı offset (silüet) */}
      <path d="M9 2.4 C9 1.78 9.55 1.25 10.20 1.25 H16.4 L20.5 5.35 V15.4 C20.5 16.05 19.95 16.6 19.30 16.6 H10.20 C9.55 16.6 9.0 16.05 9.0 15.4 V2.4 Z" fill={`url(#dsb2-${uid})`} stroke={p.strokeOuter} strokeWidth="0.4"/>
      <path d="M16.4 1.25 V4.85 C16.4 5.20 16.68 5.5 17.05 5.5 H20.5 L16.4 1.25 Z" fill={p.bodyBot} opacity="0.7"/>
      {/* Ön belge (esas) */}
      <path d="M3 7.4 C3 6.65 3.6 6.05 4.35 6.05 H12.0 L17.0 11.05 V21.6 C17.0 22.35 16.4 22.95 15.65 22.95 H4.35 C3.6 22.95 3.0 22.35 3.0 21.6 V7.4 Z" fill={`url(#dsb-${uid})`} stroke={p.strokeOuter} strokeWidth="0.55"/>
      <path d="M12 6.05 V10.3 C12 10.72 12.33 11.05 12.75 11.05 H17 L12 6.05 Z" fill={p.bodyBot} opacity="0.85" stroke={p.strokeOuter} strokeWidth="0.4"/>
      {/* Üst kenar parıltı */}
      <path d="M4.0 7.4 H11.4 V8.2 H4.0 Z" fill={p.lineSoft} opacity="0.5"/>
      {/* İçerik çizgileri */}
      <rect x="5.5" y="14.0" width="9.0" height="0.85" rx="0.4" fill={p.lineCol}/>
      <rect x="5.5" y="16.2" width="9.0" height="0.85" rx="0.4" fill={p.lineSoft}/>
      <rect x="5.5" y="18.4" width="6.0" height="0.85" rx="0.4" fill={p.lineSoft}/>
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Undo / Redo — Apple/Figma/Linear dilinde minimal kıvrımlı ok.
   Gradient ailesinden ayrı: tek renk currentColor, stroke 1.85.
   AntD UndoOutlined/RedoOutlined'in ince hissini değiştirmek için.
   KumandaPaneli segmented control içinde kullanılır.
   ─────────────────────────────────────────────────────────────────── */
interface ArrowIconProps {
  size?: number;
}

export function UndoArrowIcon({ size = 16 }: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Sol işaretli ok başı + sola dönüp aşağı kıvrılan yarım daire */}
      <polyline points="8 6 4 10 8 14" />
      <path d="M4 10h10a5 5 0 0 1 0 10h-3" />
    </svg>
  );
}

export function RedoArrowIcon({ size = 16 }: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Sağ işaretli ok başı + sağa dönüp aşağı kıvrılan yarım daire (undo'nun aynası) */}
      <polyline points="16 6 20 10 16 14" />
      <path d="M20 10H10a5 5 0 0 0 0 10h3" />
    </svg>
  );
}
