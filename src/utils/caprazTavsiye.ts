// ── caprazTavsiye.ts ─────────────────────────────────────────────────
// NE: Grup şirketleri arası (MEBA / MESA / ELMOS) potansiyel müşteri
//     tavsiyesi üretir. Aktif firmanın carilerinde olmayan ama diğer
//     grup firmalarının aktif olarak teklif verdiği müşterileri tespit
//     edip içsel skora göre sıralar, top N'i döner.
//
// NEDEN: Mehmet Bey 2026-05-26 direktifi:
//   1) "MESA ve ELMOS'un teklifleri analiz et, MEBA'ya (çalışanlar dahil)
//      DETAY VERMEDEN şu firmada potansiyel var tavsiyeleri"
//   2) "Aynı şekilde MESA yöneticilerine MEBA'nın verip MESA'nın
//      vermediği cariler için, RAKAMLAR ASLA KONUŞULMAMALI, her cari
//      için değil — sentezleyip POTANSİYEL olabilecek firmaları tavsiye"
//
// NASIL: 1) Aktif firmanın cari ID setini topla (zaten teklifimiz var)
//        2) Diğer firmaların tekliflerinden cari kayıtlarını topla,
//           aktif firmada olanları filtrele
//        3) Her potansiyel cariyi içsel skorla:
//             - teklifSayisi × onayOrani × log10(tutar+1) × recencyBonus
//        4) Skor'a göre azalan sırada top N (default 12)
//        5) UI'a SADECE firma/yetkili/sektör/telefon + "kaynak firma
//           rozeti" döner — rakam YOK
//
// GİZLİLİK KATI: Dönen veri tipinde toplamTutar/teklifSayisi yer
// ALMAZ — UI'a sızdırılma riski sıfır. Skor sadece internal hesaplama.

import type { Teklif, Cari } from '../types';

export interface CaprazTavsiye {
  cariId: string;
  firmaAdi: string;
  yetkili: string | undefined;
  sektor: string | undefined;
  telefon: string | undefined;
  ePosta: string | undefined;
  /** Bu cariye hangi grup firma(lar)ı aktif teklif veriyor — UI'da rozet */
  kaynakFirmaIds: string[];
  /**
   * Mehmet Bey direktifi gereği skor sayısal değeri UI'ye GİTMEZ; ama
   * "yüksek/orta/düşük" potansiyel etiketi için 3 segmente bölünür.
   */
  potansiyelSeviye: 'yuksek' | 'orta' | 'dusuk';
  /** Cari aktif sektörlerinde rastgele 1 ipucu — "endüstri uyumu" sinyali */
  sektorelIpucu?: string;
}

interface PotansiyelInternal {
  cari: Cari;
  teklifSayisi: number;
  onaylananSayisi: number;
  toplamTutarTry: number;
  sonAktivite: string;
  kaynakFirmaIds: Set<string>;
}

const SONUCLANMIS = new Set(['onaylandi', 'kismi_onaylandi', 'siparis_alindi']);

/**
 * Cari skorlama — sayısal değer UI'a sızdırılmaz.
 * Ağırlıklar Mehmet Bey'in beklentisine göre kalibre:
 *   • teklifSayisi: hacim göstergesi (en önemli)
 *   • onayOrani: kalite göstergesi (ödüyor mu?)
 *   • log(tutar): büyüklük (büyük cari öncelikli)
 *   • recency: son 90 günde aktivite var mı (taze müşteri)
 */
function skorla(p: PotansiyelInternal): number {
  const onayOrani = p.teklifSayisi > 0 ? p.onaylananSayisi / p.teklifSayisi : 0.25;
  const tutarLog = Math.log10(p.toplamTutarTry + 1);
  const yas = p.sonAktivite ? Date.now() - new Date(p.sonAktivite).getTime() : Infinity;
  const recency = yas < 90 * 86_400_000 ? 1.4 : yas < 365 * 86_400_000 ? 1 : 0.6;
  return p.teklifSayisi * (0.4 + onayOrani * 0.6) * tutarLog * recency;
}

