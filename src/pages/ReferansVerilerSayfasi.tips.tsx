/**
 * ReferansVerilerSayfasi.tips.tsx — rehber tipleri
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(REFERANS_VERILER_TIPLERI, { sayfaAdi: 'Referans Veriler' });
 */
import type { TipDef } from '../components/tipler/tipTipleri';
import { ButonHoverAnimasyonu } from '../components/tipAnimasyonlar';
import { ilkGorunurEslesme as bul } from '../components/tipler/tipUtils';

export const REFERANS_VERILER_TIPLERI: TipDef[] = [
  {
    id: 'referans-sekme-listesi',
    baslik: (h) => `Hangi listeyi düzenleyeceğinizi seçin, ${h}`,
    aciklama: () =>
      'Üstteki sekmeler arasında geçiş yaparak markaları, birimleri, para birimlerini, ödeme vade seçeneklerini, KDV oranlarını, döviz kuru kaynaklarını, geçerlilik sürelerini ve ürün setlerini ayrı ayrı yönetebilirsiniz. Buraya eklediğiniz değerler yeni teklif satırı açtığınızda dropdown listelerinde görünür.',
    miniEtiket: 'SEKME SEÇ',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="referans-sekme-listesi"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="referans-sekme-listesi"]') != null,
  },
  {
    id: 'referans-secenek-ekle',
    baslik: (h) => `Listeye yeni seçenek ekleyin, ${h}`,
    aciklama: () =>
      "Soldaki kutuya yeni değeri yazıp bu butona basarsanız (veya Enter'a basarsanız) seçenek listeye eklenir ve hemen tüm teklif formlarında kullanılabilir hale gelir. Yanlış eklediğiniz bir seçeneği listeden kırmızı sil ikonuyla kaldırabilirsiniz — silinmiş seçenekleri geçmiş tekliflerden temizlemez, sadece yeni listeden çıkarır.",
    miniEtiket: 'SEÇENEK EKLE',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="referans-secenek-ekle"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="referans-secenek-ekle"]') != null,
  },
  {
    id: 'referans-yeni-set',
    baslik: (h) => `Tekrar eden kalemleri set olarak kaydedin, ${h}`,
    aciklama: () =>
      'Sık birlikte teklif ettiğiniz ürünleri tek bir set kodu altında tanımlarsanız yeni teklifte o kodu seçtiğinizde tüm alt kalemler otomatik gelir. Pano montaj seti, başlangıç paketi gibi tekrar eden gruplar için süre kazandırır — her seferinde tek tek satır eklemenize gerek kalmaz.',
    miniEtiket: 'SET TANIMLA',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="referans-yeni-set"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="referans-yeni-set"]') != null,
  },
];
