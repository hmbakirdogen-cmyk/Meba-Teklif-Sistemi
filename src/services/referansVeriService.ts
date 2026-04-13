// Referans veri servisi — Marka, Birim ve Teslim Süresi listelerini yönetir.
// Veriler artık paylaşımlı sunucuda tutulur; okuma önbellekten (anlık), yazma
// önbelleği hemen günceller + sunucuya asenkron iletir.

import { dataStore } from './dataStore';
import type { Referans } from './apiClient';

export const VARSAYILAN_MARKA = 'SMC';

type Alan = keyof Omit<Referans, never>;

function oku(alan: Alan): string[] {
  return dataStore.getReferans()[alan];
}

function kaydet(alan: Alan, liste: string[]): void {
  const mevcut = dataStore.getReferans();
  dataStore.setReferans({ ...mevcut, [alan]: liste });
}

function ekle(alan: Alan, deger: string): void {
  const temiz = deger.trim();
  if (!temiz) return;
  const mevcut = oku(alan);
  if (mevcut.includes(temiz)) return;
  kaydet(alan, [...mevcut, temiz]);
}

function sil(alan: Alan, deger: string): void {
  kaydet(alan, oku(alan).filter((v) => v !== deger));
}

function sirala(alan: Alan, liste: string[]): void {
  kaydet(alan, liste);
}

function listeServisi(alan: Alan) {
  return {
    tumunuGetir: ()                    => oku(alan),
    ekle:        (v: string)           => ekle(alan, v),
    sil:         (v: string)           => sil(alan, v),
    sirala:      (liste: string[])     => sirala(alan, liste),
  };
}

export const referansVeriService = {
  markalar:          listeServisi('markalar'),
  birimler:          listeServisi('birimler'),
  teslimSecenekleri: listeServisi('teslimSecenekleri'),
};
