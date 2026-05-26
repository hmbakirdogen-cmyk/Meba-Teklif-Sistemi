/**
 * FirmaProfilSayfasi.tips.tsx — rehber tipleri
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(FIRMA_PROFIL_TIPLERI, { sayfaAdi: 'Firma Profili' });
 */
import type { TipDef } from '../components/tipler/tipTipleri';
import { ButonHoverAnimasyonu } from '../components/tipAnimasyonlar';
import { ilkGorunurEslesme as bul } from '../components/tipler/tipUtils';

export const FIRMA_PROFIL_TIPLERI: TipDef[] = [
  {
    id: 'firma-tab-listesi',
    baslik: (h) => `Firmalar arası geçiş — sekmeden seçin, ${h}`,
    aciklama: () =>
      'Birden fazla firmayı yönetiyorsanız üstteki logolu sekmeler arasında geçiş yaparak istediğiniz firmanın profilini açabilirsiniz. Seçtiğiniz sekmedeki bilgiler PDF teklif şablonunda kullanılır; her firma için ayrı adres, IBAN ve teklif öneki tanımlayabilirsiniz.',
    miniEtiket: 'FİRMA SEÇ',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="firma-tab-listesi"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="firma-tab-listesi"]') != null,
  },
  {
    id: 'firma-teklif-varsayilanlari',
    baslik: (h) => `Teklif varsayılanları — hız kazanın, ${h}`,
    aciklama: () =>
      'Para birimi, KDV oranı, iskonto, ödeme vadesi, geçerlilik süresi ve teslim süresi gibi bilgileri buraya tanımlarsanız yeni teklif açtığınızda bu alanlar otomatik dolar. Müşteriye özel ayar geçmişi varsa o öncelikli olur; siz sadece istisnaları düzeltirsiniz, her teklif için baştan girmenize gerek kalmaz.',
    miniEtiket: 'VARSAYILAN AYARLA',
    gostericiOk: true,
    kartGenislik: 720,
    targetSelector: () => bul('[data-tip-target="firma-teklif-varsayilanlari"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="firma-teklif-varsayilanlari"]') != null,
  },
  {
    id: 'firma-profil-kaydet',
    baslik: (h) => `Değişiklikleri kaydedin, ${h}`,
    aciklama: () =>
      "Firma bilgilerini düzenledikten sonra bu butona basmadığınız sürece değişiklikler etkin olmaz. Kaydet'e basınca yeni bilgiler tüm PDF teklif şablonlarına ve sonraki teklif oluşturma akışlarına yansır. Geri almak isterseniz alanları eski haline döndürüp tekrar kaydetmeniz yeterli.",
    miniEtiket: 'KAYDET',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="firma-profil-kaydet"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="firma-profil-kaydet"]') != null,
  },
];
