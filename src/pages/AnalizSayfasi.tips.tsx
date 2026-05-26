/**
 * AnalizSayfasi.tips.tsx — rehber tipleri
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(ANALIZ_TIPLERI, { sayfaAdi: 'Analiz' });
 */
import type { TipDef } from '../components/tipler/tipTipleri';
import { ButonHoverAnimasyonu } from '../components/tipAnimasyonlar';
import { ilkGorunurEslesme as bul } from '../components/tipler/tipUtils';

export const ANALIZ_TIPLERI: TipDef[] = [
  {
    id: 'analiz-filtre-cubugu',
    baslik: (h) => `Filtre çubuğu — analizi daraltın, ${h}`,
    aciklama: () =>
      'Tarih aralığı, kullanıcı, firma, durum ve para birimini tek bir bakışta filtreleyebilirsiniz. Üstteki seçimleri değiştirdikçe aşağıdaki tüm kartlar, tablolar ve grafikler anlık olarak güncellenir. Boş bırakırsanız sistem genelinde tüm teklifler görünür; ihtiyaç bittiğinde sağ uçtaki "Temizle" ile sıfırlayabilirsiniz.',
    miniEtiket: 'FİLTRELE',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="analiz-filtre-cubugu"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="analiz-filtre-cubugu"]') != null,
  },
  {
    id: 'analiz-ozet-kartlari',
    baslik: (h) => `Hızlı özet kartları — günün nabzı, ${h}`,
    aciklama: () =>
      'Bugün hazırlanan, bu ay biriken, bekleyen, onaylanan ve reddedilen teklif sayıları burada özetlenir. PDF üretim oranı ve en aktif kullanıcı/firma bilgisi de aynı şeritte yer alır. Filtre değiştirdiğinizde kartlar otomatik yenilenir — bir bakışta operasyonun nerede olduğunu görebilirsiniz.',
    miniEtiket: 'ÖZETİ OKU',
    gostericiOk: true,
    kartGenislik: 720,
    targetSelector: () => bul('[data-tip-target="analiz-ozet-kartlari"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="analiz-ozet-kartlari"]') != null,
  },
  {
    id: 'analiz-risk-merkezi',
    baslik: (h) => `Dikkat merkezi — risk gözünden kaçmasın, ${h}`,
    aciklama: () =>
      'Uzun süredir bekleyen teklifler, yüksek iskontolu kalemler, PDF üretilip gönderilmemiş dosyalar ve teslim tarihi boş kalan kayıtlar burada toplanır. Sekmelerden istediğiniz risk türüne geçerek teklifi tek tıkla açabilir, gerekli aksiyonu hemen alabilirsiniz.',
    miniEtiket: 'RİSKLERİ GÖR',
    gostericiOk: true,
    kartGenislik: 720,
    targetSelector: () => bul('[data-tip-target="analiz-risk-merkezi"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="analiz-risk-merkezi"]') != null,
  },
];
