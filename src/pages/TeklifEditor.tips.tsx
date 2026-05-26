/**
 * TeklifEditor.tips.tsx
 * ─────────────────────────────────────────────────────────────────
 * TeklifEditor sayfasina ozel rehber tip pool'u. Hook:
 *   const rehber = useSayfaRehberi(TEKLIF_EDITOR_TIPLERI, options);
 *
 * Sıra (Mehmet Bey kararı):
 *   1) Üst bar aksiyonları: Durum → İlgili Kişi → Notlar → PDF → Gönder
 *   2) A4 belge başlangıcı:  Müşteri kartı → Tarih
 *   3) Satır + hücre işlemleri: Araya ekle → Yükseklik → Ürün Kodu (autofill +
 *      değişim) → Açıklama DB → Birim Fiyat popup → Para Birimi Karışık
 *   4) Yardımcı: Kontrol paneli kilit → Referans veriler
 *
 * Başlık/açıklama fonksiyon — `kullaniciHitap` ("Mehmet Bey") parametre olarak gelir.
 * Tüm metinler kibar, rica tonunda. Mehmet Bey: "müşteriyi sıkmadan, sade ve net."
 */
import {
  RowResizeAnimasyonu,
  RowInsertAnimasyonu,
  UrunKoduAutofillAnimasyonu,
  UrunKoduDegisimAnimasyonu,
  AciklamaSenkroAnimasyonu,
  ButonHoverAnimasyonu,
  ParaBirimiKarisikAnimasyonu,
  BirimFiyatPopupAnimasyonu,
  TarihDegisimAnimasyonu,
  KilitDurumAnimasyonu,
  ReferansVerilerAnimasyonu,
  DurumButonAnimasyonu,
} from '../components/tipAnimasyonlar';
import type { TipDef } from '../components/tipler/tipTipleri';
import { ilkGorunurEslesme as bul } from '../components/tipler/tipUtils';

