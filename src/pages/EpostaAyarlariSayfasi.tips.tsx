/**
 * EpostaAyarlariSayfasi.tips.tsx — rehber tipleri (iskelet, Faz 6b)
 *
 * Hook çağrısı sayfada:
 *   useSayfaRehberi(EPOSTA_AYARLARI_TIPLERI, { sayfaAdi: 'E-posta Ayarları' });
 *
 * Pool boşken global 🎓 FAB "E-posta Ayarları için rehber henüz hazır değil"
 * diyaloğu gösterir; pool dolunca otomatik aktif sequence başlar.
 */
import type { TipDef } from '../components/tipler/tipTipleri';

export const EPOSTA_AYARLARI_TIPLERI: TipDef[] = [
  // Faz 6b'de eklenecek tipler — örnek hedefler:
  //   • SMTP kurulum sihirbazı (self-serve)
  //   • SMTP test e-postası gönder butonu
  //   • E-posta imzası düzenleme
  //   • PDF ek davranışı (her zaman ekle / soru sor)
];
