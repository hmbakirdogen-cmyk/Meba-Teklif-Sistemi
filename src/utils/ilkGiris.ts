export function ilkGirisGerekli(kullanici: { mustChangePassword?: boolean; profilFotoUrl?: string } | null): boolean {
  if (!kullanici) return false;
  if (kullanici.mustChangePassword) return true;
  // Profil fotoğrafı OPSIYONEL — modal şifre değişince kapanır, kullanıcı
  // istediği zaman Profil sayfasından yükler. (R2 erişim sorunu yaşandığında
  // kullanıcıyı modaldan çıkamaz hale getirmemek için zorunlu adım kaldırıldı.)
  return false;
}
