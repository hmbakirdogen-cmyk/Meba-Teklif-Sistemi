'use strict';

/**
 * Cariler için web'den logo arama scripti.
 *
 * Strateji (API key gerektirmez):
 *   1. Distinct ilk kelime → Türkçe karakterleri ASCII'ye çevir
 *   2. Domain tahmin: <name>.com.tr, www.<name>.com.tr, <name>.com
 *   3. HEAD request ile domain'in canlı olduğunu doğrula (5sn timeout)
 *   4. Logo kaynakları (denenme sırası):
 *        a. https://logo.clearbit.com/<domain>     (256x256 PNG, deprecated ama hâlâ çalışır)
 *        b. https://www.google.com/s2/favicons?domain=<domain>&sz=128
 *        c. https://icons.duckduckgo.com/ip3/<domain>.ico
 *   5. İlk 1KB+ ve geçerli image olanı kaydet
 *
 * Kullanım:
 *   node scripts/cari-logo-arama.cjs [limit=100] [--paralel=8]
 *
 * Mevcut logoUrl'i olan carilere DOKUNMAZ.
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');

const DB_PATH  = path.join(__dirname, '..', 'server', 'db.json');
const LOGO_DIR = path.join(__dirname, '..', 'public', 'cari-logolari');
const TIMEOUT  = 5000;
const MIN_BYTES = 1500;         // Google'ın "domain yok" globe ikonu ~700-1100 bytes
const MAX_BYTES = 600 * 1024;
const PARALEL  = parseInt((process.argv.find((a) => a.startsWith('--paralel=')) || '').split('=')[1] || '8', 10);
const LIMIT    = parseInt(process.argv.find((a) => /^\d+$/.test(a)) || '100', 10);
const TEKLIFLI = process.argv.includes('--teklifli');
const FIRMA_ID = ((process.argv.find((a) => a.startsWith('--firma=')) || '').split('=')[1] || '').trim() || null;

// Agresif stop-words: yanlış generic match'lere yol açan tüm kelimeler.
const STOP_WORDS = new Set([
  // Sektör/iş terimleri
  'ELEKTRIK', 'ELEKTRİK', 'MEKANIK', 'MEKANİK', 'OTOMASYON', 'MAKİNA', 'MAKİNE', 'MAKINA',
  'TESISAT', 'TESİSAT', 'ENDUSTRIYEL', 'ENDÜSTRİYEL', 'MUHENDISLIK', 'MÜHENDİSLİK',
  'HIDROLIK', 'HİDROLİK', 'PNOMATIK', 'PNÖMATİK', 'TEKNIK', 'TEKNİK', 'KONTROL',
  'PROSES', 'SAN', 'TIC', 'TİC', 'LTD', 'ŞTİ', 'STI', 'INS', 'İNŞ', 'VE',
  'GROUP', 'GRUP', 'INC', 'GMBH', 'CO', 'A.Ş', 'A.Ş.', 'AS', 'A.S.', 'CO.',
  'YENİLİKÇİ', 'YENILIKCI', 'VS', 'SAN.', 'TİC.', 'LTD.',
  // Yanlışa götüren generic iş terimleri (run'lardan öğrenildi)
  'TICARET', 'TİCARET', 'DANISMANLIK', 'DANIŞMANLIK', 'CENTER', 'ENTEGRE', 'PRECISION',
  'UNIVERSITESI', 'ÜNİVERSİTESİ', 'PERAKENDE', 'BOLGE', 'BÖLGE', 'YATAK', 'MERKEZ',
  'NAKLIYAT', 'OTOMOTIV', 'OTOMOTİV', 'BILGISAYAR', 'BİLGİSAYAR', 'BILISIM', 'BİLİŞİM',
  'GIDA', 'GİDA', 'AMBALAJ', 'REKLAM', 'KABLO', 'ESYA', 'EŞYA', 'MALZ', 'MALZEME',
  'MOTOR', 'KIMYA', 'KİMYA', 'ENDUSTRI', 'OFIS', 'OFİS', 'BUTIK', 'MARKET', 'BANKA',
  'MEDYA', 'MEDIKAL', 'MEDİKAL', 'MOBILYA', 'MOBİLYA', 'KONUT', 'INSAAT', 'İNŞAAT',
  'SAGLIK', 'SAĞLIK', 'BAKIM', 'TEMIZLIK', 'TEMİZLİK', 'PROFIL', 'PROFİL', 'BORU',
  'BANK', 'METAL', 'PLASTIK', 'PLASTİK', 'CELIK', 'ÇELİK', 'ENERJI', 'ENERJİ',
  'YAPI', 'TARIM', 'STAR', 'BEST', 'MEGA', 'ELIT', 'ELİT', 'ATLAS', 'ÖNCÜ', 'ONCU',
  'EGE', 'ANADOLU', 'CINAR', 'ÇINAR', 'ELEKTRONIK', 'ELEKTRONİK', 'SANAYI', 'SANAYİ',
  'ORGANIZE', 'ORGANİZE', 'FORM', 'FLAS', 'FLAŞ', 'SARAY', 'LIDER', 'LİDER',
  'BAYI', 'PAZAR', 'PAZARLAMA', 'HAYVANCILIK', 'YORGAN', 'EKMEK', 'ESYA',
  'AMORTISOR', 'AMORTİSÖR', 'ORMAN', 'TAAHHUT', 'TAAHÜT', 'DIS', 'DIŞ',
  'ILT', 'ILT.', 'SIS', 'SIS.', 'SISTEM', 'SİSTEM', 'PNÖM', 'ELK', 'ELKT',
  'ÜRÜN', 'ÜRÜNLERİ', 'URUN', 'URUNLERI', 'KOMPRESÖR', 'KOMPRESOR',
  'OTOM', 'OTOM.', 'ELEK', 'ELEK.', 'ELK.', 'ELKT.', 'OTO', 'BAP', 'BIRIMI',
  'BİRİMİ', 'MUDURLUGU', 'MÜDÜRLÜĞÜ', 'TES', 'TES.',
  // Türk yaygın özel adlar (firma sahibinin adı, brand değil)
  'HAMDI', 'HAMDİ', 'RECEP', 'MURAT', 'MEHMET', 'AHMET', 'MUSTAFA', 'FATIH', 'FATİH',
  'HASAN', 'ALI', 'ALİ', 'OSMAN', 'IBRAHIM', 'İBRAHİM', 'ENVER', 'HİDAYET', 'HIDAYET',
  'KEMAL', 'KENAN', 'EROL', 'METIN', 'METİN', 'NIHAT', 'NİHAT', 'TURGAY', 'CENGIZ', 'CENGİZ',
  'YASIN', 'YASİN', 'YAVUZ', 'YUSUF', 'ZAFER', 'BARIS', 'BARIŞ', 'CEM', 'EREN',
  'GOKHAN', 'GÖKHAN', 'SERHAT', 'TURAN', 'RAMAZAN', 'ERKAN', 'HAKAN',
]);

function turkishAsciify(s) {
  return String(s || '')
    .replace(/Ç/g, 'C').replace(/Ğ/g, 'G').replace(/İ/g, 'I')
    .replace(/Ö/g, 'O').replace(/Ş/g, 'S').replace(/Ü/g, 'U')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function distinctiveWords(firmaAdi) {
  const words = String(firmaAdi || '').toLocaleUpperCase('tr-TR').split(/[\s.,/]+/).filter(Boolean);
  return words.filter((w) => !STOP_WORDS.has(w) && w.length >= 3);
}

function distinctiveWord(firmaAdi) {
  const ws = distinctiveWords(firmaAdi);
  return ws.find((w) => w.length >= 5) || ws[0] || null;
}

/** Domain adayı: SADECE composite (iki distinct kelime birleşimi).
 *  Tek-kelime match'leri %50+ yanlış sonuç verdiği için tamamen kapatıldı.
 *  Kullanıcı tek-kelime brand'i (NIKE, IKEA) için elle yükleyebilir. */
