import dayjs from 'dayjs';
import type { Teklif } from '../types';
import { dataStore } from './dataStore';

/** Defansif client-side visibility filter. Backend zaten filtreliyor olsa da
 *  ek savunma katmanı: cache'de eski/yetkisiz teklifler kalmış olabilir. */
function visibilityFiltrele(
  liste: Teklif[],
  kullanici?: { id: string; rol: string },
): Teklif[] {
  if (!kullanici || kullanici.rol === 'admin') return liste;
  return liste.filter((t) => {
    const vis = t.visibility ?? 'team';
    return vis === 'team' || t.hazirlayanKullaniciId === kullanici.id;
  });
}

function normalizeEskiKayit(t: Teklif): Teklif {
  const fallbackPb = t.paraBirimi ?? 'TRY';
  const satirPb = fallbackPb === 'TRY' || fallbackPb === 'EUR' || fallbackPb === 'USD' ? fallbackPb : 'TRY';

  return {
    ...t,
    odemeVadesi: t.odemeVadesi ?? '45 Gün',
    satirBazliParaBirimi: t.satirBazliParaBirimi ?? false,
    satirlar: (t.satirlar ?? []).map((satir) => ({
      ...satir,
      indirimOrani: satir.indirimOrani ?? 0,
      paraBirimi: satir.paraBirimi ?? satirPb,
    })),
  };
}

function tumTeklifleriGetir(
  kullanici?: { id: string; rol: string },
): Teklif[] {
  const liste = dataStore.getTeklifler().map(normalizeEskiKayit);
  return visibilityFiltrele(liste, kullanici);
}

function teklifGetir(
  id: string,
  kullanici?: { id: string; rol: string },
): Teklif | undefined {
  return tumTeklifleriGetir(kullanici).find((t) => t.id === id);
}

/** Re-fetch from server with visibility filter (TeklifListesi açıldığında
 *  taze veri için). Async — store'u günceller, kullanım sonrası
 *  tumTeklifleriGetir() filtered list döner.
 *
 *  Cariler de paralel tazelenir — kart logoları/cari snapshot'ları için
 *  güncel master kayıtlara ihtiyaç var. */
async function tekliferiYenile(
  kullanici?: { id: string; rol: string },
): Promise<void> {
  await Promise.all([
    dataStore.refreshTeklifler(kullanici),
    dataStore.refreshCariler(kullanici),
  ]);
}

function teklifKaydet(teklif: Teklif): void {
  const now = dayjs().toISOString();
  dataStore.upsertTeklif({ ...teklif, guncellemeTarihi: now });
}

function teklifCacheGuncelle(teklif: Teklif): void {
  dataStore.cacheUpsertTeklif(teklif);
}

function teklifSil(id: string): void {
  dataStore.deleteTeklif(id);
}

function teklifKopyala(
  id: string,
  kullanici?: { id: string; adSoyad: string; rol: string; unvan?: string },
): Teklif | undefined {
  const kaynak = teklifGetir(id);
  if (!kaynak) return undefined;
  const now = dayjs().toISOString();
  return {
    ...kaynak,
    id: teklifIdUret(),
    teklifNo: '---',
    tarih: dayjs().format('YYYY-MM-DD'),
    durum: 'taslak',
    olusturmaTarihi: now,
    guncellemeTarihi: now,
    ...(kullanici && {
      hazirlayanKullaniciId: kullanici.id,
      hazirlayanAdSoyad: kullanici.adSoyad,
      hazirlayanRol: kullanici.rol,
      hazirlayanUnvan: kullanici.unvan,
    }),
  };
}

function teklifIdUret(): string {
  return 't' + Date.now().toString(36);
}

function teklifNoUretAsync(): Promise<string> {
  return dataStore.incrementSayac();
}

export const teklifService = {
  tumTeklifleriGetir,
  teklifGetir,
  tekliferiYenile,
  teklifKaydet,
  teklifCacheGuncelle,
  teklifSil,
  teklifKopyala,
  teklifIdUret,
  teklifNoUretAsync,
};
