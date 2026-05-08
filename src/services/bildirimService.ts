import { api } from './apiClient';
import type { Bildirim } from '../types';

export const bildirimService = {
  bildirimlerGetir: (): Promise<Bildirim[]> => api.bildirimler.list(),
  bildirimOkundu: (id: string) => api.bildirimler.okundu(id),
  tumunuOkunduYap: () => api.bildirimler.tumunuOkunduYap(),
  okunmamisSayisi: (liste: Bildirim[]): number =>
    liste.filter((b) => !b.okundu).length,
};
