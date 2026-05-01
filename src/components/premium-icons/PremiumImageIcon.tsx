/**
 * PremiumImageIcon — fotoğraf kartı (güneş + dağ) + sağ-altta plus rozet.
 */
interface Props {
  className?: string;
}

export default function PremiumImageIcon({ className = 'premium-panel-icon' }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* kart drop-shadow */}
      <rect x="8" y="14" width="44" height="36" rx="5" fill="rgba(0,0,0,0.14)" />

      {/* fotoğraf kartı gövde */}
      <rect x="6" y="12" width="44" height="36" rx="5" className="pi-body" />
      {/* dış bevel — aydınlık */}
      <rect x="6.8" y="12.8" width="42.4" height="34.4" rx="4.3" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
      {/* dış bevel — koyu */}
      <rect x="7.4" y="13.4" width="41.2" height="33.2" rx="3.8" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={0.9} />
      {/* üst kenar highlight */}
      <rect x="7" y="13" width="42" height="2" rx="1" fill="rgba(255,255,255,0.26)" />
      {/* alt kenar gölge */}
      <rect x="7" y="44.6" width="42" height="1.2" rx="0.6" fill="rgba(0,0,0,0.22)" />

      {/* gökyüzü tonu */}
      <rect x="8" y="14" width="40" height="16" rx="2" fill="rgba(110,170,230,0.14)" />

      {/* güneş */}
      <circle cx="17" cy="22" r="3.6" className="pi-detail" />
      <circle cx="17" cy="22" r="3.6" fill="rgba(255,215,70,0.18)" />
      <circle cx="16.2" cy="21.2" r="1.3" fill="rgba(255,255,255,0.28)" />

      {/* dağ silüeti — ana dolgu */}
      <path d="M 8 44 L 22 26 L 32 36 L 38 30 L 50 44 Z" className="pi-detail" />
      {/* dağ — ışık gören yüz */}
      <path d="M 22 26 L 32 36 L 27 44 L 13 44 Z" fill="rgba(255,255,255,0.09)" />
      {/* dağ — gölge yüz */}
      <path d="M 32 36 L 38 30 L 50 44 L 27 44 Z" fill="rgba(0,0,0,0.11)" />
      {/* sırt çizgisi */}
      <path d="M 8 44 L 22 26 L 32 36 L 38 30 L 50 44" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth={0.6} strokeLinejoin="round" />

      {/* zemin şeridi */}
      <rect x="8" y="42" width="40" height="4" rx="1" fill="rgba(90,150,70,0.14)" />

      {/* iç yatay çizgiler (kart doku) */}
      <rect x="8" y="29.5" width="40" height="0.7" rx="0.35" fill="rgba(255,255,255,0.10)" />
      <rect x="8" y="36.5" width="40" height="0.7" rx="0.35" fill="rgba(0,0,0,0.07)" />

      {/* plus rozet drop-shadow */}
      <circle cx="50.7" cy="50.7" r="10" fill="rgba(0,0,0,0.14)" />

      {/* plus rozet gövde */}
      <circle cx="50" cy="50" r="10" className="pi-body" />
      {/* bevel — aydınlık */}
      <circle cx="50" cy="50" r="9.2" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth={1} />
      {/* bevel — koyu */}
      <circle cx="50" cy="50" r="9.2" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth={0.8} />
      {/* rozet üst yarısı highlight */}
      <path d="M 41.5 46.5 A 9 9 0 0 1 58.5 46.5" fill="rgba(255,255,255,0.16)" />

      {/* haç işareti */}
      <path d="M 50 44 V 56 M 44 50 H 56" className="pi-glyph" />
    </svg>
  );
}
