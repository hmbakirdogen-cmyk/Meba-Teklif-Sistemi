/**
 * TarihKumandaSection — Kumanda Paneli'nin EN ÜST section'ı.
 * Premium gazete tarzı tarih kompozisyonu:
 *   - Üst satır: gün adı (PERŞEMBE) — küçük, pembe accent, geniş letter-spacing
 *   - Alt satır: 14 MAYIS 2026 — gün numarası büyük krem, ay+yıl medium soft
 *
 * Gece yarısı geçişini yakalamak için 60s interval ile tarih yenilenir
 * (gün gerçekten değişene kadar state aynı kalır → React diff bypass, re-render
 * neredeyse görünmez).
 */
import { useEffect, useState } from 'react';

const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'] as const;
const AYLAR = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
               'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'] as const;

function tarihAnahtari(d: Date): string {
  // Gün değişimi tetikleyicisi — saat/dakika değişimleri state'i kirletmez.
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function TarihKumandaSection() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      const fresh = new Date();
      setNow((prev) => (tarihAnahtari(prev) === tarihAnahtari(fresh) ? prev : fresh));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const gunAdi = GUNLER[now.getDay()];
  const gunNo  = now.getDate();
  const ayAdi  = AYLAR[now.getMonth()];
  const yil    = now.getFullYear();

  return (
    <div className="kp-tarih-rozet" aria-label={`${gunAdi} ${gunNo} ${ayAdi} ${yil}`}>
      <div className="kp-tarih-gun">{gunAdi}</div>
      <div className="kp-tarih-ana">
        <span className="kp-tarih-gunno">{gunNo}</span>
        <span className="kp-tarih-ay">{ayAdi}</span>
        <span className="kp-tarih-yil">{yil}</span>
      </div>
    </div>
  );
}
