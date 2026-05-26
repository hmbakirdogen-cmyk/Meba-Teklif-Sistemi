// ── EChartBar2D ──────────────────────────────────────────────────────
// NE: Premium 2D gruplandırılmış bar chart wrapper'ı. X kategori (örn:
//     personel), Y değer (örn: teklif sayısı), her seri ayrı renkli bar.
//
// NEDEN: Mehmet Bey 2026-05-26 — 3D bar yavaş+hatalı (echarts-gl WebGL).
//        2D bar çok daha hızlı + her tarayıcıda sorunsuz çalışır;
//        gradient fill + glow + smooth animation ile premium görünüm
//        korunur. echarts-gl bağımlılığı kalkar (~600KB bundle düşer).
//
// NASIL: 1) data: {rows: [[xIdx, yIdx, value]], xLabels, yLabels}
//           Aynı Bar3DData formatı — sayfa kodu değişmez
//        2) Her yLabel ayrı seri → grouped bar (x ekseninde yan yana)
//        3) Premium tema: linear gradient fill, borderRadius top,
//           emphasis büyüme + glow
//        4) Tooltip çoklu seri axisPointer + çapraz crosshair

import { useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

export interface Bar2DData {
  /** [xIndex, yIndex, value] satırları */
  rows: Array<[number, number, number]>;
  xLabels: string[];
  yLabels: string[];
}

interface EChartBar2DProps {
  data: Bar2DData;
  height?: number;
  title?: string;
  valueAdi?: string;
  /** Her yLabel için renk (yoksa default palette) */
  seriColors?: string[];
  isDark?: boolean;
}

const PREMIUM_PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

// Hex rengini açma/koyulaştırma — gradient stop'lar için.
// faktör 0-1 arası: lighten 0.3 → %30 açık, darken 0.25 → %25 koyu.
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function lightenColor(hex: string, faktor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * faktor, g + (255 - g) * faktor, b + (255 - b) * faktor);
}
function darkenColor(hex: string, faktor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - faktor), g * (1 - faktor), b * (1 - faktor));
}

export default function EChartBar2D({
  data,
  height = 380,
  title,
  valueAdi = 'değer',
  seriColors = PREMIUM_PALETTE,
  isDark = false,
}: EChartBar2DProps) {
  const chartRef = useRef<ReactECharts | null>(null);

  // rows'u yLabels'a göre serilerle grupla — her yLabel ayrı bar serisi
  const seriler = useMemo(() => {
    return data.yLabels.map((yLabel, yi) => {
      // Her xLabel için value array'i — eksik veri 0 olarak doldurulur
      const values = data.xLabels.map((_, xi) => {
        const row = data.rows.find((r) => r[0] === xi && r[1] === yi);
        return row ? row[2] : 0;
      });
      const c = seriColors[yi % seriColors.length];
      return {
        name: yLabel,
        type: 'bar',
        data: values,
        itemStyle: {
          // Premium 3D-vari kabarık görünüm — üstte parlak highlight,
          // ortada ana renk, altta koyu gölge (light source yukarıdan).
          // Mehmet Bey direktifi: "çubukların bireysel 3D görünümleri".
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: lightenColor(c, 0.3) }, // üst parlak
              { offset: 0.45, color: c },                  // orta ana renk
              { offset: 1, color: darkenColor(c, 0.25) },  // alt koyu
            ],
          },
          borderRadius: [8, 8, 2, 2],
          borderColor: lightenColor(c, 0.5),
          borderWidth: 1,
          // Çift katmanlı shadow — depth illusion
          shadowBlur: 14,
          shadowColor: `${c}66`,
          shadowOffsetY: 4,
          shadowOffsetX: 1,
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 16,
            shadowColor: c,
            borderColor: '#fbbf24',
            borderWidth: 2,
          },
        },
        animationDuration: 1200,
        animationEasing: 'cubicOut',
        animationDelay: (idx: number) => idx * 40,
      };
    });
  }, [data, seriColors]);

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
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? 'rgba(91,141,239,0.4)' : 'rgba(91,141,239,0.3)',
        borderWidth: 1,
        textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12 },
      },
      legend: {
        bottom: 8,
        left: 'center',
        itemWidth: 14,
        itemHeight: 10,
        itemGap: 16,
        textStyle: { color: isDark ? '#cbd5e1' : '#334155', fontSize: 11.5, fontWeight: 600 },
      },
      grid: {
        top: title ? 48 : 24,
        bottom: 64,
        left: 56,
        right: 28,
      },
      xAxis: {
        type: 'category',
        data: data.xLabels,
        axisLabel: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 11,
          fontWeight: 500,
          interval: 0,
          rotate: data.xLabels.length > 6 ? 25 : 0,
        },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: valueAdi,
        nameTextStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
        axisLabel: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 10,
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0', type: 'dashed' } },
      },
      series: seriler,
    }),
    [data, title, valueAdi, seriler, isDark],
  );

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
