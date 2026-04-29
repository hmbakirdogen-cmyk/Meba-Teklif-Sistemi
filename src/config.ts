/**
 * config.ts — Merkezi uygulama yapılandırması.
 * Port, API base URL gibi bilgiler tek buradan yönetilir.
 *
 * API_BASE iki kaynaktan beslenir:
 *  1. Runtime'da networkConfig.resolveServerBase() ile bulunan global
 *     window.MEBA_API_BASE (varsa kullanılır — client mode'da farklı host'a bağlanmak için).
 *  2. Yoksa fallback: window.location.hostname:3001/api (mevcut davranış,
 *     server modunda ya da configsiz ortamda doğrudan çalışır).
 */

declare global {
  interface Window {
    MEBA_API_BASE?: string;
  }
}

export const APP_CONFIG = {
  /** Backend API port numarası */
  API_PORT: 3001,

  /** Frontend geliştirme sunucusu portu */
  DEV_PORT: 5173,

  /** API base URL (runtime'da hostname'e göre oluşur) */
  get API_BASE(): string {
    if (typeof window !== 'undefined' && window.MEBA_API_BASE) {
      return window.MEBA_API_BASE;
    }
    const hostname = typeof window !== 'undefined'
      ? (window.location.hostname || 'localhost')
      : 'localhost';
    return `http://${hostname}:${this.API_PORT}/api`;
  },
} as const;
