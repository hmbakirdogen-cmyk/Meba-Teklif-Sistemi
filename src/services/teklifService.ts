import dayjs from 'dayjs';
import type { Teklif } from '../types';
import { dataStore } from './dataStore';

function normalizeEskiKayit(t: Teklif): Teklif {
  const fallbackPb = t.paraBirimi ?? 'TRY';
  const satirPb = fallbackPb === 'TRY' || fallbackPb === 'EUR' || fallbackPb === 'USD' ? fallbackPb : 'TRY';

  return {
    ...t,
    odemeVadesi: t.odemeVadesi ?? '45 Gun',
    satirBazliParaBirimi: t.satirBazliParaBirimi ?? false,
    satirlar: (t.satirlar ?? []).map((satir) => ({
      ...satir,
      paraBirimi: satir.paraBirimi ?? satirPb,
    })),
  };
}

function tumTeklifleriGetir(): Teklif[] {
  return dataStore.getTeklifler().map(normalizeEskiKayit);
}

function teklifGetir(id: string): Teklif | undefined {
  return tumTeklifleriGetir().find((t) => t.id === id);
}

function teklifKaydet(teklif: Teklif): void {
  const now = dayjs().toISOString();
  dataStore.upsertTeklif({ ...teklif, guncellemeTarihi: now });
}

function teklifSil(id: string): void {
  dataStore.deleteTeklif(id);
}

function teklifKopyala(
  id: string,
  kullanici?: { id: string; adSoyad: string; rol: string },
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
  teklifKaydet,
  teklifSil,
  teklifKopyala,
  teklifIdUret,
  teklifNoUretAsync,
};
