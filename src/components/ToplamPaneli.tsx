import React, { useRef, useState } from 'react';
import type { ParaBirimi } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ToplamPaneliProps {
  araToplam: number;
  toplamIndirim: number;
  toplamVergi: number;
  genelToplam: number;
  paraBirimi: ParaBirimi;
  kdvOrani: number;
  onKdvOraniChange: (oran: number) => void;
}

export default function ToplamPaneli({
  araToplam,
  toplamIndirim,
  toplamVergi,
  genelToplam,
  paraBirimi,
  kdvOrani,
  onKdvOraniChange,
}: ToplamPaneliProps) {
  const f = (n: number) => formatCurrency(n, paraBirimi);

  // lastRate: kullanıcının en son set ettiği KDV oranı. UI sadece KDV
  // kapatılıp tekrar açıldığında bu değeri default olarak gösterir.
  // Render sırasında inline update — useEffect gerek yok (cascading render önlenir).
  const lastRateRef = useRef(kdvOrani > 0 ? kdvOrani : 20);
  if (kdvOrani > 0 && kdvOrani !== lastRateRef.current) {
    lastRateRef.current = kdvOrani;
  }
  const lastRate = lastRateRef.current;

  const [rateEditing, setRateEditing] = useState(false);
  const [rateDraft, setRateDraft] = useState('');

  function commitRate() {
    const v = parseFloat(rateDraft.replace(',', '.'));
    if (!isNaN(v) && v > 0 && v <= 100) onKdvOraniChange(Math.round(v * 100) / 100);
    setRateEditing(false);
  }

  const kdvAktif = kdvOrani > 0;

  const row: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid #f0f4f8',
    fontSize: 13,
  };
  const lbl: React.CSSProperties = {
    fontWeight: 500,
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0.1,
  };
  const val: React.CSSProperties = {
    fontWeight: 500,
    color: '#0f1f45',
    fontVariantNumeric: 'tabular-nums',
    fontSize: 13,
    letterSpacing: 0.1,
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        width: 390,
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fafbfd',
        boxShadow: '0 1px 3px rgba(15,31,69,0.06)',
      }}>
        {/* Ara Toplam — yalnızca KDV aktifken */}
        {kdvAktif && (
          <div style={row}>
            <span style={lbl}>Ara Toplam</span>
            <span style={val}>{f(araToplam)}</span>
          </div>
        )}

        {/* İndirim — KDV aktif ve indirim > 0 */}
        {kdvAktif && toplamIndirim > 0 && (
          <div style={row}>
            <span style={{ ...lbl, color: '#dc2626' }}>(–) İndirim</span>
            <span style={{ ...val, color: '#dc2626' }}>– {f(toplamIndirim)}</span>
          </div>
        )}

        {/* KDV satırı — yalnızca KDV aktifken */}
        {kdvAktif && (
          <div style={{ ...row, borderBottom: '1px solid #d1d9e6' }}>
            <span style={lbl}>
              KDV (%
              {rateEditing ? (
                <input
                  autoFocus
                  value={rateDraft}
                  onChange={(e) => setRateDraft(e.target.value.replace(/[^\d.,]/g, ''))}
                  onBlur={commitRate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRate();
                    if (e.key === 'Escape') setRateEditing(false);
                  }}
                  style={{
                    width: 36,
                    height: 18,
                    fontSize: 12,
                    padding: '0 4px',
                    border: '1px solid #2563eb',
                    borderRadius: 4,
                    outline: 'none',
                    textAlign: 'center',
                    fontFamily: 'inherit',
                    color: '#0f1f45',
                    verticalAlign: 'middle',
                    boxShadow: '0 0 0 3px rgba(37,99,235,0.10)',
                  }}
                />
              ) : (
                <span
                  onClick={() => { setRateDraft(String(kdvOrani)); setRateEditing(true); }}
                  title="Oranı değiştirmek için tıklayın"
                  style={{
                    cursor: 'pointer',
                    textDecoration: 'underline dotted',
                    color: '#0f1f45',
                    fontWeight: 600,
                  }}
                >
                  {kdvOrani}
                </span>
              )}
              )
            </span>
            <span style={val}>{f(toplamVergi)}</span>
          </div>
        )}

        {/* Genel Toplam */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '11px 16px',
          background: 'linear-gradient(180deg, #1a2f5e 0%, #0f1f45 100%)',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button
              onClick={() => onKdvOraniChange(kdvAktif ? 0 : lastRate)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 5,
                background: kdvAktif ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: 0.3,
                transition: 'background 0.15s',
                userSelect: 'none' as const,
                whiteSpace: 'nowrap' as const,
                flexShrink: 0,
                boxShadow: kdvAktif ? 'inset 0 1px 0 rgba(255,255,255,0.10)' : 'none',
              }}
            >
              {kdvAktif ? `✓ KDV %${kdvOrani}` : `+ KDV %${lastRate}`}
            </button>
            <span style={{
              fontWeight: 700,
              fontSize: 11,
              color: 'rgba(255,255,255,0.70)',
              letterSpacing: 1.0,
              textTransform: 'uppercase' as const,
              whiteSpace: 'nowrap' as const,
            }}>
              Genel Toplam
            </span>
          </div>
          <span style={{
            fontWeight: 700,
            fontSize: 18,
            color: '#ffffff',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 0.2,
            whiteSpace: 'nowrap' as const,
          }}>
            {f(genelToplam)}
          </span>
        </div>
      </div>
    </div>
  );
}
