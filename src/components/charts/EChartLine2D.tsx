// ── EChartLine2D ─────────────────────────────────────────────────────
// NE: ECharts premium line chart wrapper'ı. Çoklu seri desteği +
//     gradient area fill + smooth line + parlak marker'lar.
//
// NEDEN: Mehmet Bey direktifi — "tüm mevcut grafikleri elit seviyeye
//        çek". MalzemeHareketleri eski SVG line chart bu component ile
//        değiştirilir; ileride başka zaman serisi grafikleri (örn.
//        aylık ciro trend, müşteri sayısı vs.) da bu wrapper'a düşer.
//
// NASIL: 1) series: Array<{ name, points: [x, y], color? }>
//           - x = number (timestamp veya kategori indeksi)
//           - y = number (değer)
//        2) xType: 'time' (otomatik tarih formatla) veya 'value'
//        3) Her seriye gradient area + smooth line + emphasis büyür marker
//        4) Tooltip Türkçe çoklu seri (axisPointer cross)
//        5) Legend bottom + renkli chip

import { useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

export interface SeriPoint {
  /** X değeri — timestamp (xType='time') veya numeric (xType='value') */
  x: number;
  /** Y değeri */
  y: number;
  /** Tooltip için ek bilgi (örn: müşteri adı) — opsiyonel */
  ekBilgi?: string;
}

export interface ChartSeri {
  ad: string;
  renk?: string;
  noktalar: SeriPoint[];
}

interface EChartLine2DProps {
  seriler: ChartSeri[];
  xType?: 'time' | 'value' | 'category';
  /** category mode için kategori isimleri */
  xKategoriler?: string[];
  xAdi?: string;
  yAdi?: string;
  height?: number;
  title?: string;
  /** Y ekseni formatter — sayıları Türkçe locale + para birimi vs. */
  yFormat?: (v: number) => string;
  /** Tooltip detay — params'lardan custom HTML üret */
  tooltipFormat?: (params: Array<{ seriesName: string; value: [number, number]; color: string }>) => string;
  isDark?: boolean;
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

export default function EChartLine2D({
  seriler,
  xType = 'value',
  xKategoriler,
  xAdi,
  yAdi,
  height = 320,
  title,
  yFormat,
  tooltipFormat,
  isDark = false,
}: EChartLine2DProps) {
  const chartRef = useRef<ReactECharts | null>(null);

  const option = useMemo(() => {
    const seriOptions = seriler.map((s, i) => {
      const c = s.renk ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      return {
        name: s.ad,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: s.noktalar.map((p) => [p.x, p.y]),
        itemStyle: {
          color: c,
          borderWidth: 2,
          borderColor: isDark ? '#0f172a' : '#ffffff',
        },
        lineStyle: {
          color: c,
          width: 2.2,
          shadowColor: c,
          shadowBlur: 8,
          shadowOffsetY: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${c}55` },
              { offset: 1, color: `${c}00` },
            ],
          },
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            symbolSize: 12,
            shadowBlur: 16,
            shadowColor: c,
            borderWidth: 3,
          },
        },
        animationDuration: 1400,
        animationEasing: 'cubicOut',
      };
    });

    return {
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
        trigger: 'axis',
        axisPointer: { type: 'cross', lineStyle: { type: 'dashed', color: isDark ? '#64748b' : '#94a3b8' } },
        backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? 'rgba(91,141,239,0.4)' : 'rgba(91,141,239,0.3)',
        borderWidth: 1,
        textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12 },
        formatter: tooltipFormat ?? undefined,
      },
      legend: {
        bottom: 8,
        left: 'center',
        itemWidth: 14,
        itemHeight: 8,
        itemGap: 18,
        textStyle: { color: isDark ? '#cbd5e1' : '#334155', fontSize: 11.5, fontWeight: 600 },
      },
      grid: {
        top: title ? 48 : 24,
        bottom: 56,
        left: 64,
        right: 28,
      },
      xAxis: {
        type: xType,
        name: xAdi,
        nameTextStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
        data: xType === 'category' ? xKategoriler : undefined,
        axisLabel: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 10,
          formatter:
            xType === 'time'
              ? (val: number) =>
                  new Date(val).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })
              : undefined,
        },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: yAdi,
        nameTextStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
        axisLabel: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 10,
          formatter: yFormat ?? ((v: number) => v.toLocaleString('tr-TR')),
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0', type: 'dashed' } },
      },
      series: seriOptions,
    };
  }, [seriler, xType, xKategoriler, xAdi, yAdi, title, yFormat, tooltipFormat, isDark]);

  useEffect(() => {
    const ref = chartRef.current;
    return () => {
      try {
        ref?.getEchartsInstance().dispose();
      } catch {
        /* sessiz */
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
