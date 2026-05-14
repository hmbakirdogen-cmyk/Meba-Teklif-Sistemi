/**
 * belgeInlineConstants.ts
 * BelgeInlineEditor'ın düzenleme-spesifik sabitleri.
 * Belge tasarım sabitleri teklifDocumentShared.tsx'ten import edilir.
 */

import { OPTICAL_SEPARATOR_COLOR } from '../templates/offerSeparatorTokens';

export const FIELD = {
  activeOutline: '1px solid rgba(37, 99, 235, 0.18)',
  activeBg:      'rgba(237, 242, 251, 0.45)',
  activeText:    '#224E81',
  activeTextSoft:'#4C6C93',
  radius:        '4px',
  transition:    'all 0.15s ease',
  focusLine:     'inset 0 -2px 0 rgba(37, 99, 235, 0.20)',
  caret:         '#0a0f1a',
} as const;

/* ─────────────────────────────────────────────────────────────────
 * AntD v6 class name map (compared to v5):
 *   ant-select-selector          → REMOVED
 *   ant-select-selection-search  → REMOVED
 *   ant-select-selection-search-input → ant-select-input
 *   ant-select-selection-item    → ant-select-content-value (single)
 *   ant-select-selection-placeholder → ant-select-placeholder
 *   ant-input-number-handler-wrap → ant-input-number-actions
 *   ant-input-number-input-wrap  → REMOVED
 * ───────────────────────────────────────────────────────────────── */
