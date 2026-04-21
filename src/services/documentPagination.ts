import { DOCUMENT_PAGE, mmToPx } from '../templates/teklifDocumentShared';

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

export function calculateTeklifPagination(
  linearRoot: HTMLElement,
  compactHeaderEl: HTMLElement,
): TeklifPaginationResult {
  const measurements = measureDocument(linearRoot, compactHeaderEl);
  const pages: MutablePagePlan[] = [createPage(1, true)];

  measurements.rowHeights.forEach((rowHeight, rowIndex) => {
    let currentPage = pages[pages.length - 1];
    currentPage.showTableHeader = true;

    const capacity = pageCapacity(currentPage, measurements);
    const willOverflow = currentPage.rowHeightUsed > 0 && currentPage.rowHeightUsed + rowHeight > capacity;

    if (willOverflow) {
      currentPage = startNewPage(pages);
      currentPage.showTableHeader = true;
    }

    if (currentPage.rowHeightUsed === 0) {
      currentPage.rowStartIndex = rowIndex;
    }

    currentPage.rowEndIndex = rowIndex + 1;
    currentPage.rowHeightUsed += rowHeight;
  });

  const trailingBlocks = [
    { key: 'includeTotals' as const, height: measurements.totalsHeight },
    { key: 'includeNotes' as const, height: measurements.notesHeight },
    { key: 'includeSignature' as const, height: measurements.signatureHeight },
  ].filter((block) => block.height > 0);

  trailingBlocks.forEach((block) => {
    let currentPage = pages[pages.length - 1];
    const usedHeight = currentPage.rowHeightUsed + currentPage.blockHeightUsed;
    const capacity = pageCapacity(currentPage, measurements);
    const willOverflow = usedHeight > 0 && usedHeight + block.height > capacity - TRAILING_BLOCK_SAFETY_PX;

    if (willOverflow) {
      currentPage = startNewPage(pages);
    }

    currentPage[block.key] = true;
    currentPage.blockHeightUsed += block.height;
  });

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
