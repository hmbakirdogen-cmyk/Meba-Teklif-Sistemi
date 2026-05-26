/**
 * TeklifListesi.tips.tsx — rehber tipleri (iskelet, Faz 6b)
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(TEKLIF_LISTESI_TIPLERI, { sayfaAdi: 'Teklif Listesi' });
 *
 * Pool boşken global 🎓 FAB "Teklif Listesi için rehber henüz hazır değil"
 * diyaloğu gösterir; pool dolunca otomatik aktif sequence başlar.
 *
 * Handoff'tan planlı 5 tip (Faz 6b):
 *   • Yeni Teklif CTA (sağ üst)
 *   • Filtre/arama satırı
 *   • Sıralama dropdown
 *   • Klasör görünümü vs aktivite akışı toggle
 *   • Kart üzerinde aksiyonlar (Çoğalt / Sil / Sonuç)
 */
import type { TipDef } from '../components/tipler/tipTipleri';

export const TEKLIF_LISTESI_TIPLERI: TipDef[] = [
  // Faz 6b'de eklenecek tipler.
];
