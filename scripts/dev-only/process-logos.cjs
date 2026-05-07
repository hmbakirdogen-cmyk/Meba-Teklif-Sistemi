'use strict';

/**
 * process-logos.cjs — Firma logolarını teklif/PDF için temizler:
 *   1. RGBA'ya yükseltir
 *   2. Beyaza yakın pikselleri (R>240 && G>240 && B>240) tam şeffaf yapar
 *   3. Koyu navy/mavi çerçeve renklerini de şeffaflaştırır:
 *      - "Koyu" eşik: R<100 && G<100 && (R+G+B)<280
 *      - "Beyaz" harfler korunur (R>200): MEBA, MEKANİK gibi yazılar zarar görmez
 *      - Bu sayede koyu navy çerçeve içindeki beyaz logolar şeffaflaşır
 *   4. Şeffaf olmayan içeriğin bounding box'ını bulup kırpar (10px padding)
 *   5. Sıkıştırılmış PNG olarak kaydeder
 *
 * Idempotent: tekrar çalıştırma güvenli, mevcut şeffaf piksellere dokunmaz.
 */

const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const ROOT = path.join(__dirname, '..', '..');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');
const PADDING = 10;
const WHITE_THRESHOLD = 240;
const DARK_R_MAX = 100;
const DARK_G_MAX = 100;
const DARK_SUM_MAX = 280;
const PROTECTED_LIGHT_MIN = 200;

const TARGETS = [
  { id: 'meba',  file: 'logo-meba.png'  },
  { id: 'mesa',  file: 'logo-mesa.png'  },
  { id: 'elmos', file: 'logo-elmos.png' },
];

async function processLogo(file) {
  const fullPath = path.join(PUBLIC, file);
  const beforeSize = fs.statSync(fullPath).size;
  const img = await Jimp.read(fullPath);
  const { width, height } = img.bitmap;

  // 1+2+3. Beyaza yakın + koyu navy pikselleri şeffaflaştır.
  // Beyaz harfler (R>200) korunur — bu logo üzerindeki "MEKANİK" gibi
  // beyaz yazıların kaybolmamasını garanti eder.
  let whitened = 0;
  let darkened = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = img.getPixelIndex(x, y);
      const r = img.bitmap.data[idx + 0];
      const g = img.bitmap.data[idx + 1];
      const b = img.bitmap.data[idx + 2];
      // Beyaza yakın → şeffaf
      if (r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD) {
        img.bitmap.data[idx + 3] = 0;
        whitened++;
        continue;
      }
      // Koyu navy/mavi (çerçeve) → şeffaf
      // Beyaz harfleri koru: R>200 olanlar zaten yukarıda yakalandı.
      if (r < DARK_R_MAX && g < DARK_G_MAX && (r + g + b) < DARK_SUM_MAX
          && Math.max(r, g, b) < PROTECTED_LIGHT_MIN) {
        img.bitmap.data[idx + 3] = 0;
        darkened++;
      }
    }
  }

  // 3. İçerik bounding box (alpha > 0 olan piksellerden)
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = img.getPixelIndex(x, y);
      if (img.bitmap.data[idx + 3] > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    throw new Error(`${file}: tüm piksel şeffaf — kırpma mümkün değil`);
  }

  const cropX = Math.max(0, minX - PADDING);
  const cropY = Math.max(0, minY - PADDING);
  const cropW = Math.min(width  - cropX, maxX - minX + 1 + 2 * PADDING);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + 2 * PADDING);

  img.crop({ x: cropX, y: cropY, w: cropW, h: cropH });

  // 4. Optimize PNG yaz
  const buf = await img.getBuffer('image/png', { deflateLevel: 9 });
  fs.writeFileSync(fullPath, buf);
  const afterSize = fs.statSync(fullPath).size;

  return {
    file,
    before: { w: width, h: height, bytes: beforeSize },
    after:  { w: img.bitmap.width, h: img.bitmap.height, bytes: afterSize },
    whitened,
    darkened,
    crop:   { x: cropX, y: cropY, w: cropW, h: cropH },
  };
}

(async () => {
  for (const t of TARGETS) {
    try {
      const r = await processLogo(t.file);
      const pct = ((1 - r.after.bytes / r.before.bytes) * 100).toFixed(1);
      console.log(
        `${r.file.padEnd(18)}  ${r.before.w}x${r.before.h} (${(r.before.bytes/1024).toFixed(0)}KB)` +
        `  →  ${r.after.w}x${r.after.h} (${(r.after.bytes/1024).toFixed(0)}KB)` +
        `  -${pct}%  whitened=${r.whitened}  darkened=${r.darkened}`
      );
      // dist/ varsa kopyala (build sonrası deploy için)
      if (fs.existsSync(DIST)) {
        fs.copyFileSync(path.join(PUBLIC, t.file), path.join(DIST, t.file));
      }
    } catch (err) {
      console.error(`${t.file}: HATA →`, err.message);
      process.exitCode = 1;
    }
  }
})();
