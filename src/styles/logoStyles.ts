import type { CSSProperties } from 'react';

type SizeValue = number | string;
export type AdaptiveLogoSurface =
  | 'navbar'
  | 'navbar-switcher'
  | 'a4-full'
  | 'a4-compact'
  | 'card'
  | 'inline-tab';

interface OriginalLogoStyleOptions {
  maxWidth: NonNullable<CSSProperties['maxWidth']>;
  maxHeight: NonNullable<CSSProperties['maxHeight']>;
  objectPosition?: CSSProperties['objectPosition'];
}

interface LogoSurfacePreset {
  slotWidth: SizeValue;
  slotHeight: SizeValue;
  maxWidth: SizeValue;
  maxHeight: SizeValue;
  slotBackground?: CSSProperties['background'];
  slotBorder?: CSSProperties['border'];
  slotBorderRadius?: SizeValue;
  slotBoxShadow?: CSSProperties['boxShadow'];
  slotOverflow?: CSSProperties['overflow'];
  alignItems?: CSSProperties['alignItems'];
  justifyContent?: CSSProperties['justifyContent'];
  objectPosition?: CSSProperties['objectPosition'];
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  offsetY?: number;
  labelGapPx?: number;
}

interface OfferHeaderLayoutPreset {
  quotePanelWidthPx: number;
  columnGapPx: number;
  separatorWidthPx: number;
  separatorInsetPx: number;
  companyContentGapPx: number;
  showSeparator: boolean;
}

export interface AdaptiveLogoPlacement {
  slotStyle: CSSProperties;
  imageStyle: CSSProperties;
  labelGapPx: number;
  slotWidthPx: number | null;
  slotHeightPx: number | null;
}

export interface OfferHeaderLayoutProfile {
  logoColumnWidthPx: number;
  quotePanelWidthPx: number;
  columnGapPx: number;
  separatorWidthPx: number;
  separatorInsetPx: number;
  companyContentGapPx: number;
  showSeparator: boolean;
}

const RASTER_IMAGE_RENDERING = 'high-quality' as unknown as CSSProperties['imageRendering'];

const DEFAULT_SURFACE_PRESETS: Record<AdaptiveLogoSurface, LogoSurfacePreset> = {
  navbar: {
    slotWidth: 156,
    slotHeight: 44,
    maxWidth: 140,
    maxHeight: 32,
    slotBackground: 'rgba(255,255,255,0.98)',
    slotBorder: '1px solid rgba(207,225,255,0.16)',
    slotBorderRadius: 10,
    slotBoxShadow: '0 1px 0 rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.40)',
    slotOverflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    objectPosition: 'center',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 6,
    paddingBottom: 6,
    labelGapPx: 12,
  },
  'navbar-switcher': {
    slotWidth: 56,
    slotHeight: 28,
    maxWidth: 48,
    maxHeight: 20,
    slotBackground: 'rgba(255,255,255,0.98)',
    slotBorder: '1px solid rgba(148,163,184,0.18)',
    slotBorderRadius: 7,
    slotOverflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    objectPosition: 'left center',
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 4,
    paddingBottom: 4,
  },
  'a4-full': {
    slotWidth: 180,
    slotHeight: 68,
    maxWidth: 166,
    maxHeight: 56,
    alignItems: 'center',
    justifyContent: 'flex-start',
    objectPosition: 'left center',
  },
  'a4-compact': {
    slotWidth: 96,
    slotHeight: 35,
    maxWidth: 86,
    maxHeight: 29,
    alignItems: 'center',
    justifyContent: 'flex-start',
    objectPosition: 'left center',
  },
  card: {
    slotWidth: '100%',
    slotHeight: '100%',
    maxWidth: '86%',
    maxHeight: '52%',
    alignItems: 'center',
    justifyContent: 'center',
    objectPosition: 'center',
  },
  'inline-tab': {
    slotWidth: 48,
    slotHeight: 20,
    maxWidth: 44,
    maxHeight: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    objectPosition: 'left center',
  },
};

const DEFAULT_OFFER_HEADER_LAYOUT: OfferHeaderLayoutPreset = {
  quotePanelWidthPx: 202,
  columnGapPx: 13,
  separatorWidthPx: 1,
  separatorInsetPx: 5,
  companyContentGapPx: 3,
  showSeparator: true,
};

