/**
 * ImageItem — A4 sayfasına yerleştirilen serbest görsel.
 * Konum px cinsinden, ilgili sayfanın sol-üstüne göre ölçülür.
 * pageIndex 0-tabanlıdır.
 */
export interface ImageItem {
  id: string;
  src: string;        // dataURL (data:image/...)
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}
