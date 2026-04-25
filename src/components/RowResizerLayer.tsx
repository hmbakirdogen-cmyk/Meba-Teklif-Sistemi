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
import { createPortal } from 'react-dom';
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
    if (!layerRef.current) return;
    const ids = satirIdsKey.split('|').filter(Boolean);
    const idSet = new Set(ids);

    const measure = () => {
      const layer = layerRef.current;
      if (!layer) return;
      // tableEl prop stale olabilir (table re-create edildiyse). Layer'ın
      // parent wrapper'ından canlı table'ı her seferinde bul.
      const wrapper = layer.parentElement;
      const liveTable =
        wrapper?.querySelector<HTMLTableElement>('table.offer-table') ?? tableEl;
      if (!liveTable || !liveTable.isConnected) return;

      const layerRect = layer.getBoundingClientRect();
      const next: RowGeom[] = [];
      // querySelectorAll ile tek seferde tüm data-satir-id'li TR'leri al.
      // Per-id CSS.escape querySelector başarısız olursa diye fallback iter.
      const allTrs = liveTable.querySelectorAll<HTMLTableRowElement>(
        'tr[data-satir-id]',
      );
      allTrs.forEach((tr) => {
        const id = tr.getAttribute('data-satir-id');
        if (!id || !idSet.has(id)) return;
        const r = tr.getBoundingClientRect();
        next.push({
          id,
          top: (r.top - layerRect.top) / scale,
          height: r.height / scale,
          left: (r.left - layerRect.left) / scale,
          width: r.width / scale,
          handleLeft: (r.left - layerRect.left) / scale,
          handleWidth: HANDLE_WIDTH_PX,
        });
      });
      setRows((prev) => (sameRows(prev, next) ? prev : next));
    };

    measure();

    // ResizeObserver — wrapper üzerinden canlı table'ı izle
    const wrapper = layerRef.current.parentElement;
    const ro = new ResizeObserver(measure);
    if (wrapper) ro.observe(wrapper);
    if (tableEl?.isConnected) ro.observe(tableEl);

    // MutationObserver — tablo veya TR'ler değişirse re-measure
    const mo = new MutationObserver(measure);
    if (wrapper) {
      mo.observe(wrapper, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-satir-id', 'style'] });
    }

    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
    // readOnly deps'te ÖNEMLİ: kilitli moddan düzenleme moduna geçince layer
    // mount olur ama tableEl/satirIds/scale değişmediği için effect bir daha
    // çalışmazdı. readOnly toggle'ı re-trigger eder.
  }, [tableEl, satirIdsKey, scale, readOnly]);

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

  // DEBUG banner — derin runtime tanı
  const wrap = layerRef.current?.parentElement;
  const liveTbl = wrap?.querySelector<HTMLTableElement>('table.offer-table');
  const allTrs = liveTbl?.querySelectorAll('tr[data-satir-id]') ?? [];
  const firstAttr = allTrs[0]?.getAttribute('data-satir-id') ?? 'NONE';
  const firstId = satirIds[0] ?? 'NONE';
  const wrapTag = wrap?.tagName ?? 'NONE';
  const tablesInDoc = document.querySelectorAll('table.offer-table').length;
  const allTrsInDoc = document.querySelectorAll('tr[data-satir-id]').length;

  const banner = createPortal(
    <div style={{
      position: 'fixed', top: 80, left: 16,
      background: 'red', color: 'white',
      padding: '8px 14px', fontSize: 11, fontFamily: 'monospace',
      zIndex: 99999, borderRadius: 6,
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      pointerEvents: 'none', maxWidth: '90vw', wordBreak: 'break-all',
    }}>
      readOnly={String(readOnly)} | satirIds={satirIds.length} | rows={rows.length}
      <br />
      wrap={wrapTag} | liveTbl={liveTbl ? 'Y' : 'N'} | allTrsInTbl={allTrs.length}
      <br />
      tablesInDoc={tablesInDoc} | allTrsInDoc={allTrsInDoc}
      <br />
      firstSatirId="{firstId}"
      <br />
      firstTrAttr="{firstAttr}"
    </div>,
    document.body
  );

  if (readOnly) return banner;

  return (
    <>
    {banner}
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
            // GÖRÜNÜR: 2px height + opacity 0.85 (premium ama net)
            background:
              'linear-gradient(90deg, rgba(15,23,42,0) 0%, rgba(30,64,175,0.95) 30%, rgba(59,130,246,0.85) 70%, rgba(15,23,42,0) 100%)',
            backgroundSize: 'calc(100% - 12px) 2px',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.85,
            boxShadow: '0 0 6px rgba(37,99,235,0.45)',
            transition: 'opacity 160ms ease, box-shadow 160ms ease',
          }}
        />
      ))}
    </div>
    </>
  );
}
