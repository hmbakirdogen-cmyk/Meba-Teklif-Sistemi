'use strict';

const XLSX = require('./node_modules/xlsx');
const fs   = require('fs');
const path = require('path');

const DB_PATH  = path.join(__dirname, 'server', 'db.json');
const OUT_XLSX = path.join(__dirname, 'Ornek_100_Teklif.xlsx');

// ── helpers ───────────────────────────────────────────────────────────────────

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr)         { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr)      { const a = [...arr]; for (let i=a.length-1;i>0;i--){ const j=randInt(0,i);[a[i],a[j]]=[a[j],a[i]]; } return a; }

function randId(prefix = 't') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function round2(n) { return Math.round(n * 100) / 100; }

// Generate date in last 6 months
function randDate() {
  const now   = new Date('2026-04-23');
  const start = new Date('2025-10-23');
  const ms    = start.getTime() + Math.random() * (now.getTime() - start.getTime());
  return new Date(ms).toISOString().slice(0, 10);
}

// ── Personnel ─────────────────────────────────────────────────────────────────

const PERSONEL = [
  { id: 'u1', adSoyad: 'Yusuf Bostancı',    rol: 'engineer' },
  { id: 'u2', adSoyad: 'Furkan Öztürk',     rol: 'engineer' },
  { id: 'u3', adSoyad: 'Mehmet Bakırdöğen', rol: 'engineer' },
];

// ── Realistic Turkish contact names ──────────────────────────────────────────

const ERKEK_ISIMLER = [
  'Ahmet','Mehmet','Ali','Mustafa','Hüseyin','İbrahim','Ömer','Süleyman',
  'Yusuf','Murat','Can','Emre','Sercan','Burak','Tolga','Oğuz','Kaan',
  'Barış','Enes','Hasan','Uğur','Fatih','Selim','Onur','Kemal',
];
const KADIN_ISIMLER = [
  'Fatma','Ayşe','Emine','Hatice','Zeynep','Merve','Selin','Elif',
  'Esra','Nur','Gülşen','Dilek','Aynur','Ceylan','Büşra',
];
const SOYISIMLER = [
  'Yılmaz','Kaya','Demir','Şahin','Çelik','Arslan','Aydın','Erdoğan',
  'Yıldız','Koç','Güneş','Aslan','Öztürk','Çetin','Kılıç','Korkmaz',
  'Doğan','Sarı','Bulut','Aktaş','Kurt','Acar','Güler','Şimşek','Polat',
];

function randKisi() {
  const erkek = Math.random() > 0.35;
  const ad    = erkek ? pick(ERKEK_ISIMLER) : pick(KADIN_ISIMLER);
  const soyad = pick(SOYISIMLER);
  return { ad, soyad, unvan: erkek ? 'BEY' : 'HANIM', tam: `${ad} ${soyad}` };
}

// ── Company name generator ────────────────────────────────────────────────────

const SEKTORLER = [
  'ENDÜSTRİYEL','MAKİNE','ELEKTRİK','OTOMOTİV','PLASTİK','METAL',
  'TEKNİK','MÜHENDİSLİK','SİSTEM','OTOMASYON','HİDROLİK','PNÖMATİK',
  'YAPI','KİMYA','GIDA','TEKSTİL','AMBALAJ','ÇEVRE','ENERJİ','SAVUNMA',
];
const TIP = [
  'SAN. VE TİC.','SAN. VE DIŞ TİC.','MÜH. İNŞ. SAN.',
  'MAKİNE SAN.','ELEKTRİK SAN.','TEKNİK HİZMETLER',
  'OTOMASYON SİS.','MÜHENDİSLİK',
];
const HUKUK = ['LTD. ŞTİ.','A.Ş.','LTD. ŞTİ.','LTD. ŞTİ.'];
const SEHIRLER = [
  'İSTANBUL','ANKARA','İZMİR','BURSA','KONYA','ANTALYA','ADANA','KAYSERI',
  'GAZİANTEP','MERSİN','DENİZLİ','KOCAELİ','SAMSUN','ESKİŞEHİR','TRABZON',
  'MALATYA','ERZİNCAN','DÜZCE','GEBZE','ÇORLU','OSMANGAZİ','NİLÜFER',
];

