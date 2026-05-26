/**
 * VeriYonetimiSayfasi.tips.tsx — rehber tipleri
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(VERI_YONETIMI_TIPLERI, { sayfaAdi: 'Veri Yönetimi' });
 */
import type { TipDef } from '../components/tipler/tipTipleri';
import { ButonHoverAnimasyonu } from '../components/tipAnimasyonlar';
import { ilkGorunurEslesme as bul } from '../components/tipler/tipUtils';

export const VERI_YONETIMI_TIPLERI: TipDef[] = [
  {
    id: 'veri-cari-toolbar',
    baslik: (h) => `Müşteri listesini buradan yönetin, ${h}`,
    aciklama: () =>
      "Cariler sekmesinde yeni müşteri ekleyebilir, mevcutları düzenleyebilir veya silebilirsiniz. Elinizdeki müşteri listesi Excel formatındaysa \"Excel'den Aktar\" ile topluca yükleyebilir, boş şablonu indirip kendi listesini doldurabilir veya mevcut listeyi yedek olarak indirebilirsiniz.",
    miniEtiket: 'CARİLERİ AÇ',
    gostericiOk: true,
    kartGenislik: 720,
    targetSelector: () => bul('[data-tip-target="veri-cari-toolbar"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="veri-cari-toolbar"]') != null,
  },
  {
    id: 'veri-excel-aktar',
    baslik: (h) => `Excel'den toplu içe aktarım, ${h}`,
    aciklama: () =>
      'Bu butona basarsanız Excel dosyanızı seçebileceğiniz pencere açılır; dosyayı seçtiğinizde sistem kayıtları okur, aynı kodu taşıyanları günceller, yeni olanları ekler. İşlem sonunda kaç kaydın eklendiğini, güncellendiğini ve atlandığını gösteren özet çıkar. Şablonu önceden indirip ona göre doldurmanız iş kolaylaştırır.',
    miniEtiket: "EXCEL'DEN İÇE AKTAR",
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="veri-excel-aktar"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="veri-excel-aktar"]') != null,
  },
  {
    id: 'veri-yeni-cari',
    baslik: (h) => `Tek bir müşteriyi elle ekleyin, ${h}`,
    aciklama: () =>
      "Excel hazırlamak istemediğiniz tek müşteriler için bu butona basabilirsiniz; küçük bir form açılır ve cari kod, firma adı, yetkili, telefon, e-posta gibi alanları doldurmanız yeterli. Kaydet'e bastığınızda müşteri hemen listeye eklenir ve yeni teklif açarken müşteri seçim ekranında görünür.",
    miniEtiket: 'CARİ EKLE',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="veri-yeni-cari"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="veri-yeni-cari"]') != null,
  },
];
