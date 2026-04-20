/**
 * config.ts — Merkezi uygulama yapılandırması.
 * Port, API base URL gibi bilgiler tek buradan yönetilir.
 */

export const APP_CONFIG = {
  /** Backend API port numarası */
  API_PORT: 3001,

  /** Frontend geliştirme sunucusu portu */
  DEV_PORT: 5173,

  /** API base URL (runtime'da hostname'e göre oluşur) */
  get API_BASE() {
    const hostname = typeof window !== 'undefined'
      ? (window.location.hostname || 'localhost')
      : 'localhost';
    return `http://${hostname}:${this.API_PORT}/api`;
  },
} as const;
