import { frameUrl, type FrameSet } from './manifest';

export type LoaderCallbacks = {
  /** Fired whenever the current frame's image becomes available. */
  onFrameAvailable?: (index: number) => void;
  /** Fired once the sequence is deemed unusable so the hero can fall back. */
  onGiveUp?: (reason: string) => void;
};

export type LoaderOptions = {
  set: FrameSet;
  tier: number;
  /** Simultaneous image requests. Kept low on purpose for mid-range phones. */
  concurrency: number;
  /** Upper bound on decoded frames held in memory. */
  budget: number;
  /**
   * Frames loaded before the visitor has scrolled. Deliberately small: first
   * paint should cost a couple of hundred kilobytes, not a megabyte.
   */
  warmCount?: number;
  /** Give up after this many consecutive network failures. */
  maxConsecutiveFailures?: number;
  callbacks?: LoaderCallbacks;
};

/** How far the resident window may lag before it is rebuilt, in frames. */
const REBUILD_SLACK = 2;
/** Cost multiplier for frames already passed. Raised by speed, lowered on reverse. */
const BEHIND_COST = 2.4;
const BEHIND_COST_FAST = 5.5;
/** Frames beyond this one are never substituted for the exact frame on screen. */
const MAX_SUBSTITUTE = 2;

/**
 * Progressive, scroll-aware frame loader.
 *
 * Design constraints this satisfies:
 *   • Never loads all 271 frames at once — a moving window around the current
 *     scroll position is loaded, biased forward because scrolling down is what
 *     visitors actually do.
 *   • Holds at most `budget` decoded frames, evicting the furthest ones, so
 *     memory stays flat no matter how long the hero is on screen.
 *   • Biases the window by *velocity*, not just position. A hard flick outruns
 *     the network by design, and the frames the visitor is about to reach are
 *     the ones worth spending requests on.
 *   • Marks the previously painted frame as sticky so it is never evicted
 *     mid-swap (which would flash a distant frame on a slow connection).
 *   • Surfaces failure instead of hanging, so the hero can fall back to a still.
 */
export class FrameSequenceLoader {
  private readonly set: FrameSet;
  private readonly tier: number;
  private readonly concurrency: number;
  private readonly budget: number;
  private readonly warmCount: number;
  private warmLimit: number;
  private readonly maxConsecutiveFailures: number;
  private readonly callbacks: LoaderCallbacks;

  private readonly images = new Map<number, HTMLImageElement>();
  private readonly failed = new Set<number>();
  private readonly loading = new Set<number>();
  private wanted: number[] = [];
  private inflight = 0;
  private consecutiveFailures = 0;
  private target: number;
  /** Target the resident window was last built around; avoids a sort per frame. */
  private windowTarget: number;
  /** Smoothed frames-per-second, signed. Positive is scrolling down. */
  private velocity = 0;
  private sticky: number | null = null;
  private stopped = false;
  private gaveUp = false;
  /** True once the visitor has actually scrolled into the sequence. */
  private engaged = false;

  constructor(options: LoaderOptions) {
    this.set = options.set;
    this.tier = options.tier;
    this.concurrency = Math.max(1, options.concurrency);
    this.budget = Math.max(8, options.budget);
    this.warmCount = Math.max(1, Math.min(options.warmCount ?? 10, this.budget));
    this.warmLimit = this.warmCount;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures ?? 8;
    this.callbacks = options.callbacks ?? {};
    this.target = options.set.startIndex;
    this.windowTarget = Number.NaN;
    this.rebuildWindow();
  }

  get total(): number {
    return this.set.count;
  }

  get startIndex(): number {
    return this.set.startIndex;
  }

  /** Ready-to-paint image for this exact frame, or null. */
  get(index: number): HTMLImageElement | null {
    const image = this.images.get(index);
    return image && image.complete && image.naturalWidth > 0 ? image : null;
  }

  /**
   * A decoded neighbour, for the moment when the exact frame is still in flight.
   *
   * The search is deliberately shallow and directional. Reaching further would
   * paint a frame from a visibly different point in the sequence — a rose
   * halfway grown appearing where it should be finished — which reads as a
   * broken picture. Holding the last painted frame for a few milliseconds reads
   * as a still loading instead, so the radius is capped hard.
   *
   * The index comes back with the image because the caller has to pin the frame
   * it actually painted, not the one it was aiming at.
   */
  nearest(index: number, direction = 0): { index: number; image: HTMLImageElement } | null {
    const exact = this.get(index);
    if (exact) return { index, image: exact };
    if (direction !== 0) {
      const ahead = this.get(index + direction);
      if (ahead) return { index: index + direction, image: ahead };
    }
    for (let radius = 1; radius <= MAX_SUBSTITUTE; radius += 1) {
      const before = this.get(index - radius);
      if (before) return { index: index - radius, image: before };
      const after = this.get(index + radius);
      if (after) return { index: index + radius, image: after };
    }
    return null;
  }

