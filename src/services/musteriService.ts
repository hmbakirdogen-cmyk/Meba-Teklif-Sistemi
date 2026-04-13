import type { Cari } from '../types';
import { dataStore } from './dataStore';

function tumCarileriGetir(): Cari[] {
  return dataStore.getCariler();
}

function cariKaydet(cari: Cari): void {
  dataStore.upsertCari(cari);
}

function cariSil(id: string): void {
  dataStore.deleteCari(id);
}

function cariIdUret(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/** Son kullanılan muhatap bilgisini cari kaydına yazar (sadece lastContact alanları). */
function cariMuhatapGuncelle(cariId: string, name: string, title: 'BEY' | 'HANIM'): void {
  const liste = tumCarileriGetir();
  const cari  = liste.find((c) => c.id === cariId);
  if (!cari) return;
  dataStore.upsertCari({
    ...cari,
    lastContactName:  name || undefined,
    lastContactTitle: name ? title : undefined,
  });
}

/** Excel'den toplu aktarım — mevcut listeyi değiştirir (merge: cariKod bazında) */
function carileriMergeAktar(yeniCariler: Cari[]): { eklenen: number; guncellenen: number } {
  const mevcut = tumCarileriGetir();
  const sonuc  = [...mevcut];
  let eklenen    = 0;
  let guncellenen = 0;

  for (const yeni of yeniCariler) {
    const idx = sonuc.findIndex(
      (c) =>
        c.cariKod === yeni.cariKod ||
        c.firmaAdi.trim().toLowerCase() === yeni.firmaAdi.trim().toLowerCase(),
    );
    if (idx >= 0) {
      sonuc[idx] = { ...sonuc[idx], ...yeni, id: sonuc[idx].id };
      guncellenen++;
    } else {
      sonuc.push(yeni);
      eklenen++;
    }
  }

  dataStore.bulkReplaceCariler(sonuc);
  return { eklenen, guncellenen };
}

export const cariService = {
  tumCarileriGetir,
  cariKaydet,
  cariSil,
  cariIdUret,
  cariMuhatapGuncelle,
  carileriMergeAktar,
};