export const TEKLIF_EDITOR_TIPLERI: TipDef[] = [
  {
    id: 'belge-durumu',
    baslik: (h) => `Belge Durumu — teklifin yaşam döngüsü, ${h}`,
    aciklama: () => 'Üstteki renkli pille bir teklifin durumunu yönetirsiniz. 5 durum vardır: Taslak (gri, çalışıyorum), Hazır (mavi, gönderilebilir), Gönderildi (açık mavi, müşteriye gitti — mail attığınızda otomatik düşer), Onaylandı (yeşil, satış açıldı), İptal (kırmızı, kapatıldı). Pille tıklayıp manuel değiştirebilir veya program otomatik akışına bırakabilirsiniz.',
    miniEtiket: 'DURUMU SEÇ',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('button[data-tip-target="durum"]'),
    animasyon: (rect) => <DurumButonAnimasyonu rect={rect} />,
    animAltKaplama: 320,
  },
  {
    id: 'ilgili-kisi-ata',
    baslik: (h) => `İlgili kişi atayın — sorumluluk paylaşımı, ${h}`,
    aciklama: () => 'Toolbar\'daki kullanıcı + ikonuna basın, şirket içi personel listesi açılır. Bir sorumlu seçtiğinizde sistem ona otomatik bildirim gönderir; teklif onun ana ekranında görünür. Sorumlu sonradan değiştirilebilir.',
    miniEtiket: 'KİŞİ ATA',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('button[data-tip-target="ilgili-kisi"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
  },
  {
    id: 'notlar-popover',
    baslik: (h) => `Notlar — size özel şirket içi hafıza, ${h}`,
    aciklama: () => 'Bu buton size özel bir not defteri açar. Müşteri görüşmeleri, telefon notları, fiyat tartışmaları, rakip bilgileri — buraya yazdıklarınız asla müşteriye gitmez, sadece sizde kalır.',
    miniEtiket: 'BURAYA YAZIN',
    gostericiOk: true,
    yanEtki: 'panel-notlar',
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="notlar-textarea"]') ?? bul('[data-tip-target="notlar"]'),
    ekHedeflerSelector: () => {
      const textarea = bul('[data-tip-target="notlar-textarea"]');
      const buton = bul('[data-tip-target="notlar"]');
      return textarea && buton ? [buton] : [];
    },
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
  },
  {
    id: 'pdf-uretim',
    baslik: (h) => `PDF — teklifi dosyaya çevirin, ${h}`,
    aciklama: () => 'PDF butonu teklifin A4 formatını üretir. Profilinizde bir klasör seçtiyseniz (örn. "MEBA Teklifler") oraya kaydedilir; aksi takdirde tarayıcının İndirilenler klasörüne iner. PDF üretildiği anda belge durumu otomatik "Hazır"a geçer.',
    miniEtiket: 'PDF ÜRET',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('button[data-tip-target="pdf"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
  },
  {
    id: 'gonder-mail',
    baslik: (h) => `Gönder — PDF'i müşteriye yollayın, ${h}`,
    aciklama: () => 'Tek tıkla üç iş: PDF üretilir, klasöre arşivlenir, müşterinin e-posta adresine taslak mail açılır. Mailı gönderdiğiniz anda belge durumu "Gönderildi"ye geçer ve sistem cevap takibine başlar.',
    miniEtiket: 'GÖNDER',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('button[data-tip-target="gonder"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
  },
  {
    id: 'baslangic-cari',
    baslik: (h) => `Müşteri kartı — teklifin omurgası, ${h}`,
    aciklama: () => 'Sağ üst köşedeki Alıcı kartı tüm teklif akışının kalbidir. Firmayı seçer, muhatabı atar, e-posta adresini girersiniz. Girdiğiniz e-posta "Gönder"e basıldığında mailin alıcı satırına otomatik düşer — adresi tekrar yazmaya gerek yok. Telefon ve adres PDF\'te görünür. Bir kere doğru doldurun, sistem her aşamada bu bilgileri kendiliğinden taşır.',
    miniEtiket: 'BURAYI DOLDURUN',
    targetSelector: () => bul('[data-alan="musteri"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    kartTercihYon: 'ust',
  },
  {
    id: 'tarih-degisim',
    baslik: (h) => `Tarihi istediğiniz zaman değiştirebilirsiniz, ${h}`,
    aciklama: () => 'Teklif başlığındaki Tarih satırına tıklayın, küçük bir takvim açılır. Bir gün seçtiğiniz anda belge tarihi yenilenir — kilit kırmızıya alınmadığı sürece her zaman düzenlenebilir.',
    miniEtiket: 'TARİHE TIKLA',
    targetSelector: () => bul('tr[data-tip-target="tarih"]'),
    animasyon: (rect) => <TarihDegisimAnimasyonu rect={rect} />,
    animAltKaplama: 200,
  },
  {
    id: 'satir-araya-ekle',
    baslik: (h) => `Satır arasına yeni kalem, ${h}`,
    aciklama: () => 'İki satır arasına imleci yaklaştırın, mavi bir + butonu belirir. Tıklarsanız yeni satır tam o noktada açılır — sona eklemek yerine doğru sıraya yerleştirebilirsiniz.',
    miniEtiket: '+ ARAYA EKLE',
    targetSelector: () => bul('.satir-araya-ekle-zone'),
    animasyon: (rect) => <RowInsertAnimasyonu rect={rect} />,
    onKosul: () => bul('tr[data-satir-id]') != null,
    animAltKaplama: 90,
  },
  {
    id: 'satir-yukseklik',
    baslik: (h) => `Satır yüksekliğini ayarlamak için, ${h}`,
    aciklama: () => 'Bir satırın alt kenarındaki ince mavi çizgiyi tutup aşağı çekin. Yalnız o satırın yüksekliği artar — uzun açıklamaları rahat sığdırırsınız. Diğer satırlara dokunulmaz.',
    miniEtiket: 'MAVİ ÇİZGİYİ ÇEKİN',
    targetSelector: () => bul('tr[data-satir-id]'),
    animasyon: (rect) => <RowResizeAnimasyonu rect={rect} />,
    onKosul: () => bul('tr[data-satir-id]') != null,
    animAltKaplama: 80,
  },
  {
    id: 'urun-kodu-autofill',
    baslik: (h) => `Ürün kodu 3 alanı sizin yerinize doldurur, ${h}`,
    aciklama: () => 'Boş bir satırda Ürün Kodu hücresine kod yazıp öneriden seçtiğinizde Marka, Açıklama ve Birim Fiyat alanları veritabanındaki son değerlerle otomatik gelir. Her birini tek tek yazmaya gerek kalmaz.',
    miniEtiket: 'KOD SEÇ',
    targetSelector: () => bul('td[data-cell-field="urunKod"]'),
    animasyon: (rect) => <UrunKoduAutofillAnimasyonu rect={rect} />,
    onKosul: () => bul('td[data-cell-field="urunKod"]') != null,
    animAltKaplama: 170,
  },
  {
    id: 'urun-kodu-degisim',
    baslik: (h) => `Bir satırın kodunu değiştirirseniz, ${h}`,
    aciklama: () => 'Dolu bir satırın kodunu değiştirip başka bir ürün seçtiğinizde: Marka her zaman yeni ürünün markasıyla güncellenir. Açıklama, veritabanında o ürünün kayıtlı bir açıklaması varsa onunla değişir; yoksa sizin yazdığınız metin korunur. Birim Fiyat ve Birim ise size aittir — daha önce girdiyseniz korunur.',
    miniEtiket: 'KODU DEĞİŞTİR',
    targetSelector: () => bul('td[data-cell-field="urunKod"]'),
    animasyon: (rect) => <UrunKoduDegisimAnimasyonu rect={rect} />,
    onKosul: () => bul('td[data-cell-field="urunKod"]') != null,
    animAltKaplama: 60,
  },
  {
    id: 'aciklama-db-senkron',
    baslik: (h) => `Açıklama düzeltmeleriniz veritabanına yansır, ${h}`,
    aciklama: () => 'Açıklamayı değiştirdiğinizde "Veritabanı da güncellensin mi?" diye sorar. "Güncelle" derseniz aynı ürün bir dahaki sefer seçildiğinde yeni açıklama otomatik gelir.',
    miniEtiket: 'VERİTABANI GÜNCELLE',
    targetSelector: () => bul('td[data-cell-field="aciklama"]'),
    animasyon: (rect) => <AciklamaSenkroAnimasyonu rect={rect} />,
    onKosul: () => bul('td[data-cell-field="aciklama"]') != null,
    animAltKaplama: 140,
  },
  {
    id: 'birim-fiyat-popup',
    baslik: (h) => `Birim Fiyat — fiyat + o satıra özel iskonto, ${h}`,
    aciklama: () => 'Birim Fiyat hücresine tıkladığınızda popup açılır. Üstte birim fiyat alanı ve liste fiyatı önerisi yer alır; hemen altında yalnız o satır için açılan iskonto oranını rahatlıkla girebilirsiniz. Yüzde alanına bir değer yazdığınız anda satır toplamına yansır — diğer satırlara dokunulmaz.',
    miniEtiket: 'FİYAT GİR',
    targetSelector: () => bul('td[data-cell-field="birimFiyat"]'),
    animasyon: (rect) => <BirimFiyatPopupAnimasyonu rect={rect} />,
    onKosul: () => bul('td[data-cell-field="birimFiyat"]') != null,
    animAltKaplama: 220,
  },
  {
    id: 'para-birimi-karisik',
    baslik: (h) => `Para Birimi — tek tip veya karışık, ${h}`,
    aciklama: () => 'Para Birimi kartından TL, EUR veya USD seçer; ya da "Karışık (₺ · € · $)" diyerek her satırın kendi para birimini taşımasını sağlarsınız. Aynı teklifte 125 € filtre + 145 $ sensör + 8.500 ₺ valf yan yana — her satır kendi birimiyle yazılır, toplamlar her para birimi için ayrı gösterilir.',
    miniEtiket: 'PARA BİRİMİ SEÇ',
    targetSelector: () => bul('[data-alan="ayar-paraBirimi"]'),
    animasyon: (rect) => <ParaBirimiKarisikAnimasyonu rect={rect} />,
    animAltKaplama: 340,
  },
  {
    id: 'kontrol-paneli-kilit',
    baslik: (h) => `Kontrol panelindeki kilit, ${h}`,
    aciklama: () => 'Sağ kontrol panelinde bir kilit butonu var. YEŞİL iken belge düzenlenebilir: satır eklersiniz, hücrelere yazarsınız, iskonto ve para birimi değiştirirsiniz. KIRMIZI olduğunda salt-okunur olur — kalemler donar, yanlış tıklama içeriği bozmaz; yazdırma, PDF ve mail yine aktif kalır.',
    miniEtiket: 'KİLİDİ AÇ',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('button[data-tip-target="kilit"]'),
    animasyon: (rect) => <KilitDurumAnimasyonu rect={rect} />,
  },
  {
    id: 'referans-veriler',
    baslik: (h) => `Referans veriler — bu ürünü kime, kaça sattınız, ${h}`,
    aciklama: () => 'Ürün kodu girilmiş bir satırın yanında küçük bir geçmiş ikonu belirir. Tıkladığınızda sağdan açılan panelde aynı ürünün önceki tekliflerini tarih, müşteri, miktar ve fiyat olarak görürsünüz. Yeni fiyat verirken referans bulmanın en hızlı yolu.',
    miniEtiket: 'GEÇMİŞE BAK',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('span[data-tip-target="referanslar"]'),
    animasyon: (rect) => <ReferansVerilerAnimasyonu rect={rect} />,
    onKosul: () => bul('span[data-tip-target="referanslar"]') != null,
  },
  // ── Faz 4 — Yanıp sönen göstergeler (Mehmet Bey direktifi 2026-05-26) ─
  // "Arayüzde yanıp sönen noktaların veya ikonların manasını mutlaka anlat."
  // Bu 3 tip arayüzde belirip kaybolan küçük göstergeleri açıklar; her biri
  // onKosul ile koşullu çalışır — gösterge görünür değilse rehber atlar.
  {
    id: 'revize-rozet',
    baslik: (h) => `Mor "⟳ Revize" rozeti, ${h}`,
    aciklama: () => 'Durum pilinin yanında belirdiyse: teklif Hazır/Gönderildi/Onaylandı gibi bir aşamadayken üzerinde değişiklik yapıldı demektir. Sistem her değişiklikte teklifi otomatik Taslak\'a çekip "revize" işaretler. PDF güncel değildir — düzeltmeden sonra tekrar PDF üretip Gönder ile yenisini iletmeniz gerekir.',
    miniEtiket: 'REVİZE',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="revize-rozet"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="revize-rozet"]') != null,
  },
  {
    id: 'pdf-kayit-rozet',
    baslik: (h) => `PDF kayıt rozeti — yeşil veya turuncu, ${h}`,
    aciklama: () => 'PDF butonunun yanında küçük renkli bir klasör rozeti çıkar. YEŞİL "Klasöre: …" → seçtiğiniz klasör hazır, PDF doğrudan oraya kaydedilir. TURUNCU "Klasör izni yenilenmeli" → tarayıcı izni süresi doldu, PDF üretirken sizden bir kez daha onay isteyecek. Rozet görünmüyorsa PDF\'ler tarayıcının İndirilenler klasörüne iner.',
    miniEtiket: 'PDF KLASÖR',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="pdf-kayit-rozet"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="pdf-kayit-rozet"]') != null,
  },
  {
    id: 'kismi-onay-banner',
    baslik: (h) => `Sarı kısmi onay bandı, ${h}`,
    aciklama: () => 'Müşteri tekliften bazı kalemleri onaylayıp bazılarını reddettiyse durumu "Kısmi Onay"a çekersiniz; üstte sarı bir banner belirir. A4 üzerinde reddedilen satırlara tıklayıp ✕ ile işaretler, sağ taraftaki "Tamamla"ya basarsınız. Onaylanan kalemler kalır, reddedilenler iptal işaretlenir; toplamlar otomatik yeniden hesaplanır.',
    miniEtiket: 'KALEMLERİ İŞARETLE',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="kismi-onay-banner"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="kismi-onay-banner"]') != null,
  },
];
