/**
 * Prisma'dan dönen kayıtları frontend kontratıyla uyumlu hale getiren shape
 * transformer'ları. Mevcut frontend `teklif.cari` bekliyor; backend'de bu alan
 * `cariSnapshot` adıyla saklanıyor. Hem yeni hem eski adı response'da
 * sunarak geri uyum sağlıyoruz.
 */

import type { Teklif } from '@prisma/client';

export function shapeTeklif<T extends Teklif | (Teklif & Record<string, unknown>)>(t: T): T & { cari: T['cariSnapshot'] } {
  // `cari` eski alan adı — frontend hâlâ bunu okur (TeklifListesi, TeklifEditor, vb.)
  return { ...t, cari: t.cariSnapshot };
}

export function shapeTeklifList<T extends Teklif>(rows: T[]): Array<T & { cari: T['cariSnapshot'] }> {
  return rows.map((r) => shapeTeklif(r));
}
