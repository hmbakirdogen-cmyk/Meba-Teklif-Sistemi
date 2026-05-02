/**
 * excelImportService.ts
 * SheetJS (xlsx) kullanarak Excel dosyalarından Cari ve Ürün verisi okur.
 * Kolon başlıklarında büyük/küçük harf ve boşluk farkı gözetilmez.
 */

import * as XLSX from 'xlsx';
import type { Cari, Urun } from '../types';
import { cariService } from './musteriService';
import { urunService } from './urunService';
import { cleanTextInput, normalizeEmail, normalizeProductCode, formatCariAdi } from '../utils/formatters';
import { formatPhone } from '../utils/phone';

// ── Yardımcı: başlık dizisinde pattern eşleşmesi ──────────────────────────
type RawRow = Record<string, unknown>;

/** Türkçe büyük/küçük harf farkını gözetmeksizin normalize eder */
function trLower(s: string): string {
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü')
    .replace(/Ş/g, 'ş')
    .replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .toLowerCase()
    .trim();
}

function findCol(headers: string[], patterns: string[]): string | undefined {
  const normalized = headers.map((h) => trLower(String(h)));
  for (const pat of patterns) {
    const patLower = trLower(pat);
    const idx = normalized.findIndex((h) => h.includes(patLower));
    if (idx >= 0) return headers[idx];
  }
  return undefined;
}

function cellStr(row: RawRow, col: string | undefined): string {
  if (!col) return '';
  const val = row[col];
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function cellNum(row: RawRow, col: string | undefined): number {
  if (!col) return 0;
  const val = row[col];
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// ── Excel dosyasını satır dizisine çevir ──────────────────────────────────
function excelToRows(file: File): Promise<{ rows: RawRow[]; headers: string[]; sheetName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '' });
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        resolve({ rows, headers, sheetName });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsBinaryString(file);
  });
}

// ── Cari Excel Import ─────────────────────────────────────────────────────

export interface CariImportSonucu {
  eklenen: number;
  guncellenen: number;
  hatali: number;
  ornekler: Cari[];
}

/**
 * cari.xlsx okur.
 * Beklenen sütunlar (esnek eşleşme):
 *   - Firma adı  : "CARİ BAŞLIK", "firma", "unvan", "ad"
 *   - Cari kod   : "cari kod", "kod", "cari no"
 *   - Telefon    : "tel", "telefon", "gsm", "cep"
 *   - E‑posta    : "e-posta", "email", "mail"
 *   - Yetkili    : "yetkili", "ilgili", "kişi"
 *   - Adres      : "adres", "adres1"
 *   - Vergi no   : "vergi no", "vkn", "tc"
 *   - Vergi d.   : "vergi dai", "v.d.", "vd"
 */
export async function cariExcelOku(file: File): Promise<CariImportSonucu> {
  const { rows, headers } = await excelToRows(file);

  const colFirma    = findCol(headers, ['cari başlık', 'cari baslik', 'firma', 'unvan', 'ad', 'başlık', 'baslik', 'title']);
  const colKod      = findCol(headers, ['cari kod', 'carikod', 'kod', 'cari no', 'carino']);
  const colTel      = findCol(headers, ['tel', 'telefon', 'gsm', 'cep', 'phone']);
  const colEmail    = findCol(headers, ['e-posta', 'eposta', 'email', 'mail', 'e mail']);
  const colYetkili  = findCol(headers, ['yetkili', 'ilgili', 'kişi', 'kisi', 'contact']);
  const colAdres    = findCol(headers, ['adres', 'address', 'adres1']);
  const colVergiNo  = findCol(headers, ['vergi no', 'vergino', 'vkn', 'tc no', 'tcno']);
  const colVergiD   = findCol(headers, ['vergi dai', 'vergid', 'v.d.', 'vd', 'vergi dairesi']);

  if (!colFirma) {
    throw new Error(
      `Firma adı sütunu bulunamadı. Bulunan sütunlar: ${headers.join(', ')}\n` +
      `Beklenen sütun adı: "CARİ BAŞLIK", "Firma" veya "Unvan"`
    );
  }

  const cariler: Cari[] = [];
  let hatali = 0;
  let sira = 1;

  for (const row of rows) {
    const firmaAdi = cleanTextInput(cellStr(row, colFirma));
    if (!firmaAdi) { hatali++; continue; }

    // cariKod: dosyada yoksa otomatik üret
    let cariKod = cellStr(row, colKod);
    if (cariKod) {
      cariKod = normalizeProductCode(cariKod);
    } else {
      cariKod = `C-${String(sira).padStart(3, '0')}`;
    }
    sira++;

    const cari: Cari = {
      id: cariService.cariIdUret(),
      cariKod,
      firmaAdi: formatCariAdi(firmaAdi),
      yetkiliKisi: cleanTextInput(cellStr(row, colYetkili)),
      telefon: formatPhone(cellStr(row, colTel)),
      ePosta: normalizeEmail(cellStr(row, colEmail)),
      adres: cleanTextInput(cellStr(row, colAdres)),
      vergiDairesi: cleanTextInput(cellStr(row, colVergiD)),
      vergiNo: cellStr(row, colVergiNo).replace(/\s+/g, ''),
    };
    cariler.push(cari);
  }

  const sonuc = cariService.carileriMergeAktar(cariler);
  return {
    eklenen: sonuc.eklenen,
    guncellenen: sonuc.guncellenen,
    hatali,
    ornekler: cariler.slice(0, 5),
  };
}

