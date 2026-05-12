/**
 * KullanimRehberi.tsx
 * ──────────────────────────────────────────────────────────────────
 * Kullanıcılara ilk 14 gün boyunca header'da "📖 Kullanım Rehberi"
 * butonu olarak görünür. Buton tıklanınca sağdan Drawer kayar; içinde
 * gün gün ayrılmış sade kullanım talimatları vardır.
 *
 * Süre referansı:
 *   - aktifKullanici.sifreDegisikligi (kullanıcı ilk şifresini değiştirdiği
 *     an) → 14 gün geçtikten sonra buton + drawer otomatik kaybolur.
 *   - sifreDegisikligi yoksa olusturmaTarihi'ne düşer.
 *
 * UX:
 *   - Drawer modal değildir → sayfayı bloklamaz, kullanıcı arka planı görür
 *   - Bugün hangi günse o gün vurgulanır (yeşil dot + "bugün" etiketi)
 *   - Diğer günler okunabilir ama soluk
 *   - 14 gün: 1. Hafta temel akış, 2. Hafta ileri özellikler
 */

import { useMemo, useState } from 'react';
import { Drawer, Tooltip, Button } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { useKullanici } from '../context/useKullanici';

const REHBER_GUN_SAYISI = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface GunIcerigi {
  baslik: string;
  sure: string;
  adimlar: string[];
}