export const FIELD_CSS = `
/* ══════════════════════════════════════════════════════════════════════
   TİPOGRAFİ MIRASI — Kural 0
   Tüm AntD bileşenlerinin her iç elementi tablodan font/renk miras alır.
   Hiçbir şeyi browser default'una ya da AntD design token'ına bırakma.
   ══════════════════════════════════════════════════════════════════════ */

/* ─── Kök elemanlar: font token'larını ve CSS değişkenlerini sıfırla ───
   ÖNEMLİ: font shorthand KULLANMA — wrapper'ın React inline style'ından
   gelen fontSize/fontWeight (örn. ROW_TEXT.code: 10.5px / 600) korunmalı.
   Sadece family/style/variant inherit edilir; size + weight inline ile gelir. */
.belge-inline .ant-select,
.belge-inline .ant-input,
.belge-inline .ant-input-number,
.belge-inline .ant-picker {
  --ant-font-size: inherit;
  --ant-font-size-sm: inherit;
  --ant-font-size-lg: inherit;
  --ant-line-height: inherit;
  --ant-font-family: inherit;
  --ant-font-weight: inherit;
  font-family: inherit !important;
  font-style: inherit !important;
  font-variant: inherit !important;
  color: inherit !important;
  letter-spacing: inherit !important;
  text-rendering: geometricPrecision !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ─── Tüm iç input / textarea / seçili değer alanları ─── */
.belge-inline .ant-input,
.belge-inline .ant-input-number-input,
.belge-inline .ant-picker-input > input,
.belge-inline .ant-select-content-value,
.belge-inline .ant-select-selection-item,
.belge-inline textarea.ant-input {
  font: inherit !important;
  color: inherit !important;
  letter-spacing: inherit !important;
  -webkit-font-smoothing: antialiased;
}

/* ─── Search input (ant-select-input): color inherit YASAK —
   parent color:transparent olduğunda text kaybolur.
   Font'un geri kalanı miras alınsın, color AntD CSS var'ından gelsin. ─── */
.belge-inline .ant-select-input {
  font-family: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  font-style: normal !important;
  line-height: inherit !important;
  letter-spacing: inherit !important;
  -webkit-font-smoothing: antialiased;
}

/* ═══ CARET & SEÇİM ═══ */
.belge-inline input,
.belge-inline textarea {
  caret-color: ${FIELD.caret} !important;
}
.belge-inline ::selection {
  background: rgba(37, 99, 235, 0.12);
}

/* ══════════════════════════════════════════════════════════════════════
   PLACEHOLDER — font: inherit + font-style: normal
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .ant-select-placeholder {
  font: inherit !important;
  font-style: normal !important;
  color: #777777 !important;
  opacity: 1 !important;
  inset-inline-start: 0 !important;
  pointer-events: none !important;
}
.belge-inline .ant-input::placeholder,
.belge-inline .ant-input-number-input::placeholder,
.belge-inline .ant-picker-input > input::placeholder,
.belge-inline textarea.ant-input::placeholder {
  font: inherit !important;
  font-style: normal !important;
  color: #777777 !important;
  opacity: 1 !important;
}

/* ══════════════════════════════════════════════════════════════════════
   SELECT: Ghost + boyut kilidi
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .ant-select {
  --ant-select-padding-horizontal: 0px !important;
  --ant-select-padding-vertical: 0px !important;
  --ant-select-border-size: 0px !important;
  --ant-select-border-color: transparent !important;
  --ant-select-background-color: transparent !important;
  padding: 0 !important;
  padding-inline: 0 !important;
  padding-block: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}
.belge-inline .ant-select-content {
  font: inherit !important;
  padding: 0 !important;
  margin-inline-end: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.belge-inline .ant-select-content-value,
.belge-inline .ant-select-selection-item {
  padding-inline: 0 !important;
}
.belge-inline .ant-select-input {
  height: auto !important;
  padding: 0 !important;
  margin: 0 !important;
}
.belge-inline .ant-select-suffix,
.belge-inline .ant-select-arrow,
.belge-inline .ant-select-clear {
  display: none !important;
}

/* ══════════════════════════════════════════════════════════════════════
   INPUT: Ghost
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .ant-input {
  padding: 0 !important;
  height: auto !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  outline: none !important;
}

/* ══════════════════════════════════════════════════════════════════════
   INPUT NUMBER: Ghost
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .ant-input-number {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  min-width: 0 !important;
  cursor: text !important;
}
.belge-inline .ant-input-number-input {
  font: inherit !important;
  color: inherit !important;
  letter-spacing: inherit !important;
  padding: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  text-align: inherit !important;
  min-width: 0 !important;
  cursor: text !important;
  box-sizing: border-box !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  appearance: none !important;
  -webkit-appearance: none !important;
}
.belge-inline .ant-input-number-actions,
.belge-inline .ant-input-number-handler-wrap {
  display: none !important;
}

/* ══════════════════════════════════════════════════════════════════════
   AUTOCOMPLETE: Ghost + genişleme kilidi
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .ant-select-auto-complete {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  overflow: hidden !important;
}
.belge-inline .ant-select-auto-complete .ant-select-content {
  padding: 0 !important;
  overflow: hidden !important;
  width: 100% !important;
  max-width: 100% !important;
  position: relative !important;
}
.belge-inline .ant-select-auto-complete .ant-select-input {
  font: inherit !important;
  font-style: normal !important;
  letter-spacing: inherit !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  appearance: none !important;
  -webkit-appearance: none !important;
}
.belge-inline .ant-select-auto-complete .ant-select-placeholder {
  font: inherit !important;
  font-style: normal !important;
  position: absolute !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  inset-inline-start: 0 !important;
  width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  color: inherit !important;
  opacity: 0.48 !important;
  pointer-events: none !important;
}

/* ══════════════════════════════════════════════════════════════════════
   DATEPICKER: Ghost
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .ant-picker {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.belge-inline .ant-picker-input > input {
  font: inherit !important;
}
.belge-inline .ant-picker-suffix,
.belge-inline .ant-picker-clear {
  display: none !important;
}

/* ══════════════════════════════════════════════════════════════════════
   TEXTAREA: Ghost
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline textarea.ant-input {
  resize: none !important;
}

/* ══════════════════════════════════════════════════════════════════════
   SIZE-SM: AntD v6 sabit yüksekliklerini sıfırla
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .ant-select-sm .ant-select-content,
.belge-inline .ant-select-sm .ant-select-input {
  height: auto !important;
  min-height: 0 !important;
  padding: 0 !important;
}
.belge-inline .ant-input-sm {
  height: auto !important;
  min-height: 0 !important;
  padding: 0 !important;
}
.belge-inline .ant-input-number-sm {
  height: auto !important;
  min-height: 0 !important;
}
.belge-inline .ant-input-number-sm .ant-input-number-input {
  height: auto !important;
  min-height: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

/* ══════════════════════════════════════════════════════════════════════
   INLINE TABLE FIELDS — hücre içi kontroller
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .inline-table-field {
  width: 100% !important;
  min-width: 0 !important;
  /* font: inherit YOK — wrapper kendi inline fontSize/fontWeight'ini
     korur (ROW_TEXT.code 10.5px/600, ROW_TEXT.delivery 10px gibi). */
  font-family: inherit !important;
  font-style: inherit !important;
  color: inherit !important;
  letter-spacing: inherit !important;
}
/* Select root: inline-flex → block */
.belge-inline .inline-table-field.ant-select {
  display: block !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 0 !important;
  padding-inline: 0 !important;
  padding-block: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  --ant-select-height: auto !important;
  --ant-select-padding-horizontal: 0px !important;
  --ant-select-padding-vertical: 0px !important;
  --ant-select-border-size: 0px !important;
  --ant-select-border-color: transparent !important;
  --ant-select-background-color: transparent !important;
}
.belge-inline .inline-table-field .ant-select-content {
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  margin-inline-end: 0 !important;
}
/* Seçili değer + placeholder: hücrenin tam tipografisini miras al */
.belge-inline .inline-table-field .ant-select-content-value,
.belge-inline .inline-table-field .ant-select-placeholder {
  font: inherit !important;
  color: inherit !important;
  letter-spacing: inherit !important;
  text-align: inherit !important;
  font-style: normal !important;
}
/* Search input: color inherit YASAK */
.belge-inline .inline-table-field .ant-select-input {
  font: inherit !important;
  font-style: normal !important;
  letter-spacing: inherit !important;
  text-align: inherit !important;
  min-width: 0 !important;
}
/* Ham input / textarea */
.belge-inline .inline-table-field input:not(.ant-select-input),
.belge-inline .inline-table-field textarea {
  font: inherit !important;
  font-style: normal !important;
  color: inherit !important;
  letter-spacing: inherit !important;
  text-align: inherit !important;
  min-width: 0 !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  appearance: none !important;
  -webkit-appearance: none !important;
}
/* Placeholder: font miras + italic yok */
.belge-inline .inline-table-field .ant-select-placeholder,
.belge-inline .inline-table-field input::placeholder,
.belge-inline .inline-table-field textarea::placeholder {
  font: inherit !important;
  font-style: normal !important;
  opacity: 0.42 !important;
}
.belge-inline .inline-table-field.ant-input-number {
  display: block !important;
  height: auto !important;
  min-height: 0 !important;
}
.belge-inline .inline-table-field.ant-input,
.belge-inline .inline-table-field.ant-input.ant-input-sm,
.belge-inline .inline-table-field.ant-input-borderless,
.belge-inline input.ant-input.inline-table-field {
  min-height: 0 !important;
  height: auto !important;
  line-height: var(--line-cell-line-height) !important;
  padding: 0 !important;
  margin: 0 !important;
  box-sizing: border-box !important;
}
.belge-inline .inline-table-field.ant-input-number .ant-input-number-input {
  font: inherit !important;
  font-style: normal !important;
  color: inherit !important;
  letter-spacing: inherit !important;
  padding: 0 !important;
  height: auto !important;
  min-height: 0 !important;
}

/* ══════════════════════════════════════════════════════════════════════
   TEXTAREA (aciklama inline edit) — resize yok, native scrollbar yok
   autoSize ile satır sayısı içeriğe göre 1-3 arası dinamik
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .inline-table-field.ant-input.ant-input-borderless,
.belge-inline textarea.inline-table-field {
  resize: none !important;
  padding: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  overflow: hidden !important;
}
.belge-inline textarea.inline-table-field:focus {
  outline: none !important;
  box-shadow: none !important;
}

/* ══════════════════════════════════════════════════════════════════════
   ROW HEIGHT STABILITY — satır bazında değil, sadece aktif hücre editörü alır.
   tr[data-satir-id] her zaman aynı ölçüde; td.is-active-cell sadece
   kendi içindeki editörü kilitler.
   ══════════════════════════════════════════════════════════════════════ */

/* TD padding + line-height — tüm satırda tek ölçü */
.belge-inline tr[data-satir-id] > td {
  padding: var(--line-cell-padding-y) var(--line-cell-padding-x) !important;
  vertical-align: middle !important;
  line-height: var(--line-cell-line-height) !important;
}

/* Aktif hücre içindeki editör descendant'ları — strict reset
   (:not(textarea) textarea'yı dışarıda tutar) */
.belge-inline td.is-active-cell .inline-table-field,
.belge-inline td.is-active-cell .inline-table-field *:not(textarea),
.belge-inline td.is-active-cell .ant-select,
.belge-inline td.is-active-cell .ant-select *:not(textarea),
.belge-inline td.is-active-cell .ant-input-number,
.belge-inline td.is-active-cell .ant-input-number *:not(textarea),
.belge-inline td.is-active-cell .ant-select-auto-complete,
.belge-inline td.is-active-cell .ant-select-auto-complete *:not(textarea) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  min-height: 0 !important;
  line-height: var(--line-cell-line-height) !important;
  box-sizing: border-box !important;
}

/* Inline field dış wrapper — border/shadow yok */
.belge-inline td.is-active-cell .inline-table-field {
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}

/* TextArea özel — padding ve line-height sıkı */
.belge-inline td.is-active-cell textarea.inline-table-field {
  line-height: var(--line-cell-line-height) !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  min-height: 0 !important;
  font-size: var(--line-cell-font-size) !important;
  box-sizing: border-box !important;
}

/* Satır içeriği dikey ortalı */
.belge-inline tr[data-satir-id] td > *:first-child {
  vertical-align: middle;
}

/* ══════════════════════════════════════════════════════════════════════
   FOCUS: Tıklamada sıfır görsel değişim. td.is-active-cell hiçbir çerçeve,
   shadow veya border değişimi almaz — zebra arka planı korunur. Editör
   text'le birebir aynı görünür; input/select/textarea arka planları şeffaf
   bırakılır ki hücrenin zebra'sı içeride görünsün.
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline td.is-active-cell,
.belge-inline td.is-active-cell:focus-within {
  outline: none !important;
  box-shadow: none !important;
}
.belge-inline .inline-table-field.ant-input-number:focus-within,
.belge-inline .inline-table-field.ant-input-number-focused,
.belge-inline .inline-table-field.ant-select-focused .ant-select-content,
.belge-inline td.is-active-cell input:focus,
.belge-inline td.is-active-cell textarea:focus,
.belge-inline td.is-active-cell select:focus {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
  background: transparent !important;
}
.belge-inline .field-group .ant-input:focus,
.belge-inline .field-group textarea.ant-input:focus {
  box-shadow: ${FIELD.focusLine} !important;
  border-radius: 0 !important;
}
.belge-inline .field-group .ant-select-focused .ant-select-content {
  box-shadow: ${FIELD.focusLine} !important;
  border-radius: 0 !important;
}
.belge-inline .field-group .ant-input-number-focused {
  box-shadow: ${FIELD.focusLine} !important;
  border-radius: 0 !important;
}

/* ══════════════════════════════════════════════════════════════════════
   AKTİF HÜCRE NET İNDİKATÖR — sadece düzenleme modunda.
   • Kilit açık (.belge-editor:not(.belge-readonly)): sol kenarda 3px mavi
     şerit + 1px ince iç çerçeve → kullanıcı "şu an buradayım" hissini
     net görür, yanlış hücreye yazma endişesi kalkar.
   • PDF görünümü (.belge-readonly): mevcut sıfır-değişim davranışı kalır.
   • PDF capture (pdfService.ts clone): zaten box-shadow:none ile sıfırlar.
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline.belge-editor:not(.belge-readonly) td.is-active-cell {
  background-color: rgba(37, 99, 235, 0.05) !important;
  box-shadow:
    inset 3px 0 0 0 rgba(37, 99, 235, 0.55),
    inset 0 0 0 1px rgba(37, 99, 235, 0.16) !important;
  transition: background-color 120ms ease, box-shadow 120ms ease;
}
.belge-inline.belge-editor:not(.belge-readonly) td.is-active-cell:focus-within {
  box-shadow:
    inset 3px 0 0 0 rgba(37, 99, 235, 0.75),
    inset 0 0 0 1px rgba(37, 99, 235, 0.28) !important;
}

/* ══════════════════════════════════════════════════════════════════════
   LINE ITEM TABLE: satır yüksekliği taban (min) değerinde; açıklama
   2. satıra düştüğünde sadece o satır kontrollü şekilde büyür. Diğer
   satırlar varsayılan yüksekliğinde kalır.
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .offer-table tbody tr[data-satir-id] {
  min-height: var(--line-row-height) !important;
}
.belge-inline .offer-table tbody tr[data-satir-id] > td {
  min-height: var(--line-row-height) !important;
  padding: var(--line-cell-padding-y) var(--line-cell-padding-x) !important;
  line-height: var(--line-cell-line-height) !important;
  box-sizing: border-box !important;
  vertical-align: middle !important;
}

/* ══════════════════════════════════════════════════════════════════════
   ROW RESIZE HANDLE — satır altı sürüklenebilir tutamak.
   - Görsel + hit area handle div'in KENDİSİ (gradient + glow inline style
     ile RowResizerLayer'da render edilir → Vite HMR cache'inden bağımsız).
   - Bu CSS sadece hover/active state amplifikasyonu yapar.
   - Boydan boya highlight YASAK: tr arka planı drag boyunca DEĞİŞMEZ.
   PDF capture sırasında handle render edilmez (interactive=false ağacı).
   ══════════════════════════════════════════════════════════════════════ */
/* Hover/active: hat görünür + HAFİF drop-shadow halesi (sadece görünür
   2px hat etrafında, tüm hit area'da değil — drop-shadow alpha-aware). */
/* Hover/active sinyali OUTER hit-area div'ine değil, INNER görünür çizgiye
   uygulanır. Hit area (# + Marka boyunca) hâlâ transparan; sadece marka
   altındaki ince hat parlar. */
.row-resize-handle:hover .row-resize-handle-line,
.row-resize-handle[data-active="true"] .row-resize-handle-line {
  opacity: 1 !important;
  filter: drop-shadow(0 0 3px rgba(74, 144, 226, 0.55)) drop-shadow(0 0 1px rgba(122, 176, 244, 0.7)) !important;
}
.row-resize-handle[data-active="true"] .row-resize-handle-line {
  filter: drop-shadow(0 0 4px rgba(74, 144, 226, 0.7)) drop-shadow(0 0 1.5px rgba(122, 176, 244, 0.85)) !important;
}

@media print {
  .row-resize-handle,
  .row-resizer-layer {
    display: none !important;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   ÜRÜN KODU HÜCRESİ — ASLA kesilmez, üç nokta yok.
   Kolon genişliği en uzun koda göre TableColgroup içinde hesaplanır;
   hücre yalnızca tek satıra kilitli, taşma görünür bırakılır.
   ══════════════════════════════════════════════════════════════════════ */
.product-code-cell {
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
}

/* ══════════════════════════════════════════════════════════════════════
   AÇIKLAMA HÜCRESİ — ellipsis / line-clamp / max-height YASAK
   Öncelik: tek satır. Fit-level DescText içinde ölçülerek belirlenir:
     df-1 → 12px    (varsayılan)
     df-2 → 11px
     df-3 → 10.5px
     df-4 → 10.5px + kontrollü wrap (son çare)
   ══════════════════════════════════════════════════════════════════════ */
.description-cell {
  /* Default: tek satır. df-4 ise inline-block override ile wrap'e izin verilir.
     contain: paint  → hover ışığı / pseudo overlay'leri ASLA komşu hücreye
     (miktar / birim fiyat) taşıramaz. Paint containment layout/style etkilemez,
     yalnızca render alanını hücrenin bounding-box'una sıkıştırır. PDF kayıt
     açısından sorunsuz — html2canvas DOM bounds'unu kullanır. */
  white-space: nowrap;
  overflow: visible !important;
  text-overflow: clip !important;
  line-height: 1.15 !important;
  contain: paint;
}
/* df-4 (wrap modu) cell üzerinde white-space: normal'i zorlar — !important ile
   parent default'unu yener, böylece 10.5px'te bile sığmayan metin gerçekten
   alt satıra geçer. */
.description-cell:has(.description-text.df-4) {
  white-space: normal !important;
}
.description-text {
  display: inline-block;
  max-width: 100%;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.15;
  color: #2A2A2A;
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
}
.description-text.df-1 { font-size: 12px;   white-space: nowrap; }
.description-text.df-2 { font-size: 11px;   white-space: nowrap; }
.description-text.df-3 { font-size: 10.5px; white-space: nowrap; }
.description-text.df-4 {
  display: block;
  font-size: 10.5px;
  line-height: 1.15;
  /* pre-wrap: manuel alt satır (\n) saygılanır + uzun satır otomatik wrap.
     Kullanıcı Shift+Enter ile yazdığı satır geçişi PDF'te de görünür. */
  white-space: pre-wrap !important;
  overflow-wrap: anywhere;
  word-break: normal;
}

/* ══════════════════════════════════════════════════════════════════════
   EDIT MODU STABİLİTESİ — hücreye tıklanınca satır yüksekliği, hücre
   genişliği, yazı boyutu, padding, border DEĞİŞMEZ. Input/select/textarea
   metin gibi görünür, AntD'nin kendi ölçülerini dayatmasına izin verilmez.
   ══════════════════════════════════════════════════════════════════════ */
.offer-table input:not([type="checkbox"]),
.offer-table textarea,
.offer-table select {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font: inherit;
  line-height: inherit;
  color: inherit;
  letter-spacing: inherit;
  text-align: inherit;
  background: transparent;
  border: 0;
  outline: none;
  box-shadow: none;
  padding: 0;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
}
.offer-table td.is-active-cell {
  padding: var(--line-cell-padding-y) var(--line-cell-padding-x) !important;
  border: inherit;
  outline: none !important;
  box-shadow: none !important;
}


/* Aktif hücre görsel vurgusu YOK — tıklamada hücrenin görünümü aynı kalır.
   Editör metinle birebir aynı tipografiyi aldığı için kullanıcı sadece
   imleç girişini görür. */

/* Cursor: metin hücrelerde text, select hücrelerde pointer */
.belge-inline .offer-table tbody tr[data-satir-id] > td {
  cursor: text !important;
}
.belge-inline .offer-table tbody tr[data-satir-id] > td:has(.ant-select),
.belge-inline .offer-table td.is-active-cell .ant-select,
.belge-inline .offer-table td.is-active-cell .ant-select-content,
.belge-inline .offer-table td.is-active-cell .ant-select-input {
  cursor: pointer !important;
}

/* Tablo ve hücre genişliği sadece colgroup'dan gelir, burada width/min-width/max-width asla verilmez! */

.belge-inline .offer-table td.is-active-cell .inline-table-field,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-input,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-input-number,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select-auto-complete,
.belge-inline .offer-table td.is-active-cell textarea.inline-table-field {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  font: inherit !important;
  color: inherit !important;
  line-height: var(--line-cell-line-height) !important;
  box-sizing: border-box !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select .ant-select-content,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select-auto-complete .ant-select-content {
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  padding: 0 !important;
  margin: 0 !important;
  box-sizing: border-box !important;
}

.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select .ant-select-content-value,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select .ant-select-selection-item,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select .ant-select-placeholder,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select .ant-select-input,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select-auto-complete .ant-select-placeholder,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select-auto-complete .ant-select-input {
  font: inherit !important;
  line-height: var(--line-cell-line-height) !important;
  padding: 0 !important;
  margin: 0 !important;
  min-width: 0 !important;
}

.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-input-number .ant-input-number-input,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-input,
.belge-inline .offer-table td.is-active-cell .inline-table-field input:not(.ant-select-input),
.belge-inline .offer-table td.is-active-cell .inline-table-field textarea {
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  padding: 0 !important;
  margin: 0 !important;
  font: inherit !important;
  color: inherit !important;
  line-height: var(--line-cell-line-height) !important;
  box-sizing: border-box !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.belge-inline .offer-table td.is-active-cell textarea.inline-table-field {
  resize: none !important;
  overflow: hidden !important;
}

/* Editör iç odak — ekstra box-shadow yok (td.is-active-cell zaten çerçeveyi çiziyor) */
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-input-number:focus-within,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-input-number-focused,
.belge-inline .offer-table td.is-active-cell .inline-table-field.ant-select-focused .ant-select-content,
.belge-inline .offer-table td.is-active-cell input:focus,
.belge-inline .offer-table td.is-active-cell textarea:focus {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

/* ══════════════════════════════════════════════════════════════════════
   AKTİF HÜCRE — text → editor geçiş STABİLİTESİ (final lock)
   Cell content area = var(--line-row-height) - 2*var(--line-cell-padding-y)
                     = 20 - 6 = 14px
   Editor input/textarea/select inner BU ALANI AŞAMAZ → satır büyümez.
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline tr[data-satir-id] > td.is-active-cell {
  padding: var(--line-cell-padding-y) var(--line-cell-padding-x) !important;
  line-height: var(--line-cell-line-height) !important;
  vertical-align: middle !important;
  height: auto !important;
  min-height: var(--line-row-height) !important;
  max-height: var(--line-row-height) !important;
  overflow: hidden !important;
}
/* Wrapper'in KENDISI hedeflenmez — wrapper kendi inline style'indaki
   fontSize/fontWeight'i (orn. ROW_TEXT.code: 10.5px / 600) korur.
   Sadece IÇ elemanlar wrapper'dan inherit eder. Aksi halde Urun Kodu
   editorune girince font 10.5px → 11px, weight 600 → 400 sıçrardı.
   Renk override KALDIRILDI: edit moduna girince yazı rengi değişmemeli;
   wrapper'ın inline style rengi (ROW_TEXT.X içindeki color) inherit ile
   iç input/textarea/select'e iner. */
.belge-inline tr[data-satir-id] > td.is-active-cell input::placeholder,
.belge-inline tr[data-satir-id] > td.is-active-cell textarea::placeholder {
  color: inherit !important;
  opacity: 0.55 !important;
}
.belge-inline tr[data-satir-id] > td.is-active-cell .inline-table-field *:not(.ant-select-dropdown):not(.ant-select-dropdown *) {
  font-family: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  font-style: normal !important;
  line-height: var(--line-cell-line-height) !important;
  letter-spacing: inherit !important;
  text-align: inherit !important;
  box-sizing: border-box !important;
}
/* Editor input/textarea — cell content alanına KESİN clamp.
   Browser'ın input default internal padding'i bile satırı büyütemez.
   text-align: inherit → AntD'nin .ant-input-number-input default text-align:start
   davranışını kır; wrapper'daki textAlign (right/center/left) input'a propagate. */
.belge-inline tr[data-satir-id] > td.is-active-cell input,
.belge-inline tr[data-satir-id] > td.is-active-cell textarea,
.belge-inline tr[data-satir-id] > td.is-active-cell .ant-select-content,
.belge-inline tr[data-satir-id] > td.is-active-cell .ant-input-number-input {
  height: calc(var(--line-row-height) - 2 * var(--line-cell-padding-y)) !important;
  max-height: calc(var(--line-row-height) - 2 * var(--line-cell-padding-y)) !important;
  min-height: 0 !important;
  line-height: calc(var(--line-row-height) - 2 * var(--line-cell-padding-y)) !important;
  padding: 0 !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  text-align: inherit !important;
}

/* Sadece raw input/textarea text-indent — browser default implicit
   indent metnini 1-2px kaydırıyordu. AntD Select iç elemanlarına
   DOKUNMA (sağa/sola yaslama, layout flex'lerini bozar). */
.belge-inline tr[data-satir-id] > td.is-active-cell input.ant-input,
.belge-inline tr[data-satir-id] > td.is-active-cell input.ant-input-number-input,
.belge-inline tr[data-satir-id] > td.is-active-cell textarea.ant-input {
  text-indent: 0 !important;
}

/* ══════════════════════════════════════════════════════════════════════
   MIKTAR EDITOR — flex layout: InputNumber 58% + Unit Select kalan
   Genel .inline-table-field { width: 100% !important } kuralı flex-basis
   58%'i eziyor → InputNumber tüm satırı kaplıyor, birim "Ad." → "A"
   kırpılıyor. Miktar scope'unda width override + unit-wrap min-width. */
.belge-inline .miktar-edit-wrap > .miktar-edit-value-wrap {
  flex: 0 0 58% !important;
  min-width: 0 !important;
  overflow: hidden !important;
}
.belge-inline .miktar-edit-wrap > .miktar-edit-value-wrap > .inline-table-field.miktar-edit-input {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  flex: none !important;
}
.belge-inline .miktar-edit-wrap > .miktar-edit-unit-wrap {
  flex: 1 1 0 !important;
  min-width: 0 !important;
  overflow: visible !important;
}
.belge-inline .miktar-edit-wrap .inline-table-field.miktar-edit-unit {
  width: 100% !important;
  min-width: 0 !important;
  overflow: visible !important;
}
.belge-inline .miktar-edit-wrap .miktar-edit-unit .ant-select-content {
  display: flex !important;
  justify-content: flex-end !important;
  overflow: visible !important;
}

/* ══════════════════════════════════════════════════════════════════════
   PRODUCT CODE CELL — edit mode'da text mode ile birebir aynı görünüm
   AntD AutoComplete iç katmanlarında font: inherit zinciri (rule 1, rule 4,
   rule 7, rule 9, rule 11 hepsi farklı yerden ezme yapıyor) → final
   garantici override. Wrapper + tüm iç elemanlar 10.5px / 600 / accent.
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline tr[data-satir-id] > td.product-code-cell.is-active-cell .inline-table-field,
.belge-inline tr[data-satir-id] > td.product-code-cell.is-active-cell .inline-table-field *:not(.ant-select-dropdown):not(.ant-select-dropdown *) {
  font-size: 10.5px !important;
  font-weight: 600 !important;
  color: #111111 !important;
  letter-spacing: -0.1px !important;
}

/* "Hayalet text" fix: AutoComplete active cell'de span/div seklindeki TUM
   text node'lar gizlenir. Sadece input/textarea text rendering yapar.
   AntD'nin display layer class isimleri (content-value/-item/-selection-
   item/-content-search/etc.) versiyon arasi degisken — span:not(input)
   universal selector ile hepsini yakala. */
.belge-inline tr[data-satir-id] > td.is-active-cell .inline-table-field.ant-select span,
.belge-inline tr[data-satir-id] > td.is-active-cell .inline-table-field.ant-select-auto-complete span {
  color: transparent !important;
  text-shadow: none !important;
}
.belge-inline tr[data-satir-id] > td.is-active-cell .ant-select-content-value,
.belge-inline tr[data-satir-id] > td.is-active-cell .ant-select-content-item,
.belge-inline tr[data-satir-id] > td.is-active-cell .ant-select-selection-item {
  opacity: 0 !important;
  visibility: hidden !important;
  color: transparent !important;
}

/* ══════════════════════════════════════════════════════════════════════
   CHECKBOX
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline input[type="checkbox"] {
  accent-color: ${FIELD.caret};
}

/* ══════════════════════════════════════════════════════════════════════
   SATIR-AKSIYONLARI: ghost override — iskonto inputu görünür
   ══════════════════════════════════════════════════════════════════════ */
.satir-aksiyonlari .ant-input-number {
  background: rgba(0,0,0,0.05) !important;
  border: 0.75px solid rgba(0,0,0,0.12) !important;
  border-radius: 3px !important;
  min-width: 28px !important;
  width: 28px !important;
}
.satir-aksiyonlari .ant-input-number-input {
  height: 16px !important;
  min-height: 16px !important;
  padding: 0 3px !important;
  text-align: center !important;
  color: #4a4a4e !important;
  background: transparent !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  font-style: normal !important;
}

@keyframes cell-popup-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══════════════════════════════════════════════════════════════════════
   TIKLAMA ALANI + HOVER/AKTİF EFEKTLERİ — editör hücreleri (PDF/template
   etkilenmez):
   - Padding artırıldı: CSS variable .belge-inline scope'unda override
   - Tüm td yüzeyi tıklanabilir, user-select: none → çift-tık seçimi yok
   - Cursor: tıklanabilir td'lerde pointer, aktifte text, sub-item'da default
   - Hover (aktif olmayan): sol kenarda 2.5px ince mavi şerit + çok hafif
     tint + içerik metni brightness(0.85) ile koyulaşır
   - Aktif: sol kenarda 3px parlak mavi şerit + soluk lavanta arka plan
   - readOnly + sub-item: hiç efekt yok
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .offer-table {
  --line-cell-padding-y: 5px;
  --line-cell-padding-x: 6px;
}

/* Optical separator color CSS variables — A4 ve PDF tarafında dikey hücre
   ayrım çizgileri global index.css'te .offer-table .optical-separator-col
   selektörü ile çiziliyor (rcCell inline borderLeft'i !important ile ezer).
   Bu CSS variable'ları geriye dönük uyumluluk için tutuluyor; başka
   bileşenler okuyorsa değer aynı kalsın. */
.belge-inline .offer-table thead th.optical-separator-col,
.belge-inline .offer-table tbody td.optical-separator-col {
  --offer-col-separator: ${OPTICAL_SEPARATOR_COLOR.body};
}
.belge-inline .offer-table thead th.optical-separator-col {
  --offer-col-separator: ${OPTICAL_SEPARATOR_COLOR.head};
}
.belge-inline .offer-table tbody tr[data-marked="true"] > td.optical-separator-col {
  --offer-col-separator: rgba(26, 43, 66, 0.11);
}

/* ══════════════════════════════════════════════════════════════════════
   HÜCRE HOVER & AKTİF — TECH OVERLAY SİSTEMİ
   ──────────────────────────────────────────────────────────────────────
   PROBLEM: rcCell() hücreye 'background' + 'boxShadow'u INLINE style ile
   veriyor (zebra desen + satır kenarlığı). CSS ':hover { background:... }'
   inline'ı !important olmadan ezemez → eski hover yapısı görünmüyordu.

   ÇÖZÜM: hover/active sinyalini hücrenin kendi '::after' PSEUDO katmanına
   taşıdık. Pseudo absolute + inset:1px → tablo akışını / inline style'ı
   etkilemez, sadece üstüne biner. İçerik z-index:1 ile pseudo'nun üstünde
   kalır. Geometric containment garantili — komşu hücreye 1 px bile sızmaz.

   TECH AESTHETIC: Excel dikdörtgen yerine indigo→mavi diagonal gradient,
   parlak üst kenar (cam ışığı), soft inner glow, hafif outer halo.
   Sayfa A4 ölçüleri ve PDF render hattı BOZULMAZ — pseudo PDF clone'da
   pdfService CLONE_QUALITY_STYLESHEET ile zaten sıfırlanıyor.
   ══════════════════════════════════════════════════════════════════════ */

/* Tüm hücrelere relative ata → pseudo overlay için stacking context.
   Layout etkisi sıfır (td zaten static akışta). */
.belge-inline .offer-table tbody tr[data-satir-id] > td {
  position: relative;
  cursor: pointer !important;
  user-select: none;
}
/* İçerik (DescText, EditableField vb.) pseudo overlay'in üstünde kalsın.
   Wrapper span/div'lerin doğal akışı bozulmaz; sadece z-index'i 1 olur. */
.belge-inline .offer-table tbody tr[data-satir-id] > td > * {
  position: relative;
  z-index: 1;
}

/* Hover/active overlay — varsayılan görünmez, opacity transition ile gelir.
   inset:1px → komşu hücre sınırına 1px boşluk, tablo border'ı temiz kalır.
   border-radius:4px → "tech" yumuşak köşe (Excel dikdörtgen YOK). */
.belge-inline .offer-table tbody tr[data-satir-id] > td::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 4px;
  pointer-events: none;
  opacity: 0;
  z-index: 0;
  transition: opacity 180ms ease, box-shadow 180ms ease, background 180ms ease;
}

/* ── HOVER: ince indigo gradient + cam parlama + ince çevre çizgi ────────── */
.belge-inline .offer-table tbody tr[data-satir-id] > td:hover:not(.is-active-cell)::after {
  opacity: 1;
  background:
    linear-gradient(135deg,
      rgba(99, 102, 241, 0.06) 0%,
      rgba(59, 130, 246, 0.03) 55%,
      rgba(14, 165, 233, 0.045) 100%
    );
  box-shadow:
    inset 0 0 0 1px rgba(99, 102, 241, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    inset 0 -1px 0 rgba(99, 102, 241, 0.08);
}

/* ── AKTİF HÜCRE: kuvvetli gradient + parlak çevre + soft glow halo ──────── */
.belge-inline .offer-table tbody tr[data-satir-id] > td.is-active-cell {
  cursor: text !important;
}
.belge-inline .offer-table tbody tr[data-satir-id] > td.is-active-cell::after {
  opacity: 1;
  background:
    linear-gradient(135deg,
      rgba(99, 102, 241, 0.11) 0%,
      rgba(59, 130, 246, 0.06) 55%,
      rgba(14, 165, 233, 0.09) 100%
    );
  box-shadow:
    inset 0 0 0 1.5px rgba(99, 102, 241, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    inset 0 -1px 0 rgba(99, 102, 241, 0.18),
    inset 0 0 14px rgba(99, 102, 241, 0.10),
    0 0 0 1px rgba(99, 102, 241, 0.16);
}

/* Optical separator (dikey ayraç) hover/active renk tonunu uyumlu yap */
.belge-inline .offer-table tbody tr[data-satir-id] > td.optical-separator-col:hover:not(.is-active-cell) {
  --offer-col-separator: ${OPTICAL_SEPARATOR_COLOR.head};
}
.belge-inline .offer-table tbody tr[data-satir-id] > td.optical-separator-col.is-active-cell {
  --offer-col-separator: rgba(99, 102, 241, 0.22);
}

/* Sub-item / no-click / readOnly — efekt sıfır */
.belge-inline .offer-table tbody tr[data-satir-id] > td[style*="cursor: default"]::after,
.belge-inline .offer-table tbody tr[data-satir-id] > td.no-click::after {
  display: none !important;
}
.belge-inline .offer-table tbody tr[data-satir-id] > td[style*="cursor: default"],
.belge-inline .offer-table tbody tr[data-satir-id] > td.no-click {
  cursor: default !important;
}
.belge-readonly .offer-table tbody tr[data-satir-id] > td::after,
.belge-inline.belge-readonly .offer-table tbody tr[data-satir-id] > td::after {
  display: none !important;
}

/* ── DARK MODE — aynı tech görünüm, koyu zeminde daha parlak ton ─────────── */
[data-theme="dark"] .belge-inline .offer-table tbody tr[data-satir-id] > td:hover:not(.is-active-cell)::after {
  background:
    linear-gradient(135deg,
      rgba(129, 140, 248, 0.10) 0%,
      rgba(96, 165, 250, 0.06) 55%,
      rgba(56, 189, 248, 0.08) 100%
    );
  box-shadow:
    inset 0 0 0 1px rgba(129, 140, 248, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -1px 0 rgba(129, 140, 248, 0.12);
}
[data-theme="dark"] .belge-inline .offer-table tbody tr[data-satir-id] > td.is-active-cell::after {
  background:
    linear-gradient(135deg,
      rgba(129, 140, 248, 0.18) 0%,
      rgba(96, 165, 250, 0.10) 55%,
      rgba(56, 189, 248, 0.14) 100%
    );
  box-shadow:
    inset 0 0 0 1.5px rgba(129, 140, 248, 0.70),
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    inset 0 -1px 0 rgba(129, 140, 248, 0.20),
    inset 0 0 14px rgba(129, 140, 248, 0.18),
    0 0 0 1px rgba(129, 140, 248, 0.20);
}
[data-theme="dark"] .belge-inline .offer-table thead th.optical-separator-col,
[data-theme="dark"] .belge-inline .offer-table tbody td.optical-separator-col {
  --offer-col-separator: rgba(203, 213, 225, 0.16);
}
[data-theme="dark"] .belge-inline .offer-table tbody tr[data-marked="true"] > td.optical-separator-col {
  --offer-col-separator: rgba(241, 245, 249, 0.17);
}
[data-theme="dark"] .belge-inline .offer-table tbody tr[data-satir-id] > td.optical-separator-col:hover:not(.is-active-cell) {
  --offer-col-separator: rgba(226, 232, 240, 0.17);
}
/* Eski dark-mode td.is-active-cell box-shadow/background kuralı kaldırıldı —
   inline style (rcCell) ezdiği için zaten görünmüyordu. Yeni dark-mode
   td.is-active-cell::after overlay artık tüm tech görsel diliyle çalışıyor. */
[data-theme="dark"] .belge-inline .offer-table tbody tr[data-satir-id] > td.optical-separator-col.is-active-cell {
  --offer-col-separator: rgba(241, 245, 249, 0.19);
}

/* ── İşaretli satır — tek düz arka plan (zebra override) + bookmark tab ──
 *  background-color kullan: shorthand 'background' border ve yüzey tonlarını
 *  gereksiz yere sıfırlamasın. Color-only override ile separator çizgileri
 *  korunur. */
.belge-inline .offer-table tbody tr[data-marked="true"] > td {
  background-color: #E4E9F1 !important;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.belge-inline .offer-table tbody tr[data-marked="true"] > td:first-child {
  position: relative;
}
.belge-inline .offer-table tbody tr[data-marked="true"] > td:first-child::before {
  content: '';
  position: absolute;
  left: 1px;
  top: 50%;
  transform: translateY(-50%);
  width: 3.5px;
  height: 55%;
  min-height: 14px;
  max-height: 24px;
  background-color: rgba(26, 43, 66, 0.38);
  border-radius: 2px;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* İşaretli satır aktif hücre ile çakışma — aktif hücre kendi stilini korusun */
.belge-inline .offer-table tbody tr[data-marked="true"] > td.is-active-cell {
  background-color: rgba(237, 242, 251, 0.35) !important;
}

/* Dark mode */
[data-theme="dark"] .belge-inline .offer-table tbody tr[data-marked="true"] > td {
  background-color: rgba(26, 43, 66, 0.25) !important;
}
[data-theme="dark"] .belge-inline .offer-table tbody tr[data-marked="true"] > td:first-child::before {
  background-color: rgba(148, 163, 184, 0.50);
}
[data-theme="dark"] .belge-inline .offer-table tbody tr[data-marked="true"] > td.is-active-cell {
  background-color: rgba(59, 130, 246, 0.08) !important;
}

/* ── Set alt kalem "boş hücre" — birimFiyat/toplam/teslimat ──
 *  Marked row kuralı (#E4E9F1 !important) bu hücreleri de ezerdi → !important ile
 *  override ediyoruz: arka plan, border, gölge, sütun ayraç gradient'i hepsi
 *  bypass. paraBirimi sütunundaki sağ kenar set frame'ini kapatır. */
.belge-inline .offer-table tbody td.set-altkalem-empty {
  background: none !important;
  background-image: none !important;
  border: none !important;
  box-shadow: none !important;
}
[data-theme="dark"] .belge-inline .offer-table tbody td.set-altkalem-empty {
  background: none !important;
  background-image: none !important;
  border: none !important;
  box-shadow: none !important;
}

/* ── Set parent "merdiven basamağı" — birimFiyat/toplam/teslimat alt kenarı ──
 *  rcCell setGroupPos==='top' iken hideBottomEdge=true verir (borderBottom:none).
 *  Parent'ın sağ-3 sütununda alt kenarda step çizgisi gerek → !important ile
 *  rcCell'in inline borderBottom:none'unu garanti ezer. */
.belge-inline .offer-table tbody td.set-parent-step {
  border-bottom: 0.9px solid #BFBFBF !important;
}
[data-theme="dark"] .belge-inline .offer-table tbody td.set-parent-step {
  border-bottom: 0.9px solid rgba(148, 163, 184, 0.50) !important;
}

/* ══════════════════════════════════════════════════════════════════════
   EditableField — Faz 1 görsel altyapı (cam yüzey hover)

   Hedef: hücre seçilmiş hissi VERMEMEK. Excel/input/dikdörtgen highlight
   yasak. Sadece üst-sol kaynaklı çok hafif radial cam ışığı — "ben
   buradayım" der ama "seçildim" demez.

   Teknik:
   - Hücrenin gerçek background'u DOKUNULMAZ.
   - Border / inset shadow / kalın çerçeve YOK.
   - Sadece pseudo ::after overlay (pointer-events:none, layout shift sıfır).
   - Radial gradient + çok düşük opacity (max ~%55 görünür yoğunluk).
   - PDF: html2canvas pseudo ::after'i render etmez + clone safety stylesheet
     (pdfService.ts CLONE_QUALITY_STYLESHEET) ekstra koruma.
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline [data-editable="true"] {
  position: relative;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  /* Pseudo overlay'in komşu hücrelere sızmasını engelle. Span'larda
     overflow inline'da pratik olarak no-op olsa da div as='div' senaryolarında
     ve gelecekteki herhangi bir pozisyonel eklentide ek güvenlik. */
  overflow: hidden;
  /* Pseudo'nun z-index'i kendi içinde kalsın; tablonun stacking context'ine
     sızıp Açıklama hücresinin clip alanının üstüne çıkmasın. */
  isolation: isolate;
}
.belge-inline [data-editable="true"]::after {
  content: '';
  position: absolute;
  /* SIFIR inset → pseudo asla parent'ın gerçek bounds'unun dışına çıkmaz.
     Önceki -2px -4px değeri komşu td'lerin (Açıklama) görsel alanına sızıyor,
     hover yapılan hücrenin sağında/solunda gizli kalan içerik gibi
     algılanan radial gradient şeridi bırakıyordu. */
  inset: 0;
  pointer-events: none;
  border-radius: 4px;
  /* Tablo dışı editable alanlar (alıcı, ayarlar, notlar, tarih, teklif no,
     hazırlayan, yetkili) için tech tarzı overlay — tablo içindeki td-level
     overlay ile aynı dil. Indigo→mavi diagonal gradient + parlak üst kenar
     + ince çevre çizgi. */
  background:
    linear-gradient(135deg,
      rgba(99, 102, 241, 0.06) 0%,
      rgba(59, 130, 246, 0.03) 55%,
      rgba(14, 165, 233, 0.045) 100%
    );
  box-shadow:
    inset 0 0 0 1px rgba(99, 102, 241, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  opacity: 0;
  transition: opacity 180ms ease-out;
}
[data-theme="dark"] .belge-inline [data-editable="true"]::after {
  background:
    linear-gradient(135deg,
      rgba(129, 140, 248, 0.10) 0%,
      rgba(96, 165, 250, 0.06) 55%,
      rgba(56, 189, 248, 0.08) 100%
    );
  box-shadow:
    inset 0 0 0 1px rgba(129, 140, 248, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.belge-inline [data-editable="true"]:hover::after {
  opacity: 1;
}

/* Tablo İÇİNDEKİ EditableField'lar için pseudo ::after SÖNDÜRÜLÜR:
   tablo hücresinde td-level ::after overlay zaten tüm hücre alanını sarıyor;
   span ::after ile çakışıp çift sinyal vermesin. */
.belge-inline .offer-table [data-editable="true"]::after {
  display: none !important;
}

/* readOnly veya belge-readonly: hover pseudo'su TAMAMEN kaldırılır.
   Kilit kapalı modda alan "PDF önizleme" gibi hissetsin: dekoratif efekt yok. */
.belge-inline [data-editable="false"],
.belge-readonly .belge-inline [data-editable="true"],
.belge-inline.belge-readonly [data-editable="true"],
.belge-readonly [data-editable="true"] {
  cursor: default !important;
  user-select: auto !important;
  -webkit-user-select: auto !important;
}
.belge-inline [data-editable="false"]::after,
.belge-readonly .belge-inline [data-editable="true"]::after,
.belge-inline.belge-readonly [data-editable="true"]::after,
.belge-readonly [data-editable="true"]::after {
  display: none !important;
}

/* belge-readonly altında td hover/active stilleri TAMAMEN sustur — PDF
   görünümü temiz, kilitli mod PDF'e birebir. */
.belge-readonly .offer-table tbody tr[data-satir-id] > td:hover,
.belge-readonly .offer-table tbody tr[data-satir-id] > td.is-active-cell,
.belge-inline.belge-readonly .offer-table tbody tr[data-satir-id] > td:hover,
.belge-inline.belge-readonly .offer-table tbody tr[data-satir-id] > td.is-active-cell {
  box-shadow: none !important;
  background: transparent !important;
  border-radius: 0 !important;
  cursor: default !important;
}

/* Aktif hücrede (CellEditPopup açıkken) hover ışığı kapalı —
   "seçili" ve "üzerinden geç" sinyalleri karışmasın. Aktif hücre kendi
   görsel diliyle (td.is-active-cell kuralı) gösterilir. */
.belge-inline td.is-active-cell [data-editable="true"]::after {
  opacity: 0 !important;
}

/* Tablo td-level mevcut hover (mavi şerit + filter) artık EditableField
   pseudo overlay'ine devredilir. td hover background/filter iptal — kutu
   hissi vermesin. (Bu kural td-level hover'ın YENİ premium versiyonunu
   geçersiz kılmamalı: artık iptal ediyoruz, üstteki yeni hover stili kalır.) */

/* ══════════════════════════════════════════════════════════════════════
   SPOTLIGHT — tablo hücrelerinde imleci takip eden cam yüzey efekti

   Hücreye girince yumuşak radial ışık halesi + küçük specular parıltı
   imleci takip eder. Üst-sol kaynak gibi değil, imlecin tam altında —
   gerçek el feneri hissi.

   Teknik:
   - JS tarafı (PaginatedBelgeInlineEditor useEffect) mousemove ile
     hücredeki --mx, --my CSS variable'larını set eder. RAF throttled,
     tek delegate listener.
   - ::before pseudo-element radial-gradient ile o değerleri kullanır.
   - z-index: -1 + isolation: isolate → metin/input her zaman üstte.
   - :hover ile opacity 0→1; is-active-cell'de daha yoğun.
   - readonly + PDF capture'da görünmez (no hover, no JS listener).
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline .offer-table td[data-cell-field] {
  position: relative;
  isolation: isolate;
}
.belge-inline .offer-table td[data-cell-field]::before {
  content: '';
  position: absolute;
  inset: 2px;
  pointer-events: none;
  z-index: -1;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 180ms ease-out;
  /* İki katmanlı:
       1) Alan ışığı — büyük yumuşak açık-pastel mavi havuz (sky-300)
       2) Specular cam parıltısı — imlecin tam altında küçük beyaz spot */
  background:
    radial-gradient(circle 90px at var(--mx, 50%) var(--my, 50%),
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.50) 40%,
      transparent 70%
    ),
    radial-gradient(circle 26px at var(--mx, 50%) var(--my, 50%),
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 0.55) 50%,
      transparent 80%
    );
}
.belge-inline .offer-table td[data-cell-field]:hover::before {
  opacity: 1;
}
.belge-inline .offer-table td[data-cell-field].is-active-cell::before {
  opacity: 1;
  background:
    radial-gradient(circle 110px at var(--mx, 50%) var(--my, 50%),
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 0.62) 40%,
      transparent 75%
    ),
    radial-gradient(circle 32px at var(--mx, 50%) var(--my, 50%),
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 0.65) 50%,
      transparent 80%
    );
}
/* readonly modda hücre seçilemediği için spotlight gereksiz; tamamen kapat. */
.belge-readonly .offer-table td[data-cell-field]::before,
.belge-inline.belge-readonly .offer-table td[data-cell-field]::before {
  display: none !important;
}

/* ══════════════════════════════════════════════════════════════════════
   BELGE MODU — Kilit kapalı (paper) vs Kilit açık (PDF viewer) hissi

   .belge-editor sınıfı SADECE on-screen editor'a takılı; PDF kaynağı
   (TeklifPagedDocument @ sablonRef offscreen) bu sınıfa SAHİP DEĞİL →
   bu kuralların hiçbiri PDF capture'ı etkilemez, indirilen PDF saf paper
   olarak kalır.

   • belge-editor:not(.belge-readonly) → gerçek A4 kağıt: saf beyaz, hafif
     gölge "masaüstünde duruyor" hissi, ince warm tint paper feel.
   • belge-editor.belge-readonly → Adobe Reader PDF görüntüsü: hafif cool
     gray bg, güçlü drop shadow "viewer'da yüzüyor", ince çerçeve.
   ══════════════════════════════════════════════════════════════════════ */

/* Geçişler — modlar arası yumuşak fade */
.belge-editor [data-pdf-page] {
  transition:
    background-color 320ms ease,
    box-shadow 320ms ease,
    border-color 320ms ease,
    transform 320ms ease;
}

/* ─── KİLİT AÇIK — gerçek A4 kağıt (paper feel) ─── */
.belge-editor:not(.belge-readonly) [data-pdf-page] {
  /* Warm paper white — saf 255'ten hafif ılık, kağıt hissi */
  background-color: #FFFEFB;
  /* Hafif drop shadow — masaüstünde duran kağıt */
  box-shadow:
    0 1px 2px rgba(60, 50, 30, 0.04),
    0 3px 8px rgba(60, 50, 30, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

/* ─── KİLİT KAPALI — Adobe Reader PDF görüntüsü hissi ─── */
.belge-editor.belge-readonly [data-pdf-page] {
  /* Cool digital gray — PDF viewer'larda sayfa gri zemine oturur */
  background-color: #FAFBFC;
  /* Güçlü drop shadow — viewer içinde "yüzen" sayfa */
  box-shadow:
    0 2px 4px rgba(15, 23, 42, 0.06),
    0 8px 24px rgba(15, 23, 42, 0.14),
    0 16px 48px rgba(15, 23, 42, 0.06);
  /* İnce gri çerçeve — PDF viewer'larındaki sayfa frame'i */
  border: 1px solid #DCE2EB;
}

/* Kilit kapalıyken metin/input cursor'ları "pasif izleme" haline geçer */
.belge-editor.belge-readonly,
.belge-editor.belge-readonly [data-editable="true"],
.belge-editor.belge-readonly .offer-table td {
  cursor: default !important;
}

/* Kilit kapalıyken hareketli mikro animasyonları (gradient sweep, glow vs.)
   dondur — donmuş PDF hissi. Tabii global animation'lar (logo vb.) kalır;
   sadece editor içindeki hover-driven animasyonlar etkilenir. */
.belge-editor.belge-readonly *:not(.satir-aksiyonlari):not(.satir-aksiyonlari *) {
  animation-play-state: paused !important;
}

/* ─── KAĞIT ÜSTÜ TAB — mod göstergesi ─── */
/* Kağıdın dışında, üst kenarın hemen üzerinde duran küçük chip.
   .belge-editor container'ına bağlı (data-pdf-page'in overflow:hidden'ına
   takılmaz). ::before pseudo, JSX'e dokunmadan.
   PDF kaynağı .belge-editor class'ına sahip değil → capture etkilenmez. */
.belge-editor {
  position: relative;
  margin-top: 32px;
}
.belge-editor::before {
  content: '';
  position: absolute;
  top: -26px;
  right: 16px;
  z-index: 5;
  padding: 4px 12px;
  border-radius: 6px 6px 2px 2px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-family: var(--font-sans, system-ui), sans-serif;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 240ms ease, transform 240ms ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
.belge-editor:not(.belge-readonly)::before {
  content: '✎  Düzenleme';
  background: rgba(34, 197, 94, 0.12);
  color: rgb(22, 101, 52);
  border: 1px solid rgba(34, 197, 94, 0.35);
  border-bottom: none;
  opacity: 1;
  transform: translateY(0);
}
.belge-editor.belge-readonly::before {
  content: '📄  PDF Görünümü';
  background: rgba(100, 116, 139, 0.12);
  color: rgb(51, 65, 85);
  border: 1px solid rgba(100, 116, 139, 0.35);
  border-bottom: none;
  opacity: 1;
  transform: translateY(0);
}
`;

export type EditingAlan =
  | 'musteri'
  | 'musteri-firma'
  | 'musteri-muhatap'
  | 'musteri-telefon'
  | 'musteri-eposta'
  | 'musteri-sehir'
  | 'ilgili-kisi'
  | 'ayarlar'
  | 'ayar-paraBirimi'
  | 'ayar-odemeVadesi'
  | 'ayar-kdvOrani'
  | 'ayar-kur'
  | 'ayar-gecerlilik'
  | `satir-${string}`
  | 'notlar'
  | null;
