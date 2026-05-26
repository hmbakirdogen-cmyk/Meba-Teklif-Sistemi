/**
 * tipTipleri.ts
 * ─────────────────────────────────────────────────────────────────
 * Tip rehber sisteminin TYPE tanimlari — JSX/runtime IÇERIK YOK.
 * Her sayfa kendi pool'unu (TipDef[]) bu interface'e gore export eder;
 * useSayfaRehberi hook'u bu type'i tuketir.
 */
import type { ReactNode } from 'react';

/** Tip gosterilirken yan etki — pencere/panel/popover otomatik acma. */
export type TipYanEtki =
  | 'panel-notlar'           // Notlar tipinde sag panel notlar mod'una gecer
  | 'modal-ilgiliKisi'       // Ilgili kisi atama modal'i acilir
  | 'datePicker-tarih'       // Tarih DatePicker'i acilir
  | 'dropdown-paraBirimi';   // Para birimi dropdown'i acilir

/** Kart konum tercihi — animasyon-kart cakismasini engellemek icin. */
export type KartTercihYon = 'ust' | 'alt' | 'oto';

/**
 * Rol bazli rehber filtresi — Mehmet Bey 2026-05-26 direktifi:
 * "Yoneticilere ayri, calisanlara ayri tanitim olsun yerine gore".
 * Bir tipin gosterilebilecegi rol(ler) listesi. Belirtilmezse HERKESE
 * acik (tum kullanicilar gorur). 'yonetici' = super_admin + firma_admin.
 */
export type TipRol = 'yonetici' | 'calisan';

export interface TipDef {
  id: string;
  /** Baslik — kullanici hitabesi ("Mehmet Bey") parametre olarak gelir. */
  baslik: (hitap: string) => string;
  /** Aciklama — kibarca, rica tonunda; kullanici hitabesi ile zenginlesir. */
  aciklama: (hitap: string) => string;
  /** Hedef yaninda kucuk konusma balonu etiketi (ornek: "BURAYI DOLDURUN"). */
  miniEtiket?: string;
  /** PRIMARY DOM target — animasyon + mini etiket + ok bu hedefe atfedilir. */
  targetSelector: () => HTMLElement | null;
  /** EK HEDEFLER — primary'ye ek olarak spotlight cutout + halo (animasyon yok). */
  ekHedeflerSelector?: () => HTMLElement[];
  /** Tip animasyon component'i — rect alir, JSX doner. */
  animasyon: (rect: { x: number; y: number; width: number; height: number }) => ReactNode;
  /** Buyuk sari yon oku gostersin mi? Default FALSE. */
  gostericiOk?: boolean;
  /** Tip gosterilirken otomatik aktif edilecek yan-aksiyon. */
  yanEtki?: TipYanEtki;
  /** Kart konumu tercihi (animasyon-cakismasi onleme). Default 'oto'. */
  kartTercihYon?: KartTercihYon;
  /** Animasyonun hedef altinda kapladigi tahmini yukseklik (px). Default 200. */
  animAltKaplama?: number;
  /** Kart genisligi (px). Default 720; toolbar tipleri 540 kullanabilir. */
  kartGenislik?: number;
  /** Ön koşul — tip gosterilmeden once true donmeli (ornek: en az 1 satir). */
  onKosul?: () => boolean;
  /**
   * Bu tipin gorunecegi rol(ler). Bos/undefined = HERKES gorur.
   * Ornek:
   *   roller: ['yonetici']           → sadece yonetici (super/firma_admin)
   *   roller: ['calisan']            → sadece calisan rolundeki personel
   *   roller: undefined              → herkes
   * Faz 9 (2026-05-26): yonetici-ozel tipler (kim hak iddiasi
   * yapamaz, sahiplik audit log, kredi hirsizligi engelleme) icin
   * tanitim turleri ayri pool'da olabilir. Hook bu alani filtreler.
   */
  roller?: TipRol[];
}
