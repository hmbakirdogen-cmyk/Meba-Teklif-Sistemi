import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import TeklifSablonu, { KompaktAntet } from '../templates/TeklifSablonu';
import PaginatedBelgeInlineEditor, { type EditingAlan } from './PaginatedBelgeInlineEditor';
import { useMarkedRows } from './paginatedBelgeInlineHelpers';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { calculateTeklifPagination, type TeklifPaginationResult } from '../services/documentPagination';
import { DOCUMENT_PAGE, mmToPx } from '../templates/teklifDocumentShared';
import { ImageOverlayLayer } from './ImageOverlayLayer';
import type { Teklif, Cari, TeklifSatiri, ParaBirimi, ImageItem } from '../types';
import type { Snapshot } from '../hooks/useUndoRedo';

const A4_W_PX = Math.round(mmToPx(DOCUMENT_PAGE.widthMm));
const A4_H_PX = Math.round(mmToPx(DOCUMENT_PAGE.heightMm));

interface CanliA4BelgeProps {
  teklif: Teklif;
  editingAlan: EditingAlan;
  onEditingAlanDegistir: (alan: EditingAlan) => void;
  onCariDegistir: (cari: Cari) => void;
  onCariEPostaDegistir: (email: string) => void;
  onCariTelefonDegistir: (telefon: string) => void;
  onCariSehirDegistir: (sehir: string) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM' | 'YETKILI';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM' | 'YETKILI') => void;
  onTarihDegistir: (tarih: string) => void;
  onParaBirimiDegistir: (pb: ParaBirimi) => void;
  satirBazliParaBirimi: boolean;
  onSatirBazliParaBirimiDegistir?: (aktif: boolean) => void;
  satirBazliIskonto: boolean;
  onKdvOraniDegistir: (oran: number) => void;
  onOdemeVadesiDegistir: (vade: string) => void;
  onGecerlilikSuresiDegistir: (sure: string) => void;
  onDovizKuruDegistir: (kur: string) => void;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatiraSetUygula: (satirId: string, setId: string) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;
  onSatirArayaEkle: (afterIndex: number) => void;
  onNotlarDegistir: (notlar: string) => void;
  onKargoNotuMetniDegistir?: (metin: string) => void;
  onKargoNotuGizliDegistir?: (gizli: boolean) => void;
  sablonRef: React.RefObject<HTMLDivElement | null>;
  kompaktHeaderRef: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
  gorseller: ImageItem[];
  onGorselGuncelle: (id: string, partial: Partial<Omit<ImageItem, 'id'>>) => void;
  onGorselSil: (id: string) => void;
  /** Undo stack push — popup commit + cari/ayar değişikliklerinde tetiklenir. */
  pushUndo: (snapshot: Snapshot) => void;
  getSnapshot: () => Snapshot;
  /**
   * Kısmi onay seçim modu — A4'te satır tıkla-işaretle ile iptal kalemleri
   * belirlenir. Sadece görünür (live editor) instance'a iletilir; offscreen
   * PDF source clone'una geçilmez (PDF capture sırasında scrim olmaz).
   */
  kismiOnaySecim?: {
    iptalSet: Set<string>;
    onToggle: (satirId: string) => void;
  };
}

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