/**
 * Aktif firma için çapraz tavsiye üret. Detay vermeden, sentezlenmiş.
 *
 * @param teklifler — tüm teklifler (super_admin için sınırsız, firma_admin
 *                    için kendi + atanmış görünür firmalar)
 * @param aktifFirmaId — bu firmanın eksiklerini bul (örn. 'meba')
 * @param topN — kaç tavsiye döndür (default 12)
 */
export function caprazTavsiyeHesapla(
  teklifler: Teklif[],
  aktifFirmaId: string,
  topN: number = 12,
): CaprazTavsiye[] {
  if (!aktifFirmaId) return [];

  // 1) Aktif firmanın cari ID set'i (bunlar diğer firmalardan ÖNERİLMEZ)
  const aktifFirmaCariIds = new Set<string>();
  for (const t of teklifler) {
    if (t.firmaId === aktifFirmaId && t.cari?.id) {
      aktifFirmaCariIds.add(t.cari.id);
    }
  }

  // 2) Diğer firmaların tekliflerinden potansiyel cariler topla
  const potansiyel = new Map<string, PotansiyelInternal>();
  for (const t of teklifler) {
    if (t.firmaId === aktifFirmaId) continue; // kendi firmamız
    if (!t.cari?.id) continue;
    if (aktifFirmaCariIds.has(t.cari.id)) continue; // bizde zaten var
    if (!t.firmaId) continue; // kaynak firma bilinmez

    const mevcut = potansiyel.get(t.cari.id);
    const tutar = t.paraBirimi === 'TRY' ? (t.genelToplam ?? 0) : 0; // sade: TRY bazı
    const guncellemeT = t.guncellemeTarihi || t.tarih || '';

    if (mevcut) {
      mevcut.teklifSayisi += 1;
      if (SONUCLANMIS.has(t.durum)) mevcut.onaylananSayisi += 1;
      mevcut.toplamTutarTry += tutar;
      if (guncellemeT > mevcut.sonAktivite) mevcut.sonAktivite = guncellemeT;
      mevcut.kaynakFirmaIds.add(t.firmaId);
    } else {
      potansiyel.set(t.cari.id, {
        cari: t.cari,
        teklifSayisi: 1,
        onaylananSayisi: SONUCLANMIS.has(t.durum) ? 1 : 0,
        toplamTutarTry: tutar,
        sonAktivite: guncellemeT,
        kaynakFirmaIds: new Set([t.firmaId]),
      });
    }
  }

  // 3) Skorla + sırala + top N
  const sirali = [...potansiyel.values()]
    .map((p) => ({ p, skor: skorla(p) }))
    .sort((a, b) => b.skor - a.skor)
    .slice(0, topN);

  // 4) Potansiyel seviye eşiği — toplam skoru 3 dilime bölelim
  if (sirali.length === 0) return [];
  const enYuksek = sirali[0].skor;
  const seviye = (skor: number): 'yuksek' | 'orta' | 'dusuk' => {
    const r = enYuksek > 0 ? skor / enYuksek : 0;
    if (r >= 0.66) return 'yuksek';
    if (r >= 0.33) return 'orta';
    return 'dusuk';
  };

  // 5) UI tipine dönüştür — rakam içermez
  return sirali.map(({ p, skor }) => ({
    cariId: p.cari.id,
    firmaAdi: p.cari.firmaAdi,
    yetkili: p.cari.yetkiliKisi,
    sektor: p.cari.sektor,
    telefon: p.cari.telefon,
    ePosta: p.cari.ePosta,
    kaynakFirmaIds: [...p.kaynakFirmaIds],
    potansiyelSeviye: seviye(skor),
    sektorelIpucu: p.cari.sektor
      ? `${p.cari.sektor} sektöründe aktif`
      : undefined,
  }));
}

/**
 * Firma ID'sini insanca okunabilir ada çevirir (UI rozetlerinde).
 * Bilinmeyenler için ID'yi büyük harfli döner (fallback).
 */
export function firmaIdAdHaritasi(id: string): string {
  const map: Record<string, string> = {
    meba: 'MEBA',
    mesa: 'MESA',
    elmos: 'ELMOS',
  };
  return map[id.toLowerCase()] ?? id.toUpperCase();
}
