'use strict';

/**
 * Multi-tenant auth + kullanici/firma/sayac yonetim route'lari.
 * server.cjs icinden cagrilir; readDB/writeDB/parseBody/send disaridan verilir.
 *
 * Endpoint listesi:
 *   POST   /api/auth/login                  { kullaniciAdi, sifre } -> { token, kullanici }
 *   POST   /api/auth/logout                 (header: X-Session-Token) -> { ok }
 *   GET    /api/auth/me                     (header: X-Session-Token) -> { kullanici, firma }
 *   POST   /api/auth/change-password        { mevcutSifre, yeniSifre } -> { ok, mustChangePassword:false }
 *   POST   /api/auth/upload-photo           { fotoBase64 } -> { profilFotoUrl }
 *
 *   GET    /api/firmalar                    (public — login oncesi splash icin) -> [{id, ad, slogan, logoPath, ...}]
 *   GET    /api/firma/:id                   -> tek firma profili
 *   PATCH  /api/firma/:id                   (firma_admin/super_admin) -> guncellenmis profil
 *
 *   GET    /api/kullanicilar                -> firma_admin: kendi firma; super_admin: hepsi
 *   POST   /api/kullanicilar                (firma_admin/super_admin) -> yeni personel ekle
 *   PATCH  /api/kullanicilar/:id            -> kullanici guncelle
 *   POST   /api/kullanicilar/:id/sifre-sifirla  -> sifreyi varsayilana cek (firma_admin/super_admin)
 *   DELETE /api/kullanicilar/:id            -> soft delete (aktifMi=false)
 *
 *   POST   /api/sayac/:firmaId/increment    -> firma basina sayac arttir
 */

const fs   = require('fs');
const path = require('path');
const { hashPassword, verifyPassword, generateSessionToken } = require('./auth-helper.cjs');

const PROFIL_FOTO_DIR = path.join(__dirname, '..', 'public', 'profil-fotograflari');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 saat
const VARSAYILAN_SIFRE = '123456';
const MAX_PHOTO_BYTES = 600 * 1024; // 600 KB — frontend resize sonrasi makul

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDirSync(PROFIL_FOTO_DIR);

// ── Audit log helper ────────────────────────────────────────────────────────
function auditLog(db, eylem, ctx, detay) {
  if (!Array.isArray(db.auditLog)) db.auditLog = [];
  db.auditLog.push({
    zaman: new Date().toISOString(),
    eylem,
    kullaniciId: ctx?.kullanici?.id ?? null,
    kullaniciAdi: ctx?.kullanici?.kullaniciAdi ?? null,
    firmaId: ctx?.kullanici?.firmaId ?? null,
    detay: detay ?? null,
  });
  // Audit log'u 5000 girdiyle sınırla (FIFO)
  if (db.auditLog.length > 5000) {
    db.auditLog = db.auditLog.slice(-5000);
  }
}

