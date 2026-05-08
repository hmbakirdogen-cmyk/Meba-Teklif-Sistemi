import { DOCUMENT_PAGE, mmToPx, computeSetGroupPos } from '../templates/teklifDocumentShared';

/**
 * documentPagination — A4 önizleme + PDF için sayfa kırma motoru.
 *
 * Tasarım kuralları:
 *  1. Satır yükseklikleri canlı DOM'dan ölçülür (sabit tahmin yok).
 *  2. Set grubu (set ana + alt kalemleri) tek atomic blok olarak ele alınır;
 *     mümkünse aynı sayfada kalır. Sığmazsa tüm grup bir sonraki sayfaya
 *     atılır.
 *  3. Widow kuralı: totals + notes + signature yeni sayfaya geçecekse, son
 *     blok da o sayfaya çekilir → yeni sayfa "boş ürünsüz totals" görünmez.
 *  4. İlk sayfa full header, sonraki sayfalar compact header — kapasite
 *     buna göre ayrı hesaplanır.
 *  5. Son sayfada totals/signature için TRAILING_BLOCK_SAFETY_PX buffer
 *     bırakılır; ürün satırlarının üstüne binmez.
 */

const CONTINUATION_TOP_GAP_PX = 10;
const TRAILING_BLOCK_SAFETY_PX = 20;

function outerHeight(el: HTMLElement | null): number {
  if (!el) return 0;
  const style = window.getComputedStyle(el);
  return el.getBoundingClientRect().height
    + Number.parseFloat(style.marginTop || '0')
    + Number.parseFloat(style.marginBottom || '0');
}

function offsetTopWithin(root: HTMLElement, el: HTMLElement | null): number {
  if (!el) return 0;
  let top = 0;
  let current: HTMLElement | null = el;
  while (current && current !== root) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return top;
}

function firstNonZero(values: number[]): number {
  return values.find((value) => value > 0) ?? 0;
}

export interface TeklifPagePlan {
  pageNumber: number;
  rowStartIndex: number;
  rowEndIndex: number;
  showFullHeader: boolean;
  showCompactHeader: boolean;
  showTableHeader: boolean;
  includeTotals: boolean;
  includeNotes: boolean;
  includeSignature: boolean;
}

export interface TeklifPaginationResult {
  pages: TeklifPagePlan[];
  totalPages: number;
}

/** Set grubu hesaplaması için ihtiyaç duyulan minimum satır şekli. */
interface SetGroupRow {
  id: string;
  setId?: string;
  setAltKalem?: boolean;
  setAnaSatirId?: string;
}

interface PaginationMeasurements {
  firstTableStartTop: number;
  firstTrailingTop: number;
  tableHeadHeight: number;
  tableSpacerHeight: number;
  rowHeights: number[];
  totalsHeight: number;
  notesHeight: number;
  signatureHeight: number;
  footerHeight: number;
  compactHeaderHeight: number;
}

interface MutablePagePlan extends TeklifPagePlan {
  rowHeightUsed: number;
  blockHeightUsed: number;
}

/** Set grubunu (atomic) veya tek satırı temsil eden blok. */
interface RowBlock {
  startIndex: number; // dahil
  endIndex: number;   // hariç
  height: number;
}

function measureDocument(
  linearRoot: HTMLElement,
  compactHeaderEl: HTMLElement,
): PaginationMeasurements {
  const tableHeadEl = linearRoot.querySelector<HTMLElement>('#pdf-thead');
  const mainTableEl = tableHeadEl?.closest('table') as HTMLTableElement | null;
  const dataRows = mainTableEl
    ? Array.from(mainTableEl.querySelectorAll<HTMLTableRowElement>('tbody tr[data-satir-id]'))
    : [];
  const spacerEl = mainTableEl?.querySelector<HTMLTableRowElement>('tbody tr[aria-hidden="true"]') ?? null;
  const totalsEl = linearRoot.querySelector<HTMLElement>('#pdf-totals-block');
  const notesEl = linearRoot.querySelector<HTMLElement>('#pdf-notes-block');
  const bottomBlockEl = linearRoot.querySelector<HTMLElement>('#pdf-bottom-block');
  const signatureEl = linearRoot.querySelector<HTMLElement>('#pdf-signature-block');
  const footerEl = linearRoot.querySelector<HTMLElement>('#pdf-page-footer');

  const firstRowTop = dataRows.length > 0 ? offsetTopWithin(linearRoot, dataRows[0]) : 0;
  const firstTrailingTop = firstNonZero([
    offsetTopWithin(linearRoot, totalsEl),
    offsetTopWithin(linearRoot, notesEl),
    offsetTopWithin(linearRoot, bottomBlockEl),
    offsetTopWithin(linearRoot, footerEl),
  ]);

  return {
    firstTableStartTop: firstNonZero([firstRowTop, firstTrailingTop]),
    firstTrailingTop,
    tableHeadHeight: outerHeight(tableHeadEl),
    tableSpacerHeight: outerHeight(spacerEl),
    rowHeights: dataRows.map((row) => outerHeight(row)),
    totalsHeight: outerHeight(totalsEl),
    notesHeight: outerHeight(notesEl),
    signatureHeight: outerHeight(signatureEl),
    footerHeight: outerHeight(footerEl),
    compactHeaderHeight: outerHeight(compactHeaderEl),
  };
}

