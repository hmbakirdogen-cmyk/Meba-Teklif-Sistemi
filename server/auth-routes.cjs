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
const CARI_LOGO_DIR   = path.join(__dirname, '..', 'public', 'cari-logolari');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 saat (varsayilan)
const SESSION_TTL_REMEMBERED_MS = 30 * 24 * 60 * 60 * 1000; // 30 gun (Beni Hatirla)
const VARSAYILAN_SIFRE = '0000';
const MAX_PHOTO_BYTES = 600 * 1024; // 600 KB — frontend resize sonrasi makul

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDirSync(PROFIL_FOTO_DIR);
ensureDirSync(CARI_LOGO_DIR);

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

/**
 * Suresi gecmis oturumlari fiziksel olarak DB'den sil ve disk'e yaz.
 * Server.cjs boot'unda 1 kez + her 1 saatte bir background olarak cagrilir.
 * Hicbir kullanici online degilken DB'de zombi session birikmesin diye.
 *
 * Returns: kaldirilan session sayisi.
 */
function pruneExpiredSessions(readDB, writeDB) {
  try {
    const db = readDB();
    const oncekiSayi = Array.isArray(db.oturumlar) ? db.oturumlar.length : 0;
    ensureOturumlar(db); // mevcut filter mantigini kullan
    const kalan = db.oturumlar.length;
    const kaldirildi = oncekiSayi - kalan;
    if (kaldirildi > 0) {
      writeDB(db);
      console.log(`[session-cleanup] ${kaldirildi} expired session removed`);
    }
    return kaldirildi;
  } catch (err) {
    console.warn('[session-cleanup] failed:', err.message);
    return 0;
  }
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

// İş yetkileri (Katman 1): teklif/cari/personel yönetimi.
// super_admin: tüm sistem. firma_admin: yönetim kurulu (3 firma kapsamı).
function requireAdmin(ctx) {
  const r = ctx?.kullanici?.rol;
  if (r === 'super_admin' || r === 'firma_admin') return { ok: true };
  return { ok: false, status: 403, error: 'Bu islem icin yetkili degilsiniz.' };
}

// Sadece super_admin yapabilen ozel islemler (firma profili düzenleme vb.)
function requireSuperAdmin(ctx) {
  const r = ctx?.kullanici?.rol;
  if (r === 'super_admin') return { ok: true };
  return { ok: false, status: 403, error: 'Bu islem icin Süper Yönetici yetkisi gereklidir.' };
}

// Çok-firma erişim kontrolü:
//   - super_admin: tüm firmalar
//   - firma_admin: gosterilenFirmalar tanımlıysa o liste; değilse primary firmaId
//   - engineer/sales: sadece kendi firmaId'si
function canAccessFirma(ctx, firmaId) {
  const k = ctx?.kullanici;
  if (!k) return false;
  if (k.rol === 'super_admin') return true;
  if (k.rol === 'firma_admin') {
    if (Array.isArray(k.gosterilenFirmalar) && k.gosterilenFirmalar.length > 0) {
      return k.gosterilenFirmalar.includes(firmaId);
    }
    return k.firmaId === firmaId;
  }
  return k.firmaId === firmaId;
}

// ── Kullanici sanitize: sifreHash'i UI'a gondermeden cikar ───────────────────
function sanitizeUser(u) {
  if (!u) return null;
  const { sifreHash, ...rest } = u;
  return {
    ...rest,
    telefon: u.telefon || '',
    dahili: u.dahili || '',
  };
}

const FIRMA_TEXT_FALLBACKS = {
  mesa: {
    ad: 'Mesa Enerji Taahhüt Elektrik Elektronik Mühendislik Danışmanlık Makine San. ve Tic. Ltd. Şti.',
  },
};

function sanitizeFirma(f) {
  if (!f) return f;
  const fallback = FIRMA_TEXT_FALLBACKS[f.id];
  if (!fallback) return f;
  return {
    ...f,
    ad: /Taahhut|Muhendislik|Danismanlik| Sti\.?/i.test(String(f.ad || '')) ? fallback.ad : f.ad,
  };
}

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

// ── Cari logosu: base64 -> diske jpeg/png/webp ─────────────────────────────
function cariLogoKaydet(cariId, fotoBase64) {
  if (typeof fotoBase64 !== 'string' || !fotoBase64) {
    throw new Error('fotoBase64 bos.');
  }
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
    throw new Error(`Logo cok buyuk (${Math.round(buf.length / 1024)} KB). Maks ${Math.round(MAX_PHOTO_BYTES / 1024)} KB.`);
  }
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  // Eski versiyonlari sil (kullanici farkli formatla yuklemis olabilir)
  for (const e of ['png', 'jpg', 'jpeg', 'webp']) {
    const eski = path.join(CARI_LOGO_DIR, `${cariId}.${e}`);
    try { if (fs.existsSync(eski)) fs.unlinkSync(eski); } catch { /* ignore */ }
  }
  // cariId icindeki / \ gibi karakterleri temizle (ID guvenligi)
  const safeId = String(cariId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const dosyaAdi = `${safeId}.${ext}`;
  const tamYol   = path.join(CARI_LOGO_DIR, dosyaAdi);
  fs.writeFileSync(tamYol, buf);
  return `/cari-logolari/${dosyaAdi}?v=${Date.now()}`;
}

// ── Route handler factory ────────────────────────────────────────────────────
function createAuthRoutes({ readDB, writeDB, parseBody, send }) {
  // ── Login brute-force korumasi (in-memory, IP bazli) ──────────────────────
  // Ayni IP'den 15 dakika icinde 10'dan fazla basarisiz login → kilitli.
  // Process restart'inda sifirlanir; LAN ortami icin yeterli koruma.
  const loginAttempts = new Map(); // ip -> { count, firstAttemptAt }
  const MAX_LOGIN_ATTEMPTS = 10;
  const LOGIN_WINDOW_MS = 15 * 60 * 1000;

  function getClientIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
    return (req.socket && req.socket.remoteAddress) || 'unknown';
  }
  function checkLoginRateLimit(req) {
    const ip = getClientIp(req);
    const now = Date.now();
    const rec = loginAttempts.get(ip);
    if (!rec) return { ok: true };
    // Pencere disinda → eski kayit, sifirla
    if (now - rec.firstAttemptAt >= LOGIN_WINDOW_MS) {
      loginAttempts.delete(ip);
      return { ok: true };
    }
    if (rec.count >= MAX_LOGIN_ATTEMPTS) {
      const kalanMs = LOGIN_WINDOW_MS - (now - rec.firstAttemptAt);
      return { ok: false, kalanSn: Math.ceil(kalanMs / 1000) };
    }
    return { ok: true };
  }
  function recordLoginAttempt(req) {
    const ip = getClientIp(req);
    const now = Date.now();
    const rec = loginAttempts.get(ip);
    if (!rec || now - rec.firstAttemptAt >= LOGIN_WINDOW_MS) {
      loginAttempts.set(ip, { count: 1, firstAttemptAt: now });
    } else {
      rec.count += 1;
    }
  }
  function resetLoginRateLimit(req) {
    loginAttempts.delete(getClientIp(req));
  }
  // Periyodik temizlik — pencere disindaki girdileri sil
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of loginAttempts) {
      if (now - rec.firstAttemptAt >= LOGIN_WINDOW_MS) loginAttempts.delete(ip);
    }
  }, 5 * 60 * 1000).unref?.();

  // POST /api/auth/login
  async function login(req, res) {
    // 1) Rate limit (parseBody'den ONCE — body okumadan reddet)
    const rl = checkLoginRateLimit(req);
    if (!rl.ok) {
      return send(res, 429, {
        error: `Çok fazla başarısız giriş denemesi. ${rl.kalanSn} saniye sonra tekrar deneyiniz.`,
      });
    }
    const body = await parseBody(req);
    const kullaniciAdi = String(body.kullaniciAdi || '').trim().toLocaleLowerCase('tr-TR');
    const sifre        = String(body.sifre || '');
    const secilenFirmaId = body.secilenFirmaId ? String(body.secilenFirmaId) : null;
    const beniHatirla  = Boolean(body.beniHatirla);
    if (!kullaniciAdi || !sifre) {
      return send(res, 400, { error: 'Kullanici adi ve sifre zorunlu.' });
    }
    const db = readDB();
    // Geriye dönük uyumluluk: hem tam ad ("mehmet bakırdöğen") hem de sadece
    // ilk kelime ("mehmet") ile login kabul edilir. Tek-kelime input verildiğinde
    // DB'deki tam adın ilk kelimesi ile karşılaştırılır.
    const k = (db.kullanicilar || []).find((u) => {
      const full = String(u.kullaniciAdi || '').toLocaleLowerCase('tr-TR');
      if (full === kullaniciAdi) return true;
      if (!kullaniciAdi.includes(' ')) {
        const firstWord = full.split(/\s+/)[0];
        if (firstWord === kullaniciAdi) return true;
      }
      return false;
    });
    if (!k || !k.aktifMi) {
      recordLoginAttempt(req);
      return send(res, 401, { error: 'Kullanici adi veya sifre hatali.' });
    }
    if (!verifyPassword(sifre, k.sifreHash)) {
      auditLog(db, 'login_failed', { kullanici: k }, { reason: 'wrong_password' });
      writeDB(db);
      recordLoginAttempt(req);
      return send(res, 401, { error: 'Kullanici adi veya sifre hatali.' });
    }
    // Firma yetki dogrulamasi:
    //   - super_admin: tüm firmalar
    //   - firma_admin: gosterilenFirmalar tanımlıysa o liste; değilse kendi firmaId
    //   - engineer/sales: sadece kendi firmaId
    // Secilen firma erisilebilir degilse oturum olusturmadan REDDET ve audit log'a kaydet.
    const loginFirmaErisir = (() => {
      if (!secilenFirmaId) return true;
      if (k.rol === 'super_admin') return true;
      if (k.rol === 'firma_admin') {
        if (Array.isArray(k.gosterilenFirmalar) && k.gosterilenFirmalar.length > 0) {
          return k.gosterilenFirmalar.includes(secilenFirmaId);
        }
        return k.firmaId === secilenFirmaId;
      }
      return k.firmaId === secilenFirmaId;
    })();
    if (!loginFirmaErisir) {
      auditLog(db, 'login_blocked', { kullanici: k }, {
        reason: 'wrong_firma',
        secilenFirmaId,
        kullaniciFirmaId: k.firmaId,
      });
      writeDB(db);
      recordLoginAttempt(req);
      return send(res, 403, {
        error: 'Bu firmaya kayitli degilsiniz. Lutfen kendi firmanizi seciniz.',
      });
    }
    // Sifre dogru → oturum olustur
    ensureOturumlar(db);
    const token = generateSessionToken();
    // Beni Hatirla aktifse 30 gun, degilse varsayilan 12 saat
    const ttlMs = beniHatirla ? SESSION_TTL_REMEMBERED_MS : SESSION_TTL_MS;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
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
    resetLoginRateLimit(req);
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

  // PATCH /api/firma/:id — Firma profili düzenleme: super_admin + firma_admin.
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
                    'pdfKlasorAdi', 'teklifPrefix', 'varsayilanlar'];
    for (const alan of izinli) {
      if (alan in body) f[alan] = body[alan];
    }
    auditLog(db, 'firma_guncellendi', auth.ctx, { firmaId: id });
    writeDB(db);
    return send(res, 200, sanitizeFirma(f));
  }

  // GET /api/firma/:firmaId/personel — PUBLIC (login ekraninda kart olusturmak icin)
  // Donulen alanlar: id, kullaniciAdi, adSoyad, unvan, rol, firmaId, profilFotoUrl, initials.
  // Hassas alan (sifreHash, mustChangePassword, olusturanKullaniciId vs.) HIC gonderilmez.
  //
  // Goruntuleme stratejisi:
  //   1) firma_admin / engineer / sales — sadece kendi firmalarinin listesinde.
  //   2) super_admin / admin (firmaId===null, tum firmalara yetki) — eger
  //      `gosterilenFirmalar` (array) tanimliysa SADECE o firmalarda gozukur;
  //      tanimli degilse legacy davranis: hepsinde gozukur.
  //   3) Sirala: once yoneticiler (rol oncelikli), sonra digerleri (ad-soyad).
  async function listFirmaPersonel(req, res, url) {
    const m = /^\/api\/firma\/([^/]+)\/personel$/.exec(url);
    const firmaId = m && m[1] ? decodeURIComponent(m[1]) : null;
    if (!firmaId) return send(res, 400, { error: 'Firma id gerekli.' });
    const db = readDB();
    const ROL_AGIRLIK = { super_admin: 0, firma_admin: 1, engineer: 2, sales: 3 };
    const liste = (db.kullanicilar || [])
      .filter((u) => u.aktifMi !== false)
      .filter((u) => {
        if (u.rol === 'super_admin' || u.rol === 'firma_admin') {
          // Yonetici icin opsiyonel "gosterilenFirmalar" mapping'i:
          //   - Tanimli ve dolu ise: SADECE o firmalarda kart goster
          //   - Tanimli degil/bos ise: primary firmaId fallback
          if (Array.isArray(u.gosterilenFirmalar) && u.gosterilenFirmalar.length > 0) {
            return u.gosterilenFirmalar.includes(firmaId);
          }
          return u.firmaId === firmaId;
        }
        // Diger roller sadece kendi firmasinda
        return u.firmaId === firmaId;
      })
      .map((u) => ({
        id: u.id,
        kullaniciAdi: u.kullaniciAdi || '',
        adSoyad: u.adSoyad || '',
        unvan: u.unvan || '',
        rol: u.rol,
        firmaId: u.firmaId || null,
        profilFotoUrl: u.profilFotoUrl || null,
        initials: u.initials || uretInitials(u.adSoyad),
        telefon: u.telefon || '',
        dahili: u.dahili || '',
      }))
      .sort((a, b) => {
        const wa = ROL_AGIRLIK[a.rol] ?? 9;
        const wb = ROL_AGIRLIK[b.rol] ?? 9;
        if (wa !== wb) return wa - wb;
        return a.adSoyad.localeCompare(b.adSoyad, 'tr');
      });
    return send(res, 200, liste);
  }

  // GET /api/kullanicilar — yalnızca yöneticiler erişebilir.
  //   super_admin: tüm kullanıcılar
  //   firma_admin: gosterilenFirmalar union (yoksa kendi firması)
  async function listKullanicilar(req, res) {
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const adminCheck = requireAdmin(auth.ctx);
    if (!adminCheck.ok) return send(res, adminCheck.status, { error: adminCheck.error });
    const k = auth.ctx.kullanici;
    let liste = db.kullanicilar || [];
    if (k.rol === 'firma_admin') {
      const kapsam = Array.isArray(k.gosterilenFirmalar) && k.gosterilenFirmalar.length > 0
        ? k.gosterilenFirmalar
        : [k.firmaId];
      liste = liste.filter((u) => u.firmaId === null || kapsam.includes(u.firmaId));
    }
    return send(res, 200, liste.map(sanitizeUser));
  }

  // POST /api/kullanicilar — firma_admin/super_admin personel ekleyebilir;
  //   firma_admin rolündeki yeni kullanıcıyı her iki yönetici de ekleyebilir;
  //   super_admin rolündeki yeni kullanıcıyı sadece super_admin ekleyebilir.
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
    // super_admin rolünde kullanıcı oluşturma sadece super_admin'e açık
    if (rol === 'super_admin' && auth.ctx.kullanici.rol !== 'super_admin') {
      return send(res, 403, { error: 'Süper Yönetici rolünde kullanıcı oluşturmak için Süper Yönetici yetkisi gereklidir.' });
    }
    if (!adSoyad || !kullaniciAdi) {
      return send(res, 400, { error: 'Ad Soyad ve kullanici adi zorunlu.' });
    }
    // firmaId her zaman gerekir. firma_admin yönetim kurulu üyesi olarak
    // birden fazla firmaya erişebilir (gosterilenFirmalar) ama primary firmaId şart.
    let firmaId = body.firmaId || null;
    if (firmaId !== null && !firmaId) return send(res, 400, { error: 'firmaId zorunlu.' });
    if (firmaId !== null && !(db.firmalar || []).some((f) => f.id === firmaId)) {
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
      telefon: String(body.telefon || '').trim(),
      dahili: String(body.dahili || '').trim(),
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
    const meRol = auth.ctx.kullanici.rol;
    // super_admin tüm kullanıcıları düzenler.
    // firma_admin: personel + diğer firma_admin'leri düzenleyebilir; super_admin
    // hesabını düzenleyemez.
    const targetIsSuperAdmin = target.rol === 'super_admin';
    let canEdit = false;
    if (isSelf) canEdit = true;
    else if (meRol === 'super_admin') canEdit = true;
    else if (meRol === 'firma_admin' && !targetIsSuperAdmin) canEdit = true;
    if (!canEdit) return send(res, 403, { error: 'Bu kullaniciyi guncelleyemezsiniz.' });
    const isAdmin = !isSelf && canEdit;
    const body = await parseBody(req);
    // Self update: sadece adSoyad/unvan/initials
    // Admin update: yukaridakilere ek olarak rol/aktifMi (kendi firma kapsam icinde)
    const izinli = isAdmin
      ? ['adSoyad', 'unvan', 'initials', 'rol', 'aktifMi', 'telefon', 'dahili']
      : ['adSoyad', 'unvan', 'initials', 'telefon', 'dahili'];
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
  //   super_admin: tüm kullanıcılar
  //   firma_admin: personel + diğer firma_admin'ler (super_admin hariç)
  async function resetKullaniciSifre(req, res, url) {
    const id = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const adminCheck = requireAdmin(auth.ctx);
    if (!adminCheck.ok) return send(res, adminCheck.status, { error: adminCheck.error });
    const target = (db.kullanicilar || []).find((u) => u.id === id);
    if (!target) return send(res, 404, { error: 'Kullanici bulunamadi.' });
    const meRol = auth.ctx.kullanici.rol;
    if (meRol !== 'super_admin' && target.rol === 'super_admin') {
      return send(res, 403, { error: 'Süper Yöneticinin şifresini sıfırlamak için Süper Yönetici yetkisi gereklidir.' });
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
  //   super_admin: tüm kullanıcılar
  //   firma_admin: personel + diğer firma_admin'ler (super_admin hariç) — tüm
  //   firma kapsamında.
  async function deleteKullanici(req, res, url) {
    const id = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const adminCheck = requireAdmin(auth.ctx);
    if (!adminCheck.ok) return send(res, adminCheck.status, { error: adminCheck.error });
    const target = (db.kullanicilar || []).find((u) => u.id === id);
    if (!target) return send(res, 404, { error: 'Kullanici bulunamadi.' });
    const meRol = auth.ctx.kullanici.rol;
    if (meRol !== 'super_admin' && target.rol === 'super_admin') {
      return send(res, 403, { error: 'Süper Yöneticiyi silmek için Süper Yönetici yetkisi gereklidir.' });
    }
    if (target.id === auth.ctx.kullanici.id) {
      return send(res, 400, { error: 'Kendi hesabinizi silemezsiniz.' });
    }
    if (!['super_admin', 'firma_admin'].includes(auth.ctx.kullanici.rol) && target.firmaId !== auth.ctx.kullanici.firmaId) {
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

  // POST /api/cariler/:id/logo — body: { fotoBase64 }
  // Yetki: requireAuth (oturum aciksa yeter — cari upsert zaten herkese acik).
  // firmaId kapsami: super_admin/admin tum firmalar; digerleri kendi firmasi.
  async function uploadCariLogo(req, res, url) {
    const m = /^\/api\/cariler\/([^/]+)\/logo$/.exec(url);
    const id = m && m[1] ? decodeURIComponent(m[1]) : null;
    if (!id) return send(res, 400, { error: 'Cari id gerekli.' });
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const cari = (db.cariler || []).find((c) => c.id === id);
    if (!cari) return send(res, 404, { error: 'Cari bulunamadi.' });
    if (!canAccessFirma(auth.ctx, cari.firmaId)) {
      return send(res, 403, { error: 'Bu cariye logo yukleme yetkiniz yok.' });
    }
    const body = await parseBody(req);
    try {
      const logoUrl = cariLogoKaydet(id, body.fotoBase64);
      cari.logoUrl = logoUrl;
      cari.guncellemeTarihi = new Date().toISOString();
      cari.updatedBy = auth.ctx.kullanici.id;
      cari.lastSyncedAt = new Date().toISOString();
      auditLog(db, 'cari_logo_yuklendi', auth.ctx, { cariId: id });
      writeDB(db);
      return send(res, 200, { logoUrl, cari });
    } catch (err) {
      return send(res, 400, { error: err.message || 'Logo kaydedilemedi.' });
    }
  }

  // DELETE /api/cariler/:id/logo — logoUrl alanini ve dosyayi temizler
  async function deleteCariLogo(req, res, url) {
    const m = /^\/api\/cariler\/([^/]+)\/logo$/.exec(url);
    const id = m && m[1] ? decodeURIComponent(m[1]) : null;
    if (!id) return send(res, 400, { error: 'Cari id gerekli.' });
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const cari = (db.cariler || []).find((c) => c.id === id);
    if (!cari) return send(res, 404, { error: 'Cari bulunamadi.' });
    if (!canAccessFirma(auth.ctx, cari.firmaId)) {
      return send(res, 403, { error: 'Bu cariye yetkiniz yok.' });
    }
    const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
      const yol = path.join(CARI_LOGO_DIR, `${safeId}.${ext}`);
      try { if (fs.existsSync(yol)) fs.unlinkSync(yol); } catch { /* ignore */ }
    }
    delete cari.logoUrl;
    cari.guncellemeTarihi = new Date().toISOString();
    cari.updatedBy = auth.ctx.kullanici.id;
    cari.lastSyncedAt = new Date().toISOString();
    auditLog(db, 'cari_logo_silindi', auth.ctx, { cariId: id });
    writeDB(db);
    return send(res, 200, { ok: true, cari });
  }

  // POST /api/sayac/:firmaId/increment
  async function incrementSayac(req, res, url) {
    const firmaId = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    if (!canAccessFirma(auth.ctx, firmaId)) return send(res, 403, { error: 'Bu firma sayacina erisiminiz yok.' });
    if (!db.sayaclar || typeof db.sayaclar !== 'object') db.sayaclar = {};
    const buYil = new Date().getFullYear();
    const buAy  = new Date().getMonth() + 1;
    // Eski formatı (flat number, null, vs) defansif olarak objeye normalize et —
    // primitive üzerinde property set silently fail eder, sayac bozulur.
    const mevcut = db.sayaclar[firmaId];
    if (!mevcut || typeof mevcut !== 'object' || typeof mevcut.deger !== 'number') {
      db.sayaclar[firmaId] = { yil: buYil, ay: buAy, deger: 0 };
    }
    const s = db.sayaclar[firmaId];
    if (s.yil !== buYil || s.ay !== buAy) {
      s.yil = buYil; s.ay = buAy; s.deger = 0;
    }
    s.deger += 1;
    writeDB(db);
    return send(res, 200, { firmaId, yil: s.yil, ay: s.ay, deger: s.deger });
  }

  // ── GERİ BİLDİRİM (kullanıcı→süper admin mesaj kanalı) ────────────────────
  function ensureGeriBildirimColl(db) {
    if (!Array.isArray(db.geriBildirimler)) db.geriBildirimler = [];
    return db.geriBildirimler;
  }

  // GET /api/geribildirim
  async function listGeriBildirim(req, res) {
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const liste = ensureGeriBildirimColl(db);
    const k = auth.ctx.kullanici;
    if (k.rol === 'super_admin') {
      return send(res, 200, liste);
    }
    return send(res, 200, liste.filter((g) => g.gonderen?.id === k.id));
  }

  // POST /api/geribildirim
  async function createGeriBildirim(req, res) {
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const body = await parseBody(req);
    const mesaj = (body?.mesaj || '').toString().trim();
    const tur = body?.tur;
    const sayfa = (body?.sayfa || 'bilinmeyen').toString();
    if (!mesaj) return send(res, 400, { error: 'Mesaj boş olamaz.' });
    if (!['hata', 'oneri', 'mesaj'].includes(tur)) {
      return send(res, 400, { error: 'Geçersiz tür.' });
    }
    const k = auth.ctx.kullanici;
    const yeni = {
      id: 'gb-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      gonderen: { id: k.id, adSoyad: k.adSoyad },
      tarih: new Date().toISOString(),
      sayfa,
      tur,
      mesaj,
      okundu: false,
      cevap: null,
      cevapTarihi: null,
    };
    const liste = ensureGeriBildirimColl(db);
    liste.unshift(yeni);
    writeDB(db);
    return send(res, 200, yeni);
  }

  // PATCH /api/geribildirim/:id  (sadece super_admin)
  async function updateGeriBildirim(req, res, url) {
    const id = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const su = requireSuperAdmin(auth.ctx);
    if (!su.ok) return send(res, su.status, { error: su.error });
    const body = await parseBody(req);
    const liste = ensureGeriBildirimColl(db);
    const idx = liste.findIndex((g) => g.id === id);
    if (idx < 0) return send(res, 404, { error: 'Bildirim bulunamadı.' });
    const mevcut = liste[idx];
    if (typeof body.okundu === 'boolean') mevcut.okundu = body.okundu;
    if (typeof body.cevap === 'string') {
      mevcut.cevap = body.cevap.trim() || null;
      mevcut.cevapTarihi = mevcut.cevap ? new Date().toISOString() : null;
    }
    writeDB(db);
    return send(res, 200, mevcut);
  }

  // DELETE /api/geribildirim/:id  (sadece super_admin)
  async function deleteGeriBildirim(req, res, url) {
    const id = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const su = requireSuperAdmin(auth.ctx);
    if (!su.ok) return send(res, su.status, { error: su.error });
    const liste = ensureGeriBildirimColl(db);
    const idx = liste.findIndex((g) => g.id === id);
    if (idx < 0) return send(res, 404, { error: 'Bildirim bulunamadı.' });
    liste.splice(idx, 1);
    writeDB(db);
    return send(res, 200, { ok: true });
  }

  // ── BİLDİRİMLER (atama/teklif olayları → her kullanıcı kendi
  //    bildirim listesini gorur) ────────────────────────────────────────
  function ensureBildirimColl(db) {
    if (!Array.isArray(db.bildirimler)) db.bildirimler = [];
    return db.bildirimler;
  }

  // GET /api/bildirimler — sadece kendi bildirimleri (yeni → eski).
  async function listBildirimler(req, res) {
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const me = auth.ctx.kullanici;
    const liste = ensureBildirimColl(db)
      .filter((b) => b.hedefKullaniciId === me.id)
      .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
    return send(res, 200, liste);
  }

  // PATCH /api/bildirimler/:id — sadece kendi bildirimini guncelleyebilir.
  async function updateBildirim(req, res, url) {
    const id = url.split('/')[3];
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const me = auth.ctx.kullanici;
    const body = await parseBody(req);
    const liste = ensureBildirimColl(db);
    const mevcut = liste.find((b) => b.id === id);
    if (!mevcut) return send(res, 404, { error: 'Bildirim bulunamadı.' });
    if (mevcut.hedefKullaniciId !== me.id) {
      return send(res, 403, { error: 'Bu bildirimi guncelleme yetkiniz yok.' });
    }
    if (typeof body.okundu === 'boolean') mevcut.okundu = body.okundu;
    writeDB(db);
    return send(res, 200, mevcut);
  }

  // POST /api/bildirimler/toplu-okundu — kendi tum bildirimlerini okundu yap.
  async function bildirimleriToplukundu(req, res) {
    const db = readDB();
    const auth = requireAuth(db, req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });
    const me = auth.ctx.kullanici;
    const liste = ensureBildirimColl(db);
    let degisen = 0;
    for (const b of liste) {
      if (b.hedefKullaniciId === me.id && !b.okundu) {
        b.okundu = true;
        degisen++;
      }
    }
    writeDB(db);
    return send(res, 200, { ok: true, degisen });
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
    listFirmaPersonel,
    listKullanicilar,
    createKullanici,
    updateKullanici,
    resetKullaniciSifre,
    deleteKullanici,
    uploadCariLogo,
    deleteCariLogo,
    incrementSayac,
    listGeriBildirim,
    createGeriBildirim,
    updateGeriBildirim,
    deleteGeriBildirim,
    listBildirimler,
    updateBildirim,
    bildirimleriToplukundu,
    // expose helpers for server.cjs to use in middleware
    getAuthContext,
    requireAuth,
    canAccessFirma,
    sanitizeUser,
  };
}

module.exports = { createAuthRoutes, getAuthContext, requireAuth, canAccessFirma, sanitizeUser, pruneExpiredSessions };
