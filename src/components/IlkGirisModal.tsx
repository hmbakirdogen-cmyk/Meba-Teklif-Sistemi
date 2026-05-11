import { useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useKullanici } from '../context/useKullanici';
import { dosyaToVesikalikBase64 } from '../utils/profilFoto';
import { formatAdSoyad } from '../utils/formatters';

// Önceki "gold" tonu nötr griye çevrildi — modal'da hiçbir kahve/altın hue yok.
const gold = (a: number) => `rgba(180,180,180,${a})`;
const silver = (a: number) => `rgba(172,186,205,${a})`;

/**
 * Modal: kullanici ilk girişte hem yeni şifre belirler hem de profil fotosu yükler.
 * İkisi de tamamlanana kadar kapatılamaz (esc/dışarı tıklama yok).
 */
export default function IlkGirisModal() {
  const { aktifKullanici, sifreDegistir, profilFotoYukle, refreshKullanici } = useKullanici();
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifre2, setYeniSifre2] = useState('');
  const [sifreHata, setSifreHata] = useState<string | null>(null);
  const [sifreYapildi, setSifreYapildi] = useState(() => Boolean(aktifKullanici && !aktifKullanici.mustChangePassword));
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoYuklendi, setFotoYuklendi] = useState(() => Boolean(aktifKullanici?.profilFotoUrl));
  const [fotoHata, setFotoHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    // Mevcut şifre = varsayılan (0000) — ilk girişte mecburen 0000 ile login oldu
    const r = await sifreDegistir('0000', yeniSifre);
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
      const base64 = await dosyaToVesikalikBase64(file);
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
      position: 'fixed', inset: 0, zIndex: 2000,
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
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{
          fontSize: 11, letterSpacing: 3, color: gold(0.6),
          textTransform: 'uppercase' as const, marginBottom: 4,
        }}>
          Hoş geldiniz {aktifKullanici ? formatAdSoyad(aktifKullanici.adSoyad) : ''}
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
                  ? 'linear-gradient(135deg, rgba(110,110,110,0.45), rgba(75,75,75,0.45))'
                  : 'linear-gradient(135deg, #c8c8c8, #909090)',
                color: '#0a0a0a',
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
                      width: 135, height: 180, borderRadius: 10,
                      objectFit: 'cover', objectPosition: 'center top',
                      border: `2px solid ${gold(0.55)}`,
                      boxShadow: `0 8px 28px ${gold(0.32)}, 0 0 0 4px rgba(0,0,0,0.4)`,
                    }}
                  />
                : (
                  <div style={{
                    width: 135, height: 180, borderRadius: 10,
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
                background: 'linear-gradient(135deg, #c8c8c8, #909090)',
                color: '#0a0a0a',
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

