/**
 * FinansalOzetKartIci — Finansal özet kart iç yapısı
 *
 * 'pdf' variant: A4/html2canvas için küçük ölçek, absolute-positioned alt bölüm
 * 'screen' variant: Ekran için büyük ölçek, normal-flow alt bölüm
 *
 * Kart iç düzeni (3 kolon):
 *   1) Üst veri alanı — [etiket flex-1 + pl-4pt] [işaret 16px] [rakam 120px + pr-4pt]
 *   2) Ayırıcı çizgi
 *   3) Alt toplam alanı — [sol: PB kısaltması veya "Genel Toplam"] [sağ: büyük toplam]
 *
 * Özel durum: hasDetail=false → alt bölümde "Genel Toplam" etiketi, tek satır yapı
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useColors } from '../hooks/useColors';
import { SEMBOL } from '../templates/teklifDocumentShared';

// ── Sabitler ──────────────────────────────────────────────────────────────────
const PB_SHORT: Record<string, string> = { TRY: 'TL', EUR: 'EUR', USD: 'USD', GBP: 'GBP', CHF: 'CHF' };
// Screen renkleri (açık zemin)
const GOLD  = '#8b6a1e';
const RED   = '#b45309';
const GREEN = '#0f766e';

// PDF renkleri — açık krem zemin üzerinde koyu varyantlar
const PDF_RED   = '#b45309';
const PDF_GREEN = '#15803d';

const PDF_C = {
  label: '#3c3c42',
  value: '#2e2e30',
  muted: '#4a4a52',
  total: '#1a2f50',
  sep:   '#dab87a',
};

// ── Kolon genişlikleri ────────────────────────────────────────────────────────
// 3 kolon: [etiket flex-1] [işaret sabit] [rakam sabit]
// Sembol üst satırlardan kaldırıldı — sadece rakam kolonu
const PDF_SIGN = 8;    // px — işaret kolonu (– / +)
const PDF_NUM  = 64;   // px — rakam kolonu (tabular-nums)
const SCR_SIGN = 16;   // px — işaret kolonu
const SCR_NUM  = 120;  // px — rakam kolonu

// İç boşluklar (4pt ≈ 5.3px → screen 5px, pdf 3px)
const SCR_LABEL_PL = '5px';
const SCR_NUM_PR   = '5px';
const PDF_LABEL_PL = '3px';
const PDF_NUM_PR   = '3px';

// ── Tip ───────────────────────────────────────────────────────────────────────
export interface FinansalOzetKartIciProps {
  araToplam:      number;
  iskontoOrani?:  number;
  iskontoTutar?:  number;
  kdvOrani?:      number;
  kdvTutar?:      number;
  toplamIndirim?: number;   // satır bazlı indirim — yalnızca screen'de gösterilir
  genelToplam:    number;
  paraBirimi:     string;
  variant?:       'screen' | 'pdf';
  /** Screen-only: inline oran düzenleme callback'leri */
  onIskontoRateEdit?: (rate: number) => void;
  onKdvRateEdit?:     (rate: number) => void;
}

