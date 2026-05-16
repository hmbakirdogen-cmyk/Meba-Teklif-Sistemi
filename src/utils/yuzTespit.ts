/**
 * yuzTespit.ts — Profil fotoğraflarında otomatik yüz odaklı 3:4 vesikalık crop.
 *
 * @vladmandic/face-api'nin TinyFaceDetector modelini kullanır (~190 KB).
 * Model dosyaları `public/face-api-models/` altında lokal, ilk kullanımda
 * bir kez yüklenir, sonraki çağrılarda tarayıcı cache'inde tutulur.
 *
 * Çalışma akışı:
 *   1. Dosya/url → HTMLImageElement
 *   2. Model yüklü değilse arka planda yükle (lazy)
 *   3. detectSingleFace ile yüz bounding box'ı bul
 *   4. Yüz merkezine göre 3:4 portrait crop hesapla (face + headroom + omuz)
 *   5. Yüz bulunamazsa merkez crop fallback (eski davranış)
 *
 * Hassasiyet: TinyFaceDetector ~%85-95 yüz tespit oranı sıralı portreler için
 * yeterli. İnsan yüzü olmayan görseller (peyzaj, logo) fallback'e düşer.
 */

import * as faceapi from '@vladmandic/face-api';

export const VESIKALIK_WIDTH = 240;
export const VESIKALIK_HEIGHT = 320;
const TARGET_AR = VESIKALIK_WIDTH / VESIKALIK_HEIGHT; // 0.75
const MAX_PHOTO_BYTES = 600 * 1024; // 600 KB
const MODEL_URL = '/face-api-models';

let modelLoaded = false;
let modelLoadPromise: Promise<void> | null = null;

/** TinyFaceDetector modelini bir kez yükler (singleton). */
async function modelYukle(): Promise<void> {
  if (modelLoaded) return;
  if (modelLoadPromise) return modelLoadPromise;
  modelLoadPromise = (async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      modelLoaded = true;
    } catch (e) {
      console.warn('[yuzTespit] Model yüklenemedi, merkez crop fallback kullanılacak:', e);
      // modelLoaded false kalır, çağrılar fallback'e düşer
    } finally {
      modelLoadPromise = null;
    }
  })();
  return modelLoadPromise;
}

/** Bir kez başlat — uygulama yükleme sırasında non-blocking. */
export function yuzModeliniArkaPlandaIsit(): void {
  void modelYukle();
}

/** Görüntünün File veya dataURL kaynağından HTMLImageElement üretir. */
function gorselYukle(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // canvas'a yazılabilir olsun
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Görsel yüklenemedi'));
    img.src = src;
  });
}

interface CropKutu {
  sx: number; sy: number; sw: number; sh: number;
}

/**
 * Yüz bounding box'ından 3:4 portrait crop alanı türetir.
 *
 * Headshot kompozisyon kuralları:
 * - Yüz crop'un ÜST YARISINDA olsun (göz hattı %35-40 yüksekliğinde)
 * - Yüz yüksekliği crop yüksekliğinin %40-50'si (close-up portrait)
 * - Yüz yatayda crop merkezine yakın
 * - Görüntü dışına taşma → kenara yapışık
 */
function yuzdenCropHesapla(
  faceBox: { x: number; y: number; width: number; height: number },
  imgW: number,
  imgH: number,
): CropKutu {
  const faceCx = faceBox.x + faceBox.width / 2;
  const faceCy = faceBox.y + faceBox.height / 2;
  const faceH = faceBox.height;

  // Crop yüksekliği — yüz yüksekliğinin ~2.3 katı (yüz + alın + boyun/omuz)
  let cropH = faceH * 2.3;
  let cropW = cropH * TARGET_AR;

  // Görüntü dışına çıkıyorsa crop'u küçült (oranı koruyarak)
  if (cropH > imgH) {
    cropH = imgH;
    cropW = cropH * TARGET_AR;
  }
  if (cropW > imgW) {
    cropW = imgW;
    cropH = cropW / TARGET_AR;
  }

  // Yatayda: yüz merkezi crop merkezi
  let sx = faceCx - cropW / 2;
  // Dikeyde: yüz crop'un üst %40'ında (göz hattı yaklaşık %35-40'ta olur)
  let sy = faceCy - cropH * 0.38;

  // Sınırlara yapıştır
  if (sx < 0) sx = 0;
  if (sy < 0) sy = 0;
  if (sx + cropW > imgW) sx = imgW - cropW;
  if (sy + cropH > imgH) sy = imgH - cropH;

  return {
    sx: Math.round(sx),
    sy: Math.round(sy),
    sw: Math.round(cropW),
    sh: Math.round(cropH),
  };
}

/** Yüz bulunamazsa merkez 3:4 crop (eski davranış). */
function merkezCropHesapla(imgW: number, imgH: number): CropKutu {
  const srcAR = imgW / imgH;
  if (srcAR > TARGET_AR) {
    const sh = imgH;
    const sw = Math.round(sh * TARGET_AR);
    return { sx: Math.round((imgW - sw) / 2), sy: 0, sw, sh };
  } else {
    const sw = imgW;
    const sh = Math.round(sw / TARGET_AR);
    return { sx: 0, sy: Math.round((imgH - sh) / 2), sw, sh };
  }
}

/** Görseli verilen crop kutusuyla 3:4 vesikalık JPEG base64'a çevirir. */
function cropToBase64(img: HTMLImageElement, crop: CropKutu): string {
  const canvas = document.createElement('canvas');
  canvas.width = VESIKALIK_WIDTH;
  canvas.height = VESIKALIK_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context alınamadı');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, VESIKALIK_WIDTH, VESIKALIK_HEIGHT);

  let quality = 0.85;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length * 0.75 > MAX_PHOTO_BYTES && quality > 0.4) {
    quality -= 0.1;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return out;
}

/**
 * Yüz odaklı 3:4 vesikalık crop. Yüz bulunursa onu merkezleyerek, bulunamazsa
 * görselin merkezinden kırpar. Sonuç JPEG base64 (data URL).
 */
export async function gorselToYuzOdakliVesikalik(src: string): Promise<string> {
  const img = await gorselYukle(src);
  await modelYukle();

  let crop: CropKutu;
  if (modelLoaded) {
    try {
      const detection = await faceapi.detectSingleFace(
        img,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }),
      );
      if (detection) {
        crop = yuzdenCropHesapla(detection.box, img.naturalWidth, img.naturalHeight);
      } else {
        // Yüz bulunamadı — merkez crop fallback
        crop = merkezCropHesapla(img.naturalWidth, img.naturalHeight);
      }
    } catch (e) {
      console.warn('[yuzTespit] Tespit hatası, merkez crop fallback:', e);
      crop = merkezCropHesapla(img.naturalWidth, img.naturalHeight);
    }
  } else {
    crop = merkezCropHesapla(img.naturalWidth, img.naturalHeight);
  }

  return cropToBase64(img, crop);
}

/** Dosyadan başlayan akış için file → dataURL → yüz odaklı crop. */
export async function dosyaToYuzOdakliVesikalik(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ''));
    fr.onerror = () => reject(new Error('Dosya okunamadı'));
    fr.readAsDataURL(file);
  });
  return gorselToYuzOdakliVesikalik(dataUrl);
}
