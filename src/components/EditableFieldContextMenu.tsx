/**
 * EditableFieldContextMenu.tsx
 * ──────────────────────────────────────────────────────────────────────
 * EditableField alanlarında sağ tıklayınca açılan küçük, premium menü.
 * App seviyesinde TEK MOUNT (singleton). EditableField onContextMenu
 * 'editable-field:contextmenu' custom event dispatch eder, bu component
 * onu dinleyip mouse pozisyonunda menüyü portal ile render eder.
 *
 * - Native browser context menu suppress edilir (preventDefault EditableField'da)
 * - Menü body'ye portal — A4 belgenin DOM'undan bağımsız
 * - data-html2canvas-ignore + .no-export → PDF/print'e ASLA yansımaz
 * - Kapanma: outside click / Escape / scroll / wheel / resize / route change
 * - "Kopyala" → navigator.clipboard.writeText; fallback document.execCommand
 * - Text selection AÇILMAZ; kullanıcı yazıyı seçmek zorunda kalmaz
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export interface EditableFieldContextMenuEventDetail {
  /** Mouse client X */
  x: number;
  /** Mouse client Y */
  y: number;
  /** Kopyalanacak temiz metin */
  text: string;
  /** Alanın kendi data-field-key'i (telemetry için, opsiyonel) */
  fieldKey?: string;
}

export const EDITABLE_CONTEXTMENU_EVENT = 'editable-field:contextmenu';

const MENU_W = 168;
const MENU_H_APPROX = 44; // tek item için yaklaşık yükseklik
const MARGIN = 6;         // viewport kenarına minimum mesafe

type MenuState = {
  visible: boolean;
  x: number;
  y: number;
  text: string;
};

export default function EditableFieldContextMenu() {
  const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0, text: '' });
  const menuRef = useRef<HTMLDivElement | null>(null);

  // EditableField'dan gelen custom event'i dinle. Mouse koordinatlarını
  // viewport içinde kalacak şekilde clamp et.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<EditableFieldContextMenuEventDetail>;
      const d = ce.detail;
      if (!d || !d.text) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = Math.min(Math.max(MARGIN, d.x), vw - MENU_W - MARGIN);
      const y = Math.min(Math.max(MARGIN, d.y), vh - MENU_H_APPROX - MARGIN);
      setMenu({ visible: true, x, y, text: d.text });
    };
    window.addEventListener(EDITABLE_CONTEXTMENU_EVENT, onOpen as EventListener);
    return () => window.removeEventListener(EDITABLE_CONTEXTMENU_EVENT, onOpen as EventListener);
  }, []);

  // Kapatma sinyalleri
  useEffect(() => {
    if (!menu.visible) return;
    const close = () => setMenu((m) => ({ ...m, visible: false }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      close();
    };
    // capture: true → outside click henüz event başka handler'a ulaşmadan tetiklensin
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('wheel', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [menu.visible]);

  const handleCopy = async () => {
    const text = menu.text.trim();
    setMenu((m) => ({ ...m, visible: false }));
    if (!text) return;
    // Önce modern API. http://localhost veya https:// üzerinde çalışır;
    // file:// veya insecure origin'de fallback'e düşer.
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {
      // İzin reddi / Permission API ret → fallback
    }
    // Fallback — execCommand deprecated ama mevcut Chromium/Firefox'ta hâlâ
    // çalışır. Off-screen textarea kullan, selection user-visible olmasın.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-2000px';
      ta.style.left = '0';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* yut */ }
      document.body.removeChild(ta);
    } catch {
      /* ignore */
    }
  };

  if (!menu.visible || typeof document === 'undefined') return null;

  const style: CSSProperties = {
    position: 'fixed',
    top: menu.y,
    left: menu.x,
    width: MENU_W,
    zIndex: 9999,
    padding: '4px',
    background: 'rgba(20, 22, 28, 0.92)',
    color: 'rgba(255, 255, 255, 0.92)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.20)',
    backdropFilter: 'saturate(140%) blur(8px)',
    WebkitBackdropFilter: 'saturate(140%) blur(8px)',
    fontFamily: 'inherit',
    fontSize: 12.5,
    lineHeight: 1.2,
    userSelect: 'none',
    animation: 'editableCtxFadeIn 120ms ease-out',
  };

  const itemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 5,
    cursor: 'pointer',
    transition: 'background-color 120ms ease-out',
  };

  return createPortal(
    <div
      ref={menuRef}
      className="no-export editable-ctx-menu"
      data-html2canvas-ignore="true"
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>{`
        @keyframes editableCtxFadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .editable-ctx-menu [data-mi]:hover {
          background: rgba(255, 255, 255, 0.07);
        }
      `}</style>
      <div
        data-mi="copy"
        role="menuitem"
        tabIndex={0}
        style={itemStyle}
        onClick={handleCopy}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCopy();
          }
        }}
      >
        <span>Kopyala</span>
        <span style={{ opacity: 0.45, fontSize: 11 }}>Ctrl+C</span>
      </div>
    </div>,
    document.body,
  );
}
