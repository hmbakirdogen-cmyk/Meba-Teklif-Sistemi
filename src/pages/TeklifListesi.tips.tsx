/**
 * TeklifListesi.tips.tsx — rehber tipleri
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(TEKLIF_LISTESI_TIPLERI, { sayfaAdi: 'Teklif Listesi' });
 */
import type { TipDef } from '../components/tipler/tipTipleri';
import { ButonHoverAnimasyonu } from '../components/tipAnimasyonlar';
import { ilkGorunurEslesme as bul } from '../components/tipler/tipUtils';

export const TEKLIF_LISTESI_TIPLERI: TipDef[] = [
  {
    id: 'liste-yeni-teklif',
    baslik: (h) => `Yeni Teklif — bir tıkla başlayın, ${h}`,
    aciklama: () =>
      'Sağ üstteki mavi "+ Yeni Teklif" butonu sizi boş bir teklif editörüne götürür. Yeni teklifte ilk olarak alıcı kartı açılır; müşteriyi seçtikten sonra otomatik bir satır eklenir. Müşterinin telefon, e-posta ve adres bilgileri arşivden gelir — yeniden yazmaya gerek yok.',
    miniEtiket: 'YENİ TEKLİF',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('button[data-tip-target="yeni-teklif"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('button[data-tip-target="yeni-teklif"]') != null,
  },
  {
    id: 'liste-arama',
    baslik: (h) => `Arama kutusu — hızlı bulma, ${h}`,
    aciklama: () =>
      'Müşteri firma adı veya klasör adıyla anında arama yapın. Yazdıkça liste daralır; aradığınız teklif kartı renkli vurguyla öne çıkar. Boşluğa tıklayıp sağdaki "×" ile aramayı sıfırlayabilirsiniz. Klavye kısayolu olarak Ctrl+F de aramayı odaklar.',
    miniEtiket: 'ARA',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="liste-arama"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="liste-arama"]') != null,
  },
  {
    id: 'liste-gorunum-modu',
    baslik: (h) => `Izgara veya Liste — istediğiniz gibi, ${h}`,
    aciklama: () =>
      'Sağ üstteki iki ikon görünüm modunu değiştirir. IZGARA: müşteri klasörleri büyük kart halinde, görsel hızlı; teklif sayısı + son aktivite tarihi öne çıkar. LİSTE: aynı klasörler tek satır halinde, daha çok bilgi (toplam ciro, vade vb.) tek bakışta görünür. Seçiminiz tarayıcıda hatırlanır.',
    miniEtiket: 'GÖRÜNÜM',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="liste-gorunum-modu"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="liste-gorunum-modu"]') != null,
  },
];
