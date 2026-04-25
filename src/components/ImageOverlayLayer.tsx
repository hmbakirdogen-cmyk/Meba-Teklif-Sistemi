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
import { useCallback, useEffect, useState } from 'react';
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

  const items = gorseller.filter((g) => g.pageIndex === pageIndex);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

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

  // Document-level outside-click → deselect.
  // Layer'ın kendisi pointer-events:none olduğu için tıklamaları yakalayamaz;
  // bu yüzden global listener ile resim dışına tıklamayı tespit ederiz.
  useEffect(() => {
    if (!interactive || !selectedId) return;
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-image-overlay-item]')) return;
      setSelectedId(null);
    };
    document.addEventListener('mousedown', onDocDown, true);
    return () => document.removeEventListener('mousedown', onDocDown, true);
  }, [interactive, selectedId]);

  if (items.length === 0 && !interactive) return null;

  return (
    <div
      className="image-overlay-layer"
      data-pdf-overlay-layer
      // KRİTİK: layer wrapper HER ZAMAN pointer-events: none. Aksi takdirde
      // boş bir layer bile A4'ün üstüne binip cell click'lerini yutar.
      // Görsellerin kendi <div>'leri pointer-events: auto ile kendi
      // tıklamalarını yakalar (ImageOverlayItem içinde).
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 60,
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
