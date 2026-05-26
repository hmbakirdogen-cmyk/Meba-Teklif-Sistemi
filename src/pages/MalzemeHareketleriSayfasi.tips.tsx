/**
 * MalzemeHareketleriSayfasi.tips.tsx — rehber tipleri
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(MALZEME_HAREKETLERI_TIPLERI, { sayfaAdi: 'Malzeme Hareketleri' });
 */
import type { TipDef } from '../components/tipler/tipTipleri';
import { ButonHoverAnimasyonu } from '../components/tipAnimasyonlar';
import { ilkGorunurEslesme as bul } from '../components/tipler/tipUtils';

export const MALZEME_HAREKETLERI_TIPLERI: TipDef[] = [
  {
    id: 'malzeme-arama-kutusu',
    baslik: (h) => `Ürün kodunu yazıp geçmişi açın, ${h}`,
    aciklama: () =>
      'Bu kutuya ürün kodunu yazmaya başladığınızda katalogdan öneriler düşer; istediğinizi seçtiğinizde o kodun tüm teklif geçmişi otomatik açılır. Hangi müşteriye, hangi tarihte, hangi fiyatla teklif verildiğini bir bakışta görerek yeni teklif için doğru fiyat aralığını yakalayabilirsiniz.',
    miniEtiket: 'ÜRÜN KODU YAZ',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="malzeme-arama-kutusu"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="malzeme-arama-kutusu"]') != null,
  },
  {
    id: 'malzeme-gecmis-getir',
    baslik: (h) => `Geçmişi getirin, sorgu başlasın, ${h}`,
    aciklama: () =>
      "Kodu yazıp Enter'a basabilir veya doğrudan bu butona tıklayarak sorgulayabilirsiniz. Sistem tüm tekliflerinizi tarar ve özet kartlar, fiyat trend grafiği ve detay tablo birlikte gelir. Sonuç yoksa \"kayıt bulunamadı\" uyarısı çıkar — kod yazımını ve büyük/küçük harf farklılıklarını kontrol etmeniz yeterli.",
    miniEtiket: 'GEÇMİŞİ GETİR',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="malzeme-gecmis-getir"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="malzeme-gecmis-getir"]') != null,
  },
  {
    id: 'malzeme-fiyat-grafigi',
    baslik: (h) => `Fiyat trendini grafikten okuyun, ${h}`,
    aciklama: () =>
      'Yatay eksen tarihi, dikey eksen birim fiyatı gösterir; her nokta bir teklif kalemine karşılık gelir. Noktaların üzerine gelirseniz hangi müşteriye hangi tarihte verildiğini görebilir, fiyatın zamanla nasıl değiştiğini takip edebilirsiniz. Farklı para birimleri ayrı renklerde çizilir, karışıklık olmaz.',
    miniEtiket: 'TRENDİ İNCELE',
    gostericiOk: true,
    kartGenislik: 720,
    targetSelector: () => bul('[data-tip-target="malzeme-fiyat-grafigi"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="malzeme-fiyat-grafigi"]') != null,
  },
];
