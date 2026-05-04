'use strict';

/**
 * launcher.cjs — Grup Şirketleri Teklif Sistemi başlatıcısı.
 *
 * Akış:
 *   1. PID lock kontrol — başka instance varsa tarayıcıda mevcut URL'i aç ve exit
 *   2. config/server-config.json oku → port bilgisi al
 *   3. Backend spawn (server/server.cjs) → /api/health 200 dönene kadar bekle
 *   4. Static frontend server (dist/) başlat
 *   5. Tarayıcıyı http://localhost:<frontendPort>'ta aç
 *   6. SIGINT/SIGTERM/exit handler → child kill + PID file sil
 *
 * Electron geçişinde launcher.cjs → main.cjs olur; spawnBackend require ile
 * in-process'e taşınır, openBrowser BrowserWindow.loadURL ile değişir.
 */

const fs = require('fs');
const path = require('path');
const { checkExistingInstance, lockInstance, releaseInstance } = require('./launcher/pidLock.cjs');
const { spawnBackend, waitForHealth } = require('./launcher/spawnChildren.cjs');
const { startStaticServer } = require('./launcher/staticServer.cjs');
const { openBrowser } = require('./launcher/openBrowser.cjs');

// ── Config oku ────────────────────────────────────────────────────────────────

function readConfig() {
  // Online-only mimari: sadece server-config.json okunur. Eski client-config
  // desteği kaldırıldı (kullanıcılar tarayıcıdan bağlanır, client kurulumu yok).
  const serverConfigPath = path.join(__dirname, 'config', 'server-config.json');
  const defaults = { listenPort: 3001, frontendPort: 5173, autoOpenBrowser: true };

  if (fs.existsSync(serverConfigPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(serverConfigPath, 'utf-8'));
      return { ...defaults, ...raw };
    } catch (err) {
      console.warn(`[launcher] server-config.json okunamadı:`, err.message);
    }
  } else {
    console.warn('[launcher] config/server-config.json yok, defaultlar kullanılıyor.');
  }
  return defaults;
}

const config = readConfig();
const BACKEND_PORT  = config.listenPort   || config.serverPort || 3001;
const FRONTEND_PORT = config.frontendPort || 5173;
const FRONTEND_URL  = `http://localhost:${FRONTEND_PORT}`;
const AUTO_OPEN     = config.autoOpenBrowser !== false; // default true

// ── Single-instance check ─────────────────────────────────────────────────────

const existing = checkExistingInstance();
if (existing) {
  console.log(`[launcher] Zaten çalışıyor (pid=${existing.pid}). Tarayıcıda açılıyor: ${existing.url}`);
  if (AUTO_OPEN) openBrowser(existing.url);
  process.exit(0);
}

// ── Children handle'ları ──────────────────────────────────────────────────────

let backend = null;
let staticServer = null;
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[launcher] Kapatılıyor (signal=${signal})...`);
  if (backend && !backend.killed) {
    try { backend.kill('SIGTERM'); } catch { /* ignore */ }
  }
  if (staticServer) {
    try { staticServer.close(); } catch { /* ignore */ }
  }
  releaseInstance();
  setTimeout(() => process.exit(0), 250);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit',    () => releaseInstance());

// ── Boot ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log('');
  console.log('  ════════════════════════════════════════════════');
  console.log('  Grup Şirketleri Teklif Sistemi — Başlatıcı');
  console.log('  (MEBA · MESA · ELMOS)');
  console.log('  Backend:  http://localhost:' + BACKEND_PORT);
  console.log('  Frontend: ' + FRONTEND_URL);
  console.log('  ════════════════════════════════════════════════');
  console.log('');

  // 1. Backend
  console.log('[launcher] Backend başlatılıyor...');
  backend = spawnBackend({
    port: BACKEND_PORT,
    onLog:   (l) => process.stdout.write(l + '\n'),
    onError: (l) => process.stderr.write(l + '\n'),
  });

  try {
    await waitForHealth(BACKEND_PORT);
    console.log('[launcher] Backend hazır.');
  } catch (err) {
    console.error('[launcher] Backend health check timeout:', err.message);
    shutdown('boot-error');
    return;
  }

  // 2. Frontend (static dist/)
  try {
    staticServer = startStaticServer({
      port: FRONTEND_PORT,
      onLog: (l) => process.stdout.write(l + '\n'),
    });
  } catch (err) {
    console.error('[launcher] Frontend static server başlatılamadı:', err.message);
    console.error('[launcher] Çözüm: önce "npm run build" ile dist/ üretin.');
    shutdown('boot-error');
    return;
  }

  // 3. PID lock + tarayıcı (mode parametresi eski client desteği için
  //    pidLock imzasında kalıyor; sabit 'server' geçilir)
  lockInstance(FRONTEND_URL, 'server');
  if (AUTO_OPEN) {
    setTimeout(() => openBrowser(FRONTEND_URL), 600);
  }

  console.log('');
  console.log('  ✓ Hazır. Tarayıcıda açılıyor: ' + FRONTEND_URL);
  console.log('  (Durdurmak için Ctrl+C)');
  console.log('');
})();
