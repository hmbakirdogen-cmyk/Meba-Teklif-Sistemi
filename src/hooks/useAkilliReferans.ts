/**
 * useAkilliReferans.ts
 * ─────────────────────────────────────────────────────────────────
 * Referans listelerini (marka, birim, teslim süresi, KDV oranı, ödeme
 * vadesi, geçerlilik, döviz kuru, para birimi) aktif firmanın geçmiş
 * teklif kayıtlarındaki **kullanım sıklığı + son kullanım tarihi** ile
 * yeniden sıralar.
 *
 * Davranış:
 *   1) Sık kullanılan değerler en üstte (örn. en çok marka olarak girilen
 *      "SMC" → en üstte).
 *   2) Aynı sıklıkta olanlar son kullanıma göre (yeni kullanılan üstte).
 *   3) Hiç kullanılmamış değerler orijinal referans sırasıyla altta kalır
 *      (referans listesi değişmez, sadece görünüm sırası değişir).
 *
 * Firma scope:
 *   - aktifFirma seçili ise yalnız o firmanın teklifleri sayılır
 *   - super_admin "tüm firmalar" görünümünde ise tüm teklifler
 *
 * Performans:
 *   - useMemo([alan, firmaId, teklif sayısı]) — dropdown açıldığında
 *     hesap O(teklifSayısı * satirSayısı), 200 teklif * 10 satır = 2k iter,
 *     ms altında. Cache invalidate stratejisi yeterli.
 */

import { useMemo } from 'react';
import { useFirma } from '../context/useFirma';
import { teklifService } from '../services/teklifService';
import { referansVeriService } from '../services/referansVeriService';
import type { Referans } from '../services/apiClient';

export type AkilliReferansAlani = keyof Referans;

/**
 * Verilen referans alanı için aktif firmanın kullanım deseniyle uyumlu
 * sıralı liste döndürür.
 */
export function useAkilliReferans(alan: AkilliReferansAlani): string[] {
  const { aktifFirma } = useFirma();
  const aktifFirmaId = aktifFirma?.id;

  // teklifService cache'i değiştiğinde memo'yu yenilemek için sayım kullan.
  const teklifSayisi = teklifService.tumTeklifleriGetir().length;

  return useMemo(() => {
    const orijinal = referansVeriService[alan].tumunuGetir();
    if (orijinal.length === 0) return orijinal;

    const teklifler = teklifService
      .tumTeklifleriGetir()
      .filter((t) => !t.deletedAt && (!aktifFirmaId || t.firmaId === aktifFirmaId));

    const freq = new Map<string, number>();
    const lastTs = new Map<string, number>();

    const sayim = (deger: string | number | undefined | null, ts: number) => {
      if (deger === undefined || deger === null || deger === '') return;
      const key = String(deger).trim();
      if (!key) return;
      freq.set(key, (freq.get(key) || 0) + 1);
      const prev = lastTs.get(key) || 0;
      if (ts > prev) lastTs.set(key, ts);
    };

    for (const t of teklifler) {
      const ts = new Date(t.guncellemeTarihi || t.olusturmaTarihi || t.tarih || 0).getTime();
      switch (alan) {
        case 'markalar':
          for (const s of t.satirlar || []) sayim(s.marka, ts);
          break;
        case 'birimler':
          for (const s of t.satirlar || []) sayim(s.birim, ts);
          break;
        case 'teslimSecenekleri':
          for (const s of t.satirlar || []) sayim(s.teslimTarihi, ts);
          break;
        case 'paraBirimleri':
          sayim(t.paraBirimi, ts);
          // satır-bazlı para birimi varsa onları da say
          if (t.satirBazliParaBirimi) {
            for (const s of t.satirlar || []) sayim(s.paraBirimi, ts);
          }
          break;
        case 'kdvOranlari':
          sayim(t.kdvOrani, ts);
          break;
        case 'odemeVadesiSecenekleri':
          sayim(t.odemeVadesi, ts);
          break;
        case 'gecerlilikSecenekleri':
          sayim(t.gecerlilikSuresi, ts);
          break;
        case 'dovizKuruSecenekleri':
          sayim(t.dovizKuru, ts);
          break;
      }
    }

    // Kararlı sıralama: önce frequency desc, eşitse son kullanım desc,
    // eşitse orijinal indekse göre asc (referans sırasını korur).
    const indexMap = new Map(orijinal.map((v, i) => [v, i]));
    return [...orijinal].sort((a, b) => {
      const aF = freq.get(a) || 0;
      const bF = freq.get(b) || 0;
      if (aF !== bF) return bF - aF;
      const aT = lastTs.get(a) || 0;
      const bT = lastTs.get(b) || 0;
      if (aT !== bT) return bT - aT;
      return (indexMap.get(a) ?? 0) - (indexMap.get(b) ?? 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alan, aktifFirmaId, teklifSayisi]);
}
