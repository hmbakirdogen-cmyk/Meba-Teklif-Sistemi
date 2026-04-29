'use strict';

/**
 * launcher/pidLock.cjs — Single-instance lock dosyası yönetimi.
 *
 * .meba-running.pid dosyası: { pid, startedAt, url, mode }
 * Mevcut process aktifse openBrowser ile mevcut URL'i tarayıcıda aç ve exit.
 */

const fs = require('fs');
const path = require('path');

const PID_PATH = path.join(__dirname, '..', '.meba-running.pid');

function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0); // signal 0 = alive check
    return true;
  } catch (err) {
    return err.code === 'EPERM'; // başka kullanıcının process'i, ama yaşıyor
  }
}

function readPidFile() {
  try {
    if (!fs.existsSync(PID_PATH)) return null;
    const raw = fs.readFileSync(PID_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writePidFile(data) {
  fs.writeFileSync(PID_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function clearPidFile() {
  try {
    fs.unlinkSync(PID_PATH);
  } catch {
    /* ignore */
  }
}

/**
 * Mevcut bir instance var mı? Varsa { url, pid } döndürür; yoksa null.
 * Stale PID dosyasını otomatik temizler.
 */
function checkExistingInstance() {
  const data = readPidFile();
  if (!data) return null;
  if (!isPidAlive(data.pid)) {
    clearPidFile();
    return null;
  }
  return data;
}

function lockInstance(url, mode) {
  writePidFile({
    pid: process.pid,
    startedAt: new Date().toISOString(),
    url,
    mode,
  });
}

function releaseInstance() {
  clearPidFile();
}

module.exports = {
  PID_PATH,
  checkExistingInstance,
  lockInstance,
  releaseInstance,
  isPidAlive,
};
