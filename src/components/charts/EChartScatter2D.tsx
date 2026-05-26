// ── EChartScatter2D ──────────────────────────────────────────────────
// NE: Premium 2D scatter chart wrapper'ı — X/Y düzlemde noktalar, renk
//     ve boyut ek dimension'lara bağlanır (4 metrik tek görselde).
//
// NEDEN: Mehmet Bey 2026-05-26 — 3D scatter yavaş+hatalı, kullanıcı
//        deneyimi kötü. 2D scatter ile gerçek 4 boyut (X, Y, renk
//        gradient, sembol boyutu) korunur; performans artar, mobile'da
//        sorunsuz çalışır.
//
// NASIL: 1) data: Scatter2DPoint[] — aynı Scatter3DPoint formatı
//           (z opsiyonel — tooltip'te gösterilir, eksende değil)
//        2) visualMap: renk colorValue'ya, boyut sizeValue'ya bağlı
//        3) Persistent label (her noktada nokta adı)
//        4) Emphasis: scale + glow

import { useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

export interface Scatter2DPoint {
  name: string;
  x: number;
  y: number;
  /** İsteğe bağlı 3. dimension — tooltip'te gösterilir */
  z?: number;
  /** Renk skalası için ek dimension */
  colorValue?: number;
  /** Sembol boyutu için ek dimension */
  sizeValue?: number;
}

interface EChartScatter2DProps {
  data: Scatter2DPoint[];
  xAxisAdi: string;
  yAxisAdi: string;
  /** Z (3.) eksen ETİKETİ — sadece tooltip'te gösterilir */
  zAxisAdi?: string;
  height?: number;
  title?: string;
  colorRange?: [string, string];
  symbolSizeRange?: [number, number];
  isDark?: boolean;
}

export default function EChartScatter2D({
  data,
  xAxisAdi,
  yAxisAdi,
  zAxisAdi,
  height = 420,
  title,
  colorRange = ['#ef4444', '#22c55e'],
  symbolSizeRange = [12, 42],
  isDark = false,
}: EChartScatter2DProps) {
  const chartRef = useRef<ReactECharts | null>(null);

  const [cMin, cMax] = useMemo(() => {
    const vals = data.map((d) => d.colorValue ?? 0);
    if (vals.length === 0) return [0, 1];
    return [Math.min(...vals), Math.max(...vals)];
  }, [data]);

  const [sMin, sMax] = useMemo(() => {
    const vals = data.map((d) => d.sizeValue ?? 0);
    if (vals.length === 0) return [0, 1];
    return [Math.min(...vals), Math.max(...vals)];
  }, [data]);

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
        backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? 'rgba(91,141,239,0.4)' : 'rgba(91,141,239,0.3)',
        borderWidth: 1,
        textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12 },
        formatter: (params: { value: (string | number)[]; name: string }) => {
          const [x, y, z, c, s, ad] = params.value;
          return (
            `<b>${ad}</b><br/>` +
            `${xAxisAdi}: <b>${x}</b><br/>` +
            `${yAxisAdi}: <b>${y}</b>` +
            (zAxisAdi && z !== undefined ? `<br/>${zAxisAdi}: <b>${z}</b>` : '') +
            (typeof c === 'number' ? `<br/>Renk: <b>${c.toFixed(1)}</b>` : '') +
            (typeof s === 'number' ? `<br/>Hacim: <b>${s.toLocaleString('tr-TR')}</b>` : '')
          );
        },
      },
      visualMap: [
        {
          show: false,
          dimension: 3,
          min: cMin,
          max: cMax,
          inRange: { color: colorRange },
        },
        {
          show: false,
          dimension: 4,
          min: sMin,
          max: sMax,
          inRange: { symbolSize: symbolSizeRange },
        },
      ],
      grid: {
        top: title ? 48 : 24,
        bottom: 56,
        left: 64,
        right: 28,
      },
      xAxis: {
        type: 'value',
        name: xAxisAdi,
        nameTextStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
        axisLabel: { color: isDark ? '#94a3b8' : '#475569', fontSize: 10 },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
        splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0', type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: yAxisAdi,
        nameTextStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
        axisLabel: { color: isDark ? '#94a3b8' : '#475569', fontSize: 10 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0', type: 'dashed' } },
      },
      series: [
        {
          type: 'scatter',
          data: data.map((d) => [d.x, d.y, d.z ?? 0, d.colorValue ?? 0, d.sizeValue ?? 1, d.name]),
          symbol: 'circle',
          symbolSize: 22,
          itemStyle: {
            opacity: 0.92,
            borderWidth: 2,
            borderColor: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.85)',
            shadowBlur: 8,
            shadowColor: 'rgba(15,23,42,0.18)',
          },
          label: {
            show: true,
            position: 'top',
            formatter: (p: { value: (string | number)[] }) => String(p.value[5] ?? ''),
            color: isDark ? '#f1f5f9' : '#0f172a',
            fontSize: 11,
            fontWeight: 600,
            textBorderColor: isDark ? '#0f172a' : '#ffffff',
            textBorderWidth: 2,
          },
          emphasis: {
            scale: 1.4,
            itemStyle: {
              opacity: 1,
              borderWidth: 3,
              borderColor: '#fbbf24',
              shadowBlur: 24,
              shadowColor: '#fbbf24',
            },
            label: { fontSize: 13, fontWeight: 800 },
          },
          animationDuration: 1400,
          animationEasing: 'cubicOut',
        },
      ],
    }),
    [data, xAxisAdi, yAxisAdi, zAxisAdi, title, colorRange, symbolSizeRange, isDark, cMin, cMax, sMin, sMax],
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