// ── Session helpers ─────────────────────────────────────────────────────────
function ensureOturumlar(db) {
  if (!Array.isArray(db.oturumlar)) db.oturumlar = [];
  // Suresi gecmis oturumlari temizle
  const simdi = Date.now();
  db.oturumlar = db.oturumlar.filter((s) => {
    const expiresAt = new Date(s.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > simdi;
  });
}

function findSession(db, token) {
  ensureOturumlar(db);
  return db.oturumlar.find((s) => s.token === token) || null;
}

function readSessionFromReq(req) {
  return req.headers['x-session-token'] || '';
}

function getAuthContext(db, req) {
  const token = readSessionFromReq(req);
  if (!token) return { token: null, session: null, kullanici: null };
  const session = findSession(db, token);
  if (!session) return { token, session: null, kullanici: null };
  const kullanici = (db.kullanicilar || []).find((u) => u.id === session.kullaniciId) || null;
  return { token, session, kullanici };
}

function requireAuth(db, req) {
  const ctx = getAuthContext(db, req);
  if (!ctx.kullanici || !ctx.kullanici.aktifMi) {
    return { ok: false, status: 401, error: 'Oturum gecersiz veya suresi dolmus.' };
  }
  return { ok: true, ctx };
}

function requireAdmin(ctx) {
  const r = ctx?.kullanici?.rol;
  if (r === 'super_admin' || r === 'firma_admin') return { ok: true };
  return { ok: false, status: 403, error: 'Bu islem icin yetkili degilsiniz.' };
}

// firma_admin/sales/engineer sadece kendi firmasini gorebilir
// super_admin tum firmalari gorebilir
function canAccessFirma(ctx, firmaId) {
  const k = ctx?.kullanici;
  if (!k) return false;
  if (k.rol === 'super_admin') return true;
  return k.firmaId === firmaId;
}

// ── Kullanici sanitize: sifreHash'i UI'a gondermeden cikar ───────────────────
function sanitizeUser(u) {
  if (!u) return null;
  // eslint-disable-next-line no-unused-vars
  const { sifreHash, ...rest } = u;
  return rest;
}

function sanitizeFirma(f) { return f; }

// ── Initials helper ─────────────────────────────────────────────────────────
function uretInitials(adSoyad) {
  return String(adSoyad || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('');
}

// ── Profil foto: base64 -> diske jpeg/png ──────────────────────────────────
function profilFotoKaydet(userId, fotoBase64) {
  if (typeof fotoBase64 !== 'string' || !fotoBase64) {
    throw new Error('fotoBase64 bos.');
  }
  // data URL formati: data:image/png;base64,XXX  veya sadece base64 dize
  const match = fotoBase64.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  let mime = 'image/jpeg';
  let raw  = fotoBase64;
  if (match) {
    mime = match[1].toLowerCase();
    raw  = match[2];
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length === 0) throw new Error('Foto verisi gecersiz.');
  if (buf.length > MAX_PHOTO_BYTES) {
    throw new Error(`Foto cok buyuk (${Math.round(buf.length / 1024)} KB). Maks ${Math.round(MAX_PHOTO_BYTES / 1024)} KB.`);
  }
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  // Eski versiyonlari sil (kullanici farkli formatla yuklemis olabilir)
  for (const e of ['png', 'jpg', 'jpeg', 'webp']) {
    const eski = path.join(PROFIL_FOTO_DIR, `${userId}.${e}`);
    try { if (fs.existsSync(eski)) fs.unlinkSync(eski); } catch { /* ignore */ }
  }
  const dosyaAdi = `${userId}.${ext}`;
  const tamYol   = path.join(PROFIL_FOTO_DIR, dosyaAdi);
  fs.writeFileSync(tamYol, buf);
  // Cache busting icin ?v=timestamp
  return `/profil-fotograflari/${dosyaAdi}?v=${Date.now()}`;
}

// ── Route handler factory ────────────────────────────────────────────────────
function createAuthRoutes({ readDB, writeDB, parseBody, send }) {
  // POST /api/auth/login
  async function login(req, res) {
    const body = await parseBody(req);
    const kullaniciAdi = String(body.kullaniciAdi || '').trim().toLocaleLowerCase('tr-TR');
    const sifre        = String(body.sifre || '');
    if (!kullaniciAdi || !sifre) {
      return send(res, 400, { error: 'Kullanici adi ve sifre zorunlu.' });
    }
    const db = readDB();
    const k  = (db.kullanicilar || []).find(
      (u) => String(u.kullaniciAdi || '').toLocaleLowerCase('tr-TR') === kullaniciAdi
    );
    if (!k || !k.aktifMi) {
      return send(res, 401, { error: 'Kullanici adi veya sifre hatali.' });
    }
    if (!verifyPassword(sifre, k.sifreHash)) {
      auditLog(db, 'login_failed', { kullanici: k }, { reason: 'wrong_password' });
      writeDB(db);
      return send(res, 401, { error: 'Kullanici adi veya sifre hatali.' });
    }
    // Sifre dogru → oturum olustur
    ensureOturumlar(db);
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    db.oturumlar.push({
      token,
      kullaniciId: k.id,
      olusturulduAt: new Date().toISOString(),
      expiresAt,
      ip: (req.socket && req.socket.remoteAddress) || '',
      ua: req.headers['user-agent'] || '',
    });
    auditLog(db, 'login', { kullanici: k });
    writeDB(db);
    return send(res, 200, {
      token,
      expiresAt,
      kullanici: sanitizeUser(k),
      firma: k.firmaId ? (db.firmalar || []).find((f) => f.id === k.firmaId) : null,
    });
  }

  // POST /api/auth/logout
  async function logout(req, res) {
    const token = readSessionFromReq(req);
    if (!token) return send(res, 200, { ok: true });
    const db = readDB();
    ensureOturumlar(db);
    const idx = db.oturumlar.findIndex((s) => s.token === token);
    if (idx >= 0) {
      const k = (db.kullanicilar || []).find((u) => u.id === db.oturumlar[idx].kullaniciId);
      if (k) auditLog(db, 'logout', { kullanici: k });
      db.oturumlar.splice(idx, 1);
      writeDB(db);
    }
    return send(res, 200, { ok: true });
  }

  // GET /api/auth/me
  async function me(req, res) {
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const k = auth.ctx.kullanici;
    return send(res, 200, {
      kullanici: sanitizeUser(k),
      firma: k.firmaId ? (db.firmalar || []).find((f) => f.id === k.firmaId) : null,
    });
  }

  // POST /api/auth/change-password
  async function changePassword(req, res) {
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const body = await parseBody(req);
    const mevcut = String(body.mevcutSifre || '');
    const yeni   = String(body.yeniSifre || '');
    if (yeni.length < 4) {
      return send(res, 400, { error: 'Yeni sifre en az 4 karakter olmali.' });
    }
    const k = auth.ctx.kullanici;
    if (!verifyPassword(mevcut, k.sifreHash)) {
      auditLog(db, 'change_password_failed', { kullanici: k }, { reason: 'wrong_current' });
      writeDB(db);
      return send(res, 401, { error: 'Mevcut sifre hatali.' });
    }
    k.sifreHash = hashPassword(yeni);
    k.mustChangePassword = false;
    k.sifreDegisikligi = new Date().toISOString();
    auditLog(db, 'change_password', { kullanici: k });
    writeDB(db);
    return send(res, 200, { ok: true, mustChangePassword: false });
  }

  // POST /api/auth/upload-photo
  async function uploadPhoto(req, res) {
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const body = await parseBody(req);
    const k = auth.ctx.kullanici;
    try {
      const fotoUrl = profilFotoKaydet(k.id, body.fotoBase64);
      k.profilFotoUrl = fotoUrl;
      k.profilFotoYuklemeTarihi = new Date().toISOString();
      auditLog(db, 'profil_foto_yuklendi', { kullanici: k });
      writeDB(db);
      return send(res, 200, { profilFotoUrl: fotoUrl, kullanici: sanitizeUser(k) });
    } catch (err) {
      return send(res, 400, { error: err.message || 'Foto kaydedilemedi.' });
    }
  }

  // GET /api/firmalar — public (login ekrani icin)
  async function listFirmalar(req, res) {
    const db = readDB();
    return send(res, 200, (db.firmalar || []).map(sanitizeFirma));
  }

  // GET /api/firma/:id
  async function getFirma(req, res, url) {
    const id = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    if (!canAccessFirma(auth.ctx, id)) return send(res, 403, { error: 'Bu firmaya erisiminiz yok.' });
    const f = (db.firmalar || []).find((x) => x.id === id);
    if (!f) return send(res, 404, { error: 'Firma bulunamadi.' });
    return send(res, 200, sanitizeFirma(f));
  }

  // PATCH /api/firma/:id
  async function updateFirma(req, res, url) {
    const id = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const adminCheck = requireAdmin(auth.ctx);
    if (!adminCheck.ok) return send(res, adminCheck.status, { error: adminCheck.error });
    if (!canAccessFirma(auth.ctx, id)) return send(res, 403, { error: 'Bu firmayi duzenleyemezsiniz.' });
    const f = (db.firmalar || []).find((x) => x.id === id);
    if (!f) return send(res, 404, { error: 'Firma bulunamadi.' });
    const body = await parseBody(req);
    const izinli = ['ad', 'kisaAd', 'slogan', 'logoPath', 'renkBirincil', 'renkVurgu',
                    'adres', 'vergiDairesi', 'vergiNo', 'telefon', 'eposta', 'iban',
                    'pdfKlasorAdi', 'teklifPrefix'];
    for (const alan of izinli) {
      if (alan in body) f[alan] = body[alan];
    }
    auditLog(db, 'firma_guncellendi', auth.ctx, { firmaId: id });
    writeDB(db);
    return send(res, 200, sanitizeFirma(f));
  }

  // GET /api/kullanicilar
  async function listKullanicilar(req, res) {
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const k = auth.ctx.kullanici;
    let liste = db.kullanicilar || [];
    if (k.rol !== 'super_admin') {
      liste = liste.filter((u) => u.firmaId === k.firmaId);
    }
    return send(res, 200, liste.map(sanitizeUser));
  }

  // POST /api/kullanicilar
  async function createKullanici(req, res) {
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const adminCheck = requireAdmin(auth.ctx);
    if (!adminCheck.ok) return send(res, adminCheck.status, { error: adminCheck.error });
    const body = await parseBody(req);
    const adSoyad      = String(body.adSoyad || '').trim();
    const kullaniciAdi = String(body.kullaniciAdi || '').trim().toLocaleLowerCase('tr-TR');
    const unvan        = String(body.unvan || '').trim();
    const rol          = ['firma_admin', 'engineer', 'sales'].includes(body.rol) ? body.rol : 'engineer';
    if (!adSoyad || !kullaniciAdi) {
      return send(res, 400, { error: 'Ad Soyad ve kullanici adi zorunlu.' });
    }
    // firmaId belirleme: super_admin body'den, firma_admin kendi firmasi
    let firmaId = auth.ctx.kullanici.rol === 'super_admin' ? body.firmaId : auth.ctx.kullanici.firmaId;
    if (!firmaId) return send(res, 400, { error: 'firmaId zorunlu.' });
    if (!(db.firmalar || []).some((f) => f.id === firmaId)) {
      return send(res, 400, { error: 'Gecersiz firmaId.' });
    }
    // Cakisma kontrolu
    if ((db.kullanicilar || []).some((u) => u.kullaniciAdi.toLocaleLowerCase('tr-TR') === kullaniciAdi)) {
      return send(res, 409, { error: 'Bu kullanici adi zaten kullanimda.' });
    }
    const yeni = {
      id: 'u-' + Math.random().toString(36).slice(2, 10),
      kullaniciAdi,
      sifreHash: hashPassword(VARSAYILAN_SIFRE),
      adSoyad,
      unvan,
      initials: uretInitials(adSoyad),
      rol,
      firmaId,
      aktifMi: true,
      mustChangePassword: true,
      olusturmaTarihi: new Date().toISOString(),
      olusturanKullaniciId: auth.ctx.kullanici.id,
    };
    if (!Array.isArray(db.kullanicilar)) db.kullanicilar = [];
    db.kullanicilar.push(yeni);
    auditLog(db, 'kullanici_olusturuldu', auth.ctx, { yeniKullaniciId: yeni.id, firmaId });
    writeDB(db);
    return send(res, 200, { kullanici: sanitizeUser(yeni), varsayilanSifre: VARSAYILAN_SIFRE });
  }

  // PATCH /api/kullanicilar/:id
  async function updateKullanici(req, res, url) {
    const id = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const target = (db.kullanicilar || []).find((u) => u.id === id);
    if (!target) return send(res, 404, { error: 'Kullanici bulunamadi.' });
    const isSelf = target.id === auth.ctx.kullanici.id;
    const isAdmin = auth.ctx.kullanici.rol === 'super_admin'
      || (auth.ctx.kullanici.rol === 'firma_admin' && target.firmaId === auth.ctx.kullanici.firmaId);
    if (!isSelf && !isAdmin) return send(res, 403, { error: 'Bu kullaniciyi guncelleyemezsiniz.' });
    const body = await parseBody(req);
    // Self update: sadece adSoyad/unvan/initials
    // Admin update: yukaridakilere ek olarak rol/aktifMi (kendi firma kapsam icinde)
    const izinli = isAdmin
      ? ['adSoyad', 'unvan', 'initials', 'rol', 'aktifMi']
      : ['adSoyad', 'unvan', 'initials'];
    for (const alan of izinli) {
      if (alan in body) target[alan] = body[alan];
    }
    if ('adSoyad' in body && !body.initials) {
      target.initials = uretInitials(body.adSoyad);
    }
    auditLog(db, 'kullanici_guncellendi', auth.ctx, { hedefId: id, alanlar: Object.keys(body) });
    writeDB(db);
    return send(res, 200, sanitizeUser(target));
  }

  // POST /api/kullanicilar/:id/sifre-sifirla
  async function resetKullaniciSifre(req, res, url) {
    const id = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const adminCheck = requireAdmin(auth.ctx);
    if (!adminCheck.ok) return send(res, adminCheck.status, { error: adminCheck.error });
    const target = (db.kullanicilar || []).find((u) => u.id === id);
    if (!target) return send(res, 404, { error: 'Kullanici bulunamadi.' });
    if (auth.ctx.kullanici.rol !== 'super_admin' && target.firmaId !== auth.ctx.kullanici.firmaId) {
      return send(res, 403, { error: 'Bu kullaniciyi sifirlayamazsiniz.' });
    }
    target.sifreHash = hashPassword(VARSAYILAN_SIFRE);
    target.mustChangePassword = true;
    target.sifreDegisikligi = new Date().toISOString();
    // Aktif oturumlari iptal
    if (Array.isArray(db.oturumlar)) {
      db.oturumlar = db.oturumlar.filter((s) => s.kullaniciId !== target.id);
    }
    auditLog(db, 'sifre_sifirlandi', auth.ctx, { hedefId: id });
    writeDB(db);
    return send(res, 200, { ok: true, varsayilanSifre: VARSAYILAN_SIFRE });
  }

  // DELETE /api/kullanicilar/:id (soft delete)
  async function deleteKullanici(req, res, url) {
    const id = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const adminCheck = requireAdmin(auth.ctx);
    if (!adminCheck.ok) return send(res, adminCheck.status, { error: adminCheck.error });
    const target = (db.kullanicilar || []).find((u) => u.id === id);
    if (!target) return send(res, 404, { error: 'Kullanici bulunamadi.' });
    if (target.id === auth.ctx.kullanici.id) {
      return send(res, 400, { error: 'Kendi hesabinizi silemezsiniz.' });
    }
    if (auth.ctx.kullanici.rol !== 'super_admin' && target.firmaId !== auth.ctx.kullanici.firmaId) {
      return send(res, 403, { error: 'Bu kullaniciyi silemezsiniz.' });
    }
    target.aktifMi = false;
    target.silmeTarihi = new Date().toISOString();
    if (Array.isArray(db.oturumlar)) {
      db.oturumlar = db.oturumlar.filter((s) => s.kullaniciId !== target.id);
    }
    auditLog(db, 'kullanici_silindi', auth.ctx, { hedefId: id });
    writeDB(db);
    return send(res, 200, { ok: true });
  }

  // POST /api/sayac/:firmaId/increment
  async function incrementSayac(req, res, url) {
    const firmaId = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    if (!canAccessFirma(auth.ctx, firmaId)) return send(res, 403, { error: 'Bu firma sayacina erisiminiz yok.' });
    if (!db.sayaclar || typeof db.sayaclar !== 'object') db.sayaclar = {};
    if (!db.sayaclar[firmaId]) {
      db.sayaclar[firmaId] = { yil: new Date().getFullYear(), ay: new Date().getMonth() + 1, deger: 0 };
    }
    const s = db.sayaclar[firmaId];
    const buYil = new Date().getFullYear();
    const buAy  = new Date().getMonth() + 1;
    if (s.yil !== buYil || s.ay !== buAy) {
      s.yil = buYil; s.ay = buAy; s.deger = 0;
    }
    s.deger += 1;
    writeDB(db);
    return send(res, 200, { firmaId, yil: s.yil, ay: s.ay, deger: s.deger });
  }

  return {
    login,
    logout,
    me,
    changePassword,
    uploadPhoto,
    listFirmalar,
    getFirma,
    updateFirma,
    listKullanicilar,
    createKullanici,
    updateKullanici,
    resetKullaniciSifre,
    deleteKullanici,
    incrementSayac,
    // expose helpers for server.cjs to use in middleware
    getAuthContext,
    requireAuth,
    canAccessFirma,
    sanitizeUser,
  };
}

module.exports = { createAuthRoutes, getAuthContext, requireAuth, canAccessFirma, sanitizeUser };
