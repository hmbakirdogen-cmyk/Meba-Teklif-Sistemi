/**
 * FirmaProfilSayfasi.tips.tsx — rehber tipleri (iskelet, Faz 6b)
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(FIRMA_PROFIL_TIPLERI, { sayfaAdi: 'Firma Profili' });
 *
 * Pool boşken global 🎓 FAB "Firma Profili için rehber henüz hazır değil"
 * diyaloğu gösterir; pool dolunca otomatik aktif sequence başlar.
 */
import type { TipDef } from '../components/tipler/tipTipleri';

export const FIRMA_PROFIL_TIPLERI: TipDef[] = [
  // Faz 6b'de eklenecek tipler — örnek hedefler:
  //   • Firma logosu yükleme
  //   • PDF kayıt klasörü adı
  //   • Adres / iletişim alanları
  //   • Banka hesap bilgileri (PDF altbilgisinde görünür)
];
