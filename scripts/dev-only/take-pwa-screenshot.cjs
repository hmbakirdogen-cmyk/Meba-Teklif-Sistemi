'use strict';

/**
 * take-pwa-screenshot.cjs — manifest.json screenshots[] için 1280x720 PWA ekran görüntüsü.
 *
 * Çalıştırmadan önce: server ayakta olmalı (node launcher.cjs).
 * Çıktı: public/screenshot.png
 *
 * Kullanım: node scripts/dev-only/take-pwa-screenshot.cjs
 */

const path = require('path');
const puppeteer = require('puppeteer-core');

const URL = 'http://localhost:5173';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, '..', '..', 'public', 'screenshot.png');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
  });
  try {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    // Login splash render bekle
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: OUT, type: 'png' });
    console.log(`[screenshot] OK → ${OUT}`);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error('[screenshot] FAIL:', err.message);
  process.exit(1);
});
