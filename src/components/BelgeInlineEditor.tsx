/**
 * BelgeInlineEditor.tsx
 * Teklif belgesi üzerinde doğrudan düzenleme.
 * PDF pipeline için kullanılmaz — yalnızca ekran görünümü.
 *
 * Alt bileşenler ayrı dosyalara taşındı:
 *   - InlineSatirEditor.tsx
 *   - belgeInlineConstants.ts
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Select, Input, DatePicker } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Teklif, Cari, TeklifSatiri } from '../types';
import { formatDate, formatDisplayNumber, formatTitleCaseTr, stripParantez, formatCariAdi } from '../utils/formatters';
import { hesaplamaMotoru, type TeklifToplam } from '../services/hesaplamaMotoru';
import { formatPhone } from '../utils/phone';
import { FinansalOzetKartIci } from './FinansalOzetKartIci';
import { InlineCariAutocompleteField } from './InlineCariAutocompleteField';
import {
  formatBirimLabel,
  formatParaBirimiLabel,
  RowCell,
  ROW_SHELL,
  ROW_TEXT,
} from './InlineTableRowShared';
import {
  DOCUMENT_BRAND,
  DOCUMENT_COLORS,
  DOCUMENT_ROOT_STYLE,
  FOOTER_BAR_STYLE,
  LOGO,
  LOGO_FILE_W,
  LOGO_OPT_H,
  LOGO_OPT_W,
  LOGO_OPT_TOP,
  LOGO_OPT_LEFT,
  noBreak,
  NOTES_BOX_STYLE,
  PARTY_BODY_STYLE,
  PARTY_CARD_STYLE,
  PARTY_GRID_STYLE,
  PARTY_LABEL_STYLE,
  PARTY_NAME_STYLE,
  ROW_CARD,
  SEMBOL,
  SETTINGS_GRID_STYLE,
  SETTINGS_CARD_STYLE,
  SETTINGS_LABEL_STYLE,
  SETTINGS_VALUE_STYLE,
  SIGNATURE_SECTION_STYLE,
  TABLE_HEAD_SUBLABEL_STYLE,
  TABLE_STYLE,
  TABLE_TITLE_STYLE,
  TableColgroup,
  buildSettingsItems,
  firstLine,
  getTableHeadCellStyle,
} from '../templates/teklifDocumentShared';
import {
  FIELD_CSS,
  type EditingAlan,
} from './belgeInlineConstants';
import { InlineSatirEditor } from './InlineSatirEditor';

const C = DOCUMENT_COLORS;
const BRAND = DOCUMENT_BRAND;

// Re-export for consumers that imported from this file
export type { EditingAlan } from './belgeInlineConstants';

interface BelgeInlineEditorProps {
  teklif: Teklif;
  totals: TeklifToplam;
  editingAlan: EditingAlan;
  onEditingAlanDegistir: (alan: EditingAlan) => void;
  onCariDegistir: (cari: Cari) => void;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  onContactNameDegistir: (name: string) => void;
  onContactTitleDegistir: (title: 'BEY' | 'HANIM') => void;
  onTarihDegistir: (tarih: string) => void;
  onParaBirimiDegistir: (pb: string) => void;
  satirBazliParaBirimi: boolean;
  onSatirBazliDegistir: (aktif: boolean) => void;
  onKdvOraniDegistir: (oran: number) => void;
  onOdemeVadesiDegistir: (vade: string) => void;
  onSatirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  onSatirSil: (id: string) => void;
  onSatirEkle: () => void;
  onSatirArayaEkle: (afterIndex: number) => void;
  onNotlarDegistir: (notlar: string) => void;
}

export default function BelgeInlineEditor({
  teklif,
  totals,
  editingAlan,
  onEditingAlanDegistir,
  onCariDegistir,
  contactName,
  contactTitle,
  onContactNameDegistir,
  onContactTitleDegistir,
  onTarihDegistir,
  onParaBirimiDegistir,
  satirBazliParaBirimi,
  onSatirBazliDegistir,
  onKdvOraniDegistir,
  onOdemeVadesiDegistir,
  onSatirGuncelle,
  onSatirSil,
  onSatirEkle,
  onSatirArayaEkle,
  onNotlarDegistir,
}: BelgeInlineEditorProps) {
  const sembol = SEMBOL[teklif.paraBirimi] ?? teklif.paraBirimi;
  const { araToplam, iskontoOrani, iskontoTutar, kdvOrani, kdvTutar, genelToplam } = totals;
  const kullanilanParaKartlari = hesaplamaMotoru.kullanilanParaBirimiKartlariniHesapla(
    teklif.satirlar, teklif.paraBirimi, kdvOrani, iskontoOrani,
  );

  const muhatapSatiri = teklif.contactName?.trim()
    ? `${formatTitleCaseTr(teklif.contactName.trim())} ${teklif.contactTitle === 'HANIM' ? 'Hanım' : 'Bey'}`
    : (teklif.cari.yetkiliKisi || null);

  // ── Hangi alan edit modunda ──
  const isMusteriEditing  = editingAlan === 'musteri';
  const isAnyAyarEditing  = editingAlan?.startsWith('ayar-') ?? false;
  const isNotlarEditing   = editingAlan === 'notlar';
  const editingSatirId    = editingAlan?.startsWith('satir-') ? editingAlan.slice(6) : null;

  // ── Muhatap alanına otomatik odaklanma ref'i ──
  const muhatapRef = useRef<InputRef>(null);

  // ── Cari arama — inline autocomplete ──
  const [cariSearchText, setCariSearchText] = useState('');
  useEffect(() => {
    if (isMusteriEditing) {
      setCariSearchText(formatCariAdi(teklif.cari.firmaAdi));
    }
  }, [isMusteriEditing, teklif.cari.firmaAdi]);

  // ── Satır bazlı odak: hangi hücreye ilk odaklanılacak ──
  const [satirFocusCell, setSatirFocusCell] = useState<string>('urunKod');

  // ── Satır hücresine tıklama — tek tık, direkt edit ──
  const handleSatirCellClick = useCallback(
    (satirId: string, cell: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      setSatirFocusCell(cell);
      onEditingAlanDegistir(`satir-${satirId}`);
    },
    [onEditingAlanDegistir],
  );

  // ── Genel alan tıklama — tek tık, direkt edit ──
  const handleAlanClick = (alan: EditingAlan, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingAlan !== alan) onEditingAlanDegistir(alan);
  };

  // ── Görsel durum: editing ya da pasif ──
  const editFrameStyle = (isEditing: boolean): React.CSSProperties => ({
    transition: 'background 0.18s ease',
    cursor: isEditing ? 'default' : 'pointer',
    ...(isEditing ? { background: 'rgba(237, 242, 251, 0.35)' } : {}),
  });

  return (
    <div
      id="teklif-sablon"
      className="belge-inline"
      style={{ ...DOCUMENT_ROOT_STYLE } as React.CSSProperties}
    >
      <style>{FIELD_CSS}{`
        /* ── Edit utility layer — belge akışı dışında ── */
        .satir-aksiyonlari { pointer-events: auto; }
        .belge-satir-hover-actions { opacity: 0; pointer-events: none; transition: opacity 0.18s; }
        tr:hover > td > .belge-satir-hover-actions,
        tr:focus-within > td > .belge-satir-hover-actions { opacity: 1; pointer-events: auto; }
        .belge-kalem-ekle-bar { transition: opacity 0.18s; }
        .belge-inline-cari-dropdown .ant-select-item {
          font-family: inherit;
          font-size: 11.5px;
          line-height: 1.35;
          letter-spacing: -0.01em;
          color: ${C.textMid};
        }
        .belge-inline-cari-dropdown .ant-select-item-option {
          padding: 6px 10px;
        }
        .belge-inline-cari-dropdown .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
          background: rgba(237, 242, 251, 0.92);
        }
        .belge-inline-cari-dropdown .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
          background: rgba(226, 232, 240, 0.96);
        }
        /* Araya satır ekleme göstergesi */
        .belge-inline-table-dropdown .ant-select-item {
          font-family: inherit;
          font-size: 11px;
          line-height: 1.35;
          letter-spacing: inherit;
          color: ${C.textMid};
        }
        .belge-inline-table-dropdown .ant-select-item-option {
          padding: 5px 8px;
        }
        .belge-inline-table-dropdown .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
          background: rgba(237, 242, 251, 0.9);
        }
        .belge-inline-table-dropdown .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
          background: rgba(226, 232, 240, 0.94);
          color: ${C.navy};
        }
        .satir-araya-ekle-zone { pointer-events: none; }
        .satir-araya-ekle-zone:hover { pointer-events: auto; }
        .satir-araya-ekle-zone:hover .satir-araya-ekle-btn,
        tr[data-satir-id]:hover + .satir-araya-ekle-zone .satir-araya-ekle-btn { opacity: 1 !important; pointer-events: auto !important; }
        /* PDF / print gizle */
        @media print {
          .satir-aksiyonlari,
          .belge-satir-hover-actions,
          .belge-kalem-ekle-bar,
          .satir-araya-ekle-zone { display: none !important; }
        }
      `}</style>

      <div style={{ flex: 1 }}>

      {/* ══ HEADER ══ */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        width: '100%',
        height: `${LOGO_OPT_H}px`,
        marginBottom: '10px',
        ...noBreak,
      }}>
        {/* Logo */}
        <div style={{ flex: '0 0 37%', maxWidth: '37%', paddingRight: '8px', boxSizing: 'border-box', lineHeight: 0 }}>
          <div style={{ position: 'relative', width: `${LOGO_OPT_W}px`, height: `${LOGO_OPT_H}px`, overflow: 'hidden' }}>
            <img src="/logo-meba.png" alt="MEBA Mekanik" style={{
              position: 'absolute', top: `${LOGO_OPT_TOP}px`, left: `${LOGO_OPT_LEFT}px`,
              width: `${LOGO_FILE_W}px`, height: `${LOGO.FILE_HEIGHT}px`,
              maxWidth: 'none', maxHeight: 'none', display: 'block',
              imageRendering: 'high-quality' as any,
              printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
            }} />
          </div>
        </div>
        {/* Firma bilgileri */}
        <div style={{ flex: '0 0 31%', maxWidth: '31%', paddingRight: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <div style={{ fontWeight: 800, fontSize: '11.5px', color: C.navy, lineHeight: '1.25', letterSpacing: '-0.012em' }}>
            MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik<br />San. Tic. Ltd. Şti.
          </div>
          <div style={{ fontSize: '9.2px', lineHeight: '1.35', color: C.textSoft, letterSpacing: '0.01em' }}>
            Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv.<br />No:252/D Melikgazi / KAYSERİ
          </div>
        </div>
        {/* Teklif bilgi bloğu */}
        <div style={{ flex: '0 0 32%', maxWidth: '32%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', boxSizing: 'border-box' }}>
          <div style={{ width: '202px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', boxSizing: 'border-box' }}>
            <div style={{
              background: BRAND.gradient, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
              padding: '5px 14px 6px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              lineHeight: 1.2, borderRadius: '9px', border: `1px solid ${BRAND.border}`, boxShadow: BRAND.shadowSm,
            }}>
              <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.8px', color: BRAND.text }}>TEKLİF</span>
              <span style={{ fontSize: '10.4px', color: BRAND.textSub, letterSpacing: '0.02em' }}>/ Quotation</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <colgroup><col style={{ width: '42%' }} /><col style={{ width: '58%' }} /></colgroup>
              <tbody>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '2px 0 1px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Teklif No</td>
                  <td style={{ fontSize: '12.1px', fontWeight: 800, color: C.navy, padding: '2px 0 1px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>{teklif.teklifNo}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: '0 0 1px 0', lineHeight: 1.2, letterSpacing: '0.04em' }}>Tarih</td>
                  <td style={{ fontSize: '10.9px', fontWeight: 400, color: C.textMid, padding: '0 0 1px 0', lineHeight: 1.2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {isAnyAyarEditing ? (
                      <DatePicker
                        size="small"
                        variant="borderless"
                        value={dayjs(teklif.tarih)}
                        onChange={(d) => d && onTarihDegistir(d.format('YYYY-MM-DD'))}
                        format="DD.MM.YYYY"
                        style={{ fontSize: '10.9px', padding: 0, width: 110 }}
                        allowClear={false}
                      />
                    ) : formatDate(teklif.tarih)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '9.2px', color: C.textMuted, padding: 0, lineHeight: 1.2, letterSpacing: '0.04em' }}>Hazırlayan</td>
                  <td style={{ fontSize: '10px', fontWeight: 400, color: C.textSoft, padding: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teklif.hazirlayanAdSoyad || 'MEBA Mekanik'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══ GÖNDEREN / ALICI ══ */}
      <div style={PARTY_GRID_STYLE}>
        <div style={PARTY_CARD_STYLE}>
          <div style={PARTY_LABEL_STYLE}>
            Gönderen <span style={{ fontWeight: 400, opacity: 0.6 }}>/ From</span>
          </div>
          <div style={PARTY_NAME_STYLE}>MEBA Mekanik Ltd. Şti.</div>
          <div style={PARTY_BODY_STYLE}>Tel: {formatPhone('03525020780')}<br />www.mebamekanik.com</div>
        </div>
        <div
          data-alan="musteri"
          onClick={(e) => handleAlanClick('musteri', e)}
          style={{ ...PARTY_CARD_STYLE, ...editFrameStyle(isMusteriEditing) }}
        >
          <div style={PARTY_LABEL_STYLE}>
            Alıcı <span style={{ fontWeight: 400, opacity: 0.6 }}>/ To</span>
          </div>
          {isMusteriEditing ? (
            <div className="field-group" style={{ padding: '2px 0' }}>
              {/* Firma seçimi — inline autocomplete */}
              <div style={{ ...PARTY_NAME_STYLE, marginBottom: 6 }}>
                <InlineCariAutocompleteField
                  autoFocus
                  style={{ width: '100%' }}
                  value={cariSearchText}
                  onChange={setCariSearchText}
                  onCariSelect={(cari) => {
                    if (cari) {
                      setCariSearchText(formatCariAdi(cari.firmaAdi));
                      onCariDegistir(cari);
                      setTimeout(() => muhatapRef.current?.focus(), 50);
                    }
                  }}
                  placeholder={formatCariAdi(teklif.cari.firmaAdi) || 'Firma adı veya cari kod...'}
                  popupMinWidth={300}
                />
              </div>
              {/* Muhatap */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: C.textMid }}>
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>Sayın</span>
                <Input
                  ref={muhatapRef}
                  size="small"
                  variant="borderless"
                  style={{ flex: 1, fontSize: '11.5px', fontWeight: 500, maxWidth: 160 }}
                  value={contactName}
                  onChange={(e) => onContactNameDegistir(e.target.value)}
                  placeholder="muhatap adı"
                  onFocus={(e) => e.target.select()}
                />
                <Select
                  size="small"
                  variant="borderless"
                  suffixIcon={null}
                  style={{ width: 72, fontSize: '11.5px' }}
                  value={contactTitle}
                  onChange={onContactTitleDegistir}
                  options={[{ value: 'BEY', label: 'Bey' }, { value: 'HANIM', label: 'Hanım' }]}
                  popupMatchSelectWidth={false}
                  dropdownStyle={{ minWidth: 90 }}
                />
              </div>
              {/* Cari bilgileri — readonly */}
              <div style={{ ...PARTY_BODY_STYLE, marginTop: 6 }}>
                {(teklif.cari.telefon || teklif.cari.ePosta) && (
                  <div>
                    {teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>}
                    {teklif.cari.telefon && teklif.cari.ePosta && <span> &nbsp;|&nbsp; </span>}
                    {teklif.cari.ePosta && <span>{teklif.cari.ePosta}</span>}
                  </div>
                )}
                {teklif.cari.vergiNo && (
                  <div>VKN: {teklif.cari.vergiNo}{teklif.cari.vergiDairesi && <span> &nbsp;—&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}</div>
                )}
                {teklif.cari.adres && <div>{teklif.cari.adres}</div>}
              </div>
            </div>
          ) : (
            <>
              <div style={PARTY_NAME_STYLE}>{formatCariAdi(teklif.cari.firmaAdi)}</div>
              <div style={PARTY_BODY_STYLE}>
                {muhatapSatiri && <div style={{ fontWeight: '500', marginBottom: '1px' }}>Sayın {muhatapSatiri}</div>}
                {(teklif.cari.telefon || teklif.cari.ePosta) && (
                  <div>
                    {teklif.cari.telefon && <span>Tel: {formatPhone(teklif.cari.telefon)}</span>}
                    {teklif.cari.telefon && teklif.cari.ePosta && <span> &nbsp;|&nbsp; </span>}
                    {teklif.cari.ePosta && <span>{teklif.cari.ePosta}</span>}
                  </div>
                )}
                {teklif.cari.vergiNo && (
                  <div>VKN: {teklif.cari.vergiNo}{teklif.cari.vergiDairesi && <span> &nbsp;—&nbsp; {teklif.cari.vergiDairesi} V.D.</span>}</div>
                )}
                {teklif.cari.adres && <div>{teklif.cari.adres}</div>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ AYARLAR ══ */}
      {(() => {
        const ayarAlanIds = ['ayar-paraBirimi', 'ayar-odemeVadesi', 'ayar-kdvOrani', 'ayar-kur', 'ayar-gecerlilik'] as const;
        const items = buildSettingsItems(teklif, satirBazliParaBirimi);

        return (
          <div style={SETTINGS_GRID_STYLE}>
            {items.map((item, i) => {
              const alanId = ayarAlanIds[i];
              const isEditing = editingAlan === alanId;

              return (
                <div
                  key={alanId}
                  data-alan={alanId}
                  onClick={(e) => handleAlanClick(alanId, e)}
                  style={{
                    ...SETTINGS_CARD_STYLE,
                    cursor: isEditing ? 'default' : 'pointer',
                    transition: 'background 0.18s ease, box-shadow 0.18s ease',
                    ...(isEditing ? { background: '#eef2fb', boxShadow: '0 1px 3px rgba(37,99,235,0.10)' } : {}),
                  }}
                >
                  {isEditing ? (
                    <div className="field-group">
                      <div style={{ ...SETTINGS_LABEL_STYLE, marginBottom: '4px' }}>{item.tr}</div>
                      {i === 0 && (
                        <Select
                          size="small" variant="borderless" suffixIcon={null}
                          style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
                          value={teklif.paraBirimi}
                          onChange={onParaBirimiDegistir}
                          options={[{ value: 'TRY', label: 'TL' }, { value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }]}
                          popupMatchSelectWidth={100}
                        />
                      )}
                      {i === 1 && (
                        <Select
                          size="small" variant="borderless" suffixIcon={null}
                          style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
                          value={teklif.odemeVadesi || '45 Gün'}
                          onChange={onOdemeVadesiDegistir}
                          options={['Peşin', '15 Gün', '30 Gün', '45 Gün', '60 Gün', '90 Gün'].map(v => ({ value: v, label: v }))}
                          popupMatchSelectWidth={100}
                        />
                      )}
                      {i === 2 && (
                        <Select
                          size="small" variant="borderless" suffixIcon={null}
                          style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
                          value={teklif.kdvOrani}
                          onChange={onKdvOraniDegistir}
                          options={[{ value: 0, label: 'Hariç' }, { value: 1, label: '%1' }, { value: 10, label: '%10' }, { value: 20, label: '%20' }]}
                          popupMatchSelectWidth={80}
                        />
                      )}
                      {i === 3 && <div style={SETTINGS_VALUE_STYLE}>TCMB Fatura</div>}
                      {i === 4 && <div style={SETTINGS_VALUE_STYLE}>{teklif.gecerlilikSuresi ?? '1 Hafta'}</div>}
                    </div>
                  ) : (
                    <>
                      <div style={SETTINGS_LABEL_STYLE}>
                        {item.tr}<span style={{ fontWeight: 400, opacity: 0.55, fontSize: '8px' }}> / {item.en}</span>
                      </div>
                      <div style={SETTINGS_VALUE_STYLE}>{item.value}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ══ TEKLİF KALEMLERİ ══ */}
      <div style={TABLE_TITLE_STYLE}>
        Teklif Kalemleri <span style={{ fontWeight: 400, opacity: 0.55 }}>/ Line Items</span>
      </div>
      <table style={{
        ...TABLE_STYLE,
        borderLeft: 'none', borderRight: 'none', marginBottom: '0px',
        printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}>
        <TableColgroup satirBazliParaBirimi={satirBazliParaBirimi} />
        <thead id="pdf-thead">
          <tr>
            {[
              { label: '#',           sub: '',           align: 'center' as const },
              { label: 'Marka',       sub: 'Brand',      align: 'center' as const },
              { label: 'Ürün Kodu',   sub: 'Item No',    align: 'left'   as const },
              { label: 'Açıklama',    sub: 'Description',align: 'left'   as const },
              { label: 'Miktar',      sub: 'Qty',        align: 'center' as const },
              ...(satirBazliParaBirimi ? [{ label: 'Para Birimi', sub: 'Currency', align: 'center' as const, fontSize: '9.8px' }] : []),
              { label: 'Birim Fiyat', sub: 'Unit Price', align: 'right'  as const },
              { label: 'Toplam',      sub: 'Total',      align: 'right'  as const },
              { label: 'Teslimat',    sub: 'Delivery',   align: 'center' as const },
            ].map((col, i) => (
              <th key={i} style={getTableHeadCellStyle(col.align)}>
                {col.label}
                {col.sub && (
                  <span style={{ ...TABLE_HEAD_SUBLABEL_STYLE, textAlign: col.align }}>
                    {col.sub}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr aria-hidden="true">
            <td colSpan={satirBazliParaBirimi ? 9 : 8} style={{ height: '4px', padding: 0, border: 'none', background: 'transparent' }} />
          </tr>

          {teklif.satirlar.map((satir, idx) => {
            const satirPb  = hesaplamaMotoru.satirParaBirimiGetir(satir, teklif.paraBirimi);
            const isEditing = editingSatirId === satir.id;
            const colCount = satirBazliParaBirimi ? 9 : 8;

            // ── Araya satır ekleme çizgisi (her satırın altında) ──
            const insertIndicator = (
              <tr key={`insert-${satir.id}`} className="satir-araya-ekle-zone" style={{ height: 0 }}>
                <td colSpan={colCount} style={{ padding: 0, border: 'none', position: 'relative', height: 0, overflow: 'visible' }}>
                  <div
                    className="satir-araya-ekle-btn"
                    onClick={(e) => { e.stopPropagation(); onSatirArayaEkle(idx); }}
                    style={{
                      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                      zIndex: 45, display: 'flex', alignItems: 'center', gap: 4,
                      padding: '1px 10px', borderRadius: 10,
                      background: 'rgba(37,99,235,0.07)', border: `1px solid ${C.accent}`,
                      color: C.accent, fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                      opacity: 0, transition: 'opacity 0.18s',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap', letterSpacing: '0.01em',
                    }}
                  >
                    <PlusOutlined style={{ fontSize: 8 }} /> Araya ekle
                  </div>
                </td>
              </tr>
            );

            if (isEditing) {
              return (
                <React.Fragment key={satir.id}>
                <InlineSatirEditor
                  key={satir.id}
                  satir={satir}
                  idx={idx}
                  paraBirimi={teklif.paraBirimi}
                  satirBazliParaBirimi={satirBazliParaBirimi}
                  focusCell={satirFocusCell}
                  onGuncelle={(alan, deger) => onSatirGuncelle(satir.id, alan, deger)}
                  onSil={() => onSatirSil(satir.id)}
                  onArayaEkle={() => onSatirArayaEkle(idx)}
                  onSatirBazliDegistir={onSatirBazliDegistir}
                />
                {insertIndicator}
                </React.Fragment>
              );
            }

            // ── Statik satır — hücre bazlı tıklama ──
            const cellClick = (cell: string) => handleSatirCellClick(satir.id, cell);

            return (
              <React.Fragment key={satir.id}>
              <tr data-satir-id={satir.id} style={{ ...noBreak }}>

                {/* # → urunKod odağı */}
                <RowCell idx={idx} pos="first" onClick={cellClick('urunKod')} style={{ ...ROW_TEXT.no, cursor: 'pointer' }}>
                  {String(idx + 1).padStart(2, '0')}
                </RowCell>

                {/* Marka */}
                <RowCell idx={idx} pos="mid" onClick={cellClick('marka')} style={{ cursor: 'pointer' }}>
                  <span style={ROW_TEXT.brand}>{satir.marka || '—'}</span>
                </RowCell>

                {/* Ürün Kodu */}
                <RowCell idx={idx} pos="mid" onClick={cellClick('urunKod')} style={{ cursor: 'pointer' }}>
                  <span style={ROW_TEXT.code}>{satir.urunKod || '—'}</span>
                </RowCell>

                {/* Açıklama — display transform (stripParantez/firstLine) sadece görüntüde */}
                <RowCell idx={idx} pos="mid" onClick={cellClick('aciklama')} style={{ cursor: 'pointer' }}>
                  <span style={ROW_TEXT.description}>{firstLine(stripParantez(satir.urunAdi)) || '—'}</span>
                </RowCell>

                {/* Miktar */}
                <RowCell idx={idx} pos="mid" onClick={cellClick('miktar')} style={{ cursor: 'pointer' }}>
                  {satir.miktar !== 0 ? (
                    <div style={ROW_SHELL.quantityWrap}>
                      <span style={{ ...ROW_TEXT.quantityValue, ...ROW_SHELL.quantityValueWrap }}>{formatDisplayNumber(satir.miktar, 0, 4)}</span>
                      <span style={{ ...ROW_TEXT.quantityUnit, ...ROW_SHELL.quantityUnitWrap }}>{formatBirimLabel(satir.birim)}</span>
                    </div>
                  ) : '—'}
                </RowCell>

                {/* Para Birimi (satirBazli) */}
                {satirBazliParaBirimi && (
                  <RowCell idx={idx} pos="mid" onClick={cellClick('birimFiyat')} style={{ cursor: 'pointer' }}>
                    <span style={ROW_TEXT.currency}>{formatParaBirimiLabel(satirPb)}</span>
                  </RowCell>
                )}

                {/* Birim Fiyat */}
                <RowCell idx={idx} pos="mid" onClick={cellClick('birimFiyat')} style={{ cursor: 'pointer' }}>
                  <span style={ROW_TEXT.price}>{(() => {
                    const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
                    return nihai !== 0
                      ? `${formatDisplayNumber(nihai, 2, 2)}${satirBazliParaBirimi ? ` ${formatParaBirimiLabel(satirPb)}` : ''}`
                      : '—';
                  })()}</span>
                </RowCell>

                {/* Toplam */}
                <RowCell idx={idx} pos="mid" onClick={cellClick('birimFiyat')} style={{ cursor: 'pointer' }}>
                  <span style={ROW_TEXT.total}>
                    {satir.satirToplami !== 0
                      ? `${formatDisplayNumber(satir.satirToplami, 2, 2)}${satirBazliParaBirimi ? ` ${formatParaBirimiLabel(satirPb)}` : ''}`
                      : '—'}
                  </span>
                </RowCell>

                {/* Teslimat — position: relative for hover actions */}
                <RowCell idx={idx} pos="last" onClick={cellClick('teslimat')} style={{ position: 'relative', cursor: 'pointer' }}>
                  <span style={ROW_TEXT.delivery}>{satir.teslimTarihi || '—'}</span>

                  {/* İskonto rozeti — sadece iskonto varsa */}
                  {(satir.indirimOrani || 0) > 0 && (
                    <span style={{
                      position: 'absolute', top: 2, right: 2,
                      fontSize: '7.5px', fontWeight: 700, color: C.accent,
                      background: 'rgba(37,99,235,0.08)', borderRadius: '3px',
                      padding: '1px 3px', lineHeight: 1, letterSpacing: '0.02em',
                      pointerEvents: 'none',
                    }}>
                      –{satir.indirimOrani}%
                    </span>
                  )}

                  {/* Hover aksiyonlar — belge akışı dışında */}
                  <div className="belge-satir-hover-actions" style={{
                    position: 'absolute', right: -2, top: '50%', transform: 'translateY(-50%)',
                    zIndex: 40, display: 'flex', gap: '2px',
                  }}>
                    <span
                      onClick={(e) => { e.stopPropagation(); onSatirSil(satir.id); }}
                      style={{
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 20, height: 20, borderRadius: '4px',
                        background: 'rgba(255,255,255,0.95)', border: `0.75px solid ${C.borderSoft}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        color: '#b91c1c', fontSize: '9px', transition: 'background 0.15s, transform 0.1s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(185,28,28,0.08)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                        title="Satırı sil"
                    >
                      <DeleteOutlined />
                    </span>
                  </div>
                </RowCell>
              </tr>
              {insertIndicator}
              </React.Fragment>
            );
          })}

          {/* Boş liste ipucu */}
          {teklif.satirlar.length === 0 && (
            <tr>
              <td
                colSpan={satirBazliParaBirimi ? 9 : 8}
                onClick={(e) => { e.stopPropagation(); onSatirEkle(); }}
                style={{
                  padding: '14px 7px', textAlign: 'center', fontSize: '11px', color: C.textMuted,
                  cursor: 'pointer', border: `1px dashed ${C.borderSoft}`, borderRadius: ROW_CARD.radius,
                  background: 'rgba(37, 99, 235, 0.02)', transition: 'background 0.15s',
                }}
              >
                <PlusOutlined style={{ marginRight: 6, fontSize: 11 }} />
                İlk kalem satırını eklemek için tıklayın
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── Yeni kalem ekle — belge akışı dışında, tablo alt kenarına hizalı ── */}
      {teklif.satirlar.length > 0 && (
        <div
          className="belge-kalem-ekle-bar"
          onClick={(e) => { e.stopPropagation(); onSatirEkle(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '5px 0',
            cursor: 'pointer',
            fontSize: '9.5px', fontWeight: 600, color: C.accent, letterSpacing: '0.01em',
            opacity: 0.55,
            userSelect: 'none',
            transition: 'opacity 0.18s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.55')}
        >
          <PlusOutlined style={{ fontSize: 9 }} /> Yeni kalem ekle
        </div>
      )}

      {/* ══ TOPLAM ══ */}
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        marginTop: satirBazliParaBirimi ? '10px' : '6px', marginBottom: '14px',
        tableLayout: 'fixed', borderLeft: 'none', borderRight: 'none',
        borderTop: satirBazliParaBirimi ? `1px solid ${C.border}` : 'none',
        borderBottom: satirBazliParaBirimi ? `1px solid ${C.border}` : 'none',
        printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', ...noBreak,
      } as React.CSSProperties}>
        <colgroup>
          <col style={{ width: '56%' }} />
          <col />
        </colgroup>
        <tbody>
          {!satirBazliParaBirimi ? (() => {
            const hasDetail = iskontoOrani > 0 || kdvOrani > 0;
            const kartStyle: React.CSSProperties = {
              boxSizing: 'border-box', border: '0.75px solid #1A2B42', borderRadius: '8px',
              background: 'linear-gradient(180deg, #1E3350 0%, #152740 55%, #0F1D30 100%)',
              boxShadow: '0 2px 8px rgba(15,25,40,0.10)',
              printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
            };
            const fmtN = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const pbLabel = teklif.paraBirimi === 'TRY' ? 'TL' : teklif.paraBirimi;
            const detayRow = (label: string, value: number, color: string, sign: '' | '–' | '+') => {
              const s = fmtN(value); const ci = s.lastIndexOf(','); const int = ci >= 0 ? s.slice(0, ci) : s; const dec = ci >= 0 ? s.slice(ci) : '';
              return (
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2px' }}>
                  <span style={{ flex: 1, paddingLeft: '3px', fontSize: '8.5px', lineHeight: 1.2, color, whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</span>
                  <span style={{ width: 8, flexShrink: 0, textAlign: 'right', fontSize: '8.5px', lineHeight: 1.2, color, fontWeight: sign ? 700 : undefined }}>{sign || null}</span>
                  <span style={{ width: 64, flexShrink: 0, display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ flex: 1, textAlign: 'right', fontSize: '8.5px', lineHeight: 1.2, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color, whiteSpace: 'nowrap' }}>{int}</span>
                    <span style={{ width: 16, flexShrink: 0, fontSize: '8.5px', lineHeight: 1.2, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color, whiteSpace: 'nowrap' }}>{dec}</span>
                  </span>
                </div>
              );
            };
            return (
              <tr>
                <td style={{ borderTop: 'none', borderBottom: 'none' }} />
                <td style={{ padding: '8px 0 10px', borderTop: 'none', borderBottom: 'none', verticalAlign: 'top' }}>
                  {!hasDetail ? (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', ...kartStyle }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: BRAND.text, lineHeight: 1 }}>Genel Toplam</span>
                        <span style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.04em', color: BRAND.textSub, lineHeight: 1 }}>Grand Total</span>
                      </div>
                      <div style={{ flex: 1 }} />
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
                        <span style={{ fontSize: '9px', color: BRAND.textLabel, lineHeight: 1, alignSelf: 'flex-end', paddingBottom: '1px' }}>{sembol}</span>
                        <span style={{ fontSize: genelToplam >= 1e6 ? '14px' : '17px', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: BRAND.text, whiteSpace: 'nowrap' }}>{fmtN(genelToplam)}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '9px 14px', ...kartStyle }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: BRAND.text, lineHeight: 1 }}>Genel Toplam</span>
                        <span style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.04em', color: BRAND.textSub, lineHeight: 1 }}>Grand Total</span>
                      </div>
                      {detayRow('Ara Toplam', araToplam, BRAND.textSub, '')}
                      {iskontoOrani > 0 && detayRow(`İskonto %${iskontoOrani}`, iskontoTutar, '#fca5a5', '–')}
                      {kdvOrani > 0 && detayRow(`KDV %${kdvOrani}`, kdvTutar, '#86efac', '+')}
                      <div style={{ borderTop: `0.75px solid ${BRAND.separator}`, margin: '5px 0 4px' }} />
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: BRAND.textSub, lineHeight: 1 }}>{pbLabel}</span>
                        <div style={{ flex: 1 }} />
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
                          <span style={{ fontSize: '9px', color: BRAND.textLabel, lineHeight: 1, alignSelf: 'flex-end', paddingBottom: '1px' }}>{sembol}</span>
                          <span style={{ fontSize: genelToplam >= 1e6 ? '14px' : '17px', fontWeight: 900, lineHeight: 1.06, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: BRAND.text, whiteSpace: 'nowrap' }}>{fmtN(genelToplam)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })() : (() => {
            const kartlar = kullanilanParaKartlari;
            const KART_W = 220; const KART_H = 86; const KART_GAP = 8;
            return (
              <tr>
                <td colSpan={2} style={{ padding: '8px 10px 10px', borderBottom: 'none' }}>
                  <div style={{
                    width: '100%', boxSizing: 'border-box', minHeight: `${KART_H + 26}px`,
                    border: '0.75px solid #1A2B42', borderRadius: '8px',
                    background: 'linear-gradient(180deg, #1E3350 0%, #152740 55%, #0F1D30 100%)',
                    padding: '7px 8px 8px', boxShadow: '0 2px 8px rgba(15,25,40,0.10)',
                    printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
                  } as React.CSSProperties}>
                    <div style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: BRAND.textLabel, lineHeight: 1, paddingBottom: '6px', paddingLeft: '2px' }}>
                      Genel Toplamlar / Grand Total
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: kartlar.length >= 3 ? 'flex-start' : 'flex-end', alignItems: 'flex-start', gap: `${KART_GAP}px` }}>
                      {kartlar.map((item) => (
                        <div key={item.pb} style={{
                          width: `${KART_W}px`, minWidth: `${KART_W}px`, maxWidth: `${KART_W}px`,
                          height: `${KART_H}px`, minHeight: `${KART_H}px`, maxHeight: `${KART_H}px`,
                          flexShrink: 0, position: 'relative', boxSizing: 'border-box', borderRadius: '10px',
                          border: '0.75px solid #E8E6E3', background: '#FFFFFF',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
                        } as React.CSSProperties}>
                          <FinansalOzetKartIci araToplam={item.araToplam} iskontoOrani={iskontoOrani} iskontoTutar={item.iskontoTutar} kdvOrani={kdvOrani} kdvTutar={item.kdvTutar} genelToplam={item.total} paraBirimi={item.pb} variant="pdf" />
                        </div>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })()}
        </tbody>
      </table>

      {/* ══ NOTLAR ══ */}
      <div
        data-alan="notlar"
        onClick={(e) => handleAlanClick('notlar', e)}
        style={{
          ...NOTES_BOX_STYLE,
          minHeight: isNotlarEditing ? 60 : (teklif.notlar ? undefined : 44),
          ...noBreak, ...editFrameStyle(isNotlarEditing),
        } as React.CSSProperties}
      >
        {isNotlarEditing ? (
          <div className="field-group">
            <div style={{ fontSize: '8.5px', fontWeight: 700, color: C.navy, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5, opacity: 0.7 }}>
              Notlar <span style={{ fontWeight: 400, opacity: 0.6 }}>/ Notes</span>
            </div>
            <Input.TextArea
              autoFocus
              variant="borderless"
              value={teklif.notlar}
              onChange={(e) => onNotlarDegistir(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 8 }}
              style={{ fontSize: '12.5px', lineHeight: '1.65', color: C.textMid, padding: 0 }}
              placeholder="Not ekleyin..."
            />
          </div>
        ) : (
          teklif.notlar ? (
            <>
              <strong style={{ color: C.navy, fontSize: '11px', letterSpacing: '0.02em' }}>Notlar / Notes:&nbsp;</strong>
              <span style={{ color: C.textMid }}>{teklif.notlar}</span>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 24 }}>
              <span style={{ color: C.textMuted, fontStyle: 'italic', fontSize: '11px', opacity: 0.65 }}>
                Not eklemek için tıklayın...
              </span>
            </div>
          )
        )}
      </div>

      </div>

      {/* ── KAŞE / İMZA + FOOTER ── */}
      <div id="pdf-bottom-block">
        <div style={SIGNATURE_SECTION_STYLE}>
          <div style={{ color: C.textMuted, fontSize: '11.7px', fontWeight: 500, letterSpacing: '0.01em', marginBottom: '9px' }}>
            Siparişi Veren / Authorised Person
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
            <div style={{ flex: '0 0 40%', fontSize: '11.7px', lineHeight: '1.45', color: C.textMid }}>
              <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.border}`, height: '25px' }} />
              <div style={{ color: C.textMuted, marginBottom: '9px', marginTop: '3px' }}>İsim / Name</div>
              <div style={{ marginRight: '2cm', borderBottom: `1px solid ${C.border}`, height: '25px' }} />
              <div style={{ color: C.textMuted, marginTop: '3px' }}>Tarih / Date</div>
            </div>
            <div style={{ flex: '1', fontSize: '11.7px', lineHeight: '1.45', color: C.textMid, paddingTop: '54px' }}>
              <div style={{ width: '115px', marginLeft: '-2cm', borderBottom: `1px solid ${C.border}`, height: '25px' }} />
              <div style={{ color: C.textMuted, marginTop: '3px', marginLeft: '-2cm' }}>İmza / Signature</div>
            </div>
          </div>
        </div>
        <div id="pdf-page-footer" style={FOOTER_BAR_STYLE}>
          <div>MEBA Pnömatik Hidrolik Makina &nbsp;|&nbsp; KAYSERİ &nbsp;|&nbsp; info@mebamekanik.com</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>Teklif No: {teklif.teklifNo} &nbsp;|&nbsp; {formatDate(teklif.tarih)} &nbsp;|&nbsp; www.mebamekanik.com</div>
        </div>
      </div>
    </div>
  );
}
