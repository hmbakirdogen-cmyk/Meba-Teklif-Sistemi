import { useCallback, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import type { SatirCellField } from './inlineSatirEditorShared';

export type CellPopupPosition = {
  top: number;
  left: number;
  minWidth: number;
};

export const EMPTY_MARKED_CELL_STYLE: CSSProperties = Object.freeze({});

export function getMarkedCellStyle(
  _marked: boolean,
  _role: 'first' | 'mid' | 'last',
  _isActive = false,
  _isSetGroup = false,
): CSSProperties {
  void _marked;
  void _role;
  void _isActive;
  void _isSetGroup;
  return EMPTY_MARKED_CELL_STYLE;
}

export function useMarkedRows() {
  const [markedRowIds, setMarkedRowIds] = useState<Set<string>>(() => new Set());

  const toggleRowMark = useCallback(
    (satirId: string) => (e: ReactMouseEvent) => {
      e.stopPropagation();
      setMarkedRowIds((prev) => {
        const next = new Set(prev);
        if (next.has(satirId)) next.delete(satirId);
        else next.add(satirId);
        return next;
      });
    },
    [],
  );

  return { markedRowIds, toggleRowMark };
}

export function buildSatirCellSelector(satirId: string, field: SatirCellField): string {
  return `tr[data-satir-id="${CSS.escape(satirId)}"] td[data-cell-field="${field}"]`;
}

export function findSatirCellElement(satirId: string, field: SatirCellField): HTMLElement | null {
  const selector = buildSatirCellSelector(satirId, field);
  const nodes = document.querySelectorAll<HTMLElement>(selector);
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];

  // Birden fazla eşleşme (örn. PDF source kopyası offscreen mount edilmiş):
  // viewport içinde gerçekten görünür olanı seç. Offscreen kopyalar genelde
  // negatif left (-9999px) veya 0 boyutta olur — onları ele.
  let best: HTMLElement | null = null;
  let bestArea = -1;
  for (const el of Array.from(nodes)) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.right <= 0 || r.bottom <= 0) continue;
    if (r.left >= window.innerWidth || r.top >= window.innerHeight) continue;
    const visibleW = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
    const visibleH = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    const area = Math.max(0, visibleW) * Math.max(0, visibleH);
    if (area > bestArea) {
      bestArea = area;
      best = el;
    }
  }
  return best ?? nodes[0];
}

export function computeCellPopupPosition(params: {
  cellRect: DOMRect;
  popupHeight: number;
  popupWidth: number;
  minWidth: number;
  gap?: number;
  viewportPadding?: number;
}): CellPopupPosition {
  const {
    cellRect,
    popupHeight,
    popupWidth,
    minWidth,
    gap = 6,
    viewportPadding = 8,
  } = params;

  const spaceBelow = window.innerHeight - cellRect.bottom;
  const spaceAbove = cellRect.top;
  const placeBelow = spaceBelow >= popupHeight + (viewportPadding * 2) || spaceBelow > spaceAbove;

  const top = placeBelow
    ? cellRect.bottom + gap
    : Math.max(viewportPadding, cellRect.top - popupHeight - gap);

  const maxLeft = window.innerWidth - popupWidth - 12;
  const left = Math.max(viewportPadding, Math.min(cellRect.left, maxLeft));

  return {
    top,
    left,
    minWidth: Math.max(popupWidth, minWidth),
  };
}
