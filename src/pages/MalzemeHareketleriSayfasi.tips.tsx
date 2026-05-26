/**
 * MalzemeHareketleriSayfasi.tips.tsx — rehber tipleri (iskelet, Faz 6b)
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(MALZEME_HAREKETLERI_TIPLERI, { sayfaAdi: 'Malzeme Hareketleri' });
 *
 * Pool boşken global 🎓 FAB "Malzeme Hareketleri için rehber henüz hazır
 * değil" diyaloğu gösterir; pool dolunca otomatik aktif sequence başlar.
 */
import type { TipDef } from '../components/tipler/tipTipleri';

export const MALZEME_HAREKETLERI_TIPLERI: TipDef[] = [
  // Faz 6b'de eklenecek tipler — örnek hedefler:
  //   • Hareket tipi filtre (giriş / çıkış / transfer)
  //   • Tarih aralığı seçici
  //   • Ürün arama
];
