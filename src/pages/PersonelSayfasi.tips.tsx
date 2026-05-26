/**
 * PersonelSayfasi.tips.tsx — rehber tipleri
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(PERSONEL_TIPLERI, { sayfaAdi: 'Personel' });
 */
import type { TipDef } from '../components/tipler/tipTipleri';
import { ButonHoverAnimasyonu } from '../components/tipAnimasyonlar';
import { ilkGorunurEslesme as bul } from '../components/tipler/tipUtils';

export const PERSONEL_TIPLERI: TipDef[] = [
  {
    id: 'personel-yeni-ekle',
    baslik: (h) => `Yeni personeli buradan ekleyin, ${h}`,
    aciklama: () =>
      'Bu butona basarsanız küçük bir form açılır; kullanıcı adı, ad-soyad, ünvan ve rol bilgilerini girmeniz yeterli. Kayıt tamamlanınca sisteme varsayılan bir şifre düşer (personel için 0000, yönetici için 1234) ve personel ilk girişte kendi şifresini belirler. Mail kurulumunu kendisi yapar.',
    miniEtiket: 'PERSONEL EKLE',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="personel-yeni-ekle"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="personel-yeni-ekle"]') != null,
  },
  {
    id: 'personel-toplu-foto-isle',
    baslik: (h) => `Tüm profil fotolarını tek tıkla düzeltin, ${h}`,
    aciklama: () =>
      'Bu butona basarsanız yetki alanınızdaki tüm personel için mevcut profil fotoları yeniden indirilir, yüz tespiti yapılır ve vesikalık biçimde yakınlaştırılarak kaydedilir. İşlem birkaç dakika sürebilir; ilerleme buton üzerinde sayaç olarak görünür. Tek tek elle düzenlemeye gerek kalmaz.',
    miniEtiket: 'FOTOLARI İŞLE',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="personel-toplu-foto-isle"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="personel-toplu-foto-isle"]') != null,
  },
  {
    id: 'personel-sifre-sifirla',
    baslik: (h) => `Personel şifresini buradan sıfırlayın, ${h}`,
    aciklama: () =>
      'Bir personel şifresini unutursa bu butona basarsanız sistem yeni bir varsayılan şifre üretir ve ekrana büyük puntoyla yazar. Şifreyi personele iletmeniz yeterli — kendisi ilk girişte yeni şifresini belirleyecek. Eski şifreyle giriş yapılamaz, güvenlik açığı oluşmaz.',
    miniEtiket: 'ŞİFRE SIFIRLA',
    gostericiOk: true,
    kartGenislik: 540,
    targetSelector: () => bul('[data-tip-target="personel-sifre-sifirla"]'),
    animasyon: (rect) => <ButonHoverAnimasyonu rect={rect} />,
    onKosul: () => bul('[data-tip-target="personel-sifre-sifirla"]') != null,
  },
];
