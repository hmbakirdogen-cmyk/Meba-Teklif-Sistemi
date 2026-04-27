/**
 * ImageOverlayItem
 * ─────────────────────────────────────────────────────────────────
 * Tek bir A4 üstü görsel.
 *
 *  • Interactive mode:
 *      - Click → seçim
 *      - Drag (PointerEvents) → x/y günceller, requestAnimationFrame ile commit
 *      - 4 köşe handle → resize (default aspect-lock; Shift = serbest)
 *      - Boundary clamp → A4 sayfa kenarlarına yapışır
 *      - Min boyut → 40px
 *      - Seçili değilken HİÇBİR UI görünmez
 *  • Static (PDF / kilitli) mode:
 *      - Sadece <img>; kenarlık ve handle yok
 *
 * Konum/ölçü güncellemeleri parent'a `onCommit({ id, partial })` ile aktarılır;
 * sürükleme/resize sırasında sadece local optimistic state güncellenir
 * (re-render patlaması olmaz).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImageItem } from '../types';

const MIN_SIZE = 40;
const HANDLE_SIZE = 9;

type Corner = 'nw' | 'ne' | 'sw' | 'se';

interface ImageOverlayItemProps {
  item: ImageItem;
  pageWidthPx: number;
  pageHeightPx: number;
  interactive: boolean;
  selected: boolean;
  onSelect?: (id: string) => void;
  onCommit?: (id: string, partial: Partial<Omit<ImageItem, 'id'>>) => void;
}

interface Geom {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function ImageOverlayItem({
  item,
  pageWidthPx,
  pageHeightPx,
  interactive,
  selected,
  onSelect,
  onCommit,
}: ImageOverlayItemProps) {
  const [optimistic, setOptimistic] = useState<Geom | null>(null);
  const [dragMode, setDragMode] = useState<'move' | Corner | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    mode: 'move' | Corner;
    startX: number;
    startY: number;
    geom: Geom;
    aspect: number;
    shiftDown: boolean;
  } | null>(null);

  const geom: Geom = optimistic ?? {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  };

  const aspect = useMemo(
    () => (item.height > 0 ? item.width / item.height : 1),
    [item.width, item.height],
  );

  const scheduleSet = useCallback((g: Geom) => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setOptimistic(g);
      rafRef.current = null;
    });
  }, []);

  const finishGesture = useCallback((g: Geom) => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setOptimistic(null);
    setDragMode(null);
    onCommit?.(item.id, {
      x: Math.round(g.x),
      y: Math.round(g.y),
      width: Math.round(g.width),
      height: Math.round(g.height),
    });
  }, [item.id, onCommit]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, mode: 'move' | Corner) => {
    if (!interactive) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(item.id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragMode(mode);
    dragRef.current = {
      pointerId: e.pointerId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      geom: { x: geom.x, y: geom.y, width: geom.width, height: geom.height },
      aspect,
      shiftDown: e.shiftKey,
    };
  }, [interactive, onSelect, item.id, geom.x, geom.y, geom.width, geom.height, aspect]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    d.shiftDown = e.shiftKey;

    if (d.mode === 'move') {
      const x = clamp(d.geom.x + dx, 0, pageWidthPx - d.geom.width);
      const y = clamp(d.geom.y + dy, 0, pageHeightPx - d.geom.height);
      scheduleSet({ ...d.geom, x, y });
      return;
    }

    // Resize — köşeden ölçek
    const lockAspect = !d.shiftDown;
    let { x, y, width, height } = d.geom;

    const minW = MIN_SIZE;
    const minH = MIN_SIZE;

    if (d.mode === 'se') {
      width  = clamp(d.geom.width  + dx, minW, pageWidthPx  - d.geom.x);
      height = clamp(d.geom.height + dy, minH, pageHeightPx - d.geom.y);
      if (lockAspect) {
        const wByH = height * d.aspect;
        const hByW = width / d.aspect;
        if (Math.abs(dx) >= Math.abs(dy)) height = clamp(hByW, minH, pageHeightPx - d.geom.y);
        else                              width  = clamp(wByH, minW, pageWidthPx  - d.geom.x);
      }
    } else if (d.mode === 'ne') {
      width   = clamp(d.geom.width  + dx, minW, pageWidthPx - d.geom.x);
      const hCand = clamp(d.geom.height - dy, minH, d.geom.y + d.geom.height);
      height  = hCand;
      if (lockAspect) {
        const hByW = width / d.aspect;
        const wByH = height * d.aspect;
        if (Math.abs(dx) >= Math.abs(dy)) height = clamp(hByW, minH, d.geom.y + d.geom.height);
        else                              width  = clamp(wByH, minW, pageWidthPx - d.geom.x);
      }
      y = d.geom.y + (d.geom.height - height);
    } else if (d.mode === 'sw') {
      const wCand = clamp(d.geom.width - dx, minW, d.geom.x + d.geom.width);
      width   = wCand;
      height  = clamp(d.geom.height + dy, minH, pageHeightPx - d.geom.y);
      if (lockAspect) {
        const hByW = width / d.aspect;
        const wByH = height * d.aspect;
        if (Math.abs(dx) >= Math.abs(dy)) height = clamp(hByW, minH, pageHeightPx - d.geom.y);
        else                              width  = clamp(wByH, minW, d.geom.x + d.geom.width);
      }
      x = d.geom.x + (d.geom.width - width);
    } else { // 'nw'
      const wCand = clamp(d.geom.width - dx, minW, d.geom.x + d.geom.width);
      const hCand = clamp(d.geom.height - dy, minH, d.geom.y + d.geom.height);
      width  = wCand;
      height = hCand;
      if (lockAspect) {
        const hByW = width / d.aspect;
        const wByH = height * d.aspect;
        if (Math.abs(dx) >= Math.abs(dy)) height = clamp(hByW, minH, d.geom.y + d.geom.height);
        else                              width  = clamp(wByH, minW, d.geom.x + d.geom.width);
      }
      x = d.geom.x + (d.geom.width - width);
      y = d.geom.y + (d.geom.height - height);
    }

    scheduleSet({ x, y, width, height });
  }, [pageWidthPx, pageHeightPx, scheduleSet]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const final = optimistic ?? { x: item.x, y: item.y, width: item.width, height: item.height };
    dragRef.current = null;
    finishGesture(final);
  }, [optimistic, item.x, item.y, item.width, item.height, finishGesture]);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const showHandles = interactive && selected;

  return (
    <div
      data-image-overlay-item
      data-image-id={item.id}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'absolute',
        left: `${geom.x}px`,
        top: `${geom.y}px`,
        width: `${geom.width}px`,
        height: `${geom.height}px`,
        zIndex: item.zIndex,
        cursor: interactive ? (dragMode === 'move' ? 'grabbing' : 'grab') : 'default',
        boxSizing: 'border-box',
        outline: showHandles ? '1px solid #2563EB' : 'none',
        outlineOffset: '0px',
        boxShadow: showHandles ? '0 0 0 1px rgba(37,99,235,0.18), 0 6px 18px rgba(0,0,0,0.10)' : 'none',
        userSelect: 'none',
        touchAction: interactive ? 'none' : 'auto',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      <img
        src={item.src}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'fill',
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserDrag: 'none',
        } as React.CSSProperties}
      />

      {showHandles && (['nw', 'ne', 'sw', 'se'] as const).map((c) => {
        const pos: React.CSSProperties = {
          position: 'absolute',
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          background: '#fff',
          border: '1px solid #2563EB',
          borderRadius: 2,
          boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
          cursor:
            c === 'nw' || c === 'se' ? 'nwse-resize' : 'nesw-resize',
          touchAction: 'none',
        };
        if (c === 'nw') { pos.left = -Math.floor(HANDLE_SIZE / 2); pos.top    = -Math.floor(HANDLE_SIZE / 2); }
        if (c === 'ne') { pos.right = -Math.floor(HANDLE_SIZE / 2); pos.top   = -Math.floor(HANDLE_SIZE / 2); }
        if (c === 'sw') { pos.left = -Math.floor(HANDLE_SIZE / 2); pos.bottom = -Math.floor(HANDLE_SIZE / 2); }
        if (c === 'se') { pos.right = -Math.floor(HANDLE_SIZE / 2); pos.bottom = -Math.floor(HANDLE_SIZE / 2); }
        return (
          <div
            key={c}
            data-image-overlay-handle={c}
            onPointerDown={(e) => onPointerDown(e, c)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={pos}
          />
        );
      })}
    </div>
  );
}
