/**
 * PremiumPdfBadge — foto-gerçekçi 3D PDF rozeti.
 *
 * Katmanlar:
 *   1. Drop shadow stack (3 katman: contact + mid + ambient) — yüzeye düşmüş his
 *   2. Sol kenar kağıt kalınlığı — gerçek "tabaka" profili
 *   3. Ana gövde — 5-stop diyagonal kırmızı gradient (light → bright → dark)
 *   4. Üst-sol radial ışık huzmesi — primary light source
 *   5. Üst gradient highlight band — mat yüzey parlaklığı
 *   6. Kıvrılmış köşenin gölgesi — sayfada yumuşak elips
 *   7. Kıvrılmış köşe gradient — back-of-paper açık tonu
 *   8. Kıvrım kenarı highlight + shadow çizgileri — sharp crease
 *   9. Sahte içerik çizgileri — gerçek PDF doku hissi
 *  10. Debossed "PDF" yazı (3 katman: alt-shadow + ana + üst-highlight)
 *  11. Outer bevel — ince beyaz/koyu çift kenar
 *
 * 80×80 viewBox ile detay alanı geniş. Küçük ölçeklerde de katmanlar
 * birbirine karışıp net görünür.
 */

interface Props {
  className?: string;
  /** Karanlık tema modu — gradient'ler hafif desatüre edilir. */
  isDark?: boolean;
}

