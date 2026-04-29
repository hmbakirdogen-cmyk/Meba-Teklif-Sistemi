import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useKullanici } from '../context/useKullanici';

const gold = (a: number) => `rgba(185,148,52,${a})`;
const silver = (a: number) => `rgba(172,186,205,${a})`;

const MAX_PHOTO_DIM = 256;     // 256x256 hedef
const MAX_PHOTO_BYTES = 600 * 1024;  // 600 KB

/** Resmi canvas ile resize edip JPEG base64 olarak dondurur. */
async function dosyaToBase64Resized(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ''));
    fr.onerror = () => reject(new Error('Dosya okunamadi'));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Gorsel yuklenemedi'));
    im.src = dataUrl;
  });
  // Kare crop + resize
  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - minSide) / 2;
  const sy = (img.naturalHeight - minSide) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = MAX_PHOTO_DIM;
  canvas.height = MAX_PHOTO_DIM;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context alinamadi');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, MAX_PHOTO_DIM, MAX_PHOTO_DIM);
  // JPEG q=0.85 — ~30-60 KB civari
  let quality = 0.85;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length * 0.75 > MAX_PHOTO_BYTES && quality > 0.4) {
    quality -= 0.1;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return out;
}

/**
 * Modal: kullanici ilk girişte hem yeni şifre belirler hem de profil fotosu yükler.
 * İkisi de tamamlanana kadar kapatılamaz (esc/dışarı tıklama yok).
 */
