/**
 * MailComposeModal — uygulama içi Outlook-benzeri yeni e-posta penceresi.
 *
 * Tasarım kuralları:
 *   • İmza/selamlama/kapanış KİLİTLİ (contenteditable=false) — kullanıcı yanlışlıkla
 *     bozamaz, her teklifte birebir aynı görünür.
 *   • Sadece ORTA paragraf editlenebilir (mesajın değişebilen kısmı).
 *   • HTML email-safe: table-tabanlı layout, inline CSS, sabit pixel ölçüleri.
 *     Outlook Desktop / Gmail / Apple Mail / mobil — her platformda aynı render.
 *   • Modal'da gördüğün HTML = SMTP'ye giden HTML (birebir, yan-yan farkı yok).
 *   • PDF eki tıklanınca yeni sekmede açılır (kontrol kolaylığı).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as AntdApp, Modal, Input, Button, Space, Spin, Select } from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  FilePdfOutlined,
  CloseOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { api } from '../services/apiClient';
import { useColors } from '../hooks/useColors';
import { formatPhone } from '../utils/phone';
import type { Teklif } from '../types';
import type { Firma } from '../types';
import type { Kullanici } from '../types/kullanici';

const LOGO_CID = 'firma-logo';
const EMAIL_FONT_STACK = 'Arial, Helvetica, sans-serif';
const EMAIL_TEXT_COLOR = '#1e293b';
const EMAIL_MUTED = '#64748b';
const EMAIL_ACCENT = '#1A2B42';
const EMAIL_FAINT = '#94a3b8';
const EMAIL_DIVIDER = '#e2e8f0';

/** Firma-bazlı bayilik marka logoları. Önem sırasına göre dizilir; imza altına
 *  küçük gri/yuva tonunda tek satır halinde işlenir. Logolar public/markalar/
 *  altında PNG olarak duruyor; mail'e CID attachment olarak embed edilir.
 *
 *  height alanı: her markanın render yüksekliği. Wordmark yazısının görsel
 *  olarak eşit görünmesi için ayarlandı — tek satır wordmark 16px, 2-satır
 *  wordmark daha büyük, kaligrafik Danfoss biraz daha yüksek. */
interface PartnerBrand {
  name: string;
  file: string;
  height: number;
}
// Tek satır wordmark'lar (SMC/SICK/Lenze/Eaton) AYNI yükseklikte — sembol/dalga
// olsa bile dikey trim ile yazı sınırına çekildiği için harfler eşit görünür.
// Çoklu satır veya kaligrafik olanlar (Danfoss/Phoenix/Schneider) doğaları gereği
// daha büyük image height ister.
// Hedef: WORDMARK TEXT (harfler) görsel olarak ~10 px yüksek. Her image'in içinde
// wordmark text farklı oranda yer kapladığı için image render höhösü farklı.
// Image içindeki simge/sembol/dekorasyonlar buna ayak uydursun — büyük olabilir.
//   SMC (330×106):     wave + text birlikte → text ~80% image → image 12
//   SICK (330×85):     sade text → ~95% image → image 11
//   Danfoss (330×138): script + flourishes → text body ~60% → image 17
//   Lenze (330×105):   sade text → ~85% → image 12
//   Eaton (330×91):    sade text → ~95% → image 11
//   Phoenix Contact (330×94): DIN sembolü + 2-satır text → image 22
//   Schneider Electric (330×100): S sembolü + 2-satır text → image 22
const PARTNER_BRANDS: Record<string, PartnerBrand[]> = {
  meba: [
    { name: 'SMC',     file: 'smc.png',     height: 30 },
    { name: 'SICK',    file: 'sick.png',    height: 22 },
    { name: 'Danfoss', file: 'danfoss.png', height: 34 },
    { name: 'Lenze',   file: 'lenze.png',   height: 22 },
  ],
  mesa: [
    { name: 'Danfoss',            file: 'danfoss.png',         height: 38 },
    { name: 'Lenze',              file: 'lenze.png',           height: 22 },
    { name: 'SICK',               file: 'sick.png',            height: 22 },
    { name: 'Eaton',              file: 'eaton.png',           height: 22 },
    { name: 'Phoenix Contact',    file: 'phoenix-contact.png', height: 22 },
    { name: 'Schneider Electric', file: 'schneider.png',       height: 22 },
  ],
  elmos: [
    { name: 'Lenze',              file: 'lenze.png',           height: 22 },
    { name: 'SICK',               file: 'sick.png',            height: 22 },
    { name: 'Danfoss',            file: 'danfoss.png',         height: 38 },
    { name: 'Eaton',              file: 'eaton.png',           height: 22 },
    { name: 'Phoenix Contact',    file: 'phoenix-contact.png', height: 22 },
    { name: 'Schneider Electric', file: 'schneider.png',       height: 22 },
  ],
};

export interface MailComposeContext {
  teklif: Teklif;
  firma: Firma | null;
  kullanici: Kullanici | null;
  pdfBlob: Blob;
  pdfFileName: string;
  defaultTo?: string;
}