export default function PremiumPdfBadge({
  className = 'premium-pdf-badge',
  isDark = false,
}: Props) {
  // Tema-duyarlı palette — dark mode'da göz almasın diye düşük kontrast.
  const body0 = isDark ? '#fee2e2' : '#fef2f2';
  const body1 = isDark ? '#fb7185' : '#ef4444';
  const body2 = isDark ? '#e11d48' : '#dc2626';
  const body3 = isDark ? '#9f1239' : '#991b1b';
  const body4 = isDark ? '#4c0519' : '#450a0a';
  const thickness0 = isDark ? '#9f1239' : '#7f1d1d';
  const thickness1 = isDark ? '#500724' : '#450a0a';
  const foldA = '#ffffff';
  const foldB = isDark ? '#fecdd3' : '#fecaca';
  const foldC = isDark ? '#fda4af' : '#fca5a5';

  // Unique IDs — bir sayfada birden fazla badge olabilir, gradient'ler
  // ID üzerinden referansla bağlanır; aynı ID iki SVG'de çakışınca render
  // bozulur. Modülün dışından override edilmez, sade const yeterli.
  const id = 'pdfbadge';

  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden="true"
      focusable="false"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* 1) Ana gövde — 5-stop diyagonal kırmızı. Sol üstte aydınlık spot,
              sağ alt köşede derin koyu için ışık → gölge geçişi. */}
        <linearGradient id={`${id}-body`} x1="0.08" y1="0.04" x2="0.96" y2="0.98">
          <stop offset="0%" stopColor={body0} stopOpacity="0.78" />
          <stop offset="14%" stopColor={body1} />
          <stop offset="42%" stopColor={body2} />
          <stop offset="76%" stopColor={body3} />
          <stop offset="100%" stopColor={body4} />
        </linearGradient>

        {/* 2) Üst-sol radial ışık — primary light source, soft falloff */}
        <radialGradient id={`${id}-toplight`} cx="0.22" cy="0.08" r="0.65">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="22%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* 3) Üst kenar mat parlaklık şeridi — paper satin sheen */}
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.40" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* 4) Sol kenar kağıt kalınlığı — yan profil tonu (koyu kırmızı→ siyah) */}
        <linearGradient id={`${id}-thickness`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={thickness0} />
          <stop offset="100%" stopColor={thickness1} />
        </linearGradient>

        {/* 5) Kıvrılmış köşe — back-of-paper açık tonu, üstte ışık spot */}
        <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={foldA} stopOpacity="0.95" />
          <stop offset="35%" stopColor={foldB} />
          <stop offset="100%" stopColor={foldC} />
        </linearGradient>

        {/* 6) Kıvrımın sayfaya düşen gölgesi — yumuşak elips */}
        <radialGradient id={`${id}-foldshadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#000000" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* 7) Sağ kenar iç gölge — derinlik */}
        <linearGradient id={`${id}-rightshade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>

        {/* 8) Alt kenar iç gölge */}
        <linearGradient id={`${id}-bottomshade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.30" />
        </linearGradient>

        {/* 9) Drop shadow stack — 3 katman: yakın contact + orta + uzak ambient */}
        <filter id={`${id}-dropstack`} x="-40%" y="-20%" width="180%" height="160%">
          {/* Contact shadow — sıkı, yüzeye yakın */}
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.4" floodColor="#000000" floodOpacity="0.30" />
          {/* Mid shadow — orta mesafe, renkli */}
          <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#7f1d1d" floodOpacity="0.42" />
          {/* Ambient shadow — uzak, yumuşak */}
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.22" />
        </filter>

        {/* 10) Subtle paper grain pattern — 3×3 px noise dots */}
        <pattern id={`${id}-grain`} x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="transparent" />
          <circle cx="0.8" cy="1.2" r="0.18" fill="rgba(255,255,255,0.10)" />
          <circle cx="2.1" cy="2.4" r="0.14" fill="rgba(0,0,0,0.08)" />
          <circle cx="1.5" cy="0.4" r="0.10" fill="rgba(255,255,255,0.06)" />
        </pattern>

        {/* 11) Belge gövdesi clip — kıvrım dahil — diğer overlay'lar dışına taşmasın */}
        <clipPath id={`${id}-bodyclip`}>
          <path
            d="M 11 9
               L 50 9
               L 64 23
               L 64 64
               Q 64 67 61 67
               L 14 67
               Q 11 67 11 64
               Z"
          />
        </clipPath>
      </defs>

      {/* ═══════════ Drop shadow + ana belge grubu ═══════════ */}
      <g filter={`url(#${id}-dropstack)`}>
        {/* Sol kenar — kağıt kalınlığı, gerçek bir tabaka profili gibi.
            Hafif sola eğik trapez; üst-sol köşede daha ince, alt-sola
            kalınlaşır (perspektif hissi). */}
        <path
          d="M 8.5 12
             L 11 9
             L 11 64
             Q 11 66.5 13 66.7
             L 8.7 65
             Z"
          fill={`url(#${id}-thickness)`}
        />
        {/* Kalınlığın iç çizgisi — gerçek kağıt tabakaları */}
        <path d="M 9.2 13 L 9.2 64.4" stroke="rgba(0,0,0,0.25)" strokeWidth="0.3" />
        <path d="M 10 12.5 L 10 65" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />

        {/* Ana gövde */}
        <path
          d="M 11 9
             L 50 9
             L 64 23
             L 64 64
             Q 64 67 61 67
             L 14 67
             Q 11 67 11 64
             Z"
          fill={`url(#${id}-body)`}
        />

        {/* Body overlay'lar — clipPath ile gövde dışına taşmaz */}
        <g clipPath={`url(#${id}-bodyclip)`}>
          {/* Paper grain — gerçek kağıt dokusu */}
          <rect x="11" y="9" width="53" height="58" fill={`url(#${id}-grain)`} opacity="0.7" />

          {/* Üst kenar satin sheen */}
          <rect x="11" y="9" width="53" height="14" fill={`url(#${id}-sheen)`} opacity="0.85" />

          {/* Üst-sol radial ışık huzmesi — primary light */}
          <rect x="11" y="9" width="53" height="58" fill={`url(#${id}-toplight)`} />

          {/* Sağ kenar derinlik gölgesi */}
          <rect x="55" y="23" width="9" height="44" fill={`url(#${id}-rightshade)`} />

          {/* Alt kenar iç gölge */}
          <rect x="11" y="58" width="53" height="9" fill={`url(#${id}-bottomshade)`} />

          {/* Kıvrımın sayfaya düşen gölgesi — yumuşak elips, kıvrım
              altında 55,24 civarında */}
          <ellipse cx="55" cy="24.5" rx="10" ry="3.5" fill={`url(#${id}-foldshadow)`} />

          {/* Sahte içerik satırları — gerçek PDF doku hissi.
              Üst kısım: başlık (kalın+kısa) + 4 paragraf satırı.
              Alt kısım PDF yazısına bırakıldı, çakışma yok. */}
          <g opacity="0.18">
            <rect x="16" y="29" width="22" height="2" rx="0.5" fill="#ffffff" />
            <rect x="16" y="35" width="36" height="0.9" fill="#ffffff" />
            <rect x="16" y="38" width="42" height="0.9" fill="#ffffff" />
            <rect x="16" y="41" width="38" height="0.9" fill="#ffffff" />
            <rect x="16" y="44" width="34" height="0.9" fill="#ffffff" />
          </g>
        </g>

        {/* Kıvrılmış köşe — gövdenin üzerinde, ayrı katman.
            Üçgen back-of-paper'ı gösterir; alt ve sol kenarı sharp crease. */}
        <path d="M 50 9 L 50 23 L 64 23 Z" fill={`url(#${id}-fold)`} />
        {/* Kıvrım kenar çizgisi — sharp crease shadow */}
        <path
          d="M 50 9 L 50 23 L 64 23"
          fill="none"
          stroke="rgba(127,29,29,0.65)"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        {/* Kıvrım iç highlight — kağıdın bükülme yerinde ışık */}
        <path
          d="M 50.6 10.2 L 50.6 22.4"
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="0.5"
          strokeLinecap="round"
        />
        <path
          d="M 51 22.6 L 63 22.6"
          fill="none"
          stroke="rgba(255,255,255,0.30)"
          strokeWidth="0.4"
          strokeLinecap="round"
        />
        {/* Kıvrımın altında ince koyu vurgu — back-of-paper kalınlığı */}
        <path d="M 50 23 L 64 23" stroke="rgba(0,0,0,0.18)" strokeWidth="0.5" />

        {/* ═══════════ "PDF" yazısı — embossed (kabartmalı, yükseltilmiş)
            ═══════════════════════════════════════════════════════════════
            5 katmanlı stack: harfler yüzeyden yukarı çıkmış gibi görünür.
            Işık yönü: üst-sol (sayfa gradient'i ile uyumlu).

              a) Far shadow   — alt-sağa +2.2 offset, derin koyu  (uzun gölge)
              b) Mid shadow   — alt-sağa +1.2 offset, koyu        (orta gölge)
              c) Near shadow  — alt-sağa +0.5 offset, hafif koyu  (yakın gölge)
              d) Ana yüzey    — parlak beyaz                       (harf üst yüzü)
              e) Top highlight— üst-sola −0.4 offset, parlak beyaz (kenar ışığı)

            Font: 18px, weight 900, harf aralığı geniş → küçük ölçekte de okunur.
        */}
        {/* (a) Derin alt-sağ gölge — uzun düşmüş gölge */}
        <text
          x="37.7" y="61.7"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="18" fontWeight="900" textAnchor="middle"
          fill="rgba(30,0,0,0.50)"
          letterSpacing="0.6"
        >
          PDF
        </text>
        {/* (b) Orta gölge */}
        <text
          x="37.6" y="60.7"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="18" fontWeight="900" textAnchor="middle"
          fill="rgba(70,5,5,0.55)"
          letterSpacing="0.6"
        >
          PDF
        </text>
        {/* (c) Yakın gölge — harfin altına yapışık */}
        <text
          x="37.5" y="60"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="18" fontWeight="900" textAnchor="middle"
          fill="rgba(127,29,29,0.55)"
          letterSpacing="0.6"
        >
          PDF
        </text>
        {/* (d) Ana harf yüzü — parlak beyaz */}
        <text
          x="37.5" y="59.5"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="18" fontWeight="900" textAnchor="middle"
          fill="#ffffff"
          letterSpacing="0.6"
        >
          PDF
        </text>
        {/* (e) Tepe highlight — harfin üst-sol kenarında ışık çizgisi */}
        <text
          x="37.3" y="59.1"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="18" fontWeight="900" textAnchor="middle"
          fill="rgba(255,255,255,0.55)"
          letterSpacing="0.6"
        >
          PDF
        </text>
      </g>

      {/* ═══════════ Outer bevel — ince çift kenar ═══════════
          Dış parlak hat (üst-sol primary light yönünde) + iç koyu hat.
          drop shadow'un dışında render → kenar net görünür. */}
      <path
        d="M 11 9
           L 50 9
           L 64 23
           L 64 64
           Q 64 67 61 67
           L 14 67
           Q 11 67 11 64
           Z"
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.6"
      />
      <path
        d="M 11.7 9.7
           L 49.7 9.7
           L 63.3 23.3
           L 63.3 63.7
           Q 63.3 66.3 61 66.3
           L 14 66.3
           Q 11.7 66.3 11.7 63.7
           Z"
        fill="none"
        stroke="rgba(0,0,0,0.20)"
        strokeWidth="0.4"
      />

      {/* Üst-sol köşede minik diagonal parıltı — premium parlaklık ipucu */}
      <path
        d="M 14 12.5 L 22.5 12.5"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <path
        d="M 14 14.5 L 18.5 14.5"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
