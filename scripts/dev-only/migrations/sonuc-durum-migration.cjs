'use strict';

/**
 * Migration: eski 'sonuc' field'ını yeni 'durum' modeline taşı.
 *
 * Eşleme:
 *   sonuc='kazanildi'  → durum='onaylandi'
 *   sonuc='kaybedildi' → durum='kapanmadi'   (yeni "Kapanmadı" terimi)
 *   sonuc='iptal'      → durum='iptal'
 *   sonuc='beklemede'  → durum aynı kalır (bekleme = sonuçlanmamış)
 *
 *  sonuc/kayipSebebi/rakipFirma/sonucNotu field'ları DB'de KORUNUR
 *  (geriye uyumluluk + sebep/not bilgisi yeni modelde de gerekli).
 *  Sadece durum güncellenir.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const sayim = { onaylandi: 0, kapanmadi: 0, iptal: 0, atlandi: 0 };

for (const t of (db.teklifler || [])) {
  const s = t.sonuc;
  if (!s || s === 'beklemede') {
    sayim.atlandi += 1;
    continue;
  }
  if (s === 'kazanildi') {
    t.durum = 'onaylandi';
    sayim.onaylandi += 1;
  } else if (s === 'kaybedildi') {
    t.durum = 'kapanmadi';
    sayim.kapanmadi += 1;
  } else if (s === 'iptal') {
    t.durum = 'iptal';
    sayim.iptal += 1;
  }
  t.guncellemeTarihi = t.guncellemeTarihi || new Date().toISOString();
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log('Migration tamamlandı:');
console.log(`  durum=onaylandi  : ${sayim.onaylandi}`);
console.log(`  durum=kapanmadi  : ${sayim.kapanmadi}`);
console.log(`  durum=iptal      : ${sayim.iptal}`);
console.log(`  Atlandı (sonuc yok / beklemede): ${sayim.atlandi}`);
