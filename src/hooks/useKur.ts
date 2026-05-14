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

function bugunYMD(): string {
  return new Date().toISOString().slice(0, 10);
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
