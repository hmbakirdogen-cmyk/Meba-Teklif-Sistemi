// ── EChartHeatmap2D ──────────────────────────────────────────────────
// NE: ECharts native 2D heatmap wrapper'ı. Personel × Hafta Günü gibi
//     matris değerlerini renk gradyanıyla görselleştirir.
//
// NEDEN: Mehmet Bey 2026-05-26 — "yöneticilere personel kullanım
//        istatistikleri, elit görsel grafikler". 3D bar/scatter/pie
//        zaten var; heatmap ısı haritası ile "kim ne gün aktif?"
//        sorusu tek bakışta cevaplanır. Düşük aktivite çukurları
//        koyu/soluk hücrelerle hemen göze çarpar.
//
// NASIL: 1) data: [[xIdx, yIdx, value], ...] formatı (ECharts heatmap)
//        2) xLabels + yLabels: eksen isimleri
//        3) Premium renk skalası (visualMap inRange) — gradient (soft
//           mavi → parlak yeşil), her hücreye uygulanır
//        4) Hücre boyutları otomatik; hover'da büyür + glow
//        5) Hücre etiketi: 0 değerler boş, >0 değerler beyaz number
//        6) Premium tema: gradient cell border, shadowBlur, smooth easing

import { useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

export interface HeatmapData {
  rows: Array<[number, number, number]>;
  xLabels: string[];
  yLabels: string[];
  valueRange?: [number, number];
}

interface EChartHeatmap2DProps {
  data: HeatmapData;
  height?: number;
  title?: string;
  valueAdi?: string;
  /** Renk skalası — düşük → yüksek (premium gradient) */
  colorRange?: string[];
  isDark?: boolean;
  /** Cell etiketi sıfır olunca göster veya gizle */
  sifirGoster?: boolean;
}

const PREMIUM_HEATMAP_COLORS = [
  '#0f172a', // çok düşük (koyu navy)
  '#1e3a8a', // mavi
  '#3b82f6', // mavi parlak
  '#06b6d4', // teal
  '#14b8a6', // yeşil-mavi
  '#22c55e', // yeşil
  '#84cc16', // limon
  '#fbbf24', // amber
  '#f59e0b', // turuncu-amber
];

export default function EChartHeatmap2D({
  data,
  height = 380,
  title,
  valueAdi = 'değer',
  colorRange = PREMIUM_HEATMAP_COLORS,
  isDark = false,
  sifirGoster = false,
}: EChartHeatmap2DProps) {
  const chartRef = useRef<ReactECharts | null>(null);

  const [vMin, vMax] = useMemo(() => {
    if (data.valueRange) return data.valueRange;
    if (data.rows.length === 0) return [0, 1];
    const vals = data.rows.map((r) => r[2]);
    return [Math.min(0, ...vals), Math.max(...vals)];
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
        position: 'top',
        backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? 'rgba(91,141,239,0.4)' : 'rgba(91,141,239,0.3)',
        borderWidth: 1,
        textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12 },
        formatter: (params: { value: [number, number, number] }) => {
          const [xi, yi, v] = params.value;
          return `<b>${data.yLabels[yi] ?? '—'}</b><br/>${data.xLabels[xi] ?? '—'}: <b>${v}</b> ${valueAdi}`;
        },
      },
      grid: {
        top: title ? 60 : 32,
        bottom: 90,
        left: 130,
        right: 28,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: data.xLabels,
        splitArea: { show: true },
        axisLabel: {
          color: isDark ? '#cbd5e1' : '#475569',
          fontSize: 11,
          fontWeight: 600,
          interval: 0,
          rotate: data.xLabels.length > 6 ? 30 : 0,
        },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: data.yLabels,
        splitArea: { show: true },
        axisLabel: {
          color: isDark ? '#e2e8f0' : '#334155',
          fontSize: 11,
          fontWeight: 500,
        },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
        axisTick: { show: false },
      },
      visualMap: {
        min: vMin,
        max: vMax,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 14,
        itemHeight: 12,
        itemWidth: 220,
        text: ['yoğun', 'düşük'],
        textStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 },
        inRange: { color: colorRange },
      },
      series: [
        {
          name: valueAdi,
          type: 'heatmap',
          data: data.rows,
          label: {
            show: true,
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            formatter: (params: { value: [number, number, number] }) => {
              const v = params.value[2];
              if (!sifirGoster && v === 0) return '';
              return String(v);
            },
            textBorderColor: 'rgba(0,0,0,0.4)',
            textBorderWidth: 2,
          },
          itemStyle: {
            borderRadius: 4,
            borderColor: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.6)',
            borderWidth: 2,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 18,
              shadowColor: isDark ? 'rgba(91,141,239,0.65)' : 'rgba(15,23,42,0.45)',
              borderWidth: 3,
              borderColor: '#fbbf24',
            },
            label: { fontSize: 14, fontWeight: 800 },
          },
          animationDuration: 1400,
          animationEasing: 'cubicOut',
          progressive: 0,
        },
      ],
    }),
    [data, title, valueAdi, colorRange, isDark, vMin, vMax, sifirGoster],
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