  /**
   * First-paint burst. Loads a handful of frames ahead of the opening one so
   * the first flick of the thumb is instant, and stops there — the resident
   * window only grows once scrolling starts.
   */
  prewarm(count = 10): void {
    const first = this.set.startIndex;
    this.target = first;
    this.engaged = false;
    this.velocity = 0;
    this.warmLimit = Math.max(1, Math.min(count, this.budget));
    this.windowTarget = Number.NaN;
    this.rebuildWindow();
    this.pump();
  }

  /**
   * Point the loader at a frame.
   *
   * `dt` is the milliseconds since the previous call and is used to derive the
   * signed velocity that widens the window ahead of the direction of travel.
   */
  setTarget(index: number, dt = 0): void {
    const clamped = Math.min(Math.max(index, this.set.startIndex), this.lastIndex);
    if (clamped === this.target && this.engaged) return;

    if (dt > 0) {
      const instant = (clamped - this.target) / (dt / 1000);
      // Heavy smoothing: one anomalous scroll event must not swing the window.
      this.velocity = this.velocity * 0.7 + instant * 0.3;
    }

    this.target = clamped;
    this.engaged = true;
    if (
      Number.isNaN(this.windowTarget) ||
      Math.abs(clamped - this.windowTarget) >= REBUILD_SLACK ||
      Math.sign(clamped - this.windowTarget) !== Math.sign(this.velocity)
    ) {
      this.rebuildWindow();
    }
    this.pump();
  }

  /** Keeps the currently painted frame resident so it is never the one evicted. */
  pin(index: number | null): void {
    this.sticky = index;
    if (index !== null && this.images.has(index)) this.evict();
  }

  private get lastIndex(): number {
    return this.set.startIndex + this.set.count - 1;
  }

  /**
   * Rank every frame by how soon it will be needed, then keep the best
   * `budget` of them.
   *
   * Frames ahead of the direction of travel are cheap, frames behind are
   * expensive, and the penalty grows with speed: the faster the visitor is
   * moving, the further ahead the window reaches, because that is the only
   * place a request can still land in time to be used.
   */
  private rebuildWindow(): void {
    const behind = Math.abs(this.velocity) > 24 ? BEHIND_COST_FAST : BEHIND_COST;
    const forward = Math.sign(this.velocity) || 1;

    const scored: { index: number; distance: number }[] = [];
    for (let index = this.set.startIndex; index <= this.lastIndex; index += 1) {
      const delta = index - this.target;
      const ahead = delta === 0 || Math.sign(delta) === forward;
      scored.push({ index, distance: ahead ? Math.abs(delta) : Math.abs(delta) * behind });
    }
    scored.sort((a, b) => a.distance - b.distance);

    this.windowTarget = this.target;
    const limit = this.engaged ? this.budget : this.warmLimit;
    let window = scored.slice(0, limit).map((entry) => entry.index);
    if (this.sticky !== null && !window.includes(this.sticky)) {
      window = window.slice(0, Math.max(1, limit - 1)).concat(this.sticky);
    }
    this.wanted = window;
    this.evict();
  }

  private evict(): void {
    const limit = this.engaged ? this.budget : this.warmLimit;
    if (this.images.size <= limit) return;
    const keep = new Set(this.wanted);
    for (const index of [...this.images.keys()]) {
      if (this.images.size <= limit) break;
      if (!keep.has(index)) this.images.delete(index);
    }
  }

  private pump(): void {
    if (this.stopped || this.gaveUp) return;
    while (this.inflight < this.concurrency) {
      const next = this.nextNeeded();
      if (next === null) return;
      this.load(next);
    }
  }

  private nextNeeded(): number | null {
    for (const index of this.wanted) {
      if (this.images.has(index) || this.failed.has(index) || this.loading.has(index)) continue;
      return index;
    }
    return null;
  }

  private load(index: number): void {
    const image = new Image();
    image.decoding = 'async';
    image.width = this.set.width;
    image.height = this.set.height;
    this.loading.add(index);
    this.inflight += 1;

    const settle = () => {
      this.loading.delete(index);
      this.inflight -= 1;
      this.pump();
    };

    image.onload = () => {
      this.images.set(index, image);
      this.consecutiveFailures = 0;
      settle();
      this.callbacks.onFrameAvailable?.(index);
      // Pre-decode so the first paint of this frame is not a jank spike.
      if (typeof image.decode === 'function') void image.decode().catch(() => undefined);
    };

    image.onerror = () => {
      this.failed.add(index);
      this.consecutiveFailures += 1;
      settle();
      if (this.consecutiveFailures >= this.maxConsecutiveFailures && !this.gaveUp) {
        this.gaveUp = true;
        this.callbacks.onGiveUp?.(
          `${this.consecutiveFailures} consecutive frames failed to load`,
        );
      }
    };

    image.src = frameUrl(this.set, index, this.tier);
  }

  destroy(): void {
    this.stopped = true;
    for (const image of this.images.values()) {
      image.onload = null;
      image.onerror = null;
    }
    this.images.clear();
    this.wanted = [];
  }
}