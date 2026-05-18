/**
 * SatirRow.tsx
 * ─────────────────────────────────────────────────────────────────
 * Tek bir teklif satırının tüm <td>'lerini render eden memoize edilmiş satır
 * component'i. PaginatedBelgeInlineEditor satırı inline render etmek yerine
 * burayı kullanır → sadece prop'u değişen satır re-render olur.
 *
 * insertAbove/insertIndicator (sibling tr'ler) parent map'inde KALIR — bu
 * component sadece `<tr data-satir-id="...">` ve içindeki 9 RowCell'i üretir.
 *
 * Curried `cellClick` parent'ta flatten edildi:
 *   parent: onCellClick(satirId, cell, e)
 *   here:   onClick={(e) => onCellClick(satir.id, 'urunKod', e)}
 * Inline closure yalnızca SatirRow scope'unda; parent'tan gelen onCellClick
 * stable useCallback olduğu sürece memo bozulmaz.
 */

import React, { memo, useState } from 'react';
import type { TeklifSatiri } from '../types';
import { formatDisplayNumber, formatMarka } from '../utils/formatters';
import type { SatirCellField } from './inlineSatirEditorShared';
import { EditableField } from './EditableField';
import {
  formatBirimAbbrev,
  formatParaBirimiLabel,
  RowCell,
  ROW_SHELL,
  ROW_TEXT,
  DescText,
} from './InlineTableRowShared';
import {
  noBreak,
  getOfferTableSeparatorClass,
  getOfferTableSeparatorStyle,
  getSetStepClass,
  renderSetSubitemNumber,
  SET_SUBITEM_NUMBER_STYLE,
  LINE_ITEM_METRICS,
  type SetGroupPos,
} from '../templates/teklifDocumentShared';
import { SatirAksiyonlariPanel, SatirIskontoRozeti } from './InlineSatirEditor';
import { getMarkedCellStyle } from './paginatedBelgeInlineHelpers';

export interface SatirRowProps {
  satir: TeklifSatiri;
  idx: number;
  /** Hücrenin sat parası — parent: hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi) */
  satirPb: string;
  /** Computed: computeMainItemIndex(satirlar, idx) */
  mainItemIndex: number;
  /** Computed: computeSetSubitemIndex(satirlar, idx) ?? 1 (sadece setAltKalem ise kullanılır) */
  setSubitemIndex: number;
  setGroupPos: SetGroupPos;
  isMarked: boolean;
  isRowActive: boolean;
  isHoverRow: boolean;
  /** Aktif satırda hangi hücre edit modunda; satır aktif değilse null. */
  activeCellField: SatirCellField | null;
  satirBazliParaBirimi: boolean;
  satirBazliIskonto: boolean;
  readOnly: boolean;
  // Callbacks — TÜMÜ stable (parent useCallback)
  onCellClick: (satirId: string, cell: SatirCellField, e: React.MouseEvent) => void;
  onRowEnter: (satirId: string) => void;
  onRowLeave: (satirId: string) => void;
  onToggleMark: (satirId: string) => (e: React.MouseEvent) => void;
  onSatirSil: (id: string) => void;
  onReferanslarAc: (satirId: string) => void;
}

