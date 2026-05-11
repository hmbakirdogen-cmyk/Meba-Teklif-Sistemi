/**
 * config.ts — Merkezi uygulama yapılandırması.
 * Render üzerinde same-origin deploy: API_BASE varsayılan olarak '/api'.
 * Lokal dev: Vite proxy /api -> http://localhost:3001/api yönlendirir.
 * İstisnai durumlar için VITE_API_BASE env var override eder.
 */

export const APP_CONFIG = {
  /** Backend API base URL — same-origin '/api', override için VITE_API_BASE */
  get API_BASE(): string {
    const envOverride =
      typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE;
    if (envOverride) return envOverride.replace(/\/+$/, '');
    return '/api';
  },
} as const;
