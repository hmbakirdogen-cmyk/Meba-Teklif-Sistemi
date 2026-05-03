'use strict';

// Rastgele kullanıcılara gerçek yüz fotoğrafı atar (i.pravatar.cc).
// - Sadece SVG/yok olan profilFotoUrl alanları doldurulur (mevcut .jpg'ler korunur).
// - id'den seed üretildiği için her çalıştırmada aynı yüz gelir.

const fs   = require('fs');
const path = require('path');
const https = require('https');

const DB_PATH  = path.join(__dirname, '..', 'server', 'db.json');
const FOTO_DIR = path.join(__dirname, '..', 'public', 'profil-fotograflari');

function indir(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'meba-teklif-sistemi/1.0' } }, (res) => {
      // Pravatar redirect ile foto verir; takip et
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const loc = res.headers.location;
        res.resume();
        return resolve(indir(loc.startsWith('http') ? loc : new URL(loc, url).toString()));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      }
      const parcalar = [];
      res.on('data', (b) => parcalar.push(b));
      res.on('end', () => resolve(Buffer.concat(parcalar)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function eskiSvgSil(userId) {
  // Aynı id için eski .svg veya .png varsa temizle (yeni .jpg gelecek)
  for (const ext of ['svg', 'png', 'webp']) {
    const yol = path.join(FOTO_DIR, `${userId}.${ext}`);
    try { if (fs.existsSync(yol)) fs.unlinkSync(yol); } catch { /* ignore */ }
  }
}

async function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  if (!fs.existsSync(FOTO_DIR)) fs.mkdirSync(FOTO_DIR, { recursive: true });

  const now = Date.now();
  const sonuclar = { yeni: 0, atlandi: 0, hata: 0 };

  for (const u of (db.kullanicilar || [])) {
    // Mevcut fotoğraf JPG/PNG/WEBP olarak duruyorsa dokunma; SVG ise yenile.
    const mevcutDosya = u.profilFotoUrl ? String(u.profilFotoUrl).split('?')[0].split('/').pop() : null;
    if (mevcutDosya) {
      const ext = mevcutDosya.split('.').pop().toLowerCase();
      const tamYol = path.join(FOTO_DIR, mevcutDosya);
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) && fs.existsSync(tamYol)) {
        sonuclar.atlandi += 1;
        continue;
      }
    }

    const seed = encodeURIComponent(u.id);
    const url  = `https://i.pravatar.cc/256?u=${seed}`;
    try {
      const buf = await indir(url);
      eskiSvgSil(u.id);
      const dosyaAdi = `${u.id}.jpg`;
      fs.writeFileSync(path.join(FOTO_DIR, dosyaAdi), buf);
      u.profilFotoUrl = `/profil-fotograflari/${dosyaAdi}?v=${now}`;
      u.profilFotoYuklemeTarihi = new Date().toISOString();
      sonuclar.yeni += 1;
      process.stdout.write(`  ✓ ${u.adSoyad.padEnd(22)} ${u.id} (${(buf.length / 1024).toFixed(1)} KB)\n`);
    } catch (err) {
      sonuclar.hata += 1;
      process.stdout.write(`  ✗ ${u.adSoyad.padEnd(22)} ${u.id} — ${err.message}\n`);
    }
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

  console.log(`\nFoto indirildi: ${sonuclar.yeni}`);
  console.log(`Mevcut korundu : ${sonuclar.atlandi}`);
  console.log(`Hata           : ${sonuclar.hata}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
