'use strict';

/**
 * Serkan'ın mevcut 100 teklifini gözden geçirir, hepsine zengin sonuç + not verir.
 * - %85'ine kazanildi/kaybedildi/iptal sonucu (kalan %15 beklemede → banner tetikler)
 * - Çoğunda gerçekçi sonucNotu
 * - Tarih dağılımı: %20 son 7 gün (KPI 'bu hafta') / %35 son 14-60 gün (overdue stili) / %45 daha eski
 * - Bu hafta yazılan en az 5-10 teklif
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');
const SERKAN_ID = 'u-903c68e1';

const SEBEPLER = ['fiyat', 'rakip', 'zaman', 'ihtiyac_yok', 'diger'];
const RAKIPLER = [
  'Ar Otomasyon', 'Pnomatik A.Ş.', 'Endüstri Sistemleri', 'Mertaş Mekanik',
  'Doğa Hidrolik', 'Bilgi Teknik', 'Cesur Sanayi', 'Atak Pnömatik',
  'Star Otomasyon', 'Lider Hidrolik',
];

const NOT_KAZANILDI = [
  'Müşteri 30 günlük vade ile sipariş verdi.',
  'Toplantıda iyi geçti, fiyat avantajımız kapattı.',
  'Mevcut sistemden memnun değiller, hızlı geçtiler.',
  'Tekrar siparişi de bizden alacaklar, ilişki güçlü.',
  'Mühendislik kabul, satınalma onayı bugün geldi.',
  'Stoktan teslim önemliydi, biz hızlı çıktık.',
  'Yıl sonu bütçe baskısı oldu, hemen onayladılar.',
  'Pazar ziyaretinden döndü, teklifi imzaladı.',
  'Teknik destek vaadimiz fark yarattı.',
  'Eski tedarikçi cevap geç verdi, biz öne geçtik.',
  '%5 ek iskonto ile kapandı, tekrar sipariş geliyor.',
  'Demo başarılıydı, satınalma anında onay verdi.',
];

const NOT_KAYBEDILDI = [
  'Rakipte 8% daha ucuz teklif olmuş.',
  'Müşteri proje süresini uzattı, başka tedarikçi aldı.',
  'Bütçe daraltıldı, 2026 sonuna ertelendi.',
  'Eski tedarikçileri ile sözleşme uzatmış.',
  'Teknik şartname uymadı, alternatif marka istediler.',
  'Vade konusunda anlaşamadık, peşin istediler.',
  'Stok çıkışı geçti, biz çok geç teklif verdik.',
  'Dolar kuru yükselince Avrupa markasından vazgeçtiler.',
  'Sipariş yerli üretim olsun istediler.',
  'Müşterinin grup şirketi tedarik etti.',
  'Rakip referansı vardı, tanıdık üzerinden gitti.',
  'Bizden 2 hafta sonra teklif verdiler, geç kaldık.',
];

const NOT_IPTAL = [
  'Müşteri yatırımı durdurdu.',
  'Proje iptal edildi, sipariş açılmadı.',
  'Devlet ihalesinde kaybettiler, alımdan vazgeçtiler.',
  'Şirket içi reorganizasyon — proje askıya alındı.',
  'Müşteri kapandı, takip edilemiyor.',
];

const NOT_BEKLEMEDE = [
  'Mühendislik ekibi inceliyor, 2 hafta sonra dönecekler.',
  'Yıl sonu kapanış sonrası karar verecekler.',
  'Bütçe onayı bekleniyor, Q2 başında kesinleşir.',
  'Teknik şartname revizyonu sonrası tekrar değerlendirilecek.',
];

function rng() { return Math.random(); }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function pickWeighted(arr, weights) {
  const t = weights.reduce((a, b) => a + b, 0);
  let r = rng() * t;
  for (let i = 0; i < arr.length; i += 1) { r -= weights[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
}
function intBetween(a, b) { return Math.floor(rng() * (b - a + 1)) + a; }

function tarihIsoGeriDon(gunOnce) {
  const d = new Date();
  d.setDate(d.getDate() - gunOnce);
  d.setHours(intBetween(8, 18), intBetween(0, 59), 0, 0);
  return d.toISOString();
}

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const serkanTeklifleri = db.teklifler.filter((t) => t.hazirlayanKullaniciId === SERKAN_ID);
console.log(`Serkan'ın teklif sayısı: ${serkanTeklifleri.length}`);

// Tarih dağılımı: kova kovalama
// kova A: son 0-7 gün (%18) → bu hafta KPI'ı için
// kova B: son 8-30 gün (%25) → onay bekleyen + bazıları overdue 14+
// kova C: son 31-90 gün (%35) → çoğunluk, sonuçlanmış
// kova D: 91+ gün (%22) → eski, sonuçlanmış
const kovalar = [
  { range: [0, 7],   weight: 18 },
  { range: [8, 30],  weight: 25 },
  { range: [31, 90], weight: 35 },
  { range: [91, 365],weight: 22 },
];

let i = 0;
const sayim = { kazanildi: 0, kaybedildi: 0, iptal: 0, beklemede: 0, sonucsuz: 0, notluKazanildi: 0, notluKaybedildi: 0 };
const buHaftaSayisi = { taslak: 0, hazir: 0, gonderildi: 0, onaylandi: 0, iptal: 0 };

for (const t of serkanTeklifleri) {
  // Tarih güncelle
  const kova = pickWeighted(kovalar.map((k) => k.range), kovalar.map((k) => k.weight));
  const gunOnce = intBetween(kova[0], kova[1]);
  t.olusturmaTarihi = tarihIsoGeriDon(gunOnce);
  t.tarih = t.olusturmaTarihi.slice(0, 10);

  // Durum: 0-7 gün → ağırlıklı taslak/hazır; 8-30 → gönderildi; 31+ → gönderildi/onaylandı/iptal
  let durum;
  if (gunOnce <= 7) {
    durum = pickWeighted(['taslak', 'hazir', 'gonderildi'], [25, 35, 40]);
  } else if (gunOnce <= 30) {
    durum = pickWeighted(['hazir', 'gonderildi', 'onaylandi'], [10, 70, 20]);
  } else {
    durum = pickWeighted(['gonderildi', 'onaylandi', 'iptal'], [40, 40, 20]);
  }
  t.durum = durum;

  // Sonuç: gönderildi/onaylandı'da %95 sonuç, taslak'ta %5, iptal'de zorunlu iptal, hazır'da %30
  let sonuc = null;
  if (durum === 'iptal') {
    sonuc = 'iptal';
  } else if (durum === 'onaylandi') {
    sonuc = pickWeighted(['kazanildi', 'kaybedildi', 'beklemede'], [70, 15, 15]);
  } else if (durum === 'gonderildi') {
    if (gunOnce <= 14) {
      // Yeni gönderilmiş → çoğu beklemede (banner tetiklemek için bazıları)
      sonuc = pickWeighted(['beklemede', 'kazanildi', 'kaybedildi'], [55, 25, 20]);
    } else {
      // Eski gönderilmiş → çoğunluk sonuçlanmış, %15 hâlâ beklemede (overdue!)
      sonuc = pickWeighted(['kazanildi', 'kaybedildi', 'iptal', 'beklemede', null], [40, 30, 8, 15, 7]);
    }
  } else if (durum === 'hazir') {
    sonuc = pickWeighted([null, 'beklemede'], [70, 30]);
  } else {
    sonuc = null;
  }

  // Sonucu uygula veya temizle
  if (sonuc) {
    t.sonuc = sonuc;
    t.sonucTarihi = tarihIsoGeriDon(Math.max(0, gunOnce - intBetween(2, 30)));
    t.sonucGirenKullaniciId = SERKAN_ID;
    if (sonuc === 'kaybedildi') {
      t.kayipSebebi = pick(SEBEPLER);
      t.rakipFirma = t.kayipSebebi === 'rakip' ? pick(RAKIPLER) : (rng() < 0.3 ? pick(RAKIPLER) : undefined);
    } else {
      delete t.kayipSebebi;
      delete t.rakipFirma;
    }

    // Not ekle (sonuc'a göre olasılık)
    let not;
    if (sonuc === 'kazanildi'  && rng() < 0.78) not = pick(NOT_KAZANILDI);
    if (sonuc === 'kaybedildi' && rng() < 0.85) not = pick(NOT_KAYBEDILDI);
    if (sonuc === 'iptal'      && rng() < 0.55) not = pick(NOT_IPTAL);
    if (sonuc === 'beklemede'  && rng() < 0.40) not = pick(NOT_BEKLEMEDE);
    if (not) t.sonucNotu = not;
    else delete t.sonucNotu;
  } else {
    delete t.sonuc;
    delete t.sonucTarihi;
    delete t.sonucGirenKullaniciId;
    delete t.kayipSebebi;
    delete t.rakipFirma;
    delete t.sonucNotu;
  }

  t.guncellemeTarihi = t.olusturmaTarihi;
  t.lastSyncedAt = new Date().toISOString();

  // Sayım
  if (sonuc === 'kazanildi') sayim.kazanildi += 1;
  else if (sonuc === 'kaybedildi') sayim.kaybedildi += 1;
  else if (sonuc === 'iptal') sayim.iptal += 1;
  else if (sonuc === 'beklemede') sayim.beklemede += 1;
  else sayim.sonucsuz += 1;
  if (sonuc === 'kazanildi' && t.sonucNotu) sayim.notluKazanildi += 1;
  if (sonuc === 'kaybedildi' && t.sonucNotu) sayim.notluKaybedildi += 1;
  if (gunOnce <= 7) buHaftaSayisi[durum] = (buHaftaSayisi[durum] || 0) + 1;
  i += 1;
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

// Banner için: 14+ gün geçmiş gönderildi/onaylandı + sonucu yok/beklemede sayısı
const banner = serkanTeklifleri.filter((t) => {
  if (t.sonuc && t.sonuc !== 'beklemede') return false;
  if (t.durum !== 'gonderildi' && t.durum !== 'onaylandi') return false;
  const ts = new Date(t.guncellemeTarihi || t.olusturmaTarihi || t.tarih).getTime();
  const gun = (Date.now() - ts) / (24 * 3600 * 1000);
  return gun >= 14;
}).length;

console.log('\n── Yenilenen sonuç dağılımı ──');
console.log(`  Kazanıldı     : ${sayim.kazanildi.toString().padStart(3)}  (${sayim.notluKazanildi} not'lu)`);
console.log(`  Kaybedildi    : ${sayim.kaybedildi.toString().padStart(3)}  (${sayim.notluKaybedildi} not'lu)`);
console.log(`  İptal         : ${sayim.iptal.toString().padStart(3)}`);
console.log(`  Beklemede     : ${sayim.beklemede.toString().padStart(3)}`);
console.log(`  Sonuçsuz      : ${sayim.sonucsuz.toString().padStart(3)}`);
console.log(`\n── KPI öngörüsü ──`);
console.log(`  Bu hafta yazdığım: ${Object.values(buHaftaSayisi).reduce((a, b) => a + b, 0)}`);
console.log(`    detay: ${JSON.stringify(buHaftaSayisi)}`);
console.log(`  Sonuç giril. (banner tetikleyici): ${banner}`);
const winRate = sayim.kazanildi + sayim.kaybedildi > 0
  ? Math.round((sayim.kazanildi / (sayim.kazanildi + sayim.kaybedildi)) * 100)
  : null;
console.log(`  Win-rate (yöneticide görünür): ${winRate === null ? '—' : '%' + winRate}`);