function domainCandidates(firmaAdi) {
  const ws = distinctiveWords(firmaAdi).map(turkishAsciify).filter((w) => w.length >= 3);
  if (!ws[0] || !ws[1]) return [];
  const composite = ws[0] + ws[1];
  if (composite.length < 7) return [];   // çok kısa composite (TIPTIP gibi) gürültü
  return [composite];
}

function fetchBuffer(url, timeout = TIMEOUT) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    let resolved = false;
    const finish = (val) => { if (!resolved) { resolved = true; resolve(val); } };
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/png,image/*,*/*;q=0.5',
      },
      timeout,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).toString();
        return fetchBuffer(loc, timeout).then(finish);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return finish(null);
      }
      const ct = String(res.headers['content-type'] || '').toLowerCase();
      const parts = [];
      let total = 0;
      res.on('data', (c) => {
        total += c.length;
        if (total > MAX_BYTES) { res.destroy(); return finish(null); }
        parts.push(c);
      });
      res.on('end', () => finish({ buf: Buffer.concat(parts), contentType: ct }));
      res.on('error', () => finish(null));
    });
    req.on('error', () => finish(null));
    req.on('timeout', () => { req.destroy(); finish(null); });
  });
}

function headOk(url, timeout = TIMEOUT) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    let resolved = false;
    const finish = (v) => { if (!resolved) { resolved = true; resolve(v); } };
    const req = lib.request(url, { method: 'HEAD', timeout }, (res) => {
      // 200-399 say good (some sites 301 to www)
      finish(res.statusCode < 400);
      res.resume();
    });
    req.on('error', () => finish(false));
    req.on('timeout', () => { req.destroy(); finish(false); });
    req.end();
  });
}

