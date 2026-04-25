/**
 * PanelIcons.tsx — Kumanda paneline özel "neon tüplü cam" SVG ikon ailesi.
 *
 * Tasarım kuralları:
 *  • Tüm path'ler `fill: none, stroke: currentColor` — kalın stroke (3.2)
 *    ortak `.panel-icon` CSS'i tarafından verilir → gerçek neon tüp hissi.
 *  • Her path'in üstüne ikinci bir `panel-icon-glass` katmanı (ince beyaz
 *    cam yansıma) bindirilir. Bu DRY için NeonPath helper ile sağlanır.
 *  • Arka soft bloom için `panel-icon-fill` katmanı (var(--button-glow)
 *    %8 opaklık, blur 6px) → asla "dolu ikon" görünmez.
 *  • currentColor üzerinden parent .panel-icon'un --button-accent var'ını
 *    inherit eder; her buton kendi neon karakter rengini paylaşır.
 *  • EditPremiumIcon dual-state korunur: readOnly=true kapalı kemer (kırmızı
 *    accent override .control-panel button.button-edit[data-readonly="true"]),
 *    readOnly=false açık kemer + entegre kalem (yeşil accent).
 *  • KdvPremiumIcon `<text>` tube/glass uygulanmaz — ayrı `panel-icon-text`
 *    class'ı (fill solid hex, stroke none).
 */

import type { ReactNode } from 'react';

interface IconProps {
  className?: string;
}

// ── Helper: ana neon tube path + üstüne ince cam yansıma overlay ────────────
function NeonPath({ d }: { d: string }) {
  return (
    <>
      <path d={d} />
      <path d={d} className="panel-icon-glass" />
    </>
  );
}

function NeonChildren({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ── Düzenleme: kilit gövdesi (kapalı/açık) + editing'de entegre kalem ───────
export function EditPremiumIcon({
  className = 'panel-icon',
  readOnly = true,
}: IconProps & { readOnly?: boolean }) {
  // Path'leri tek noktada tanımla → tube + glass katmanı çift kullanım için.
  const shacklePath = readOnly
    ? 'M 7 10 V 7 a 3.5 3.5 0 0 1 7 0 V 10'
    : 'M 14 10 V 7 a 3.5 3.5 0 0 0 -6.4 -1.7 L 4 8.6';
  const bodyPath = 'M 6.6 10 H 14.4 a 2.6 2.6 0 0 1 2.6 2.6 V 18.4 a 2.6 2.6 0 0 1 -2.6 2.6 H 6.6 a 2.6 2.6 0 0 1 -2.6 -2.6 V 12.6 a 2.6 2.6 0 0 1 2.6 -2.6 Z';
  const keyholeStem = 'M 8.6 14.6 V 17.4';

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {/* arka soft bloom */}
      <ellipse cx="10.5" cy="15" rx="11" ry="9" className="panel-icon-fill" />
      {/* kilit kemeri (kapalı veya açık) */}
      <NeonPath d={shacklePath} />
      {/* gövde outline */}
      <NeonPath d={bodyPath} />
      {/* anahtar deliği — daire (filled) + alt çizgi (tube) */}
      <NeonChildren>
        <circle cx="8.6" cy="13.6" r="0.95" fill="currentColor" stroke="none" />
        <circle cx="8.6" cy="13.6" r="0.95" className="panel-icon-glass" fill="rgba(255,255,255,0.55)" stroke="none" />
      </NeonChildren>
      <NeonPath d={keyholeStem} />
      {/* entegre kalem — sadece editing modunda görünür */}
      {!readOnly && (
        <>
          <NeonPath d="M 14 20 L 19 15 L 21 17 L 16 22 Z" />
          <NeonPath d="M 18.2 15.8 L 20.2 17.8" />
          {/* kalem ucu — küçük dolu üçgen (tube'dan farklı, ipucu olarak) */}
          <path d="M 14 20 L 13.4 22.6 L 16 22 Z" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

// ── Resim Ekle: fotoğraf kartı + sağ-altta artı (tube outline only) ─────────
export function ImageAddPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="2" y="3.5" width="18" height="15" rx="2.4" className="panel-icon-fill" />
      {/* fotoğraf kartı outline */}
      <NeonPath d="M 4.9 4 H 17.1 a 2.4 2.4 0 0 1 2.4 2.4 V 15.6 a 2.4 2.4 0 0 1 -2.4 2.4 H 4.9 a 2.4 2.4 0 0 1 -2.4 -2.4 V 6.4 a 2.4 2.4 0 0 1 2.4 -2.4 Z" />
      {/* güneş — daire */}
      <NeonChildren>
        <circle cx="8" cy="9" r="1.6" fill="none" stroke="currentColor" />
        <circle cx="8" cy="9" r="1.6" className="panel-icon-glass" />
      </NeonChildren>
      {/* dağ silüeti */}
      <NeonPath d="M 4 16 L 9 11 L 12 14 L 14 12 L 18 16" />
      {/* artı rozeti — sağ alt: daire + dikey + yatay */}
      <NeonChildren>
        <circle cx="19" cy="19" r="3.4" fill="none" stroke="currentColor" />
        <circle cx="19" cy="19" r="3.4" className="panel-icon-glass" />
      </NeonChildren>
      <NeonPath d="M 19 17 V 21" />
      <NeonPath d="M 17 19 H 21" />
    </svg>
  );
}

// ── Satır Bazlı İskonto: 3 yatay çizgi + büyük yüzde sembolü ────────────────
export function RowDiscountPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="2" y="3" width="20" height="18" className="panel-icon-fill" />
      {/* 3 satır çizgisi — neon tube */}
      <NeonPath d="M 2.6 6.2 H 12.4" />
      <NeonPath d="M 2.6 12 H 14.6" />
      <NeonPath d="M 2.6 17.8 H 10.4" />
      {/* yüzde sembolü — iki daire + diagonal */}
      <NeonChildren>
        <circle cx="17.4" cy="7.6" r="2.0" fill="none" stroke="currentColor" />
        <circle cx="17.4" cy="7.6" r="2.0" className="panel-icon-glass" />
      </NeonChildren>
      <NeonChildren>
        <circle cx="20.4" cy="16.6" r="2.0" fill="none" stroke="currentColor" />
        <circle cx="20.4" cy="16.6" r="2.0" className="panel-icon-glass" />
      </NeonChildren>
      <NeonPath d="M 21.8 6 L 16.0 18.2" />
    </svg>
  );
}

// ── Satır Bazlı Para Birimi: 3 yatay çizgi + ₺ benzeri sembol ───────────────
export function RowCurrencyPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="2" y="3" width="20" height="18" className="panel-icon-fill" />
      {/* 3 satır çizgisi */}
      <NeonPath d="M 2.6 6.2 H 12.4" />
      <NeonPath d="M 2.6 12 H 14.6" />
      <NeonPath d="M 2.6 17.8 H 10.4" />
      {/* ₺ benzeri tek vertical strok + 2 yatay vurgu */}
      <NeonPath d="M 19.4 4.6 V 19.6" />
      <NeonPath d="M 16.6 8.4 L 22.4 6.6" />
      <NeonPath d="M 16.6 12.0 L 22.4 10.2" />
    </svg>
  );
}

