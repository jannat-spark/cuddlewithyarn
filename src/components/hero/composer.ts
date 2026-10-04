/**
 * Canvas composition for the hero sequence.
 *
 * Two strategies, chosen per viewport:
 *
 *  • `cover` — the source already matches the viewport's shape (landscape
 *    screens, or portrait screens once a native 9:16 set ships). One sharp draw.
 *
 *  • `band` — a 16:9 source on a tall phone. Full-bleed cropping would throw
 *    away 74% of the width and stretch ~500 source pixels across the screen,
 *    which reads as mush and loses the hands. Instead the frame is drawn as a
 *    near-native-resolution band across the middle of the screen, and the
 *    gutters above and below are filled with an upscaled, deliberately
 *    low-resolution copy of the *same* frame. The subject stays sharp and full
 *    width, the composition never letterboxes into dead space, and the
 *    wordmark and calls to action sit in the gutters without covering the
 *    hands or the work.
 *
 * Cost per redraw on the `band` path: one 24px-wide upscale plus one sharp
 * drawImage. No per-frame blur filter, no second full-resolution blit.
 */

export type CompositionMode = 'cover' | 'band';

export type SourceRect = {
  width: number;
  height: number;
  focal: { x: number; y: number };
};

export type Composition = {
  mode: CompositionMode;
  /** CSS pixel geometry of the canvas. */
  width: number;
  height: number;
  bandTop: number;
  bandHeight: number;
  /** Vertical window into the source for the band, as 0..1 fractions. */
  sourceTop: number;
  sourceHeight: number;
  focalX: number;
  focalY: number;
  dpr: number;
};

/** Hard ceiling on backing-store pixels: ~1.3 Mpx is plenty and stays cheap. */
const PIXEL_BUDGET = 1_350_000;

/**
 * Gutters: a 32px-wide copy of the frame, upscaled. Free blur, no filter.
 *
 * 32 rather than 24: the band edges sit against a hard champagne hairline, and
 * at 24 the upscale shows visible blocking right where the eye is looking. The
 * extra eight pixels cost nothing measurable — it is still one drawImage of a
 * buffer smaller than a favicon.
 */
const GUTTER_WIDTH = 32;

/** Fraction of the viewport height given to the sharp band on phones. */
const BAND_RATIO = 0.6;
/** How the remaining space is split: 56% above the band, 44% below. */
const BAND_TOP_FACTOR = 0.56;
/**
 * The band trims the very top of the source (out-of-focus background) so the
 * hands and the growing work sit lower in the band and clear the wordmark.
 */
const BAND_SOURCE_TOP = 0.09;

export function resolveDpr(cssWidth: number, cssHeight: number): number {
  const raw = Math.min(window.devicePixelRatio || 1, 2);
  const area = Math.max(1, cssWidth * cssHeight);
  const maxByBudget = Math.sqrt(PIXEL_BUDGET / area);
  if (maxByBudget >= raw) return raw;
  return Math.max(1, Math.floor(maxByBudget * 100) / 100);
}

export function computeComposition(
  cssWidth: number,
  cssHeight: number,
  source: SourceRect,
  hasPortraitSet: boolean,
): Composition {
  const viewportIsPortrait = cssHeight > cssWidth;
  const useBand = viewportIsPortrait && !hasPortraitSet;
  const dpr = resolveDpr(cssWidth, cssHeight);

  if (!useBand) {
    return {
      mode: 'cover',
      width: cssWidth,
      height: cssHeight,
      bandTop: 0,
      bandHeight: cssHeight,
      sourceTop: 0,
      sourceHeight: 1,
      focalX: source.focal.x,
      focalY: source.focal.y,
      dpr,
    };
  }

  const bandHeight = Math.round(
    Math.min(Math.max(cssHeight * BAND_RATIO, Math.min(230, cssHeight * 0.46)), cssHeight * 0.72),
  );
  const bandTop = Math.round((cssHeight - bandHeight) * BAND_TOP_FACTOR);

  return {
    mode: 'band',
    width: cssWidth,
    height: cssHeight,
    bandTop,
    bandHeight,
    sourceTop: BAND_SOURCE_TOP,
    sourceHeight: 1 - BAND_SOURCE_TOP,
    focalX: source.focal.x,
    // The band crops horizontally, so the vertical focal point only matters
    // when the source window is taller than the band.
    focalY: 0.5,
    dpr,
  };
}

export type CanvasBundle = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Tiny offscreen buffer used to build the blurred gutters cheaply. */
  blur: HTMLCanvasElement;
  blurCtx: CanvasRenderingContext2D;
};

export function createBundle(width: number, height: number, dpr: number): CanvasBundle {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const blur = document.createElement('canvas');
  blur.width = GUTTER_WIDTH;
  blur.height = Math.max(12, Math.round((GUTTER_WIDTH * height) / Math.max(1, width)));
  const blurCtx = blur.getContext('2d', { alpha: false });
  if (!blurCtx) throw new Error('Canvas 2D is unavailable');

  return { canvas, ctx, blur, blurCtx };
}

/** Cover-fit `src` (image pixels) into `dst` (CSS pixels) around a focal point. */
function drawRegion(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  src: { x: number; y: number; width: number; height: number },
  dst: { x: number; y: number; width: number; height: number },
  focalX: number,
  focalY: number,
): void {
  const scale = Math.max(dst.width / src.width, dst.height / src.height);
  const drawWidth = src.width * scale;
  const drawHeight = src.height * scale;
  const dx = dst.x + (dst.width - drawWidth) * focalX;
  const dy = dst.y + (dst.height - drawHeight) * focalY;
  ctx.drawImage(image, src.x, src.y, src.width, src.height, dx, dy, drawWidth, drawHeight);
}

export function paintFrame(
  bundle: CanvasBundle,
  image: HTMLImageElement,
  composition: Composition,
): void {
  const { ctx, blurCtx, blur } = bundle;
  const { width, height, bandTop, bandHeight, focalX, focalY, dpr } = composition;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const full = { x: 0, y: 0, width: iw, height: ih };

  if (composition.mode === 'cover') {
    ctx.fillStyle = '#2a0710';
    ctx.fillRect(0, 0, width, height);
    drawRegion(ctx, image, full, { x: 0, y: 0, width, height }, focalX, focalY);
    return;
  }

  // Gutters: a small copy of the frame, upscaled. Free blur, no filter.
  const blurScale = Math.max(blur.width / iw, blur.height / ih);
  blurCtx.imageSmoothingEnabled = true;
  blurCtx.drawImage(
    image,
    0,
    0,
    iw,
    ih,
    (blur.width - iw * blurScale) / 2,
    (blur.height - ih * blurScale) / 2,
    iw * blurScale,
    ih * blurScale,
  );
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(blur, 0, 0, blur.width, blur.height, 0, 0, width, height);

  // The band: a near-native, full-width, sharp crop of the same frame.
  const sourceY = full.y + ih * composition.sourceTop;
  const sourceH = ih * composition.sourceHeight;
  drawRegion(
    ctx,
    image,
    { x: full.x, y: sourceY, width: full.width, height: sourceH },
    { x: 0, y: bandTop, width, height: bandHeight },
    focalX,
    focalY,
  );

  // Champagne hairlines so the band reads as a deliberate frame, not a seam.
  ctx.fillStyle = 'rgba(231, 212, 182, 0.24)';
  ctx.fillRect(0, Math.max(0, bandTop - 0.5), width, 1);
  ctx.fillRect(0, Math.min(height - 1, bandTop + bandHeight - 0.5), width, 1);
}