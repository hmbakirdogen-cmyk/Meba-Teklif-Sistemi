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

export function buildSatirCellNavOrder(satirBazliParaBirimi: boolean): SatirCellField[] {
  return satirBazliParaBirimi
    ? ['marka', ...SATIR_CELL_NAV_ORDER.slice(0, 3), 'paraBirimi', ...SATIR_CELL_NAV_ORDER.slice(3)]
    : ['marka', ...SATIR_CELL_NAV_ORDER];
}
