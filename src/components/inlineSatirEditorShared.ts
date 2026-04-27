export type SatirCellField =
  | 'marka'
  | 'urunKod'
  | 'aciklama'
  | 'miktar'
  | 'paraBirimi'
  | 'birimFiyat'
  | 'teslimat';

export const SATIR_CELL_NAV_ORDER: SatirCellField[] = [
  'urunKod',
  'aciklama',
  'miktar',
  'birimFiyat',
  'teslimat',
];