/** HEAD bazı sunucularda bloklu — Clearbit logo isteğini doğrudan denemek yeter.
 *  Burada sadece domain candidate'ları dönüp Clearbit'e götürüyoruz. */
function fullDomainCandidates(name) {
  return [
    `${name}.com.tr`,
    `www.${name}.com.tr`,
    `${name}.com`,
    `www.${name}.com`,
  ];
}

function isImageContent(ct) {
  return ct.includes('image/');
}

function pickExt(ct) {
  if (ct.includes('png')) return 'png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('svg'))  return 'svg';
  if (ct.includes('icon') || ct.includes('ico')) return 'ico';
  return null;
}

/** Clearbit Logo API: domain'i bilmiyorsa 404 döner — bizim için ideal validator. */
async function tryClearbit(domain) {
  const r = await fetchBuffer(`https://logo.clearbit.com/${domain}`);
  if (!r) return null;
  if (!isImageContent(r.contentType)) return null;
  if (r.buf.length < MIN_BYTES) return null;
  const ext = pickExt(r.contentType);
  if (!ext) return null;
  return { ...r, ext, label: 'clearbit', domain };
}

/** Google favicon — domain çözülemiyorsa generic globe (~700-1100B) döner; MIN_BYTES filtreler. */
async function tryGoogleFavicon(domain) {
  const r = await fetchBuffer(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  if (!r) return null;
  if (!isImageContent(r.contentType)) return null;
  if (r.buf.length < MIN_BYTES) return null;
  const ext = pickExt(r.contentType);
  if (!ext) return null;
  return { ...r, ext, label: 'google', domain };
}

async function processCari(cari, db, sayim) {
  if (cari.logoUrl) { sayim.atlandi++; return false; }
  const adlar = domainCandidates(cari.firmaAdi);
  if (adlar.length === 0) { sayim.kelimeYok++; return false; }

  let buldum = null;
  let denenenDomain = null;

  outer: for (const ad of adlar) {
    for (const fullDomain of fullDomainCandidates(ad)) {
      // Önce Clearbit (eğer domain biliniyorsa kaliteli logo döner)
      const cb = await tryClearbit(fullDomain);
      if (cb) { buldum = cb; denenenDomain = fullDomain; break outer; }
    }
  }

  // Clearbit'te yoksa Google favicon — sadece .com.tr ve .com için (gürültüyü azaltmak için)
  if (!buldum) {
    outer: for (const ad of adlar) {
      for (const fullDomain of [`${ad}.com.tr`, `${ad}.com`]) {
        const gf = await tryGoogleFavicon(fullDomain);
        if (gf) { buldum = gf; denenenDomain = fullDomain; break outer; }
      }
    }
  }

  if (!buldum) { sayim.logoYok++; return false; }

  const safeId = String(cari.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  for (const e of ['svg', 'png', 'jpg', 'jpeg', 'webp', 'ico']) {
    const eski = path.join(LOGO_DIR, `${safeId}.${e}`);
    try { if (fs.existsSync(eski)) fs.unlinkSync(eski); } catch { /* ignore */ }
  }
  const dosyaAdi = `${safeId}.${buldum.ext}`;
  fs.writeFileSync(path.join(LOGO_DIR, dosyaAdi), buldum.buf);
  cari.logoUrl = `/cari-logolari/${dosyaAdi}?v=${Date.now()}`;
  cari.logoSourceDomain = denenenDomain;
  cari.logoSourceLabel  = buldum.label;
  cari.logoYuklemeTarihi = new Date().toISOString();
  cari.guncellemeTarihi = new Date().toISOString();
  cari.updatedBy = 'script:cari-logo-arama';
  cari.lastSyncedAt = new Date().toISOString();
  sayim.basarili++;
  console.log(`  ✓ ${cari.firmaAdi.slice(0, 38).padEnd(38)} → ${denenenDomain.padEnd(28)} [${buldum.label}, ${(buldum.buf.length / 1024).toFixed(1)}KB]`);
  return true;
}

async function runPool(items, fn, paralel) {
  let i = 0;
  const workers = Array.from({ length: paralel }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { await fn(items[idx], idx); } catch (e) { /* swallow */ }
    }
  });
  await Promise.all(workers);
}

