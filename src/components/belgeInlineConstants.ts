/**
 * belgeInlineConstants.ts
 * BelgeInlineEditor'ın düzenleme-spesifik sabitleri.
 * Belge tasarım sabitleri teklifDocumentShared.tsx'ten import edilir.
 */

export const FIELD = {
  activeOutline: '1px solid rgba(37, 99, 235, 0.18)',
  activeBg:      'rgba(237, 242, 251, 0.45)',
  radius:        '4px',
  transition:    'all 0.15s ease',
  focusLine:     'inset 0 -2px 0 rgba(37, 99, 235, 0.20)',
  caret:         '#1e40af',
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

/* ─── Kök elemanlar: font token'larını ve CSS değişkenlerini sıfırla ─── */
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
  font: inherit !important;
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
  color: #94a3b8 !important;
  opacity: 0.50 !important;
  inset-inline-start: 0 !important;
  pointer-events: none !important;
}
.belge-inline .ant-input::placeholder,
.belge-inline .ant-input-number-input::placeholder,
.belge-inline .ant-picker-input > input::placeholder,
.belge-inline textarea.ant-input::placeholder {
  font: inherit !important;
  font-style: normal !important;
  color: #94a3b8 !important;
  opacity: 0.50 !important;
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
  font: inherit !important;
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
.belge-inline .inline-table-field.ant-input {
  min-height: 0 !important;
  height: auto !important;
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
.row-resize-handle:hover {
  opacity: 1 !important;
  filter: drop-shadow(0 0 3px rgba(56, 140, 255, 0.55)) !important;
}

.row-resize-handle[data-active="true"] {
  opacity: 1 !important;
  filter: drop-shadow(0 0 5px rgba(56, 140, 255, 0.70)) !important;
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
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
  line-height: 1.15 !important;
}
.description-text {
  display: inline-block;
  max-width: 100%;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.15;
  color: #4A4A4E;
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
  white-space: normal;
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
`;

export type EditingAlan =
  | 'musteri'
  | 'ayarlar'
  | 'ayar-paraBirimi'
  | 'ayar-odemeVadesi'
  | 'ayar-kdvOrani'
  | 'ayar-kur'
  | 'ayar-gecerlilik'
  | `satir-${string}`
  | 'notlar'
  | null;
