// ── EChartBar3D ──────────────────────────────────────────────────────
// NE: ECharts + echarts-gl ile premium 3D bar chart wrapper'ı. Üç eksen
//     (X: kategori-1, Y: kategori-2, Z: değer) ve realistic shading + glow
//     + perspective kamera ile "elit" görünüm sunar.
//
// NEDEN: Mehmet Bey 2026-05-26 direktifi — "yöneticilere personel
//        kullanım istatistikleri eklemeni istiyorum, en kuvvetli görseli
//        olan grafiklerle, elit seviyede 3D olarak". 2D bar/line yetmiyor;
//        gerçek 3D bar derinlik + ışıklandırma + döndürme kabiliyeti
//        veriyor. Bu wrapper Faz 8a-c boyunca her 3D bar grafiği için
//        tek noktadan stil/tema kontrolü sağlar.
//
// NASIL: 1) data: [[xIdx, yIdx, value], ...] formatı (ECharts bar3D).
//        2) xLabels + yLabels: kategori isimleri.
//        3) Otomatik renk skalası value'ya göre (visualMap).
//        4) Premium glow + realisticMaterial + ambient + main light.
//        5) Perspective projection + autoRotate opsiyonu.
//        6) Dark/light tema desteği (background transparan, parent
//           Card'ın rengini bozmaz).

import { useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';

export interface Bar3DData {
  /** [xIndex, yIndex, value] satırları */
  rows: Array<[number, number, number]>;
  xLabels: string[];
  yLabels: string[];
  /** Min/max renk skalası — yoksa value aralığından türetilir */
  valueRange?: [number, number];
}

interface EChartBar3DProps {
  data: Bar3DData;
  /** Yükseklik — Card içinde tipik 360-420 px */
  height?: number;
  /** Grafiğin başlığı (Card title varsa boş bırakın) */
  title?: string;
  /** Tooltip içinde value adı — örn: "teklif sayısı" */
  valueAdi?: string;
  /** Premium gradient renk seti — value'ya göre interpolasyon */
  colorRange?: [string, string];
  /** Otomatik rotasyon — premium akıcı his */
  autoRotate?: boolean;
  /** Dark tema (Card arka plan koyu ise) */
  isDark?: boolean;
}

export default function EChartBar3D({
  data,
  height = 400,
  title,
  valueAdi = 'değer',
  colorRange = ['#3b82f6', '#22c55e'],
  autoRotate = false,
  isDark = false,
}: EChartBar3DProps) {
  const chartRef = useRef<ReactECharts | null>(null);

  // Value aralığı — visualMap için
  const [vMin, vMax] = useMemo(() => {
    if (data.valueRange) return data.valueRange;
    if (data.rows.length === 0) return [0, 1];
    const vals = data.rows.map((r) => r[2]);
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
              fontFamily: 'inherit',
            },
          }
        : undefined,
      tooltip: {
        backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? 'rgba(91,141,239,0.4)' : 'rgba(91,141,239,0.3)',
        borderWidth: 1,
        textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12 },
        formatter: (params: { value: [number, number, number] }) => {
          const [xi, yi, v] = params.value;
          return `<b>${data.xLabels[xi] ?? '—'}</b><br/>${data.yLabels[yi] ?? '—'}: <b>${v}</b> ${valueAdi}`;
        },
      },
      visualMap: {
        show: false,
        dimension: 2,
        min: vMin,
        max: vMax,
        inRange: { color: colorRange },
      },
      xAxis3D: {
        type: 'category',
        data: data.xLabels,
        axisLabel: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 11,
          interval: 0,
          rotate: data.xLabels.length > 6 ? 25 : 0,
        },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
      },
      yAxis3D: {
        type: 'category',
        data: data.yLabels,
        axisLabel: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
      },
      zAxis3D: {
        type: 'value',
        axisLabel: { color: isDark ? '#94a3b8' : '#475569', fontSize: 10 },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#cbd5e1' } },
        splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0' } },
      },
      grid3D: {
        boxWidth: 180,
        boxDepth: 90,
        boxHeight: 80,
        environment: isDark
          ? 'auto' // simple dark gradient
          : '#fafafa',
        light: {
          main: {
            intensity: 1.4,
            shadow: true,
            shadowQuality: 'high',
            alpha: 35,
            beta: 25,
          },
          ambient: {
            intensity: 0.35,
          },
        },
        viewControl: {
          projection: 'perspective',
          autoRotate,
          autoRotateSpeed: 6,
          autoRotateAfterStill: 8,
          distance: 230,
          alpha: 25,
          beta: 30,
          minDistance: 130,
          maxDistance: 350,
        },
        postEffect: {
          enable: true,
          bloom: { enable: true, bloomIntensity: 0.12 },
          SSAO: { enable: true, quality: 'medium', radius: 2.5, intensity: 1.2 },
        },
      },
      series: [
        {
          type: 'bar3D',
          data: data.rows,
          shading: 'realistic',
          realisticMaterial: {
            roughness: 0.45,
            metalness: 0.25,
            textureTiling: 1,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
            },
            itemStyle: {
              color: '#fbbf24',
            },
          },
          animationDuration: 1400,
          animationEasing: 'cubicOut',
        },
      ],
    }),
    [data, title, valueAdi, colorRange, autoRotate, isDark, vMin, vMax],
  );

  // Component unmount'ta ECharts instance temizliği — memory leak guard
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
