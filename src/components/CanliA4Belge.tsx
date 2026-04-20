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


// ── A4 ölçüleri ──
const A4_W_PX = 210 * (96 / 25.4);  // ~793.7

interface CanliA4BelgeProps {
  teklif: Teklif;
  editingAlan: EditingAlan;
  onEditingAlanDegistir: (alan: EditingAlan) => void;
  onCariDegistir: (cari: Cari) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM') => void;
  onTarihDegistir: (tarih: string) => void;
  onParaBirimiDegistir: (pb: string) => void;
  satirBazliParaBirimi: boolean;
  onSatirBazliDegistir: (aktif: boolean) => void;
  onKdvOraniDegistir: (oran: number) => void;
  onOdemeVadesiDegistir: (vade: string) => void;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;
  onSatirArayaEkle: (afterIndex: number) => void;
  onNotlarDegistir: (notlar: string) => void;
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
  onKdvOraniDegistir,
  onOdemeVadesiDegistir,
  onSatirGuncelle,
  onSatirSil,
  onSatirEkle,
  onSatirArayaEkle,
  onNotlarDegistir,
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
            onKdvOraniDegistir={onKdvOraniDegistir}
            onOdemeVadesiDegistir={onOdemeVadesiDegistir}
            onSatirGuncelle={onSatirGuncelle}
            onSatirSil={onSatirSil}
            onSatirEkle={onSatirEkle}
            onSatirArayaEkle={onSatirArayaEkle}
            onNotlarDegistir={onNotlarDegistir}
          />
        </div>
      </div>

      {/* Hover stil kuralları */}
      <style>{`
        [data-alan="musteri"],
        [data-alan^="ayar-"],
        [data-alan="notlar"] {
          cursor: pointer;
          transition: background 0.18s ease;
        }
        [data-alan="musteri"]:hover,
        [data-alan^="ayar-"]:hover,
        [data-alan="notlar"]:hover {
          background: rgba(37, 99, 235, 0.025);
        }
        [data-satir-id] > td {
          cursor: pointer;
          transition: background 0.12s ease;
        }
        [data-satir-id] > td:hover {
          background: rgba(37, 99, 235, 0.045) !important;
        }
        @media print {
          [data-alan], [data-satir-id] > td {
            outline: none !important;
            background: initial !important;
            cursor: default !important;
          }
        }
      `}</style>
    </div>
  );
}
