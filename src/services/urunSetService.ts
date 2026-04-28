import dayjs from 'dayjs';
import type { UrunSeti } from '../types';
import { dataStore } from './dataStore';

function tumSetleriGetir(): UrunSeti[] {
  return dataStore.getUrunSetleri();
}

function setGetir(id: string): UrunSeti | undefined {
  return tumSetleriGetir().find((s) => s.id === id);
}

function setKodunaGoreGetir(setKod: string): UrunSeti | undefined {
  const kod = setKod.trim().toLocaleUpperCase('tr-TR');
  return tumSetleriGetir().find((s) => s.setKod.trim().toLocaleUpperCase('tr-TR') === kod);
}

function setKaydet(set: UrunSeti): void {
  const now = dayjs().toISOString();
  dataStore.upsertUrunSeti({
    ...set,
    setKod: set.setKod.trim(),
    aciklama: set.aciklama.trim(),
    kalemler: set.kalemler.map((k) => ({
      ...k,
      urunKod: k.urunKod.trim(),
      aciklama: k.aciklama.trim(),
      miktar: Number.isFinite(k.miktar) ? Math.max(0, k.miktar) : 0,
      birim: (k.birim ?? '').trim() || undefined,
    })),
    olusturmaTarihi: set.olusturmaTarihi || now,
    guncellemeTarihi: now,
  });
}

function setSil(id: string): void {
  dataStore.deleteUrunSeti(id);
}

function setIdUret(): string {
  return 'set-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function setKalemIdUret(): string {
  return 'setk-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export const urunSetService = {
  tumSetleriGetir,
  setGetir,
  setKodunaGoreGetir,
  setKaydet,
  setSil,
  setIdUret,
  setKalemIdUret,
};
