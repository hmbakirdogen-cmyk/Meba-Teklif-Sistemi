/**
 * KurWidget — TCMB döviz kuru göstergesi (USD + EUR).
 *
 * İki varyant:
 *   • 'full'    → kart yapısı, teklif editörü sol kenarında floating
 *   • 'compact' → tek satır mini gösterge, header'da
 *
 * Veri: useKur() — server-side TCMB proxy + localStorage cache + 30dk refresh
 * Animasyon: ilk mount'ta soldan slide-in + fade-in (CSS keyframe)
 */
import { useState } from 'react';
import { Tooltip, Popover } from 'antd';
import { useKur } from '../hooks/useKur';

const fmt = (n: number): string =>
  n > 0 ? n.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—';

const fmtCompact = (n: number): string =>
  n > 0 ? n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

function tarihGoster(tarih: string): string {
  // YYYY-MM-DD → DD.MM.YYYY
  const m = tarih?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : tarih;
}

interface KurDetayContentProps {
  kur: ReturnType<typeof useKur>['kur'];
}

/** Detay popover içeriği — alış/satış/efektif tablo + son güncelleme. */
function KurDetayContent({ kur }: KurDetayContentProps) {
  if (!kur) return <div style={{ padding: 12, color: '#9ca3af' }}>Yükleniyor…</div>;
  const row = (label: string, deger: number) => (
    <tr>
      <td style={{ padding: '3px 12px 3px 0', color: '#6b7280', fontSize: 11 }}>{label}</td>
      <td style={{ padding: '3px 0', color: '#111827', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 11, textAlign: 'right' }}>
        {fmt(deger)}
      </td>
    </tr>
  );
  return (
    <div style={{ padding: '4px 0', minWidth: 220 }}>
      <div style={{ display: 'flex', gap: 18, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: '#1A2B42', marginBottom: 4 }}>USD / TL</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {row('Döviz Alış', kur.usd.alis)}
              {row('Döviz Satış', kur.usd.satis)}
              {row('Efektif Alış', kur.usd.efektifAlis)}
              {row('Efektif Satış', kur.usd.efektifSatis)}
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: '#1A2B42', marginBottom: 4 }}>EUR / TL</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {row('Döviz Alış', kur.eur.alis)}
              {row('Döviz Satış', kur.eur.satis)}
              {row('Efektif Alış', kur.eur.efektifAlis)}
              {row('Efektif Satış', kur.eur.efektifSatis)}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(15,23,42,0.08)', paddingTop: 6, fontSize: 9.5, color: '#94a3b8', letterSpacing: '0.02em' }}>
        Kaynak: TCMB · {tarihGoster(kur.tarih)}
        {kur._cached && ' · (cached)'}
      </div>
    </div>
  );
}

interface KurWidgetProps {
  variant?: 'full' | 'compact';
  /** Görünmez/açılmaz iken bile mount durumu — animasyon trigger için. */
  animate?: boolean;
}

/**
 * Tam kart varyantı — teklif editörü sol kenarında floating.
 * Elit dark görünüm: navy gradient zemin, altın aksesuar, alış+satış 2-sütun.
 * Slide-in animasyonu ile soldan girer.
 */
