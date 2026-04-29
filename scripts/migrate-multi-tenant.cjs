'use strict';

/**
 * Multi-tenant migration:
 *   - Mevcut db.json'u yedekler (server/backups/)
 *   - Tum veriye firmaId: "meba" ekler
 *   - Yeni tablolari ekler: firmalar, kullanicilar, sayaclar, auditLog
 *   - sayac (eski, tek) -> sayaclar.meba (yeni, firma basina) tasinir
 *   - Idempotent: ikinci kez calistirilirsa zarar vermez
 *
 * Calistirma:  node scripts/migrate-multi-tenant.cjs
 */

const fs = require('fs');
const path = require('path');
const { hashPassword } = require('../server/auth-helper.cjs');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'server', 'db.json');
const BACKUP_DIR = path.join(ROOT, 'server', 'backups');

const FIRMALAR_TANIM = [
  {
    id: 'meba',
    ad: 'MEBA Mekanik',
    kisaAd: 'MEBA',
    slogan: 'Pnömatik · Hidrolik · Mühendislik',
    logoPath: '/logo-meba.png',
    renkBirincil: '#1a3a8c',
    renkVurgu: '#b99434',
    adres: '',
    vergiDairesi: '',
    vergiNo: '',
    telefon: '',
    eposta: '',
    iban: '',
    pdfKlasorAdi: 'MEBA MEKANİK TEKLİFLER',
    teklifPrefix: 'MEBA',
  },
  {
    id: 'elmos',
    ad: 'ELMOS Otomasyon',
    kisaAd: 'ELMOS',
    slogan: 'Endüstriyel Otomasyon',
    logoPath: '/logo-elmos.png',
    renkBirincil: '#2f6f6a',
    renkVurgu: '#c0392b',
    adres: '',
    vergiDairesi: '',
    vergiNo: '',
    telefon: '',
    eposta: '',
    iban: '',
    pdfKlasorAdi: 'ELMOS OTOMASYON TEKLİFLER',
    teklifPrefix: 'ELMOS',
  },
  {
    id: 'mesa',
    ad: 'MESA Enerji',
    kisaAd: 'MESA',
    slogan: 'Enerji & Otomasyon Çözümleri',
    logoPath: '/logo-mesa.png',
    renkBirincil: '#1c1c1c',
    renkVurgu: '#c0392b',
    adres: '',
    vergiDairesi: '',
    vergiNo: '',
    telefon: '',
    eposta: '',
    iban: '',
    pdfKlasorAdi: 'MESA ENERJİ TEKLİFLER',
    teklifPrefix: 'MESA',
  },
];

function bugunISO() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

function backupDB() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  const ts = bugunISO();
  const dest = path.join(BACKUP_DIR, `db-pre-multitenant-${ts}.json`);
  fs.copyFileSync(DB_PATH, dest);
  console.log(`[backup] ${dest}`);
  return dest;
}

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function ensureFirmaIdOnArray(arr, firmaId) {
  if (!Array.isArray(arr)) return { eklenen: 0, mevcut: 0 };
  let eklenen = 0;
  let mevcut = 0;
  for (const item of arr) {
    if (item && typeof item === 'object') {
      if (item.firmaId) {
        mevcut++;
      } else {
        item.firmaId = firmaId;
        eklenen++;
      }
    }
  }
  return { eklenen, mevcut };
}

function buildInitialUsers() {
  return [
    {
      id: 'u-mehmet',
      kullaniciAdi: 'mehmet',
      sifreHash: hashPassword('168421'),
      adSoyad: 'Mehmet Bakırdöğen',
      unvan: 'Makine Yüksek Mühendisi (Master of Science)',
      initials: 'MB',
      rol: 'super_admin',
      firmaId: null, // super_admin tum firmalari gorur
      aktifMi: true,
      mustChangePassword: false,
      olusturmaTarihi: new Date().toISOString(),
    },
    {
      id: 'u-ahmet',
      kullaniciAdi: 'ahmet',
      sifreHash: hashPassword('123456'),
      adSoyad: 'Ahmet Esmeray',
      unvan: 'Firma Yöneticisi',
      initials: 'AE',
      rol: 'firma_admin',
      firmaId: 'elmos',
      aktifMi: true,
      mustChangePassword: true,
      olusturmaTarihi: new Date().toISOString(),
    },
    {
      id: 'u-fatih',
      kullaniciAdi: 'fatih',
      sifreHash: hashPassword('123456'),
      adSoyad: 'Fatih Lazoğlu',
      unvan: 'Firma Yöneticisi',
      initials: 'FL',
      rol: 'firma_admin',
      firmaId: 'mesa',
      aktifMi: true,
      mustChangePassword: true,
      olusturmaTarihi: new Date().toISOString(),
    },
  ];
}

