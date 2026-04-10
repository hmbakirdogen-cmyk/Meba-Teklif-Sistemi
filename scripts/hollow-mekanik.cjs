/**
 * MEBA logo — MEKANİK yazısı içini boşalt + arka planı şeffaflaştır
 *
 * Girdi:  public/logo-meba.png
 * Çıktı:  public/logo-meba.png  (üzerine yazar)
 * Yedek:  public/logo-meba.original.png  (yoksa otomatik oluşturulur)
 *
 * Yöntem:
 *   1) Badge alanı tespiti (önceden ölçülmüş — sabit koordinatlar)
 *   2) Badge içindeki parlak pikseller = MEKANİK text mask
 *   3) Mask'ı N piksel erode et → interior pixels
 *   4) Interior'ı badge bg rengiyle doldur → outline (~N px) kalır
 *   5) Köşelerden flood fill ile white background bul → alpha=0
 */

const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

const SRC = path.join(__dirname, '..', 'public', 'logo-meba.png');
const BACKUP = path.join(__dirname, '..', 'public', 'logo-meba.original.png');
const DST = SRC;

// ── Ölçülmüş badge bounds (analiz scriptlerinden) ─────────────────────────────
const BADGE = { top: 506, bottom: 631, left: 561, right: 1592 };
const BADGE_BG = { r: 74, g: 75, b: 76 };          // ortalama dark grey
const STROKE_PX = 3;                               // outline kalınlığı (PNG'de) — letter strokes ~12-15 px
const TEXT_THRESHOLD = 200;                         // bir piksel ne kadar bright olursa text sayılır
const BG_THRESHOLD = 235;                           // background flood-fill için (white-ish)

// ── 1. Yedekleme ──────────────────────────────────────────────────────────────
if (!fs.existsSync(BACKUP)) {
  fs.copyFileSync(SRC, BACKUP);
  console.log('  ✓ Backup oluşturuldu:', path.relative(process.cwd(), BACKUP));
} else {
  console.log('  • Backup zaten mevcut, atlandı.');
}

// ── 2. PNG yükle ──────────────────────────────────────────────────────────────
const srcBuf = fs.readFileSync(BACKUP);  // her zaman orijinalden çalış
const png = PNG.sync.read(srcBuf);
const { width: w, height: h } = png;
const data = png.data;
console.log('  ✓ Yüklendi:', w + 'x' + h);

// PNG colorType=2 (RGB no alpha) ise, alpha kanal olan yeni bir buffer'a kopyala.
// pngjs zaten 4-channel RGBA yapıyor (data.length === w*h*4), ama emin olmak için kontrol:
if (data.length !== w * h * 4) {
  throw new Error('Beklenen RGBA, bulundu length=' + data.length);
}

// ── 3. Text mask oluştur ──────────────────────────────────────────────────────
// Sadece badge içi. true = parlak/text piksel.
const badgeW = BADGE.right - BADGE.left + 1;
const badgeH = BADGE.bottom - BADGE.top + 1;
const mask = new Uint8Array(badgeW * badgeH);
const maskIdx = (lx, ly) => ly * badgeW + lx;

let textCount = 0;
for (let ly = 0; ly < badgeH; ly++) {
  for (let lx = 0; lx < badgeW; lx++) {
    const x = BADGE.left + lx;
    const y = BADGE.top + ly;
    const idx = (y * w + x) * 4;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    if (r >= TEXT_THRESHOLD && g >= TEXT_THRESHOLD && b >= TEXT_THRESHOLD) {
      mask[maskIdx(lx, ly)] = 1;
      textCount++;
    }
  }
}
console.log('  ✓ Text mask:', textCount, 'piksel');

// ── 4. Erode mask by STROKE_PX (Chebyshev / square SE) ────────────────────────
// Bir piksel "interior" sayılır eğer kendinden STROKE_PX yarıçap içindeki tüm
// pikseller de mask'tedir. Yani: erosion = pixel ∈ mask AND komşuları da mask'te.
// Hızlı versiyon: önce horizontal erode, sonra vertical erode (separable square SE).
function erodeSeparable(src, width, height, radius) {
  const tmp = new Uint8Array(width * height);
  // Horizontal: her piksel için, [x-radius, x+radius] aralığında en az bir 0 var mı?
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let allOne = 1;
      for (let dx = -radius; dx <= radius; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= width || src[y * width + xx] === 0) { allOne = 0; break; }
      }
      tmp[y * width + x] = allOne;
    }
  }
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let allOne = 1;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height || tmp[yy * width + x] === 0) { allOne = 0; break; }
      }
      out[y * width + x] = allOne;
    }
  }
  return out;
}

