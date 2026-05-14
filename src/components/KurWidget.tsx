/**
 * KurWidget — Navbar'da yer alan premium TCMB döviz kuru göstergesi.
 *
 * Veri: useKur() — server-side TCMB proxy + localStorage cache + 30dk refresh.
 * Görsel: koyu navbar üstüne oturan, altın aksanlı cam-yüzey rozeti. Hover'da
 *         hafif lift + altın çerçeve aydınlanması (CSS class: kur-widget-premium).
 * Etkileşim: hover → detay popover (USD/EUR alış-satış-efektif tablosu).
 */
import { Popover } from 'antd';
import { useKur } from '../hooks/useKur';

const fmt = (n: number): string =>
  n > 0 ? n.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—';

const fmtCompact = (n: number): string =>
  n > 0 ? n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

function tarihGoster(tarih: string): string {
  const m = tarih?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : tarih;
}

interface KurDetayContentProps {
  kur: ReturnType<typeof useKur>['kur'];
}

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
    <div style={{ padding: '4px 0', minWidth: 240 }}>
      <div style={{ display: 'flex', gap: 18, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: '#1A2B42', marginBottom: 4 }}>USD / TL</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {row('Döviz Alış', kur.usd.alis)}
              {row('Döviz Satış', kur.usd.satis)}
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: '#1A2B42', marginBottom: 4 }}>EUR / TL</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {row('Döviz Alış', kur.eur.alis)}
              {row('Döviz Satış', kur.eur.satis)}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{
        borderTop: '1px solid rgba(15,23,42,0.08)',
        paddingTop: 6,
        marginTop: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        fontSize: 10.5,
        color: '#64748b',
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ fontWeight: 700, letterSpacing: '0.08em', color: '#1A2B42' }}>TCMB</span>
        <span>
          {tarihGoster(kur.tarih)}
          {kur._cached && ' · cached'}
        </span>
      </div>
    </div>
  );
}

interface KurParcaProps {
  kod: 'USD' | 'EUR';
  deger: number;
  yok: boolean;
}

function KurParca({ kod, deger, yok }: KurParcaProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 7,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          background:
            'linear-gradient(180deg, #FCE4A3 0%, #E9C46A 45%, #B8862F 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.42))',
        }}
      >
        {kod}
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: yok ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.985)',
          letterSpacing: '-0.018em',
          textShadow: yok
            ? 'none'
            : '0 1px 1px rgba(0,0,0,0.38), 0 0 1px rgba(0,0,0,0.22)',
        }}
      >
        {yok ? '—' : fmtCompact(deger)}
      </span>
    </span>
  );
}

interface KurWidgetProps {
  /** İlk mount'ta soldan slide-in animasyonu çalsın mı (default: true). */
  animate?: boolean;
}

export function KurWidget({ animate = true }: KurWidgetProps = {}) {
  const { kur, hata } = useKur();
  if (!kur && !hata) return null;

  const yok = !kur;
  const className = [
    'kur-widget-premium',
    animate ? 'kur-widget-slide-in' : '',
  ].filter(Boolean).join(' ');

  return (
    <Popover
      content={<KurDetayContent kur={kur} />}
      title={null}
      placement="bottomRight"
      trigger="hover"
      mouseEnterDelay={0.2}
      mouseLeaveDelay={0.1}
      overlayInnerStyle={{ padding: '10px 12px', borderRadius: 14 }}
    >
      <div
        className={className}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '5px 14px',
          background:
            'radial-gradient(150% 240% at 50% 0%, rgba(252,228,163,0.10) 0%, rgba(233,196,106,0) 55%), ' +
            'linear-gradient(180deg, rgba(255,222,173,0.06) 0%, rgba(255,255,255,0.025) 40%, rgba(255,255,255,0.005) 70%, rgba(0,0,0,0.12) 100%)',
          border: '1px solid rgba(233,196,106,0.32)',
          borderRadius: 9,
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.18) inset, ' +
            '0 -1px 0 rgba(0,0,0,0.38) inset, ' +
            '0 0 0 1px rgba(0,0,0,0.14) inset, ' +
            '0 1px 3px rgba(0,0,0,0.20), ' +
            '0 6px 16px rgba(0,0,0,0.26), ' +
            '0 0 20px rgba(233,196,106,0.06)',
          cursor: 'default',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          lineHeight: 1,
          transition:
            'border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease',
        }}
        title={kur ? `TCMB · ${tarihGoster(kur.tarih)}` : 'Kur bilgisi yüklenemedi'}
      >
        <KurParca kod="USD" deger={kur?.usd.satis ?? 0} yok={yok} />
        <span
          aria-hidden
          style={{
            width: 1,
            height: 16,
            borderRadius: 1,
            background:
              'linear-gradient(180deg, rgba(252,228,163,0) 0%, rgba(252,228,163,0.72) 50%, rgba(184,134,47,0) 100%)',
            boxShadow:
              '0 0 6px rgba(233,196,106,0.28), 0 0 1px rgba(252,228,163,0.50)',
          }}
        />
        <KurParca kod="EUR" deger={kur?.eur.satis ?? 0} yok={yok} />
      </div>
    </Popover>
  );
}
