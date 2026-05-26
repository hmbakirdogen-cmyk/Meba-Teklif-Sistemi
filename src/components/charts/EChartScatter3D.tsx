// ── EChartScatter3D ──────────────────────────────────────────────────
// NE: ECharts-GL scatter3D ile premium 3D dağılım grafiği — her nokta
//     üç boyutta yerleşir (X/Y/Z = farklı metrikler), renk ve boyut da
//     ek dimensiondan beslenir → 5 boyutlu performans matrisi.
//
// NEDEN: Mehmet Bey direktifi — elit 3D grafikler. Bar/pie kategori
//        karşılaştırması; scatter çoklu metrik dağılım gösterir. Örnek:
//        her personel = nokta, X=teklif sayısı, Y=onay %, Z=toplam
//        tutar. Yöneticiye "kimin verimliliği yüksek hacmiyle de
//        orantılı?" sorusuna görsel cevap.
//
// NASIL: 1) data: [{name, x, y, z, color?, size?}, ...].
//        2) Her noktanın label'ı persistent (her zaman görünür) —
//           personel adı küçük punto.
//        3) Tooltip Türkçe + tüm metrikler.
//        4) Premium ışıklandırma + glow + camera autoRotateAfterStill.

import { useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';

export interface Scatter3DPoint {
  name: string;
  x: number;
  y: number;
  z: number;
  /** Renk skalası için ek dimension (örn: yüzde) */
  colorValue?: number;
  /** Sembol boyutu için ek dimension (örn: tutar) */
  sizeValue?: number;
}

interface EChartScatter3DProps {
  data: Scatter3DPoint[];
  xAxisAdi: string;
  yAxisAdi: string;
  zAxisAdi: string;
  height?: number;
  title?: string;
  /** Renk skalası için colorRange — colorValue'ya uygulanır */
  colorRange?: [string, string];
  /** Min-max sembol boyutu */
  symbolSizeRange?: [number, number];
  isDark?: boolean;
}

export default function EChartScatter3D({
  data,
  xAxisAdi,
  yAxisAdi,
  zAxisAdi,
  height = 460,
  title,
  colorRange = ['#ef4444', '#22c55e'],
  symbolSizeRange = [12, 40],
  isDark = false,
}: EChartScatter3DProps) {
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
        formatter: (params: { value: number[]; name: string }) => {
          const [x, y, z, c, s] = params.value;
          return (
            `<b>${params.name}</b><br/>` +
            `${xAxisAdi}: <b>${x}</b><br/>` +
            `${yAxisAdi}: <b>${y}</b><br/>` +
            `${zAxisAdi}: <b>${z}</b>` +
            (c !== undefined ? `<br/>Renk: <b>${c.toFixed(1)}</b>` : '') +
            (s !== undefined ? `<br/>Hacim: <b>${s.toLocaleString('tr-TR')}</b>` : '')
          );
        },
      },
      visualMap: [
        {
          show: false,
          dimension: 3, // color value
          min: cMin,
          max: cMax,
          inRange: { color: colorRange },
        },
        {
          show: false,
          dimension: 4, // size value
          min: sMin,
          max: sMax,
          inRange: { symbolSize: symbolSizeRange },
        },
      ],
      xAxis3D: {
        type: 'value',
        name: xAxisAdi,
        nameTextStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
        axisLabel: { color: isDark ? '#94a3b8' : '#475569', fontSize: 10 },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
      },
      yAxis3D: {
        type: 'value',
        name: yAxisAdi,
        nameTextStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
        axisLabel: { color: isDark ? '#94a3b8' : '#475569', fontSize: 10 },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
      },
      zAxis3D: {
        type: 'value',
        name: zAxisAdi,
        nameTextStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
        axisLabel: { color: isDark ? '#94a3b8' : '#475569', fontSize: 10 },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
        splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0' } },
      },
      grid3D: {
        boxWidth: 180,
        boxDepth: 130,
        boxHeight: 100,
        light: {
          main: { intensity: 1.2, shadow: true, shadowQuality: 'high', alpha: 35, beta: 25 },
          ambient: { intensity: 0.4 },
        },
        viewControl: {
          projection: 'perspective',
          autoRotate: false,
          autoRotateAfterStill: 12,
          distance: 250,
          alpha: 20,
          beta: 35,
        },
        postEffect: {
          enable: true,
          bloom: { enable: true, bloomIntensity: 0.15 },
        },
      },
      series: [
        {
          type: 'scatter3D',
          data: data.map((d) => [d.x, d.y, d.z, d.colorValue ?? 0, d.sizeValue ?? 1, d.name]),
          symbol: 'circle',
          symbolSize: 20,
          itemStyle: {
            opacity: 0.92,
            borderWidth: 2,
            borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.3)',
          },
          label: {
            show: true,
            formatter: (p: { value: (string | number)[] }) => String(p.value[5] ?? ''),
            color: isDark ? '#f1f5f9' : '#0f172a',
            fontSize: 11,
            fontWeight: 600,
            textBorderColor: isDark ? '#0f172a' : '#ffffff',
            textBorderWidth: 2,
          },
          emphasis: {
            itemStyle: {
              opacity: 1,
              borderWidth: 3,
              borderColor: '#fbbf24',
            },
            label: { fontSize: 13, fontWeight: 800 },
          },
          animationDuration: 1500,
          animationEasing: 'cubicOut',
        },
      ],
    }),
    [
      data,
      xAxisAdi,
      yAxisAdi,
      zAxisAdi,
      title,
      colorRange,
      symbolSizeRange,
      isDark,
      cMin,
      cMax,
      sMin,
      sMax,
    ],
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
