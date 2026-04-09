export type KullaniciRol = 'admin' | 'engineer' | 'sales';

export interface Kullanici {
  id: string;
  adSoyad: string;
  rol: KullaniciRol;
  unvan: string;
  initials: string;
  aktifMi: boolean;
}

export const KULLANICILAR: Kullanici[] = [
  {
    id: 'u1',
    adSoyad: 'Yusuf Bostancı',
    rol: 'engineer',
    unvan: 'Makine Mühendisi',
    initials: 'YB',
    aktifMi: true,
  },
  {
    id: 'u2',
    adSoyad: 'Furkan Öztürk',
    rol: 'sales',
    unvan: 'Satış Sorumlusu',
    initials: 'FÖ',
    aktifMi: true,
  },
  {
    id: 'u3',
    adSoyad: 'Mehmet Bakırdöğen',
    rol: 'admin',
    unvan: 'Makine Yüksek Mühendisi\nMaster of Science',
    initials: 'MB',
    aktifMi: true,
  },
];

export const ROL_ETIKET: Record<KullaniciRol, string> = {
  admin: "Makine Yüksek Mühendisi (Master's Degree)",
  engineer: 'Makine Mühendisi',
  sales: 'Satış Sorumlusu',
};
