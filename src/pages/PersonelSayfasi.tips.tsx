/**
 * PersonelSayfasi.tips.tsx — rehber tipleri (iskelet, Faz 6b)
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(PERSONEL_TIPLERI, { sayfaAdi: 'Personel' });
 *
 * Pool boşken global 🎓 FAB "Personel için rehber henüz hazır değil"
 * diyaloğu gösterir; pool dolunca otomatik aktif sequence başlar.
 */
import type { TipDef } from '../components/tipler/tipTipleri';

export const PERSONEL_TIPLERI: TipDef[] = [
  // Faz 6b'de eklenecek tipler — örnek hedefler:
  //   • Yeni personel ekleme (yönetici)
  //   • Rol/unvan düzenleme
  //   • Görev/izin atama
];
