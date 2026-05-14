/**
 * KurKumandaSection — Kumanda paneli'nin TarihKumandaSection altında yer alan
 * TCMB döviz kuru rozeti. Tasarım dili:
 *   - Koyu bordo-siyah ana gradient + üst kenarda şampanya altın highlight
 *     (tarih yazısının rengiyle dil birliği, premium "kasa kapağı" hissi).
 *   - panel-scale değişkenine duyarlı (panelle birlikte küçülür/büyür).
 *   - $ glyph dolar yeşili gradient, € glyph euro mavisi gradient.
 *   - Rakamlar (33,21 / 38,45) warm stone gray (--text-numeric).
 *   - Hover'da sol-yön Popover ile detay: USD/EUR Döviz Alış + Döviz Satış
 *     (2'şer değer) + TCMB · tarih footer.
 *
 * Stil class'ları (.kp-kur-*) KumandaPaneli.tsx'in <style> bloğunda tanımlı
 * — section panel ile aynı style scope'unda render edildiği için merkezi
 * tutmak en temiz.
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
  // Kumanda Paneli tooltip dili: koyu mor-siyah arkaplan + açık pembe-beyaz
  // text + pembe accent. KumandaPaneli.tsx içindeki diğer Tooltip'lerle
  // birebir aynı kasa.
  const LABEL_COLOR = 'rgba(255, 220, 215, 0.62)';
  const VALUE_COLOR = 'rgba(255, 232, 238, 0.95)';
  const HEAD_COLOR  = 'rgba(255, 178, 196, 0.92)';
  const FAINT_COLOR = 'rgba(255, 220, 215, 0.50)';
  const SEP_COLOR   = 'rgba(255, 178, 196, 0.18)';

  if (!kur) return <div style={{ padding: 12, color: FAINT_COLOR, fontSize: 11 }}>Yükleniyor…</div>;

  const row = (label: string, deger: number) => (
    <tr>
      <td style={{ padding: '3px 12px 3px 0', color: LABEL_COLOR, fontSize: 11 }}>{label}</td>
      <td style={{
        padding: '3px 0',
        color: VALUE_COLOR,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        fontSize: 11,
        textAlign: 'right',
      }}>
        {fmt(deger)}
      </td>
    </tr>
  );

  return (
    <div style={{ padding: '4px 0', minWidth: 240, fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', gap: 18, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.10em',
            color: HEAD_COLOR,
            marginBottom: 4,
            textTransform: 'uppercase',
          }}>USD / TL</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {row('Döviz Alış', kur.usd.alis)}
              {row('Döviz Satış', kur.usd.satis)}
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.10em',
            color: HEAD_COLOR,
            marginBottom: 4,
            textTransform: 'uppercase',
          }}>EUR / TL</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {row('Döviz Alış', kur.eur.alis)}
              {row('Döviz Satış', kur.eur.satis)}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{
        borderTop: `1px solid ${SEP_COLOR}`,
        paddingTop: 6,
        marginTop: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        fontSize: 10.5,
        color: FAINT_COLOR,
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ fontWeight: 700, letterSpacing: '0.10em', color: HEAD_COLOR }}>TCMB</span>
        <span>
          {tarihGoster(kur.tarih)}
          {kur._cached && ' · cached'}
        </span>
      </div>
    </div>
  );
}

export default function KurKumandaSection() {
  const { kur, hata } = useKur();
  if (!kur && !hata) return null;
  const yok = !kur;

  return (
    <Popover
      content={<KurDetayContent kur={kur} />}
      placement="left"
      trigger="hover"
      mouseEnterDelay={0.25}
      mouseLeaveDelay={0.1}
      overlayInnerStyle={{
        // Kumanda Paneli tooltip diline uyumlu dark theme: TOOLTIP_COLOR
        // background + ince pembe border + biraz daha opak (içerikli olduğu
        // için 0.62 yerine 0.88).
        padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(18, 14, 22, 0.88)',
        border: '1px solid rgba(255, 178, 196, 0.18)',
        boxShadow:
          '0 8px 24px rgba(5, 0, 2, 0.45), 0 0 14px rgba(255, 112, 134, 0.06)',
        backdropFilter: 'blur(8px) saturate(1.05)',
        WebkitBackdropFilter: 'blur(8px) saturate(1.05)',
      }}
    >
      <div className="kp-kur-rozet">
        <div className="kp-kur-satir kp-kur-usd">
          <span className="kp-kur-simge" aria-hidden>$</span>
          <span className="kp-kur-cift">USD/TL</span>
          <span className="kp-kur-deger">{yok ? '—' : fmtCompact(kur!.usd.satis)}</span>
        </div>
        <span className="kp-kur-ayrac-yatay" aria-hidden />
        <div className="kp-kur-satir kp-kur-eur">
          <span className="kp-kur-simge" aria-hidden>€</span>
          <span className="kp-kur-cift">EUR/TL</span>
          <span className="kp-kur-deger">{yok ? '—' : fmtCompact(kur!.eur.satis)}</span>
        </div>
      </div>
    </Popover>
  );
}
