/**
 * CanliA4Belge.tsx
 * ─────────────────────────────────────────────────────────────────
 * Canlı düzenlenebilir A4 belge bileşeni.
 *
 * Görünür alan: BelgeInlineEditor (inline düzenleme destekli)
 * Gizli alanlar: TeklifSablonu (PDF pipeline için değiştirilmeden korunur)
 */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import TeklifSablonu, { KompaktAntet } from '../templates/TeklifSablonu';
import BelgeInlineEditor, { type EditingAlan } from './BelgeInlineEditor';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { DOC_INTERACTION } from '../design-system/documentTokens';
import type { Teklif, Cari, TeklifSatiri, TeklifDurum } from '../types';
import type { PanelModu } from '../hooks/useBelgeState';

// ── A4 ölçüleri ──
const A4_W_PX = 210 * (96 / 25.4);  // ~793.7

interface CanliA4BelgeProps {
  teklif: Teklif;
  panelModu: PanelModu;
  editingAlan: EditingAlan;
  onEditingAlanDegistir: (alan: EditingAlan) => void;
  // Cari
  onCariDegistir: (cari: Cari) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM') => void;
  // Ayarlar
  onTarihDegistir: (tarih: string) => void;
  onParaBirimiDegistir: (pb: string) => void;
  satirBazliParaBirimi: boolean;
  onSatirBazliDegistir: (aktif: boolean) => void;
  onDurumDegistir: (durum: TeklifDurum) => void;
  onKdvOraniDegistir: (oran: number) => void;
  onIskontoOraniDegistir: (oran: number) => void;
  onOdemeVadesiDegistir: (vade: string) => void;
  // Satırlar
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;
  // Notlar
  onNotlarDegistir: (notlar: string) => void;
  // Yeni teklif
  yeniTeklif?: boolean;
  // Ref'ler PDF pipeline için
  sablonRef: React.RefObject<HTMLDivElement | null>;
  kompaktHeaderRef: React.RefObject<HTMLDivElement | null>;
}

export default function CanliA4Belge({
  teklif,
  editingAlan,
  onEditingAlanDegistir,
  onCariDegistir,
  contactName,
  contactTitle,
  onContactNameDegistir,
  onContactTitleDegistir,
  onTarihDegistir,
  onParaBirimiDegistir,
  satirBazliParaBirimi,
  onSatirBazliDegistir,
  onDurumDegistir,
  onKdvOraniDegistir,
  onIskontoOraniDegistir,
  onOdemeVadesiDegistir,
  onSatirGuncelle,
  onSatirSil,
  onSatirEkle,
  onNotlarDegistir,
  yeniTeklif,
  sablonRef,
  kompaktHeaderRef,
}: CanliA4BelgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const totals = useMemo(
    () => hesaplamaMotoru.teklifToplamlariniHesapla({
      araToplam: teklif.araToplam,
      kdvOrani: teklif.kdvOrani,
      iskontoOrani: teklif.iskontoOrani ?? 0,
    }),
    [teklif.araToplam, teklif.kdvOrani, teklif.iskontoOrani],
  );

  // Ölçekleme
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(() => {
      const w = container.getBoundingClientRect().width;
      setScale(Math.min(1, w / A4_W_PX));
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // Belgenin dışına tıklama — düzenlemeyi kapat
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onEditingAlanDegistir(null);
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: '210mm', margin: '0 auto' }}>
      {/* Gizli ölçüm+render alanı — PDF pipeline için (TeklifSablonu değiştirilmeden) */}
      <div
        ref={sablonRef}
        aria-hidden
        style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', pointerEvents: 'none', colorScheme: 'light', background: '#fff' }}
      >
        <TeklifSablonu teklif={teklif} totals={totals} />
      </div>
      <div
        ref={kompaktHeaderRef}
        aria-hidden
        style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', pointerEvents: 'none', colorScheme: 'light', background: '#fff' }}
      >
        <KompaktAntet teklif={teklif} />
      </div>

      {/* Görünür belge — inline düzenleme destekli */}
      <div
        onClick={handleBackdropClick}
        style={{
          width: `${A4_W_PX * scale}px`,
          overflow: 'visible',
          flexShrink: 0,
          background: '#ffffff',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          boxShadow: '0 18px 44px rgba(15, 23, 42, 0.10)',
          borderRadius: 10,
        }}
      >
        <div style={{
          width: `${A4_W_PX}px`,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          background: '#ffffff',
          colorScheme: 'light',
        }}>
          <BelgeInlineEditor
            teklif={teklif}
            totals={totals}
            editingAlan={editingAlan}
            onEditingAlanDegistir={onEditingAlanDegistir}
            onCariDegistir={onCariDegistir}
            contactName={contactName}
            contactTitle={contactTitle}
            onContactNameDegistir={onContactNameDegistir}
            onContactTitleDegistir={onContactTitleDegistir}
            onTarihDegistir={onTarihDegistir}
            onParaBirimiDegistir={onParaBirimiDegistir}
            satirBazliParaBirimi={satirBazliParaBirimi}
            onSatirBazliDegistir={onSatirBazliDegistir}
            onDurumDegistir={onDurumDegistir}
            onKdvOraniDegistir={onKdvOraniDegistir}
            onIskontoOraniDegistir={onIskontoOraniDegistir}
            onOdemeVadesiDegistir={onOdemeVadesiDegistir}
            onSatirGuncelle={onSatirGuncelle}
            onSatirSil={onSatirSil}
            onSatirEkle={onSatirEkle}
            onNotlarDegistir={onNotlarDegistir}
            yeniTeklif={yeniTeklif}
          />
        </div>
      </div>

      {/* Hover stil kuralları */}
      <style>{`
        [data-alan="musteri"],
        [data-alan="ayarlar"],
        [data-alan="notlar"] {
          cursor: pointer;
          transition: outline 0.15s, background 0.15s;
        }
        [data-alan="musteri"]:hover,
        [data-alan="ayarlar"]:hover,
        [data-alan="notlar"]:hover {
          outline: 1.5px dashed ${DOC_INTERACTION.hoverBorder};
          background: ${DOC_INTERACTION.hoverBg};
        }
        [data-satir-id] {
          cursor: pointer;
          transition: outline 0.12s, background 0.12s;
        }
        [data-satir-id]:hover {
          outline: 1px solid ${DOC_INTERACTION.hoverBorder};
          outline-offset: -1px;
        }
        @media print {
          [data-alan], [data-satir-id] {
            outline: none !important;
            background: initial !important;
            cursor: default !important;
          }
        }
      `}</style>
    </div>
  );
}
