import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword, VARSAYILAN_SIFRE } from '../lib/auth.js';
import { olusturOturum, oturumKapat, kullaniciOturumlariniIptalEt } from '../lib/sessions.js';
import { canAccessFirma } from '../lib/firmaScope.js';
import { sanitizeUser, sanitizeFirma, uretInitials } from '../lib/sanitize.js';
import { uploadFile, decodeDataUrl, mimeToExt, MAX_PHOTO_BYTES } from '../lib/storage.js';
import { audit, auditPrune } from '../lib/audit.js';
import { checkLoginRateLimit, getClientIp, recordLoginAttempt, resetLoginRateLimit } from '../lib/loginRateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const authRouter: Router = Router();

// ── POST /api/auth/login ────────────────────────────────────────
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const ip = getClientIp(req);
    const rl = checkLoginRateLimit(ip);
    if (!rl.ok) {
      res
        .status(429)
        .json({ error: `Çok fazla başarısız giriş denemesi. ${rl.kalanSn} saniye sonra tekrar deneyiniz.` });
      return;
    }
    const body = req.body ?? {};
    const kullaniciAdi = String(body.kullaniciAdi || '')
      .trim()
      .toLocaleLowerCase('tr-TR');
    const sifre = String(body.sifre || '');
    const secilenFirmaId: string | null = body.secilenFirmaId ? String(body.secilenFirmaId) : null;
    const beniHatirla = Boolean(body.beniHatirla);

    if (!kullaniciAdi || !sifre) {
      res.status(400).json({ error: 'Kullanici adi ve sifre zorunlu.' });
      return;
    }

    // Hem tam ad ("mehmet bakırdöğen") hem ilk kelime ("mehmet") ile login.
    const kayitlar = await prisma.kullanici.findMany({ where: { aktifMi: true } });
    const k = kayitlar.find((u) => {
      const full = String(u.kullaniciAdi || '').toLocaleLowerCase('tr-TR');
      if (full === kullaniciAdi) return true;
      if (!kullaniciAdi.includes(' ')) {
        const firstWord = full.split(/\s+/)[0];
        if (firstWord === kullaniciAdi) return true;
      }
      return false;
    });

    if (!k) {
      recordLoginAttempt(ip);
      res.status(401).json({ error: 'Kullanici adi veya sifre hatali.' });
      return;
    }

    if (!verifyPassword(sifre, k.sifreHash)) {
      recordLoginAttempt(ip);
      await audit('login_failed', { kullaniciId: k.id, kullaniciAdi: k.kullaniciAdi, firmaId: k.firmaId }, { reason: 'wrong_password' });
      res.status(401).json({ error: 'Kullanici adi veya sifre hatali.' });
      return;
    }

    // Firma yetkisi: seçilen firmaya erişebilir mi?
    if (secilenFirmaId && !canAccessFirma(k, secilenFirmaId)) {
      recordLoginAttempt(ip);
      await audit(
        'login_blocked',
        { kullaniciId: k.id, kullaniciAdi: k.kullaniciAdi, firmaId: k.firmaId },
        { reason: 'wrong_firma', secilenFirmaId, kullaniciFirmaId: k.firmaId },
      );
      res.status(403).json({ error: 'Bu firmaya kayitli degilsiniz. Lutfen kendi firmanizi seciniz.' });
      return;
    }

    const ua = String(req.headers['user-agent'] || '');
    const { token, expiresAt } = await olusturOturum({
      kullaniciId: k.id,
      beniHatirla,
      ip,
      ua,
    });
    await audit('login', { kullaniciId: k.id, kullaniciAdi: k.kullaniciAdi, firmaId: k.firmaId });
    resetLoginRateLimit(ip);

    const firma = k.firmaId ? await prisma.firma.findUnique({ where: { id: k.firmaId } }) : null;

    res.json({
      token,
      expiresAt: expiresAt.toISOString(),
      kullanici: sanitizeUser(k),
      firma: firma ? sanitizeFirma(firma) : null,
    });

    // Audit log boyutunu kontrol et (fire-and-forget)
    auditPrune().catch(() => {});
  }),
);

// ── POST /api/auth/logout ───────────────────────────────────────
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = req.headers['x-session-token'];
    const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    if (token) await oturumKapat(token);
    res.json({ ok: true });
  }),
);

// ── GET /api/auth/me ────────────────────────────────────────────
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const k = req.authCtx!.kullanici;
    const firma = k.firmaId ? await prisma.firma.findUnique({ where: { id: k.firmaId } }) : null;
    res.json({
      kullanici: sanitizeUser(k),
      firma: firma ? sanitizeFirma(firma) : null,
    });
  }),
);

// ── POST /api/auth/change-password ──────────────────────────────
authRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const mevcut = String(body.mevcutSifre || '');
    const yeni = String(body.yeniSifre || '');
    if (yeni.length < 4) throw new HttpError(400, 'Yeni sifre en az 4 karakter olmali.');
    if (yeni === VARSAYILAN_SIFRE) throw new HttpError(400, 'Yeni sifre varsayilan sifre (0000) olamaz.');

    const k = req.authCtx!.kullanici;
    if (!verifyPassword(mevcut, k.sifreHash)) {
      await audit(
        'change_password_failed',
        { kullaniciId: k.id, kullaniciAdi: k.kullaniciAdi, firmaId: k.firmaId },
        { reason: 'wrong_current' },
      );
      throw new HttpError(401, 'Mevcut sifre hatali.');
    }

    const yeniHash = hashPassword(yeni);
    await prisma.kullanici.update({
      where: { id: k.id },
      data: {
        sifreHash: yeniHash,
        mustChangePassword: false,
        sifreDegisikligi: new Date(),
      },
    });

    // Diğer oturumları iptal — yalnız mevcut oturum kalsın
    await kullaniciOturumlariniIptalEt(k.id, req.authCtx!.oturum.token);
    await audit('change_password', { kullaniciId: k.id, kullaniciAdi: k.kullaniciAdi, firmaId: k.firmaId });
    res.json({ ok: true, mustChangePassword: false });
  }),
);

// ── POST /api/auth/upload-photo ─────────────────────────────────
authRouter.post(
  '/upload-photo',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const fotoBase64: string = String(body.fotoBase64 || '');
    if (!fotoBase64) throw new HttpError(400, 'fotoBase64 bos.');

    const { mime, buffer } = decodeDataUrl(fotoBase64);
    if (buffer.length === 0) throw new HttpError(400, 'Foto verisi gecersiz.');
    if (buffer.length > MAX_PHOTO_BYTES) {
      throw new HttpError(
        400,
        `Foto cok buyuk (${Math.round(buffer.length / 1024)} KB). Maks ${Math.round(MAX_PHOTO_BYTES / 1024)} KB.`,
      );
    }

    const k = req.authCtx!.kullanici;
    const ext = mimeToExt(mime);
    const key = `kullanicilar/${k.id}.${ext}`;
    const { url } = await uploadFile(key, buffer, mime);
    const cacheBust = `${url}?v=${Date.now()}`;

    const updated = await prisma.kullanici.update({
      where: { id: k.id },
      data: {
        profilFotoUrl: cacheBust,
        profilFotoYuklemeTarihi: new Date(),
      },
    });

    await audit('profil_foto_yuklendi', { kullaniciId: k.id, kullaniciAdi: k.kullaniciAdi, firmaId: k.firmaId });
    res.json({ profilFotoUrl: cacheBust, kullanici: sanitizeUser(updated) });
  }),
);
