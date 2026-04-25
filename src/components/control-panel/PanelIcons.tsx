/**
 * PanelIcons.tsx — Kumanda paneline özel "elit dijital neon" SVG ikon ailesi.
 *
 * Tasarım kuralları:
 *  • Tüm path'ler `fill: none, stroke: currentColor` — ince stroke (2.2)
 *    ortak `.panel-icon` CSS'i tarafından verilir.
 *  • Her path TEK katman (cam yansıma / glass overlay / arka bloom YOK).
 *    Premium hissi 2 katman saydam drop-shadow filter'dan gelir.
 *  • currentColor üzerinden parent .panel-icon'un --button-accent var'ını
 *    inherit eder; her buton kendi neon karakter rengini paylaşır.
 *  • EditPremiumIcon dual-state: readOnly=true kapalı kemer (kırmızı accent
 *    .button-edit[data-readonly="true"] ile), readOnly=false açık kemer +
 *    entegre kalem (yeşil accent).
 *  • KdvPremiumIcon `<text>` ayrı `panel-icon-text` class'ı (fill solid hex,
 *    stroke none) — text wordmark için stroke karakteri uygulanmaz.
 *  • Küçük dolu accent (kalem ucu üçgeni) inline `fill="currentColor"` ile
 *    CSS'in `fill: none` default'unu override eder.
 */

interface IconProps {
  className?: string;
}

// ── Düzenleme: kilit gövdesi (kapalı/açık) + editing'de entegre kalem ───────
export function EditPremiumIcon({
  className = 'panel-icon',
  readOnly = true,
}: IconProps & { readOnly?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {/* kilit kemeri — kapalı / açık */}
      {readOnly ? (
        <path d="M 7 10 V 7 a 3.5 3.5 0 0 1 7 0 V 10" />
      ) : (
        <path d="M 14 10 V 7 a 3.5 3.5 0 0 0 -6.4 -1.7 L 4 8.6" />
      )}
      {/* gövde outline */}
      <path d="M 6.6 10 H 14.4 a 2.6 2.6 0 0 1 2.6 2.6 V 18.4 a 2.6 2.6 0 0 1 -2.6 2.6 H 6.6 a 2.6 2.6 0 0 1 -2.6 -2.6 V 12.6 a 2.6 2.6 0 0 1 2.6 -2.6 Z" />
      {/* anahtar deliği — küçük dolu daire + alt çizgi */}
      <circle cx="8.6" cy="13.6" r="0.95" fill="currentColor" stroke="none" />
      <path d="M 8.6 14.6 V 17.4" />
      {/* entegre kalem — sadece editing modunda görünür */}
      {!readOnly && (
        <>
          <path d="M 14 20 L 19 15 L 21 17 L 16 22 Z" />
          <path d="M 18.2 15.8 L 20.2 17.8" />
          {/* kalem ucu — küçük dolu üçgen */}
          <path d="M 14 20 L 13.4 22.6 L 16 22 Z" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

// ── Resim Ekle: fotoğraf kartı + sağ-altta artı (outline only) ──────────────
export function ImageAddPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {/* fotoğraf kartı outline */}
      <path d="M 4.9 4 H 17.1 a 2.4 2.4 0 0 1 2.4 2.4 V 15.6 a 2.4 2.4 0 0 1 -2.4 2.4 H 4.9 a 2.4 2.4 0 0 1 -2.4 -2.4 V 6.4 a 2.4 2.4 0 0 1 2.4 -2.4 Z" />
      {/* güneş — daire */}
      <circle cx="8" cy="9" r="1.6" />
      {/* dağ silüeti */}
      <path d="M 4 16 L 9 11 L 12 14 L 14 12 L 18 16" />
      {/* artı rozeti — sağ alt: daire + dikey + yatay */}
      <circle cx="19" cy="19" r="3.4" />
      <path d="M 19 17 V 21" />
      <path d="M 17 19 H 21" />
    </svg>
  );
}

// ── Satır Bazlı İskonto: 3 yatay çizgi + büyük yüzde sembolü ────────────────
export function RowDiscountPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {/* 3 satır çizgisi */}
      <path d="M 2.6 6.2 H 12.4" />
      <path d="M 2.6 12 H 14.6" />
      <path d="M 2.6 17.8 H 10.4" />
      {/* yüzde sembolü — iki daire + diagonal */}
      <circle cx="17.4" cy="7.6" r="2.0" />
      <circle cx="20.4" cy="16.6" r="2.0" />
      <path d="M 21.8 6 L 16.0 18.2" />
    </svg>
  );
}

// ── Satır Bazlı Para Birimi: 3 yatay çizgi + ₺ benzeri sembol ───────────────
export function RowCurrencyPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {/* 3 satır çizgisi */}
      <path d="M 2.6 6.2 H 12.4" />
      <path d="M 2.6 12 H 14.6" />
      <path d="M 2.6 17.8 H 10.4" />
      {/* ₺ benzeri tek vertical strok + 2 yatay vurgu */}
      <path d="M 19.4 4.6 V 19.6" />
      <path d="M 16.6 8.4 L 22.4 6.6" />
      <path d="M 16.6 12.0 L 22.4 10.2" />
    </svg>
  );
}

// ── KDV: tipografik wordmark — fill solid accent (text özel) ────────────────
export function KdvPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 36 24" className={className} aria-hidden="true" focusable="false">
      <text
        x="18"
        y="17.2"
        textAnchor="middle"
        className="panel-icon-text"
      >
        KDV
      </text>
      {/* alt accent çizgisi — kurumsal hat */}
      <path d="M 10 20.6 H 26" />
    </svg>
  );
}

// ── İskonto: fiyat etiketi outline + delik + iç yüzde sembolü ───────────────
export function DiscountPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {/* tag pentagon outline */}
      <path d="M 11.5 2.5 H 20 a 1.5 1.5 0 0 1 1.5 1.5 V 12.5 L 12.6 21.4 a 1.6 1.6 0 0 1 -2.3 0 L 2.6 13.7 a 1.6 1.6 0 0 1 0 -2.3 L 11.5 2.5 Z" />
      {/* etiket deliği */}
      <circle cx="17.6" cy="6.4" r="1.3" />
      {/* iç yüzde sembolü — iki daire + diagonal */}
      <circle cx="9.4" cy="11.4" r="1.4" />
      <circle cx="14.6" cy="16.6" r="1.4" />
      <path d="M 16 9.6 L 8 18" />
    </svg>
  );
}
