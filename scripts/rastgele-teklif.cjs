'use strict';

/**
 * Tüm aktif kullanıcılara rastgele teklif üretir.
 * - Eksik firmalara (ELMOS, MESA) yeterli cari & ürün üretir
 * - Her aktif kullanıcıya 3-8 teklif atar (kendi firmasına)
 * - teklifNo: YYMM-NNN; per-firma sayaç (db.sayaclar) güncellenir
 * - durum/status/visibility/paraBirimi/satır içeriği rastgele ama tutarlı
 *
 * Kullanım:  node scripts/rastgele-teklif.cjs [minTeklifPerUser=3] [maxTeklifPerUser=8]
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');

// ── CLI ─────────────────────────────────────────────────────────────────────
const MIN_PER_USER = Math.max(1, parseInt(process.argv[2] || '3', 10));
const MAX_PER_USER = Math.max(MIN_PER_USER, parseInt(process.argv[3] || '8', 10));

// ── Veri havuzları ──────────────────────────────────────────────────────────
const FIRMA_TIPLERI = ['SAN. VE TİC. LTD. ŞTİ.', 'SAN. VE TİC. A.Ş.', 'MAKİNA SAN. LTD. ŞTİ.', 'MÜHENDİSLİK A.Ş.', 'OTOMASYON LTD.'];
const SEKTOR_KELIME = ['ENDÜSTRİYEL', 'TEKNİK', 'MEKANİK', 'OTOMASYON', 'ELEKTRİK', 'MAKİNA', 'TESİSAT', 'PNÖMATİK', 'HİDROLİK', 'KONTROL', 'PROSES', 'YENİLİKÇİ', 'ATLAS', 'ÖNCÜ', 'ELİT', 'STAR', 'EGE', 'ANADOLU', 'BAŞARI', 'ÇINAR'];
const ILLER = ['İSTANBUL', 'ANKARA', 'İZMİR', 'BURSA', 'KOCAELİ', 'KAYSERİ', 'KONYA', 'GAZİANTEP', 'ADANA', 'MERSİN'];
const YETKILI_ADI = ['Mehmet Çınar', 'Ahmet Yılmaz', 'Hasan Demir', 'Ali Şen', 'Mustafa Kaya', 'Selim Aydın', 'Murat Tekin', 'Cem Polat', 'Volkan Kara', 'Tolga Şahin', 'Fatih Aslan', 'Kerem Doğan', 'Onur Çetin', 'Burak Güneş', 'Berk Akın'];

const URUN_KATEGORI = ['Silindir', 'Valf', 'Sensör', 'Filtre', 'Konnektör', 'Hortum', 'Regülatör', 'Manometre', 'Yağlayıcı', 'Susturucu', 'Kavrama', 'Bobin', 'Şartlandırıcı', 'Aktüatör'];
const URUN_MARKA = ['SMC', 'FESTO', 'CAMOZZI', 'BURKERT', 'PARKER', 'AIRTAC', 'METAL WORK', 'NORGREN'];
const URUN_BIRIM = ['Adet', 'Set', 'Metre', 'Kg'];

const ODEME_VADESI = ['Peşin', '15 Gün', '30 Gün', '45 Gün', '60 Gün', '90 Gün'];
const TESLIM_SURESI = ['Stoktan', '1 Hafta', '2 Hafta', '3-4 Hafta', '4-6 Hafta'];
const GECERLILIK = ['1 Hafta', '15 Gün', '30 Gün'];
const PARA_BIRIMI = ['TRY', 'EUR', 'USD'];
const TEKLIF_DURUM = ['taslak', 'hazir', 'gonderildi', 'onaylandi', 'iptal'];
const TEKLIF_STATUS = ['taslak', 'kaydedildi', 'gonderildi'];
const VISIBILITY = ['private', 'team'];
const KDV_ORANLARI = [0, 10, 20];

// ── Yardımcılar ─────────────────────────────────────────────────────────────
const rng = () => Math.random();
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const pickWeighted = (arr, weights) => {
  const t = weights.reduce((a, b) => a + b, 0);
  let r = rng() * t;
  for (let i = 0; i < arr.length; i += 1) { r -= weights[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
};
const intBetween = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
const round2 = (n) => Math.round(n * 100) / 100;

function shortId(prefix) {
  return prefix + crypto.randomBytes(5).toString('hex');
}

function tarihGecmis(maxGunOnce = 90) {
  const d = new Date();
  d.setDate(d.getDate() - intBetween(0, maxGunOnce));
  return d;
}

function isoDate(d) { return d.toISOString().slice(0, 10); }

// ── Cari / ürün üretimi (eksik firmalar için) ────────────────────────────────
function uretCari(firmaId, idx) {
  const ad   = `${pick(SEKTOR_KELIME)} ${pick(SEKTOR_KELIME)} ${pick(FIRMA_TIPLERI)}`;
  const il   = pick(ILLER);
  const tel  = `0${intBetween(212, 555)} ${intBetween(100, 999)} ${intBetween(10, 99)} ${intBetween(10, 99)}`;
  const num  = String(idx).padStart(4, '0');
  return {
    id: shortId('c-'),
    cariKod: `${firmaId.toUpperCase()}-${num}`,
    firmaAdi: ad,
    yetkiliKisi: pick(YETKILI_ADI),
    telefon: tel,
    ePosta: '',
    adres: il,
    vergiDairesi: '',
    vergiNo: '',
    firmaId,
  };
}

function uretUrun(firmaId, idx) {
  const kat   = pick(URUN_KATEGORI);
  const marka = pick(URUN_MARKA);
  const kod   = `${marka.slice(0, 3).toUpperCase()}-${intBetween(100, 9999)}`;
  const fiyat = round2(intBetween(15, 4500) + rng());
  return {
    id: shortId('u-'),
    urunKod: kod,
    urunAdi: `${marka} ${kat} ${intBetween(8, 200)}mm`,
    aciklama: `${kat} · ${marka} markalı endüstriyel ürün`,
    kategori: kat,
    birim: pick(URUN_BIRIM),
    varsayilanFiyat: fiyat,
    firmaId,
    version: 1,
    deviceId: 'script:rastgele-teklif',
    updatedBy: 'script:rastgele-teklif',
    lastSyncedAt: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString(),
  };
}

// ── Sayaç (teklifNo) ────────────────────────────────────────────────────────
function sonrakiTeklifNo(db, firmaId, tarih) {
  if (!db.sayaclar || typeof db.sayaclar !== 'object') db.sayaclar = {};
  const yil = tarih.getFullYear();
  const ay  = tarih.getMonth() + 1;
  if (!db.sayaclar[firmaId]) db.sayaclar[firmaId] = { yil, ay, deger: 0 };
  const s = db.sayaclar[firmaId];
  if (s.yil !== yil || s.ay !== ay) { s.yil = yil; s.ay = ay; s.deger = 0; }
  s.deger += 1;
  const yy = String(yil).slice(-2);
  const mm = String(ay).padStart(2, '0');
  return `${yy}${mm}-${String(s.deger).padStart(3, '0')}`;
}

// ── Satır üretimi ───────────────────────────────────────────────────────────
function uretSatirlar(urunler, paraBirimi) {
  const adet = intBetween(2, 12);
  const satirlar = [];
  for (let i = 0; i < adet; i += 1) {
    const u = pick(urunler);
    const miktar = intBetween(1, 50);
    const fiyat  = round2(u.varsayilanFiyat * (0.85 + rng() * 0.4)); // ±%20 dalga
    const indirim = pickWeighted([0, 5, 10, 15, 20], [60, 15, 12, 8, 5]);
    const satirToplami = round2(miktar * fiyat * (1 - indirim / 100));
    satirlar.push({
      id: shortId('s-'),
      marka: pick(URUN_MARKA),
      urunKod: u.urunKod,
      urunAdi: u.urunAdi,
      aciklama: u.aciklama || '',
      paraBirimi,
      miktar,
      birim: u.birim || 'Adet',
      birimFiyat: fiyat,
      indirimOrani: indirim,
      teslimTarihi: pick(TESLIM_SURESI),
      satirToplami,
      rowHeight: 22,
    });
  }
  return satirlar;
}

// ── Teklif üretimi ──────────────────────────────────────────────────────────
function uretTeklif(db, kullanici, cariler, urunler) {
  const tarihD = tarihGecmis(120);
  const paraBirimi = pickWeighted(PARA_BIRIMI, [50, 35, 15]);
  const cari = pick(cariler);
  const cariSnap = {
    id: cari.id,
    cariKod: cari.cariKod,
    firmaAdi: cari.firmaAdi,
    yetkiliKisi: cari.yetkiliKisi || '',
    telefon: cari.telefon || '',
    ePosta: cari.ePosta || '',
    adres: cari.adres || '',
    vergiDairesi: cari.vergiDairesi || '',
    vergiNo: cari.vergiNo || '',
  };
  const satirlar = uretSatirlar(urunler, paraBirimi);
  const araToplam = round2(satirlar.reduce((acc, s) => acc + s.miktar * s.birimFiyat, 0));
  const toplamIndirim = round2(satirlar.reduce((acc, s) => acc + s.miktar * s.birimFiyat * (s.indirimOrani / 100), 0));
  const kdvOrani = pick(KDV_ORANLARI);
  const iskontoOrani = pickWeighted([0, 5, 10], [70, 20, 10]);
  const aradanSonra = round2(araToplam - toplamIndirim);
  const ekIskonto = round2(aradanSonra * (iskontoOrani / 100));
  const kdvMatrah = round2(aradanSonra - ekIskonto);
  const toplamVergi = round2(kdvMatrah * (kdvOrani / 100));
  const genelToplam = round2(kdvMatrah + toplamVergi);
  const teklifNo = sonrakiTeklifNo(db, kullanici.firmaId, tarihD);

  const yetkili = (cari.yetkiliKisi || pick(YETKILI_ADI)).split(' ')[0] || 'YETKİLİ';
  const olus = new Date(tarihD.getTime());
  olus.setHours(intBetween(8, 18), intBetween(0, 59), 0, 0);

  return {
    id: shortId('t-'),
    teklifNo,
    tarih: isoDate(tarihD),
    satirBazliParaBirimi: false,
    satirBazliIskonto: false,
    paraBirimi,
    durum: pickWeighted(TEKLIF_DURUM, [25, 30, 25, 15, 5]),
    cari: cariSnap,
    satirlar,
    araToplam,
    toplamIndirim: round2(toplamIndirim + ekIskonto),
    toplamVergi,
    genelToplam,
    kdvOrani,
    iskontoOrani,
    odemeVadesi: pick(ODEME_VADESI),
    teslimSuresi: pick(TESLIM_SURESI),
    gecerlilikSuresi: pick(GECERLILIK),
    notlar: rng() < 0.25 ? 'Fiyatlarımıza KDV dahil değildir. Stok durumumuza göre teslimat süreleri değişebilir.' : '',
    notlarGosterilsin: false,
    olusturmaTarihi: olus.toISOString(),
    guncellemeTarihi: olus.toISOString(),
    hazirlayanKullaniciId: kullanici.id,
    hazirlayanAdSoyad: kullanici.adSoyad,
    hazirlayanRol: kullanici.rol,
    hazirlayanUnvan: kullanici.unvan || '',
    contactName: yetkili.toLocaleUpperCase('tr-TR'),
    contactTitle: pick(['BEY', 'HANIM']),
    status: pickWeighted(TEKLIF_STATUS, [40, 45, 15]),
    visibility: pickWeighted(VISIBILITY, [35, 65]),
    firmaId: kullanici.firmaId,
    version: 1,
    deviceId: 'script:rastgele-teklif',
    updatedBy: kullanici.id,
    lastSyncedAt: new Date().toISOString(),
  };
}

// ── Ana akış ────────────────────────────────────────────────────────────────
function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  if (!Array.isArray(db.teklifler)) db.teklifler = [];
  if (!Array.isArray(db.cariler))   db.cariler = [];
  if (!Array.isArray(db.urunler))   db.urunler = [];
  if (!Array.isArray(db.auditLog))  db.auditLog = [];

  // Eksik firmalara cari/urun seed
  const HEDEF_CARI_MIN = 60;
  const HEDEF_URUN_MIN = 40;
  for (const firma of db.firmalar) {
    const mevcutCari = db.cariler.filter((c) => c.firmaId === firma.id).length;
    const mevcutUrun = db.urunler.filter((u) => u.firmaId === firma.id).length;
    const eksikCari = Math.max(0, HEDEF_CARI_MIN - mevcutCari);
    const eksikUrun = Math.max(0, HEDEF_URUN_MIN - mevcutUrun);
    for (let i = 0; i < eksikCari; i += 1) {
      db.cariler.push(uretCari(firma.id, mevcutCari + i + 1));
    }
    for (let i = 0; i < eksikUrun; i += 1) {
      db.urunler.push(uretUrun(firma.id, mevcutUrun + i + 1));
    }
    if (eksikCari || eksikUrun) {
      console.log(`  + ${firma.id}: ${eksikCari} cari, ${eksikUrun} ürün eklendi`);
    }
  }

  const aktifler = db.kullanicilar.filter((u) => u.aktifMi && u.firmaId);
  const cariMap = {};
  const urunMap = {};
  for (const f of db.firmalar) {
    cariMap[f.id] = db.cariler.filter((c) => c.firmaId === f.id);
    urunMap[f.id] = db.urunler.filter((u) => u.firmaId === f.id);
  }

  let toplamTeklif = 0;
  const sayim = {};
  for (const u of aktifler) {
    const adet = intBetween(MIN_PER_USER, MAX_PER_USER);
    const cariler = cariMap[u.firmaId];
    const urunler = urunMap[u.firmaId];
    if (!cariler.length || !urunler.length) {
      console.log(`  ! ${u.kullaniciAdi} atlandi (${u.firmaId} cari/urun yok)`);
      continue;
    }
    for (let i = 0; i < adet; i += 1) {
      const t = uretTeklif(db, u, cariler, urunler);
      db.teklifler.push(t);
      toplamTeklif += 1;
    }
    sayim[u.firmaId] = (sayim[u.firmaId] || 0) + adet;
  }

  db.auditLog.push({
    zaman: new Date().toISOString(),
    eylem: 'rastgele_teklif_seed',
    kullaniciId: null,
    kullaniciAdi: 'script:rastgele-teklif',
    firmaId: null,
    detay: { toplamTeklif, kullaniciSayisi: aktifler.length, sayim },
  });
  if (db.auditLog.length > 5000) db.auditLog = db.auditLog.slice(-5000);

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

  console.log(`\nToplam üretilen teklif: ${toplamTeklif}`);
  console.log('Firma dağılımı:');
  for (const f of db.firmalar) {
    console.log(`  ${f.ad}: ${sayim[f.id] || 0}`);
  }
  console.log(`\nDB toplam teklif: ${db.teklifler.length}`);
}

main();