// ── Bileşen ───────────────────────────────────────────────────────────────────
export function FinansalOzetKartIci({
  araToplam,
  iskontoOrani  = 0,
  iskontoTutar  = 0,
  kdvOrani      = 0,
  kdvTutar      = 0,
  toplamIndirim = 0,
  genelToplam,
  paraBirimi,
  variant       = 'screen',
  onIskontoRateEdit,
  onKdvRateEdit,
}: FinansalOzetKartIciProps) {
  const screenColors = useColors();
  const isPdf   = variant === 'pdf';
  const hasDetail = iskontoOrani > 0 || kdvOrani > 0 || (!isPdf && toplamIndirim > 0);

  const sym     = SEMBOL[paraBirimi]  ?? paraBirimi;
  const pbLabel = PB_SHORT[paraBirimi] ?? paraBirimi;

  // Inline oran düzenleme state'leri (yalnızca screen)
  const [iskontoEditing,   setIskontoEditing]   = useState(false);
  const [iskontoRateDraft, setIskontoRateDraft] = useState('');
  const [kdvEditing,       setKdvEditing]       = useState(false);
  const [kdvRateDraft,     setKdvRateDraft]     = useState('');

  const fmtNum = (n: number) =>
    n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Renk paleti
  const cl = isPdf
    ? { label: PDF_C.label, value: PDF_C.value, muted: PDF_C.muted, total: PDF_C.total, sep: PDF_C.sep }
    : { label: screenColors.textSecondary, value: screenColors.textPrimary, muted: screenColors.textFaint, total: screenColors.textPrimary, sep: screenColors.totalsRowBorder };

  // Tipografi ölçüleri
  const rowFs  = isPdf ? '8.5px' : '13px';
  const rowLH  = isPdf ? 1.2 : 1.4;
  const rowMb  = isPdf ? '2px' : '5px';
  const labelPL = isPdf ? PDF_LABEL_PL : SCR_LABEL_PL;
  const numPR   = isPdf ? PDF_NUM_PR   : SCR_NUM_PR;

  // Kolon genişlikleri
  const signW = isPdf ? PDF_SIGN : SCR_SIGN;
  const numW  = isPdf ? PDF_NUM  : SCR_NUM;

  // Virgül hizalama için ondalık genişlik
  const decW = isPdf ? 16 : 22; // px — ",XX" kısmı sabit genişlik

  // ── Satır renderer ─────────────────────────────────────────────────────────
  // 3 kolon: [etiket flex-1 + pl] [işaret sabit sağ-hizalı] [rakam sabit sağ-hizalı + pr]
  // Rakam kolonu: [tam kısım flex:1 sağ-hizalı] [ondalık sabit sol-hizalı] → virgüller aynı eksende
  function detailRow(
    label: ReactNode,
    value: number,
    color: string,
    sign: '' | '–' | '+',
  ): ReactNode {
    const s   = fmtNum(value);
    const ci  = s.lastIndexOf(',');
    const int = ci >= 0 ? s.slice(0, ci) : s;
    const dec = ci >= 0 ? s.slice(ci)    : '';

    return (
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: rowMb }}>
        {/* 1. Kolon: etiket — esnek genişlik, soldan iç boşluk */}
        <span style={{
          flex: 1,
          paddingLeft: labelPL,
          fontSize: rowFs,
          lineHeight: rowLH,
          color,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {label}
        </span>

        {/* 2. Kolon: işaret (– / +) — sabit genişlik, sağ hizalı, rakama bitişik */}
        <span style={{
          width: signW,
          flexShrink: 0,
          textAlign: 'right',
          fontSize: rowFs,
          lineHeight: rowLH,
          color,
          fontWeight: sign !== '' ? 700 : undefined,
        }}>
          {sign || null}
        </span>

        {/* 3. Kolon: rakam — tam kısım sağ-hizalı + ondalık sabit → virgüller aynı eksende */}
        <span style={{
          width: numW,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'baseline',
          paddingRight: numPR,
        }}>
          <span style={{
            flex: 1,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            fontSize: rowFs,
            lineHeight: rowLH,
            color,
            whiteSpace: 'nowrap',
          }}>
            {int}
          </span>
          <span style={{
            width: decW,
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            fontSize: rowFs,
            lineHeight: rowLH,
            color,
            whiteSpace: 'nowrap',
          }}>
            {dec}
          </span>
        </span>
      </div>
    );
  }

  // ── Inline oran düzenleme input'u (screen) ──────────────────────────────────
  function rateInput(
    draft:      string,
    setDraft:   (v: string) => void,
    onCommit:   (rate: number) => void,
    setEditing: (v: boolean) => void,
  ) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={() => {
          const v = parseFloat(draft.replace(',', '.'));
          if (!isNaN(v) && v > 0 && v <= 100) onCommit(Math.round(v * 100) / 100);
          setEditing(false);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const v = parseFloat(draft.replace(',', '.'));
            if (!isNaN(v) && v > 0 && v <= 100) onCommit(Math.round(v * 100) / 100);
          }
          if (e.key === 'Enter' || e.key === 'Escape') setEditing(false);
        }}
        style={{
          width: 36, height: 18, fontSize: 11, padding: '0 4px',
          border: '1px solid #2563eb', borderRadius: 4,
          textAlign: 'center', outline: 'none', fontFamily: 'inherit',
        }}
      />
    );
  }

  // Tıklanabilir oran etiketi (screen-only)
  const editableRate = (
    rate:       number,
    editing:    boolean,
    draft:      string,
    setDraft:   (v: string) => void,
    onCommit:   (r: number) => void,
    setEditing: (v: boolean) => void,
  ) => editing
    ? rateInput(draft, setDraft, onCommit, setEditing)
    : (
      <span
        onClick={() => { setDraft(String(rate)); setEditing(true); }}
        title="Oranı değiştirmek için tıklayın"
        style={{ cursor: 'pointer', textDecoration: 'underline dotted', fontWeight: 700 }}
      >
        {rate}
      </span>
    );

  const iskontoLabel: ReactNode = !isPdf && onIskontoRateEdit
    ? <span>İskonto %{editableRate(iskontoOrani, iskontoEditing, iskontoRateDraft, setIskontoRateDraft, onIskontoRateEdit, setIskontoEditing)}</span>
    : `İskonto %${iskontoOrani}`;

  const kdvLabel: ReactNode = !isPdf && onKdvRateEdit
    ? <span>KDV %{editableRate(kdvOrani, kdvEditing, kdvRateDraft, setKdvRateDraft, onKdvRateEdit, setKdvEditing)}</span>
    : `KDV %${kdvOrani}`;

  // ── Toplam font büyüklüğü ─────────────────────────────────────────────────
  // Screen: belirgin şekilde büyük (30px normal, 24px ≥1M)
  // PDF: biraz büyütülmüş (17px normal, 14px ≥1M)
  const totalFs = genelToplam >= 1e6
    ? (isPdf ? '14px' : '24px')
    : (isPdf ? '17px' : '30px');


  // ── Toplam sağ bölümü (sembol + büyük rakam) — hasDetail kartlarında alt bölüm ──
  const totalRight = (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: '6px' }}>
      <span style={{
        fontSize: totalFs,
        fontWeight: 900,
        lineHeight: 1.06,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        color: cl.total,
        whiteSpace: 'nowrap',
        paddingRight: 0,
        display: 'flex', alignItems: 'center',
      }}>
        {sym} {fmtNum(genelToplam)}
      </span>
    </div>
  );

  // ── PDF render — flow layout, auto-height ──────────────────────────────────
  // Sadece pbLabel absolute (small rozet, layout'a katkı vermez). İçerik flow
  // ile akar → kart yüksekliği content-based.
  // hasDetail=false: tek flex satırı (label sol + amount sağ), kompakt.
  // hasDetail=true:  detay satırları + separator + total satırı, içerik kadar
  //                  genişler.
  if (isPdf) {
    return (
      <div style={{ padding: '5px 10px 6px', position: 'relative', boxSizing: 'border-box' }}>
        {/* Para birimi rozeti — ABSOLUTE top-right, layout'tan bağımsız */}
        <span style={{
          position: 'absolute',
          top: '4px',
          right: '10px',
          fontSize: '7px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: cl.muted,
          lineHeight: 1,
          pointerEvents: 'none',
          zIndex: 0,
        }}>
          {pbLabel}
        </span>

        {hasDetail ? (
          <>
            {/* Üst: detay satırları — flow */}
            <div style={{ marginTop: '10px' }}>
              {detailRow('Ara Toplam', araToplam, cl.label, '')}
              {iskontoOrani > 0 && detailRow(`İskonto %${iskontoOrani}`, iskontoTutar, PDF_RED, '–')}
              {kdvOrani    > 0 && detailRow(`KDV %${kdvOrani}`,          kdvTutar,     PDF_GREEN, '+')}
            </div>
            {/* Ayırıcı — flow margin */}
            <div style={{
              borderTop: `0.75px solid ${cl.sep}`,
              marginTop: '4px',
              marginBottom: '4px',
            }} />
            {/* Total — label sol + amount sağ, hasDetail=false ile aynı tipografi */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: '10px',
            }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#1A2B42',
                  lineHeight: 1.1,
                }}>
                  Genel Toplam
                </div>
                <div style={{
                  fontSize: '7.5px',
                  color: '#717176',
                  lineHeight: 1.2,
                  marginTop: '1px',
                }}>
                  Grand Total
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {totalRight}
              </div>
            </div>
          </>
        ) : (
          // hasDetail=false: tek satır, label sol + amount sağ, kompakt.
          // marginTop pbLabel'in altında yer açar.
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '10px',
            marginTop: '14px',
          }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#1A2B42',
                lineHeight: 1.1,
              }}>
                Genel Toplam
              </div>
              <div style={{
                fontSize: '7.5px',
                color: '#717176',
                lineHeight: 1.2,
                marginTop: '1px',
              }}>
                Grand Total
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              {totalRight}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Screen render — bütün durumlar (hasDetail true/false fark etmez) ────────
  // pbLabel absolute (toplam alanından tamamen bağımsız), total absolute bottom-right
  // (içinde sembol + sayı flex'te kalır). KDV/iskonto açılıp kapandığında pbLabel
  // ve total'ın konumu DEĞİŞMEZ; yalnızca üst alana detay satırları eklenir.
  return (
    <div style={{
      position: 'relative',
      padding: '16px 18px 14px',
      boxSizing: 'border-box',
      height: '100%',
    }}>
      {/* Üst alan — detay satırları VEYA "Genel Toplam" başlığı */}
      {hasDetail ? (
        <div>
          {detailRow('Ara Toplam', araToplam, cl.label, '')}
          {toplamIndirim > 0 && detailRow('(-) İndirim', toplamIndirim, RED, '–')}
          {iskontoOrani > 0 && detailRow(iskontoLabel, iskontoTutar, RED, '–')}
          {kdvOrani    > 0 && detailRow(kdvLabel,      kdvTutar,     GREEN, '+')}
        </div>
      ) : (
        // satirBazliParaBirimi pasif iken (TotalsCard light variant) ile birebir
        // aynı tipografi: 10px / 700 / uppercase / 0.08em / navy + 7.5px subtitle.
        <div>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#1A2B42',
            lineHeight: 1.1,
          }}>
            Genel Toplam
          </div>
          <div style={{
            fontSize: '7.5px',
            color: '#717176',
            lineHeight: 1.2,
            marginTop: '1px',
          }}>
            Grand Total
          </div>
        </div>
      )}

      {/* Ayırıcı — sadece detay varken, sabit Y */}
      {hasDetail && (
        <div style={{
          position: 'absolute',
          bottom: '40px', left: '18px', right: '18px',
          borderTop: `1px solid ${cl.sep}`,
        }} />
      )}

      {/* Para birimi kısaltması — ABSOLUTE bottom-left, total alanından TAMAMEN
         bağımsız. z-index:0 + pointer-events:none → toplam alanı her zaman önde. */}
      <span style={{
        position: 'absolute',
        bottom: '14px',
        left: '18px',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: GOLD,
        lineHeight: 1,
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        {pbLabel}
      </span>

      {/* Total — ABSOLUTE bottom-right, sembol + sayı içeride flex'te kalır.
         pbLabel'dan bağımsız konum; geniş tutarlar pbLabel'ın üzerine çizer. */}
      <div style={{
        position: 'absolute',
        bottom: '14px',
        right: '18px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 1,
      }}>
        {totalRight}
      </div>
    </div>
  );
}
