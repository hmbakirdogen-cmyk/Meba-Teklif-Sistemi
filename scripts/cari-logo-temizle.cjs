'use strict';

/**
 * Otomatik logo aramasının yanlış sonuçlarını temizler.
 *
 * Kural: cari.updatedBy === 'script:cari-logo-arama' olan kayıtlar için
 *   - Cari adından eşlenen domain'i yeniden hesapla
 *   - Domain "subject"i generic stop listede ise → logo dosyasını ve logoUrl'i sil
 *   - Composite (iki distinct kelime birleşik) ise → güvenli kabul et, tut
 *   - Tek kelime ama distinctive ise → tut
 */

const fs = require('fs');
const path = require('path');

const DB_PATH  = path.join(__dirname, '..', 'server', 'db.json');
const LOGO_DIR = path.join(__dirname, '..', 'public', 'cari-logolari');

// Asıl wordmark stop-words + script aramasında yanlışa götüren generic kelimeler.
const HARD_STOPS = new Set([
  // Sektör/iş terimleri (orijinal)
  'ELEKTRIK', 'ELEKTRİK', 'MEKANIK', 'MEKANİK', 'OTOMASYON', 'MAKİNA', 'MAKİNE', 'MAKINA',
  'TESISAT', 'TESİSAT', 'ENDUSTRIYEL', 'ENDÜSTRİYEL', 'MUHENDISLIK', 'MÜHENDİSLİK',
  'HIDROLIK', 'HİDROLİK', 'PNOMATIK', 'PNÖMATİK', 'TEKNIK', 'TEKNİK', 'KONTROL',
  'PROSES', 'SAN', 'TIC', 'TİC', 'LTD', 'ŞTİ', 'STI', 'INS', 'İNŞ', 'VE',
  'GROUP', 'GRUP', 'INC', 'GMBH', 'CO',
  // Yanlışa götüren generic kelimeler (script run'larından öğrenildi)
  'TICARET', 'TİCARET', 'DANISMANLIK', 'DANIŞMANLIK', 'CENTER', 'ENTEGRE', 'PRECISION',
  'UNIVERSITESI', 'ÜNİVERSİTESİ', 'PERAKENDE', 'BOLGE', 'BÖLGE', 'YATAK', 'MERKEZ',
  'NAKLIYAT', 'OTOMOTIV', 'OTOMOTİV', 'BILGISAYAR', 'BİLGİSAYAR', 'BILISIM', 'BİLİŞİM',
  'GIDA', 'GİDA', 'AMBALAJ', 'REKLAM', 'KABLO', 'ESYA', 'EŞYA', 'MALZ', 'MOTOR',
  'KIMYA', 'KİMYA', 'ENDUSTRI', 'OFIS', 'OFİS', 'BUTIK', 'MARKET', 'BANKA',
  'MEDYA', 'MEDIKAL', 'MEDİKAL', 'MOBILYA', 'MOBİLYA', 'KONUT', 'INSAAT', 'İNŞAAT',
  'SAGLIK', 'SAĞLIK', 'BAKIM', 'TEMIZLIK', 'TEMİZLİK', 'PROFIL', 'PROFİL', 'BORU',
  'BANK', 'METAL', 'PLASTIK', 'PLASTİK', 'CELIK', 'ÇELİK', 'ENERJI', 'ENERJİ',
  'YAPI', 'TARIM', 'STAR', 'BEST', 'MEGA', 'ELIT', 'ELİT', 'ATLAS', 'ÖNCÜ', 'ONCU',
  'EGE', 'ANADOLU', 'ÇINAR', 'CINAR', 'ELEKTRONIK', 'ELEKTRONİK', 'SANAYI', 'SANAYİ',
  'ORGANIZE', 'ORGANİZE', 'FORM', 'FLAS', 'FLAŞ',
  // İsim/özad olarak geçen ama firma kimliği taşımayanlar
  'HAMDI', 'HAMDİ', 'RECEP', 'MURAT', 'MEHMET', 'AHMET', 'MUSTAFA', 'FATIH', 'FATİH',
  'HASAN', 'ALI', 'ALİ', 'OSMAN', 'IBRAHIM', 'İBRAHİM', 'ENVER', 'HIDAYET',
  'KEMAL', 'KENAN', 'EROL', 'METIN', 'METİN', 'NIHAT', 'NİHAT', 'TURGAY',
  'YASIN', 'YASİN', 'YAVUZ', 'YUSUF', 'ZAFER', 'BARIS', 'BARIŞ', 'CEM', 'EREN',
  'GOKHAN', 'GÖKHAN', 'SERHAT', 'TURAN', 'RAMAZAN', 'CENGIZ', 'CENGİZ',
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
  return words.filter((w) => !HARD_STOPS.has(w) && w.length >= 3);
}

function olasiDomainKelimesi(firmaAdi) {
  const ws = distinctiveWords(firmaAdi).map(turkishAsciify).filter((w) => w.length >= 3);
  // Sırayla: composite (1+2), tek 1
  if (ws[0] && ws[1]) {
    return { tip: 'composite', kelime: ws[0] + ws[1], birinci: ws[0], ikinci: ws[1] };
  }
  if (ws[0] && ws[0].length >= 5) {
    return { tip: 'tek', kelime: ws[0], birinci: ws[0] };
  }
  return null;
}

function logoFileFor(cari) {
  if (!cari.logoUrl) return null;
  const filename = String(cari.logoUrl).split('?')[0].split('/').pop();
  return filename ? path.join(LOGO_DIR, filename) : null;
}

function silLogo(cari) {
  const file = logoFileFor(cari);
  if (file) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch { /* ignore */ }
  }
  delete cari.logoUrl;
  delete cari.logoYuklemeTarihi;
  cari.guncellemeTarihi = new Date().toISOString();
  cari.lastSyncedAt = new Date().toISOString();
}

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const sayim = { silindi: 0, korundu: 0, kelimeYok: 0 };
const silinenler = [];
const korunanlar = [];

