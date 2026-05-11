import React from 'react';
import type { TeklifDurum } from '../types';
import { useTheme } from '../context/useTheme';
import { useColors } from '../hooks/useColors';
import { KAYIP_SEBEBI_LABEL, type YoneticiOzetiData } from '../pages/teklifListesiShared';

interface YoneticiOzetiProps {
  isMobile: boolean;
  C: ReturnType<typeof useColors>;
  data: YoneticiOzetiData;
  /** 'serit' = tek satır kompakt (Tekliflerim sayfası); 'panel' = tam görünüm (Analiz sayfası) */
  mode?: 'serit' | 'panel';
  /** 'serit' modunda tıklamada çağrılır (varsayılan: yok). */
  onDetay?: () => void;
}

export function YoneticiOzeti({ isMobile, C, data, mode = 'serit', onDetay }: YoneticiOzetiProps) {
  const { isDark } = useTheme();
  const cardBg = isDark ? '#161922' : '#F4F3EF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.04)' : '#E3DFD8';
  const sectionBg = isDark ? '#161922' : '#F4F3EF';

  const formatTRY = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
  const formatKisa = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
    return formatTRY(n);
  };

  const funnelSteps: Array<{ key: TeklifDurum; label: string; color: string }> = [
    { key: 'taslak',     label: 'Taslak',      color: '#94a3b8' },
    { key: 'hazir',      label: 'Hazır',       color: '#3b82f6' },
    { key: 'gonderildi', label: 'Gönderildi',  color: '#f59e0b' },
    { key: 'onaylandi',  label: 'Onaylandı',   color: '#16a34a' },
  ];
  const kazanildi = data.sonucSayim.kazanildi;

  // ── ŞERİT MODU ─────────────────────────────────────────────────────────────
  if (mode === 'serit') {
    const pipelineSeg = (['TRY', 'EUR', 'USD'] as const)
      .filter((pb) => (data.acikPipeline[pb] || 0) > 0)
      .map((pb) => {
        const sym = pb === 'TRY' ? '₺' : pb === 'EUR' ? '€' : '$';
        return `${sym}${formatKisa(data.acikPipeline[pb])}`;
      })
      .join(' · ');

    const funnelMini = funnelSteps.map((s) => data.funnel[s.key]).join('›');

    return (
      <button
        onClick={() => onDetay?.()}
        style={{
          width: '100%',
          background: sectionBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 10,
          padding: isMobile ? '10px 14px' : '11px 16px',
          marginBottom: 22,
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 10 : 14,
          cursor: 'pointer',
          textAlign: 'left',
          color: 'inherit',
          transition: 'border-color 0.14s, box-shadow 0.14s',
          flexWrap: 'wrap',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#D7D3CC';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = cardBorder;
        }}
      >
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: C.textFaint,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          Yönetici Özeti
        </span>

        <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: C.textFaint, letterSpacing: '0.02em' }}>Win-rate</span>
          <span style={{
            fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
            color: data.winRate === null ? C.textFaint : data.winRate >= 50 ? '#16a34a' : '#dc2626',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {data.winRate === null ? '—' : `%${data.winRate}`}
          </span>
        </span>

        {pipelineSeg && (
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: C.textFaint, letterSpacing: '0.02em' }}>Pipeline</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
              {pipelineSeg}
            </span>
          </span>
        )}

        {!isMobile && (
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: C.textFaint, letterSpacing: '0.02em' }}>Funnel</span>
            <span style={{ fontSize: 13, color: C.textSecondary, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em', fontWeight: 600 }}>
              {funnelMini}
            </span>
          </span>
        )}

        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
            ✓ {kazanildi}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
            ✕ {data.sonucSayim.kaybedildi}
          </span>
        </span>

        <span style={{ flex: 1 }} />

        <span style={{
          fontSize: 11, color: C.textSecondary, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 3,
          flexShrink: 0,
        }}>
          Detay <span style={{ fontSize: 14 }}>›</span>
        </span>
      </button>
    );
  }

  // ── PANEL MODU (Analiz sayfası) ────────────────────────────────────────────
  return (
    <div style={{
      background: sectionBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 10,
      padding: isMobile ? 14 : 18,
      marginBottom: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>

      {/* Top metrik satırı: Win-rate + Pipeline */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 2fr)',
        gap: 14,
      }}>
        {/* Win-rate */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: C.textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
            Win-rate
          </div>
          <div style={{
            fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05,
            color: data.winRate === null ? C.textFaint : data.winRate >= 50 ? '#16a34a' : '#dc2626',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {data.winRate === null ? '—' : `%${data.winRate}`}
          </div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
            {kazanildi} kazanıldı / {data.kararliToplam} kararlı
          </div>
        </div>

        {/* Açık pipeline */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: C.textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
            Açık pipeline (sonuç bekleyen)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 12 : 24, alignItems: 'baseline' }}>
            {(['TRY', 'EUR', 'USD'] as const).map((pb) => {
              const v = data.acikPipeline[pb] || 0;
              if (v === 0) return null;
              const sym = pb === 'TRY' ? '₺' : pb === 'EUR' ? '€' : '$';
              return (
                <div key={pb}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {sym}{formatTRY(v)}
                  </span>
                  <span style={{ fontSize: 11, color: C.textFaint, marginLeft: 4 }}>{pb}</span>
                </div>
              );
            })}
            {(['TRY','EUR','USD'] as const).every((pb) => (data.acikPipeline[pb] || 0) === 0) && (
              <span style={{ fontSize: 14, color: C.textFaint }}>—</span>
            )}
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 500, color: C.textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
          Funnel
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, flexWrap: 'wrap' }}>
          {funnelSteps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderLeft: `3px solid ${s.color}`,
                borderRadius: 6,
                padding: '8px 12px',
                minWidth: 88,
                flex: 1,
              }}>
                <div style={{ fontSize: 10, color: C.textFaint, fontWeight: 500, letterSpacing: '0.03em' }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {data.funnel[s.key]}
                </div>
              </div>
              {i < funnelSteps.length - 1 && !isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', color: C.textFaint, fontSize: 14 }}>›</div>
              )}
            </React.Fragment>
          ))}
          {/* Kazanıldı (kapanan) */}
          <div style={{ display: 'flex', alignItems: 'center', color: C.textFaint, fontSize: 14 }}>{!isMobile && '›'}</div>
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderLeft: '3px solid #16a34a',
            borderRadius: 6,
            padding: '8px 12px',
            minWidth: 88,
            flex: 1,
          }}>
            <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600, letterSpacing: '0.03em' }}>✓ Kazanıldı</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#065f46', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {kazanildi}
            </div>
          </div>
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderLeft: '3px solid #dc2626',
            borderRadius: 6,
            padding: '8px 12px',
            minWidth: 88,
            flex: 1,
          }}>
            <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, letterSpacing: '0.03em' }}>✕ Kaybedildi</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#7f1d1d', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {data.sonucSayim.kaybedildi}
            </div>
          </div>
        </div>
      </div>

      {/* Top kayıp sebebi + Top personel — yan yana */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 14,
      }}>
        {/* Kayıp sebepleri */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: C.textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            En çok kaybedilen sebep
          </div>
          {data.topSebepler.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textFaint }}>Henüz kayıp sebebi girilmemiş.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.topSebepler.map(([sebep, n], i) => (
                <div key={sebep} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 4,
                      background: i === 0 ? '#fee2e2' : i === 1 ? '#fef3c7' : '#f1f5f9',
                      color: i === 0 ? '#b91c1c' : i === 1 ? '#a16207' : '#475569',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
                      {KAYIP_SEBEBI_LABEL[sebep]}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: C.textSecondary, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {n} kayıp
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personel leaderboard */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: C.textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            En çok kazandıran personel
          </div>
          {data.topPersonel.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textFaint }}>Henüz kazandığı teklif girilmemiş.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.topPersonel.map((p, i) => (
                <div key={p.ad} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 4,
                      background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : '#f5f5f4',
                      color: i === 0 ? '#a16207' : '#475569',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{
                      fontSize: 13, color: C.textPrimary, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.ad}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#16a34a', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {p.kazanildi} kazan
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
