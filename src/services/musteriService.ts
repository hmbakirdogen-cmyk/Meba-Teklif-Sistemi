import type { Cari } from '../types';

const STORAGE_KEY = 'teklif_cariler';

const varsayilanCariler: Cari[] = [
  {
    id: 'm1',
    cariKod: 'C-001',
    firmaAdi: 'PARAK MAKİNA',
    yetkiliKisi: 'Hikmet Bey',
    telefon: '322 1891',
    ePosta: '',
    adres: '',
    vergiDairesi: '',
    vergiNo: '',
  },
];

function tumCarileriGetir(): Cari[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(varsayilanCariler));
    return varsayilanCariler;
  }
  return JSON.parse(raw) as Cari[];
}

function cariKaydet(cari: Cari): void {
  const liste = tumCarileriGetir();
  const idx = liste.findIndex((m) => m.id === cari.id);
  if (idx >= 0) {
    liste[idx] = cari;
  } else {
    liste.push(cari);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
}

function cariSil(id: string): void {
  const liste = tumCarileriGetir().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
}

function cariIdUret(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/** Son kullanılan muhatap bilgisini cari kaydına yazar (sadece lastContact alanları). */
function cariMuhatapGuncelle(cariId: string, name: string, title: 'BEY' | 'HANIM'): void {
  const liste = tumCarileriGetir();
  const idx = liste.findIndex((c) => c.id === cariId);
  if (idx < 0) return;
  liste[idx] = { ...liste[idx], lastContactName: name || undefined, lastContactTitle: name ? title : undefined };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
}

/** Excel'den toplu aktarım — mevcut listeyi değiştirir (merge: cariKod bazında) */
function carileriMergeAktar(yeniCariler: Cari[]): { eklenen: number; guncellenen: number } {
  const mevcut = tumCarileriGetir();
  const sonuc = [...mevcut];
  let eklenen = 0;
  let guncellenen = 0;
  for (const yeni of yeniCariler) {
    const idx = sonuc.findIndex(
      (c) => c.cariKod === yeni.cariKod || c.firmaAdi.trim().toLowerCase() === yeni.firmaAdi.trim().toLowerCase()
    );
    if (idx >= 0) {
      sonuc[idx] = { ...sonuc[idx], ...yeni, id: sonuc[idx].id };
      guncellenen++;
    } else {
      sonuc.push(yeni);
      eklenen++;
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sonuc));
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
