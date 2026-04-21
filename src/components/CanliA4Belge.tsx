import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import TeklifSablonu, { KompaktAntet } from '../templates/TeklifSablonu';
import TeklifPagedDocument from '../templates/TeklifPagedDocument';
import PaginatedBelgeInlineEditor, { type EditingAlan } from './PaginatedBelgeInlineEditor';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { calculateTeklifPagination, type TeklifPaginationResult } from '../services/documentPagination';
import { DOCUMENT_PAGE, mmToPx } from '../templates/teklifDocumentShared';
import type { Teklif, Cari, TeklifSatiri, ParaBirimi } from '../types';

const A4_W_PX = Math.round(mmToPx(DOCUMENT_PAGE.widthMm));

interface CanliA4BelgeProps {
  teklif: Teklif;
  editingAlan: EditingAlan;
  onEditingAlanDegistir: (alan: EditingAlan) => void;
  onCariDegistir: (cari: Cari) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM') => void;
  onTarihDegistir: (tarih: string) => void;
  onParaBirimiDegistir: (pb: ParaBirimi) => void;
  satirBazliParaBirimi: boolean;
  satirBazliIskonto: boolean;
  onSatirBazliDegistir: (aktif: boolean) => void;
  onKdvOraniDegistir: (oran: number) => void;
  onOdemeVadesiDegistir: (vade: string) => void;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;
  onSatirArayaEkle: (afterIndex: number) => void;
  onNotlarDegistir: (notlar: string) => void;
  sablonRef: React.RefObject<HTMLDivElement | null>;
  kompaktHeaderRef: React.RefObject<HTMLDivElement | null>;
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
  contactName,
  contactTitle,
  onContactNameDegistir,
  onContactTitleDegistir,
  onTarihDegistir,
  onParaBirimiDegistir,
  satirBazliParaBirimi,
  satirBazliIskonto,
  onSatirBazliDegistir,
  onKdvOraniDegistir,
  onOdemeVadesiDegistir,
  onSatirGuncelle,
  onSatirSil,
  onSatirEkle,
  onSatirArayaEkle,
  onNotlarDegistir,
  sablonRef,
  kompaktHeaderRef,
}: CanliA4BelgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalH, setNaturalH] = useState(Math.round(mmToPx(DOCUMENT_PAGE.heightMm)));
  const [pagination, setPagination] = useState<TeklifPaginationResult>(FALLBACK_PAGINATION);

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

    const measure = () => {
      setPagination(calculateTeklifPagination(linearRoot, compactHeaderEl));
    };

    const obs = new ResizeObserver(measure);
    obs.observe(linearRoot);
    obs.observe(compactHeaderEl);
    measure();
    return () => obs.disconnect();
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
    <div ref={containerRef} style={{ width: '100%', maxWidth: `${A4_W_PX}px` }}>
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

      <div
        ref={sablonRef}
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
        <TeklifPagedDocument teklif={teklif} totals={totals} pages={pagination.pages} />
      </div>

      <div
        ref={kompaktHeaderRef}
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
            transform: `scale(${scale})`,
            colorScheme: 'light',
          }}
        >
          <PaginatedBelgeInlineEditor
            teklif={teklif}
            totals={totals}
            pages={pagination.pages}
            editingAlan={editingAlan}
            onEditingAlanDegistir={onEditingAlanDegistir}
            onCariDegistir={onCariDegistir}
            contactName={contactName}
            contactTitle={contactTitle}
            onContactNameDegistir={onContactNameDegistir}
            onContactTitleDegistir={onContactTitleDegistir}
            onTarihDegistir={onTarihDegistir}
            onParaBirimiDegistir={onParaBirimiDegistir}
            satirBazliParaBirimi={satirBazliParaBirimi}
            satirBazliIskonto={satirBazliIskonto}
            onSatirBazliDegistir={onSatirBazliDegistir}
            onKdvOraniDegistir={onKdvOraniDegistir}
            onOdemeVadesiDegistir={onOdemeVadesiDegistir}
            onSatirGuncelle={onSatirGuncelle}
            onSatirSil={onSatirSil}
            onSatirEkle={onSatirEkle}
            onSatirArayaEkle={onSatirArayaEkle}
            onNotlarDegistir={onNotlarDegistir}
          />
        </div>
      </div>
    </div>
  );
}
