/**
 * popupTokens.ts
 * Uygulamadaki tüm açılır UI öğeleri (popup, dropdown, modal, drawer,
 * tooltip, suggestion paneli) için merkezi tasarım sabitleri.
 *
 * Niye: Geçmişte her popup kendi inline değerlerini taşıyordu — border-radius
 * 3/4/6/10 arası, shadow farklı tonlarda, z-index 1050-2100 dağınıktı.
 * Tek dosyada bir kez yazılır, tüm uygulamada tutarlı görünür.
 *
 * Kullanım:
 *   import { POPUP } from '../styles/popupTokens';
 *   <div style={{ borderRadius: POPUP.radius, boxShadow: POPUP.shadow.level2, zIndex: POPUP.zIndex.popup }}>
 */

/* ──────────────────────────────────────────────────────────────────
 * Z-INDEX NAMESPACE — Çakışmayı sıfıra indir.
 *
 *   base       (1000): Sayfa içi sticky/floating öğeler (hep zeminde)
 *   popup      (1500): Suggestion paneli, custom popup, context menu,
 *                      Antd dropdown/popover (Antd default 1050 → 1500'e override)
 *   modal      (2000): Modal, Drawer (Antd default ~1000 → 2000'e override)
 *   critical   (2500): Toplu onay, mesaj/notification, kritik dialog
 * ────────────────────────────────────────────────────────────────── */
export const POPUP_Z_INDEX = {
  base:     1000,
  popup:    1500,
  modal:    2000,
  critical: 2500,
} as const;

/* ──────────────────────────────────────────────────────────────────
 * ANIMATION — Açılış/kapanış hareketleri.
 * Süre: kullanıcı "bekledim" hissi 200ms eşiğinde başlar; 150ms ideal.
 * Easing: ease-out — başta hızlı, sonda yavaşlayan profesyonel his.
 * ────────────────────────────────────────────────────────────────── */
export const POPUP_ANIMATION = {
  duration: 150,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // ease-out-quint, profesyonel
  fadeIn:  '150ms cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/* ──────────────────────────────────────────────────────────────────
 * RADIUS — Tek bir köşe yumuşaklığı tüm açılırlar için.
 *  Klavye kbd/chip gibi minik öğeler: 4 (özel durum)
 *  Standart popup/modal: 8 (ana)
 *  Büyük drawer/sheet: 12 (geniş alanlı)
 * ────────────────────────────────────────────────────────────────── */
export const POPUP_RADIUS = {
  small: 4,
  base:  8,
  large: 12,
} as const;

/* ──────────────────────────────────────────────────────────────────
 * SHADOW — Z-depth sistemi. 3 katman; her popup hangi katmanda
 * yüzdüğüne göre buradan seçer.
 *
 *   level1: Hafif yüzme — suggestion paneli, dropdown
 *   level2: Orta yüzme — popup, popover (standart)
 *   level3: Yüksek yüzme — modal, kritik dialog
 *
 * Border de shadow içinde inset 1px olarak (border eklemek yerine
 * yerleşim shift'i olmadan ince çerçeve).
 * ────────────────────────────────────────────────────────────────── */
export const POPUP_SHADOW = {
  level1:
    '0 4px 12px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.06)',
  level2:
    '0 10px 28px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.08)',
  level3:
    '0 18px 48px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.10)',
} as const;

/* ──────────────────────────────────────────────────────────────────
 * BACKGROUND & BORDER — Light/dark tema toleranslı.
 * Dark mod için index.css'te [data-theme="dark"] override'ları var;
 * inline style'da light kullan, CSS override dark'ı handle eder.
 * ────────────────────────────────────────────────────────────────── */
export const POPUP_SURFACE = {
  background: '#ffffff',
  text: '#1f2937',
  textMuted: '#6b7280',
  divider: 'rgba(15, 23, 42, 0.08)',
} as const;

/* ──────────────────────────────────────────────────────────────────
 * PADDING — İçeriğe göre kompakt vs ferah.
 *   compact: hücre editörü, dropdown item
 *   base:    standart popup body
 *   spacious: modal, drawer body
 * ────────────────────────────────────────────────────────────────── */
export const POPUP_PADDING = {
  compact: '8px 10px',
  base:    '12px 14px',
  spacious: '16px 20px',
} as const;

/* ──────────────────────────────────────────────────────────────────
 * Kullanım kolaylığı için birleşik POPUP namespace.
 * ────────────────────────────────────────────────────────────────── */
export const POPUP = {
  animation: POPUP_ANIMATION,
  radius:    POPUP_RADIUS,
  shadow:    POPUP_SHADOW,
  surface:   POPUP_SURFACE,
  padding:   POPUP_PADDING,
  zIndex:    POPUP_Z_INDEX,
} as const;