for (const cari of db.cariler) {
  if (cari.updatedBy !== 'script:cari-logo-arama') continue;

  const tahmin = olasiDomainKelimesi(cari.firmaAdi);
  if (!tahmin) {
    silinenler.push({ ad: cari.firmaAdi, sebep: 'distinct kelime yok' });
    silLogo(cari);
    sayim.silindi++;
    sayim.kelimeYok++;
    continue;
  }

  // Composite match → güvenli, tut
  if (tahmin.tip === 'composite') {
    korunanlar.push({ ad: cari.firmaAdi, dom: tahmin.kelime + '.com.tr' });
    sayim.korundu++;
    continue;
  }

  // Tek kelime → uzunluk + extra check (HARD_STOPS zaten filtre etti, kaldıysa OK)
  if (tahmin.tip === 'tek' && tahmin.kelime.length >= 5) {
    korunanlar.push({ ad: cari.firmaAdi, dom: tahmin.kelime + '.com.tr' });
    sayim.korundu++;
    continue;
  }

  silinenler.push({ ad: cari.firmaAdi, sebep: 'tek kelime <5 harf veya generic' });
  silLogo(cari);
  sayim.silindi++;
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log(`SİLİNEN (${sayim.silindi}):`);
silinenler.forEach((s) => console.log(`  ✗ ${s.ad.slice(0, 50).padEnd(50)} (${s.sebep})`));
console.log(`\nKORUNAN (${sayim.korundu}):`);
korunanlar.forEach((k) => console.log(`  ✓ ${k.ad.slice(0, 50).padEnd(50)} → ${k.dom}`));
console.log(`\nÖzet: ${sayim.korundu} doğru görünen logo korundu, ${sayim.silindi} şüpheli silindi.`);