function SatirRowImpl({
  satir,
  idx,
  satirPb,
  mainItemIndex,
  setSubitemIndex,
  setGroupPos,
  isMarked,
  isRowActive,
  isHoverRow,
  activeCellField,
  satirBazliParaBirimi,
  satirBazliIskonto,
  readOnly,
  onCellClick,
  onRowEnter,
  onRowLeave,
  onToggleMark,
  onSatirSil,
  onReferanslarAc,
}: SatirRowProps) {
  const isActiveCell = (cell: SatirCellField) => isRowActive && activeCellField === cell;
  const activeClass = (cell: SatirCellField) => (isActiveCell(cell) ? 'is-active-cell' : undefined);
  const handleClick = (cell: SatirCellField) => (e: React.MouseEvent) =>
    onCellClick(satir.id, cell, e);
  const noCellContentStyle: React.CSSProperties = {
    display: 'inline-flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: LINE_ITEM_METRICS.lineHeight,
    fontVariantNumeric: 'tabular-nums',
  };

  // Aksiyon paneli ile etkileşim (mouse hover veya input focus). Kullanıcı
  // iskonto yazarken satır hover'ı kaybolsa bile panel açık kalsın diye
  // local state. Panel onInteract callback ile true/false bildirir.
  const [isPanelInteracting, setIsPanelInteracting] = useState(false);

  return (
    <tr
      data-satir-id={satir.id}
      data-marked={isMarked ? 'true' : undefined}
      onMouseEnter={() => onRowEnter(satir.id)}
      onMouseLeave={() => onRowLeave(satir.id)}
      style={{
        ...noBreak,
        ...(satir.rowHeight && satir.rowHeight > 0 ? { height: `${satir.rowHeight}px` } : null),
      }}
    >
      <RowCell
        idx={idx}
        pos="first"
        setGroupPos={setGroupPos}
        style={{
          ...ROW_TEXT.no,
          ...getMarkedCellStyle(isMarked, 'first', false, setGroupPos !== null),
        }}
      >
        {satir.setAltKalem ? (
          <span
            onClick={onToggleMark(satir.id)}
            title={isMarked ? 'İşareti kaldır' : 'Satırı işaretle'}
            style={{
              ...noCellContentStyle,
              ...SET_SUBITEM_NUMBER_STYLE,
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {renderSetSubitemNumber(setSubitemIndex)}
          </span>
        ) : (
          <span
            onClick={onToggleMark(satir.id)}
            title={isMarked ? 'İşareti kaldır' : 'Satırı işaretle'}
            style={{ ...noCellContentStyle, cursor: 'pointer' }}
          >
            {String(mainItemIndex).padStart(2, '0')}
          </span>
        )}
      </RowCell>

      <RowCell
        idx={idx}
        pos="mid"
        setGroupPos={setGroupPos}
        data-cell-field="marka"
        onClick={handleClick('marka')}
        className={`${getOfferTableSeparatorClass('marka') ?? ''} ${activeClass('marka') ?? ''}`.trim()}
        style={{
          cursor: 'pointer',
          textAlign: 'center',
          ...getOfferTableSeparatorStyle('marka'),
          ...getMarkedCellStyle(isMarked, 'mid', isActiveCell('marka'), setGroupPos !== null),
        }}
      >
        <EditableField as="span" type="text" fieldKey={`satir-${satir.id}-marka`} style={ROW_TEXT.brand} readOnly={readOnly}>
          {satir.marka ? formatMarka(satir.marka) : '-'}
        </EditableField>
      </RowCell>

      <RowCell
        idx={idx}
        pos="mid"
        setGroupPos={setGroupPos}
        data-cell-field="urunKod"
        onClick={handleClick('urunKod')}
        className={`product-code-cell ${getOfferTableSeparatorClass('urunKod') ?? ''} ${activeClass('urunKod') ?? ''}`.trim()}
        style={{
          cursor: 'pointer',
          textAlign: 'left',
          ...getOfferTableSeparatorStyle('urunKod'),
          ...getMarkedCellStyle(isMarked, 'mid', isActiveCell('urunKod'), setGroupPos !== null),
        }}
      >
        <EditableField as="span" type="text" fieldKey={`satir-${satir.id}-urunKod`} style={ROW_TEXT.code} readOnly={readOnly}>
          {satir.urunKod || '-'}
        </EditableField>
      </RowCell>

      <RowCell
        idx={idx}
        pos="mid"
        setGroupPos={setGroupPos}
        data-cell-field="aciklama"
        onClick={handleClick('aciklama')}
        className={`description-cell ${getOfferTableSeparatorClass('aciklama') ?? ''} ${activeClass('aciklama') ?? ''}`.trim()}
        style={{
          cursor: 'pointer',
          textAlign: 'left',
          ...getOfferTableSeparatorStyle('aciklama'),
          ...getMarkedCellStyle(isMarked, 'mid', isActiveCell('aciklama'), setGroupPos !== null),
        }}
      >
        <EditableField as="span" type="text" fieldKey={`satir-${satir.id}-aciklama`} readOnly={readOnly}>
          <DescText text={satir.aciklama || '-'} />
        </EditableField>
      </RowCell>

      <RowCell
        idx={idx}
        pos="mid"
        setGroupPos={setGroupPos}
        data-cell-field="miktar"
        onClick={handleClick('miktar')}
        className={`${getOfferTableSeparatorClass('miktar') ?? ''} ${activeClass('miktar') ?? ''}`.trim()}
        style={{
          cursor: 'pointer',
          textAlign: 'left',
          ...getOfferTableSeparatorStyle('miktar'),
          ...getMarkedCellStyle(isMarked, 'mid', isActiveCell('miktar'), setGroupPos !== null),
        }}
      >
        {satir.miktar !== 0 ? (
          <EditableField as="div" type="number" fieldKey={`satir-${satir.id}-miktar`} style={ROW_SHELL.quantityWrap} readOnly={readOnly}>
            <span style={{ ...ROW_TEXT.quantityValue, ...ROW_SHELL.quantityValueWrap }}>
              {formatDisplayNumber(satir.miktar, 0, 4)}
            </span>
            <span style={{ ...ROW_TEXT.quantityUnit, ...ROW_SHELL.quantityUnitWrap }}>
              {formatBirimAbbrev(satir.birim)}
            </span>
          </EditableField>
        ) : (
          <span>-</span>
        )}
      </RowCell>

      <RowCell
        idx={idx}
        pos="mid"
        setGroupPos={setGroupPos}
        data-cell-field="paraBirimi"
        onClick={satirBazliParaBirimi ? handleClick('paraBirimi') : undefined}
        className={
          `${getOfferTableSeparatorClass('paraBirimi') ?? ''} ${activeClass('paraBirimi') ?? ''} ${
            satirBazliParaBirimi ? '' : 'no-click'
          }`.trim() || undefined
        }
        style={{
          cursor: satirBazliParaBirimi ? 'pointer' : 'default',
          textAlign: 'center',
          ...getOfferTableSeparatorStyle('paraBirimi'),
          ...getMarkedCellStyle(isMarked, 'mid', isActiveCell('paraBirimi'), setGroupPos !== null),
        }}
      >
        {satirBazliParaBirimi ? (
          <EditableField as="span" type="currency" fieldKey={`satir-${satir.id}-paraBirimi`} style={ROW_TEXT.currency} readOnly={readOnly}>
            {formatParaBirimiLabel(satirPb)}
          </EditableField>
        ) : null}
      </RowCell>

      <RowCell
        idx={idx}
        pos="mid"
        setGroupPos={setGroupPos}
        data-cell-field="birimFiyat"
        onClick={satir.setAltKalem ? undefined : handleClick('birimFiyat')}
        className={(() => {
          const base = getOfferTableSeparatorClass('birimFiyat') ?? '';
          const step = getSetStepClass(satir.setAltKalem, setGroupPos);
          if (satir.setAltKalem) return `${base} no-click ${step}`.trim();
          return `${base} ${activeClass('birimFiyat') ?? ''} ${step}`.trim();
        })()}
        style={{
          cursor: satir.setAltKalem ? 'default' : 'pointer',
          textAlign: 'right',
          ...getOfferTableSeparatorStyle('birimFiyat'),
          ...getMarkedCellStyle(isMarked, 'mid', isActiveCell('birimFiyat'), setGroupPos !== null),
        }}
      >
        {satir.setAltKalem ? null : (
          <EditableField as="span" type="currency" fieldKey={`satir-${satir.id}-birimFiyat`} style={ROW_TEXT.price} readOnly={readOnly}>
            {(() => {
              const nihai = satir.birimFiyat * (1 - (satir.indirimOrani || 0) / 100);
              return Math.abs(nihai) >= 0.005 ? formatDisplayNumber(nihai, 2, 2) : '-';
            })()}
          </EditableField>
        )}
      </RowCell>

      <RowCell
        idx={idx}
        pos="mid"
        setGroupPos={setGroupPos}
        className={(() => {
          const base = getOfferTableSeparatorClass('toplam') ?? '';
          const step = getSetStepClass(satir.setAltKalem, setGroupPos);
          if (satir.setAltKalem) return `${base} ${step}`.trim();
          return `${base} ${step}`.trim() || undefined;
        })()}
        style={{
          textAlign: 'right',
          ...getOfferTableSeparatorStyle('toplam'),
          ...getMarkedCellStyle(isMarked, 'mid', false, setGroupPos !== null),
        }}
      >
        {satir.setAltKalem ? null : (
          <span style={ROW_TEXT.total}>
            {satir.satirToplami !== 0 ? formatDisplayNumber(satir.satirToplami, 2, 2) : '-'}
          </span>
        )}
      </RowCell>

      <RowCell
        idx={idx}
        pos="last"
        setGroupPos={setGroupPos}
        data-cell-field="teslimat"
        onClick={satir.setAltKalem ? undefined : handleClick('teslimat')}
        className={(() => {
          const base = getOfferTableSeparatorClass('teslimat') ?? '';
          const step = getSetStepClass(satir.setAltKalem, setGroupPos);
          if (satir.setAltKalem) return `${base} no-click ${step}`.trim();
          return `${base} ${activeClass('teslimat') ?? ''} ${step}`.trim();
        })()}
        style={{
          position: 'relative',
          cursor: satir.setAltKalem ? 'default' : 'pointer',
          textAlign: 'center',
          ...getOfferTableSeparatorStyle('teslimat'),
          ...getMarkedCellStyle(isMarked, 'last', isActiveCell('teslimat'), setGroupPos !== null),
        }}
      >
        {satir.setAltKalem ? null : (
          <EditableField as="span" type="date" fieldKey={`satir-${satir.id}-teslimat`} style={ROW_TEXT.delivery} readOnly={readOnly}>
            {satir.teslimTarihi || '-'}
          </EditableField>
        )}
        {(satir.indirimOrani || 0) > 0 && !isRowActive && !isHoverRow && !isPanelInteracting && (
          <SatirIskontoRozeti
            rowId={satir.id}
            oran={satir.indirimOrani || 0}
            onHover={setIsPanelInteracting}
          />
        )}
        {!readOnly && (isRowActive || isHoverRow || isPanelInteracting) && (
          <SatirAksiyonlariPanel
            satir={satir}
            satirBazliIskonto={!satir.setAltKalem && (isRowActive || isPanelInteracting) && satirBazliIskonto}
            onSil={() => onSatirSil(satir.id)}
            onReferanslar={() => onReferanslarAc(satir.id)}
            onInteract={setIsPanelInteracting}
          />
        )}
      </RowCell>
    </tr>
  );
}

const arePropsEqual = (prev: SatirRowProps, next: SatirRowProps) => {
  if (prev.satir !== next.satir) return false;
  if (prev.idx !== next.idx) return false;
  if (prev.satirPb !== next.satirPb) return false;
  if (prev.mainItemIndex !== next.mainItemIndex) return false;
  if (prev.setSubitemIndex !== next.setSubitemIndex) return false;
  if (prev.setGroupPos !== next.setGroupPos) return false;
  if (prev.isMarked !== next.isMarked) return false;
  if (prev.isRowActive !== next.isRowActive) return false;
  if (prev.isHoverRow !== next.isHoverRow) return false;
  if (prev.activeCellField !== next.activeCellField) return false;
  if (prev.satirBazliParaBirimi !== next.satirBazliParaBirimi) return false;
  if (prev.satirBazliIskonto !== next.satirBazliIskonto) return false;
  if (prev.readOnly !== next.readOnly) return false;
  if (prev.onCellClick !== next.onCellClick) return false;
  if (prev.onRowEnter !== next.onRowEnter) return false;
  if (prev.onRowLeave !== next.onRowLeave) return false;
  if (prev.onToggleMark !== next.onToggleMark) return false;
  if (prev.onSatirSil !== next.onSatirSil) return false;
  if (prev.onReferanslarAc !== next.onReferanslarAc) return false;
  return true;
};

export const SatirRow = memo(SatirRowImpl, arePropsEqual);
SatirRow.displayName = 'SatirRow';