const GUNLER: GunIcerigi[] = [
  // ─── 1. HAFTA — Temel Kullanım ─────────────────────────────────────
  {
    baslik: 'Kurulum & İlk Giriş',
    sure: '10 dakika',
    adimlar: [
      'Sistem ilk girişinde otomatik açılan ekrandan kendi şifrenizi belirleyin (en az 4 karakter; 0000 veya 1234 olamaz).',
      'Sağ üstteki profil ikonundan Profil → E-posta Ayarları → Gmail veya Outlook uygulama şifrenizi girin, "Test Maili Gönder" ile yeşil ✓ görene kadar deneyin.',
      'Profil → Profil Fotoğrafı → net bir fotoğrafınızı yükleyin (yöneticiler ve ekip arkadaşları sizi tanısın).',
      'Tarayıcının adres çubuğunun sağ ucundaki "Yükle" ikonuna tıklayıp programı masaüstüne kurun. Bundan sonra tarayıcı açmadan masaüstü ikonundan giriş yapın.',
    ],
  },
  {
    baslik: 'İlk Teklif',
    sure: '15 dakika',
    adimlar: [
      '"Yeni Teklif" butonu ile yeni teklif açın.',
      'Üst kısımdan müşterinizi seçin — arama kutusunda firma adını yazmaya başlayın (8000+ cariden filtrelenir).',
      '2–3 kalem ekleyin: marka, ürün kodu, miktar ve birim fiyat.',
      'Ödeme vadesi, KDV ve geçerlilik süresi seçin; açılan listede sık kullandığınız değerler üstte görünür.',
      'Sağ üstteki Kaydet butonuyla teklifi kaydedin, ardından PDF İndir ile çıktısını alın.',
    ],
  },
  {
    baslik: 'Düzenleme Pratiği',
    sure: '10 dakika',
    adimlar: [
      'Önceki teklifi açıp hücrelerin üzerine tıklayarak değerleri değiştirin (miktar, açıklama, marka).',
      'Klavyede Enter ile onayla, Esc ile iptal edebilirsiniz.',
      'Tab tuşu ile sıradaki hücreye, Shift+Tab ile önceki hücreye geçin.',
      'Bir hücrede sağ tıklarsanız "Kopyala" menüsü çıkar — değeri kopyalayıp başka yere yapıştırabilirsiniz.',
      'Satırın başındaki numaraya tıklarsanız o satır işaretlenir; bu işaret PDF çıktısında da görünür (öne çıkarmak istediğiniz kalemler için).',
    ],
  },
  {
    baslik: 'E-posta & PDF Kalitesi',
    sure: '15 dakika',
    adimlar: [
      'Bir teklifi açıp "E-posta Gönder" ile önce kendinize gönderin.',
      'Gelen kutunuzdan PDF ekini ve mesajın görünümünü kontrol edin — yazılar, logo, renkler doğru mu?',
      'Birden fazla sayfalı bir teklif için, sayfa geçişlerinde tabloyu kontrol edin: satır kesilmemiş olmalı.',
      'PDF dosyasının boyutu çok büyükse (>2 MB), açıklama metinlerini biraz kısaltarak deneyin.',
    ],
  },
  {
    baslik: 'Cari (Müşteri) Yönetimi',
    sure: '15 dakika',
    adimlar: [
      'Üst menüden "Cariler" → mevcut müşteri listesini görüntüleyin.',
      'Yeni müşteri eklemek için "+ Yeni Cari" → firma adı, vergi no, adres, telefon bilgilerini girin.',
      'Müşteri logosu varsa Cari kartı → Logo Yükle ile ekleyin. Sonraki tekliflerde otomatik PDF\'te görünür.',
      'Aynı müşteriye birden fazla "ilgili kişi" tanımlayın — sonraki tekliflerde hızlı seçim yapabilirsiniz.',
      'Cari kartında "Notlar" alanına müşteriye özel bilgileri (özel iskonto, tercih edilen marka vb.) yazın.',
    ],
  },
  {
    baslik: 'Ürün Kataloğu & Akıllı Arama',
    sure: '15 dakika',
    adimlar: [
      'Üst menüden "Ürünler" → 45000+ ürün listesini açın.',
      'Arama kutusunda ürün kodu veya açıklamayı yazın — anında filtrelenir.',
      'Teklif içinde ürün kodu hücresine yazmaya başlarsanız öneri listesi çıkar — Enter ile seçin, tüm satır otomatik dolar.',
      'Marka, birim, teslim süresi dropdown\'larında sık kullandığınız değerler en üstte sıralanır (firmanızın geçmişine göre).',
    ],
  },
  {
    baslik: 'İlk Hafta Geri Bildirim',
    sure: '10 dakika',
    adimlar: [
      'Sağ alttaki "Geri Bildirim" butonuna tıklayın.',
      'Kategori seçin: Hata / Öneri / Mesaj.',
      'Bu hafta dikkatinizi çeken her şeyi yazın — yavaşlık, kayan yazı, eksik özellik, "şöyle daha iyi olur" dediğiniz şeyler...',
      'Mesaj direkt sistem yöneticisine ulaşır; gerektiğinde uygulama içinden size cevap döner.',
    ],
  },

  // ─── 2. HAFTA — İleri Özellikler ────────────────────────────────────
  {
    baslik: 'Ürün Setleri',
    sure: '15 dakika',
    adimlar: [
      'Üst menüden "Ürün Setleri" → bir paket halinde sattığınız ürünleri grup olarak tanımlayın.',
      'Yeni Set → set kodu + adı + alt kalemleri (marka/ürün/miktar/fiyat) ekleyin.',
      'Teklif oluştururken kalem satırından "Set Uygula" ile bir seti tek tıkla teklife ekleyin.',
      'Set ana satırı + alt kalemleri PDF\'te tek bir blok olarak görünür (kurumsal görünüm).',
    ],
  },
  {
    baslik: 'Teklif Revizyonu',
    sure: '10 dakika',
    adimlar: [
      'Müşteri "fiyat düşürün" veya "kalem ekleyin" derse: ilgili teklifi açın → sağ üst menüden "Revize Et".',
      'Orijinal teklifin -Rev1 versiyonu açılır; orijinal hâli arşivde aynen durur.',
      'Revize üzerinde değişiklikleri yapın, yeni PDF üretip gönderin. Revize numarası teklif numarasının yanında görünür (örn. MEBA-2026-0042-Rev1).',
      'Birden fazla revize alabilir: Rev1 → Rev2 → Rev3. Hepsi aynı kök tekliften zincirlenir.',
    ],
  },
  {
    baslik: 'Satır-Bazlı Özellikler',
    sure: '10 dakika',
    adimlar: [
      'Üstteki "Satır Bazlı İskonto" toggle\'ı açıldığında her satıra ayrı iskonto yüzdesi verebilirsiniz.',
      'Satır üzerinde "% İskonto" rozetine tıklayarak değer girin.',
      'Çoklu para birimi (TL/EUR/USD) gerekiyorsa "Satır Bazlı Para Birimi" toggle\'ını açın — her satır kendi para biriminde olur.',
      'PDF\'te toplamlar her para birimi için ayrı satırda görünür.',
    ],
  },
  {
    baslik: 'Görsel & Ek Bilgi',
    sure: '10 dakika',
    adimlar: [
      'Teklif içinde "Görsel Ekle" butonuyla ürün fotoğrafı veya teknik çizim ekleyebilirsiniz.',
      'Sürükle bırak ile resim yükleyin; A4 üzerinde konumlandırın.',
      'Notlar bölümüne özel açıklamalar yazın — "notları PDF\'te göster" toggle\'ı ile dahil edip etmeyeceğinizi seçin.',
      'Müşteri için ek dosyalar (data sheet vb.) varsa kendi mail kutunuzdan ayrı ek olarak göndermeyi unutmayın.',
    ],
  },
  {
    baslik: 'Yönetici Analiz Merkezi',
    sure: '15 dakika',
    adimlar: [
      '(Yönetici rolündekiler) Üst menüden "Analiz" → kapsamlı performans dashboard\'u açılır.',
      'Filtreler ile tarih aralığı, firma, kişi, durum seçin.',
      'Kart paneli (toplam teklif, onay oranı, ortalama tutar) ekibinizin durumunu özetler.',
      'Risk paneli: uzun süre bekleyen teklifler, yüksek iskontolu işler, PDF\'i unutulmuş kayıtlar — proaktif takip için.',
      'Marka/ürün analizi: en çok satılanlar, kazanma oranı yüksek ürünler.',
    ],
  },
  {
    baslik: 'PDF & Yazdırma Detayları',
    sure: '10 dakika',
    adimlar: [
      'Teklif PDF\'inin kalitesini değerlendirin — yazı netliği, logo, renk doğruluğu.',
      'Yazıcıdan çıktı almak isterseniz "Yazdır" (Ctrl+P) ile direkt yazdırma menüsü açılır.',
      'Çoklu sayfa tekliflerde sayfa numaraları ve "Devam ediyor →" gösterimi otomatiktir.',
      'PDF arşivi: her oluşturulan PDF Cloudflare\'da güvenli saklanır; teklif kartından eski PDF\'lere ulaşabilirsiniz.',
    ],
  },
  {
    baslik: 'Verimli Kullanım Alışkanlıkları',
    sure: '15 dakika',
    adimlar: [
      'Klavye kısayolları: Enter (onay), Esc (iptal), Tab (sonraki hücre), Shift+Tab (önceki).',
      'Akıllı dropdown\'lar: marka/birim/teslim listeleri otomatik öğrenir — sık kullandığınızı üstte gösterir.',
      'Satır işaretleme: önemli kalemleri satır numarasına tıklayarak işaretleyin; PDF\'te de görünür.',
      'Cari ve ürün listelerini güncel tutun — yeni müşteri/ürün geldikçe sisteme ekleyin.',
      '2 haftalık deneyim sonunda toplu geri bildirimi Geri Bildirim butonundan paylaşın — bir sonraki sürüm için çok değerli.',
    ],
  },
];

