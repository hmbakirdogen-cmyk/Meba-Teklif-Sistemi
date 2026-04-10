import React, { useRef, useState } from 'react';
import { formatCurrency } from '../utils/formatters';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';

interface ToplamPaneliProps {
  araToplam: number;
  toplamIndirim: number;
  toplamVergi: number;
  genelToplam: number;
  paraBirimi: string;
  kdvOrani: number;
  onKdvOraniChange: (oran: number) => void;
  iskontoOrani: number;
  onIskontoOraniChange: (oran: number) => void;
}

export default function ToplamPaneli({
  araToplam,
  toplamIndirim,
  toplamVergi: _toplamVergi,
  genelToplam: _genelToplam,
  paraBirimi,
  kdvOrani,
  onKdvOraniChange,
  iskontoOrani,
  onIskontoOraniChange,
}: ToplamPaneliProps) {
  const f = (n: number) => formatCurrency(n, paraBirimi);

  // ── KDV ──────────────────────────────────────────────────────────────────
  // Son geçerli KDV oranını hatırla; KDV kapatılıp tekrar açıldığında kullanılır
  const lastKdvRateRef = useRef(kdvOrani > 0 ? kdvOrani : 20);
  if (kdvOrani > 0 && kdvOrani !== lastKdvRateRef.current) {
    lastKdvRateRef.current = kdvOrani;
  }
  const lastKdvRate = lastKdvRateRef.current;

  const [kdvRateEditing, setKdvRateEditing] = useState(false);
  const [kdvRateDraft, setKdvRateDraft] = useState('');

  function commitKdvRate() {
    const v = parseFloat(kdvRateDraft.replace(',', '.'));
    if (!isNaN(v) && v > 0 && v <= 100) onKdvOraniChange(Math.round(v * 100) / 100);
    setKdvRateEditing(false);
  }

  const handleKDV = () => onKdvOraniChange(kdvAktif ? 0 : lastKdvRate);

  // ── İSKONTO ──────────────────────────────────────────────────────────────
  // KDV ile birebir aynı yapı; fark: prop bazlı oran + toplamdan düşme
  const lastIskontoRateRef = useRef(10); // default %10
  if (iskontoOrani > 0 && iskontoOrani !== lastIskontoRateRef.current) {
    lastIskontoRateRef.current = iskontoOrani;
  }
  const lastIskontoRate = lastIskontoRateRef.current;

  const [iskontoRateEditing, setIskontoRateEditing] = useState(false);
  const [iskontoRateDraft, setIskontoRateDraft] = useState('');

  function commitIskontoRate() {
    const v = parseFloat(iskontoRateDraft.replace(',', '.'));
    if (!isNaN(v) && v > 0 && v <= 100) onIskontoOraniChange(Math.round(v * 100) / 100);
    setIskontoRateEditing(false);
  }

  const handleIskonto = () => onIskontoOraniChange(iskontoAktif ? 0 : lastIskontoRate);

  // ── Hesaplamalar — ortak fonksiyon (TeklifSablonu ile aynı kaynak) ──────
  const { iskontoTutar, kdvTutar: hesaplananKdv, genelToplam: hesaplananGenel } =
    hesaplamaMotoru.teklifToplamlariniHesapla({ araToplam, kdvOrani, iskontoOrani });
  const kdvAktif     = kdvOrani > 0;
  const iskontoAktif = iskontoOrani > 0;

  // ── Stiller ──────────────────────────────────────────────────────────────
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

  // KDV/İskonto satır içi oran input stili — ikisi de ortak kullanır
  const inlineInputStyle: React.CSSProperties = {
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
  };

  const editableRateStyle: React.CSSProperties = {
    cursor: 'pointer',
    textDecoration: 'underline dotted',
    color: '#0f1f45',
    fontWeight: 600,
  };

  // Genel Toplam bar'ındaki toggle buton stili — her iki buton da ortak kullanır
  const toggleBtnStyle = (aktif: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 5,
    background: aktif ? 'rgba(255,255,255,0.15)' : 'transparent',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: 0.3,
    transition: 'background 0.15s',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    boxShadow: aktif ? 'inset 0 1px 0 rgba(255,255,255,0.10)' : 'none',
  });

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

        {/* Ara Toplam — KDV veya iskonto aktifken göster */}
        {(kdvAktif || iskontoAktif) && (
          <div style={row}>
            <span style={lbl}>Ara Toplam</span>
            <span style={val}>{f(araToplam)}</span>
          </div>
        )}

        {/* İskonto satırı — KDV satırıyla birebir aynı yapı, fark: kırmızı + eksi */}
        {iskontoAktif && (
          <div style={row}>
            <span style={{ ...lbl, color: '#dc2626' }}>
              (–) İskonto (%
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
            </span>
            <span style={{ ...val, color: '#dc2626' }}>– {f(iskontoTutar)}</span>
          </div>
        )}

        {/* İndirim — satır bazlı indirim varsa */}
        {toplamIndirim > 0 && (
          <div style={row}>
            <span style={{ ...lbl, color: '#dc2626' }}>(–) İndirim</span>
            <span style={{ ...val, color: '#dc2626' }}>– {f(toplamIndirim)}</span>
          </div>
        )}

        {/* KDV satırı */}
        {kdvAktif && (
          <div style={{ ...row, borderBottom: '1px solid #d1d9e6' }}>
            <span style={lbl}>
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
            </span>
            <span style={val}>{f(hesaplananKdv)}</span>
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
            {/* KDV toggle butonu */}
            <button onClick={handleKDV} style={toggleBtnStyle(kdvAktif)}>
              {kdvAktif ? `✓ KDV %${kdvOrani}` : `+ KDV %${lastKdvRate}`}
            </button>

            {/* İskonto toggle butonu — KDV butonuyla birebir aynı yapı */}
            <button onClick={handleIskonto} style={toggleBtnStyle(iskontoAktif)}>
              {iskontoAktif ? `✓ İskonto %${iskontoOrani}` : `+ İskonto %${lastIskontoRate}`}
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
            {f(hesaplananGenel)}
          </span>
        </div>
      </div>
    </div>
  );
}
