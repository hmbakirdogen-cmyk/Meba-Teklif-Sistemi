/**
 * ReferansVerilerSayfasi.tips.tsx — rehber tipleri (iskelet, Faz 6b)
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(REFERANS_VERILER_TIPLERI, { sayfaAdi: 'Referans Veriler' });
 *
 * Pool boşken global 🎓 FAB "Referans Veriler için rehber henüz hazır değil"
 * diyaloğu gösterir; pool dolunca otomatik aktif sequence başlar.
 */
import type { TipDef } from '../components/tipler/tipTipleri';

export const REFERANS_VERILER_TIPLERI: TipDef[] = [
  // Faz 6b'de eklenecek tipler — örnek hedefler:
  //   • Ürün arama (cari / kod / tarih filtre)
  //   • Geçmiş fiyat detay paneli
  //   • Yeni referans manuel ekleme
];
