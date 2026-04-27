/**
 * RowResizerLayer
 * ─────────────────────────────────────────────────────────────────
 * Tek bir <table className="offer-table">'in üzerine binen overlay.
 * Her data-satir-id satırının altında ince bir tutamak (handle) çizer;
 * personel mouse ile tutup yukarı/aşağı sürükleyince SADECE o satırın
 * yüksekliği değişir, diğer satırlara dokunulmaz.
 *
 * Davranış:
 *  - Kilitli modda (readOnly=true) layer hiç DOM'a girmez.
 *  - Düzenleme modunda (readOnly=false) handles render edilir.
 *  - Handles sola yaslı, 1.75 cm uzunluğunda, 2px ince mavi gradient,
 *    pasif opacity 0.45 (görünür baseline), hover'da CSS opacity 1 + glow.
 *
 * Sağlam mount mantığı:
 *  - measure() canlı table'ı parentElement.querySelector ile her
 *    çağrıda taze bulur (stale tableEl prop'una karşı savunma).
 *  - useLayoutEffect deps'inde readOnly: kilit→düzenleme geçişinde
 *    layer mount olur olmaz measure tetiklenir.
 *  - ResizeObserver + MutationObserver: tablo veya TR'lerde değişim
 *    olduğunda (yeni satır, rowHeight güncelleme) re-measure.
 *
 * Performans:
 *  - Drag boyunca React state YENİDEN render edilmez. tr.style.height
 *    direkt DOM mutasyonuyla güncellenir (rAF-throttled).
 *  - pointerup'ta nihai değer onCommit() ile React'a verilir.
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
  handleLeft: number;   // tutamak başlangıcı (sola yaslı = r.left)
  handleWidth: number;  // No (#) + Marka kolon genişlikleri toplamı
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

// 4px hit area satırın TAM ALTINDA (= row.bottom çizgisi). Görsel 1px hat
// container'ın üst kenarına (cell border hizası) yerleşir.
const HANDLE_HIT_HEIGHT = 4;

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

  const satirIdsKey = satirIds.join('|');

  // ── Satır geometrilerini ölç ve observer'larla takip et ───────────────
  useLayoutEffect(() => {
    if (readOnly) {
      setRows([]);
      return;
    }
    if (!layerRef.current) return;
    const ids = satirIdsKey.split('|').filter(Boolean);
    const idSet = new Set(ids);

    const measure = () => {
      const layer = layerRef.current;
      if (!layer) return;
      // tableEl prop stale olabilir — layer.parentElement üzerinden taze bul.
      const wrapper = layer.parentElement;
      const liveTable =
        wrapper?.querySelector<HTMLTableElement>('table.offer-table') ?? tableEl;
      if (!liveTable || !liveTable.isConnected) return;

      const layerRect = layer.getBoundingClientRect();
      const next: RowGeom[] = [];
      const allTrs = liveTable.querySelectorAll<HTMLTableRowElement>(
        'tr[data-satir-id]',
      );
      allTrs.forEach((tr) => {
        const id = tr.getAttribute('data-satir-id');
        if (!id || !idSet.has(id)) return;
        const r = tr.getBoundingClientRect();
        // Handle genişliği: sadece # + Marka kolonlarının toplam genişliği.
        // tr.cells[0] = #, tr.cells[1] = Marka. Açıklama (cells[3]) dahil DEĞİL.
        const noCell = tr.cells[0] as HTMLElement | undefined;
        const markaCell = tr.cells[1] as HTMLElement | undefined;
        const noW = noCell ? noCell.getBoundingClientRect().width : 0;
        const markaW = markaCell ? markaCell.getBoundingClientRect().width : 0;
        const handleW = (noW + markaW) / scale;
        next.push({
          id,
          top: (r.top - layerRect.top) / scale,
          height: r.height / scale,
          left: (r.left - layerRect.left) / scale,
          width: r.width / scale,
          handleLeft: (r.left - layerRect.left) / scale,
          handleWidth: handleW > 0 ? handleW : 60, // fallback 60px
        });
      });
      setRows((prev) => (sameRows(prev, next) ? prev : next));
    };

    measure();

    const wrapper = layerRef.current.parentElement;
    const ro = new ResizeObserver(measure);
    if (wrapper) ro.observe(wrapper);
    if (tableEl?.isConnected) ro.observe(tableEl);

    const mo = new MutationObserver(measure);
    if (wrapper) {
      mo.observe(wrapper, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-satir-id', 'style'],
      });
    }

    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [tableEl, satirIdsKey, scale, readOnly]);

  // ── Drag state machine ────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (readOnly) return;
    const wrapper = layerRef.current?.parentElement;
    const liveTable =
      wrapper?.querySelector<HTMLTableElement>('table.offer-table') ?? tableEl;
    if (!liveTable) return;
    const tr = liveTable.querySelector<HTMLElement>(
      `tr[data-satir-id="${CSS.escape(id)}"]`,
    );
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
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    tr.setAttribute('data-resizing', 'true');
    (e.currentTarget as HTMLElement).setAttribute('data-active', 'true');
  };

  const flush = () => {
    const d = dragRef.current;
    if (!d || d.pendingH == null) return;
    d.trEl.style.height = `${d.pendingH}px`;
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
            // Container satırın TAM ALTINDA (= row.bottom çizgisi). Visual
            // 1px hat container'ın üst kenarına (top) yapışır → cell border
            // hizası birebir.
            top: `${r.top + r.height - HANDLE_HIT_HEIGHT}px`,
            height: `${HANDLE_HIT_HEIGHT}px`,
            cursor: 'ns-resize',
            pointerEvents: 'auto',
            touchAction: 'none',
            // 2px neon canlı mavi hat — hat kendisi doygun parlak; CSS hover/
            // active'te hafif drop-shadow halesi (yumuşak ışık).
            background:
              'linear-gradient(90deg, rgba(15,23,42,0) 0%, rgba(56,140,255,1) 30%, rgba(96,180,255,1) 70%, rgba(15,23,42,0) 100%)',
            backgroundSize: 'calc(100% - 12px) 2px',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
            opacity: 0,
            transition: 'opacity 160ms ease, filter 160ms ease',
          }}
        />
      ))}
    </div>
  );
}
