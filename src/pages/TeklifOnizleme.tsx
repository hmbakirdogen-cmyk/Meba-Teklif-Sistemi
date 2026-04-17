import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { App, Alert, Button, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import TeklifSablonu, { KompaktAntet } from '../templates/TeklifSablonu';
import { teklifService } from '../services/teklifService';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import {
  buildPdf,
  sayfaKesimleriniHesapla,
  sonSayfaKesiminiAyarla,
} from '../services/pdfService';
import type { Teklif } from '../types';
import { buttonClassNames } from '../styles/buttonStyles';
import { useTheme } from '../context/useTheme';
import OnizlemeToolbar from '../components/OnizlemeToolbar';

export default function TeklifOnizleme() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const sablonRef = useRef<HTMLDivElement>(null);
  const kompaktHeaderRef = useRef<HTMLDivElement>(null);
  const printImagesRef = useRef<string[]>([]);
  const uretiliyorRef = useRef(false);
  const yazdiriyorRef = useRef(false);
  const sonOtomatikUretimRef = useRef<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile(768);
  const { isDark } = useTheme();
  const [teklif, setTeklif] = useState<Teklif | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfHazir, setPdfHazir] = useState(false);
  const [uretiliyor, setUretiliyor] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
  const [kompaktHeaderHeight, setKompaktHeaderHeight] = useState(0);
  const [theadTopCssPx, setTheadTopCssPx]   = useState(0);
  const [theadHCssPx,   setTheadHCssPx]     = useState(0);
  const [previewBbTopPx,    setPreviewBbTopPx]    = useState(0);
  const [previewBbHeightPx, setPreviewBbHeightPx] = useState(0);
  const [previewFooterTopPx, setPreviewFooterTopPx] = useState(0);
  const [previewFooterHeightPx, setPreviewFooterHeightPx] = useState(0);

  useEffect(() => {
    setPdfBlob(null);
    setPdfHazir(false);
    printImagesRef.current = [];
    sonOtomatikUretimRef.current = null;

    if (!id) {
      setHata('Teklif ID bulunamadi.');
      return;
    }

    const bulunan = teklifService.teklifGetir(id);
    if (!bulunan) {
      setHata('Teklif bulunamadi.');
      return;
    }

    setTeklif(bulunan);
  }, [id]);

  const pdfOlustur = useCallback(async () => {
    if (!sablonRef.current || !kompaktHeaderRef.current || !teklif || uretiliyorRef.current) return;

    uretiliyorRef.current = true;
    setUretiliyor(true);
    setPdfHazir(false);
    setPdfBlob(null);
    printImagesRef.current = [];

    try {
      const { pdf, pageImages } = await buildPdf(sablonRef.current, kompaktHeaderRef.current);
      printImagesRef.current = pageImages;
      const blob = pdf.output('blob');
      setPdfBlob(blob);
      setPdfHazir(true);
    } catch (err) {
      console.error('[PDF] buildPdf hatası:', err);
      printImagesRef.current = [];
      message.error('PDF oluşturulurken bir hata oluştu.');
    } finally {
      uretiliyorRef.current = false;
      setUretiliyor(false);
    }
  }, [message, teklif]);

  // Teklif yüklenince otomatik PDF üretimi (her teklif için bir kez)
  useEffect(() => {
    if (!teklif || !sablonRef.current || sonOtomatikUretimRef.current === teklif.id) return undefined;

    const timeoutId = window.setTimeout(() => {
      sonOtomatikUretimRef.current = teklif.id;
      void pdfOlustur();
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [teklif, pdfOlustur]);

  // Önizleme ölçeği + sayfa kesim hesaplamaları — container boyutu değişince güncellenir
  useEffect(() => {
    const container = previewContainerRef.current;
    const content   = previewContentRef.current;
    if (!container || !content) return;
    const A4_PX = 210 * (96 / 25.4); // ~793.7 px

    const obs = new ResizeObserver(() => {
      const w = container.getBoundingClientRect().width;
      const s = Math.min(1, w / A4_PX);
      setPreviewScale(s);

      const A4_H     = 297 * (96 / 25.4);
      const kompaktH = kompaktHeaderRef.current?.offsetHeight ?? 0;
      const theadEl2 = content.querySelector<HTMLElement>('#pdf-thead');
      const theadH   = theadEl2?.offsetHeight ?? 0;
      const footerEl2 = content.querySelector<HTMLElement>('#pdf-page-footer');
      const footerH   = footerEl2?.offsetHeight ?? 0;
      let theadTop = 0;
      if (theadEl2) {
        let el: HTMLElement | null = theadEl2;
        while (el && el !== content) { theadTop += el.offsetTop; el = el.offsetParent as HTMLElement | null; }
      }
      const postTheadPx = 7;
      const page1H   = A4_H - footerH;
      const page2H   = A4_H - kompaktH - theadH - postTheadPx - footerH;
      setKompaktHeaderHeight(kompaktH);
      setTheadTopCssPx(theadTop);
      setTheadHCssPx(theadH);

      const bbEl = content.querySelector<HTMLElement>('#pdf-bottom-block');
      if (bbEl) {
        let bbTop = 0;
        let elBb: HTMLElement | null = bbEl;
        while (elBb && elBb !== content) { bbTop += elBb.offsetTop; elBb = elBb.offsetParent as HTMLElement | null; }
        const signatureHeight = footerEl2
          ? Math.max(0, footerEl2.offsetTop - bbEl.offsetTop)
          : bbEl.offsetHeight;
        setPreviewBbTopPx(bbTop);
        setPreviewBbHeightPx(signatureHeight);
        setPageBreaks(
          sonSayfaKesiminiAyarla(
            content,
            sayfaKesimleriniHesapla(content, page1H, Math.max(page2H, page1H * 0.4), bbTop),
            bbTop,
            Math.max(page1H * 0.25, page2H - signatureHeight),
          ),
        );
      }

      if (footerEl2) {
        let footerTop = 0;
        let elFooter: HTMLElement | null = footerEl2;
        while (elFooter && elFooter !== content) { footerTop += elFooter.offsetTop; elFooter = elFooter.offsetParent as HTMLElement | null; }
        setPreviewFooterTopPx(footerTop);
        setPreviewFooterHeightPx(footerEl2.offsetHeight);
      }
    });
    obs.observe(container);
    obs.observe(content);
    return () => obs.disconnect();
  }, [teklif]);

  async function pdfIndir() {
    if (!teklif || !pdfBlob) return;

    const kelimeler = teklif.cari.firmaAdi.trim().split(/\s+/);
    const onEk = kelimeler.slice(0, 2).join(' ').toLocaleUpperCase('tr-TR').replace(/[\\/:*?"<>|]/g, '');
    const dosyaAdi = `${onEk} ${teklif.teklifNo}.pdf`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as Window & { showSaveFilePicker: (opts: object) => Promise<FileSystemFileHandle> })
          .showSaveFilePicker({
            suggestedName: dosyaAdi,
            startIn: 'desktop',
            types: [{ description: 'PDF Dosyası', accept: { 'application/pdf': ['.pdf'] } }],
          });
        const writable = await handle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
        message.success('PDF masaüstüne kaydedildi.');
        return;
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
      }
    }

    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = dosyaAdi;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('PDF başarıyla indirildi.');
  }

  function yazdir() {
    if (yazdiriyorRef.current) return;
    if (uretiliyor || printImagesRef.current.length === 0) {
      message.warning('PDF henüz hazırlanıyor, lütfen bekleyin.');
      return;
    }

    yazdiriyorRef.current = true;
    const pageImages = printImagesRef.current;

    const imgTags = pageImages
      .map(
        (src, i) =>
          `<img src="${src}" style="display:block;width:210mm;height:297mm;${
            i < pageImages.length - 1 ? 'page-break-after:always;' : ''
          }">`,
      )
      .join('');

    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:absolute;left:-9999px;top:0;width:794px;height:1123px;border:none;visibility:hidden;';
    iframe.srcdoc = `<!DOCTYPE html><html><head><style>
      @page{size:210mm 297mm;margin:0;marks:none}
      html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;box-sizing:border-box}
      img{display:block;width:210mm!important;height:297mm!important;max-width:none;object-fit:fill;image-rendering:high-quality;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      @media print{
        html,body{width:210mm;height:297mm}
        img{page-break-inside:avoid;break-inside:avoid}
      }
    </style></head><body>${imgTags}</body></html>`;
    document.body.appendChild(iframe);

    let baskiTetiklendi = false;
    const doCleanup = () => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      yazdiriyorRef.current = false;
    };
    const tryPrint = () => {
      if (baskiTetiklendi) return;
      baskiTetiklendi = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        doCleanup();
        return;
      }
      setTimeout(doCleanup, 5 * 60 * 1000);
    };
    iframe.onload = tryPrint;
    setTimeout(tryPrint, 800);
  }

  // Toplam hesaplamayı memoize et — teklif değişmeden tekrar render edilmez
  const totals = useMemo(
    () =>
      teklif
        ? hesaplamaMotoru.teklifToplamlariniHesapla({
            araToplam: teklif.araToplam,
            kdvOrani: teklif.kdvOrani,
            iskontoOrani: teklif.iskontoOrani ?? 0,
          })
        : null,
    [teklif],
  );

  if (hata) {
    return (
      <div style={{ padding: 40, maxWidth: 480, margin: '0 auto' }}>
        <Alert type="error" message={hata} style={{ marginBottom: 16 }} />
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teklifler')} className={buttonClassNames.secondary}>
          Listeye Dön
        </Button>
      </div>
    );
  }

  if (!teklif || !totals) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <OnizlemeToolbar
        teklif={teklif}
        isMobile={isMobile}
        isDark={isDark}
        uretiliyor={uretiliyor}
        pdfBlob={pdfBlob}
        onDuzenle={() => navigate(`/teklif/${id}`)}
        onKaydet={() => { teklifService.teklifKaydet(teklif); message.success('Teklif kaydedildi.'); }}
        onYenile={() => void pdfOlustur()}
        onYazdir={yazdir}
        onPdfIndir={() => void pdfIndir()}
      />

      {/* ── Gizli render alanı: sablonRef (tam) + kompaktHeaderRef ── */}
      {/* position:absolute — Chromium, position:fixed elementleri viewport dışındaysa  */}
      {/* rasterize etmez. Absolute elementler dokümanın paint katmanında kalır;         */}
      {/* html2canvas piksel okurken doğru gradient/renk alır.                          */}
      <div
        aria-hidden
        className="no-print"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '210mm',
          pointerEvents: 'none',
          colorScheme: 'light',
          background: '#ffffff',
        }}
      >
        <div ref={sablonRef}>
          <TeklifSablonu teklif={teklif} totals={totals} />
        </div>
        <div ref={kompaktHeaderRef}>
          <KompaktAntet teklif={teklif} />
        </div>
      </div>

      <div
        className="print-bg"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #10141d 0%, #151c28 100%)'
            : 'linear-gradient(180deg, #d9e0e8 0%, #eef2f6 100%)',
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          justifyContent: 'center',
          padding: isMobile ? '18px 12px 32px' : '28px 16px 40px',
        }}
      >
        <div ref={previewContainerRef} className="print-inner" style={{ width: '100%', maxWidth: '210mm' }}>

          {/* Üst durum etiketi */}
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              color: isDark ? 'rgba(221,228,240,0.78)' : 'rgba(30,41,59,0.72)',
              fontSize: 12,
              letterSpacing: 0.2,
            }}
          >
            <span>A4 Önizleme</span>
            <span style={{ color: isDark ? 'rgba(136,153,181,0.86)' : 'rgba(71,85,105,0.88)' }}>
              {uretiliyor ? 'PDF hazırlanıyor…' : pdfHazir ? 'PDF hazır' : 'Hazırlanıyor…'}
            </span>
          </div>

          {/* ── Önizleme alanı ── */}
          {(() => {
            const A4_W_PX  = 210 * (96 / 25.4);
            const A4_H_PX  = 297 * (96 / 25.4);
            const PAGE_GAP = 14;
            const pageStarts = [0, ...pageBreaks];
            const shadow   = isDark
              ? '0 6px 32px rgba(0,0,0,0.45)'
              : '0 4px 24px rgba(15,23,42,0.16)';

            return (
              <div style={{ position: 'relative' }}>

                {/* Ölçüm + window.print() kaynağı
                    visibility:hidden → layout'ta yer kaplar (ResizeObserver çalışır)
                    position:absolute → sayfa kartlarının altına geçmez
                    @media print → visibility:visible, position:relative */}
                <div
                  ref={previewContentRef}
                  className="print-target"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '210mm',
                    minHeight: '297mm',
                    background: '#ffffff',
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    zIndex: -1,
                    colorScheme: 'light',
                  }}
                >
                  <TeklifSablonu teklif={teklif} totals={totals} />
                </div>

                {/* A4 sayfa kartları — canlı DOM önizleme, sadece ekranda görünür, baskıda gizlenir */}
                  <div
                    className="no-print"
                    style={{ display: 'flex', flexDirection: 'column', gap: `${PAGE_GAP}px`, alignItems: 'flex-start' }}
                  >
                    {pageStarts.map((startY, i) => {
                      const isPage2Plus = i > 0;
                      const isLastPage  = i === pageStarts.length - 1;
                      const POST_THEAD = 7;
                      const hh = isPage2Plus
                        ? kompaktHeaderHeight + theadHCssPx + POST_THEAD
                        : 0;
                      const nextStartY  = isLastPage ? null : pageStarts[i + 1];
                      const hasPinnedBb   = isLastPage && previewBbTopPx > startY && previewBbHeightPx > 0;
                      const clipH = nextStartY !== null
                        ? (nextStartY - startY) - 2
                        : hasPinnedBb
                          ? (previewBbTopPx - startY)
                          : A4_H_PX - hh - previewFooterHeightPx;

                      return (
                        <div
                          key={i}
                          style={{
                            width:      `${A4_W_PX * previewScale}px`,
                            height:     `${A4_H_PX * previewScale}px`,
                            overflow:   'hidden',
                            flexShrink: 0,
                            background: '#ffffff',
                            boxShadow:  shadow,
                            position:   'relative',
                          }}
                        >
                          <div style={{
                            width:           `${A4_W_PX}px`,
                            height:          `${A4_H_PX}px`,
                            transformOrigin: 'top left',
                            transform:       `scale(${previewScale})`,
                            position:        'relative',
                            overflow:        'hidden',
                            background:      '#ffffff',
                            colorScheme:     'light',
                          }}>

                            {isPage2Plus && (
                              <div style={{
                                position: 'absolute',
                                top: 0, left: 0,
                                width:    '100%',
                                zIndex:   2,
                                background: '#ffffff',
                              }}>
                                <KompaktAntet teklif={teklif} />
                              </div>
                            )}

                            {isPage2Plus && theadHCssPx > 0 && (
                              <div style={{
                                position: 'absolute',
                                top:      `${kompaktHeaderHeight}px`,
                                left:     0,
                                width:    '100%',
                                height:   `${theadHCssPx}px`,
                                overflow: 'hidden',
                                zIndex:   1,
                                background: '#ffffff',
                              }}>
                                <div style={{ transform: `translateY(${-theadTopCssPx}px)`, colorScheme: 'light' }}>
                                  <TeklifSablonu teklif={teklif} totals={totals} />
                                </div>
                              </div>
                            )}

                            <div style={{
                              position: 'absolute',
                              top:      `${hh}px`,
                              left:     0,
                              width:    '100%',
                              height:   `${clipH}px`,
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                transform:   `translateY(${isPage2Plus ? -(startY - 2) : -startY}px)`,
                                colorScheme: 'light',
                              }}>
                                <TeklifSablonu teklif={teklif} totals={totals} />
                              </div>
                            </div>

                            {hasPinnedBb && (
                              <div style={{
                                position:   'absolute',
                                bottom:     `${previewFooterHeightPx}px`,
                                left:       0,
                                width:      '100%',
                                height:     `${previewBbHeightPx}px`,
                                overflow:   'hidden',
                                background: '#ffffff',
                                zIndex:     3,
                              }}>
                                <div style={{ transform: `translateY(${-previewBbTopPx}px)`, colorScheme: 'light' }}>
                                  <TeklifSablonu teklif={teklif} totals={totals} />
                                </div>
                              </div>
                            )}

                            {previewFooterHeightPx > 0 && (
                              <div style={{
                                position:   'absolute',
                                bottom:     0,
                                left:       0,
                                width:      '100%',
                                height:     `${previewFooterHeightPx}px`,
                                overflow:   'hidden',
                                background: '#ffffff',
                                zIndex:     4,
                              }}>
                                <div style={{ transform: `translateY(${-previewFooterTopPx}px)`, colorScheme: 'light' }}>
                                  <TeklifSablonu teklif={teklif} totals={totals} />
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>

              </div>
            );
          })()}

          {(uretiliyor || !pdfHazir) && (
            <div className="no-print" style={{ textAlign: 'center', padding: '18px 0 0' }}>
              <Spin size="small" />
              <div style={{ marginTop: 10, color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(30,41,59,0.55)', fontSize: 12.5 }}>
                Yüksek kaliteli PDF hazırlanıyor…
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
