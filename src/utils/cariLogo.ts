/**
 * Cari logo işlem utility — yüklenen görseli kare (1:1) merkez-crop ile
 * 320x320 pixel'e indirgeyip JPEG base64 döner. ~30-90 KB hedef.
 *
 * Klasör kart kapağında 220–260px civarı kullanılacağı için 320 yeterli;
 * yüksek-DPI ekranda da net çıkar.
 */

const TARGET_SIZE = 320;
const MAX_BYTES = 600 * 1024;

export async function dosyaToCariLogoBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ''));
    fr.onerror = () => reject(new Error('Dosya okunamadı'));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Görsel yüklenemedi'));
    im.src = dataUrl;
  });

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const side = Math.min(srcW, srcH);
  const sx = Math.round((srcW - side) / 2);
  const sy = Math.round((srcH - side) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context alınamadı');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);

  let quality = 0.88;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length * 0.75 > MAX_BYTES && quality > 0.4) {
    quality -= 0.1;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return out;
}
