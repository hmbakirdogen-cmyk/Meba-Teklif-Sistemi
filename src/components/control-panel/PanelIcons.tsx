/**
 * PanelIcons.tsx — Kumanda paneline özel "glass neon pictogram" SVG ikon ailesi.
 *
 * Tasarım kuralları:
 *  • Tek parça SVG (stack/overlay yok, paket ikon kombinasyonu yok).
 *  • currentColor → SVG parent'tan var(--button-accent) inherit alır,
 *    böylece her buton kendi karakter rengini paylaşır.
 *  • linearGradient (yüzey) + radialGradient (iç bloom) ile cam derinliği.
 *  • Stroke `currentColor`, line cap/join: round → premium yumuşak kontur.
 *  • Glow: parent .panel-icon class'ındaki drop-shadow filter halleder.
 *  • Her component kendi gradient id prefix'ini kullanır (id çakışması yok).
 */

interface IconProps {
  className?: string;
}

// ── Düzenleme: kilit gövdesi (kapalı/açık) + editing'de entegre kalem ───────
// readOnly=true  → kapalı kemer, kalem yok    (renk: kırmızı, .lock-button data-readonly)
// readOnly=false → açık kemer (sol bacak kaldırılmış) + diyagonal kalem (renk: yeşil)
export function EditPremiumIcon({
  className = 'panel-icon',
  readOnly = true,
}: IconProps & { readOnly?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ed-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
        </linearGradient>
        <radialGradient id="ed-bloom" cx="50%" cy="55%" r="58%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.30" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* iç bloom */}
      <rect x="4" y="10" width="13" height="11" rx="2.6" fill="url(#ed-bloom)" />
      {/* kilit kemeri — kapalı / açık */}
      {readOnly ? (
        <path
          d="M 7 10 V 7 a 3.5 3.5 0 0 1 7 0 V 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M 14 10 V 7 a 3.5 3.5 0 0 0 -6.4 -1.7 L 4 8.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* kilit gövdesi */}
      <rect
        x="4"
        y="10"
        width="13"
        height="11"
        rx="2.6"
        fill="url(#ed-body)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* anahtar deliği */}
      <circle cx="8.6" cy="14.4" r="1.05" fill="currentColor" />
      <path
        d="M 8.6 15.3 V 17.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* entegre kalem — sadece editing modunda görünür */}
      {!readOnly && (
        <>
          <path
            d="M 14 20 L 19 15 L 21 17 L 16 22 Z"
            fill="rgba(255,255,255,0.06)"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* kalem ucu — dolu üçgen */}
          <path d="M 14 20 L 13.4 22.6 L 16 22 Z" fill="currentColor" />
          {/* kalem bilezik çizgisi */}
          <path
            d="M 18.2 15.8 L 20.2 17.8"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

// ── Resim Ekle: fotoğraf kartı + sağ-altta artı (tek parça SVG) ─────────────
export function ImageAddPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="im-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id="im-bloom" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* iç bloom */}
      <rect x="2.5" y="4" width="17" height="14" rx="2.4" fill="url(#im-bloom)" />
      {/* fotoğraf kartı */}
      <rect
        x="2.5"
        y="4"
        width="17"
        height="14"
        rx="2.4"
        fill="url(#im-card)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* güneş */}
      <circle
        cx="7"
        cy="9"
        r="1.4"
        fill="rgba(255,255,255,0.10)"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      {/* dağ silüeti */}
      <path
        d="M 4 16 L 9 11 L 12.5 14 L 14.5 12 L 18 16 Z"
        fill="rgba(255,255,255,0.06)"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* artı rozeti — sağ alt; küçük dolu daire üstünde + sembolü */}
      <circle
        cx="18.5"
        cy="18.5"
        r="3.6"
        fill="rgba(0,0,0,0.40)"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M 18.5 16.6 V 20.4 M 16.6 18.5 H 20.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Satır Bazlı İskonto: 3 satır + büyük yüzde sembolü (tek parça SVG) ──────
export function RowDiscountPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rd-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.10" />
        </linearGradient>
        <radialGradient id="rd-bloom" cx="60%" cy="50%" r="60%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* iç bloom */}
      <rect x="2" y="3" width="20" height="18" fill="url(#rd-bloom)" />
      {/* 3 satır çubuğu */}
      <rect x="2.5" y="5" width="11" height="2.4" rx="1.2" fill="url(#rd-bar)" />
      <rect x="2.5" y="10.8" width="13" height="2.4" rx="1.2" fill="url(#rd-bar)" />
      <rect x="2.5" y="16.6" width="9" height="2.4" rx="1.2" fill="url(#rd-bar)" />
      {/* yüzde sembolü — sağda, baskın */}
      <circle
        cx="17.4"
        cy="7.6"
        r="2.2"
        fill="rgba(255,255,255,0.06)"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle
        cx="20.4"
        cy="16.6"
        r="2.2"
        fill="rgba(255,255,255,0.06)"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M 21.6 6 L 16.2 18.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Satır Bazlı Para Birimi: 3 satır + para sembolü (tek parça SVG) ─────────
export function RowCurrencyPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rc-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.10" />
        </linearGradient>
        <radialGradient id="rc-bloom" cx="62%" cy="50%" r="58%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* iç bloom */}
      <rect x="2" y="3" width="20" height="18" fill="url(#rc-bloom)" />
      {/* 3 satır çubuğu */}
      <rect x="2.5" y="5" width="11" height="2.4" rx="1.2" fill="url(#rc-bar)" />
      <rect x="2.5" y="10.8" width="13" height="2.4" rx="1.2" fill="url(#rc-bar)" />
      <rect x="2.5" y="16.6" width="9" height="2.4" rx="1.2" fill="url(#rc-bar)" />
      {/* para sembolü — stilize "₺" benzeri tek strok */}
      <path
        d="M 19.4 4.6 V 19.4"
        stroke="currentColor"
        strokeWidth="2.0"
        strokeLinecap="round"
      />
      <path
        d="M 16.6 8.4 L 22.4 6.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M 16.6 12.0 L 22.4 10.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── KDV: tipografik "KDV" — tek parça, premium harf sembolü ─────────────────
export function KdvPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 36 24" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="kd-text" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.65" />
        </linearGradient>
        <radialGradient id="kd-bloom" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* iç bloom — harflerin arkasında derinlik */}
      <ellipse cx="18" cy="13" rx="17" ry="9" fill="url(#kd-bloom)" />
      {/* KDV harfleri — kurumsal wordmark: hafif daha açık tracking + biraz
         daha narin gövde (900 → 800), aynı gradient/glow ailesinde kalır. */}
      <text
        x="18"
        y="17.2"
        textAnchor="middle"
        fontFamily="-apple-system, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif"
        fontSize="13"
        fontWeight="800"
        letterSpacing="0.14em"
        fill="url(#kd-text)"
        stroke="currentColor"
        strokeWidth="0.35"
        paintOrder="stroke fill"
      >
        KDV
      </text>
      {/* alt accent çizgisi — wordmark kurumsal hissini güçlendiren ince hat */}
      <path
        d="M 10 20.6 H 26"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

// ── İskonto: fiyat etiketi + içinde yüzde (tek parça SVG) ───────────────────
export function DiscountPremiumIcon({ className = 'panel-icon' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dc-tag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
        </linearGradient>
        <radialGradient id="dc-bloom" cx="55%" cy="50%" r="58%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* iç bloom */}
      <path
        d="M 12 2.5 H 21 V 11.5 L 12 21 L 2.5 11.5 L 12 2.5 Z"
        fill="url(#dc-bloom)"
      />
      {/* etiket gövdesi (tag shape) */}
      <path
        d="M 11.5 2.5 H 20 a 1.5 1.5 0 0 1 1.5 1.5 V 12.5 L 12.6 21.4 a 1.6 1.6 0 0 1 -2.3 0 L 2.6 13.7 a 1.6 1.6 0 0 1 0 -2.3 L 11.5 2.5 Z"
        fill="url(#dc-tag)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* etiket deliği */}
      <circle
        cx="17.6"
        cy="6.4"
        r="1.4"
        fill="rgba(0,0,0,0.35)"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      {/* iç yüzde sembolü */}
      <circle
        cx="9.4"
        cy="11.4"
        r="1.5"
        fill="rgba(255,255,255,0.06)"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle
        cx="14.6"
        cy="16.6"
        r="1.5"
        fill="rgba(255,255,255,0.06)"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M 16 9.6 L 8 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
