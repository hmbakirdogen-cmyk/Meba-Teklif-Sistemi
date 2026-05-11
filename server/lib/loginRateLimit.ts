/**
 * Login brute-force koruması — in-memory IP throttle. Aynı IP'den 15 dakika
 * içinde 10'dan fazla başarısız login → kilitli. Process restart'ta sıfırlanır.
 */

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}

const attempts = new Map<string, AttemptRecord>();

export function getClientIp(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length > 0) return xff[0]!.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export function checkLoginRateLimit(ip: string): { ok: true } | { ok: false; kalanSn: number } {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec) return { ok: true };
  if (now - rec.firstAttemptAt >= WINDOW_MS) {
    attempts.delete(ip);
    return { ok: true };
  }
  if (rec.count >= MAX_ATTEMPTS) {
    return { ok: false, kalanSn: Math.ceil((WINDOW_MS - (now - rec.firstAttemptAt)) / 1000) };
  }
  return { ok: true };
}

export function recordLoginAttempt(ip: string): void {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.firstAttemptAt >= WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttemptAt: now });
  } else {
    rec.count += 1;
  }
}

export function resetLoginRateLimit(ip: string): void {
  attempts.delete(ip);
}

// Periyodik temizlik
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of attempts) {
    if (now - rec.firstAttemptAt >= WINDOW_MS) attempts.delete(ip);
  }
}, 5 * 60 * 1000).unref?.();
