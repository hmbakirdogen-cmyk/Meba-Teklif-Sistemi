/**
 * AnalizSayfasi.tips.tsx — rehber tipleri (iskelet, Faz 6b'de doldurulacak)
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(ANALIZ_TIPLERI, { sayfaAdi: 'Analiz' });
 *
 * Pool boşken global 🎓 FAB "Analiz için rehber henüz hazır değil" diyaloğu
 * gösterir; pool dolunca otomatik aktif sequence başlar.
 */
import type { TipDef } from '../components/tipler/tipTipleri';

export const ANALIZ_TIPLERI: TipDef[] = [
  // Faz 6b'de eklenecek tipler — örnek hedefler:
  //   • Tarih aralığı filtresi (üst toolbar)
  //   • Grafik tipi seçici (line/bar/pie)
  //   • Personel/Müşteri/Ürün kırılım sekmeleri
  //   • Excel export butonu
];