function randFirma(idx) {
  const soyadlar = [
    'YILMAZ','KAYA','DEMİR','ŞAHİN','ÇELİK','ARSLAN','AYDIN',
    'YILDIZ','KOÇ','GÜNEŞ','DOĞAN','POLAT','KURT','ASLAN','KOÇAK',
  ];
  const prefix = Math.random() > 0.5
    ? pick(soyadlar)
    : pick(SEKTORLER).slice(0,6);
  return `${prefix} ${pick(TIP)} ${pick(HUKUK)}`;
}

function randTel() {
  const alan = pick(['212','216','232','242','312','322','332','342','352','362','412','422','432','442','452','462','472','482']);
  return `0${alan} ${randInt(100,999)} ${randInt(10,99)} ${randInt(10,99)}`;
}

function randEmail(firma) {
  const domains = ['gmail.com','hotmail.com','outlook.com','yahoo.com',
    'firma.com.tr','info.com.tr','makine.com.tr','endustri.com.tr'];
  const name = firma.split(' ')[0].toLowerCase()
    .replace(/[ğ]/g,'g').replace(/[ü]/g,'u').replace(/[ş]/g,'s')
    .replace(/[ı]/g,'i').replace(/[ö]/g,'o').replace(/[ç]/g,'c')
    .replace(/[^a-z]/g,'');
  return `info@${name}.${pick(['com.tr','com'])}`;
}

// ── Product theme groups (pick from DB by keyword) ────────────────────────────

function buildThemeGroups(urunler) {
  const groups = {
    silindir:  urunler.filter(u => u.aciklama && u.aciklama.toLowerCase().includes('silindir')),
    valf:      urunler.filter(u => u.aciklama && (u.aciklama.toLowerCase().includes('valf') || u.aciklama.toLowerCase().includes('solenoid'))),
    rakor:     urunler.filter(u => u.aciklama && (u.aciklama.toLowerCase().includes('rakor') || u.aciklama.toLowerCase().includes('bağlantı'))),
    hortum:    urunler.filter(u => u.aciklama && u.aciklama.toLowerCase().includes('hortum')),
    filtre:    urunler.filter(u => u.aciklama && (u.aciklama.toLowerCase().includes('filtre') || u.aciklama.toLowerCase().includes('regülatör') || u.aciklama.toLowerCase().includes('yağlayıcı'))),
    sensor:    urunler.filter(u => u.aciklama && (u.aciklama.toLowerCase().includes('sensör') || u.aciklama.toLowerCase().includes('basınç') || u.aciklama.toLowerCase().includes('akış'))),
    aksesuar:  urunler.filter(u => u.aciklama && (u.aciklama.toLowerCase().includes('hız') || u.aciklama.toLowerCase().includes('tahliye') || u.aciklama.toLowerCase().includes('susturucu'))),
  };
  return groups;
}

// ── Realistic price per product based on description ─────────────────────────

function estimatePrice(aciklama, pb) {
  const a = (aciklama || '').toLowerCase();
  let base = 25;

  if (a.includes('silindir')) {
    const boreMatch = a.match(/ø(\d+)mm/);
    const bore = boreMatch ? parseInt(boreMatch[1]) : 32;
    base = bore <= 16 ? randInt(12,35) : bore <= 40 ? randInt(25,80) : bore <= 80 ? randInt(60,180) : randInt(150,400);
  } else if (a.includes('valf') || a.includes('solenoid')) {
    base = randInt(30, 160);
  } else if (a.includes('filtre') || a.includes('regülatör') || a.includes('yağlayıcı')) {
    base = randInt(20, 120);
  } else if (a.includes('sensör') || a.includes('basınç') || a.includes('akış')) {
    base = randInt(35, 250);
  } else if (a.includes('hortum')) {
    base = randInt(3, 18); // per metre
  } else if (a.includes('rakor') || a.includes('bağlantı')) {
    base = randInt(2, 25);
  } else if (a.includes('hız') || a.includes('susturucu')) {
    base = randInt(5, 40);
  } else {
    base = randInt(10, 80);
  }

  // TRY prices are ~38x EUR
  if (pb === 'TRY') base = round2(base * randInt(35, 42));
  // USD ≈ EUR
  if (pb === 'USD') base = round2(base * (0.9 + Math.random() * 0.2));

  return round2(base);
}