const SURFACE_OVERRIDES: Record<string, Partial<Record<AdaptiveLogoSurface, Partial<LogoSurfacePreset>>>> = {};

const OFFER_HEADER_OVERRIDES: Record<string, Partial<OfferHeaderLayoutPreset>> = {};

function toCssSize(value: SizeValue): string {
  return typeof value === 'number' ? `${value}px` : value;
}

function toNumericSize(value: SizeValue): number | null {
  return typeof value === 'number' ? value : null;
}

function isRasterLogo(path: string | undefined): boolean {
  if (!path) return true;
  return !/\.svg(?:\?.*)?$/i.test(path);
}

function getSurfacePreset(firmaId: string | undefined, surface: AdaptiveLogoSurface): LogoSurfacePreset {
  const override = firmaId ? SURFACE_OVERRIDES[firmaId]?.[surface] : undefined;
  return {
    ...DEFAULT_SURFACE_PRESETS[surface],
    ...override,
  };
}

export function createOriginalLogoImageStyle({
  maxWidth,
  maxHeight,
  objectPosition = 'center',
}: OriginalLogoStyleOptions): CSSProperties {
  return {
    maxWidth,
    maxHeight,
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    objectPosition,
    display: 'block',
    filter: 'none',
    opacity: 1,
    transform: 'none',
    aspectRatio: 'auto',
  };
}

export function getAdaptiveLogoPlacement({
  firmaId,
  logoPath,
  surface,
  objectPosition,
}: {
  firmaId?: string;
  logoPath?: string;
  surface: AdaptiveLogoSurface;
  objectPosition?: CSSProperties['objectPosition'];
}): AdaptiveLogoPlacement {
  const preset = getSurfacePreset(firmaId, surface);

  return {
    slotStyle: {
      width: toCssSize(preset.slotWidth),
      height: toCssSize(preset.slotHeight),
      background: preset.slotBackground,
      border: preset.slotBorder,
      borderRadius: preset.slotBorderRadius ? toCssSize(preset.slotBorderRadius) : undefined,
      boxShadow: preset.slotBoxShadow,
      overflow: preset.slotOverflow,
      display: 'flex',
      alignItems: preset.alignItems ?? 'center',
      justifyContent: preset.justifyContent ?? 'center',
      boxSizing: 'border-box',
      lineHeight: 0,
      flexShrink: 0,
      paddingLeft: preset.paddingLeft ?? 0,
      paddingRight: preset.paddingRight ?? 0,
      paddingTop: preset.paddingTop ?? 0,
      paddingBottom: preset.paddingBottom ?? 0,
    },
    imageStyle: {
      ...createOriginalLogoImageStyle({
        maxWidth: toCssSize(preset.maxWidth),
        maxHeight: toCssSize(preset.maxHeight),
        objectPosition: objectPosition ?? preset.objectPosition ?? 'center',
      }),
      ...(preset.offsetY ? { marginTop: `${preset.offsetY}px` } : null),
      ...(isRasterLogo(logoPath) ? { imageRendering: RASTER_IMAGE_RENDERING } : null),
      printColorAdjust: 'exact',
      WebkitPrintColorAdjust: 'exact',
      flexShrink: 0,
    },
    labelGapPx: preset.labelGapPx ?? 12,
    slotWidthPx: toNumericSize(preset.slotWidth),
    slotHeightPx: toNumericSize(preset.slotHeight),
  };
}

export function getOfferHeaderLayoutProfile(firmaId?: string): OfferHeaderLayoutProfile {
  const logoPreset = getSurfacePreset(firmaId, 'a4-full');
  const override = firmaId ? OFFER_HEADER_OVERRIDES[firmaId] : undefined;
  const layout = {
    ...DEFAULT_OFFER_HEADER_LAYOUT,
    ...override,
  };

  return {
    logoColumnWidthPx: toNumericSize(logoPreset.slotWidth) ?? 174,
    quotePanelWidthPx: layout.quotePanelWidthPx,
    columnGapPx: layout.columnGapPx,
    separatorWidthPx: layout.separatorWidthPx,
    separatorInsetPx: layout.separatorInsetPx,
    companyContentGapPx: layout.companyContentGapPx,
    showSeparator: layout.showSeparator,
  };
}