/**
 * Satırları atomic blok dizisine dönüştürür. Set ana kalemi ile alt kalemleri
 * tek blok oluşturur (tüm grup aynı sayfada kalmalı). Tek başına ürün satırı
 * (veya alt kalemi olmayan set ana kalemi) tek satırlık blok olur.
 */
function groupRowsIntoBlocks(
  rows: ReadonlyArray<SetGroupRow>,
  rowHeights: number[],
): RowBlock[] {
  const blocks: RowBlock[] = [];
  let i = 0;
  while (i < rows.length) {
    const pos = computeSetGroupPos(rows, i);
    if (pos === 'top') {
      // Set grubunun başlangıcı — 'middle'/'bottom' satırlarını topla
      let j = i + 1;
      while (j < rows.length) {
        const p = computeSetGroupPos(rows, j);
        if (p === 'middle' || p === 'bottom') {
          j++;
        } else {
          break;
        }
      }
      const height = rowHeights.slice(i, j).reduce((sum, h) => sum + (h ?? 0), 0);
      blocks.push({ startIndex: i, endIndex: j, height });
      i = j;
    } else {
      blocks.push({ startIndex: i, endIndex: i + 1, height: rowHeights[i] ?? 0 });
      i++;
    }
  }
  return blocks;
}

function createPage(pageNumber: number, showFullHeader: boolean): MutablePagePlan {
  return {
    pageNumber,
    rowStartIndex: 0,
    rowEndIndex: 0,
    showFullHeader,
    showCompactHeader: !showFullHeader,
    showTableHeader: false,
    includeTotals: false,
    includeNotes: false,
    includeSignature: false,
    rowHeightUsed: 0,
    blockHeightUsed: 0,
  };
}

function pageFixedHeight(page: MutablePagePlan, measurements: PaginationMeasurements): number {
  if (page.showFullHeader) {
    return page.showTableHeader ? measurements.firstTableStartTop : measurements.firstTrailingTop;
  }

  const compactBase = measurements.compactHeaderHeight + CONTINUATION_TOP_GAP_PX;
  if (!page.showTableHeader) return compactBase;

  return compactBase + measurements.tableHeadHeight + measurements.tableSpacerHeight;
}

function pageCapacity(page: MutablePagePlan, measurements: PaginationMeasurements): number {
  const innerPageHeight = mmToPx(
    DOCUMENT_PAGE.heightMm - DOCUMENT_PAGE.paddingTopMm - DOCUMENT_PAGE.paddingBottomMm,
  );

  return innerPageHeight - measurements.footerHeight - pageFixedHeight(page, measurements);
}

function startNewPage(pages: MutablePagePlan[]): MutablePagePlan {
  const page = createPage(pages.length + 1, false);
  page.rowStartIndex = pages[pages.length - 1]?.rowEndIndex ?? 0;
  page.rowEndIndex = page.rowStartIndex;
  pages.push(page);
  return page;
}

function placeBlockOnPages(
  block: RowBlock,
  pages: MutablePagePlan[],
  measurements: PaginationMeasurements,
): void {
  let currentPage = pages[pages.length - 1];
  currentPage.showTableHeader = true;

  const capacity = pageCapacity(currentPage, measurements);
  const interBlockGap = currentPage.rowHeightUsed > 0 ? measurements.tableSpacerHeight : 0;
  const willOverflow = currentPage.rowHeightUsed > 0
    && currentPage.rowHeightUsed + interBlockGap + block.height > capacity;

  if (willOverflow) {
    currentPage = startNewPage(pages);
    currentPage.showTableHeader = true;
  }

  const appliedGap = currentPage.rowHeightUsed > 0 ? measurements.tableSpacerHeight : 0;

  if (currentPage.rowHeightUsed === 0) {
    currentPage.rowStartIndex = block.startIndex;
  }
  currentPage.rowEndIndex = block.endIndex;
  currentPage.rowHeightUsed += appliedGap + block.height;
}

