/**
 * TeklifPrintSayfasi.tsx — Server-side Puppeteer için minimal A4 sayfası.
 *
 * Akış:
 *  1. URL'den teklifId al
 *  2. /api/teklifler ile teklifi çek (GET liste, find by id; backend'de
 *     /api/teklifler/:id endpoint'i şu an yok)
 *  3. TeklifSablonu (lineer, offscreen) + KompaktAntet ile DOM ölçümü yap
 *  4. calculateTeklifPagination ile sayfa planı çıkar
 *  5. TeklifPagedDocument render et
 *  6. document.fonts.ready bekle, sonra data-print-ready="true" set et
 *     (Puppeteer page.waitForSelector için signal)
 *
 * Bu sayfada toolbar, sağ panel, header — hiçbir UI elementi yok.
 * Sadece A4 kağıt rendering. Body margin 0, padding 0.
 */

import { useEffect, useRef, useState, useMemo, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import TeklifSablonu, { KompaktAntet } from '../templates/TeklifSablonu';
import TeklifPagedDocument from '../templates/TeklifPagedDocument';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { calculateTeklifPagination, type TeklifPaginationResult } from '../services/documentPagination';
import { api } from '../services/apiClient';
import type { Teklif } from '../types';

const FALLBACK_PAGINATION: TeklifPaginationResult = {
  pages: [{
    pageNumber: 1,
    rowStartIndex: 0,
    rowEndIndex: 0,
    showFullHeader: true,
    showCompactHeader: false,
    showTableHeader: false,
    includeTotals: true,
    includeNotes: false,
    includeSignature: true,
  }],
  totalPages: 1,
};

export default function TeklifPrintSayfasi() {
  const { id } = useParams<{ id: string }>();
  const measureRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);
  const [teklif, setTeklif] = useState<Teklif | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<TeklifPaginationResult>(FALLBACK_PAGINATION);
  const [printReady, setPrintReady] = useState(false);

  // ── Teklif fetch ──
  useEffect(() => {
    if (!id) {
      // URL parametresi eksik — error state'e push (early validation).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Teklif ID belirtilmedi.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await api.teklifler.list();
        const found = (list as Teklif[]).find((t) => t.id === id);
        if (cancelled) return;
        if (!found) {
          setError('Teklif bulunamadı: ' + id);
          return;
        }
        setTeklif(found);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // ── Body & html style: print için tamamen beyaz, margin 0 ──
  useEffect(() => {
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyBg = document.body.style.background;
    const prevBodyMargin = document.body.style.margin;
    const prevBodyPadding = document.body.style.padding;
    document.documentElement.style.background = '#fff';
    document.body.style.background = '#fff';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    return () => {
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
      document.body.style.margin = prevBodyMargin;
      document.body.style.padding = prevBodyPadding;
    };
  }, []);

  const totals = useMemo(() => {
    if (!teklif) return null;
    return hesaplamaMotoru.teklifToplamlariniHesapla({
      araToplam: teklif.araToplam,
      kdvOrani: teklif.kdvOrani,
      iskontoOrani: teklif.iskontoOrani ?? 0,
    });
  }, [teklif]);

  // ── Pagination compute ──
  useLayoutEffect(() => {
    if (!teklif) return;
    const linearRoot = measureRef.current;
    const compactEl = compactRef.current;
    if (!linearRoot || !compactEl) return;
    const result = calculateTeklifPagination(linearRoot, compactEl, teklif.satirlar);
    setPagination(result);
  }, [teklif]);

  // ── Print-ready signal ──
  // Pagination hesaplandıktan + font'lar yüklendikten + 1 paint sonra
  // data-print-ready="true" bayrağını gövdeye yaz. Puppeteer waitForSelector
  // bu bayrağı bekler.
  useEffect(() => {
    if (!teklif || pagination === FALLBACK_PAGINATION) return;
    let cancelled = false;
    (async () => {
      try { await document.fonts.ready; } catch { /* fonts API yok */ }
      // 2× rAF ile paint settle bekle
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (cancelled) return;
      setPrintReady(true);
    })();
    return () => { cancelled = true; };
  }, [teklif, pagination]);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#b00' }}>
        <h2>Print render hatası</h2>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!teklif || !totals) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#666' }}>
        Yükleniyor...
      </div>
    );
  }

  return (
    <div data-print-ready={printReady ? 'true' : 'false'} style={{ background: '#fff' }}>
      {/* Offscreen ölçüm: lineer şablon */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '210mm',
          pointerEvents: 'none',
          colorScheme: 'light',
          background: '#fff',
        }}
      >
        <TeklifSablonu teklif={teklif} totals={totals} />
      </div>

      {/* Offscreen ölçüm: kompakt antet */}
      <div
        ref={compactRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '210mm',
          pointerEvents: 'none',
          colorScheme: 'light',
          background: '#fff',
        }}
      >
        <KompaktAntet teklif={teklif} />
      </div>

      {/* Görünür: gerçek paged document — Puppeteer bunu raster eder */}
      <div
        data-pdf-render-ready={printReady ? 'true' : 'false'}
        data-expected-page-count={pagination.totalPages}
        style={{ width: '210mm', margin: 0, padding: 0, background: '#fff' }}
      >
        <TeklifPagedDocument
          teklif={teklif}
          totals={totals}
          pages={pagination.pages}
        />
      </div>
    </div>
  );
}