// ── KDV: tipografik wordmark — tube uygulanmaz, fill solid accent ───────────
export function KdvPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 36 24" className={className} aria-hidden="true" focusable="false">
      {/* arka soft bloom */}
      <ellipse cx="18" cy="13" rx="17" ry="9" className="panel-icon-fill" />
      {/* KDV harfleri — solid hex accent saturasyonlu */}
      <text
        x="18"
        y="17.2"
        textAnchor="middle"
        className="panel-icon-text"
      >
        KDV
      </text>
      {/* alt accent çizgisi — kurumsal hat (tube + glass) */}
      <NeonPath d="M 10 20.6 H 26" />
    </svg>
  );
}

// ── İskonto: fiyat etiketi outline + delik + iç yüzde sembolü ───────────────
export function DiscountPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {/* tag pentagon arka soft bloom */}
      <path
        d="M 12 2.5 H 20 a 1.5 1.5 0 0 1 1.5 1.5 V 12 L 12 21 L 2.5 11.5 L 12 2.5 Z"
        className="panel-icon-fill"
      />
      {/* tag pentagon outline */}
      <NeonPath d="M 11.5 2.5 H 20 a 1.5 1.5 0 0 1 1.5 1.5 V 12.5 L 12.6 21.4 a 1.6 1.6 0 0 1 -2.3 0 L 2.6 13.7 a 1.6 1.6 0 0 1 0 -2.3 L 11.5 2.5 Z" />
      {/* etiket deliği */}
      <NeonChildren>
        <circle cx="17.6" cy="6.4" r="1.3" fill="none" stroke="currentColor" />
        <circle cx="17.6" cy="6.4" r="1.3" className="panel-icon-glass" />
      </NeonChildren>
      {/* iç yüzde sembolü — iki daire + diagonal */}
      <NeonChildren>
        <circle cx="9.4" cy="11.4" r="1.4" fill="none" stroke="currentColor" />
        <circle cx="9.4" cy="11.4" r="1.4" className="panel-icon-glass" />
      </NeonChildren>
      <NeonChildren>
        <circle cx="14.6" cy="16.6" r="1.4" fill="none" stroke="currentColor" />
        <circle cx="14.6" cy="16.6" r="1.4" className="panel-icon-glass" />
      </NeonChildren>
      <NeonPath d="M 16 9.6 L 8 18" />
    </svg>
  );
}