export default function CanliA4Belge({
  teklif,
  editingAlan,
  onEditingAlanDegistir,
  onCariDegistir,
  onCariEPostaDegistir,
  onCariTelefonDegistir,
  onCariSehirDegistir,
  contactName,
  contactTitle,
  onContactNameDegistir,
  onContactTitleDegistir,
  onTarihDegistir,
  onParaBirimiDegistir,
  satirBazliParaBirimi,
  onSatirBazliParaBirimiDegistir,
  satirBazliIskonto,
  onKdvOraniDegistir,
  onOdemeVadesiDegistir,
  onGecerlilikSuresiDegistir,
  onDovizKuruDegistir,
  onSatirGuncelle,
  onSatiraSetUygula,
  onSatirSil,
  onSatirEkle,
  onSatirArayaEkle,
  onNotlarDegistir,
  onKargoNotuMetniDegistir,
  onKargoNotuGizliDegistir,
  sablonRef,
  kompaktHeaderRef,
  readOnly = false,
  gorseller,
  onGorselGuncelle,
  onGorselSil,
  pushUndo,
  getSnapshot,
  kismiOnaySecim,
}: CanliA4BelgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalH, setNaturalH] = useState(Math.round(mmToPx(DOCUMENT_PAGE.heightMm)));
  const [pagination, setPagination] = useState<TeklifPaginationResult>(FALLBACK_PAGINATION);
  const [paginationReady, setPaginationReady] = useState(false);

  // Satır işaretleme state'i — kullanıcı satır numarasına tıklayınca toggle.
  // Burada üst seviyede tutuyoruz çünkü hem canlı düzenleyici (PaginatedBelgeInlineEditor)
  // hem de PDF kaynağı (TeklifPagedDocument) aynı state'e ihtiyaç duyar: işaretli
  // satır PDF çıktısında da görsel olarak aynı şekilde işaretli görünür.
  const { markedRowIds, toggleRowMark } = useMarkedRows();

  const totals = useMemo(
    () => hesaplamaMotoru.teklifToplamlariniHesapla({
      araToplam: teklif.araToplam,
      kdvOrani: teklif.kdvOrani,
      iskontoOrani: teklif.iskontoOrani ?? 0,
    }),
    [teklif.araToplam, teklif.kdvOrani, teklif.iskontoOrani],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      setScale(Math.min(1, w / A4_W_PX));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useLayoutEffect(() => {
    const linearRoot = measureRef.current;
    const compactHeaderEl = kompaktHeaderRef.current;
    if (!linearRoot || !compactHeaderEl) return;
    // Layout ölçüm öncesi pagination ready bayrağını sıfırla — DOM ölçüm sonrası
    // measure() içinde yeniden true yapılır. ResizeObserver-driven external sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaginationReady(false);

    // Faz 2 — 800ms debounce: yazım sırasında her keystroke pagination recompute
    // tetiklemesin. İlk run leading-immediate (mount + ilk değişiklik), sonraki
    // çağrılar trailing-debounced. PDF export waitForPagedDomReady polling
    // sırasında data-pdf-render-ready=false → true bekler; debounce gecikmesi
    // PDF render'ı bloklamaz, sadece UI yeniden hesabı geciktirir.
    let firstRun = true;
    let timerId: number | null = null;

    const compute = () => {
      setPagination(calculateTeklifPagination(linearRoot, compactHeaderEl, teklif.satirlar));
      setPaginationReady(true);
    };

    const measure = () => {
      if (firstRun) {
        firstRun = false;
        compute();
        return;
      }
      setPaginationReady(false);
      if (timerId !== null) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        compute();
        timerId = null;
      }, 800);
    };

    const obs = new ResizeObserver(measure);
    obs.observe(linearRoot);
    obs.observe(compactHeaderEl);
    measure();
    return () => {
      obs.disconnect();
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [teklif, kompaktHeaderRef]);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.offsetHeight;
      if (h > 0) setNaturalH(h);
    };

    const obs = new ResizeObserver(measure);
    obs.observe(el);
    measure();
    return () => obs.disconnect();
  }, [pagination, editingAlan, teklif]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onEditingAlanDegistir(null);
  };

  return (
    <div
      ref={containerRef}
      className={kismiOnaySecim ? 'belge-kismi-secim-aktif' : undefined}
      style={{ width: '100%', maxWidth: `${A4_W_PX}px` }}
    >
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: `${DOCUMENT_PAGE.widthMm}mm`,
          pointerEvents: 'none',
          colorScheme: 'light',
          background: '#fff',
        }}
      >
        <TeklifSablonu teklif={teklif} totals={totals} />
      </div>

      <div
        ref={sablonRef}
        aria-hidden
        data-pdf-render-ready={paginationReady ? 'true' : 'false'}
        data-expected-page-count={pagination.totalPages}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: `${DOCUMENT_PAGE.widthMm}mm`,
          pointerEvents: 'none',
          colorScheme: 'light',
          background: '#fff',
        }}
      >
        <PaginatedBelgeInlineEditor
          teklif={teklif}
          totals={totals}
          pages={pagination.pages}
          scale={1}
          markedRowIds={markedRowIds}
          toggleRowMark={toggleRowMark}
          editingAlan={null}
          onEditingAlanDegistir={onEditingAlanDegistir}
          onCariDegistir={onCariDegistir}
          onCariEPostaDegistir={onCariEPostaDegistir}
          onCariTelefonDegistir={onCariTelefonDegistir}
          onCariSehirDegistir={onCariSehirDegistir}
          contactName={contactName}
          contactTitle={contactTitle}
          onContactNameDegistir={onContactNameDegistir}
          onContactTitleDegistir={onContactTitleDegistir}
          onTarihDegistir={onTarihDegistir}
          onParaBirimiDegistir={onParaBirimiDegistir}
          satirBazliParaBirimi={satirBazliParaBirimi}
          onSatirBazliParaBirimiDegistir={onSatirBazliParaBirimiDegistir}
          satirBazliIskonto={satirBazliIskonto}
          onKdvOraniDegistir={onKdvOraniDegistir}
          onOdemeVadesiDegistir={onOdemeVadesiDegistir}
          onGecerlilikSuresiDegistir={onGecerlilikSuresiDegistir}
          onDovizKuruDegistir={onDovizKuruDegistir}
          onSatirGuncelle={onSatirGuncelle}
          onSatiraSetUygula={onSatiraSetUygula}
          onSatirSil={onSatirSil}
          onSatirEkle={onSatirEkle}
          onSatirArayaEkle={onSatirArayaEkle}
          onNotlarDegistir={onNotlarDegistir}
          onKargoNotuMetniDegistir={onKargoNotuMetniDegistir}
          onKargoNotuGizliDegistir={onKargoNotuGizliDegistir}
          readOnly
          rootClassName="belge-pdf-source"
          pushUndo={pushUndo}
          getSnapshot={getSnapshot}
          renderPageOverlay={(pageIndex) => (
            <ImageOverlayLayer
              pageIndex={pageIndex}
              pageWidthPx={A4_W_PX}
              pageHeightPx={A4_H_PX}
              gorseller={gorseller}
              interactive={false}
            />
          )}
        />
      </div>

      <div
        ref={kompaktHeaderRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: `${DOCUMENT_PAGE.widthMm}mm`,
          pointerEvents: 'none',
          colorScheme: 'light',
          background: '#fff',
        }}
      >
        <KompaktAntet teklif={teklif} />
      </div>

      <div
        onClick={handleBackdropClick}
        style={{
          position: 'relative',
          width: `${A4_W_PX * scale}px`,
          height: `${naturalH * scale}px`,
          overflow: 'visible',
        }}
      >
        <div
          ref={innerRef}
          className="belge-screen-view"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${A4_W_PX}px`,
            transformOrigin: 'top left',
            // scale + translateZ(0) → GPU compositing layer'ı kesin tetikler;
            // tarayıcı text'i integer pixel grid'e snap'leyerek raster eder,
            // subpixel "soft blur" hissi azalır (Tier A render iyileştirmesi).
            transform: `scale(${scale}) translateZ(0)`,
            colorScheme: 'light',
          }}
        >
          <PaginatedBelgeInlineEditor
            teklif={teklif}
            totals={totals}
            pages={pagination.pages}
            scale={scale}
            markedRowIds={markedRowIds}
            toggleRowMark={toggleRowMark}
            editingAlan={editingAlan}
            onEditingAlanDegistir={onEditingAlanDegistir}
            onCariDegistir={onCariDegistir}
            onCariEPostaDegistir={onCariEPostaDegistir}
            onCariTelefonDegistir={onCariTelefonDegistir}
            onCariSehirDegistir={onCariSehirDegistir}
            contactName={contactName}
            contactTitle={contactTitle}
            onContactNameDegistir={onContactNameDegistir}
            onContactTitleDegistir={onContactTitleDegistir}
            onTarihDegistir={onTarihDegistir}
            onParaBirimiDegistir={onParaBirimiDegistir}
            satirBazliParaBirimi={satirBazliParaBirimi}
            satirBazliIskonto={satirBazliIskonto}
            onKdvOraniDegistir={onKdvOraniDegistir}
            onOdemeVadesiDegistir={onOdemeVadesiDegistir}
            onGecerlilikSuresiDegistir={onGecerlilikSuresiDegistir}
            onDovizKuruDegistir={onDovizKuruDegistir}
            onSatirGuncelle={onSatirGuncelle}
            onSatiraSetUygula={onSatiraSetUygula}
            onSatirSil={onSatirSil}
            onSatirEkle={onSatirEkle}
            onSatirArayaEkle={onSatirArayaEkle}
            onNotlarDegistir={onNotlarDegistir}
            onKargoNotuMetniDegistir={onKargoNotuMetniDegistir}
            onKargoNotuGizliDegistir={onKargoNotuGizliDegistir}
            readOnly={readOnly}
            kismiOnaySecim={kismiOnaySecim}
            pushUndo={pushUndo}
            getSnapshot={getSnapshot}
            renderPageOverlay={(pageIndex) => (
              <ImageOverlayLayer
                pageIndex={pageIndex}
                pageWidthPx={A4_W_PX}
                pageHeightPx={A4_H_PX}
                gorseller={gorseller}
                interactive={!readOnly}
                onUpdate={onGorselGuncelle}
                onDelete={onGorselSil}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
