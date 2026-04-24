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
  padding: 0 2px !important;
  height: 1.4em !important;
  min-height: 1.4em !important;
  text-align: inherit !important;
  min-width: 0 !important;
  cursor: text !important;
  box-sizing: content-box !important;
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
  height: 1.4em !important;
  min-height: 1.4em !important;
  padding: 0 2px !important;
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
   ROW HEIGHT STABILITY — edit mode view ile aynı yükseklikte kalır
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline tr[data-satir-id] > td,
.belge-inline tr[data-editing] > td {
  padding: 3px 8px !important;              /* CELL_PAD aynı */
  vertical-align: middle !important;
}
/* Edit input'ları ve span'lar aynı line-height'ta render */
.belge-inline tr[data-editing] .inline-table-field,
.belge-inline tr[data-editing] .inline-table-field .ant-select-content,
.belge-inline tr[data-editing] .inline-table-field .ant-input,
.belge-inline tr[data-editing] .inline-table-field .ant-input-number-input {
  line-height: 1.35 !important;
  min-height: 0 !important;
}

/* ══════════════════════════════════════════════════════════════════════
   FOCUS: Sıfır layout değişimi — sadece hafif alt çizgi
   ══════════════════════════════════════════════════════════════════════ */
.belge-inline tr[data-editing] td:focus-within {
  box-shadow: none !important;
}
.belge-inline tr[data-editing] td {
  vertical-align: middle !important;
}
.belge-inline .inline-table-field.ant-input-number:focus-within,
.belge-inline .inline-table-field.ant-input-number-focused,
.belge-inline .inline-table-field.ant-select-focused .ant-select-content,
.belge-inline tr[data-editing] input:focus,
.belge-inline tr[data-editing] textarea:focus {
  box-shadow: none !important;
  outline: none !important;
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