async function main() {
  if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

  // Filtre: logosu olmayan + distinct kelimesi olan
  let adayPool = db.cariler.filter((c) => !c.logoUrl && domainCandidates(c.firmaAdi).length > 0);

  // --firma=meba: sadece o firmaya ait cariler
  if (FIRMA_ID) {
    adayPool = adayPool.filter((c) => c.firmaId === FIRMA_ID);
    console.log(`Mod: --firma=${FIRMA_ID}`);
  }

  // --teklifli: sadece teklifte geçen cariler
  if (TEKLIFLI) {
    const teklifliIds = new Set();
    for (const t of (db.teklifler || [])) {
      if (t.cari && t.cari.id) teklifliIds.add(t.cari.id);
    }
    adayPool = adayPool.filter((c) => teklifliIds.has(c.id));
    console.log(`Mod: --teklifli (sadece teklif yazılan cariler)`);
  }

  const adaylar = adayPool.slice(0, LIMIT);

  console.log(`Aday: ${adaylar.length} / havuz ${adayPool.length} (limit=${LIMIT}, paralel=${PARALEL})\n`);

  const sayim = { basarili: 0, atlandi: 0, kelimeYok: 0, kisaKelime: 0, domainYok: 0, logoYok: 0 };

  // Periyodik save (her 25 başarılı bulguda kaydet)
  let kaydedilenSayim = 0;
  const periyodikKaydet = setInterval(() => {
    if (sayim.basarili !== kaydedilenSayim) {
      try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8'); kaydedilenSayim = sayim.basarili; }
      catch (e) { /* ignore */ }
    }
  }, 5000);

  const t0 = Date.now();
  await runPool(adaylar, (c) => processCari(c, db, sayim), PARALEL);
  clearInterval(periyodikKaydet);
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

  const sn = Math.round((Date.now() - t0) / 1000);
  console.log(`\nTamamlandı (${sn}sn).`);
  console.log(`  Başarılı   : ${sayim.basarili}  (%${(sayim.basarili / adaylar.length * 100).toFixed(1)})`);
  console.log(`  Domain yok : ${sayim.domainYok}`);
  console.log(`  Logo yok   : ${sayim.logoYok}`);
  console.log(`  Kısa kelime: ${sayim.kisaKelime}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