function migrate() {
  console.log('--- Multi-tenant migration basliyor ---');
  backupDB();
  const db = loadDB();

  // 1) Mevcut MEBA verilerine firmaId ekle
  const teklif    = ensureFirmaIdOnArray(db.teklifler,   'meba');
  const cari      = ensureFirmaIdOnArray(db.cariler,     'meba');
  const urun      = ensureFirmaIdOnArray(db.urunler,     'meba');
  const setler    = ensureFirmaIdOnArray(db.urunSetleri, 'meba');
  console.log(`[firmaId] teklifler:   +${teklif.eklenen}  (mevcut ${teklif.mevcut})`);
  console.log(`[firmaId] cariler:     +${cari.eklenen}  (mevcut ${cari.mevcut})`);
  console.log(`[firmaId] urunler:     +${urun.eklenen}  (mevcut ${urun.mevcut})`);
  console.log(`[firmaId] urunSetleri: +${setler.eklenen}  (mevcut ${setler.mevcut})`);

  // 2) Firmalar tablosu — idempotent: mevcutsa dokunma, eksikse ekle
  if (!Array.isArray(db.firmalar)) db.firmalar = [];
  for (const tanim of FIRMALAR_TANIM) {
    const idx = db.firmalar.findIndex((f) => f && f.id === tanim.id);
    if (idx < 0) {
      db.firmalar.push(tanim);
      console.log(`[firmalar] eklendi: ${tanim.id}`);
    } else {
      console.log(`[firmalar] mevcut, korundu: ${tanim.id}`);
    }
  }

  // 3) Kullanicilar tablosu — idempotent
  if (!Array.isArray(db.kullanicilar)) db.kullanicilar = [];
  if (db.kullanicilar.length === 0) {
    db.kullanicilar = buildInitialUsers();
    console.log(`[kullanicilar] 3 baslangic kullanici eklendi (mehmet, ahmet, fatih)`);
  } else {
    console.log(`[kullanicilar] mevcut (${db.kullanicilar.length} kullanici), korundu`);
  }

  // 4) Sayaclar — eski sayac'i meba'ya tasi, digerlerini sifirdan baslat
  if (!db.sayaclar || typeof db.sayaclar !== 'object') {
    db.sayaclar = {};
  }
  const yil = new Date().getFullYear();
  const ay  = new Date().getMonth() + 1;
  if (!db.sayaclar.meba) {
    if (db.sayac && typeof db.sayac === 'object') {
      db.sayaclar.meba = { yil: db.sayac.yil ?? yil, ay: db.sayac.ay ?? ay, deger: db.sayac.deger ?? 0 };
      console.log(`[sayaclar] meba <- eski sayac (deger=${db.sayaclar.meba.deger})`);
    } else {
      db.sayaclar.meba = { yil, ay, deger: 0 };
      console.log(`[sayaclar] meba sifirdan baslatildi`);
    }
  } else {
    console.log(`[sayaclar] meba mevcut, korundu`);
  }
  if (!db.sayaclar.elmos) { db.sayaclar.elmos = { yil, ay, deger: 0 }; console.log('[sayaclar] elmos sifirdan baslatildi'); }
  if (!db.sayaclar.mesa)  { db.sayaclar.mesa  = { yil, ay, deger: 0 }; console.log('[sayaclar] mesa sifirdan baslatildi');  }

  // Eski sayac'i sil — artik sayaclar kullanilacak
  if (db.sayac) {
    delete db.sayac;
    console.log('[sayac] eski tek-firma sayaci kaldirildi');
  }

  // 5) Audit log
  if (!Array.isArray(db.auditLog)) {
    db.auditLog = [];
    console.log('[auditLog] olusturuldu (bos)');
  }

  // 6) Aktif oturumlar tablosu (basit session store)
  if (!Array.isArray(db.oturumlar)) {
    db.oturumlar = [];
    console.log('[oturumlar] olusturuldu (bos)');
  }

  saveDB(db);
  console.log('--- Migration tamamlandi ---');
}

migrate();