/** Bugünün rehber günü (1-14). 14'ten büyükse null (rehber dolmuş). */
export function rehberGunuHesapla(referansTarih: Date | string | null | undefined): number | null {
  if (!referansTarih) return null;
  const ref = typeof referansTarih === 'string' ? new Date(referansTarih) : referansTarih;
  if (!Number.isFinite(ref.getTime())) return null;
  const gun = Math.floor((Date.now() - ref.getTime()) / MS_PER_DAY) + 1;
  if (gun < 1) return 1; // saat dilimi tolerans
  if (gun > REHBER_GUN_SAYISI) return null;
  return gun;
}

/** Header'a koyulacak buton — aktif gün varsa görünür, yoksa null. */
export default function KullanimRehberiButonu() {
  const { aktifKullanici } = useKullanici();
  const [open, setOpen] = useState(false);

  // Süre referansı: önce sifreDegisikligi (kullanıcının sistemde gerçekten
  // çalışmaya başladığı an), yoksa olusturmaTarihi.
  const referansTarih = useMemo(() => {
    if (!aktifKullanici) return null;
    return aktifKullanici.sifreDegisikligi || aktifKullanici.olusturmaTarihi || null;
  }, [aktifKullanici]);

  const aktifGun = useMemo(() => rehberGunuHesapla(referansTarih), [referansTarih]);

  // 14 gün dolduysa veya kullanıcı henüz şifresini değiştirmediyse buton gizli
  if (!aktifKullanici || aktifGun == null) return null;

  return (
    <>
      <Tooltip title={`Kullanım Rehberi — Gün ${aktifGun} / ${REHBER_GUN_SAYISI}`} placement="bottom" mouseEnterDelay={0.4}>
        <Button
          type="text"
          icon={<BookOutlined style={{ fontSize: 18, color: '#ffffff' }} />}
          onClick={() => setOpen(true)}
          aria-label="Kullanım Rehberi"
          style={{ background: 'transparent', border: 'none' }}
          className="kullanim-rehberi-btn"
        />
      </Tooltip>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOutlined style={{ fontSize: 18, color: '#1e3a5f' }} />
            <span style={{ fontWeight: 700 }}>Kullanım Rehberi</span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              background: 'rgba(34,197,94,0.12)', color: '#15803d',
              padding: '2px 8px', borderRadius: 10, letterSpacing: 0.3,
            }}>
              Gün {aktifGun} / {REHBER_GUN_SAYISI}
            </span>
          </div>
        }
        width="min(560px, 92vw)"
        placement="right"
        mask={false}
        styles={{
          body: { padding: '20px 24px 32px', background: '#fafafa' },
          header: { borderBottom: '1px solid #e8e8e8' },
        }}
      >
        <div style={{
          fontSize: 13, lineHeight: 1.55, color: '#4a4a4e',
          padding: '12px 14px', borderRadius: 8,
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.18)',
          marginBottom: 18,
        }}>
          İlk 14 gün boyunca sistemi adım adım tanımanız için günlük 10–15
          dakikalık konular. Bugünün konusu yeşil olarak işaretli, diğerleri
          istediğiniz zaman okunabilir. Anlamadığınız bir nokta olursa
          ilgili güne dönüp tekrar bakın. 14 gün sonunda bu rehber otomatik
          olarak kapanır.
        </div>

        {/* Hafta başlığı: 1. Hafta */}
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
          color: '#9b9ba0', textTransform: 'uppercase',
          marginBottom: 8, marginTop: 6, paddingLeft: 4,
        }}>
          1. Hafta — Temel Kullanım
        </div>

        {GUNLER.map((gun, i) => {
          const gunNo = i + 1;
          const isToday = gunNo === aktifGun;
          const isPast = gunNo < aktifGun;
          const isFuture = gunNo > aktifGun;
          const isFirstSecondWeek = gunNo === 8;

          return (
            <div key={gunNo}>
              {isFirstSecondWeek && (
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                  color: '#9b9ba0', textTransform: 'uppercase',
                  marginBottom: 8, marginTop: 22, paddingLeft: 4,
                }}>
                  2. Hafta — İleri Özellikler
                </div>
              )}
              <section
                style={{
                  marginBottom: 14,
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: isToday ? '#ffffff' : (isPast ? '#f5f5f5' : '#fafafa'),
                  border: isToday
                    ? '1.5px solid rgba(34,197,94,0.55)'
                    : '1px solid #e8e6e3',
                  boxShadow: isToday ? '0 4px 14px rgba(34,197,94,0.08)' : 'none',
                  opacity: isFuture ? 0.72 : 1,
                }}
              >
                <header style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  marginBottom: 10,
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 26, height: 26, borderRadius: '50%',
                    background: isToday ? '#15803d' : (isPast ? '#9b9ba0' : '#e2e0dc'),
                    color: isToday || isPast ? '#fff' : '#717176',
                    fontSize: 12, fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {gunNo}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: isToday ? '#15803d' : '#1a1a1a',
                      letterSpacing: 0.1,
                    }}>
                      Gün {gunNo} — {gun.baslik}
                      {isToday && (
                        <span style={{
                          marginLeft: 8,
                          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                          background: 'rgba(34,197,94,0.15)', color: '#15803d',
                          padding: '2px 7px', borderRadius: 6,
                          textTransform: 'uppercase',
                        }}>Bugün</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9b9ba0', marginTop: 2 }}>
                      {gun.sure}
                    </div>
                  </div>
                </header>
                <ol style={{
                  margin: 0, paddingLeft: 22,
                  fontSize: 13, lineHeight: 1.6, color: '#2c2c2e',
                }}>
                  {gun.adimlar.map((adim, j) => (
                    <li key={j} style={{ marginBottom: 6 }}>{adim}</li>
                  ))}
                </ol>
              </section>
            </div>
          );
        })}

        <div style={{
          marginTop: 24, padding: '14px 16px',
          borderRadius: 10, background: '#fff5e6',
          border: '1px solid #f59e0b',
          fontSize: 12.5, lineHeight: 1.55, color: '#78350f',
        }}>
          <strong>Takıldığınızda:</strong>{' '}
          Sağ alttaki <em>Geri Bildirim</em> butonundan direkt mesaj atın
          (Hata / Öneri / Mesaj kategorilerinden birini seçin). Sistem
          yöneticisi en kısa sürede görür ve uygulama içinden size cevap verebilir.
        </div>
      </Drawer>
    </>
  );
}
