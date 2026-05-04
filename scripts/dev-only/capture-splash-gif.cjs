'use strict';

/**
 * Splash + giris ekrani animasyonunu yakalayip GIF + MP4 (varsa ffmpeg) olarak kaydeder.
 *
 * - Static server: dist klasorunu serve eder (port 9876)
 * - Puppeteer-core: sistem Chrome'unu kullanir (extra indirme yok)
 * - Frame yakalama: 12 fps × 8 saniye = 96 frame, 1280×720
 * - GIF encoder: gifenc (pure JS, ffmpeg gerektirmez)
 *
 * Cikti: assets/splash-demo.gif
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const OUT_GIF = path.join(ROOT, 'assets', 'splash-demo.gif');
const STATIC_PORT = 9876;

const FPS = 12;
const DURATION_SEC = 8;
const TOTAL_FRAMES = FPS * DURATION_SEC;
const FRAME_INTERVAL_MS = Math.round(1000 / FPS);
const VIEWPORT_W = 1280;
const VIEWPORT_H = 720;

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

function findBrowser() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome veya Edge bulunamadi.');
}

// ── Basit static server ─────────────────────────────────────────────────────
function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
      const filePath = path.join(DIST_DIR, urlPath);
      // Path traversal koruma
      if (!filePath.startsWith(DIST_DIR)) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          // SPA fallback — index.html
          fs.readFile(path.join(DIST_DIR, 'index.html'), (e2, d2) => {
            if (e2) { res.writeHead(404); res.end('Not found'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(d2);
          });
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const ctMap = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.json': 'application/json',
          '.ico': 'image/x-icon',
          '.woff2': 'font/woff2',
        };
        res.writeHead(200, { 'Content-Type': ctMap[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(STATIC_PORT, '127.0.0.1', () => {
      console.log(`  static server ready: http://127.0.0.1:${STATIC_PORT}`);
      resolve(server);
    });
  });
}

// ── PNG → ham RGBA buffer (gifenc icin) ─────────────────────────────────────
// Puppeteer screenshot returns PNG. We need raw RGBA. Use sharp.
const sharp = require('sharp');

async function pngToRgba(pngBuffer) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height };
}

(async () => {
  console.log('═══ Splash GIF kaydi ═══');

  // 1) Static server
  const server = await startStaticServer();

  // 2) Chrome
  const browserPath = findBrowser();
  console.log(`  browser: ${browserPath}`);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
    defaultViewport: { width: VIEWPORT_W, height: VIEWPORT_H, deviceScaleFactor: 1 },
  });

  try {
    const page = await browser.newPage();

    // localStorage'i temizle (her açılışta splash icin lazim degil ama yine de)
    await page.evaluateOnNewDocument(() => {
      try { localStorage.clear(); } catch { /* ignore */ }
    });

    console.log('  splash sayfasi yukleniyor...');
    await page.goto(`http://127.0.0.1:${STATIC_PORT}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // SoftwareSignature ve scrollbar gizle (temiz GIF)
    await page.addStyleTag({
      content: `
        body { overflow: hidden !important; }
        ::-webkit-scrollbar { display: none !important; }
      `,
    });

    // Splash baslamasi icin kisa bekle
    await new Promise((r) => setTimeout(r, 200));

    console.log(`  ${TOTAL_FRAMES} frame yakalaniyor (${FPS} fps × ${DURATION_SEC} sn)...`);
    const frames = [];
    const startTs = Date.now();
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const targetMs = i * FRAME_INTERVAL_MS;
      const elapsed = Date.now() - startTs;
      if (elapsed < targetMs) {
        await new Promise((r) => setTimeout(r, targetMs - elapsed));
      }
      const png = await page.screenshot({ type: 'png', fullPage: false });
      frames.push(png);
      if ((i + 1) % 12 === 0) {
        process.stdout.write(`    [${i + 1}/${TOTAL_FRAMES}] ${(((i + 1) / TOTAL_FRAMES) * 100).toFixed(0)}%\n`);
      }
    }
    console.log(`  ${frames.length} frame yakalandi (${(Date.now() - startTs) / 1000}s)`);

    // 3) GIF encode
    console.log('  GIF encode ediliyor (resize 800×450 + quantize)...');
    const gif = GIFEncoder();

    // Hedef boyut: 800x450 (GIF dosya boyutu icin)
    const TARGET_W = 800;
    const TARGET_H = 450;

    for (let i = 0; i < frames.length; i++) {
      const resized = await sharp(frames[i])
        .resize(TARGET_W, TARGET_H, { fit: 'fill' })
        .png()
        .toBuffer();
      const { data } = await pngToRgba(resized);

      // Quantize to 256 colors palette
      const palette = quantize(data, 256, { format: 'rgb444' });
      const indexed = applyPalette(data, palette, 'rgb444');

      gif.writeFrame(indexed, TARGET_W, TARGET_H, {
        palette,
        delay: FRAME_INTERVAL_MS,
        repeat: 0,
      });
      if ((i + 1) % 12 === 0) {
        process.stdout.write(`    encoded [${i + 1}/${frames.length}]\n`);
      }
    }

    gif.finish();
    const gifBytes = gif.bytes();

    // 4) Kaydet
    if (!fs.existsSync(path.dirname(OUT_GIF))) fs.mkdirSync(path.dirname(OUT_GIF), { recursive: true });
    fs.writeFileSync(OUT_GIF, gifBytes);
    console.log(`  GIF yazildi: ${OUT_GIF}`);
    console.log(`  Boyut: ${(gifBytes.length / 1024).toFixed(1)} KB`);

  } finally {
    await browser.close();
    server.close();
  }

  console.log('═══ Tamamlandi ═══');
})().catch((err) => {
  console.error('HATA:', err.message);
  console.error(err.stack);
  process.exit(1);
});
