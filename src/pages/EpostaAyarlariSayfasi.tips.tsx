/**
 * EpostaAyarlariSayfasi.tips.tsx — rehber tipleri
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(EPOSTA_AYARLARI_TIPLERI, { sayfaAdi: 'E-posta Ayarları' });
 */
import type { TipDef } from '../components/tipler/tipTipleri';
import { ButonHoverAnimasyonu } from '../components/tipAnimasyonlar';
import { ilkGorunurEslesme as bul } from '../components/tipler/tipUtils';

export const EPOSTA_AYARLARI_TIPLERI: TipDef[] = [
  {
    id: 'eposta-saglayici-secimi',
    baslik: (h) => `Önce sağlayıcınızı seçin, ${h}`,
    aciklama: () =>
      'Gmail, Outlook veya Yandex gibi bilinen bir e-posta sağlayıcısı kullanıyorsanız listeden seçmeniz yeterli; sunucu adı ve port otomatik dolar. Özel bir SMTP sunucunuz varsa "Custom" seçeneğini bırakıp altındaki alanları kendiniz doldurabilirsiniz. 2FA aktifse normal şifre değil App Password gereklidir.',
    miniEtiket: 'SAĞLAYICI SEÇ',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="eposta-saglayici-secimi"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="eposta-saglayici-secimi"]') != null,
  },
  {
    id: 'eposta-baglanti-test',
    baslik: (h) => `Bağlantıyı kaydetmeden test edin, ${h}`,
    aciklama: () =>
      'Bilgileri doldurduktan sonra bu butona basarsanız sistem sunucuya gerçekten bağlanabildiğini kontrol eder ve sonucu hemen ekranda gösterir. Test için şifreyi yazmanız gerekir; kaydedilmiş şifre bu testte kullanılamaz. Hata alırsanız host, port veya App Password değerini gözden geçirmeniz yeterli.',
    miniEtiket: 'BAĞLANTIYI TEST ET',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="eposta-baglanti-test"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="eposta-baglanti-test"]') != null,
  },
  {
    id: 'eposta-test-mail',
    baslik: (h) => `Kendinize bir test maili gönderin, ${h}`,
    aciklama: () =>
      'Ayarları kaydettikten sonra bu butona basarsanız sistem kendi e-posta adresinize küçük bir test mesajı yollar. Gelen kutunuzda mesajı görüyorsanız teklifleriniz müşterilere sorunsuz ulaşacak demektir. Mail gelmezse spam klasörünü ve App Password değerini kontrol etmeniz yeterli.',
    miniEtiket: 'TEST MAİLİ GÖNDER',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="eposta-test-mail"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="eposta-test-mail"]') != null,
  },
];