// ── Teklif themes ─────────────────────────────────────────────────────────────

const TEMALAR = [
  { isim: 'pnomatik_sistem', cats: ['silindir','silindir','valf','rakor','aksesuar'] },
  { isim: 'otomasyon_paketi', cats: ['silindir','valf','sensor','filtre','rakor'] },
  { isim: 'bakim_malzeme',  cats: ['filtre','filtre','valf','aksesuar','hortum','rakor'] },
  { isim: 'silindir_seti',  cats: ['silindir','silindir','silindir','rakor','aksesuar'] },
  { isim: 'sensor_paketi',  cats: ['sensor','sensor','sensor','filtre','aksesuar'] },
  { isim: 'hortum_baglanti',cats: ['hortum','hortum','rakor','rakor','aksesuar'] },
  { isim: 'frl_paketi',     cats: ['filtre','filtre','rakor','aksesuar','valf'] },
  { isim: 'karma',          cats: ['silindir','valf','rakor','sensor','filtre','aksesuar','hortum'] },
];

const ODEME_VADELERI = [
  'Peşin','15 Gün','30 Gün','45 Gün','60 Gün','90 Gün','Sipariş Avansı','Akreditif',
];

const GECERLILIK = ['1 Hafta','2 Hafta','1 Ay','30 Gün','45 Gün','15 Gün'];

const NOTLAR = [
  'Fiyatlarımız KDV hariç olup teklif geçerlilik süresi içinde geçerlidir.',
  'Stok bilgilerini teyit etmenizi öneririz.',
  'Sipariş üzerine imalat gerektiren kalemler için teslim süresi uzayabilir.',
  'Teknik özellikler değişiklik gösterebilir. Lütfen sipariş öncesi onaylayınız.',
  'Taşıma maliyeti ayrıca hesaplanacaktır.',
  '',
  '',
  '',
];

const TESLIM_SECELERI = [
  '2-3 Gün','5-7 Gün','10 Gün','1-2 Hafta','2-3 Hafta','4-6 Hafta','Stok','Sipariş Üzerine',
];

// ── MAIN ──────────────────────────────────────────────────────────────────────

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const urunler = db.urunler;
if (!urunler || urunler.length === 0) {
  console.error('Ürün bulunamadı! Önce smc_import_db.cjs çalıştırın.');
  process.exit(1);
}

const groups = buildThemeGroups(urunler);

// Check group sizes
for (const [k,v] of Object.entries(groups)) {
  console.log(`  ${k.padEnd(10)}: ${v.length} ürün`);
}

// Pick 100 different customers from existing cariler
const cariHavuz = shuffle(db.cariler).slice(0, 100);

// Current counter
let sayacDeger = db.sayac.deger;
const yil = db.sayac.yil;

// Personnel distribution — roughly equal thirds
const personelSiralamasi = [];
for (let i = 0; i < 100; i++) {
  personelSiralamasi.push(PERSONEL[i % 3]);
}
shuffle(personelSiralamasi);

const yeniTeklifler = [];
const excelOzet = [];
let toplamKalem = 0;
const personelSayac = { 'Yusuf Bostancı': 0, 'Furkan Öztürk': 0, 'Mehmet Bakırdöğen': 0 };

