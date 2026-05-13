/**
 * AutoAnchoredPopup.tsx
 * Tüm anchor-based popup'lar için ortak wrapper.
 *
 * Niye: CellEditPopup ve urun-suggest-panel %80 aynı kodu taşıyordu —
 * portal'a render, viewport-aware pozisyon, scroll/resize listener,
 * outside-click ve Escape ile kapatma. Tek dosyada topla; yeni popup'lar
 * 5 satır JSX ile yazılabilsin.
 *
 * Stil: src/styles/popupTokens.ts'teki POPUP token'larından beslenir —
 * tüm popup'lar tek elden border-radius, shadow, z-index, animasyon süresi.
 *
 * Kullanım:
 *   <AutoAnchoredPopup
 *     open={isOpen}
 *     anchorRect={inputRef.current?.getBoundingClientRect()}
 *     onClose={() => setOpen(false)}
 *     preferredWidth={360}
 *   >
 *     {children}
 *   </AutoAnchoredPopup>
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { POPUP } from '../styles/popupTokens';

interface AnchorRect {
  left: number;
  top: number;
  bottom: number;
  width: number;
}

interface AutoAnchoredPopupProps {
  /** Açık mı; false → render edilmez. */
  open: boolean;

  /** Anchor element'in viewport koordinatları. null/undefined → render edilmez.
   *  Çağıran tarafın el ile DOM ölçümü yapması gerekir (örn. ref.current?.getBoundingClientRect()). */
  anchorRect: AnchorRect | null;

  /** Popup'ın tercih ettiği genişlik. Anchor genişliğine veya minWidth'e fallback. */
  preferredWidth?: number;
  minWidth?: number;
  /** Üst sınır — viewport'a sığmazsa otomatik düşer. */
  maxWidth?: number;
  /** Popup'ın azami yüksekliği — taşarsa kendi içinde scroll. */
  maxHeight?: number;

  /** Z-depth katmanı. Varsayılan 'level2' (standart popup). */
  shadowLevel?: 'level1' | 'level2' | 'level3';
  /** Z-index hiyerarşi tier'ı. Varsayılan 'popup' (1500). */
  zIndexTier?: 'popup' | 'modal' | 'critical';
  /** İç padding'i POPUP.padding tier'ından seç. 'none' = padding yok (içerik kendi handle eder). */
  paddingTier?: 'compact' | 'base' | 'spacious' | 'none';

  /** Escape'e basınca kapansın mı. Varsayılan true. */
  closeOnEscape?: boolean;
  /** Dışarı tıklayınca kapansın mı. Varsayılan true. */
  closeOnClickOutside?: boolean;
  /** Kapanma callback'i — Escape, outside-click veya manuel için. */
  onClose?: () => void;

  /** Outside-click handler'ı bypass etmek için ek selector listesi.
   *  Örn. Antd dropdown'lar popup dışına render edilir; kapanmasın istersek
   *  ['.ant-select-dropdown', '.ant-picker-dropdown'] geç. */
  ignoreOutsideClickSelectors?: string[];

  /** Test/etiket için id. */
  id?: string;
  className?: string;

  children: ReactNode;
}

/**
 * Viewport-aware pozisyonlama:
 *  - Alt boşluk popup yüksekliğine yetmezse popup anchor'un ÜSTÜNDE açılır.
 *  - Sağ taraf taşmıyorsa anchor'a hizalı, taşıyorsa sağdan 8px boşluğa clamp.
 *  - Sol kenar 8px'in altına düşmez.
 */
function computePosition(
  anchor: AnchorRect,
  popupHeight: number,
  popupWidth: number,
  maxWidth: number,
): { top: number; left: number; width: number } {
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const MARGIN = 8;
  const GAP = 4;

  // Genişlik: maxWidth ve viewport sınırına clamp.
  const width = Math.min(popupWidth, maxWidth, vpW - MARGIN * 2);

  // Dikey: alta sığar mı? Sığmıyorsa üste aç.
  const spaceBelow = vpH - anchor.bottom;
  const spaceAbove = anchor.top;
  const fitsBelow = spaceBelow >= popupHeight + GAP;
  const top = fitsBelow
    ? anchor.bottom + GAP
    : spaceAbove >= popupHeight + GAP
      ? anchor.top - popupHeight - GAP
      : Math.max(MARGIN, vpH - popupHeight - MARGIN); // hiçbir yere sığmadıysa görünür alana clamp

  // Yatay: anchor'a hizalı; sağdan/soldan taşıyorsa clamp.
  let left = anchor.left;
  if (left + width > vpW - MARGIN) left = vpW - width - MARGIN;
  if (left < MARGIN) left = MARGIN;

  return { top, left, width };
}

export function AutoAnchoredPopup({
  open,
  anchorRect,
  preferredWidth,
  minWidth,
  maxWidth = 500,
  maxHeight,
  shadowLevel = 'level2',
  zIndexTier = 'popup',
  paddingTier = 'base',
  closeOnEscape = true,
  closeOnClickOutside = true,
  onClose,
  ignoreOutsideClickSelectors,
  id,
  className,
  children,
}: AutoAnchoredPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Latest callback ref — listener'ları her render'da yeniden bağlamamak için.
  const stateRef = useRef({ onClose, ignoreOutsideClickSelectors });
  useEffect(() => {
    stateRef.current = { onClose, ignoreOutsideClickSelectors };
  }, [onClose, ignoreOutsideClickSelectors]);

  // Pozisyon: anchor değişince + scroll/resize'da yeniden hesapla.
  useLayoutEffect(() => {
    if (!open || !anchorRect) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPos(null);
      return;
    }
    const compute = () => {
      const popupH = popupRef.current?.offsetHeight ?? 200;
      const baseWidth = preferredWidth ?? Math.max(anchorRect.width, minWidth ?? 0);
      setPos(computePosition(anchorRect, popupH, baseWidth, maxWidth));
    };
    compute();
    // İçerik açıldıktan sonra popupH değişmiş olabilir — bir frame sonra yeniden ölç.
    const raf = requestAnimationFrame(compute);
    const handler = () => compute();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, anchorRect, preferredWidth, minWidth, maxWidth]);

  // Escape ile kapat.
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        stateRef.current.onClose?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeOnEscape]);

  // Dışarı tıklayınca kapat.
  useEffect(() => {
    if (!open || !closeOnClickOutside) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      const { ignoreOutsideClickSelectors: ignore } = stateRef.current;
      if (ignore && ignore.length > 0) {
        for (const sel of ignore) {
          if ((target as Element)?.closest?.(sel)) return;
        }
      }
      stateRef.current.onClose?.();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, closeOnClickOutside]);

  if (!open || !pos) return null;

  const padding =
    paddingTier === 'none'
      ? undefined
      : paddingTier === 'compact'
        ? POPUP.padding.compact
        : paddingTier === 'spacious'
          ? POPUP.padding.spacious
          : POPUP.padding.base;

  return createPortal(
    <div
      ref={popupRef}
      id={id}
      className={className}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        minWidth: pos.width,
        maxWidth,
        maxHeight,
        overflowY: maxHeight ? 'auto' : undefined,
        background: POPUP.surface.background,
        borderRadius: POPUP.radius.base,
        padding,
        boxShadow: POPUP.shadow[shadowLevel],
        zIndex: POPUP.zIndex[zIndexTier],
        animation: `cell-popup-fade-in ${POPUP.animation.fadeIn}`,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
