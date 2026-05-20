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
import { useKur, kurDurumuHesapla, type KurDurumDetay } from '../hooks/useKur';

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
  durum: KurDurumDetay | null;
}

function KurDetayContent({ kur, durum }: KurDetayContentProps) {
  // Kumanda Paneli tooltip dili: koyu mor-siyah arkaplan + açık pembe-beyaz
  // text + pembe accent. KumandaPaneli.tsx içindeki diğer Tooltip'lerle
  // birebir aynı kasa.
  const LABEL_COLOR = 'rgba(255, 220, 215, 0.62)';
  const VALUE_COLOR = 'rgba(255, 232, 238, 0.95)';
  const HEAD_COLOR  = 'rgba(255, 178, 196, 0.92)';
  const FAINT_COLOR = 'rgba(255, 220, 215, 0.50)';
  const SEP_COLOR   = 'rgba(255, 178, 196, 0.18)';

  if (!kur) return <div style={{ padding: 12, color: FAINT_COLOR, fontSize: 11 }}>Yükleniyor…</div>;

  // Tek matris tablo: üstte ALIŞ/SATIŞ kolon başlıkları, solda USD/TL ve EUR/TL
  // satır başlıkları. Hücreler tek bakışta dört değeri verir; başlıklar
  // tekrarlanmaz, dikey/yatay simetri korunur.
  const pariteSatiri = (pariteEtiketi: string, alis: number, satis: number) => (
    <tr>
      <th scope="row" style={{
        padding: '2px 10px 2px 0',
        color: HEAD_COLOR,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textAlign: 'left',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}>{pariteEtiketi}</th>
      <td style={{
        padding: '2px 10px 2px 0',
        color: VALUE_COLOR,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        fontSize: 10,
        textAlign: 'right',
      }}>{fmt(alis)}</td>
      <td style={{
        padding: '2px 0 2px 10px',
        color: VALUE_COLOR,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        fontSize: 10,
        textAlign: 'right',
      }}>{fmt(satis)}</td>
    </tr>
  );

  return (
    <div style={{
      padding: '2px 0',
      width: 200,
      maxWidth: 200,
      fontFamily: 'var(--font-sans)',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <thead>
          <tr>
            <th style={{ padding: '0 10px 3px 0' }} aria-label="Parite" />
            <th style={{
              padding: '0 10px 3px 0',
              color: LABEL_COLOR,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textAlign: 'right',
              textTransform: 'uppercase',
            }}>Alış</th>
            <th style={{
              padding: '0 0 3px 10px',
              color: LABEL_COLOR,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textAlign: 'right',
              textTransform: 'uppercase',
            }}>Satış</th>
          </tr>
        </thead>
        <tbody>
          {pariteSatiri('USD / TL', kur.usd.alis, kur.usd.satis)}
          {pariteSatiri('EUR / TL', kur.eur.alis, kur.eur.satis)}
        </tbody>
      </table>
      <div style={{
        borderTop: `1px solid ${SEP_COLOR}`,
        paddingTop: 5,
        marginTop: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        fontSize: 10,
        color: FAINT_COLOR,
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ fontWeight: 700, letterSpacing: '0.10em', color: HEAD_COLOR }}>TCMB</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>{tarihGoster(kur.tarih)}</span>
          {durum && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '1px 5px',
                borderRadius: 5,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.03em',
                color: durum.renk,
                backgroundColor: `${durum.renk}22`,
                border: `1px solid ${durum.renk}55`,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: durum.renk,
                  boxShadow: `0 0 3px ${durum.renk}`,
                }}
              />
              {durum.etiket}
            </span>
          )}
        </span>
      </div>
      {durum && durum.seviye !== 'guncel' && (
        <div style={{
          marginTop: 5,
          paddingTop: 5,
          borderTop: `1px solid ${SEP_COLOR}`,
          fontSize: 9.5,
          color: FAINT_COLOR,
          lineHeight: 1.45,
          letterSpacing: '0.01em',
          // 200px container içinde 9.5px font ile doğal olarak 2-3 satıra
          // wrap olur (açıklama metinleri buna göre kısaltıldı: useKur.ts).
        }}>
          {durum.aciklama}
        </div>
      )}
    </div>
  );
}

export default function KurKumandaSection() {
  const { kur, hata } = useKur();
  if (!kur && !hata) return null;
  const yok = !kur;
  const durum = kur ? kurDurumuHesapla(kur.tarih, kur._cached) : null;

  return (
    <Popover
      content={<KurDetayContent kur={kur} durum={durum} />}
      placement="left"
      trigger="hover"
      mouseEnterDelay={0.25}
      mouseLeaveDelay={0.1}
      styles={{
        container: {
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
        },
      }}
    >
      <div className="kp-kur-rozet" style={{ position: 'relative' }}>
        {durum && (
          <span
            aria-label={`Kur durumu: ${durum.etiket}`}
            title={`${durum.etiket} — ${durum.aciklama}`}
            style={{
              position: 'absolute',
              top: 'calc(5px * var(--panel-scale))',
              right: 'calc(6px * var(--panel-scale))',
              width: 'calc(7px * var(--panel-scale))',
              height: 'calc(7px * var(--panel-scale))',
              borderRadius: '50%',
              backgroundColor: durum.renk,
              // Soft outer glow — durum rengiyle aynı, gözden kaçmasın diye
              // hafif vurgu; "guncel" yeşilde de hoş bir akıcılık verir.
              boxShadow: `0 0 0 1.5px rgba(0, 0, 0, 0.35), 0 0 6px ${durum.renk}aa`,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        )}
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