for (let t = 0; t < 100; t++) {
  sayacDeger++;

  const personel  = personelSiralamasi[t];
  const cari      = cariHavuz[t];
  const tema      = pick(TEMALAR);
  const tarih     = randDate();

  // Para birimi: 60% EUR, 20% USD, 20% TRY
  const pbRand = Math.random();
  const pb = pbRand < 0.60 ? 'EUR' : pbRand < 0.80 ? 'USD' : 'TRY';

  // KDV: only for TRY
  const kdvOrani = pb === 'TRY' ? 20 : 0;

  // Iskonto: 40% chance
  const iskontoVar    = Math.random() < 0.4;
  const iskontoOrani  = iskontoVar ? pick([5,10,15,20]) : 0;

  // How many line items: 3 - 12
  const kalemSayisi = randInt(3, 12);

  // Build categories list for this quote
  const cats = [...tema.cats];
  while (cats.length < kalemSayisi) cats.push(pick(tema.cats));
  const seciliCats = cats.slice(0, kalemSayisi);

  const kontakKisi = randKisi();

  // Build satirlar
  const satirlar = [];
  const usedUrunKodlar = new Set();

  for (let s = 0; s < kalemSayisi; s++) {
    const cat   = seciliCats[s];
    const pool  = groups[cat] && groups[cat].length > 0 ? groups[cat] : urunler;
    // Pick unused product
    let urun;
    let tries = 0;
    do {
      urun = pick(pool);
      tries++;
    } while (usedUrunKodlar.has(urun.urunKod) && tries < 20);
    usedUrunKodlar.add(urun.urunKod);

    const miktar     = cat === 'hortum' ? randInt(2,20) : randInt(1, 10);
    const birim      = cat === 'hortum' ? 'Metre' : 'Adet';
    const birimFiyat = estimatePrice(urun.aciklama, pb);
    const indirimOrani = 0; // satır bazlı iskonto yok (teklif geneline iskonto)
    const satirToplami = round2(miktar * birimFiyat);
    const teslim       = pick(TESLIM_SECELERI);

    satirlar.push({
      id:           randId('s'),
      marka:        'SMC',
      urunKod:      urun.urunKod,
      urunAdi:      '',
      aciklama:     urun.aciklama || urun.urunKod,
      paraBirimi:   pb,
      miktar,
      birim,
      birimFiyat,
      indirimOrani,
      teslimTarihi: teslim,
      satirToplami,
    });
  }

  const araToplam     = round2(satirlar.reduce((acc, s) => acc + s.satirToplami, 0));
  const toplamIndirim = iskontoVar ? round2(araToplam * iskontoOrani / 100) : 0;
  const vergiMatrahi  = round2(araToplam - toplamIndirim);
  const toplamVergi   = round2(vergiMatrahi * kdvOrani / 100);
  const genelToplam   = round2(vergiMatrahi + toplamVergi);

  const teklifNo = `${yil}-${sayacDeger}`;
  const now      = new Date(`${tarih}T${randInt(8,17).toString().padStart(2,'0')}:${randInt(0,59).toString().padStart(2,'0')}:00.000Z`).toISOString();

  const teklif = {
    id:                   randId('t'),
    teklifNo,
    tarih,
    satirBazliParaBirimi: false,
    satirBazliIskonto:    false,
    paraBirimi:           pb,
    durum:                pick(['taslak','taslak','taslak','gonderildi','gonderildi','onaylandi','revizyon']),
    cari: {
      id:           cari.id,
      cariKod:      cari.cariKod,
      firmaAdi:     cari.firmaAdi,
      yetkiliKisi:  kontakKisi.tam,
      telefon:      cari.telefon || randTel(),
      ePosta:       cari.ePosta  || randEmail(cari.firmaAdi),
      adres:        cari.adres   || '',
      vergiDairesi: cari.vergiDairesi || '',
      vergiNo:      cari.vergiNo || '',
    },
    satirlar,
    araToplam,
    toplamIndirim,
    toplamVergi,
    genelToplam,
    kdvOrani,
    iskontoOrani,
    odemeVadesi:        pick(ODEME_VADELERI),
    notlar:             pick(NOTLAR),
    olusturmaTarihi:    now,
    guncellemeTarihi:   now,
    hazirlayanKullaniciId: personel.id,
    hazirlayanAdSoyad:     personel.adSoyad,
    hazirlayanRol:         personel.rol,
    gecerlilikSuresi:   pick(GECERLILIK),
    contactName:        kontakKisi.ad,
    contactTitle:       kontakKisi.unvan,
  };

  yeniTeklifler.push(teklif);
  toplamKalem += kalemSayisi;
  personelSayac[personel.adSoyad] = (personelSayac[personel.adSoyad] || 0) + 1;

  excelOzet.push({
    'Teklif No':       teklifNo,
    'Tarih':           tarih,
    'Müşteri Adı':     cari.firmaAdi,
    'Hazırlayan':      personel.adSoyad,
    'Kalem Sayısı':    kalemSayisi,
    'Para Birimi':     pb,
    'Ara Toplam':      araToplam,
    'İskonto %':       iskontoOrani,
    'KDV %':           kdvOrani,
    'Genel Toplam':    genelToplam,
    'Durum':           teklif.durum,
  });
}

