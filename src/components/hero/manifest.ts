/**
 * Frame-sequence contract shared by the build step (scripts/build-frames.mjs)
 * and the runtime.
 *
 * The manifest is set-shaped on purpose: today the sequence ships as a single
 * 16:9 `landscape` set, and a native 9:16 `portrait` set can be added later by
 * emitting one more entry. `resolveSequence` already prefers `portrait` on
 * portrait viewports and the composer already changes strategy for it, so no
 * component needs to change when that set arrives.
 */

export type FrameSet = {
  /** Intrinsic pixel size of the source frames. */
  width: number;
  height: number;
  /** Number of frames in the set. */
  count: number;
  /** Filename index of the first frame (usually 1). */
  startIndex: number;
  fps?: number;
  /** Token template: `/sequences/hero/{w}/f_{index}.webp` */
  path: string;
  /** Available output widths, ascending. */
  widths: number[];
  /** Subject focal point in 0..1 source coordinates. */
  focal: { x: number; y: number };
};

export type SequenceManifest = {
  version: number;
  id: string;
  fps: number;
  poster: string;
  stills: Record<string, string>;
  sets: Record<string, FrameSet>;
};

export type ResolvedSequence = {
  key: string;
  set: FrameSet;
  lastIndex: number;
};

export function frameUrl(set: FrameSet, index: number, tier: number): string {
  return set.path
    .replace('{w}', String(tier))
    .replace('{index}', String(index).padStart(4, '0'));
}

/**
 * Smallest published tier that still covers the display.
 *
 * The floor is deliberately high: on a phone the canvas shows a narrow vertical
 * slice of the source, so the subject needs more source pixels than the viewport
 * width implies. 1280 is the minimum that keeps hands and stitches crisp at 2x.
 *
 * `frugal` drops the floor to the smallest tier for a metered or 2g connection,
 * where a 1280 frame is a real cost and a soft picture beats a stalled one.
 */
export function chooseTier(widths: number[], cssWidth: number, dpr: number, frugal = false): number {
  const target = Math.min(Math.max(cssWidth * Math.min(dpr, 2), frugal ? 0 : 900), 1920);
  const sorted = [...widths].sort((a, b) => a - b);
  for (const width of sorted) {
    if (width >= target) return width;
  }
  return sorted[sorted.length - 1];
}

/**
 * How many decoded frames to keep resident, derived from a byte budget rather
 * than a flat number. A 1920-wide frame costs roughly six times the memory of a
 * 720-wide one, so a fixed count would be reckless on desktop and stingy on a
 * phone.
 *
 * The budget is what a fast flick actually needs: at the capped playback rate
 * the hero runs at, the resident window has to cover more than a second of
 * travel or the sequence starts showing stale beats.
 */
export function chooseBudget(
  tier: number,
  sourceWidth: number,
  sourceHeight: number,
  memoryBudgetMb = 96,
): number {
  const frameHeight = (tier * sourceHeight) / sourceWidth;
  const bytesPerFrame = tier * frameHeight * 4;
  const frames = Math.round((memoryBudgetMb * 1024 * 1024) / Math.max(1, bytesPerFrame));
  return Math.max(16, Math.min(48, frames));
}

/**
 * Frames per second the sequence is allowed to advance during a hard flick.
 *
 * The scroll position is the source of truth, but a thumb can move the page
 * faster than any set of images can arrive. Clamping the rate turns that into
 * the sequence *playing out* at a legible speed instead of the canvas snapping
 * between frames that happen to be resident — which is what makes a fast flick
 * look like the picture fell apart.
 */
export function playbackRate(frameCount: number): number {
  return Math.max(46, Math.round(frameCount / 3.2));
}

export function resolveSequence(
  manifest: SequenceManifest,
  viewportWidth: number,
  viewportHeight: number,
): ResolvedSequence | null {
  const sets = manifest.sets ?? {};
  const isPortraitViewport = viewportHeight > viewportWidth;
  const landscape = sets.landscape;
  const portrait = sets.portrait;

  const set = isPortraitViewport && portrait ? portrait : (landscape ?? portrait);
  if (!set) return null;

  return { key: isPortraitViewport && portrait ? 'portrait' : 'landscape', set, lastIndex: set.startIndex + set.count - 1 };
}

/**
 * Offline / failure / reduced-motion still: the collection reveal, which is the
 * most brand-expressive frame in the set.
 */
export function fallbackStill(manifest: SequenceManifest | null): string {
  if (!manifest) return '/media/still-collection-1280.webp';
  return manifest.stills?.collection ?? manifest.poster ?? '/media/still-collection-1280.webp';
}