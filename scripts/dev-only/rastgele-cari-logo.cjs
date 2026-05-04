'use strict';

/**
 * Tüm cariler için "kurumsal görünümlü" rastgele SVG logo üretir.
 * 12 şablon × 12 renk paleti × 2 yazı stili → ~288 unique varyant.
 * Her cari id'sinden hash deterministik atama yapar (aynı cari hep aynı logo).
 *
 * Kullanım:
 *   node scripts/rastgele-cari-logo.cjs           # logosu olmayanlara üretir
 *   node scripts/rastgele-cari-logo.cjs --force   # araştırma sonucu logoları KORUR,
 *                                                  diğer hepsini yeniden üretir
 *
 * "logoSourceDomain" alanı dolu olan cariler (gerçek domain'den çekildi) hep korunur.
 * Manual upload (updatedBy başka bir kullanıcı id) cariler de korunur.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH  = path.join(__dirname, '..', 'server', 'db.json');
const LOGO_DIR = path.join(__dirname, '..', 'public', 'cari-logolari');

const FORCE = process.argv.includes('--force');

// ── Kurumsal renk paletleri ─────────────────────────────────────────────────

const PALETLER = [
  { primary: '#0a2540', accent: '#3b82f6', text: '#f8fafc', label: 'navy' },
  { primary: '#1f2937', accent: '#d97706', text: '#fef3c7', label: 'charcoal-amber' },
  { primary: '#14532d', accent: '#84cc16', text: '#ecfccb', label: 'forest' },
  { primary: '#7f1d1d', accent: '#fbbf24', text: '#fef3c7', label: 'burgundy' },
  { primary: '#115e59', accent: '#06b6d4', text: '#cffafe', label: 'teal' },
  { primary: '#78350f', accent: '#f59e0b', text: '#fef3c7', label: 'gold' },
  { primary: '#334155', accent: '#94a3b8', text: '#f1f5f9', label: 'slate' },
  { primary: '#581c87', accent: '#c084fc', text: '#f3e8ff', label: 'plum' },
  { primary: '#3f6212', accent: '#a3e635', text: '#ecfccb', label: 'olive' },
  { primary: '#7c2d12', accent: '#fb923c', text: '#ffedd5', label: 'rust' },
  { primary: '#312e81', accent: '#818cf8', text: '#e0e7ff', label: 'indigo' },
  { primary: '#18181b', accent: '#a1a1aa', text: '#fafafa', label: 'black' },
  { primary: '#0c4a6e', accent: '#0ea5e9', text: '#e0f2fe', label: 'sky' },
  { primary: '#831843', accent: '#f472b6', text: '#fce7f3', label: 'cherry' },
  { primary: '#365314', accent: '#bef264', text: '#f7fee7', label: 'moss' },
];

// ── Stop-words: monogram için ayırt edici olmayan kelimeler ─────────────────

const STOP_WORDS = new Set([
  'ELEKTRİK', 'ELEKTRIK', 'MEKANİK', 'MEKANIK', 'OTOMASYON', 'MAKİNA', 'MAKİNE', 'MAKINA',
  'TESİSAT', 'TESISAT', 'ENDÜSTRİYEL', 'ENDUSTRIYEL', 'MÜHENDİSLİK', 'MUHENDISLIK',
  'HİDROLİK', 'HIDROLIK', 'PNÖMATİK', 'PNOMATIK', 'TEKNİK', 'TEKNIK', 'KONTROL',
  'PROSES', 'SAN', 'TİC', 'TIC', 'LTD', 'A.Ş.', 'AS', 'ŞTİ', 'STI', 'İNŞ', 'INS',
  'VE', 'SAN.', 'TİC.', 'LTD.', 'A.Ş', 'A.S.', 'GROUP', 'GRUP', 'INC', 'GMBH', 'CO',
  'CO.', 'TİCARET', 'SANAYİ', 'SANAYI', 'TICARET',
]);

function monogram(firmaAdi) {
  const ham = String(firmaAdi || '').toLocaleUpperCase('tr-TR').split(/[\s.,/]+/).filter(Boolean);
  const free = ham.filter((w) => !STOP_WORDS.has(w));
  const src = free.length > 0 ? free : ham;
  if (src.length === 0) return '·';
  if (src.length === 1) return src[0].slice(0, 2);
  return (src[0][0] || '') + (src[1][0] || '');
}

// ── SVG yardımcıları ────────────────────────────────────────────────────────

function letterFontSize(letters) {
  if (letters.length === 1) return 130;
  if (letters.length === 2) return 95;
  return 70;
}

function letterText(letters, color, fontSize, weight = 700, family = "-apple-system, 'SF Pro Display', 'Segoe UI', Inter, system-ui, sans-serif") {
  // dominant-baseline central + slight y nudge for visual centering
  return `<text x="110" y="116" text-anchor="middle" dominant-baseline="middle" ` +
    `font-family="${family}" font-size="${fontSize}" font-weight="${weight}" ` +
    `fill="${color}" letter-spacing="-0.03em">${letters}</text>`;
}

// ── Şablonlar (12 adet) ─────────────────────────────────────────────────────

const SABLONLAR = [
  // 1. Rounded tile
  (l, p) => `<rect width="220" height="220" rx="36" fill="${p.primary}"/>` +
            letterText(l, p.text, letterFontSize(l)),

  // 2. Solid circle
  (l, p) => `<circle cx="110" cy="110" r="100" fill="${p.primary}"/>` +
            letterText(l, p.text, letterFontSize(l)),

  // 3. Ringed circle
  (l, p) => `<circle cx="110" cy="110" r="98" fill="${p.primary}" stroke="${p.accent}" stroke-width="6"/>` +
            `<circle cx="110" cy="110" r="78" fill="none" stroke="${p.text}" stroke-width="1" opacity="0.28"/>` +
            letterText(l, p.text, letterFontSize(l) - 6),

  // 4. Hexagon
  (l, p) => {
    const cx = 110, cy = 110, r = 100;
    const pts = [];
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="${p.primary}"/>` +
           letterText(l, p.text, letterFontSize(l) - 8);
  },

  // 5. Diagonal two-tone
  (l, p) => `<rect width="220" height="220" rx="22" fill="${p.primary}"/>` +
            `<polygon points="0,220 220,0 220,220" fill="${p.accent}" opacity="0.92"/>` +
            letterText(l, p.text, letterFontSize(l)),

  // 6. Shield
  (l, p) => `<path d="M110,8 L200,38 L200,118 Q200,182 110,212 Q20,182 20,118 L20,38 Z" fill="${p.primary}"/>` +
            `<path d="M110,8 L200,38 L200,118 Q200,182 110,212 Q20,182 20,118 L20,38 Z" fill="none" stroke="${p.accent}" stroke-width="3" opacity="0.55"/>` +
            letterText(l, p.text, letterFontSize(l) - 12),

  // 7. Diamond (rotated rounded square)
  (l, p) => `<g transform="rotate(45 110 110)"><rect x="38" y="38" width="144" height="144" rx="14" fill="${p.primary}"/></g>` +
            letterText(l, p.text, letterFontSize(l) - 8),

  // 8. Plus/cross
  (l, p) => `<rect x="78" y="20" width="64" height="180" rx="8" fill="${p.primary}"/>` +
            `<rect x="20" y="78" width="180" height="64" rx="8" fill="${p.primary}"/>` +
            letterText(l, p.accent, letterFontSize(l) - 25),

  // 9. Vertical bars
  (l, p) => `<rect x="0" y="0" width="220" height="220" rx="22" fill="${p.primary}"/>` +
            `<rect x="115" y="0" width="105" height="220" fill="${p.accent}" opacity="0.92"/>` +
            letterText(l, p.text, letterFontSize(l)),

  // 10. Top accent bar
  (l, p) => `<rect width="220" height="220" rx="22" fill="${p.primary}"/>` +
            `<rect x="0" y="0" width="220" height="18" fill="${p.accent}"/>` +
            letterText(l, p.text, letterFontSize(l)),

  // 11. Corner cut tile (modern asymmetric)
  (l, p) => `<path d="M0,0 L220,0 L220,220 L62,220 L0,158 Z" fill="${p.primary}"/>` +
            `<path d="M62,220 L0,158 L0,220 Z" fill="${p.accent}"/>` +
            letterText(l, p.text, letterFontSize(l)),

  // 12. Concentric (banking/luxury)
  (l, p) => `<circle cx="110" cy="110" r="105" fill="${p.primary}"/>` +
            `<circle cx="110" cy="110" r="84" fill="none" stroke="${p.accent}" stroke-width="3" opacity="0.55"/>` +
            `<circle cx="110" cy="110" r="60" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.32"/>` +
            letterText(l, p.text, letterFontSize(l) - 10),
];

// ── Üretici ─────────────────────────────────────────────────────────────────

function logoSVG(cariId, firmaAdi) {
  const h = crypto.createHash('md5').update(String(cariId)).digest();
  const tmpl = SABLONLAR[h[0] % SABLONLAR.length];
  const palet = PALETLER[h[1] % PALETLER.length];
  const letters = monogram(firmaAdi);
  const inner = tmpl(letters, palet);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220">${inner}</svg>`;
}

// ── Ana akış ────────────────────────────────────────────────────────────────

function shouldGenerate(cari, force) {
  // Gerçek domain'den çekilmiş logoyu KORU
  if (cari.logoSourceDomain) return false;
  // Manuel upload (script dışı kullanıcı) ise KORU
  if (cari.updatedBy && !cari.updatedBy.startsWith('script:')) return false;
  // Logo yoksa üret
  if (!cari.logoUrl) return true;
  // Logo varsa, --force varsa yeniden üret (eski seedi yerine geçer)
  return force;
}

function main() {
  if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const now = Date.now();
  const sayim = { uretildi: 0, korundu: 0 };

  for (const cari of db.cariler) {
    if (!shouldGenerate(cari, FORCE)) {
      sayim.korundu += 1;
      continue;
    }
    // Eski dosyaları temizle
    const safeId = String(cari.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    for (const ext of ['svg', 'png', 'jpg', 'jpeg', 'webp', 'ico']) {
      const yol = path.join(LOGO_DIR, `${safeId}.${ext}`);
      try { if (fs.existsSync(yol)) fs.unlinkSync(yol); } catch { /* ignore */ }
    }
    const svg = logoSVG(cari.id, cari.firmaAdi);
    const dosyaAdi = `${safeId}.svg`;
    fs.writeFileSync(path.join(LOGO_DIR, dosyaAdi), svg, 'utf8');
    cari.logoUrl = `/cari-logolari/${dosyaAdi}?v=${now}`;
    cari.logoYuklemeTarihi = new Date().toISOString();
    cari.updatedBy = 'script:rastgele-cari-logo';
    cari.guncellemeTarihi = new Date().toISOString();
    cari.lastSyncedAt = new Date().toISOString();
    sayim.uretildi += 1;
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Üretildi: ${sayim.uretildi} cari logosu`);
  console.log(`Korundu (gerçek/manuel): ${sayim.korundu}`);
  console.log(`Toplam: ${db.cariler.length} cari`);
}

main();
