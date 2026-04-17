import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { hesaplamaMotoru, type ParaBirimiToplamlari } from '../services/hesaplamaMotoru';
import { chipButtonClassName } from '../styles/buttonStyles';
import { useColors } from '../hooks/useColors';
import { useIsMobile } from '../hooks/useIsMobile';
import { FinansalOzetKartIci } from './FinansalOzetKartIci';

interface ToplamPaneliProps {
  araToplam:               number;
  toplamIndirim:           number;
  paraBirimi:              string;
  satirBazliParaBirimi:    boolean;
  satirParaToplamlari:     ParaBirimiToplamlari;
  kdvOrani:                number;
  onKdvOraniChange:        (oran: number) => void;
  iskontoOrani:            number;
  onIskontoOraniChange:    (oran: number) => void;
}

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
  const C       = useColors();
  const isMobile = useIsMobile(900);

  const [lastKdvRate,       setLastKdvRate]       = useState(kdvOrani      > 0 ? kdvOrani      : 20);
  const [lastIskontoRate,   setLastIskontoRate]   = useState(iskontoOrani > 0 ? iskontoOrani : 10);

  const kdvAktif      = kdvOrani      > 0;
  const iskontoAktif  = iskontoOrani  > 0;

  const toplamlar = useMemo(
    () => hesaplamaMotoru.teklifToplamlariniHesapla({ araToplam, kdvOrani, iskontoOrani }),
    [araToplam, kdvOrani, iskontoOrani],
  );

  // Tüm para birimi kartları
  const paraKartlari = useMemo(
    () =>
      (['TRY', 'EUR', 'USD'] as const).map((pb) => ({
        pb,
        ...hesaplamaMotoru.teklifToplamlariniHesapla({
          araToplam:    satirParaToplamlari[pb],
          kdvOrani,
          iskontoOrani,
        }),
      })),
    [satirParaToplamlari, kdvOrani, iskontoOrani],
  );

  // Sadece satır içeren para birimleri (sıfır bakiyeli kartları gizle)
  const aktifKartlar = useMemo(
    () => paraKartlari.filter((item) => satirParaToplamlari[item.pb] > 0),
    [paraKartlari, satirParaToplamlari],
  );

  // ── KDV / İskonto toggle ─────────────────────────────────────────────────────
  const handleKDV = () => {
    if (kdvAktif) { setLastKdvRate(kdvOrani); onKdvOraniChange(0); return; }
    onKdvOraniChange(lastKdvRate);
  };

  const handleIskonto = () => {
    if (iskontoAktif) { setLastIskontoRate(iskontoOrani); onIskontoOraniChange(0); return; }
    onIskontoOraniChange(lastIskontoRate);
  };

  // ── Inline oran değişikliği (FinansalOzetKartIci callback'leri) ───────────────
  const handleIskontoRateEdit = (newRate: number) => {
    setLastIskontoRate(newRate);
    onIskontoOraniChange(newRate);
  };

  const handleKdvRateEdit = (newRate: number) => {
    setLastKdvRate(newRate);
    onKdvOraniChange(newRate);
  };

  // ── Kart ortak stili ─────────────────────────────────────────────────────────
  const panelDis: CSSProperties = {
    border: `1px solid ${C.totalsBorder}`,
    borderRadius: 18,
    background: `linear-gradient(180deg, ${C.bgSurface} 0%, ${C.totalsPanel} 100%)`,
    boxShadow: C.shadowCard,
    overflow: 'hidden',
  };

  const kartDis: CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${C.totalsBorder}`,
    background: `linear-gradient(180deg, ${C.bgSurface} 0%, ${C.totalsPanel} 100%)`,
    boxShadow: C.shadowCard,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 120,
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      ...panelDis,
    }}>

      {/* ── Kartlar bölümü ─────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '16px 16px 14px' : '18px 20px 16px' }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: C.textFaint,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          {satirBazliParaBirimi ? 'Para Birimine Göre Finansal Özet' : 'Finansal Özet'}
        </div>

        {satirBazliParaBirimi ? (
          // ── Çok para birimi: aktif para birimleri için kart dizisi ─────────────
          aktifKartlar.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '1fr'
                : `repeat(${Math.min(aktifKartlar.length, 3)}, minmax(220px, 1fr))`,
              gap: 12,
            }}>
              {aktifKartlar.map((item) => (
                <div key={item.pb} style={kartDis}>
                  <FinansalOzetKartIci
                    araToplam={item.araToplam}
                    iskontoOrani={iskontoOrani}
                    iskontoTutar={item.iskontoTutar}
                    kdvOrani={kdvOrani}
                    kdvTutar={item.kdvTutar}
                    genelToplam={item.genelToplam}
                    paraBirimi={item.pb}
                    variant="screen"
                    onIskontoRateEdit={handleIskontoRateEdit}
                    onKdvRateEdit={handleKdvRateEdit}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: C.textFaint, padding: '20px 0' }}>
              Henüz ürün satırı eklenmedi.
            </div>
          )
        ) : (
          // ── Tek para birimi: sağa yaslı tek kart ─────────────────────────────
          <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
            <div style={{
              ...kartDis,
              width: isMobile ? '100%' : 'min(100%, 360px)',
            }}>
              <FinansalOzetKartIci
                araToplam={araToplam}
                iskontoOrani={iskontoOrani}
                iskontoTutar={toplamlar.iskontoTutar}
                kdvOrani={kdvOrani}
                kdvTutar={toplamlar.kdvTutar}
                toplamIndirim={toplamIndirim}
                genelToplam={toplamlar.genelToplam}
                paraBirimi={paraBirimi}
                variant="screen"
                onIskontoRateEdit={handleIskontoRateEdit}
                onKdvRateEdit={handleKdvRateEdit}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Hızlı Kontroller ───────────────────────────────────────────────────── */}
      <div style={{
        padding: isMobile ? '14px 16px 16px' : '16px 20px 20px',
        borderTop: `1px solid ${C.totalsRowBorder}`,
        background: isMobile
          ? `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.totalsPanel} 100%)`
          : 'linear-gradient(180deg, rgba(15,31,69,0.025) 0%, rgba(15,31,69,0.05) 100%)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.textFaint, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 4 }}>
              Finansal Ayarlar
            </div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 400, lineHeight: 1.5 }}>
              Vergi ve iskonto oranları, satır yapısı korunarak toplam kartlarına anında yansıtılır.
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: isMobile ? 'stretch' : 'flex-end', alignItems: 'center' }}>
            <button type="button" onClick={handleKDV} className={chipButtonClassName(kdvAktif)}>
              {kdvAktif ? `KDV %${kdvOrani} aktif` : `KDV %${lastKdvRate} ekle`}
            </button>
            <button type="button" onClick={handleIskonto} className={`${chipButtonClassName(iskontoAktif)} app-chip-button--iskonto`}>
              {iskontoAktif ? `İskonto %${iskontoOrani} aktif` : `İskonto %${lastIskontoRate} ekle`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
