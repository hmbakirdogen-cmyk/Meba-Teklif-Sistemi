/**
 * RowResizerLayer
 * ─────────────────────────────────────────────────────────────────
 * Tek bir <table className="offer-table">'in üzerine binen overlay.
 * Her data-satir-id satırının altında ince bir tutamak (handle) çizer;
 * personel mouse ile tutup yukarı/aşağı sürükleyince SADECE o satırın
 * yüksekliği değişir, diğer satırlara dokunulmaz.
 *
 * Performans:
 *  - Drag boyunca React state YENİDEN render edilmez. tr.style.height
 *    direkt DOM mutasyonuyla güncellenir (rAF-throttled).
 *  - pointerup'ta nihai değer onCommit() ile React'a verilir,
 *    state akışı (satirGuncelle) buradan ilerler.
 *
 * Scale:
 *  - CanliA4Belge transform: scale(scale) uyguladığı için clientY delta
 *    ekran-px'tir. document-px'e çevirmek için scale ile bölünür.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LINE_ITEM_METRICS } from '../templates/teklifDocumentShared';

interface RowGeom {
  id: string;
  top: number;     // layer'ın iç koordinatında (px)
  height: number;
  left: number;
  width: number;        // satırın tam genişliği (drag geometrisi için)
  handleLeft: number;   // tutamak başlangıcı (Ürün Kodu kolonu solu)
  handleWidth: number;  // tutamak genişliği (Kod + Açıklama kolonları toplamı)
}

interface RowResizerLayerProps {
  tableEl: HTMLTableElement | null;
  satirIds: string[];
  scale: number;
  readOnly: boolean;
  onCommit: (id: string, heightPx: number) => void;
}

const sameRows = (a: RowGeom[], b: RowGeom[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.id !== y.id || x.top !== y.top || x.height !== y.height || x.left !== y.left || x.width !== y.width || x.handleLeft !== y.handleLeft || x.handleWidth !== y.handleWidth) return false;
  }
  return true;
};

// 6px hit area: 2px satır içinde + 4px gap'te. Kolay hover yakalama.
const HANDLE_HIT_HEIGHT = 6;
const HANDLE_INSIDE_ROW_PX = 2;
// Sabit handle uzunluğu: 1.75 cm = 17.5 mm ≈ 66 px (96 DPI document-px).
const HANDLE_WIDTH_PX = 66;

export function RowResizerLayer({
  tableEl,
  satirIds,
  scale,
  readOnly,
  onCommit,
}: RowResizerLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<RowGeom[]>([]);
  const dragRef = useRef<{
    id: string;
    trEl: HTMLElement;
    startY: number;
    startH: number;
    pointerId: number;
    rafId: number | null;
    pendingH: number | null;
  } | null>(null);

  // satirIds her render'da yeni array → join ile string'e çevir, dep olarak kullan
  const satirIdsKey = satirIds.join('|');

  // ── Satır geometrilerini ölç ve ResizeObserver ile takip et ─────────
  useLayoutEffect(() => {
    if (!tableEl || !layerRef.current) return;
    const ids = satirIdsKey.split('|').filter(Boolean);

    const measure = () => {
      const layer = layerRef.current;
      if (!layer) return;
      const layerRect = layer.getBoundingClientRect();
      const next: RowGeom[] = [];
      for (const id of ids) {
        const tr = tableEl.querySelector<HTMLTableRowElement>(
          `tr[data-satir-id="${CSS.escape(id)}"]`,
        );
        if (!tr) continue;
        const r = tr.getBoundingClientRect();
        // Handle: sola yaslı (tr.left), sabit 2.5 cm uzunluk (HANDLE_WIDTH_PX).
        // Cells'e bağlı dinamik hesap kaldırıldı — net sabit ölçü.
        next.push({
          id,
          top: (r.top - layerRect.top) / scale,
          height: r.height / scale,
          left: (r.left - layerRect.left) / scale,
          width: r.width / scale,
          handleLeft: (r.left - layerRect.left) / scale,
          handleWidth: HANDLE_WIDTH_PX,
        });
      }
      // İçerik değişmediyse setState çağrısı YAPMA — gereksiz re-render yok
      setRows((prev) => (sameRows(prev, next) ? prev : next));
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(tableEl);
    const trEls = Array.from(tableEl.querySelectorAll<HTMLElement>('tr[data-satir-id]'));
    trEls.forEach((el) => ro.observe(el));

    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [tableEl, satirIdsKey, scale]);

  // ── Drag state machine ────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (readOnly || !tableEl) return;
    const tr = tableEl.querySelector<HTMLElement>(`tr[data-satir-id="${CSS.escape(id)}"]`);
    if (!tr) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const startH = tr.getBoundingClientRect().height / scale;
    dragRef.current = {
      id,
      trEl: tr,
      startY: e.clientY,
      startH,
      pointerId: e.pointerId,
      rafId: null,
      pendingH: null,
    };
    // Body cursor ve seçimi kilitle
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    tr.setAttribute('data-resizing', 'true');
    (e.currentTarget as HTMLElement).setAttribute('data-active', 'true');
  };

  const flush = () => {
    const d = dragRef.current;
    if (!d || d.pendingH == null) return;
    d.trEl.style.height = `${d.pendingH}px`;
    // tüm td'ler de aynı satıra ait — tr height değişince td'ler intibak eder
    d.pendingH = null;
    d.rafId = null;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const deltaScreen = e.clientY - d.startY;
    const deltaDoc = scale > 0 ? deltaScreen / scale : deltaScreen;
    const next = Math.max(LINE_ITEM_METRICS.rowHeightPx, Math.round(d.startH + deltaDoc));
    d.pendingH = next;
    if (d.rafId == null) {
      d.rafId = requestAnimationFrame(flush);
    }
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (d.rafId != null) {
      cancelAnimationFrame(d.rafId);
      d.rafId = null;
    }
    if (d.pendingH != null) {
      d.trEl.style.height = `${d.pendingH}px`;
      d.pendingH = null;
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    d.trEl.removeAttribute('data-resizing');
    (e.currentTarget as HTMLElement).removeAttribute('data-active');
    const finalHeight = Math.round(d.trEl.getBoundingClientRect().height / scale);
    const id = d.id;
    dragRef.current = null;
    if (commit) onCommit(id, finalHeight);
  };

  // Cleanup — komponent unmount olursa body cursor kilidini bırak
  useEffect(() => () => {
    if (dragRef.current?.rafId != null) cancelAnimationFrame(dragRef.current.rafId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  if (readOnly) return null;

  return (
    <div
      ref={layerRef}
      className="row-resizer-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 30,
      }}
    >
      {rows.map((r) => (
        <div
          key={r.id}
          className="row-resize-handle"
          data-row-id={r.id}
          onPointerDown={(e) => onPointerDown(e, r.id)}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finish(e, true)}
          onPointerCancel={(e) => finish(e, false)}
          style={{
            position: 'absolute',
            left: `${r.handleLeft}px`,
            width: `${r.handleWidth}px`,
            top: `${r.top + r.height - HANDLE_INSIDE_ROW_PX}px`,
            height: `${HANDLE_HIT_HEIGHT}px`,
            cursor: 'ns-resize',
            pointerEvents: 'auto',
            touchAction: 'none',
            // 1px çok ince premium lacivert hat — hit area 6px (kolay hover),
            // visual sadece 1px orta strip. Pasifte INVISIBLE; CSS :hover ile
            // opacity 1'e + glow ile vurgulanır.
            background:
              'linear-gradient(90deg, rgba(15,23,42,0) 0%, rgba(30,64,175,0.85) 30%, rgba(59,130,246,0.65) 70%, rgba(15,23,42,0) 100%)',
            backgroundSize: 'calc(100% - 16px) 1px',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.22,
            transition: 'opacity 160ms ease, box-shadow 160ms ease',
          }}
        />
      ))}
    </div>
  );
}
