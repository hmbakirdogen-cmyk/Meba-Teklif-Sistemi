import React, { useMemo, useState } from 'react';
import { formatCurrency } from '../utils/formatters';
import { hesaplamaMotoru, type ParaBirimiToplamlari } from '../services/hesaplamaMotoru';
import { chipButtonClassName } from '../styles/buttonStyles';
import { useColors } from '../hooks/useColors';
import { useIsMobile } from '../hooks/useIsMobile';

interface ToplamPaneliProps {
  araToplam: number;
  toplamIndirim: number;
  paraBirimi: string;
  satirBazliParaBirimi: boolean;
  satirParaToplamlari: ParaBirimiToplamlari;
  kdvOrani: number;
  onKdvOraniChange: (oran: number) => void;
  iskontoOrani: number;
  onIskontoOraniChange: (oran: number) => void;
}

const PB_LABEL: Record<'TRY' | 'EUR' | 'USD', string> = {
  TRY: 'Turk Lirasi',
  EUR: 'Euro',
  USD: 'Amerikan Dolari',
};

const PB_SHORT: Record<'TRY' | 'EUR' | 'USD', string> = {
  TRY: 'TL',
  EUR: 'EUR',
  USD: 'USD',
};

export default function ToplamPaneli({
  araToplam,
  toplamIndirim,
  paraBirimi,
  satirBazliParaBirimi,
  satirParaToplamlari,
  kdvOrani,
  onKdvOraniChange,
  iskontoOrani,
  onIskontoOraniChange,
}: ToplamPaneliProps) {
  const C = useColors();
  const isMobile = useIsMobile(900);
  const formatTek = (n: number) => formatCurrency(n, paraBirimi);

  const [lastKdvRate, setLastKdvRate] = useState(kdvOrani > 0 ? kdvOrani : 20);
  const [kdvRateEditing, setKdvRateEditing] = useState(false);
  const [kdvRateDraft, setKdvRateDraft] = useState('');
  const [lastIskontoRate, setLastIskontoRate] = useState(iskontoOrani > 0 ? iskontoOrani : 10);
  const [iskontoRateEditing, setIskontoRateEditing] = useState(false);
  const [iskontoRateDraft, setIskontoRateDraft] = useState('');

  const toplamlar = hesaplamaMotoru.teklifToplamlariniHesapla({ araToplam, kdvOrani, iskontoOrani });
  const kdvAktif = kdvOrani > 0;
  const iskontoAktif = iskontoOrani > 0;

  const paraKartlari = useMemo(
    () =>
      (['TRY', 'EUR', 'USD'] as const).map((pb) => ({
        pb,
        label: PB_LABEL[pb],
        short: PB_SHORT[pb],
        ...hesaplamaMotoru.teklifToplamlariniHesapla({
          araToplam: satirParaToplamlari[pb],
          kdvOrani,
          iskontoOrani,
        }),
      })),
    [satirParaToplamlari, kdvOrani, iskontoOrani],
  );

  function commitKdvRate() {
    const v = parseFloat(kdvRateDraft.replace(',', '.'));
    if (!isNaN(v) && v > 0 && v <= 100) {
      const nextRate = Math.round(v * 100) / 100;
      setLastKdvRate(nextRate);
      onKdvOraniChange(nextRate);
    }
    setKdvRateEditing(false);
  }

  function commitIskontoRate() {
    const v = parseFloat(iskontoRateDraft.replace(',', '.'));
    if (!isNaN(v) && v > 0 && v <= 100) {
      const nextRate = Math.round(v * 100) / 100;
      setLastIskontoRate(nextRate);
      onIskontoOraniChange(nextRate);
    }
    setIskontoRateEditing(false);
  }

  const handleKDV = () => {
    if (kdvAktif) {
      setLastKdvRate(kdvOrani);
      onKdvOraniChange(0);
      return;
    }
    onKdvOraniChange(lastKdvRate);
  };

  const handleIskonto = () => {
    if (iskontoAktif) {
      setLastIskontoRate(iskontoOrani);
      onIskontoOraniChange(0);
      return;
    }
    onIskontoOraniChange(lastIskontoRate);
  };

  const inlineInputStyle: React.CSSProperties = {
    width: 38,
    height: 20,
    fontSize: 11,
    padding: '0 4px',
    border: '1px solid #2563eb',
    borderRadius: 5,
    outline: 'none',
    textAlign: 'center',
    fontFamily: 'inherit',
    color: C.textPrimary,
    background: C.bgInput,
    boxShadow: '0 0 0 3px rgba(37,99,235,0.10)',
  };

  const editableRateStyle: React.CSSProperties = {
    cursor: 'pointer',
    textDecoration: 'underline dotted',
    color: C.textPrimary,
    fontWeight: 700,
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${C.totalsBorder}`,
    borderRadius: 18,
    background: `linear-gradient(180deg, ${C.bgSurface} 0%, ${C.totalsPanel} 100%)`,
    boxShadow: '0 12px 36px rgba(15,31,69,0.08), 0 2px 10px rgba(15,31,69,0.05)',
    overflow: 'hidden',
  };

  const sectionPad = isMobile ? '16px 16px 14px' : '18px 20px 16px';
  const breakdownValueGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
    gap: isMobile ? 8 : 14,
    width: '100%',
    alignItems: 'center',
  };

  function breakdownRow(
    label: React.ReactNode,
    values: React.ReactNode,
    opts?: { emphasize?: boolean; borderless?: boolean; negative?: boolean },
  ) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : satirBazliParaBirimi ? '170px 1fr' : '170px 1fr',
          gap: isMobile ? 8 : 18,
          alignItems: 'center',
          padding: isMobile ? '13px 16px' : '13px 20px',
          borderBottom: opts?.borderless ? 'none' : `1px solid ${C.totalsRowBorder}`,
          background: opts?.emphasize ? 'rgba(15,31,69,0.025)' : 'transparent',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: opts?.negative ? '#c2410c' : C.textSecondary,
            lineHeight: 1.45,
          }}
        >
          {label}
        </div>
        <div>{values}</div>
      </div>
    );
  }

  function currencyValueGrid(selector: (item: (typeof paraKartlari)[number]) => number, options?: { negative?: boolean; bold?: boolean }) {
    return (
      <div style={breakdownValueGrid}>
        {paraKartlari.map((item) => (
          <div
            key={`${item.pb}-${String(options?.bold)}-${String(options?.negative)}`}
            style={{
              display: 'flex',
              justifyContent: isMobile ? 'space-between' : 'flex-end',
              alignItems: 'center',
              gap: 10,
              minWidth: 0,
            }}
          >
            <span
              style={{
                display: isMobile ? 'inline-block' : 'none',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.6,
                color: C.textFaint,
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              {item.short}
            </span>
            <span
              style={{
                fontSize: options?.bold ? 14 : 13,
                fontWeight: options?.bold ? 700 : 600,
                color: options?.negative ? '#c2410c' : C.textPrimary,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                textAlign: 'right',
              }}
            >
              {options?.negative ? '- ' : ''}{formatCurrency(selector(item), item.pb)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div
        style={{
          padding: sectionPad,
          borderBottom: `1px solid ${C.totalsRowBorder}`,
          background: 'linear-gradient(135deg, rgba(15,31,69,0.03) 0%, rgba(15,31,69,0.00) 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 14 : 20,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: C.textFaint,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {satirBazliParaBirimi ? 'Para Birimine Göre Toplamlar' : 'Genel Toplam'}
            </div>
            {satirBazliParaBirimi && (
              <div
                style={{
                  fontSize: 12,
                  color: C.textSecondary,
                  fontWeight: 400,
                  lineHeight: 1.5,
                  maxWidth: 460,
                }}
              >
                Her para birimi (TL, EUR, USD) için toplamlar ayrı hesaplanır.
              </div>
            )}
          </div>

          {satirBazliParaBirimi ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(132px, 1fr))',
                gap: 12,
                width: isMobile ? '100%' : 'min(100%, 520px)',
              }}
            >
              {paraKartlari.map((item) => (
                <div
                  key={item.pb}
                  style={{
                    borderRadius: 14,
                    padding: isMobile ? '12px 14px' : '14px 15px',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,248,252,0.98) 100%)',
                    border: `1px solid ${C.border}`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 4px 14px rgba(15,31,69,0.04)',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 500, color: C.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                    {item.short}
                  </div>
                  <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: C.textPrimary, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                    {formatCurrency(item.genelToplam, item.pb)}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 400, marginTop: 4, lineHeight: 1.35 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                minWidth: isMobile ? '100%' : 260,
                borderRadius: 16,
                padding: isMobile ? '15px 16px' : '18px 20px',
                background: 'linear-gradient(112deg, #0d1b3e 0%, #132448 38%, #1a2f5e 100%)',
                boxShadow: '0 10px 28px rgba(15,31,69,0.22)',
                textAlign: isMobile ? 'left' : 'right',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.60)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 6 }}>
                Nihai Tutar
              </div>
              <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: '#ffffff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em', lineHeight: 1.08, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatTek(toplamlar.genelToplam)}
              </div>
            </div>
          )}
        </div>
      </div>

      {breakdownRow(
        'Ara Toplam',
        satirBazliParaBirimi
          ? currencyValueGrid((item) => item.araToplam)
          : <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{formatTek(araToplam)}</span></div>,
      )}

      {iskontoAktif && breakdownRow(
        <>
          (-) İskonto (%
          {iskontoRateEditing ? (
            <input
              autoFocus
              value={iskontoRateDraft}
              onChange={(e) => setIskontoRateDraft(e.target.value.replace(/[^\d.,]/g, ''))}
              onBlur={commitIskontoRate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitIskontoRate();
                if (e.key === 'Escape') setIskontoRateEditing(false);
              }}
              style={inlineInputStyle}
            />
          ) : (
            <span
              onClick={() => { setIskontoRateDraft(String(iskontoOrani)); setIskontoRateEditing(true); }}
              title="Oranı değiştirmek için tıklayın"
              style={editableRateStyle}
            >
              {iskontoOrani}
            </span>
          )}
          )
        </>,
        satirBazliParaBirimi
          ? currencyValueGrid((item) => item.iskontoTutar, { negative: true })
          : <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 13, fontWeight: 600, color: '#c2410c', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>- {formatTek(toplamlar.iskontoTutar)}</span></div>,
        { negative: true },
      )}

      {toplamIndirim > 0 && breakdownRow(
        '(-) İndirim',
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 13, fontWeight: 600, color: '#c2410c', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>- {formatTek(toplamIndirim)}</span></div>,
        { negative: true },
      )}

      {kdvAktif && breakdownRow(
        <>
          KDV (%
          {kdvRateEditing ? (
            <input
              autoFocus
              value={kdvRateDraft}
              onChange={(e) => setKdvRateDraft(e.target.value.replace(/[^\d.,]/g, ''))}
              onBlur={commitKdvRate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitKdvRate();
                if (e.key === 'Escape') setKdvRateEditing(false);
              }}
              style={inlineInputStyle}
            />
          ) : (
            <span
              onClick={() => { setKdvRateDraft(String(kdvOrani)); setKdvRateEditing(true); }}
              title="Oranı değiştirmek için tıklayın"
              style={editableRateStyle}
            >
              {kdvOrani}
            </span>
          )}
          )
        </>,
        satirBazliParaBirimi
          ? currencyValueGrid((item) => item.kdvTutar)
          : <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{formatTek(toplamlar.kdvTutar)}</span></div>,
      )}

      {breakdownRow(
        satirBazliParaBirimi ? 'Genel Toplamlar' : 'Genel Toplam',
        satirBazliParaBirimi
          ? currencyValueGrid((item) => item.genelToplam, { bold: true })
          : <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em' }}>{formatTek(toplamlar.genelToplam)}</span></div>,
        { borderless: true, emphasize: true },
      )}

      <div
        style={{
          padding: isMobile ? '14px 16px 16px' : '16px 20px 20px',
          borderTop: `1px solid ${C.totalsRowBorder}`,
          background: 'linear-gradient(180deg, rgba(15,31,69,0.025) 0%, rgba(15,31,69,0.05) 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.textFaint, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 4 }}>
              Hızlı Kontroller
            </div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 400, lineHeight: 1.5 }}>
              KDV ve iskonto ayarları teklif yerleşiminden bağımsız çalışır.
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: isMobile ? 'stretch' : 'flex-end', alignItems: 'center' }}>
            <button onClick={handleKDV} className={chipButtonClassName(kdvAktif)}>
              {kdvAktif ? `✓ KDV %${kdvOrani}` : `+ KDV %${lastKdvRate}`}
            </button>
            <button onClick={handleIskonto} className={`${chipButtonClassName(iskontoAktif)} app-chip-button--iskonto`}>
              {iskontoAktif ? `✓ İskonto %${iskontoOrani}` : `+ İskonto %${lastIskontoRate}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
