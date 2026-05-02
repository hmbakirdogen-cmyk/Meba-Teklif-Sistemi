/**
 * Profil fotosu islem utility'leri.
 *
 * VESIKALIK FORMAT — width:height = 3:4 (TR standardi 4.5x6 cm).
 * Sistemde tum profil fotolari bu oranda kirpilir ve saklanir; UI
 * tarafinda da yine 3:4 dik dortgen olarak gosterilir.
 */

/** Vesikalik (3:4) hedef boyutlari — pixel cinsinden, kullanima gore guncellenebilir. */
export const VESIKALIK_WIDTH  = 240;
export const VESIKALIK_HEIGHT = 320;
const TARGET_AR = VESIKALIK_WIDTH / VESIKALIK_HEIGHT; // 0.75

const MAX_PHOTO_BYTES = 600 * 1024; // 600 KB

/**
 * Verilen dosyayi 3:4 vesikalik formatina merkezi crop ile kirpip
 * resize eder, JPEG base64 olarak doner. ~30-90 KB araligi hedefli.
 */
export async function dosyaToVesikalikBase64(file: File): Promise<string> {
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

  // 3:4 merkezi crop hesabi
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const srcAR = srcW / srcH;
  let sx: number, sy: number, sw: number, sh: number;
  if (srcAR > TARGET_AR) {
    // Kaynak hedeften daha genis -> yatayda kirp
    sh = srcH;
    sw = Math.round(sh * TARGET_AR);
    sy = 0;
    sx = Math.round((srcW - sw) / 2);
  } else {
    // Kaynak hedeften daha dar -> dikeyde kirp
    sw = srcW;
    sh = Math.round(sw / TARGET_AR);
    sx = 0;
    sy = Math.round((srcH - sh) / 2);
  }

  const canvas = document.createElement('canvas');
  canvas.width  = VESIKALIK_WIDTH;
  canvas.height = VESIKALIK_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context alinamadi');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, VESIKALIK_WIDTH, VESIKALIK_HEIGHT);

  // JPEG kalite ayarli sikistirma — 600KB altinda kalana kadar dusur
  let quality = 0.85;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length * 0.75 > MAX_PHOTO_BYTES && quality > 0.4) {
    quality -= 0.1;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return out;
}
