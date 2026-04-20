import type { CSSProperties } from 'react';
import type { Teklif } from '../types';
import type { TeklifToplam } from '../services/hesaplamaMotoru';
import { formatCurrency } from '../utils/formatters';

interface PdfPalette {
  navy: string;
  border: string;
  textMid: string;
  textSoft: string;
}

interface CurrencyCard {
  pb: 'TRY' | 'EUR' | 'USD';
  araToplam: number;
  iskontoTutar: number;
  kdvTutar: number;
  total: number;
}

function TableColgroup({ satirBazliParaBirimi }: { satirBazliParaBirimi: boolean }) {
  return (
    <colgroup>
      <col style={{ width: '3%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '30%' }} />
      <col style={{ width: '8%' }} />
      {satirBazliParaBirimi && <col style={{ width: '7%' }} />}
      <col style={{ width: '13%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '8%' }} />
    </colgroup>
  );
}

export function TeklifTotalsSection({
  teklif,
  totals,
  satirBazliParaBirimi,
  kullanilanParaKartlari,
  palette,
  noBreak,
}: {
  teklif: Teklif;
  totals: TeklifToplam;
  satirBazliParaBirimi: boolean;
  kullanilanParaKartlari: CurrencyCard[];
  palette: PdfPalette;
  noBreak: CSSProperties;
}) {
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: satirBazliParaBirimi ? '10px' : '4px',
        marginBottom: '14px',
        tableLayout: 'fixed',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: satirBazliParaBirimi ? `1px solid ${palette.border}` : 'none',
        borderBottom: satirBazliParaBirimi ? `1px solid ${palette.border}` : 'none',
        ...noBreak,
      }}
    >
      <TableColgroup satirBazliParaBirimi={satirBazliParaBirimi} />
      <tbody>
        {!satirBazliParaBirimi ? (
          // Tüm finansal değerler "Toplam" sütununa (col 7) native hizalı.
          // Her satır: colSpan=6 (etiket sağa), col-7 (değer sağa, aynı padding),
          // col-8 (Teslimat, boş). Nested tablo YOK — virgül hizası garantili.
          (() => {
            const hasDetail = iskontoOrani > 0 || kdvOrani > 0;
            return (
              <>
                {hasDetail && (
                  <tr>
                    <td colSpan={6} style={{ padding: '6px 12px 2px 0', textAlign: 'right', borderBottom: 'none', borderTop: 'none', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '9px', lineHeight: 1.3, fontWeight: 500, color: palette.textSoft, whiteSpace: 'nowrap' }}>Ara Toplam</span>
                    </td>
                    <td style={{ padding: '6px 6px 2px 6px', textAlign: 'right', borderBottom: 'none', borderTop: 'none', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: '9px', lineHeight: 1.3, color: palette.textMid, fontWeight: 600 }}>
                      {formatCurrency(araToplam, teklif.paraBirimi)}
                    </td>
                    <td style={{ borderBottom: 'none', borderTop: 'none' }} />
                  </tr>
                )}
                {iskontoOrani > 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2px 12px 2px 0', textAlign: 'right', borderBottom: 'none', borderTop: 'none', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '9px', lineHeight: 1.3, fontWeight: 500, color: palette.textSoft, whiteSpace: 'nowrap' }}>{`İskonto %${iskontoOrani}`}</span>
                    </td>
                    <td style={{ padding: '2px 6px', textAlign: 'right', borderBottom: 'none', borderTop: 'none', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: '9px', lineHeight: 1.3, color: palette.textMid, fontWeight: 600 }}>
                      – {formatCurrency(iskontoTutar, teklif.paraBirimi)}
                    </td>
                    <td style={{ borderBottom: 'none', borderTop: 'none' }} />
                  </tr>
                )}
                {kdvOrani > 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2px 12px 2px 0', textAlign: 'right', borderBottom: 'none', borderTop: 'none', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '9px', lineHeight: 1.3, fontWeight: 500, color: palette.textSoft, whiteSpace: 'nowrap' }}>{`KDV %${kdvOrani}`}</span>
                    </td>
                    <td style={{ padding: '2px 6px', textAlign: 'right', borderBottom: 'none', borderTop: 'none', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: '9px', lineHeight: 1.3, color: palette.textMid, fontWeight: 600 }}>
                      + {formatCurrency(kdvTutar, teklif.paraBirimi)}
                    </td>
                    <td style={{ borderBottom: 'none', borderTop: 'none' }} />
                  </tr>
                )}
                {hasDetail && (
                  <tr>
                    <td colSpan={6} style={{ padding: '5px 12px 5px 0', borderBottom: 'none', borderTop: 'none' }}>
                      <div style={{ borderTop: '0.75px solid #E2E0DC' }} />
                    </td>
                    <td style={{ padding: '5px 6px', borderBottom: 'none', borderTop: 'none' }}>
                      <div style={{ borderTop: '0.75px solid #E2E0DC' }} />
                    </td>
                    <td style={{ borderBottom: 'none', borderTop: 'none' }} />
                  </tr>
                )}
                <tr>
                  <td colSpan={6} style={{ padding: hasDetail ? '4px 12px 6px 0' : '5px 12px 6px 0', textAlign: 'right', borderBottom: 'none', borderTop: 'none', verticalAlign: 'bottom' }}>
                    <span style={{ fontSize: '8.5px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: palette.textMid, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                      Genel Toplam
                    </span>
                  </td>
                  <td style={{ padding: hasDetail ? '4px 6px 6px 6px' : '5px 6px', textAlign: 'right', verticalAlign: 'bottom', borderBottom: 'none', borderTop: 'none', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: genelToplam >= 1000000 ? '14px' : '15.5px', fontWeight: 800, lineHeight: 1.08, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: palette.navy }}>
                      {formatCurrency(genelToplam, teklif.paraBirimi)}
                    </span>
                  </td>
                  <td style={{ borderBottom: 'none', borderTop: 'none' }} />
                </tr>
              </>
            );
          })()
        ) : (
          <tr>
            <td colSpan={9} style={{ padding: '9px 10px 10px', borderBottom: 'none' }}>
              <div
                style={{
                  border: '0.6px solid #E2E0DC',
                  borderRadius: '14px',
                  background: 'linear-gradient(180deg, #FAFAF8 0%, #F7F6F4 100%)',
                  padding: '8px 9px 9px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ width: '100%', margin: '0 auto' }}>
                  <table
                    style={{
                      width: '100%',
                      tableLayout: 'fixed',
                      borderCollapse: 'separate',
                      borderSpacing: '10px 0',
                    }}
                  >
                    <tbody>
                      <tr>
                        {kullanilanParaKartlari.map((item) => (
                          <td
                            key={item.pb}
                            style={{
                              width: `${100 / Math.max(kullanilanParaKartlari.length, 1)}%`,
                              verticalAlign: 'top',
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: '14px',
                                border: '0.5px solid #E8E6E3',
                                background: '#FFFFFF',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
                                padding: iskontoOrani > 0 || kdvOrani > 0 ? '8px 11px 7px' : '6px 11px 6px',
                                overflow: 'hidden',
                              }}
                            >
                              {/* Para birimi kodu — temiz, inline */}
                              <div
                                style={{
                                  fontSize: '7.5px',
                                  fontWeight: 700,
                                  letterSpacing: '0.14em',
                                  color: '#8e8e93',
                                  marginBottom: '3px',
                                  textTransform: 'uppercase',
                                  textAlign: 'center',
                                  lineHeight: 1,
                                }}
                              >
                                {item.pb === 'TRY' ? 'TL' : item.pb}
                              </div>
                              {/* Toplam rakamı */}
                              <div
                                style={{
                                  fontSize: item.total >= 1000000 ? '14.5px' : '16px',
                                  fontWeight: 900,
                                  lineHeight: 1.06,
                                  fontVariantNumeric: 'tabular-nums',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  letterSpacing: '-0.025em',
                                  color: palette.navy,
                                  textAlign: 'center',
                                }}
                              >
                                {formatCurrency(item.total, item.pb)}
                              </div>
                              {/* Ayraç + Detay satırları */}
                              {(iskontoOrani > 0 || kdvOrani > 0) && <div style={{ borderTop: '0.75px solid #E2E0DC', margin: '5px 0 4px' }} />}
                              {(iskontoOrani > 0 || kdvOrani > 0) && (
                                <table
                                  style={{
                                    width: '100%',
                                    borderCollapse: 'separate',
                                    borderSpacing: '0 1px',
                                    marginBottom: 0,
                                  }}
                                >
                                  <tbody>
                                    <tr>
                                      <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: palette.textSoft, textAlign: 'left', whiteSpace: 'nowrap', padding: '0 8px 0 0' }}>
                                        Ara Toplam
                                      </td>
                                      <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: palette.textMid, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: 0, fontWeight: 600 }}>
                                        {formatCurrency(item.araToplam, item.pb)}
                                      </td>
                                    </tr>
                                    {iskontoOrani > 0 && (
                                      <tr>
                                        <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: palette.textSoft, textAlign: 'left', whiteSpace: 'nowrap', padding: '0 8px 0 0' }}>
                                          {`İskonto %${iskontoOrani}`}
                                        </td>
                                        <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: palette.textMid, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: 0, fontWeight: 600 }}>
                                          – {formatCurrency(item.iskontoTutar, item.pb)}
                                        </td>
                                      </tr>
                                    )}
                                    {kdvOrani > 0 && (
                                      <tr>
                                        <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: palette.textSoft, textAlign: 'left', whiteSpace: 'nowrap', padding: '0 8px 0 0' }}>
                                          {`KDV %${kdvOrani}`}
                                        </td>
                                        <td style={{ fontSize: '8.5px', lineHeight: 1.2, color: palette.textMid, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: 0, fontWeight: 600 }}>
                                          + {formatCurrency(item.kdvTutar, item.pb)}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