// ── Save to db.json ───────────────────────────────────────────────────────────

db.teklifler.unshift(...yeniTeklifler.reverse()); // newest first
db.sayac.deger = sayacDeger;
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log(`\ndb.json güncellendi — toplam teklifler: ${db.teklifler.length}`);

// ── Write Excel ───────────────────────────────────────────────────────────────

const wb = XLSX.utils.book_new();

// ÖZET sheet
const wsOzet = XLSX.utils.json_to_sheet(excelOzet);
// Column widths
wsOzet['!cols'] = [
  {wch:14},{wch:12},{wch:48},{wch:22},{wch:14},
  {wch:14},{wch:14},{wch:10},{wch:8},{wch:14},{wch:12},
];
XLSX.utils.book_append_sheet(wb, wsOzet, 'ÖZET');

// Per-teklif detail sheets (first 20 for brevity)
for (let i = 0; i < Math.min(20, yeniTeklifler.length); i++) {
  const tk = yeniTeklifler[i];
  const rows = tk.satirlar.map((s, idx) => ({
    '#':            idx + 1,
    'Ürün Kodu':    s.urunKod,
    'Açıklama':     s.aciklama,
    'Miktar':       s.miktar,
    'Birim':        s.birim,
    'Birim Fiyat':  s.birimFiyat,
    'Para Birimi':  s.paraBirimi,
    'Satır Toplam': s.satirToplami,
    'Teslim':       s.teslimTarihi,
  }));
  rows.push({});
  rows.push({ '#': 'Ara Toplam',   'Birim Fiyat': tk.araToplam,    'Para Birimi': tk.paraBirimi });
  if (tk.toplamIndirim > 0) rows.push({ '#': `İskonto (${tk.iskontoOrani}%)`, 'Birim Fiyat': -tk.toplamIndirim, 'Para Birimi': tk.paraBirimi });
  if (tk.toplamVergi   > 0) rows.push({ '#': `KDV (${tk.kdvOrani}%)`,         'Birim Fiyat': tk.toplamVergi,   'Para Birimi': tk.paraBirimi });
  rows.push({ '#': 'GENEL TOPLAM', 'Birim Fiyat': tk.genelToplam,  'Para Birimi': tk.paraBirimi });

  const wsDetail = XLSX.utils.json_to_sheet(rows);
  wsDetail['!cols'] = [{wch:4},{wch:22},{wch:55},{wch:8},{wch:8},{wch:12},{wch:12},{wch:14},{wch:14}];
  const sheetName = tk.teklifNo.replace('-', '_').slice(-8);
  XLSX.utils.book_append_sheet(wb, wsDetail, sheetName);
}

XLSX.writeFile(wb, OUT_XLSX);
console.log('Excel dosyası:', OUT_XLSX);

// ── REPORT ────────────────────────────────────────────────────────────────────

console.log('\n====== RAPOR ======');
console.log(`Oluşturulan teklif     : 100`);
console.log(`Farklı cari            : 100`);
console.log(`Toplam kalem           : ${toplamKalem}`);
console.log('\nPersonele göre dağılım:');
for (const [p, c] of Object.entries(personelSayac)) {
  console.log(`  ${p.padEnd(22)}: ${c} teklif`);
}
console.log('\nPara birimi dağılımı:');
const pbSayac = {};
yeniTeklifler.forEach(t => { pbSayac[t.paraBirimi] = (pbSayac[t.paraBirimi]||0)+1; });
for (const [p,c] of Object.entries(pbSayac)) console.log(`  ${p}: ${c}`);
console.log('\nDurum dağılımı:');
const durumSayac = {};
yeniTeklifler.forEach(t => { durumSayac[t.durum] = (durumSayac[t.durum]||0)+1; });
for (const [d,c] of Object.entries(durumSayac)) console.log(`  ${d}: ${c}`);
console.log(`\nExcel: ${OUT_XLSX}`);
