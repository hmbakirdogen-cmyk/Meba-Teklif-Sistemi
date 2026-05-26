// ── EChartPie3D ──────────────────────────────────────────────────────
// NE: ECharts roseType pie ile premium "faux 3D" donut chart. ECharts-GL
//     gerçek pie3D sunmaz; bunun yerine roseType=area, radial gradient,
//     emphasis scale + glow ve smooth animation ile elit görünüm verir.
//
// NEDEN: Mehmet Bey 2026-05-26 — "elit 3D" direktifi. Donut + Nightingale
//        rose (roseType) ile parça kalınlıkları değere göre değişir →
//        derinlik hissi yaratır. Hover'da parça büyür + parlar (lift
//        efekti) → 3D his.
//
// NASIL: 1) data: {name, value} array.
//        2) roseType='area' → her parçanın radius'u value'ya göre.
//        3) itemStyle: borderRadius + borderColor (segment ayırıcı) +
//           shadowBlur (premium glow).
//        4) emphasis: scale 1.08 + shadow + label show big.
//        5) startAngle + animationDuration ile rotasyon girişi.
//        6) Color palette: premium 8 renk (Linear/Vercel tarzı).

import { useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

export interface PieData {
  name: string;
  value: number;
}

interface EChartPie3DProps {
  data: PieData[];
  height?: number;
  title?: string;
  /** Tooltip içinde value adı — örn: "teklif", "%" */
  valueAdi?: string;
  /** Premium 8 renk palet (sırayla parçalara dağılır) */
  colors?: string[];
  /** Donut iç yarıçap oranı — 0.45 = klasik donut, 0 = full pie */
  innerRadius?: number;
  /** roseType: 'area' (value'ya göre radius, premium) veya null */
  roseMode?: 'area' | null;
  isDark?: boolean;
}

const PREMIUM_PALETTE = [
  '#3b82f6', // mavi
  '#22c55e', // yeşil
  '#f59e0b', // amber
  '#a855f7', // mor
  '#ef4444', // kırmızı
  '#06b6d4', // teal
  '#ec4899', // pembe
  '#10b981', // emerald
];

export default function EChartPie3D({
  data,
  height = 360,
  title,
  valueAdi = 'adet',
  colors = PREMIUM_PALETTE,
  innerRadius = 0.45,
  roseMode = 'area',
  isDark = false,
}: EChartPie3DProps) {
  const chartRef = useRef<ReactECharts | null>(null);

  const toplam = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      title: title
        ? {
            text: title,
            left: 'center',
            top: 8,
            textStyle: {
              color: isDark ? '#e2e8f0' : '#1e293b',
              fontSize: 14,
              fontWeight: 700,
            },
          }
        : undefined,
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? 'rgba(91,141,239,0.4)' : 'rgba(91,141,239,0.3)',
        borderWidth: 1,
        textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12 },
        formatter: (params: { name: string; value: number; percent: number }) =>
          `<b>${params.name}</b><br/>${params.value} ${valueAdi} · %${params.percent.toFixed(1)}`,
      },
      legend: {
        bottom: 8,
        left: 'center',
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 14,
        textStyle: { color: isDark ? '#cbd5e1' : '#334155', fontSize: 11.5 },
      },
      color: colors,
      series: [
        {
          name: 'Dağılım',
          type: 'pie',
          radius: [innerRadius ? `${Math.round(innerRadius * 100)}%` : '0%', '78%'],
          center: ['50%', '46%'],
          roseType: roseMode ?? undefined,
          avoidLabelOverlap: true,
          startAngle: 90,
          itemStyle: {
            borderRadius: 8,
            borderColor: isDark ? '#0f172a' : '#ffffff',
            borderWidth: 2,
            shadowBlur: 14,
            shadowColor: isDark ? 'rgba(91,141,239,0.35)' : 'rgba(15,23,42,0.18)',
          },
          label: {
            show: true,
            formatter: '{b|{b}}\n{c|{c} ({d}%)}',
            rich: {
              b: {
                color: isDark ? '#e2e8f0' : '#0f172a',
                fontWeight: 700,
                fontSize: 12.5,
                lineHeight: 18,
              },
              c: {
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: 11,
                fontFamily: 'var(--font-mono, monospace)',
              },
            },
          },
          labelLine: {
            length: 12,
            length2: 14,
            smooth: true,
            lineStyle: {
              color: isDark ? '#475569' : '#94a3b8',
              width: 1,
            },
          },
          emphasis: {
            scale: true,
            scaleSize: 12,
            itemStyle: {
              shadowBlur: 28,
              shadowColor: isDark ? 'rgba(91,141,239,0.65)' : 'rgba(15,23,42,0.35)',
              borderWidth: 3,
            },
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 800,
            },
          },
          data,
          animationType: 'expansion',
          animationDuration: 1300,
          animationEasing: 'cubicOut',
        },
      ],
      graphic:
        toplam > 0 && innerRadius >= 0.4
          ? [
              {
                type: 'text',
                left: 'center',
                top: '40%',
                style: {
                  text: String(toplam),
                  fontSize: 32,
                  fontWeight: 800,
                  fill: isDark ? '#f1f5f9' : '#0f172a',
                  fontFamily: 'var(--font-display, sans-serif)',
                },
              },
              {
                type: 'text',
                left: 'center',
                top: '52%',
                style: {
                  text: valueAdi.toUpperCase(),
                  fontSize: 10,
                  fontWeight: 600,
                  fill: isDark ? '#94a3b8' : '#64748b',
                  letterSpacing: 1.2,
                },
              },
            ]
          : [],
    }),
    [data, title, valueAdi, colors, innerRadius, roseMode, isDark, toplam],
  );

  useEffect(() => {
    const ref = chartRef.current;
    return () => {
      try {
        ref?.getEchartsInstance().dispose();
      } catch {
        /* sessizce geç */
      }
    };
  }, []);

  return (
    <ReactECharts
      ref={chartRef}
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge
      lazyUpdate
    />
  );
}
