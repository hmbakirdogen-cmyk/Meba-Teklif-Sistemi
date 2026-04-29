'use strict';

/**
 * Otomatik db.json yedekleme.
 *
 * - Server boot'ta bir kez calistirilir + her 24 saatte bir tekrar.
 * - Yedekler: server/backups/db-YYYY-MM-DD.json (gunluk)
 * - 30 gunden eski yedekler otomatik silinir.
 * - Yedek mevcut gun icin zaten varsa atlar (idempotent).
 */

const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');
const BACKUP_DIR = path.join(__dirname, 'backups');
const RETENTION_DAYS = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function bugunYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function gunlukYedekAl() {
  try {
    if (!fs.existsSync(DB_PATH)) return false;
    ensureBackupDir();
    const dosyaAdi = `db-${bugunYMD()}.json`;
    const hedef = path.join(BACKUP_DIR, dosyaAdi);
    if (fs.existsSync(hedef)) {
      // Bugun icin yedek zaten alindi
      return false;
    }
    fs.copyFileSync(DB_PATH, hedef);
    console.log(`[backup] gunluk yedek: ${dosyaAdi}`);
    return true;
  } catch (err) {
    console.warn('[backup] yedek alinamadi:', err.message);
    return false;
  }
}

function eskiYedekleriTemizle() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const simdi = Date.now();
    const dosyalar = fs.readdirSync(BACKUP_DIR);
    let silinen = 0;
    for (const ad of dosyalar) {
      // db-YYYY-MM-DD.json formatinda olanlari kontrol et
      if (!/^db-\d{4}-\d{2}-\d{2}\.json$/.test(ad)) continue;
      const tamYol = path.join(BACKUP_DIR, ad);
      try {
        const stat = fs.statSync(tamYol);
        const yas = simdi - stat.mtimeMs;
        if (yas > RETENTION_DAYS * ONE_DAY_MS) {
          fs.unlinkSync(tamYol);
          silinen++;
        }
      } catch { /* ignore */ }
    }
    if (silinen > 0) console.log(`[backup] ${silinen} eski yedek silindi (${RETENTION_DAYS}+ gun)`);
  } catch (err) {
    console.warn('[backup] eski yedek temizleme hatasi:', err.message);
  }
}

function backupTick() {
  gunlukYedekAl();
  eskiYedekleriTemizle();
}

function startBackupScheduler() {
  // Boot'ta hemen calistir
  setTimeout(backupTick, 5_000);
  // Her 6 saatte bir kontrol et — yeni gune girilince otomatik yedek alir
  setInterval(backupTick, 6 * 60 * 60 * 1000);
  console.log('[backup] scheduler aktif (gunluk yedek + 30 gun retention)');
}

module.exports = { startBackupScheduler, gunlukYedekAl, eskiYedekleriTemizle };