export default function IlkGirisModal() {
  const { aktifKullanici, sifreDegistir, profilFotoYukle, refreshKullanici } = useKullanici();
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifre2, setYeniSifre2] = useState('');
  const [sifreHata, setSifreHata] = useState<string | null>(null);
  const [sifreYapildi, setSifreYapildi] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoYuklendi, setFotoYuklendi] = useState(false);
  const [fotoHata, setFotoHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // mustChangePassword false ve profilFotoUrl varsa modal görünmeyecek
  // (parent zaten kapatır). Burada sıralı durum gösterimi var:
  // Step 1: şifre belirle, Step 2: foto yükle.
  useEffect(() => {
    if (aktifKullanici && !aktifKullanici.mustChangePassword) {
      setSifreYapildi(true);
    }
    if (aktifKullanici?.profilFotoUrl) {
      setFotoYuklendi(true);
    }
  }, [aktifKullanici]);

  async function sifreSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSifreHata(null);
    if (yeniSifre.length < 4) {
      setSifreHata('Yeni şifre en az 4 karakter olmalı.');
      return;
    }
    if (yeniSifre !== yeniSifre2) {
      setSifreHata('Şifreler eşleşmiyor.');
      return;
    }
    setYukleniyor(true);
    // Mevcut şifre = varsayılan (123456) — ilk girişte mecburen 123456 ile login oldu
    const r = await sifreDegistir('123456', yeniSifre);
    setYukleniyor(false);
    if (!r.ok) {
      setSifreHata(r.error || 'Şifre değiştirilemedi.');
      return;
    }
    setSifreYapildi(true);
  }

  async function fotoSec(e: React.ChangeEvent<HTMLInputElement>) {
    setFotoHata(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setFotoHata('Dosya çok büyük (>8MB). Daha küçük bir foto seçin.');
      return;
    }
    try {
      const base64 = await dosyaToBase64Resized(file);
      setFotoPreview(base64);
    } catch (err) {
      setFotoHata(err instanceof Error ? err.message : 'Foto okunamadı.');
    }
  }

  async function fotoYukle() {
    if (!fotoPreview) return;
    setFotoHata(null);
    setYukleniyor(true);
    const r = await profilFotoYukle(fotoPreview);
    setYukleniyor(false);
    if (!r.ok) {
      setFotoHata(r.error || 'Foto yüklenemedi.');
      return;
    }
    setFotoYuklendi(true);
    await refreshKullanici();
  }

  const adim: 'sifre' | 'foto' = !sifreYapildi ? 'sifre' : 'foto';

  const inputBase: CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(5,12,28,0.8)',
    border: `1px solid ${gold(0.18)}`,
    borderRadius: 10,
    color: 'rgba(225,235,250,0.96)',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(5,8,18,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: 'min(480px, 100%)',
        background: 'rgba(8,16,34,0.96)',
        border: `1px solid ${gold(0.22)}`,
        borderRadius: 18,
        padding: '32px 30px',
        boxShadow: '0 36px 90px rgba(0,0,0,0.65)',
        color: 'rgba(225,235,250,0.94)',
        fontFamily: '"Segoe UI","Inter","Arial",sans-serif',
      }}>
        <div style={{
          fontSize: 11, letterSpacing: 3, color: gold(0.6),
          textTransform: 'uppercase' as const, marginBottom: 4,
        }}>
          Hoş geldiniz {aktifKullanici?.adSoyad}
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>
          {adim === 'sifre' ? 'Yeni şifre belirleyin' : 'Profil fotoğrafınız'}
        </div>
        <div style={{ fontSize: 12, color: silver(0.55), marginBottom: 24 }}>
          {adim === 'sifre'
            ? 'İlk girişte güvenlik için kendi şifrenizi belirlemelisiniz.'
            : 'Diğer kullanıcılar sizi tanısın diye profil fotoğrafı yüklemeniz gerekiyor.'}
        </div>

        {/* Adım göstergesi */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          <div style={{
            flex: 1, height: 3, borderRadius: 999,
            background: sifreYapildi ? gold(0.6) : gold(0.25),
            transition: 'background 0.3s ease',
          }} />
          <div style={{
            flex: 1, height: 3, borderRadius: 999,
            background: fotoYuklendi ? gold(0.6) : (sifreYapildi ? gold(0.25) : 'rgba(255,255,255,0.06)'),
            transition: 'background 0.3s ease',
          }} />
        </div>

        {adim === 'sifre' && (
          <form onSubmit={sifreSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: 1.2, color: silver(0.5), marginBottom: 6, textTransform: 'uppercase' as const }}>
                Yeni Şifre (en az 4 karakter)
              </label>
              <input
                type="password"
                value={yeniSifre}
                onChange={(e) => setYeniSifre(e.target.value)}
                autoComplete="new-password"
                disabled={yukleniyor}
                style={inputBase}
                onFocus={(e) => { e.currentTarget.style.borderColor = gold(0.55); }}
                onBlur={(e) => { e.currentTarget.style.borderColor = gold(0.18); }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: 1.2, color: silver(0.5), marginBottom: 6, textTransform: 'uppercase' as const }}>
                Yeni Şifre (tekrar)
              </label>
              <input
                type="password"
                value={yeniSifre2}
                onChange={(e) => setYeniSifre2(e.target.value)}
                autoComplete="new-password"
                disabled={yukleniyor}
                style={inputBase}
                onFocus={(e) => { e.currentTarget.style.borderColor = gold(0.55); }}
                onBlur={(e) => { e.currentTarget.style.borderColor = gold(0.18); }}
              />
            </div>
            {sifreHata && (
              <div style={{
                marginBottom: 12, padding: '8px 12px',
                background: 'rgba(180,40,55,0.18)',
                border: '1px solid rgba(220,80,95,0.42)',
                borderRadius: 8, color: 'rgba(255,200,200,0.95)',
                fontSize: 12,
              }}>
                {sifreHata}
              </div>
            )}
            <button
              type="submit"
              disabled={yukleniyor || !yeniSifre || !yeniSifre2}
              style={{
                width: '100%', padding: '12px 16px',
                background: yukleniyor
                  ? 'linear-gradient(135deg, rgba(120,100,40,0.45), rgba(80,68,28,0.45))'
                  : 'linear-gradient(135deg, #d4ac52, #b99434)',
                color: '#1a1208',
                border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 700, letterSpacing: 1.2,
                textTransform: 'uppercase' as const,
                cursor: yukleniyor || !yeniSifre || !yeniSifre2 ? 'not-allowed' : 'pointer',
                opacity: !yeniSifre || !yeniSifre2 ? 0.5 : 1,
              }}
            >
              {yukleniyor ? 'Kaydediliyor…' : 'Şifreyi Kaydet ve Devam Et'}
            </button>
          </form>
        )}

        {adim === 'foto' && (
          <div>
            <div style={{
              display: 'flex', flexDirection: 'column' as const,
              alignItems: 'center', gap: 16, marginBottom: 18,
            }}>
              {fotoPreview
                ? <img
                    src={fotoPreview}
                    alt="Profil önizleme"
                    style={{
                      width: 140, height: 140, borderRadius: '50%',
                      objectFit: 'cover',
                      border: `2px solid ${gold(0.55)}`,
                      boxShadow: `0 8px 28px ${gold(0.32)}, 0 0 0 4px rgba(0,0,0,0.4)`,
                    }}
                  />
                : (
                  <div style={{
                    width: 140, height: 140, borderRadius: '50%',
                    border: `2px dashed ${gold(0.32)}`,
                    background: 'rgba(15,25,52,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, color: gold(0.5),
                  }}>
                    +
                  </div>
                )
              }
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={yukleniyor}
                style={{
                  padding: '8px 18px',
                  background: 'rgba(15,25,52,0.85)',
                  border: `1px solid ${gold(0.42)}`,
                  color: gold(0.85),
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, letterSpacing: 1.2,
                  textTransform: 'uppercase' as const,
                }}
              >
                {fotoPreview ? 'Başka foto seç' : 'Foto seç'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={fotoSec}
                style={{ display: 'none' }}
              />
            </div>

            {fotoHata && (
              <div style={{
                marginBottom: 12, padding: '8px 12px',
                background: 'rgba(180,40,55,0.18)',
                border: '1px solid rgba(220,80,95,0.42)',
                borderRadius: 8, color: 'rgba(255,200,200,0.95)',
                fontSize: 12,
              }}>
                {fotoHata}
              </div>
            )}

            <button
              type="button"
              onClick={fotoYukle}
              disabled={yukleniyor || !fotoPreview}
              style={{
                width: '100%', padding: '12px 16px',
                background: 'linear-gradient(135deg, #d4ac52, #b99434)',
                color: '#1a1208',
                border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 700, letterSpacing: 1.2,
                textTransform: 'uppercase' as const,
                cursor: yukleniyor || !fotoPreview ? 'not-allowed' : 'pointer',
                opacity: !fotoPreview ? 0.5 : 1,
              }}
            >
              {yukleniyor ? 'Yükleniyor…' : 'Fotoğrafı Yükle ve Bitir'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * İlk giriş gerekli mi? — şifre değiştirme veya foto yükleme yapılmamış mı?
 * Auth modal'i göstermek için kullanılan helper.
 */
export function ilkGirisGerekli(kullanici: { mustChangePassword?: boolean; profilFotoUrl?: string } | null): boolean {
  if (!kullanici) return false;
  if (kullanici.mustChangePassword) return true;
  if (!kullanici.profilFotoUrl) return true;
  return false;
}
