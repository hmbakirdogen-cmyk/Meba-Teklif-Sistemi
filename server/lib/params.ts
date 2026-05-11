import type { Request } from 'express';

/**
 * Express 5'te req.params değerleri `string | string[]` tipinde. Bizim
 * route'larımız hep tek string bekler — bu helper güvenli şekilde string'e
 * indirger.
 */
export function paramStr(req: Request, key: string): string {
  const v = req.params?.[key as keyof typeof req.params];
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0];
  return '';
}

/** Header değeri güvenli string. Express 5 multi-value uyumlu. */
export function headerStr(req: Request, name: string): string {
  const v = req.headers[name.toLowerCase()];
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0];
  return '';
}
