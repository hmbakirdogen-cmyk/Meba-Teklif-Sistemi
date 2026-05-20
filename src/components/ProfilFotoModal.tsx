import { useEffect, useRef, useState } from 'react';
import { Modal, Button, message } from 'antd';
import { CameraOutlined, AimOutlined } from '@ant-design/icons';
import { useKullanici } from '../context/useKullanici';
import { dosyaToYuzOdakliVesikalik, gorselToYuzOdakliVesikalik, yuzModeliniArkaPlandaIsit } from '../utils/yuzTespit';
import { formatAdSoyad } from '../utils/formatters';

const silver = (a: number) => `rgba(172,186,205,${a})`;

interface ProfilFotoModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Profil fotosunu kullanicinin kendi guncellemesi icin modal.
 * AppLayout sag ust avatardan acilir.
 *   - Mevcut foto vesikalik (3:4) onizleme ile gozukur
 *   - "Yeni foto sec" → file picker → vesikalik kirpma + onizleme
 *   - "Kaydet" → backend'e yukle
 */
export default function ProfilFotoModal({ open, onClose }: ProfilFotoModalProps) {
  const { aktifKullanici, profilFotoYukle, refreshKullanici } = useKullanici();
  const [yeniFoto, setYeniFoto] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [tespitEdiliyor, setTespitEdiliyor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal açılınca yüz tespit modelini arka planda ısıt — kullanıcı foto
  // seçtiğinde model çoktan hazır olur, lag yaşanmaz.
  useEffect(() => {
    if (open) yuzModeliniArkaPlandaIsit();
  }, [open]);

  function reset() {
    setYeniFoto(null);
    setYukleniyor(false);
    setTespitEdiliyor(false);
  }

  async function fotoSec(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      message.error('Dosya çok büyük (>8MB). Daha küçük bir foto seçin.');
      return;
    }
    setTespitEdiliyor(true);
    try {
      const base64 = await dosyaToYuzOdakliVesikalik(file);
      setYeniFoto(base64);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Foto okunamadı.');
    } finally {
      setTespitEdiliyor(false);
    }
  }

  async function kaydet() {
    if (!yeniFoto) return;
    setYukleniyor(true);
    const r = await profilFotoYukle(yeniFoto);
    setYukleniyor(false);
    if (!r.ok) {
      message.error(r.error || 'Foto yüklenemedi.');
      return;
    }
    await refreshKullanici();
    message.success('Profil fotoğrafı güncellendi.');
    reset();
    onClose();
  }

  // Mevcut profil fotoğrafını yüz odaklı olarak yeniden işle. Mevcut URL'yi
  // fetch et → yüz tespit + crop → upload. Eski fotolar için tek tık migration.
  async function mevcudunuYenidenIsle() {
    if (!aktifKullanici?.profilFotoUrl) return;
    setTespitEdiliyor(true);
    try {
      const yeni = await gorselToYuzOdakliVesikalik(aktifKullanici.profilFotoUrl);
      setTespitEdiliyor(false);
      setYukleniyor(true);
      const r = await profilFotoYukle(yeni);
      setYukleniyor(false);
      if (!r.ok) {
        message.error(r.error || 'Foto yüklenemedi.');
        return;
      }
      await refreshKullanici();
      message.success('Profil fotoğrafı yüz odaklı olarak yeniden işlendi.');
      reset();
      onClose();
    } catch (err) {
      setTespitEdiliyor(false);
      setYukleniyor(false);
      message.error(err instanceof Error ? err.message : 'İşlem başarısız.');
    }
  }

  function kapat() {
    if (yukleniyor) return;
    reset();
    onClose();
  }

  // Onizlemede gosterilecek foto: yeni secilen varsa o, yoksa mevcut
  const onizleme = yeniFoto ?? aktifKullanici?.profilFotoUrl ?? null;

  return (
    <Modal
      open={open}
      onCancel={kapat}
      title="Profil Fotoğrafı"
      width={420}
      destroyOnHidden
      footer={[
        <Button key="iptal" onClick={kapat} disabled={yukleniyor}>
          {yeniFoto ? 'Vazgeç' : 'Kapat'}
        </Button>,
        yeniFoto && (
          <Button
            key="kaydet"
            type="primary"
            loading={yukleniyor}
            onClick={kaydet}
          >
            Kaydet
          </Button>
        ),
      ]}
    >
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 18, padding: '8px 0 4px',
      }}>
        {onizleme ? (
          <img
            src={onizleme}
            alt={aktifKullanici ? formatAdSoyad(aktifKullanici.adSoyad) : 'Profil'}
            draggable={false}
            style={{
              width: 180, height: 240, borderRadius: 12,
              objectFit: 'cover', objectPosition: 'center top',
              border: '2px solid rgba(120,170,240,0.32)',
              boxShadow: '0 8px 28px rgba(0,0,0,0.32), 0 0 0 4px rgba(120,170,240,0.10)',
            }}
          />
        ) : (
          <div style={{
            width: 180, height: 240, borderRadius: 12,
            border: '2px dashed rgba(140,160,200,0.35)',
            background: 'rgba(20,32,55,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 38, color: silver(0.5),
          }}>
            +
          </div>
        )}

        <div style={{ fontSize: 12, color: silver(0.6), letterSpacing: 0.4, textAlign: 'center' }}>
          {tespitEdiliyor
            ? 'Yüz tespit ediliyor, kompozisyona göre kırpılıyor…'
            : 'Vesikalık (3:4) — yüz tespit edilirse otomatik olarak yüze odaklanır.'}
        </div>

        <Button
          icon={<CameraOutlined />}
          onClick={() => fileInputRef.current?.click()}
          disabled={yukleniyor || tespitEdiliyor}
          loading={tespitEdiliyor}
          aria-label={onizleme ? 'Yeni foto seç' : 'Foto seç'}
        >
          {onizleme ? 'Yeni foto seç' : 'Foto seç'}
        </Button>

        {/* Mevcut foto varsa yüz odaklı yeniden işleme butonu — eski fotolar
            için tek tıkla migration. Yeni foto seçilmediyse görünür. */}
        {aktifKullanici?.profilFotoUrl && !yeniFoto && (
          <Button
            icon={<AimOutlined />}
            onClick={mevcudunuYenidenIsle}
            disabled={yukleniyor || tespitEdiliyor}
            type="dashed"
          >
            Yüz Odaklı Yeniden İşle
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          onChange={fotoSec}
          style={{ display: 'none' }}
        />
      </div>
    </Modal>
  );
}