function KurWidgetFull({ animate = true }: { animate?: boolean }) {
  const { kur, yukleniyor, hata } = useKur();
  const [acik, setAcik] = useState(false);
  const yok = !kur && !yukleniyor;

  return (
    <Popover
      open={acik}
      onOpenChange={setAcik}
      content={<KurDetayContent kur={kur} />}
      title={null}
      placement="right"
      trigger="click"
    >
      <div
        className={animate ? 'kur-widget-slide-in' : undefined}
        style={{
          width: 192,
          padding: '12px 14px 11px',
          // Elit dark gradient — TotalsCard dark variant ile uyumlu
          background: 'linear-gradient(180deg, #1E3350 0%, #152740 55%, #0F1D30 100%)',
          border: '0.75px solid #1A2B42',
          borderRadius: 12,
          boxShadow:
            '0 8px 24px rgba(15, 25, 40, 0.28), 0 0 0 1px rgba(255,255,255,0.04) inset',
          cursor: 'pointer',
          fontFamily: 'inherit',
          userSelect: 'none',
          color: 'rgba(255,255,255,0.92)',
        }}
        title={kur ? `TCMB · ${tarihGoster(kur.tarih)}` : 'Kur bilgisi yükleniyor'}
      >
        {/* Başlık — altın aksent */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#d4af6a', // altın tonu — elit aksent
          }}>
            TCMB
          </div>
          <div style={{
            fontSize: 8.5, fontWeight: 600,
            color: 'rgba(255,255,255,0.42)',
            letterSpacing: '0.04em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {kur ? tarihGoster(kur.tarih) : '—'}
          </div>
        </div>

        {/* Alt başlık satırı — Alış / Satış kolonları */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '34px 1fr 1fr',
          alignItems: 'baseline',
          gap: 6,
          fontSize: 8.5, fontWeight: 700, letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.38)',
          paddingBottom: 4,
          borderBottom: '0.5px solid rgba(212,175,106,0.18)',
          marginBottom: 6,
        }}>
          <span />
          <span style={{ textAlign: 'right' }}>Alış</span>
          <span style={{ textAlign: 'right' }}>Satış</span>
        </div>

        <KurSatir label="USD" alis={kur?.usd.alis ?? 0} satis={kur?.usd.satis ?? 0} yok={yok} hata={!!hata && !kur} />
        <div style={{ height: 5 }} />
        <KurSatir label="EUR" alis={kur?.eur.alis ?? 0} satis={kur?.eur.satis ?? 0} yok={yok} hata={!!hata && !kur} />
      </div>
    </Popover>
  );
}

function KurSatir({ label, alis, satis, yok, hata }: {
  label: string; alis: number; satis: number; yok: boolean; hata: boolean;
}) {
  const text = yok || hata ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.95)';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '34px 1fr 1fr',
      alignItems: 'baseline',
      gap: 6,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
        color: '#d4af6a', // altın etiket
      }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: text,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
        textAlign: 'right',
      }}>
        {yok ? '—' : fmtCompact(alis)}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 700,
        color: text,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
        textAlign: 'right',
      }}>
        {yok ? '—' : fmtCompact(satis)}
      </span>
    </div>
  );
}

/**
 * Kompakt varyant — header'da tek satır. Tıklayınca detay popover.
 */
function KurWidgetCompact({ animate = true }: { animate?: boolean }) {
  const { kur, hata } = useKur();
  if (!kur && !hata) {
    // Hiç veri yoksa header'ı kirletme
    return null;
  }
  return (
    <Tooltip
      title={kur ? <KurDetayContent kur={kur} /> : 'Kur bilgisi yüklenemedi'}
      placement="bottom"
      overlayInnerStyle={{ padding: '8px 10px' }}
    >
      <div
        className={animate ? 'kur-widget-slide-in' : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '4px 10px',
          background: 'rgba(255,255,255,0.06)',
          border: '0.75px solid rgba(255,255,255,0.10)',
          borderRadius: 6,
          fontSize: 11.5,
          fontVariantNumeric: 'tabular-nums',
          color: 'rgba(255,255,255,0.92)',
          cursor: 'pointer',
          userSelect: 'none',
          fontWeight: 600,
          letterSpacing: '-0.005em',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 9, opacity: 0.65, letterSpacing: '0.08em', fontWeight: 700 }}>USD</span>
          <span>{kur ? fmtCompact(kur.usd.satis) : '—'}</span>
        </span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 9, opacity: 0.65, letterSpacing: '0.08em', fontWeight: 700 }}>EUR</span>
          <span>{kur ? fmtCompact(kur.eur.satis) : '—'}</span>
        </span>
      </div>
    </Tooltip>
  );
}

export function KurWidget({ variant = 'full', animate = true }: KurWidgetProps) {
  return variant === 'compact' ? <KurWidgetCompact animate={animate} /> : <KurWidgetFull animate={animate} />;
}
