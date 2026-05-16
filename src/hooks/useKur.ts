/**
 * useKur.ts
 * TCMB günlük döviz kuru bilgisini çeker (USD + EUR).
 *
 * Davranış:
 *   • Mount'ta `/api/kur` çağrılır
 *   • Her 30 dakikada bir auto-refresh
 *   • Son başarılı sonuç localStorage'da → offline / yavaş ağda anlık göster
 *   • Hata durumunda son cache değer korunur
 */
import { useEffect, useState } from 'react';
import { APP_CONFIG } from '../config';

export interface KurDetay {
  alis: number;
  satis: number;
  efektifAlis: number;
  efektifSatis: number;
}

export interface KurVerisi {
  usd: KurDetay;
  eur: KurDetay;
  tarih: string;          // YYYY-MM-DD (TCMB'nin verdiği gün)
  sonGuncelleme: string;  // ISO timestamp (fetch zamanı)
  kaynak: 'TCMB';
  _cached?: boolean;      // server-side cache döndüyse true
}

const LS_KEY = 'meba_kur_cache';
const REFRESH_MS = 30 * 60 * 1000; // 30 dk

// TR saatine göre bugün (Europe/Istanbul). new Date().toISOString() UTC döner
// → gece 03:00 öncesi yanlış gün → bu helper Intl ile TR zone'da bugünü verir.
function bugunYMD(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// ─────────────────────────────────────────────────────────────────────────────
// Kur güncellik durumu — gün farkına göre seviye + renk + relatif etiket.
// TCMB her iş günü sabah ~15:30 yayınlar; hafta sonu/tatil dünkü kuru kalır.
// Bu helper'ın amacı kullanıcının "kur güncel mi?" sorusunu anlık görmesi.
// ─────────────────────────────────────────────────────────────────────────────

export type KurDurumSeviye = 'guncel' | 'oncekiIsGunu' | 'eski' | 'kritik';

export interface KurDurumDetay {
  seviye: KurDurumSeviye;
  /** CSS renk — kart üstü mini nokta + popover tarih etiketi için. */
  renk: string;
  /** Kısa kullanıcı etiketi: "Bugün" / "Dün" / "3 gün önce". */
  etiket: string;
  /** title= tooltip için uzun açıklama. */
  aciklama: string;
  /** Bugünle kur tarihi arasındaki gün farkı (≥0). */
  gunFarki: number;
}

function gunFarkiHesapla(kurTarihi: string, bugun: string): number {
  const parse = (s: string): number => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  };
  const a = parse(kurTarihi);
  const b = parse(bugun);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function kurDurumuHesapla(
  kurTarihi: string,
  cached?: boolean,
): KurDurumDetay {
  const gun = gunFarkiHesapla(kurTarihi, bugunYMD());

  // Server tarafı `_cached` flag'i TCMB fetch hatasında set ediliyor →
  // gün farkı düşük olsa bile kritik gibi davran (gerçek yanıt eski cache'ten).
  if (cached) {
    return {
      seviye: 'kritik',
      renk: '#DC2626',
      etiket: gun === 0 ? 'Bugün (önbellek)' : `${gun} gün önce (önbellek)`,
      aciklama: 'TCMB servisine erişilemiyor — önbellekteki kur gösteriliyor. Kuru manuel doğrula.',
      gunFarki: gun,
    };
  }

  if (gun === 0) {
    return {
      seviye: 'guncel',
      renk: '#10B981',
      etiket: 'Bugün',
      aciklama: 'Kur bugün TCMB tarafından yayınlandı.',
      gunFarki: 0,
    };
  }

  if (gun <= 2) {
    return {
      seviye: 'oncekiIsGunu',
      renk: '#F59E0B',
      etiket: gun === 1 ? 'Dün' : `${gun} gün önce`,
      aciklama: 'TCMB bugünkü kuru henüz açıklamadı. Yayın saati: iş günleri 15:30 sonrası.',
      gunFarki: gun,
    };
  }

  if (gun <= 3) {
    return {
      seviye: 'eski',
      renk: '#EA580C',
      etiket: `${gun} gün önce`,
      aciklama: 'Kur birkaç gün eski — uzun hafta sonu/tatil olabilir. Önemli tekliflerde manuel kontrol önerilir.',
      gunFarki: gun,
    };
  }

  return {
    seviye: 'kritik',
    renk: '#DC2626',
    etiket: `${gun} gün önce`,
    aciklama: 'Kur uzun süredir güncellenmedi — TCMB bağlantı sorunu olabilir. Önemli teklifte kuru manuel doğrula.',
    gunFarki: gun,
  };
}

function readLocal(): KurVerisi | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KurVerisi;
    if (!parsed?.usd || !parsed?.eur) return null;
    // Tarih kontrolü: eğer cache'deki tarih bugün DEĞİLSE göz ardı et →
    // mount'ta direkt fresh fetch tetiklenir, kullanıcı dünkü kuru görmez.
    // (Hafta sonu/tatil senaryosunda server zaten last good cache döner.)
    if (parsed.tarih !== bugunYMD()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocal(v: KurVerisi): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(v));
  } catch {
    /* ignore quota */
  }
}

export function useKur(): {
  kur: KurVerisi | null;
  yukleniyor: boolean;
  hata: string | null;
} {
  const [kur, setKur] = useState<KurVerisi | null>(() => readLocal());
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;

    const cek = async () => {
      setYukleniyor(true);
      try {
        const resp = await fetch(`${APP_CONFIG.API_BASE}/kur`, {
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as KurVerisi;
        if (iptal) return;
        setKur(data);
        writeLocal(data);
        setHata(null);
      } catch (e) {
        if (iptal) return;
        const msg = (e as Error)?.message || 'Bilinmeyen hata';
        console.warn('[useKur] fetch hatası:', msg);
        setHata(msg);
        // kur state'ini koru (localStorage'dan gelmiş olabilir)
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    };

    cek();
    const id = window.setInterval(cek, REFRESH_MS);

    // Tab tekrar görünür olunca kur'u tazele — kullanıcı sabah uygulamayı
    // tekrar açıp pasif sekmeye geçtiyse, geri dönünce güncel kur görsün.
    // Kontrol: cache tarih'i bugün değilse fetch.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const local = readLocal();
        if (!local || local.tarih !== bugunYMD()) {
          cek();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      iptal = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return { kur, yukleniyor, hata };
}