interface Props {
  open: boolean;
  context: MailComposeContext | null;
  onClose: () => void;
  onSent: (info: { messageId?: string; sentSyncOk: boolean; sentMailbox?: string | null }) => void;
  /** "Mail ayarlarımı değiştir" linkine tıklanırsa parent set/swap işlemini yapar. */
  onReconfigure?: () => void;
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function htmlEscape(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function normalize(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

/** Slogan formatlayıcı — her öğe leading "· " bullet ile:
 *   • 1 öğe veya ayraçsız → düz metin
 *   • 2 öğe → "· item1 · item2" tek satır
 *   • 3 öğe → "· item1 · item2" / "· item3" iki satır
 *   • 4+ öğe → her birisi "· item" şeklinde kendi satırında */
function formatSlogan(s: string): string {
  const items = s.split(/\s*·\s*/).map((t) => t.trim()).filter(Boolean);
  if (items.length < 2) return htmlEscape(s);
  if (items.length === 2) return '· ' + htmlEscape(items[0]) + ' · ' + htmlEscape(items[1]);
  if (items.length === 3) return '· ' + htmlEscape(items[0]) + ' · ' + htmlEscape(items[1]) + '<br>· ' + htmlEscape(items[2]);
  return items.map((i) => '· ' + htmlEscape(i)).join('<br>');
}

/** Parantez içi grupları (örn. "(Master Of Science)", "(No: 2605-318)") satır
 *  kırılırken bölünmesin diye nowrap span ile sarmalar. htmlEscape SONRASI
 *  çağrılır (escaped text üzerinde çalışır). */
function protectParens(escapedHtml: string): string {
  return escapedHtml.replace(/\([^()]*\)/g, (m) => `<span style="white-space:nowrap;">${m}</span>`);
}

/** "Dul kelime" (widow) önleme: uzun bir metnin son kelimesini bir öncekiyle
 *  non-breaking space (U+00A0) ile birleştirir. Böylece "...Ltd. Şti." şeklinde
 *  iki kelime tek başına alta düşemez, son kelime önceki ile aynı satırda kalır.
 *  3+ kelime varsa uygulanır; aksi halde metin zaten kısa, gerek yok. */
function noWidow(s: string): string {
  const parts = s.split(' ');
  if (parts.length < 3) return s;
  parts[parts.length - 2] = parts[parts.length - 2] + ' ' + parts[parts.length - 1];
  parts.pop();
  return parts.join(' ');
}

/** Türkçe-doğru baş harf büyütme: "ahmet aydın" → "Ahmet Aydın".
 *  İlk karakter `i` ise `İ` olur (özel Türkçe kuralı). */
function capitalizeTr(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      const first = w.charAt(0);
      const firstUpper = first === 'i' ? 'İ' : first.toLocaleUpperCase('tr-TR');
      return firstUpper + w.slice(1).toLocaleLowerCase('tr-TR');
    })
    .join(' ');
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Dosya okunamadı.'));
        return;
      }
      const i = reader.result.indexOf(',');
      resolve(i >= 0 ? reader.result.slice(i + 1) : reader.result);
    };
    reader.onerror = () => reject(new Error('Dosya base64 dönüşümü başarısız.'));
    reader.readAsDataURL(blob);
  });
}

async function fetchLogoAsBase64(logoPath: string | undefined | null): Promise<{ base64: string; contentType: string } | null> {
  if (!logoPath) return null;
  try {
    const res = await fetch(logoPath);
    if (!res.ok) return null;
    const blob = await res.blob();
    const base64 = await blobToBase64(blob);
    return { base64, contentType: blob.type || 'image/png' };
  } catch {
    return null;
  }
}

// ── Email-safe HTML builders ──────────────────────────────────────────────────

/** Tek email-safe HTML üretici: greeting + message + closing + signature.
 *  Modal'da preview için de, gönderimde body olarak da bu fonksiyon kullanılır.
 *  Table-bazlı, inline CSS, Outlook/Gmail/Apple Mail/mobil hepsinde aynı render. */
