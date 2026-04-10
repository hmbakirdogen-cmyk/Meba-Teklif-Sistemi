import dayjs from 'dayjs';
import type { Teklif } from '../types';

const STORAGE_KEY = 'teklif_teklifler';
const SAYAC_KEY = 'teklif_sayac';

function normalizeEskiKayit(t: Teklif): Teklif {
  return { ...t, odemeVadesi: t.odemeVadesi ?? '45 Gün' };
}

function tumTeklifleriGetir(): Teklif[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return (JSON.parse(raw) as Teklif[]).map(normalizeEskiKayit);
}

function teklifGetir(id: string): Teklif | undefined {
  return tumTeklifleriGetir().find((t) => t.id === id);
}

function teklifKaydet(teklif: Teklif): void {
  const liste = tumTeklifleriGetir();
  const idx = liste.findIndex((t) => t.id === teklif.id);
  const now = dayjs().toISOString();
  if (idx >= 0) {
    liste[idx] = { ...teklif, guncellemeTarihi: now };
  } else {
    liste.unshift({ ...teklif, guncellemeTarihi: now });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
}

function teklifSil(id: string): void {
  const liste = tumTeklifleriGetir().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
}

function teklifKopyala(
  id: string,
  kullanici?: { id: string; adSoyad: string; rol: string },
): Teklif | undefined {
  const kaynak = teklifGetir(id);
  if (!kaynak) return undefined;
  const now = dayjs().toISOString();
  const yeni: Teklif = {
    ...kaynak,
    id: teklifIdUret(),
    teklifNo: teklifNoUret(),
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
  teklifKaydet(yeni);
  return yeni;
}

function teklifIdUret(): string {
  return 't' + Date.now().toString(36);
}

function teklifNoUret(): string {
  const yil = dayjs().year();
  const raw = localStorage.getItem(SAYAC_KEY);
  const sayac = raw ? parseInt(raw, 10) + 1 : 1;
  localStorage.setItem(SAYAC_KEY, String(sayac));
  return `${yil}-${String(sayac).padStart(3, '0')}`;
}

export const teklifService = {
  tumTeklifleriGetir,
  teklifGetir,
  teklifKaydet,
  teklifSil,
  teklifKopyala,
  teklifIdUret,
  teklifNoUret,
};
