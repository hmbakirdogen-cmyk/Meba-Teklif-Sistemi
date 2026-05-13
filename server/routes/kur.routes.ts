/**
 * kur.routes.ts
 * TCMB günlük döviz kurlarını çeker (USD + EUR) ve cache'leyerek client'a
 * sunar. CORS sorunu olmadan, public endpoint.
 *
 * Kaynak: https://www.tcmb.gov.tr/kurlar/today.xml (TCMB resmi günlük XML)
 * Cache: 30 dakika TTL — TCMB günde 1 kere güncellenir (sabah ~15:30).
 *        Hafta sonu/tatil günlerinde last good cache kullanılır.
 *
 * Response:
 *   {
 *     usd: { alis, satis, efektifAlis, efektifSatis },
 *     eur: { alis, satis, efektifAlis, efektifSatis },
 *     tarih: 'YYYY-MM-DD',
 *     sonGuncelleme: ISO timestamp,
 *     kaynak: 'TCMB'
 *   }
 *
 * Hata durumunda son başarılı cache döner; hiç cache yoksa 503.
 */

import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const kurRouter: Router = Router();

interface KurDetay {
  alis: number;          // ForexBuying
  satis: number;         // ForexSelling
  efektifAlis: number;   // BanknoteBuying
  efektifSatis: number;  // BanknoteSelling
}

interface KurResponse {
  usd: KurDetay;
  eur: KurDetay;
  tarih: string;         // YYYY-MM-DD (TCMB'nin verdiği gün)
  sonGuncelleme: string; // ISO timestamp (bu fetch ne zaman yapıldı)
  kaynak: 'TCMB';
}

const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 dakika

// In-memory cache
let cache: { data: KurResponse; fetchedAt: number } | null = null;

/** XML'den bir <Currency Kod="..."> bloğunu çek, içindeki 4 değeri parse et. */
function parseCurrency(xml: string, kod: 'USD' | 'EUR'): KurDetay | null {
  // Currency bloğunu yakala (kod attribute'una göre)
  const blockRegex = new RegExp(
    `<Currency[^>]*Kod="${kod}"[^>]*>([\\s\\S]*?)<\\/Currency>`,
    'i',
  );
  const blockMatch = xml.match(blockRegex);
  if (!blockMatch) return null;
  const block = blockMatch[1];

  const num = (tag: string): number => {
    const m = block.match(new RegExp(`<${tag}>([^<]+)<\\/${tag}>`, 'i'));
    if (!m) return 0;
    const val = parseFloat(m[1].trim());
    return isFinite(val) ? val : 0;
  };

  const alis = num('ForexBuying');
  const satis = num('ForexSelling');
  const efektifAlis = num('BanknoteBuying');
  const efektifSatis = num('BanknoteSelling');

  // Eğer hiçbir değer parse edilemediyse (yapı bozuk) null dön
  if (!alis && !satis && !efektifAlis && !efektifSatis) return null;
  return { alis, satis, efektifAlis, efektifSatis };
}

/** TCMB XML'inden Tarih attribute'unu çek ("DD.MM.YYYY" formatı → YYYY-MM-DD). */
function parseTarih(xml: string): string {
  // <Tarih_Date ... Tarih="13.05.2026" Date="05/13/2026">
  const m = xml.match(/Tarih="(\d{2})\.(\d{2})\.(\d{4})"/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Fallback: bugün
  return new Date().toISOString().slice(0, 10);
}

async function fetchTcmb(): Promise<KurResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8sn timeout
  try {
    const resp = await fetch(TCMB_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/xml,text/xml,*/*' },
    });
    if (!resp.ok) throw new Error(`TCMB HTTP ${resp.status}`);
    const xml = await resp.text();

    const usd = parseCurrency(xml, 'USD');
    const eur = parseCurrency(xml, 'EUR');
    if (!usd || !eur) throw new Error('TCMB XML parse hatası — USD/EUR bulunamadı');

    return {
      usd,
      eur,
      tarih: parseTarih(xml),
      sonGuncelleme: new Date().toISOString(),
      kaynak: 'TCMB',
    };
  } finally {
    clearTimeout(timeout);
  }
}

// GET /api/kur — public (auth gerekmez, sadece okuma)
kurRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const now = Date.now();
    // Cache hit?
    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      res.json(cache.data);
      return;
    }
    // Cache expire — yenilemeyi dene
    try {
      const fresh = await fetchTcmb();
      cache = { data: fresh, fetchedAt: now };
      res.json(fresh);
    } catch (err) {
      console.warn('[kur] TCMB fetch hatası:', (err as Error).message);
      // Son başarılı cache'i kullan
      if (cache) {
        res.json({
          ...cache.data,
          // Bilgilendirme: bu veri kaynaktan ulaşılamadığı için cached
          _cached: true,
        });
        return;
      }
      throw new HttpError(503, 'TCMB kur servisine erişilemedi ve cache yok.');
    }
  }),
);