function buildBodyHtml(opts: {
  greetingText: string;
  messageText: string;
  closingText: string;
  hazirlayanAdSoyad: string;
  hazirlayanUnvan: string;
  firmaKisaAd: string;
  firmaAd: string;
  firmaSlogan: string;
  telefon: string;
  eposta: string;
  web: string;
  adres: string;
  /** Preview'da data URL, gönderimde cid:firma-logo. */
  logoSrc: string;
  /** Partner brand logos — imzanın altında küçük şerit. Her birinde:
   *   • name: alt text
   *   • src: preview için data:URL veya local /markalar/ path; gönderimde cid:partner-X
   *   • height: render yüksekliği (wordmark yazısı görsel olarak eşitlensin diye) */
  partnerLogos?: Array<{ name: string; src: string; height: number }>;
  /** Go Green rozeti — sağ alt köşede recycle üçgeni resmi. */
  goGreenSrc?: string;
  /** Locked zone'ları işaretlemek için: modal contenteditable içinde sadece
   *  mesaj editlenebilir, diğerleri contenteditable="false". Gönderim öncesi
   *  bu attribute strip edilir. */
  forEditor?: boolean;
}): string {
  const {
    greetingText, messageText, closingText,
    hazirlayanAdSoyad, hazirlayanUnvan,
    firmaKisaAd, firmaAd, firmaSlogan,
    telefon, eposta, web, adres,
    logoSrc, partnerLogos, goGreenSrc, forEditor,
  } = opts;

  // Editor modunda SADECE mesaj td'si contenteditable=true; outer wrapper React'te
  // contentEditable false bırakılır (read-only parent), sadece mesaj zonu editlenir.
  // Bu yaklaşım table cell'lerinde contenteditable davranışını tarayıcılar arası
  // tutarsız yapan kenar durumları temizler.
  const editableAttr = forEditor ? ' contenteditable="true"' : '';
  // Editor modunda mesaj zonunu görsel olarak da işaretle (focus halinde kenarlık)
  const messageEditorStyle = forEditor
    ? ';outline:none;min-height:48px;cursor:text;'
    : '';

  // Selamlama paragrafı (locked) — sağ tarafında Go Green badge yan yana,
  // selamlama satırı yüksekliğinde küçük (30 px). Row toplam yüksekliği artmaz,
  // greeting altındaki boşluk normalde olduğu gibi 10 px kalır.
  const greetingHtml = `
<tr>
  <td style="padding:0 0 10px 0;font-family:${EMAIL_FONT_STACK};font-size:13.5px;color:${EMAIL_TEXT_COLOR};line-height:1.55;vertical-align:middle;">${htmlEscape(greetingText)}</td>
  ${goGreenSrc ? `<td valign="middle" align="right" style="padding:0;line-height:0;font-size:0;width:35px;"><img src="${goGreenSrc}" alt="Go Green" width="30" height="48" style="display:inline-block;height:48px;width:30px;border:0;margin-top:-26px;margin-bottom:-15px;margin-right:-51px;"></td>` : ''}
</tr>`;

  // Mesaj paragrafı (EDITABLE) — yalnız bu zon editlenebilir; colspan=2 çünkü
  // greeting row 2 sütunlu (sağında Go Green badge var). Parantez içi gruplar
  // ("(No: 2605-318)" gibi) satır kırılırken bölünmesin diye nowrap'lenir.
  const messageHtml = `
<tr><td colspan="2" style="padding:0 0 10px 0;font-family:${EMAIL_FONT_STACK};font-size:13.5px;color:${EMAIL_TEXT_COLOR};line-height:1.55${messageEditorStyle}" data-mail-message${editableAttr}>${protectParens(htmlEscape(messageText)).replace(/\n/g, '<br>')}</td></tr>`;

  // Kapanış (locked)
  const closingHtml = `
<tr><td colspan="2" style="padding:0 0 14px 0;font-family:${EMAIL_FONT_STACK};font-size:13.5px;color:${EMAIL_TEXT_COLOR};line-height:1.55;">${htmlEscape(closingText)}</td></tr>`;

  // İmza tablosu (locked) — KOMPAKT versiyon
  // YENİ DÜZEN:
  //   Sol kolon (logo, 140px):  logo + altında slogan (italic, dar)
  //   Sağ kolon (445px):         hazırlayan · ünvan / firma adı / iletişim /
  //                              adres / yetkili bayi + partner logoları
  // Slogan logoyla aynı kolonda → görsel olarak logo+marka kimliği bir bütün.
  // Partner logoları sağ kolonun altında → adres ile yetki bilgisi yan yana.
  // Slogan: tek satırda kalırsa öyle, sığmazsa "·" hep öğe başında kalacak
  // şekilde 2-3 satıra düzgün kırılır. 140px logo kolonu altında, italic.
  const sloganUnderLogoHtml = (logoSrc && firmaSlogan)
    ? `<div style="font-family:${EMAIL_FONT_STACK};font-size:8.5px;color:${EMAIL_FAINT};font-style:italic;line-height:1.25;margin:4px 0 0 0;text-align:center;letter-spacing:0.03em;">${formatSlogan(firmaSlogan)}</div>`
    : '';
  // Logo cell genişlik = 140 image + 18 right padding = 158
  // Right cell genişlik = 600 - 158 = 442
  // Çizginin solunda 18 px (logo cell right padding), sağında 18 px (inner div
  // padding-left) → 36 px eşit dağılmış boşluk içinde 1 px çizgi.
  const logoCell = logoSrc
    ? `<td valign="top" align="center" width="158" style="width:158px;padding:0 18px 0 0;text-align:center;"><img src="${logoSrc}" width="140" alt="${htmlEscape(firmaKisaAd)}" style="display:block;width:140px;height:auto;border:0;margin:0 auto;">${sloganUnderLogoHtml}</td>`
    : '';
  const textCellWidth = logoSrc ? 442 : 600;
  const dividerWrapStyle = logoSrc
    ? `border-left:1px solid #c8d0db;padding-left:18px;`
    : '';
  const wrapStyle = 'word-wrap:break-word;overflow-wrap:break-word;word-break:normal;';

  // noWidow: uzun text'lerin son kelimesi tek başına alta düşmesin
  // protectParens: parantez içi gruplar satır kırılırken bölünmesin
  const titleLine = hazirlayanAdSoyad
    ? `<div style="font-family:${EMAIL_FONT_STACK};font-size:12.5px;font-weight:700;color:${EMAIL_ACCENT};line-height:1.25;margin:0 0 1px 0;${wrapStyle}">${htmlEscape(hazirlayanAdSoyad)}${hazirlayanUnvan ? `<span style="font-weight:400;color:${EMAIL_MUTED};font-size:11px;"> &nbsp;·&nbsp; ${protectParens(htmlEscape(noWidow(hazirlayanUnvan)))}</span>` : ''}</div>`
    : '';
  // Firma adı: "Mühendislik" kelimesi geçiyorsa ondan sonra zorla satır kır
  // (MEBA: "...Elektronik Mühendislik / San. Tic. Ltd. Şti.";
  //  MESA: "...Elektronik Mühendislik / Danışmanlık Makine San. ve Tic. Ltd. Şti.")
  const firmaAdRendered = protectParens(htmlEscape(noWidow(firmaAd))).replace(/Mühendislik /g, 'Mühendislik<br>');
  const firmaLine = firmaAd
    ? `<div style="font-family:${EMAIL_FONT_STACK};font-size:10.5px;color:${EMAIL_MUTED};line-height:1.35;margin:0 0 6px 0;${wrapStyle}">${firmaAdRendered}</div>`
    : '';
  // Slogan artık logo altında — sağ kolonda tekrar göstermiyoruz
  const sloganLine = '';

  // İletişim öğeleri — her birinin içinde `&nbsp;` ile "T 0352..." gibi etiket+değer
  // grubu birlikte kalır (orta yerden bölünmez). İkisi arası ayraç olarak ise
  // NORMAL space + ortada noktalı separator + NORMAL space kullanıyoruz; bu sayede
  // satır darsa öğeler arasından kırılıp alta geçer.
  // Sembol etiketler — A4 ile uyumlu, harf yerine ikon görünümlü unicode glyphs
  const iletisimItems = [
    telefon ? `<span style="white-space:nowrap;"><span style="color:${EMAIL_FAINT};font-size:13px;">☎</span>&nbsp;${htmlEscape(telefon)}</span>` : '',
    eposta ? `<span style="white-space:nowrap;"><span style="color:${EMAIL_FAINT};font-size:12px;">✉</span>&nbsp;${htmlEscape(eposta)}</span>` : '',
    web ? `<span style="white-space:nowrap;"><span style="color:${EMAIL_FAINT};font-size:12px;">🌐</span>&nbsp;${htmlEscape(web)}</span>` : '',
  ].filter(Boolean).join(' <span style="color:' + EMAIL_FAINT + ';">·</span> ');
  const iletisimLine = iletisimItems
    ? `<div style="font-family:${EMAIL_FONT_STACK};font-size:11px;color:#334155;line-height:1.6;margin:0;${wrapStyle}">${iletisimItems}</div>`
    : '';
  const adresLine = adres
    ? `<div style="font-family:${EMAIL_FONT_STACK};font-size:10px;color:${EMAIL_FAINT};line-height:1.35;margin:3px 0 0 0;${wrapStyle}">${protectParens(htmlEscape(noWidow(adres)))}</div>`
    : '';

  // Bayilik markaları — adresin hemen altına, sağ kolonun içinde.
  // Kompakt: küçük logolar + tek hücreli inline etiket. valign=middle ile
  // logo yükseklikleri farklı olsa bile satırın orta hattına hizalı.
  // Logolar arası gap default 11px, ama Danfoss gibi kaligrafik/dekoratif
  // markalar görsel olarak daha geniş alan kaplıyor (flourish'leri yan tarafa
  // uzanıyor). Onların komşu cell'lerinde gap'i kompanze ederek 6px yaparız;
  // böylece optik olarak diğer aralıklarla eşit görünür.
  const FLOURISH_BRANDS = new Set(['Danfoss']);

  // ── İmza tablosu: sol logo+slogan, sağ hazırlayan+firma+iletişim+adres ──
  const signatureHtml = `
<tr><td colspan="2" style="padding:0;border-top:1px solid ${EMAIL_DIVIDER};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;table-layout:fixed;margin:10px 0 0 0;">
    <tr>
      ${logoCell}
      <td valign="top" width="${textCellWidth}" style="width:${textCellWidth}px;padding:0;${wrapStyle}">
        <div style="${dividerWrapStyle}${wrapStyle}">
          ${titleLine}
          ${firmaLine}
          ${sloganLine}
          ${adresLine}
          ${iletisimLine}
        </div>
      </td>
    </tr>
  </table>
</td></tr>`;

  // ── YETKİLİ BÖLGE BAYİLİKLERİ footer'ı ──
  // İmzanın altında ayrı bant: ince gri ayraç çizgisi ile imzadan ayrılır,
  // tüm 600 px genişliği kullanır, etiket + logo şeridi yan yana.
  // Bu kısım imzanın bir parçası değil — markalar arası bağımsız bir
  // "kimlik bandı" gibi davranıyor.
  // Partner şeridi yapı: etiket sol sabit hücre + logo grubu kalan alanda ortalı.
  // Bu sayede logolar "etiket ile çerçevenin sağ kenarı arasında" merkez hizalı durur.
  const partnerFooterHtml = (partnerLogos && partnerLogos.length > 0)
    ? `<tr><td colspan="2" style="padding:2px 0 0 0;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border-top:1px solid #eef1f5;width:100%;">
    <tr><td style="padding:6px 0 0 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;width:100%;">
        <tr>
          <td valign="middle" align="center" width="130" style="width:130px;padding:0;font-family:${EMAIL_FONT_STACK};font-size:7.5px;letter-spacing:0.16em;color:#6b7a8f;text-transform:uppercase;line-height:1.35;font-weight:500;white-space:nowrap;text-align:center;">Yetkili Bölge<br>Bayilikleri</td>
          <td valign="middle" align="center" style="text-align:center;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="border-collapse:collapse;margin:0 auto;">
              <tr>
                ${partnerLogos.map((p, i) => {
                  const isLast = i === partnerLogos.length - 1;
                  const next = partnerLogos[i + 1];
                  const beforeFlourish = !isLast && next && FLOURISH_BRANDS.has(next.name);
                  const gap = isLast ? 0 : (beforeFlourish ? 4 : 10);
                  return `<td valign="middle" style="padding:0 ${gap}px 0 0;line-height:0;font-size:0;"><img src="${p.src}" alt="${htmlEscape(p.name)}" height="${p.height}" style="display:block;height:${p.height}px;width:auto;opacity:0.65;border:0;"></td>`;
                }).join('')}
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</td></tr>`
    : '';

  // "Go Green" rozeti — sağ alt köşede, badge kendi "GO GREEN" yazısını
  // içerdiği için yanına ayrı text gerekmiyor. CID embed ile mail'e gömülür
  // (gönderimde data: URL → cid:go-green).
  // Go Green badge artık ayrı satır değil — selamlama satırının sağ tarafında
  // yan yana duruyor (greetingHtml içinde). Burada ayrı bir HTML üretmeye gerek
  // yok.

  // Outer email wrapper — bulletproof email template (kompakt padding)
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;background:#ffffff;">
<tr><td align="left" style="padding:20px 24px 6px 24px;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="border-collapse:collapse;max-width:600px;width:100%;">
    ${greetingHtml}
    ${messageHtml}
    ${closingHtml}
    ${signatureHtml}
    ${partnerFooterHtml}
  </table>
</td></tr>
</table>`;
}

/** Editor için inşa edilen HTML'i gönderim öncesi temizler:
 *   • contenteditable attribute'larını siler (email client'ları gerek duymaz)
 *   • Firma logo: ana logodaki data: URL → cid:firma-logo
 *   • Partner logos: alt text bazlı sıralı eşleştirme ile cid:partner-X'e çevir */
function sanitizeForSend(
  html: string,
  partnerLogos: Array<{ cid: string; name: string }>,
): string {
  let result = html.replace(/\s*contenteditable="(true|false)"/g, '');
  // Her <img src="data:..."> alt text'e göre eşlenir:
  //   • alt partnerLogos[].name ile eşleşirse → cid:partner-X (veya cid:go-green)
  //   • Aksi halde firma logosu varsayılır → cid:firma-logo
  // Önemli: pozisyon bazlı eşleştirme YANLIŞ — template'de greeting row'daki
  // Go Green badge ilk image olduğu için "1. img = firma-logo" varsayımı
  // Go Green'in yerine MEBA logosunun render edilmesine yol açıyordu.
  result = result.replace(/<img([^>]*?)src="data:[^"]+"([^>]*)>/gi, (match, pre, post) => {
    const altMatch = match.match(/alt="([^"]+)"/i);
    const altText = altMatch ? altMatch[1] : '';
    const partner = partnerLogos.find((p) => p.name === altText);
    if (partner) {
      return `<img${pre}src="cid:${partner.cid}"${post}>`;
    }
    // Bilinmiyorsa firma logosu kabul et (signature'daki ana logo)
    return `<img${pre}src="cid:${LOGO_CID}"${post}>`;
  });
  return result;
}

// ── React component ──────────────────────────────────────────────────────────

export function MailComposeModal({ open, context, onClose, onSent, onReconfigure }: Props) {
  const C = useColors();
  const { message } = AntdApp.useApp();
  // Alıcı alanları artık tag listesi (chip pattern) — kullanıcı seçim yapar
  // veya yeni mail yazar; her email bir chip olur.
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  // Autocomplete önerileri için aktif firma personelinin mail listesi
  const [recipientSuggestions, setRecipientSuggestions] = useState<Array<{ value: string; label: string }>>([]);
  const [subject, setSubject] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [logoData, setLogoData] = useState<{ base64: string; contentType: string } | null>(null);
  // Go Green rozeti (recycle üçgeni) — sağ alt köşede CID attachment olarak gömülür
  const [goGreenLogo, setGoGreenLogo] = useState<{ base64: string; contentType: string } | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  // Partner brand logoları (base64 + cid). Firma'ya göre PARTNER_BRANDS'tan
  // çekilip /markalar/X.png'den yüklenir; preview'da data: URL, gönderimde cid.
  const [partnerLogosData, setPartnerLogosData] = useState<Array<{
    cid: string;
    name: string;
    base64: string;
    contentType: string;
    height: number;
  }>>([]);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [smtpInfo, setSmtpInfo] = useState<{ fromName: string | null; fromAddress: string | null; user: string | null } | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Template değerleri — context + smtp ayarlarından hesaplanır
  const tpl = useMemo(() => {
    if (!context) return null;
    const t = context.teklif;
    const f = context.firma;
    const k = context.kullanici;

    // Türkçe-doğru hitap: cari yetkili adında küçük harfle başlayanları (örn. "ahmet") düzelt
    const kisi = capitalizeTr(normalize(t.contactName));
    const title = t.contactTitle === 'HANIM' ? 'Hanım' : 'Bey';
    const greetingText = kisi ? `Sayın ${kisi} ${title},` : 'Sayın İlgili,';

    const cariAdi = normalize(t.cari?.firmaAdi);
    const teklifNo = t.teklifNo || '';
    const messageText = `${cariAdi ? cariAdi + ' için hazırladığımız teklif belgemiz' : 'Teklif belgemiz'}${teklifNo ? ' (No: ' + teklifNo + ')' : ''} ekte yer almaktadır. Herhangi bir sorunuz olması durumunda lütfen bizimle iletişime geçiniz.`;
    const closingText = 'Saygılarımızla,';

    // İmza HER ZAMAN aktif kullanıcının (mail'i gönderen kişinin) adını/unvanını
    // gösterir — teklifi orijinal kimin hazırladığından bağımsız. Aktif kullanıcı
    // bilgisi yoksa son çare olarak teklifteki hazırlayan bilgisine düşülür.
    const hazirlayanAdSoyad = normalize(k?.adSoyad || t.hazirlayanAdSoyad);
    const hazirlayanUnvan = normalize(k?.unvan || t.hazirlayanUnvan);
    const firmaKisaAd = normalize(f?.kisaAd) || 'MEBA';
    const firmaAd = normalize(f?.ad);
    const firmaSlogan = normalize(f?.slogan);
    // İletişim bilgileri — KİŞİSEL: cep telefonu + kurumsal mail (oturum açan kullanıcının)
    //   ☎ = kullanıcının kendi cep no'su (Personel sayfasından, A4 formatında)
    //   ✉ = kullanıcının kurumsal maili (SMTP fromAddress veya user)
    //   🌐 = firma web sitesi (firma kimliği)
    //   Adres = firma adresi (firma kimliği)
    const rawTelefon = normalize(k?.telefon);
    const telefon = rawTelefon ? formatPhone(rawTelefon) : '';
    const eposta = normalize(smtpInfo?.fromAddress || smtpInfo?.user);
    const web = normalize(f?.web);
    const adres = normalize(f?.adres);

    const subj = teklifNo ? `${firmaKisaAd} Teklif Belgesi - ${teklifNo}` : `${firmaKisaAd} Teklif Belgesi`;
    const fromDisplay = smtpInfo?.fromName || k?.adSoyad || '';
    const fromAddress = smtpInfo?.fromAddress || smtpInfo?.user || '';

    return {
      greetingText, messageText, closingText,
      hazirlayanAdSoyad, hazirlayanUnvan,
      firmaKisaAd, firmaAd, firmaSlogan,
      telefon, eposta, web, adres,
      subj, fromDisplay, fromAddress,
    };
  }, [context, smtpInfo]);

  // Açılışta state'i ön-doldur + logo yükle + SMTP info çek + personel önerileri
  useEffect(() => {
    if (!open || !context) return;
    setTo(context.defaultTo ? [context.defaultTo] : []);
    setCc([]);
    setBcc([]);
    // Müşteri (cari) maili zaten Kime alanında chip olarak hazır;
    // ayrıca dropdown önerisi gerekmiyor → liste boş tutulur.
    setRecipientSuggestions([]);
    const teklifNo = context.teklif.teklifNo || '';
    const kisaAd = normalize(context.firma?.kisaAd) || 'MEBA';
    setSubject(teklifNo ? `${kisaAd} Teklif Belgesi - ${teklifNo}` : `${kisaAd} Teklif Belgesi`);
    setShowCcBcc(false);
    setLogoData(null);
    setGoGreenLogo(null);
    setPartnerLogosData([]);
    setLogoLoading(true);
    void (async () => {
      const firmaId = context.firma?.id || '';
      const partnerList: PartnerBrand[] = PARTNER_BRANDS[firmaId] || [];
      const [logo, ayarlar, goGreen, ...partners] = await Promise.all([
        fetchLogoAsBase64(context.firma?.logoPath),
        api.auth.smtpAyarlar().catch(() => null),
        fetchLogoAsBase64('/markalar/go-green.png'),
        ...partnerList.map((p) => fetchLogoAsBase64(`/markalar/${p.file}`)),
      ]);
      setLogoData(logo);
      setGoGreenLogo(goGreen);
      // Eksik logoları sessizce skip (dosya yoksa null döner)
      const loadedPartners = partnerList
        .map((p, i) => {
          const data = partners[i];
          if (!data) return null;
          return {
            cid: `partner-${p.file.replace(/\.[^.]+$/, '')}`,
            name: p.name,
            base64: data.base64,
            contentType: data.contentType,
            height: p.height,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      setPartnerLogosData(loadedPartners);
      if (ayarlar) {
        setSmtpInfo((prev) => {
          if (
            prev &&
            prev.fromName === ayarlar.smtpFromName &&
            prev.fromAddress === ayarlar.smtpFromAddress &&
            prev.user === ayarlar.smtpUser
          ) return prev;
          return {
            fromName: ayarlar.smtpFromName,
            fromAddress: ayarlar.smtpFromAddress,
            user: ayarlar.smtpUser,
          };
        });
      }
      setLogoLoading(false);
    })();
  }, [open, context]);

  // PDF blob'unun URL'ini oluştur (chip'i tıklanır yapar). Modal kapanınca revoke.
  useEffect(() => {
    if (!open || !context?.pdfBlob) {
      setPdfUrl(null);
      return;
    }
    const url = URL.createObjectURL(context.pdfBlob);
    setPdfUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, context]);

  // Editor içeriğini doldur (tek seferlik — kullanıcı yazımını ezmeyelim)
  useEffect(() => {
    if (!open || !tpl || !editorRef.current) return;
    const logoSrc = logoData ? `data:${logoData.contentType};base64,${logoData.base64}` : '';
    const partnerLogosForPreview = partnerLogosData.map((p) => ({
      name: p.name,
      src: `data:${p.contentType};base64,${p.base64}`,
      height: p.height,
    }));
    const goGreenSrc = goGreenLogo ? `data:${goGreenLogo.contentType};base64,${goGreenLogo.base64}` : '';
    editorRef.current.innerHTML = buildBodyHtml({
      greetingText: tpl.greetingText,
      messageText: tpl.messageText,
      closingText: tpl.closingText,
      hazirlayanAdSoyad: tpl.hazirlayanAdSoyad,
      hazirlayanUnvan: tpl.hazirlayanUnvan,
      firmaKisaAd: tpl.firmaKisaAd,
      firmaAd: tpl.firmaAd,
      firmaSlogan: tpl.firmaSlogan,
      telefon: tpl.telefon,
      eposta: tpl.eposta,
      web: tpl.web,
      adres: tpl.adres,
      logoSrc,
      partnerLogos: partnerLogosForPreview,
      goGreenSrc,
      forEditor: true,
    });
  }, [open, tpl, logoData, partnerLogosData, goGreenLogo]);

  const handleAcEk = useCallback(() => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  }, [pdfUrl]);

  const handleGonder = useCallback(async () => {
    if (!context || !editorRef.current) return;
    const toList = to.map((s) => s.trim()).filter(Boolean);
    if (toList.length === 0) {
      message.warning('En az bir alıcı e-posta adresi girin.');
      return;
    }
    setGonderiliyor(true);
    try {
      // Sanitize ederken alt-match listesine partner logolarına ek olarak
      // Go Green rozetini de katarız (alt="Go Green" → cid:go-green)
      const sanitizeRefs = [
        ...partnerLogosData.map((p) => ({ cid: p.cid, name: p.name })),
        ...(goGreenLogo ? [{ cid: 'go-green', name: 'Go Green' }] : []),
      ];
      const editorHtml = editorRef.current.innerHTML;
      const bodyHtml = sanitizeForSend(editorHtml, sanitizeRefs);
      const pdfBase64 = await blobToBase64(context.pdfBlob);
      const ccList = cc.map((s) => s.trim()).filter(Boolean);
      const bccList = bcc.map((s) => s.trim()).filter(Boolean);

      // Backend'e gönderilen attachment listesine partner logoları + Go Green eklenir
      const allCidImages = [
        ...partnerLogosData.map((p) => ({
          cid: p.cid,
          base64: p.base64,
          contentType: p.contentType,
        })),
        ...(goGreenLogo ? [{
          cid: 'go-green',
          base64: goGreenLogo.base64,
          contentType: goGreenLogo.contentType,
        }] : []),
      ];

      const sonuc = await api.teklifEposta.gonder({
        teklifId: context.teklif.id,
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject: subject.trim() || undefined,
        bodyHtml,
        logoBase64: logoData?.base64,
        logoContentType: logoData?.contentType,
        partnerLogos: allCidImages,
        pdfBase64,
      });

      if (!sonuc.ok) {
        message.error('Gönderim başarısız: ' + (sonuc.error || 'bilinmeyen hata'));
        return;
      }
      if (sonuc.sentSyncOk) {
        message.success(`E-posta gönderildi ve "${sonuc.sentMailbox || 'Gönderilmiş Öğeler'}" klasörüne kopyalandı.`);
      } else if (sonuc.sentSyncError) {
        message.warning(`E-posta gönderildi, ama "Gönderilmiş Öğeler" klasörüne yazılamadı: ${sonuc.sentSyncError}`);
      } else {
        message.success('E-posta gönderildi.');
      }
      onSent({
        messageId: sonuc.messageId,
        sentSyncOk: Boolean(sonuc.sentSyncOk),
        sentMailbox: sonuc.sentMailbox ?? null,
      });
      onClose();
    } catch (err) {
      message.error('Gönderim hatası: ' + (err instanceof Error ? err.message : 'bilinmeyen'));
    } finally {
      setGonderiliyor(false);
    }
  }, [context, to, cc, bcc, subject, logoData, onSent, onClose, message]);

  if (!context || !tpl) return null;

  const fromLine = tpl.fromDisplay
    ? `${tpl.fromDisplay}${tpl.fromAddress ? ` <${tpl.fromAddress}>` : ''}`
    : (tpl.fromAddress || '—');

  const pdfSize = (context.pdfBlob.size / 1024).toFixed(0);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnHidden
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size={8}>
            <SendOutlined style={{ color: EMAIL_ACCENT }} />
            <span style={{ fontWeight: 600 }}>Yeni e-posta</span>
          </Space>
          {onReconfigure && (
            <Button size="small" type="text" icon={<SettingOutlined />} onClick={onReconfigure} style={{ color: C.textSecondary, fontSize: 11 }}>
              Mail ayarlarımı değiştir
            </Button>
          )}
        </div>
      }
      styles={{ body: { paddingTop: 4 } }}
    >
      {/* Form alanları — tutarlı satır yüksekliği, hizalı label genişliği */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Gönderen (readonly) */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.borderSubtle}`, padding: '5px 0', fontSize: 12.5, minHeight: 28 }}>
          <span style={{ width: 72, color: C.textSecondary, fontSize: 11.5 }}>Gönderen</span>
          <span style={{ color: C.textPrimary }}>{fromLine}</span>
        </div>

        {/* Kime — Select mode="tags": her email bir chip; autocomplete personel listesinden */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.borderSubtle}`, padding: '2px 0', minHeight: 28 }}>
          <span style={{ width: 72, color: C.textSecondary, fontSize: 11.5 }}>Kime</span>
          <Select
            mode="tags"
            variant="borderless"
            size="small"
            placeholder="Mail adresi yaz veya öneriden seç"
            value={to}
            onChange={(vals) => setTo(vals)}
            options={recipientSuggestions}
            tokenSeparators={[',', ';', ' ']}
            style={{ flex: 1, fontSize: 12.5 }}
            popupMatchSelectWidth={400}
            filterOption={(input, opt) => {
              const t = input.toLowerCase();
              return (opt?.value?.toLowerCase().includes(t) || opt?.label?.toLowerCase().includes(t)) ?? false;
            }}
          />
          {!showCcBcc && (
            <Button size="small" type="text" onClick={() => setShowCcBcc(true)} style={{ color: C.textSecondary, fontSize: 11 }}>
              Bilgi / Gizli
            </Button>
          )}
        </div>

        {showCcBcc && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.borderSubtle}`, padding: '2px 0', minHeight: 28 }}>
              <span style={{ width: 72, color: C.textSecondary, fontSize: 11.5 }}>Bilgi (Cc)</span>
              <Select
                mode="tags"
                variant="borderless"
                size="small"
                placeholder="Kopya gönderilecek mail adresleri"
                value={cc}
                onChange={(vals) => setCc(vals)}
                options={recipientSuggestions}
                tokenSeparators={[',', ';', ' ']}
                style={{ flex: 1, fontSize: 12.5 }}
                popupMatchSelectWidth={400}
                filterOption={(input, opt) => {
                  const t = input.toLowerCase();
                  return (opt?.value?.toLowerCase().includes(t) || opt?.label?.toLowerCase().includes(t)) ?? false;
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.borderSubtle}`, padding: '2px 0', minHeight: 28 }}>
              <span style={{ width: 72, color: C.textSecondary, fontSize: 11.5 }}>Gizli (Bcc)</span>
              <Select
                mode="tags"
                variant="borderless"
                size="small"
                placeholder="Gizli kopya mail adresleri"
                value={bcc}
                onChange={(vals) => setBcc(vals)}
                options={recipientSuggestions}
                tokenSeparators={[',', ';', ' ']}
                style={{ flex: 1, fontSize: 12.5 }}
                popupMatchSelectWidth={400}
                filterOption={(input, opt) => {
                  const t = input.toLowerCase();
                  return (opt?.value?.toLowerCase().includes(t) || opt?.label?.toLowerCase().includes(t)) ?? false;
                }}
              />
            </div>
          </>
        )}

        {/* Konu */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.borderSubtle}`, padding: '2px 0', minHeight: 28 }}>
          <span style={{ width: 72, color: C.textSecondary, fontSize: 11.5 }}>Konu</span>
          <Input variant="borderless" size="small" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ flex: 1, padding: '2px 0', fontSize: 12.5, fontWeight: 600 }} />
        </div>

        {/* Eklenti — tıklanabilir chip, kompakt */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.borderSubtle}`, padding: '5px 0', minHeight: 28 }}>
          <span style={{ width: 72, color: C.textSecondary, fontSize: 11.5 }}>Ek</span>
          <button
            type="button"
            onClick={handleAcEk}
            disabled={!pdfUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 5,
              cursor: pdfUrl ? 'pointer' : 'default',
              fontSize: 11.5,
              color: '#1e293b',
              fontFamily: 'inherit',
            }}
            title="Yeni sekmede aç"
          >
            <FilePdfOutlined style={{ color: '#dc2626', fontSize: 13 }} />
            <span style={{ fontWeight: 600 }}>{context.pdfFileName}</span>
            <span style={{ color: EMAIL_MUTED }}>· {pdfSize} KB</span>
            <PaperClipOutlined style={{ color: EMAIL_FAINT, fontSize: 10 }} />
          </button>
        </div>
      </div>

      {logoLoading && (
        <div style={{ fontSize: 11, color: C.textSecondary, padding: '6px 0 0 0' }}>
          <Spin size="small" /> &nbsp;Logo yükleniyor…
        </div>
      )}

      {/* WYSIWYG preview = gönderilecek HTML.
          Outer div contenteditable=false (read-only); içindeki message <td>
          data-mail-message contenteditable=true — sadece o zon editlenir. */}
      <div
        ref={editorRef}
        style={{
          minHeight: 320,
          maxHeight: 460,
          overflowY: 'auto',
          border: `1px solid ${C.borderSubtle}`,
          borderRadius: 6,
          background: '#ffffff',
          marginTop: 10,
        }}
      />

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
        <span style={{ fontSize: 11, color: C.textSecondary }}>
          Gönderim sonrası Outlook "Gönderilmiş Öğeler" klasörüne kopyalanır.
        </span>
        <Space>
          <Button icon={<CloseOutlined />} onClick={onClose} disabled={gonderiliyor}>İptal</Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={gonderiliyor}
            onClick={handleGonder}
            disabled={to.length === 0 || logoLoading}
          >
            Gönder
          </Button>
        </Space>
      </div>
    </Modal>
  );
}

export default MailComposeModal;
