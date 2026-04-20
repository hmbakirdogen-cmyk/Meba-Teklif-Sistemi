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
/* ═══ BASE ═══ */
/* ant-select-input intentionally excluded: color:inherit would cascade transparent from
   ant-select-content-has-search-value → selected/typed text invisible */
.belge-inline .ant-select,
.belge-inline .ant-input,
.belge-inline .ant-input-number,
.belge-inline .ant-picker,
.belge-inline .ant-input-number-input,
.belge-inline .ant-picker-input > input {
  font-family: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  color: inherit !important;
  line-height: inherit !important;
  letter-spacing: inherit !important;
  text-rendering: geometricPrecision !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.belge-inline .ant-select-input {
  font-family: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  line-height: inherit !important;
  letter-spacing: inherit !important;
  text-rendering: geometricPrecision !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ═══ CARET & SELECTION ═══ */
.belge-inline input,
.belge-inline textarea {
  caret-color: ${FIELD.caret} !important;
}
.belge-inline ::selection {
  background: rgba(37, 99, 235, 0.12);
}

/* ═══ SELECT: Ghost ═══ */
/* v6: ant-select root has display:inline-flex + CSS-var padding/height/border/bg.
   We also clear the CSS variables so AntD's own CSS reads 0/transparent values. */
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
/* v6: ant-select-content replaces ant-select-selector as the inner container */
.belge-inline .ant-select-content {
  padding: 0 !important;
  margin-inline-end: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  line-height: inherit !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
/* v6: single-value display (was ant-select-selection-item in v5) */
.belge-inline .ant-select-content-value {
  padding-inline-end: 0 !important;
  padding-inline-start: 0 !important;
  line-height: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  letter-spacing: inherit !important;
  color: inherit !important;
}
/* multiple mode tag items still use selection-item */
.belge-inline .ant-select-selection-item {
  padding-inline-end: 0 !important;
  padding-inline-start: 0 !important;
  line-height: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  letter-spacing: inherit !important;
  color: inherit !important;
}
/* v6: ant-select-input is the search input (was ant-select-selection-search-input).
   In single mode it is position:absolute inset:0 — keep it so it overlays the value text. */
.belge-inline .ant-select-input {
  height: auto !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* ═══ SELECT: suffix / arrow / clear gizle ═══ */
.belge-inline .ant-select-suffix,
.belge-inline .ant-select-arrow,
.belge-inline .ant-select-clear {
  display: none !important;
}

/* ═══ PLACEHOLDER ═══ */
/* v6: ant-select-placeholder replaces ant-select-selection-placeholder */
.belge-inline .ant-select-placeholder {
  color: #94a3b8 !important;
  opacity: 0.65 !important;
  font-style: italic !important;
  inset-inline-start: 0 !important;
}
.belge-inline .ant-input::placeholder,
.belge-inline .ant-input-number-input::placeholder,
.belge-inline .ant-picker-input > input::placeholder,
.belge-inline textarea.ant-input::placeholder {
  color: #94a3b8 !important;
  opacity: 0.65 !important;
  font-style: italic !important;
}

/* ═══ INPUT: Ghost ═══ */
.belge-inline .ant-input {
  padding: 0 !important;
  height: auto !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  font: inherit !important;
  letter-spacing: inherit !important;
  line-height: inherit !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  outline: none !important;
}

/* ═══ INPUT NUMBER: Ghost ═══ */
.belge-inline .ant-input-number {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  min-width: 0 !important;
  cursor: text !important;
}
.belge-inline .ant-input-number-input {
  padding: 0 2px !important;
  height: 1.4em !important;
  min-height: 1.4em !important;
  text-align: inherit !important;
  min-width: 0 !important;
  cursor: text !important;
  box-sizing: content-box !important;
}
/* v6: ant-input-number-actions replaces ant-input-number-handler-wrap */
.belge-inline .ant-input-number-actions,
.belge-inline .ant-input-number-handler-wrap {
  display: none !important;
}

/* ═══ AUTOCOMPLETE: ghost + width lock ═══ */
/* .ant-select-content is the inner container; .ant-select-input is the actual <input> */
.belge-inline .ant-select-auto-complete .ant-select-content {
  padding: 0 !important;
  overflow: hidden !important;
}
/* width: 100% !important overrides any JS-set inline width on the input,
   preventing column expansion while typing (CSS !important beats inline styles). */
.belge-inline .ant-select-auto-complete .ant-select-input {
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
  font-family: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  letter-spacing: inherit !important;
  line-height: inherit !important;
  text-rendering: geometricPrecision !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.belge-inline .ant-select-auto-complete .ant-select-placeholder {
  inset-inline-start: 0 !important;
  font-family: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  letter-spacing: inherit !important;
  line-height: inherit !important;
  color: inherit !important;
  opacity: 0.48 !important;
  font-style: normal !important;
}

/* ═══ DATEPICKER: Ghost ═══ */
.belge-inline .ant-picker {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.belge-inline .ant-picker-input > input {
  font-size: inherit !important;
}
.belge-inline .ant-picker-suffix,
.belge-inline .ant-picker-clear {
  display: none !important;
}

/* ═══ TEXTAREA: Ghost ═══ */
.belge-inline textarea.ant-input {
  resize: none !important;
}

/* ═══ FOCUS: Tablo hücreleri ═══ */
.belge-inline tr[data-editing] td:focus-within {
  box-shadow: none !important;
}

/* ═══ SIZE-SM: AntD v6 küçük boyut sabit yüksekliklerini sıfırla ═══ */
.belge-inline .ant-select-sm .ant-select-content {
  height: auto !important;
  min-height: 0 !important;
  padding: 0 !important;
}
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

/* ═══ INLINE TABLE FIELDS ═══ */
.belge-inline .inline-table-field {
  width: 100% !important;
  min-width: 0 !important;
  font: inherit !important;
  color: inherit !important;
  line-height: inherit !important;
  letter-spacing: inherit !important;
}

/* AntD v6 Select root: inline-flex → block, CSS-var padding/height sıfırla */
.belge-inline .inline-table-field.ant-select {
  display: block !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  /* computed property overrides */
  padding: 0 !important;
  padding-inline: 0 !important;
  padding-block: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  /* CSS variable overrides (AntD v6 reads these) */
  --ant-select-height: auto !important;
  --ant-select-padding-horizontal: 0px !important;
  --ant-select-padding-vertical: 0px !important;
  --ant-select-border-size: 0px !important;
  --ant-select-border-color: transparent !important;
  --ant-select-background-color: transparent !important;
}

/* ant-select-content: value/search wrapper — AntD v6 uses flex:auto inside inline-flex.
   After we make parent block, this must also be block + constrained. */
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

.belge-inline .inline-table-field.ant-input-number {
  display: block !important;
  height: auto !important;
  min-height: 0 !important;
}
.belge-inline .inline-table-field.ant-input {
  min-height: 0 !important;
  height: auto !important;
}
/* value-display ve placeholder: color inherit (bunlarda transparent override yok) */
.belge-inline .inline-table-field .ant-select-content-value,
.belge-inline .inline-table-field .ant-select-placeholder {
  font: inherit !important;
  color: inherit !important;
  line-height: inherit !important;
  letter-spacing: inherit !important;
  text-align: inherit !important;
}
/* ant-select-input: color inherit YASAK — parent content 'color:transparent' dönemlerde
   input da transparent olur, seçili metin görünmez. AntD'nin CSS var rengi kalmalı. */
.belge-inline .inline-table-field .ant-select-input {
  font: inherit !important;
  line-height: inherit !important;
  letter-spacing: inherit !important;
  text-align: inherit !important;
  min-width: 0 !important;
}
.belge-inline .inline-table-field input:not(.ant-select-input),
.belge-inline .inline-table-field textarea {
  font: inherit !important;
  color: inherit !important;
  line-height: inherit !important;
  letter-spacing: inherit !important;
  text-align: inherit !important;
  min-width: 0 !important;
}
.belge-inline .inline-table-field .ant-select-placeholder,
.belge-inline .inline-table-field input::placeholder,
.belge-inline .inline-table-field textarea::placeholder {
  font-style: normal !important;
  opacity: 0.42 !important;
}
.belge-inline .inline-table-field.ant-input-number .ant-input-number-input {
  padding: 0 !important;
  height: auto !important;
  min-height: 0 !important;
}

/* ═══ FOCUS: Alan grupları ═══ */
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

/* ═══ CHECKBOX ═══ */
.belge-inline input[type="checkbox"] {
  accent-color: ${FIELD.caret};
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
