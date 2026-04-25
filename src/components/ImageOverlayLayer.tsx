/**
 * ImageOverlayLayer
 * ─────────────────────────────────────────────────────────────────
 * Bir A4 sayfasının üstünde duran absolute katman. İlgili sayfanın
 * (pageIndex) tüm görsellerini render eder.
 *
 *  • interactive=true   → screen view (drag/resize/select/keyboard)
 *  • interactive=false  → PDF capture (sadece <img>; kenarlık yok)
 *
 * Seçim ve klavye kontrolü "interactive" katmanın kendisinde tutulur.
 * Outside-click (sayfa içine ama görsel dışına) → deselect.
 * Klavye:
 *   - Delete / Backspace → seçili görseli sil
 *   - Arrow              → 1px hareket
 *   - Shift+Arrow        → 10px hareket
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageItem } from '../types';
import { ImageOverlayItem } from './ImageOverlayItem';

interface ImageOverlayLayerProps {
  pageIndex: number;
  pageWidthPx: number;
  pageHeightPx: number;
  gorseller: ImageItem[];
  interactive: boolean;
  onUpdate?: (id: string, partial: Partial<Omit<ImageItem, 'id'>>) => void;
  onDelete?: (id: string) => void;
}

export function ImageOverlayLayer({
  pageIndex,
  pageWidthPx,
  pageHeightPx,
  gorseller,
  interactive,
  onUpdate,
  onDelete,
}: ImageOverlayLayerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const items = gorseller.filter((g) => g.pageIndex === pageIndex);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // Outside-click → deselect (yalnızca tıklanan element layer'ın kendisi ise)
  const handleLayerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  }, [interactive]);

  // Klavye olayları — sadece interactive mod ve seçili öğe varken
  useEffect(() => {
    if (!interactive || !selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const sel = gorseller.find((g) => g.id === selectedId);
      if (!sel) return;
      const target = e.target as HTMLElement | null;
      // Inputtaysa yutma — kullanici metin yaziyordur
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete?.(selectedId);
        setSelectedId(null);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft')  dx = -step;
      if (e.key === 'ArrowRight') dx =  step;
      if (e.key === 'ArrowUp')    dy = -step;
      if (e.key === 'ArrowDown')  dy =  step;
      if (dx === 0 && dy === 0) return;
      e.preventDefault();
      const x = Math.max(0, Math.min(pageWidthPx  - sel.width,  sel.x + dx));
      const y = Math.max(0, Math.min(pageHeightPx - sel.height, sel.y + dy));
      onUpdate?.(selectedId, { x, y });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [interactive, selectedId, gorseller, onDelete, onUpdate, pageWidthPx, pageHeightPx]);

  // Görsel pageIndex değişince ve seçili kaybolursa temizle
  useEffect(() => {
    if (selectedId && !gorseller.some((g) => g.id === selectedId)) {
      setSelectedId(null);
    }
  }, [gorseller, selectedId]);

  if (items.length === 0 && !interactive) return null;

  return (
    <div
      ref={layerRef}
      className="image-overlay-layer"
      data-pdf-overlay-layer
      onPointerDown={handleLayerPointerDown}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: interactive ? 'auto' : 'none',
        zIndex: 60,
        // Layer arka plan SAYDAM kalır — alttaki belge tıklanmasi engellenmemeli
        background: 'transparent',
      }}
    >
      {items.map((g) => (
        <ImageOverlayItem
          key={g.id}
          item={g}
          pageWidthPx={pageWidthPx}
          pageHeightPx={pageHeightPx}
          interactive={interactive}
          selected={interactive && selectedId === g.id}
          onSelect={handleSelect}
          onCommit={onUpdate}
        />
      ))}
    </div>
  );
}
