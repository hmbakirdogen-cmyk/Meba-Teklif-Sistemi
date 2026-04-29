'use strict';

/**
 * Yuksek kaliteli, 3D goruntulu, sade ama dikkat cekici uygulama ikonu uretir.
 * Cikti: assets/icon/teklif-sistemi.ico (multi-resolution: 16/32/48/64/128/256)
 *
 * Renk semasi: lacivert + altin (login splash ile uyumlu).
 * Tasarim: rounded square + radial gradient + specular highlight + altin "T"
 *           harfi + ince altin cerceve + drop shadow.
 *
 * Calistirma: node scripts/build-app-icon.cjs
 */

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_ICO = path.join(__dirname, '..', 'assets', 'icon', 'teklif-sistemi.ico');
const OUT_PNG = path.join(__dirname, '..', 'assets', 'icon', 'teklif-sistemi.png');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

function svgIcon(size) {
  // viewBox 256 — sharp her boyuta scale edecek; svg coords sabit kalir
  // Kucuk boyutlarda detay kaybolur — 16/24/32 icin daha sade bir versiyon
  const isSmall = size <= 32;
  const cornerRadius = isSmall ? 38 : 56;
  const strokeWidth = isSmall ? 2.5 : 3.5;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Ana zemin: lacivert gradient (yukaridan asagiya, hafif perspektif) -->
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c2f5e"/>
      <stop offset="0.5" stop-color="#0f1c3a"/>
      <stop offset="1" stop-color="#060c1f"/>
    </linearGradient>
    <!-- Specular: ust yarida beyazimsi parlama (3D glossy hissi) -->
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.36"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <!-- Altın gradient — T harfi ve cerceve icin -->
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fde08a"/>
      <stop offset="0.45" stop-color="#e5b94c"/>
      <stop offset="1" stop-color="#a07a1f"/>
    </linearGradient>
    <linearGradient id="goldRim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff3b8"/>
      <stop offset="0.5" stop-color="#d4ac52"/>
      <stop offset="1" stop-color="#7d5c14"/>
    </linearGradient>
    <!-- Inner bevel: ust = parlak, alt = koyu (3D hacim) -->
    <linearGradient id="bevel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.35"/>
    </linearGradient>
    <!-- Drop shadow — yumusak, asagi dogru -->
    <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dx="0" dy="6" result="offsetblur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- Altın T harfi icin glow (parlak) -->
    <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feFlood flood-color="#ffd66b" flood-opacity="0.7"/>
      <feComposite in2="blur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- ==== ANA KART (rounded square, gradient, drop shadow) ==== -->
  <g filter="url(#ds)">
    <rect x="12" y="12" width="232" height="232" rx="${cornerRadius}" ry="${cornerRadius}"
          fill="url(#bg)"/>
    <!-- Inner bevel overlay -->
    <rect x="12" y="12" width="232" height="232" rx="${cornerRadius}" ry="${cornerRadius}"
          fill="url(#bevel)"/>
    <!-- Specular highlight (glossy) -->
    <rect x="18" y="18" width="220" height="118" rx="${cornerRadius - 8}" ry="${cornerRadius - 8}"
          fill="url(#gloss)"/>
    <!-- Altın çerçeve (ince, metalik) -->
    <rect x="14" y="14" width="228" height="228" rx="${cornerRadius - 2}" ry="${cornerRadius - 2}"
          fill="none" stroke="url(#goldRim)" stroke-width="${strokeWidth}"/>
  </g>

  ${isSmall ? renderSmallContent() : renderLargeContent()}
</svg>`;
}

function renderLargeContent() {
  // Buyuk boyut: detayli T harfi + alt etiket + dekoratif unsurlar
  return `
  <!-- ==== ALTIN "T" HARFI ==== -->
  <g filter="url(#goldGlow)">
    <!-- T üst kol -->
    <path d="M 64 78 L 192 78 L 192 110 L 144 110 L 144 198 L 112 198 L 112 110 L 64 110 Z"
          fill="url(#gold)"
          stroke="url(#goldRim)" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- T üzerinde glossy specular -->
    <path d="M 70 82 L 186 82 L 186 96 L 70 96 Z"
          fill="#ffffff" opacity="0.35"/>
    <path d="M 117 116 L 139 116 L 139 130 L 117 130 Z"
          fill="#ffffff" opacity="0.22"/>
  </g>

  <!-- Alt köşe nokta / aksent -->
  <circle cx="40" cy="216" r="3.5" fill="#d4ac52" opacity="0.65"/>
  <circle cx="216" cy="216" r="3.5" fill="#d4ac52" opacity="0.65"/>
  <circle cx="40" cy="40"  r="3.5" fill="#d4ac52" opacity="0.45"/>
  <circle cx="216" cy="40"  r="3.5" fill="#d4ac52" opacity="0.45"/>

  <!-- Üst orta: küçük lider çizgisi (CAD estetik) -->
  <line x1="118" y1="48" x2="138" y2="48" stroke="#d4ac52" stroke-width="1.2" opacity="0.55"/>
  <line x1="128" y1="40" x2="128" y2="58" stroke="#d4ac52" stroke-width="1.2" opacity="0.55"/>

  <!-- Alt orta: TS metni (ince, sade) -->
  <text x="128" y="232" text-anchor="middle"
        font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600"
        fill="#d4ac52" opacity="0.78" letter-spacing="3">TEKLİF</text>
  `;
}

function renderSmallContent() {
  // Kucuk boyut: sadece T harfi (detay kaybolur)
  return `
  <g>
    <path d="M 60 76 L 196 76 L 196 116 L 144 116 L 144 200 L 112 200 L 112 116 L 60 116 Z"
          fill="url(#gold)"
          stroke="url(#goldRim)" stroke-width="2"/>
    <path d="M 66 80 L 190 80 L 190 100 L 66 100 Z"
          fill="#ffffff" opacity="0.30"/>
  </g>
  `;
}

async function svgToPng(svg, size) {
  return await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * PNG buffer dizisinden ICO dosyasi olustur.
 * Modern Windows PNG-bazli ICO destekler.
 */
function buildIco(images) {
  const ICONDIR_SIZE = 6;
  const ICONDIRENTRY_SIZE = 16;
  const headerSize = ICONDIR_SIZE + (images.length * ICONDIRENTRY_SIZE);

  // ICONDIR header
  const header = Buffer.alloc(ICONDIR_SIZE);
  header.writeUInt16LE(0, 0);                  // Reserved
  header.writeUInt16LE(1, 2);                  // Type = ICO
  header.writeUInt16LE(images.length, 4);      // Count

  // ICONDIRENTRY[] + concatenated image data
  const entries = Buffer.alloc(images.length * ICONDIRENTRY_SIZE);
  let dataOffset = headerSize;
  const dataChunks = [];

  for (let i = 0; i < images.length; i++) {
    const { size, buffer } = images[i];
    const ofs = i * ICONDIRENTRY_SIZE;
    entries.writeUInt8(size === 256 ? 0 : size, ofs + 0);   // Width
    entries.writeUInt8(size === 256 ? 0 : size, ofs + 1);   // Height
    entries.writeUInt8(0, ofs + 2);                          // Color count
    entries.writeUInt8(0, ofs + 3);                          // Reserved
    entries.writeUInt16LE(1, ofs + 4);                       // Color planes
    entries.writeUInt16LE(32, ofs + 6);                      // Bits per pixel
    entries.writeUInt32LE(buffer.length, ofs + 8);           // Image size
    entries.writeUInt32LE(dataOffset, ofs + 12);             // Image offset
    dataOffset += buffer.length;
    dataChunks.push(buffer);
  }

  return Buffer.concat([header, entries, ...dataChunks]);
}

async function main() {
  console.log('  Ikon olusturuluyor...');
  const dir = path.dirname(OUT_ICO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const images = [];
  for (const size of SIZES) {
    const svg = svgIcon(size);
    const pngBuf = await svgToPng(svg, size);
    images.push({ size, buffer: pngBuf });
    console.log(`    ${size}x${size}  -> ${pngBuf.length} bytes`);
  }

  const ico = buildIco(images);
  fs.writeFileSync(OUT_ICO, ico);
  console.log(`  ICO yazildi: ${OUT_ICO}  (${ico.length} bytes)`);

  // Bonus: 256x256 PNG'i de kaydet (preview/web icin)
  fs.writeFileSync(OUT_PNG, images[images.length - 1].buffer);
  console.log(`  PNG yazildi: ${OUT_PNG}`);

  console.log('  Tamamlandi.');
}

main().catch((err) => {
  console.error('HATA:', err);
  process.exit(1);
});
