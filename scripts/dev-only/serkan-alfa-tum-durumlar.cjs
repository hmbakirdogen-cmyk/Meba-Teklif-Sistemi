'use strict';

/**
 * Serkan'ın "ALFA" klasöründe TÜM 6 DURUM'dan örnek teklif hazırlar.
 * Aynı cariye (ALFA OTOMASYON) bağlı 8 teklif:
 *   - Taslak                                 (yeni başlanmış)
 *   - Hazır                                  (PDF üretildi, gönderim için hazır)
 *   - Gönderildi (yeni)                      (3 gün önce, banner tetiklemez)
 *   - Gönderildi (overdue)                   (28 gün önce, ⏰ amber stili)
 *   - Onaylandı                              (notlu, sipariş kapatılmış)
 *   - Reddedildi                             (sebep + rakip + not)
 *   - İptal                                  (sebep + not)
 *   - Gönderildi + Gizli (private)           (visibility=private edge case)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');
const SERKAN_ID = 'u-903c68e1';

const URUN_MARKALARI = ['SMC', 'FESTO', 'CAMOZZI', 'AIRTAC', 'PARKER', 'BURKERT'];
const TESLIM_SECENEKLERI = ['Stoktan', '1 Hafta', '2 Hafta', '3-4 Hafta'];

const rng = () => Math.random();
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const intBetween = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
const round2 = (n) => Math.round(n * 100) / 100;
const shortId = (prefix) => prefix + crypto.randomBytes(5).toString('hex');
const isoGeri = (gun) => {
  const d = new Date();
  d.setDate(d.getDate() - gun);
  d.setHours(intBetween(9, 17), intBetween(0, 59), 0, 0);
  return d.toISOString();
};

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// 1) ALFA OTOMASYON cari oluştur (yoksa)
const ALFA_AD = 'ALFA OTOMASYON SAN. VE TİC. LTD. ŞTİ.';
let alfa = db.cariler.find((c) => c.firmaAdi === ALFA_AD && c.firmaId === 'meba');
if (!alfa) {
  alfa = {
    id: 'c-alfa-' + crypto.randomBytes(3).toString('hex'),
    cariKod: 'C-ALFA-001',
    firmaAdi: ALFA_AD,
    yetkiliKisi: 'Mehmet Çınar',
    telefon: '0216 555 12 34',
    ePosta: 'satinalma@alfaotomasyon.com',
    adres: 'Tuzla / İSTANBUL',
    vergiDairesi: 'Tuzla',
    vergiNo: '0840412345',
    firmaId: 'meba',
  };
  db.cariler.push(alfa);
  console.log(`Yeni cari eklendi: ${ALFA_AD}`);
} else {
  console.log(`Mevcut cari kullanıldı: ${ALFA_AD}`);
}

// Eski Alfa tekliflerini temizle (Serkan'ın hazırladığı)
const eskiSayi = db.teklifler.filter((t) => t.cari?.id === alfa.id && t.hazirlayanKullaniciId === SERKAN_ID).length;
db.teklifler = db.teklifler.filter((t) => !(t.cari?.id === alfa.id && t.hazirlayanKullaniciId === SERKAN_ID));
if (eskiSayi > 0) console.log(`Eski Alfa-Serkan teklifleri silindi: ${eskiSayi}`);

const cariSnap = {
  id: alfa.id,
  cariKod: alfa.cariKod,
  firmaAdi: alfa.firmaAdi,
  yetkiliKisi: alfa.yetkiliKisi,
  telefon: alfa.telefon,
  ePosta: alfa.ePosta,
  adres: alfa.adres,
  vergiDairesi: alfa.vergiDairesi,
  vergiNo: alfa.vergiNo,
};

// MEBA ürünleri
const mebaUrunler = db.urunler.filter((u) => u.firmaId === 'meba');

function uretSatirlar(adet, paraBirimi) {
  const satirlar = [];
  for (let i = 0; i < adet; i += 1) {
    const u = pick(mebaUrunler);
    const miktar = intBetween(1, 30);
    const fiyat = round2((u.varsayilanFiyat || 100) * (0.85 + rng() * 0.4));
    const indirim = pick([0, 0, 5, 10]);
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
      teslimTarihi: pick(TESLIM_SECENEKLERI),
      satirToplami,
      rowHeight: 22,
    });
  }
  return satirlar;
}

function temelTeklif({ teklifNo, durum, gunOnce, paraBirimi = 'TRY', satirSayisi = 5, ek = {} }) {
  const olusturma = isoGeri(gunOnce);
  const satirlar = uretSatirlar(satirSayisi, paraBirimi);
  const araToplam = round2(satirlar.reduce((acc, s) => acc + s.miktar * s.birimFiyat, 0));
  const toplamIndirim = round2(satirlar.reduce((acc, s) => acc + s.miktar * s.birimFiyat * (s.indirimOrani / 100), 0));
  const kdvOrani = 20;
  const aradanSonra = round2(araToplam - toplamIndirim);
  const kdvTutar = round2(aradanSonra * (kdvOrani / 100));
  const genelToplam = round2(aradanSonra + kdvTutar);

  return {
    id: shortId('t-'),
    teklifNo,
    tarih: olusturma.slice(0, 10),
    satirBazliParaBirimi: false,
    satirBazliIskonto: false,
    paraBirimi,
    durum,
    cari: cariSnap,
    satirlar,
    araToplam,
    toplamIndirim,
    toplamVergi: kdvTutar,
    genelToplam,
    kdvOrani,
    iskontoOrani: 0,
    odemeVadesi: '30 Gün',
    teslimSuresi: '2 Hafta',
    gecerlilikSuresi: '15 Gün',
    notlar: '',
    notlarGosterilsin: false,
    olusturmaTarihi: olusturma,
    guncellemeTarihi: olusturma,
    hazirlayanKullaniciId: SERKAN_ID,
    hazirlayanAdSoyad: 'Serkan Arslan',
    hazirlayanRol: 'sales',
    hazirlayanUnvan: 'Satış Uzmanı',
    contactName: 'MEHMET',
    contactTitle: 'BEY',
    status: 'kaydedildi',
    visibility: 'team',
    firmaId: 'meba',
    version: 1,
    deviceId: 'script:serkan-alfa',
    updatedBy: SERKAN_ID,
    lastSyncedAt: new Date().toISOString(),
    ...ek,
  };
}

// Teklif No üretici (uniqueness yok ama yakın aralıklarla)
let no = 100;
const tnext = () => `2605-${String(no++).padStart(3, '0')}`;

const yeniler = [
  // 1) Taslak
  temelTeklif({
    teklifNo: tnext(),
    durum: 'taslak',
    gunOnce: 1,
    satirSayisi: 3,
  }),

  // 2) Hazır (PDF üretildi)
  temelTeklif({
    teklifNo: tnext(),
    durum: 'hazir',
    gunOnce: 2,
    satirSayisi: 4,
  }),

  // 3) Gönderildi - yeni (3 gün önce, banner tetiklemez)
  temelTeklif({
    teklifNo: tnext(),
    durum: 'gonderildi',
    gunOnce: 3,
    paraBirimi: 'EUR',
    satirSayisi: 6,
  }),

  // 4) Gönderildi - overdue (28 gün önce, ⏰ amber stili tetiklenir)
  temelTeklif({
    teklifNo: tnext(),
    durum: 'gonderildi',
    gunOnce: 28,
    satirSayisi: 8,
  }),

  // 5) Onaylandı (notlu)
  temelTeklif({
    teklifNo: tnext(),
    durum: 'onaylandi',
    gunOnce: 45,
    paraBirimi: 'USD',
    satirSayisi: 5,
    ek: {
      sonucTarihi: isoGeri(40),
      sonucGirenKullaniciId: SERKAN_ID,
      sonucNotu: 'Müşteri 30 günlük vade ile sipariş verdi. Toplantıda iyi geçti, ilişki güçlü.',
    },
  }),

  // 6) Reddedildi (sebep + rakip + not)
  temelTeklif({
    teklifNo: tnext(),
    durum: 'reddedildi',
    gunOnce: 60,
    satirSayisi: 7,
    ek: {
      sonucTarihi: isoGeri(50),
      sonucGirenKullaniciId: SERKAN_ID,
      kayipSebebi: 'rakip',
      rakipFirma: 'Ar Otomasyon',
      sonucNotu: 'Rakipte 8% daha ucuz teklif olmuş. Müşteri uzun yıllardır onlarla çalışıyormuş.',
    },
  }),

  // 7) İptal (sebep + not)
  temelTeklif({
    teklifNo: tnext(),
    durum: 'iptal',
    gunOnce: 90,
    satirSayisi: 4,
    ek: {
      sonucTarihi: isoGeri(80),
      sonucGirenKullaniciId: SERKAN_ID,
      kayipSebebi: 'ihtiyac_yok',
      sonucNotu: 'Müşteri yatırımı durdurdu, proje 2026 sonuna ertelendi.',
    },
  }),

  // 8) Gönderildi + Gizli (private)
  temelTeklif({
    teklifNo: tnext(),
    durum: 'gonderildi',
    gunOnce: 5,
    paraBirimi: 'EUR',
    satirSayisi: 10,
    ek: {
      visibility: 'private',
    },
  }),
];

db.teklifler.push(...yeniler);

if (!Array.isArray(db.auditLog)) db.auditLog = [];
db.auditLog.push({
  zaman: new Date().toISOString(),
  eylem: 'serkan_alfa_tum_durumlar_seed',
  kullaniciId: null,
  kullaniciAdi: 'script:serkan-alfa',
  firmaId: 'meba',
  detay: { adet: yeniler.length, cariId: alfa.id },
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log(`\nALFA klasörüne ${yeniler.length} teklif eklendi (Serkan Arslan):`);
yeniler.forEach((t) => {
  let etiket = t.durum;
  if (t.durum === 'gonderildi') {
    const gun = Math.floor((Date.now() - new Date(t.olusturmaTarihi).getTime()) / (24 * 3600 * 1000));
    etiket = gun >= 14 ? `gönderildi (${gun}g — overdue ⏰)` : `gönderildi (${gun}g — yeni)`;
  }
  if (t.visibility === 'private') etiket += ' [GİZLİ]';
  console.log(`  ${t.teklifNo}  ${etiket.padEnd(38)}  ${t.paraBirimi} ${t.genelToplam.toLocaleString('tr-TR')}`);
});