/**
 * Trailing blokları (totals, notes, signature) son sayfaya yerleştirir.
 *  Case A: Mevcut sayfada (TRAILING_BLOCK_SAFETY_PX buffer ile) sığar → yerleştir.
 *  Case B: Sığmazsa, mevcut sayfanın son ürün bloğunu yeni sayfaya çekip
 *          yeni sayfayı "son blok + trailing" ile doldur (widow kuralı).
 *  Case C: Çekme uygulanamıyorsa (mevcut sayfa boşalır veya yine sığmaz) →
 *          trailing-only yeni sayfa.
 *
 * Boş teklifte (hiç satır yok) trailing direkt mevcut sayfaya konur.
 */
function placeTrailingBlocksWithWidow(
  pages: MutablePagePlan[],
  blocks: RowBlock[],
  measurements: PaginationMeasurements,
): void {
  const trailingDescriptors = [
    { key: 'includeTotals' as const, height: measurements.totalsHeight },
    { key: 'includeNotes' as const, height: measurements.notesHeight },
    { key: 'includeSignature' as const, height: measurements.signatureHeight },
  ].filter((b) => b.height > 0);

  if (trailingDescriptors.length === 0) return;

  const placeAll = (page: MutablePagePlan): void => {
    trailingDescriptors.forEach((b) => {
      page[b.key] = true;
      page.blockHeightUsed += b.height;
    });
  };

  const trailingTotal = trailingDescriptors.reduce((sum, b) => sum + b.height, 0);
  const requiredCapacity = trailingTotal + TRAILING_BLOCK_SAFETY_PX;

  const currentPage = pages[pages.length - 1];

  // Boş sayfa (hiç ürün satırı yok) → trailing direkt buraya gider.
  if (currentPage.rowHeightUsed === 0 && blocks.length === 0) {
    placeAll(currentPage);
    return;
  }

  const currentCapacity = pageCapacity(currentPage, measurements);

  // Case A: trailing mevcut sayfaya sığar.
  if (currentPage.rowHeightUsed + requiredCapacity <= currentCapacity) {
    placeAll(currentPage);
    return;
  }

  // Case B: widow — son bloğu yeni sayfaya çek, trailing'i orada yerleştir.
  const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
  const lastBlockOnCurrent = lastBlock != null
    && currentPage.rowEndIndex === lastBlock.endIndex
    && currentPage.rowStartIndex <= lastBlock.startIndex;
  const wouldNotEmptyCurrent = lastBlock != null
    && (currentPage.rowHeightUsed - lastBlock.height) > 0;

  if (lastBlock && lastBlockOnCurrent && wouldNotEmptyCurrent) {
    // Yeni sayfa kapasitesini compact-header senaryosunda simüle et
    const dummyNewPage = createPage(pages.length + 1, false);
    dummyNewPage.showTableHeader = true;
    const newPageCapacity = pageCapacity(dummyNewPage, measurements);

    if (lastBlock.height + requiredCapacity <= newPageCapacity) {
      currentPage.rowEndIndex = lastBlock.startIndex;
      currentPage.rowHeightUsed -= lastBlock.height;

      const newPage = startNewPage(pages);
      newPage.showTableHeader = true;
      newPage.rowStartIndex = lastBlock.startIndex;
      newPage.rowEndIndex = lastBlock.endIndex;
      newPage.rowHeightUsed = lastBlock.height;

      placeAll(newPage);
      return;
    }
  }

  // Case C: çekme uygulanamadı → trailing-only yeni sayfa
  const trailingPage = startNewPage(pages);
  trailingPage.showTableHeader = false;
  placeAll(trailingPage);
}

/**
 * Authoritative pagination — DOM'dan ölçtüğü gerçek satır yüksekliklerine
 * göre sayfaları üretir. Set grupları atomic, widow kuralı uygulanır.
 */
export function calculateTeklifPagination(
  linearRoot: HTMLElement,
  compactHeaderEl: HTMLElement,
  rows: ReadonlyArray<SetGroupRow>,
): TeklifPaginationResult {
  const measurements = measureDocument(linearRoot, compactHeaderEl);
  const blocks = groupRowsIntoBlocks(rows, measurements.rowHeights);

  const pages: MutablePagePlan[] = [createPage(1, true)];

  for (const block of blocks) {
    placeBlockOnPages(block, pages, measurements);
  }

  placeTrailingBlocksWithWidow(pages, blocks, measurements);

  return {
    pages: pages.map((page) => ({
      pageNumber: page.pageNumber,
      rowStartIndex: page.rowStartIndex,
      rowEndIndex: page.rowEndIndex,
      showFullHeader: page.showFullHeader,
      showCompactHeader: page.showCompactHeader,
      showTableHeader: page.showTableHeader,
      includeTotals: page.includeTotals,
      includeNotes: page.includeNotes,
      includeSignature: page.includeSignature,
    })),
    totalPages: pages.length,
  };
}
