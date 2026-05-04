const { Jimp } = require('jimp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'public', 'logo-meba.png');
const DST = 'C:/Users/Admin/Desktop/MEBA-logo-transparent.png';

Jimp.read(SRC).then(img => {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  console.log(`Boyut: ${w} x ${h}`);

  // Corner rengi (arka plan)
  const data = img.bitmap.data;
  const refR = data[0], refG = data[1], refB = data[2];
  console.log(`Köşe rengi: R=${refR} G=${refG} B=${refB}`);

  // BFS flood-fill — arka planı şeffaf yap
  const TOL = 12;
  const visited = new Uint8Array(w * h);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = y * w + x;
    if (visited[i]) return;
    visited[i] = 1;
    const p = (y * w + x) * 4;
    if (
      Math.abs(data[p]   - refR) <= TOL &&
      Math.abs(data[p+1] - refG) <= TOL &&
      Math.abs(data[p+2] - refB) <= TOL
    ) {
      queue.push([x, y]);
    }
  }

  // 4 kenar boyunca başlat
  for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
  for (let y = 0; y < h; y++) { enqueue(0, y); enqueue(w - 1, y); }

  let qi = 0;
  while (qi < queue.length) {
    const [x, y] = queue[qi++];
    const p = (y * w + x) * 4;
    data[p+3] = 0; // alpha = 0
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
  console.log(`Şeffaf yapılan piksel: ${qi}`);

  // Auto-crop — şeffaf kenarları kırp
  img.autocrop({ tolerance: 0.002, cropOnlyFrames: false });
  console.log(`Kırpıldı: ${img.bitmap.width} x ${img.bitmap.height}`);

  return img.write(DST);
}).then(() => {
  console.log('Kaydedildi: ' + DST);
}).catch(e => console.error(e));
