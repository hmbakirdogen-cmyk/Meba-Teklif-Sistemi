import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { teklifService } from '../services/teklifService';
import type { Teklif } from '../types';
import { useKullanici } from '../context/useKullanici';
import { useIsMobile } from '../hooks/useIsMobile';
import { useColors } from '../hooks/useColors';
import { computeYoneticiOzeti, YoneticiOzeti, SONUC_CFG, KAYIP_SEBEBI_LABEL } from './TeklifListesi';
import { useTheme } from '../context/useTheme';
import { formatDate, formatCariAdi } from '../utils/formatters';

/**
 * Yönetici Analiz Sayfası — sadece admin/super_admin/firma_admin için.
 * Tüm-ekip metriklerini tam genişlikte gösterir (win-rate, açık pipeline, funnel,
 * top kayıp sebepleri, en kazandıran personel).
 *
 * İleride (orta paket): dönem karşılaştırması, müşteri sağlık skoru,
 * aging report, Excel export buraya eklenir.
 */
export default function AnalizSayfasi() {
  const navigate = useNavigate();
  const { aktifKullanici } = useKullanici();
  const isMobile = useIsMobile(768);
  const C = useColors();

  const kullaniciCtx = useMemo(
    () => (aktifKullanici ? { id: aktifKullanici.id, rol: aktifKullanici.rol } : undefined),
    [aktifKullanici],
  );

  const [teklifler, setTeklifler] = useState<Teklif[]>(() =>
    teklifService.tumTeklifleriGetir(kullaniciCtx),
  );

  // Sayfa açıldığında sunucudan taze çek
  useEffect(() => {
    let aborted = false;
    teklifService.tekliferiYenile(kullaniciCtx).then(() => {
      if (!aborted) setTeklifler(teklifService.tumTeklifleriGetir(kullaniciCtx));
    });
    return () => { aborted = true; };
  }, [kullaniciCtx]);

  const ozet = useMemo(() => computeYoneticiOzeti(teklifler), [teklifler]);

  const wrapperStyle: CSSProperties = {
    padding: isMobile ? '10px 12px 48px' : '14px 32px 64px',
    maxWidth: 1160,
    margin: '0 auto',
    width: '100%',
  };

  const ilkAd = aktifKullanici?.adSoyad?.split(/\s+/)[0] ?? '';

  return (
    <div style={wrapperStyle}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/teklifler')}
          style={{ color: C.textSecondary, padding: '0 6px', height: 28 }}
        >
          Tekliflerim
        </Button>
        <span style={{ color: C.textFaint, fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, letterSpacing: '0.01em' }}>
          Analiz
        </span>
      </div>

      {/* Başlık */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          fontSize: isMobile ? 22 : 26, fontWeight: 700, color: C.textPrimary,
          letterSpacing: '-0.03em', lineHeight: 1.15,
        }}>
          Yönetici Analizi
        </div>
        <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6, fontWeight: 400, letterSpacing: '0.005em' }}>
          {ilkAd ? `${ilkAd}, ` : ''}ekip teklif performansının özeti.
        </div>
      </div>

      <YoneticiOzeti
        isMobile={isMobile}
        C={C}
        data={ozet}
        mode="panel"
      />

      <SonNotlarBlok teklifler={teklifler} isMobile={isMobile} C={C} />
    </div>
  );
}

// ─── Son Notlar Bloku — sonuçNotu girilmiş son tekliflerin akışı ────────────

interface SonNotlarBlokProps {
  teklifler: Teklif[];
  isMobile: boolean;
  C: ReturnType<typeof useColors>;
}

function SonNotlarBlok({ teklifler, isMobile, C }: SonNotlarBlokProps) {
  const { isDark } = useTheme();
  const cardBg = isDark ? '#161922' : '#F4F3EF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8';

  const notlar = useMemo(() => {
    return teklifler
      .filter((t) => t.sonucNotu && t.sonucNotu.trim().length > 0)
      .sort((a, b) => {
        const aT = new Date(a.sonucTarihi || a.guncellemeTarihi || a.tarih).getTime();
        const bT = new Date(b.sonucTarihi || b.guncellemeTarihi || b.tarih).getTime();
        return bT - aT;
      })
      .slice(0, 8);
  }, [teklifler]);

  if (notlar.length === 0) return null;

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 10,
      padding: isMobile ? 14 : 18,
      marginBottom: 22,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: C.textFaint,
          letterSpacing: '0.07em', textTransform: 'uppercase',
        }}>
          Son Notlar
        </div>
        <div style={{ fontSize: 11, color: C.textFaint }}>
          (personelin yöneticiye düştüğü notlar)
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notlar.map((t) => {
          const cfg = t.sonuc ? SONUC_CFG[t.sonuc] : null;
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px',
              background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
              border: `1px solid ${cardBorder}`,
              borderLeft: `3px solid ${cfg?.color || C.textFaint}`,
              borderRadius: 6,
            }}>
              {/* Sol: sonuç işareti + kaybedildi sebep */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 95, flexShrink: 0 }}>
                {cfg && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '1px 7px', borderRadius: 4,
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.15,
                    color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                  }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                )}
                {t.sonuc === 'kaybedildi' && t.kayipSebebi && (
                  <span style={{ fontSize: 10, color: C.textFaint }}>
                    {KAYIP_SEBEBI_LABEL[t.kayipSebebi]}
                    {t.rakipFirma ? ` · ${t.rakipFirma}` : ''}
                  </span>
                )}
              </div>

              {/* Orta: not + cari + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, color: C.textPrimary, lineHeight: 1.45,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {t.sonucNotu}
                </div>
                <div style={{
                  fontSize: 11, color: C.textFaint, marginTop: 6,
                  display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline',
                }}>
                  <span style={{ fontWeight: 500, color: C.textSecondary }}>
                    {t.teklifNo}
                  </span>
                  <span>·</span>
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: isMobile ? 160 : 280,
                  }}>
                    {formatCariAdi(t.cari?.firmaAdi || '')}
                  </span>
                  <span>·</span>
                  <span>{t.hazirlayanAdSoyad || '—'}</span>
                  <span>·</span>
                  <span>{formatDate(t.sonucTarihi || t.guncellemeTarihi || t.tarih)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
