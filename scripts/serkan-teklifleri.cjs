'use strict';

/**
 * Serkan Arslan'a 100 teklif seed eder + şifresini varsayılana (123456) çeker
 * → kullanıcı giriş yapıp Serkan'ın "Benim Tekliflerim" tab'ında 100 teklifi görür.
 *
 * - Hazırlayan: Serkan Arslan (u-903c68e1, firmaId=meba)
 * - Cariler: MEBA carileri (logosu olanları öncelikle, yoksa rastgele)
 * - Ürünler: MEBA ürünleri
 * - Tarihler: son 12 ay
 * - durum/sonuc/paraBirimi karışık
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword } = require('../server/auth-helper.cjs');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');

const SERKAN_ID = 'u-903c68e1';
const HEDEF_ADET = 100;

const ODEME_VADESI = ['Peşin', '15 Gün', '30 Gün', '45 Gün', '60 Gün', '90 Gün'];
const TESLIM_SURESI = ['Stoktan', '1 Hafta', '2 Hafta', '3-4 Hafta', '4-6 Hafta'];
const GECERLILIK = ['1 Hafta', '15 Gün', '30 Gün'];
const PARA_BIRIMI = ['TRY', 'EUR', 'USD'];
const KDV_ORANLARI = [0, 10, 20];
const TEKLIF_DURUM = ['taslak', 'hazir', 'gonderildi', 'onaylandi', 'iptal'];
const TEKLIF_STATUS = ['taslak', 'kaydedildi', 'gonderildi'];
const VISIBILITY = ['private', 'team'];
const SONUC_DAGILIM = ['kazanildi', 'kaybedildi', 'iptal', 'beklemede', null];
const SEBEPLER = ['fiyat', 'rakip', 'zaman', 'ihtiyac_yok', 'diger'];
const RAKIPLER = ['Ar Otomasyon', 'Pnomatik A.Ş.', 'Endüstri Sistemleri', 'Mertaş Mekanik', 'Doğa Hidrolik'];
const URUN_MARKALARI = ['SMC', 'FESTO', 'CAMOZZI', 'AIRTAC', 'PARKER'];

const NOT_KAZANILDI = [
  'Müşteri 30 günlük vade ile sipariş verdi.',
  'Toplantıda iyi geçti, fiyat avantajımız kapattı.',
  'Mevcut sistemden memnun değiller, hızlı geçtiler.',
  'Tekrar siparişi de bizden alacaklar, ilişki güçlü.',
  'Mühendislik kabul, satınalma onayı bugün geldi.',
];
const NOT_KAYBEDILDI = [
  'Rakipte 8% daha ucuz teklif olmuş.',
  'Müşteri proje süresini uzattı, başka tedarikçi aldı.',
  'Bütçe daraltıldı, 2026 sonuna ertelendi.',
  'Eski tedarikçileri ile sözleşme uzatmış.',
  'Teknik şartname uymadı, alternatif marka istediler.',
];
const NOT_IPTAL = [
  'Müşteri yatırımı durdurdu.',
  'Proje iptal edildi, sipariş açılmadı.',
];

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
const shortId = (prefix) => prefix + crypto.randomBytes(5).toString('hex');

function tarihGecmis(maxGunOnce) {
  const d = new Date();
  d.setDate(d.getDate() - intBetween(0, maxGunOnce));
  d.setHours(intBetween(8, 18), intBetween(0, 59), 0, 0);
  return d;
}

function uretSatirlar(urunler, paraBirimi) {
  const adet = intBetween(3, 14);
  const satirlar = [];
  for (let i = 0; i < adet; i += 1) {
    const u = pick(urunler);
    const miktar = intBetween(1, 50);
    const fiyat = round2((u.varsayilanFiyat || 100) * (0.85 + rng() * 0.4));
    const indirim = pickWeighted([0, 5, 10, 15, 20], [60, 15, 12, 8, 5]);
    const satirToplami = round2(miktar * fiyat * (1 - indirim / 100));
    satirlar.push({
      id: shortId('s-'),
      marka: pick(URUN_MARKALARI),
      urunKod: u.urunKod || '',
      urunAdi: u.urunAdi || '',
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

function teklifNoUret(sayaclarTracker, tarih) {
  const yil = tarih.getFullYear();
  const ay = tarih.getMonth() + 1;
  const key = `${yil}-${ay}`;
  if (!sayaclarTracker[key]) sayaclarTracker[key] = 0;
  sayaclarTracker[key] += 1;
  const yy = String(yil).slice(-2);
  const mm = String(ay).padStart(2, '0');
  return `${yy}${mm}-${String(sayaclarTracker[key]).padStart(3, '0')}`;
}

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const serkan = db.kullanicilar.find((u) => u.id === SERKAN_ID);
if (!serkan) {
  console.error('Serkan Arslan bulunamadı.');
  process.exit(1);
}

// Şifresini varsayılana çek (123456)
serkan.sifreHash = hashPassword('123456');
serkan.mustChangePassword = false;
serkan.sifreDegisikligi = new Date().toISOString();

// Mevcut teklif numaralarındaki kullanılmış sayaçları topla → çakışma yok
const sayaclarTracker = {};
for (const t of (db.teklifler || [])) {
  const m = /^(\d{2})(\d{2})-(\d{3})$/.exec(t.teklifNo || '');
  if (!m) continue;
  const yy = parseInt(m[1], 10);
  const yil = 2000 + yy;
  const ay = parseInt(m[2], 10);
  const seq = parseInt(m[3], 10);
  const key = `${yil}-${ay}`;
  if (!sayaclarTracker[key] || sayaclarTracker[key] < seq) sayaclarTracker[key] = seq;
}

// MEBA cariler — logosu olanları önceliklendir, hepsi yeterse 100 teklif kapsar
const mebaCariler = db.cariler.filter((c) => c.firmaId === 'meba' && !c.deletedAt);
const logoluCariler = mebaCariler.filter((c) => c.logoUrl);
const cariHavuzu = logoluCariler.length >= 30 ? logoluCariler : mebaCariler;
console.log(`Cari havuzu: ${cariHavuzu.length} (logolu: ${logoluCariler.length}, MEBA toplam: ${mebaCariler.length})`);

// MEBA ürünleri — tombstone (deletedAt) işaretli olanlar dahil edilir
// (eski snapshot olarak satır içeriği yine geçerli, "soft-delete" sadece liste UI'ı içindir)
const mebaUrunler = db.urunler.filter((u) => u.firmaId === 'meba');
if (mebaUrunler.length === 0) {
  console.error('MEBA ürünü yok, çıkılıyor.');
  process.exit(1);
}
console.log(`Ürün havuzu: ${mebaUrunler.length}`);

const yeniler = [];
for (let i = 0; i < HEDEF_ADET; i += 1) {
  const tarihD = tarihGecmis(360);
  const paraBirimi = pickWeighted(PARA_BIRIMI, [55, 30, 15]);
  const cari = pick(cariHavuzu);
  const cariSnap = {
    id: cari.id,
    cariKod: cari.cariKod || '',
    firmaAdi: cari.firmaAdi || '',
    yetkiliKisi: cari.yetkiliKisi || '',
    telefon: cari.telefon || '',
    ePosta: cari.ePosta || '',
    adres: cari.adres || '',
    vergiDairesi: cari.vergiDairesi || '',
    vergiNo: cari.vergiNo || '',
  };
  const satirlar = uretSatirlar(mebaUrunler, paraBirimi);
  const araToplam = round2(satirlar.reduce((acc, s) => acc + s.miktar * s.birimFiyat, 0));
  const toplamIndirim = round2(satirlar.reduce((acc, s) => acc + s.miktar * s.birimFiyat * (s.indirimOrani / 100), 0));
  const kdvOrani = pick(KDV_ORANLARI);
  const iskontoOrani = pickWeighted([0, 5, 10], [70, 20, 10]);
  const aradanSonra = round2(araToplam - toplamIndirim);
  const ekIskonto = round2(aradanSonra * (iskontoOrani / 100));
  const kdvMatrah = round2(aradanSonra - ekIskonto);
  const toplamVergi = round2(kdvMatrah * (kdvOrani / 100));
  const genelToplam = round2(kdvMatrah + toplamVergi);
  const teklifNo = teklifNoUret(sayaclarTracker, tarihD);

  // durum dağılımı: çoğunluk gönderilen/onaylanan (Serkan satışçı, çok aktif)
  const durum = pickWeighted(TEKLIF_DURUM, [10, 15, 35, 25, 15]);
  // sonuç dağılımı (durum'la korelasyonlu)
  let sonuc = null;
  if (durum === 'gonderildi' || durum === 'onaylandi') {
    sonuc = pickWeighted(['kazanildi', 'kaybedildi', 'iptal', 'beklemede'], [40, 30, 8, 22]);
  } else if (durum === 'iptal') {
    sonuc = 'iptal';
  } else {
    sonuc = pickWeighted(['beklemede', null], [40, 60]);
  }

  // sonuc notu (% ile)
  let sonucNotu;
  if (sonuc === 'kazanildi' && rng() < 0.6) sonucNotu = pick(NOT_KAZANILDI);
  if (sonuc === 'kaybedildi' && rng() < 0.7) sonucNotu = pick(NOT_KAYBEDILDI);
  if (sonuc === 'iptal' && rng() < 0.5) sonucNotu = pick(NOT_IPTAL);

  const yetkili = (cari.yetkiliKisi || 'Yetkili').split(' ')[0] || 'YETKILI';

  const yeniTeklif = {
    id: shortId('t-'),
    teklifNo,
    tarih: tarihD.toISOString().slice(0, 10),
    satirBazliParaBirimi: false,
    satirBazliIskonto: false,
    paraBirimi,
    durum,
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
    notlar: rng() < 0.2 ? 'Fiyatlarımıza KDV dahil değildir. Stok durumumuza göre teslimat süreleri değişebilir.' : '',
    notlarGosterilsin: false,
    olusturmaTarihi: tarihD.toISOString(),
    guncellemeTarihi: tarihD.toISOString(),
    hazirlayanKullaniciId: SERKAN_ID,
    hazirlayanAdSoyad: 'Serkan Arslan',
    hazirlayanRol: 'sales',
    hazirlayanUnvan: 'Satış Uzmanı',
    contactName: yetkili.toLocaleUpperCase('tr-TR'),
    contactTitle: pick(['BEY', 'HANIM']),
    status: pickWeighted(TEKLIF_STATUS, [25, 50, 25]),
    visibility: pickWeighted(VISIBILITY, [40, 60]),
    firmaId: 'meba',
    version: 1,
    deviceId: 'script:serkan-teklifleri',
    updatedBy: SERKAN_ID,
    lastSyncedAt: new Date().toISOString(),
  };

  if (sonuc) {
    yeniTeklif.sonuc = sonuc;
    yeniTeklif.sonucTarihi = new Date(tarihD.getTime() + intBetween(2, 60) * 24 * 3600 * 1000).toISOString();
    yeniTeklif.sonucGirenKullaniciId = SERKAN_ID;
    if (sonuc === 'kaybedildi') {
      yeniTeklif.kayipSebebi = pick(SEBEPLER);
      if (yeniTeklif.kayipSebebi === 'rakip') yeniTeklif.rakipFirma = pick(RAKIPLER);
    }
    if (sonucNotu) yeniTeklif.sonucNotu = sonucNotu;
  }

  yeniler.push(yeniTeklif);
}

if (!Array.isArray(db.teklifler)) db.teklifler = [];
db.teklifler.push(...yeniler);

// Audit log
if (!Array.isArray(db.auditLog)) db.auditLog = [];
db.auditLog.push({
  zaman: new Date().toISOString(),
  eylem: 'serkan_teklif_seed',
  kullaniciId: null,
  kullaniciAdi: 'script:serkan-teklifleri',
  firmaId: 'meba',
  detay: { adet: yeniler.length, hazirlayan: SERKAN_ID },
});
if (db.auditLog.length > 5000) db.auditLog = db.auditLog.slice(-5000);

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

// Özet
const sayim = { taslak: 0, hazir: 0, gonderildi: 0, onaylandi: 0, iptal: 0 };
const sonucSay = { kazanildi: 0, kaybedildi: 0, iptal: 0, beklemede: 0, yok: 0 };
const pbSay = { TRY: 0, EUR: 0, USD: 0 };
let toplamTRY = 0, toplamEUR = 0, toplamUSD = 0;
for (const t of yeniler) {
  sayim[t.durum] = (sayim[t.durum] || 0) + 1;
  sonucSay[t.sonuc || 'yok'] = (sonucSay[t.sonuc || 'yok'] || 0) + 1;
  pbSay[t.paraBirimi] = (pbSay[t.paraBirimi] || 0) + 1;
  if (t.paraBirimi === 'TRY') toplamTRY += t.genelToplam;
  if (t.paraBirimi === 'EUR') toplamEUR += t.genelToplam;
  if (t.paraBirimi === 'USD') toplamUSD += t.genelToplam;
}

console.log(`\nSerkan Arslan'a ${yeniler.length} teklif eklendi.`);
console.log(`Şifre varsayılana çekildi: 123456 (kullanici adi: serkan954)\n`);
console.log('Durum dağılımı:', sayim);
console.log('Sonuç dağılımı:', sonucSay);
console.log('Para birimi   :', pbSay);
console.log(`Toplam tutar   : ₺${toplamTRY.toLocaleString('tr-TR', {maximumFractionDigits: 0})} · €${toplamEUR.toLocaleString('tr-TR', {maximumFractionDigits: 0})} · $${toplamUSD.toLocaleString('tr-TR', {maximumFractionDigits: 0})}`);
