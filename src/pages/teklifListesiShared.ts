import type { Teklif, TeklifDurum, KayipSebebi } from '../types';

// Sonuç görünüm config'i — direkt durum'a bağlı.
// Sadece sonuçlanmış durumlar için tanımlı (taslak/hazir/gonderildi'de "sonuç badge" yok).
export const SONUC_CFG: Partial<Record<TeklifDurum, { label: string; color: string; bg: string; border: string; emoji: string }>> = {
  onaylandi:  { label: 'Onaylandı',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', emoji: '✓' },
  reddedildi: { label: 'Kaybedildi', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', emoji: '✕' },
  iptal:      { label: 'İptal',      color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', emoji: '○' },
};

// Sebep listesi — hem Kaybedildi hem İptal için aynı havuz; kullanıcı seçer.
export const KAYIP_SEBEBI_LABEL: Record<KayipSebebi, string> = {
  fiyat:       'Fiyat',
  rakip:       'Rakip',
  zaman:       'Zaman/Süre',
  ihtiyac_yok: 'İhtiyaç düştü',
  diger:       'Diğer',
};

export interface YoneticiOzetiData {
  funnel: Record<TeklifDurum, number>;
  sonucSayim: { kazanildi: number; kaybedildi: number; iptal: number; beklemede: number; girilmemis: number };
  acikPipeline: Record<string, number>;
  winRate: number | null;
  topSebepler: Array<[KayipSebebi, number]>;
  topPersonel: Array<{ ad: string; kazanildi: number; kayipli: number; toplam: number }>;
  kararliToplam: number;
}

/** Pure helper — teklif listesinden yönetici özeti metriklerini hesaplar.
 *  Yeni mantık: durum tek model — onaylandı=kazandı, kapanmadı=kaybetti, iptal=iptal. */
export function computeYoneticiOzeti(teklifler: Teklif[]): YoneticiOzetiData {
  const funnel: Record<TeklifDurum, number> = {
    taslak: 0, hazir: 0, gonderildi: 0, onaylandi: 0, siparis_alindi: 0, reddedildi: 0, iptal: 0,
  };
  const sonucSayim = { kazanildi: 0, kaybedildi: 0, iptal: 0, beklemede: 0, girilmemis: 0 };
  const acikPipeline: Record<string, number> = { TRY: 0, EUR: 0, USD: 0 };
  const sebepSayim: Record<string, number> = {};
  const personelMap = new Map<string, { ad: string; kazanildi: number; kayipli: number; toplam: number }>();

  for (const t of teklifler) {
    if (t.durum && funnel[t.durum] !== undefined) funnel[t.durum] += 1;

    if (t.durum === 'onaylandi') sonucSayim.kazanildi += 1;
    else if (t.durum === 'reddedildi') sonucSayim.kaybedildi += 1;
    else if (t.durum === 'iptal') sonucSayim.iptal += 1;
    else sonucSayim.girilmemis += 1;

    const sonuclu = t.durum === 'onaylandi' || t.durum === 'reddedildi' || t.durum === 'iptal';
    if (!sonuclu) {
      const pb = t.paraBirimi || 'TRY';
      acikPipeline[pb] = (acikPipeline[pb] || 0) + (t.genelToplam || 0);
    }

    if (t.durum === 'reddedildi' && t.kayipSebebi) {
      sebepSayim[t.kayipSebebi] = (sebepSayim[t.kayipSebebi] || 0) + 1;
    }

    const pid = t.hazirlayanKullaniciId;
    if (pid) {
      const ad = t.hazirlayanAdSoyad || pid;
      if (!personelMap.has(pid)) personelMap.set(pid, { ad, kazanildi: 0, kayipli: 0, toplam: 0 });
      const p = personelMap.get(pid)!;
      p.toplam += 1;
      if (t.durum === 'onaylandi') p.kazanildi += 1;
      if (t.durum === 'reddedildi') p.kayipli += 1;
    }
  }

  const karar = sonucSayim.kazanildi + sonucSayim.kaybedildi;
  const winRate = karar > 0 ? Math.round((sonucSayim.kazanildi / karar) * 100) : null;
  const topSebepler = Object.entries(sebepSayim)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3) as Array<[KayipSebebi, number]>;
  const topPersonel = Array.from(personelMap.values())
    .sort((a, b) => b.kazanildi - a.kazanildi || b.toplam - a.toplam)
    .slice(0, 3);

  return { funnel, sonucSayim, acikPipeline, winRate, topSebepler, topPersonel, kararliToplam: karar };
}