const eroded = erodeSeparable(mask, badgeW, badgeH, STROKE_PX);
let interiorCount = 0;
for (let i = 0; i < eroded.length; i++) if (eroded[i]) interiorCount++;
console.log('  ✓ Interior (eroded) pixel:', interiorCount, '— stroke kalır:', textCount - interiorCount, 'piksel');

// ── 5. Interior'ı badge bg rengine boya ──────────────────────────────────────
// Edge pikselleri olduğu gibi bırak (anti-aliasing korunur).
for (let ly = 0; ly < badgeH; ly++) {
  for (let lx = 0; lx < badgeW; lx++) {
    if (eroded[maskIdx(lx, ly)]) {
      const x = BADGE.left + lx;
      const y = BADGE.top + ly;
      const idx = (y * w + x) * 4;
      data[idx]     = BADGE_BG.r;
      data[idx + 1] = BADGE_BG.g;
      data[idx + 2] = BADGE_BG.b;
      // alpha 255 — interior tamamen opak (badge bg üstünde)
      data[idx + 3] = 255;
    }
  }
}
console.log('  ✓ Interior boyandı (badge bg)');

// ── 6. Background flood fill — köşelerden başla, white pixel'leri transparent yap ──
// BFS queue. Her white-ish piksel transparent olur (alpha=0).
// Logo content'in dışındaki tüm beyaz alanları kapsar.
const visited = new Uint8Array(w * h);
const isBgWhite = (x, y) => {
  const idx = (y * w + x) * 4;
  return data[idx] >= BG_THRESHOLD && data[idx + 1] >= BG_THRESHOLD && data[idx + 2] >= BG_THRESHOLD;
};

// Use a typed-array as a ring buffer for BFS (faster than Array.shift)
const queue = new Int32Array(w * h);
let qHead = 0, qTail = 0;
const enqueue = (x, y) => {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  if (visited[y * w + x]) return;
  if (!isBgWhite(x, y)) return;
  visited[y * w + x] = 1;
  queue[qTail++] = y * w + x;
};

// Tüm 4 köşeden başla
enqueue(0, 0);
enqueue(w - 1, 0);
enqueue(0, h - 1);
enqueue(w - 1, h - 1);

// Ek olarak ilk/son satır ve ilk/son sütunu da seed et (sınır taraması)
for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
for (let y = 0; y < h; y++) { enqueue(0, y); enqueue(w - 1, y); }

let bgCount = 0;
while (qHead < qTail) {
  const cell = queue[qHead++];
  const x = cell % w;
  const y = (cell - x) / w;
  // Bu pikseli transparent yap
  data[cell * 4 + 3] = 0;
  bgCount++;
  // 4-konnektivite (köşe yayılması istemiyoruz, yumuşak geçişleri korumak için)
  enqueue(x + 1, y);
  enqueue(x - 1, y);
  enqueue(x, y + 1);
  enqueue(x, y - 1);
}
console.log('  ✓ Background transparent:', bgCount, 'piksel (alpha=0)');

// ── 7. Yumuşatma: yarı-saydam edge piksellerini de uygun şekilde sönümle ──
// Flood fill sadece çok beyaz olanları aldı; logo edge'lerinde yumuşak gri
// kalmış olabilir. Bunları görsel olarak korumak için dokunmuyoruz — onlar
// logonun gerçek anti-aliased kenarı.

// ── 8. PNG'yi yaz ─────────────────────────────────────────────────────────────
const outBuf = PNG.sync.write(png);
fs.writeFileSync(DST, outBuf);
console.log('  ✓ Kaydedildi:', path.relative(process.cwd(), DST), '(' + (outBuf.length / 1024).toFixed(1) + ' KB)');

console.log('\nÖzet:');
console.log('  badge:', BADGE);
console.log('  text pixels:    ', textCount);
console.log('  interior cleared:', interiorCount);
console.log('  outline width:  ', STROKE_PX, 'px');
console.log('  bg made transparent:', bgCount, 'pixels');
