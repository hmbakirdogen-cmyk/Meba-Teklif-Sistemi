/**
 * VeriYonetimiSayfasi.tips.tsx — rehber tipleri (iskelet, Faz 6b)
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(VERI_YONETIMI_TIPLERI, { sayfaAdi: 'Veri Yönetimi' });
 *
 * Pool boşken global 🎓 FAB "Veri Yönetimi için rehber henüz hazır değil"
 * diyaloğu gösterir; pool dolunca otomatik aktif sequence başlar.
 */
import type { TipDef } from '../components/tipler/tipTipleri';

export const VERI_YONETIMI_TIPLERI: TipDef[] = [
  // Faz 6b'de eklenecek tipler — örnek hedefler:
  //   • Excel'den toplu cari import
  //   • Excel'den toplu ürün import
  //   • Veritabanı yedek al / yükle
  //   • Eski teklifleri arşivle
];
