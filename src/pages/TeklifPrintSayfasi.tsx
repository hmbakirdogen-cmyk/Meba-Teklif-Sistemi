/**
 * TeklifPrintSayfasi.tsx — Tarayıcı print preview (Ctrl+P) için minimal A4 dokümanı.
 *
 * NOT: Render bulut deployment'ında server-side Puppeteer kaldırıldı; PDF
 * üretimi tamamen client-side `src/services/pdfService.ts` (html2canvas +
 * jsPDF) üzerinden yapılıyor. Bu sayfa şimdi yalnızca tarayıcının built-in
 * print/önizleme akışı için (kullanıcı /teklif/:id/print URL'sini yeni
 * tab'da açıp Ctrl+P ile çıkarabilir).
 *
 * Akış:
 *  1. URL'den teklifId al
 *  2. /api/teklifler ile teklifi çek (GET liste, find by id)
 *  3. TeklifSablonu (lineer, offscreen) + KompaktAntet ile DOM ölçümü
 *  4. calculateTeklifPagination ile sayfa planı çıkar
 *  5. TeklifPagedDocument render et
 *  6. document.fonts.ready bekle, sonra data-print-ready="true" set et
 *     (kullanıcının tarayıcı print API'si için signal)
 *
 * Bu sayfada toolbar, sağ panel, header — hiçbir UI elementi yok.
 * Sadece A4 kağıt rendering. Body margin 0, padding 0.
 */

import { useEffect, useRef, useState, useMemo, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import TeklifSablonu, { KompaktAntet } from '../templates/TeklifSablonu';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { calculateTeklifPagination, type TeklifPaginationResult } from '../services/documentPagination';
import { api } from '../services/apiClient';
import PaginatedBelgeInlineEditor from '../components/PaginatedBelgeInlineEditor';
import type { Snapshot } from '../hooks/useUndoRedo';
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

// Print sayfası read-only — düzenleme callback'leri için no-op stub'lar.
// Type imzası rest params alır (her callback farklı parametre sayısıyla çağrılır),
// implementation body'de hiçbir argüman tüketilmez → lint temiz, type compat korunur.
const noop: (...args: unknown[]) => void = () => {};
const noopToggleRowMark = () => () => {};

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

  const markedRowIds = useMemo(() => new Set<string>(), []);
  const readonlySnapshot = useMemo<Snapshot | null>(() => {
    if (!teklif) return null;
    return {
      satirlar: teklif.satirlar,
      cari: teklif.cari,
      contactName: teklif.contactName ?? '',
      contactTitle: teklif.contactTitle ?? 'YETKILI',
      paraBirimi: teklif.paraBirimi,
      kdvOrani: teklif.kdvOrani,
      iskontoOrani: teklif.iskontoOrani ?? 0,
      odemeVadesi: teklif.odemeVadesi ?? '45 Gün',
      gecerlilikSuresi: teklif.gecerlilikSuresi ?? '1 Hafta',
      dovizKuru: teklif.dovizKuru ?? 'TCMB Fatura',
      notlar: teklif.notlar ?? '',
      notlarGosterilsin: teklif.notlarGosterilsin ?? false,
      tarih: teklif.tarih,
      ilgiliKisiId: teklif.ilgiliKisiId,
      ilgiliKisiAdSoyad: teklif.ilgiliKisiAdSoyad,
      satirBazliParaBirimi: teklif.satirBazliParaBirimi ?? false,
      satirBazliIskonto: teklif.satirBazliIskonto ?? false,
      firmaId: teklif.firmaId ?? '',
    };
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

  if (!teklif || !totals || !readonlySnapshot) {
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
        <PaginatedBelgeInlineEditor
          teklif={teklif}
          totals={totals}
          pages={pagination.pages}
          editingAlan={null}
          onEditingAlanDegistir={noop}
          onCariDegistir={noop}
          onCariEPostaDegistir={noop}
          onCariTelefonDegistir={noop}
          onCariSehirDegistir={noop}
          contactName={teklif.contactName ?? ''}
          contactTitle={teklif.contactTitle ?? 'YETKILI'}
          onContactNameDegistir={noop}
          onContactTitleDegistir={noop}
          onTarihDegistir={noop}
          onParaBirimiDegistir={noop}
          satirBazliParaBirimi={teklif.satirBazliParaBirimi ?? false}
          satirBazliIskonto={teklif.satirBazliIskonto ?? false}
          onKdvOraniDegistir={noop}
          onOdemeVadesiDegistir={noop}
          onGecerlilikSuresiDegistir={noop}
          onDovizKuruDegistir={noop}
          onSatirGuncelle={noop}
          onSatiraSetUygula={noop}
          onSatirSil={noop}
          onSatirEkle={noop}
          onSatirArayaEkle={noop}
          onNotlarDegistir={noop}
          readOnly
          scale={1}
          markedRowIds={markedRowIds}
          toggleRowMark={noopToggleRowMark}
          rootClassName="belge-pdf-source"
          pushUndo={noop}
          getSnapshot={() => readonlySnapshot}
        />
      </div>
    </div>
  );
}
