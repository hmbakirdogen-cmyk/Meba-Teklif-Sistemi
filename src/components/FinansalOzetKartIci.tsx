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

// ── Sabitler ──────────────────────────────────────────────────────────────────
const SEMBOL: Record<string, string> = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', CHF: '₣' };
const PB_SHORT: Record<string, string> = { TRY: 'TL', EUR: 'EUR', USD: 'USD', GBP: 'GBP', CHF: 'CHF' };
// Screen renkleri (açık zemin)
const GOLD  = '#8b6a1e';
const RED   = '#b45309';
const GREEN = '#0f766e';

// PDF renkleri — açık krem zemin üzerinde koyu varyantlar
const PDF_GOLD  = '#92400e';
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

  // Sembol font büyüklüğü (alt bölüm)
  const symBotFs = isPdf ? '9px' : '18px';

  // PDF separator konumu — bigger total needs more clearance
  // bottom:9(pad) + ~18(total) + 5(gap) = 32px
  const SEP_B = 32;

  // ── Toplam sağ bölümü (sembol + büyük rakam) — hasDetail kartlarında alt bölüm ──
  const totalRight = (
    <div style={{ display: 'flex', alignItems: 'baseline', flexShrink: 0, gap: '1px' }}>
      <span style={{
        fontSize: symBotFs,
        color: cl.muted,
        lineHeight: 1,
        alignSelf: 'flex-end',
        paddingBottom: isPdf ? '1px' : '2px',
      }}>
        {sym}
      </span>
      <span style={{
        fontSize: totalFs,
        fontWeight: 900,
        lineHeight: 1.06,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        color: cl.total,
        whiteSpace: 'nowrap',
        paddingRight: numPR,
      }}>
        {fmtNum(genelToplam)}
      </span>
    </div>
  );

  // ── Sade tek-toplam render (hasDetail=false) ─────────────────────────────────
  // Tek satır: sol="Genel Toplam" (altın) | sağ=büyük rakam
  // PDF ve screen için aynı mantık, sadece boyutlar farklı
  if (!hasDetail) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isPdf ? '8px 12px' : '18px 18px',
        height: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isPdf ? 2 : 5 }}>
          <span style={{
            fontSize: isPdf ? '8px' : '14px',
            fontWeight: 600,
            color: isPdf ? PDF_GOLD : GOLD,
            letterSpacing: '0',
            lineHeight: 1,
          }}>
            Genel Toplam
          </span>
          <span style={{
            fontSize: isPdf ? '7px' : '10px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: cl.muted,
            lineHeight: 1,
          }}>
            {pbLabel}
          </span>
        </div>
        {totalRight}
      </div>
    );
  }

  // ── PDF render (hasDetail=true) ──────────────────────────────────────────────
  if (isPdf) {
    return (
      <div style={{ padding: '6px 10px 9px', position: 'relative', height: '100%', boxSizing: 'border-box' }}>
        {/* Üst: detay satırları */}
        <div>
          {detailRow('Ara Toplam', araToplam, cl.label, '')}
          {iskontoOrani > 0 && detailRow(`İskonto %${iskontoOrani}`, iskontoTutar, PDF_RED, '–')}
          {kdvOrani    > 0 && detailRow(`KDV %${kdvOrani}`,          kdvTutar,     PDF_GREEN, '+')}
        </div>
        {/* Ayırıcı — absolute, sabit mesafede */}
        <div style={{
          position: 'absolute',
          bottom: `${SEP_B}px`, left: '10px', right: '10px',
          borderTop: `0.75px solid ${cl.sep}`,
        }} />
        {/* Alt: para birimi kısaltması (altın, sol) + toplam (sağ) — absolute */}
        <div style={{ position: 'absolute', bottom: '9px', left: '10px', right: '10px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: PDF_GOLD, lineHeight: 1 }}>
            {pbLabel}
          </span>
          {totalRight}
        </div>
      </div>
    );
  }

  // ── Screen render (hasDetail=true) ──────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '18px 18px 16px', boxSizing: 'border-box', height: '100%' }}>
      {/* Üst: detay satırları */}
      <div>
        {detailRow('Ara Toplam', araToplam, cl.label, '')}
        {toplamIndirim > 0 && detailRow('(-) İndirim', toplamIndirim, RED, '–')}
        {iskontoOrani > 0 && detailRow(iskontoLabel, iskontoTutar, RED, '–')}
        {kdvOrani    > 0 && detailRow(kdvLabel,      kdvTutar,     GREEN, '+')}
      </div>
      {/* Ayırıcı */}
      <div style={{ borderTop: `1px solid ${cl.sep}`, margin: '12px 0 10px' }} />
      {/* Alt: para birimi kısaltması (altın, sol) + toplam (sağ) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLD, lineHeight: 1 }}>
          {pbLabel}
        </span>
        {totalRight}
      </div>
    </div>
  );
}