// ── Ürün Excel Import ─────────────────────────────────────────────────────

export interface UrunImportSonucu {
  eklenen: number;
  guncellenen: number;
  hatali: number;
  ornekler: Urun[];
  kategori: string;
}

/**
 * SAYIM / ürün Excel'i okur. Birden fazla dosya desteklenir.
 * Beklenen sütunlar (esnek eşleşme):
 *   - Ürün adı   : "açıklama", "aciklama", "urun adi", "stok adi", "ad", "description"
 *   - Ürün kodu  : "üretici kodu", "uretici kodu", "urun kodu", "stok kodu", "kod", "item no"
 *   - Kategori   : "kategori", "grup", "group", "tip"
 *   - Birim      : "birim", "unit"
 *   - Fiyat      : "fiyat", "birim fiyat", "liste fiyat", "price"
 *
 * Bulunamazsa: kategori → dosya adından, birim → "Adet", fiyat → 0
 */
export async function urunExcelOku(file: File, kategoriYedek?: string): Promise<UrunImportSonucu> {
  const { rows, headers } = await excelToRows(file);

  // Dosya adından kategori türet (örn: "SAYIM Silindir.xlsx" → "Silindir")
  const dosyaKategori = (kategoriYedek
    ?? file.name
         .replace(/\.xlsx?$/i, '')
         .replace(/^sayim\s*/i, '')
         .trim()) || 'Genel';

  const colAdi      = findCol(headers, ['açıklama', 'aciklama', 'urun adi', 'ürün adi', 'stok adi', 'ad', 'description', 'name']);
  const colKod      = findCol(headers, ['üretici kodu', 'uretici kodu', 'urun kodu', 'ürün kodu', 'stok kodu', 'item no', 'kod', 'code', 'part no', 'part number']);
  const colKategori = findCol(headers, ['kategori', 'grup', 'group', 'tip', 'type', 'category']);
  const colBirim    = findCol(headers, ['birim', 'unit', 'br']);
  const colFiyat    = findCol(headers, ['fiyat', 'birim fiyat', 'liste fiyat', 'price', 'unit price']);

  if (!colAdi && !colKod) {
    throw new Error(
      `Ürün adı veya ürün kodu sütunu bulunamadı.\nBulunan sütunlar: ${headers.join(', ')}\n` +
      `Beklenen: "açıklama", "üretici kodu" veya benzeri`
    );
  }

  const mevcutUrunler = urunService.tumUrunleriGetir();
  const sonucUrunler = [...mevcutUrunler];
  let eklenen = 0;
  let guncellenen = 0;
  let hatali = 0;
  const ornekler: Urun[] = [];

  for (const row of rows) {
    const urunAdi = cleanTextInput(cellStr(row, colAdi));
    const urunKod = normalizeProductCode(cellStr(row, colKod));

    if (!urunAdi && !urunKod) { hatali++; continue; }

    const kategori = cleanTextInput(cellStr(row, colKategori)) || dosyaKategori;
    const birim    = cleanTextInput(cellStr(row, colBirim)) || 'Adet';
    const fiyat    = cellNum(row, colFiyat);

    const urun: Urun = {
      id: urunService.urunIdUret(),
      urunKod: urunKod || `U-${Date.now().toString(36)}`,
      urunAdi: '',
      aciklama: urunAdi || urunKod,
      kategori,
      birim,
      varsayilanFiyat: fiyat,
    };

    const idx = sonucUrunler.findIndex(
      (u) => u.urunKod === urun.urunKod
    );
    if (idx >= 0) {
      sonucUrunler[idx] = { ...sonucUrunler[idx], ...urun, id: sonucUrunler[idx].id };
      guncellenen++;
    } else {
      sonucUrunler.push(urun);
      eklenen++;
    }

    if (ornekler.length < 5) ornekler.push(urun);
  }

  urunService.urunleriBulkAktar(sonucUrunler);
  return { eklenen, guncellenen, hatali, ornekler, kategori: dosyaKategori };
}

// ── Excel Export ──────────────────────────────────────────────────────────────

/** Cari listesini .xlsx olarak indirir */
export function cariExcelIndir(cariler: Cari[]): void {
  const data = cariler.map((c) => ({
    'Cari Kod':       c.cariKod,
    'Cari Başlık':    c.firmaAdi,
    'Yetkili Kişi':   c.yetkiliKisi ?? '',
    'Tel':            c.telefon ?? '',
    'E-Posta':        c.ePosta ?? '',
    'Adres':          c.adres ?? '',
    'Vergi Dairesi':  c.vergiDairesi ?? '',
    'Vergi No':       c.vergiNo ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cariler');
  XLSX.writeFile(wb, 'cariler.xlsx');
}

/** Ürün listesini .xlsx olarak indirir */
export function urunExcelIndir(urunler: Urun[]): void {
  const data = urunler.map((u) => ({
    'Üretici Kodu':  u.urunKod,
    'Açıklama':      u.aciklama ?? '',
    'Kategori':      u.kategori ?? '',
    'Birim':         u.birim ?? 'Adet',
    'Fiyat':         u.varsayilanFiyat ?? 0,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
  XLSX.writeFile(wb, 'urunler.xlsx');
}

// ── Bos Sablon Indirme (yeni kayit icin) ──────────────────────────────────────
//
// Yoneticiler bu sablonlari indirip kendi PC'lerinde Excel'de doldurup
// "Excel'den Aktar" ile yukler. Sablon: 1 ornek satir + bos satirlar.

/** Cari boş şablon — başlıklar + 1 örnek satır */
export function cariSablonIndir(): void {
  const data = [
    {
      'Cari Kod':       'C-001',
      'Cari Başlık':    'ÖRNEK MAKİNA SAN. TİC. LTD. ŞTİ.',
      'Yetkili Kişi':   'Ahmet Yılmaz',
      'Tel':            '0312 555 11 22',
      'E-Posta':        'info@ornek.com',
      'Adres':          'OSB 1. Cadde No:5 Sincan / ANKARA',
      'Vergi Dairesi':  'Sincan',
      'Vergi No':       '1234567890',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  // Kolon genişlikleri
  ws['!cols'] = [
    { wch: 10 }, { wch: 40 }, { wch: 18 }, { wch: 15 },
    { wch: 22 }, { wch: 40 }, { wch: 14 }, { wch: 13 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cariler');
  XLSX.writeFile(wb, 'cari-sablon.xlsx');
}

/** Ürün boş şablon — başlıklar + 1 örnek satır */
export function urunSablonIndir(): void {
  const data = [
    {
      'Üretici Kodu':  'CP96SDB80-200',
      'Açıklama':      'Pnömatik Silindir 80x200 mm',
      'Kategori':      'Silindir',
      'Birim':         'Adet',
      'Fiyat':         1250.50,
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 18 }, { wch: 40 }, { wch: 14 }, { wch: 8 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
  XLSX.writeFile(wb, 'urun-sablon.xlsx');
}
