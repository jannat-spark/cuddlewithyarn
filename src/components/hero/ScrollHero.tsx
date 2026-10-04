'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Link from 'next/link';
import BrandMark from '@/components/brand/BrandMark';
import { FrameSequenceLoader } from './FrameSequenceLoader';
import {
  chooseBudget,
  chooseTier,
  fallbackStill,
  playbackRate,
  resolveSequence,
  type SequenceManifest,
} from './manifest';
import {
  computeComposition,
  createBundle,
  paintFrame,
  type CanvasBundle,
  type Composition,
  type CompositionMode,
} from './composer';

/* --------------------------------------------------------------- motion query */

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function prefersReducedMotionSnapshot(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;
}

function serverMotionSnapshot(): boolean {
  return false;
}

/** Live `prefers-reduced-motion`, read without an effect or a hydration mismatch. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotionSnapshot,
    serverMotionSnapshot,
  );
}

type Chapter = {
  /** Progress from which this chapter is on screen. */
  from: number;
  label: string;
};

const CHAPTERS: Chapter[] = [
  { from: 0.0, label: 'Three yarns' },
  { from: 0.11, label: 'Two hands' },
  { from: 0.27, label: 'Crochet stitches' },
  { from: 0.43, label: 'A growing flower' },
  { from: 0.6, label: 'The red rose purse' },
  { from: 0.83, label: 'The complete collection' },
];

const CHAPTER_LABELS = CHAPTERS.map((c) => c.label);

/** Scroll length of the pinned hero, in viewport heights. */
const PIN_SCREENS = 5;

/**
 * Share of the pin spent holding the opening frame before anything moves.
 *
 * Landing on the hero should show one composed photograph, not the first frame
 * already sliding away, and the wordmark needs a moment before it hands over to
 * the sequence.
 */
const START_HOLD = 0.07;

/**
 * Share of the pin spent holding the finished collection.
 *
 * This is the frame the whole sequence builds towards — three yarns becoming a
 * row of finished pieces — and it arrives exactly when the visitor stops
 * scrolling. Without a hold it is on screen for a few frames and gone, which is
 * the one thing the sequence exists to deliver. It is also where the closing
 * call to action appears, so the hold has to be long enough to read and tap.
 */
const END_HOLD = 0.18;

const STATIC_STILL = '/media/still-collection-1280.webp';
const POSTER = '/media/hero-poster-960.webp';

function chapterAt(progress: number): number {
  let index = 0;
  for (let i = 0; i < CHAPTER_LABELS.length; i += 1) {
    if (progress >= CHAPTERS[i].from) index = i;
  }
  return index;
}

/**
 * Scroll progress remapped onto the sequence, holding at both ends.
 *
 * Returns 0..1 across the photographs rather than across the scroll: everything
 * in between is linear, and the tail of the pin is given to the last frame.
 */
function sequencePosition(progress: number): number {
  if (progress <= START_HOLD) return 0;
  if (progress >= 1 - END_HOLD) return 1;
  return (progress - START_HOLD) / (1 - START_HOLD - END_HOLD);
}

type Runtime = {
  raf: number;
  frame: number;
  direction: number;
  drawn: HTMLImageElement | null;
  bundle: (CanvasBundle & { composition: Composition }) | null;
  loader: FrameSequenceLoader | null;
  manifest: SequenceManifest | null;
  poster: HTMLImageElement | null;
  staticStill: HTMLImageElement | null;
  hasPortraitSet: boolean;
  /** Raw scroll progress, 0..1. Drives the DOM. */
  progress: number;
  /** Raw scroll progress from the previous tick, used to detect a stop. */
  previous: number;
  /** Rate-limited position across the photographs, 0..1. Drives the canvas. */
  display: number;
  /** True while the display has not yet caught up with the scroll position. */
  behind: boolean;
  /** Cached geometry, so scrolling never reads layout. */
  sectionTop: number;
  travel: number;
  /** The sticky stage. Custom properties are written here for all its children. */
  stage: HTMLElement;
  /** Frames per second the canvas is allowed to advance. */
  rate: number;
  cancelled: boolean;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export default function ScrollHero({ manifestUrl }: { manifestUrl: string }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);
  const chapterRef = useRef<HTMLParagraphElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<HTMLDivElement | null>(null);

  const rt = useRef<Runtime>({
    raf: 0,
    frame: 1,
    direction: 1,
    drawn: null,
    bundle: null,
    loader: null,
    manifest: null,
    poster: null,
    staticStill: null,
    hasPortraitSet: false,
    progress: 0,
    previous: 0,
    display: 0,
    behind: false,
    sectionTop: 0,
    travel: 1,
    stage: null as unknown as HTMLElement,
    rate: 80,
    cancelled: false,
  });

  const reducedMotion = usePrefersReducedMotion();
  const pinned = !reducedMotion;
  const [phase, setPhase] = useState<'poster' | 'sequence' | 'static'>('poster');

  const paint = useCallback((image: HTMLImageElement) => {
    const runtime = rt.current;
    if (!runtime.bundle) return;
    paintFrame(runtime.bundle, image, runtime.bundle.composition);
  }, []);

  useEffect(() => {
    const runtime = rt.current;
    const canvasHost = canvasHostRef.current;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!canvasHost || !section || !sticky) return;

    // StrictMode mounts effects twice in development. Without this reset the
    // first cleanup would permanently mark the shared runtime as cancelled.
    runtime.cancelled = false;
    runtime.raf = 0;
    runtime.stage = sticky;

    if (!reducedMotion) {
      // Opt in to the tall pin. Until this runs the hero is a single screenful,
      // which is exactly what a visitor without JavaScript should see.
      section.setAttribute('data-hero-ready', 'true');
    }

    /* ------------------------------------------------------- geometry cache */

    /**
     * Scroll position is the only thing read on every frame, and reading it must
     * not cost a layout. Measuring the section once and subtracting
     * `window.scrollY` keeps the scroll path free of `getBoundingClientRect`,
     * which is what previously forced a synchronous reflow on every event.
     */
    const measure = () => {
      const rect = section.getBoundingClientRect();
      runtime.sectionTop = rect.top + window.scrollY;
      runtime.travel = Math.max(0, section.offsetHeight - sticky.offsetHeight);
    };

    measure();
    // The pin only reaches its full height once the attribute above is applied,
    // and fonts landing can move the section; re-measure when both have settled.
    const settled = window.setTimeout(measure, 120);
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!runtime.cancelled) measure();
    });

    /* ------------------------------------------------------- composition */

    const applyComposition = () => {
      const rect = sticky.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const source = runtime.manifest?.sets.landscape ?? {
        width: 1920,
        height: 1080,
        focal: { x: 0.5, y: 0.47 },
      };

      let composition: Composition;
      try {
        composition = computeComposition(
          width,
          height,
          {
            width: source.width,
            height: source.height,
            focal: source.focal ?? { x: 0.5, y: 0.47 },
          },
          runtime.hasPortraitSet,
        );
      } catch {
        return;
      }

      let bundle = runtime.bundle;
      const wantedWidth = Math.round(width * composition.dpr);
      const wantedHeight = Math.round(height * composition.dpr);
      if (!bundle || bundle.canvas.width !== wantedWidth || bundle.canvas.height !== wantedHeight) {
        bundle?.canvas.remove();
        try {
          bundle = Object.assign(createBundle(width, height, composition.dpr), { composition });
        } catch {
          return;
        }
        runtime.bundle = bundle;
      } else {
        bundle.composition = composition;
      }

      canvasHost.replaceChildren(bundle.canvas);
      bundle.canvas.style.width = '100%';
      bundle.canvas.style.height = '100%';
      bundle.canvas.style.display = 'block';

      if (modeRef.current) modeRef.current.dataset.mode = composition.mode;

      // Repaint immediately: a resize must never reveal an empty canvas.
      const current =
        runtime.loader?.get(runtime.frame) ??
        runtime.loader?.nearest(runtime.frame)?.image ??
        runtime.drawn ??
        runtime.poster ??
        runtime.staticStill;
      if (current) {
        runtime.drawn = current;
        paint(current);
      }
    };

    /* ------------------------------------------------------------- paint */

    /**
     * Put the best available frame for the current position on the canvas.
     *
     * Returns true only when the *exact* frame is on screen. A neighbour is
     * better than a blank canvas, but it is still the wrong picture, so it
     * reports false and the caller keeps asking — otherwise the canvas would
     * settle on a frame one or two steps away from where the visitor scrolled
     * and quietly stay there, because no further scroll events arrive to
     * correct it.
     */
    function tryPaint(): boolean {
      const loader = runtime.loader;
      const bundle = runtime.bundle;
      if (!loader || !bundle) return true;

      const target = runtime.frame;
      const exact = loader.get(target);
      if (exact) {
        if (exact !== runtime.drawn) {
          runtime.drawn = exact;
          loader.pin(target);
          paintFrame(bundle, exact, bundle.composition);
        }
        return true;
      }

      const near = loader.nearest(target, runtime.direction);
      if (near && near.image !== runtime.drawn) {
        runtime.drawn = near.image;
        // Pin the frame that is actually on screen, not the one being aimed at:
        // the aim may never arrive, and evicting the visible frame flashes the
        // canvas to whatever was left behind.
        loader.pin(near.index);
        paintFrame(bundle, near.image, bundle.composition);
      }
      return false;
    }

    /* --------------------------------------------------------------- frame loop */

    let lastTick = 0;

    function schedule() {
      if (runtime.raf || runtime.cancelled) return;
      runtime.raf = requestAnimationFrame(tick);
    }

    /**
     * One tick: advance the display towards the scroll position, paint, and
     * decide whether another tick is owed.
     *
     * Scroll events are not a reliable heartbeat. A fling, a momentum scroll on
     * a trackpad, releasing a scrollbar drag, and the "skip intro" button all
     * stop firing events while the canvas is still hundreds of frames behind —
     * so a scroll-driven-only loop freezes the sequence mid-way and leaves it
     * there. The loop therefore keeps itself alive until it has actually caught
     * up and painted the exact frame, then goes quiet.
     */
    function tick() {
      runtime.raf = 0;
      if (runtime.cancelled) return;
      const now = performance.now();
      const dt = lastTick === 0 ? 16 : Math.min(64, Math.max(1, now - lastTick));
      lastTick = now;
      sync(dt);
      if (runtime.raf === 0 && (runtime.behind || !tryPaint())) schedule();
    }

    /* ------------------------------------------------------------ scroll */

    function sync(dt: number) {
      if (runtime.cancelled || !runtime.loader) {
        runtime.behind = false;
        return;
      }
      const travel = runtime.travel;
      if (!(travel > 0)) {
        runtime.behind = false;
        return;
      }

      // Pure arithmetic from the cached offset — no layout read on this path.
      const raw = (window.scrollY - runtime.sectionTop) / travel;
      const progress = raw < 0 ? 0 : raw > 1 ? 1 : raw;

      /* Rate limiting.
       *
       * A thumb can move the page several thousand pixels between two frames,
       * which is hundreds of photographs. Following that literally means the
       * canvas samples whatever happens to be resident and the sequence appears
       * to fall apart. Clamping how fast the *canvas* may advance turns the same
       * gesture into the sequence playing out at a legible speed, while ordinary
       * scrolling — well under the cap — stays exactly one-to-one.
       *
       * The cap lifts the moment the page stops moving. Otherwise a visitor who
       * flicked and stopped would sit watching the sequence catch up for a
       * second and a half; instead it settles onto the frame they scrolled to
       * within a couple of frames and stays there. */
      const loader = runtime.loader;
      const moving = Math.abs(progress - runtime.previous) >= 0.00005;
      runtime.previous = progress;
      const position = sequencePosition(progress);
      const frames = Math.max(1, loader.total - 1);
      const cap = ((moving ? runtime.rate : runtime.rate * 8) * dt) / 1000 / frames;
      const delta = position - runtime.display;
      if (Math.abs(delta) <= cap) runtime.display = position;
      else runtime.display += Math.sign(delta) * cap;
      runtime.behind = Math.abs(position - runtime.display) > 0.0002;

      const frame = Math.round(runtime.display * frames) + loader.startIndex;
      if (frame !== runtime.frame) {
        runtime.direction = Math.sign(frame - runtime.frame) || runtime.direction;
        loader.setTarget(frame, dt);
        runtime.frame = frame;
      }

      tryPaint();

      // Every per-scroll DOM write happens here — once per animation frame, and
      // never through React state. The custom properties live on the sticky
      // container so the wordmark, the scroll cue and the chapter all read from
      // one place. Skipped entirely when the position has not meaningfully moved.
      if (Math.abs(progress - runtime.progress) < 0.0002) return;
      runtime.progress = progress;

      /* The closing hold.
       *
       * The end card rides the final hold, so it arrives with the photograph it
       * is asking about and stays long enough to be read and tapped. The chapter
       * rail and the skip control step aside for it: both are about the journey,
       * and both are redundant once the journey is over. */
      const end = Math.min(1, Math.max(0, (progress - (1 - END_HOLD + 0.015)) / 0.07));

      const bar = barRef.current;
      if (bar) {
        bar.style.opacity = (1 - end).toFixed(3);
        bar.style.visibility = end > 0.98 ? 'hidden' : 'visible';
      }

      const skip = skipRef.current;
      if (skip) {
        skip.setAttribute(
          'data-visible',
          end < 0.05 && progress > 0.02 && progress < 0.985 ? 'true' : 'false',
        );
      }

      const copy = copyRef.current;
      if (copy) {
        const fade = Math.min(1, Math.max(0, progress / 0.085));
        runtime.stage.style.setProperty('--copy-alpha', (1 - fade).toFixed(3));
        runtime.stage.style.setProperty('--copy-shift', `${-20 * fade}px`);
        if (progress > 0.13) copy.setAttribute('data-gone', 'true');
        else copy.removeAttribute('data-gone');
      }

      const chapter = chapterRef.current;
      if (chapter) {
        const label = CHAPTER_LABELS[chapterAt(progress)];
        if (chapter.textContent !== label) chapter.textContent = label;
        const fade = Math.min(1, Math.max(0, (progress - 0.04) / 0.09));
        chapter.style.setProperty('--chapter-alpha', String(fade));
        chapter.style.setProperty('--chapter-shift', `${10 * (1 - fade)}px`);
      }

      if (endRef.current) {
        endRef.current.style.setProperty('--end-alpha', end.toFixed(3));
        endRef.current.style.setProperty('--end-shift', `${14 * (1 - end)}px`);
        if (end > 0.02) endRef.current.removeAttribute('data-hidden');
        else endRef.current.setAttribute('data-hidden', '');
      }

      railRef.current?.style.setProperty('--progress', progress.toFixed(4));
    }

    function onScrollEvent() {
      schedule();
    }

    /* --------------------------------------------------------- lifecycle */

    if (reducedMotion) {
      // Reduced motion: no pin, no scroll listener, one considered still. The
      // still is painted through the same composer, so the layout, the wash and
      // the type are identical to the sequence — only the motion is gone.
      void loadImage(STATIC_STILL).then((image) => {
        if (runtime.cancelled) return;
        runtime.staticStill = image;
        runtime.drawn = image;
        applyComposition();
      });
      const stillResize = new ResizeObserver(() => applyComposition());
      stillResize.observe(sticky);
      return () => {
        runtime.cancelled = true;
        window.clearTimeout(settled);
        stillResize.disconnect();
      };
    }

    let resizeObserver: ResizeObserver | null = null;

    const fallBackToStill = () => {
      if (runtime.cancelled) return;
      runtime.loader?.destroy();
      runtime.loader = null;
      setPhase('static');
      void loadImage(fallbackStill(runtime.manifest)).then((still) => {
        if (runtime.cancelled) return;
        runtime.staticStill = still;
        if (still) {
          runtime.drawn = still;
          paint(still);
        }
      });
    };

    const setup = async () => {
      // The poster is the LCP image: paint it before anything else happens.
      const [poster, manifest] = await Promise.all([
        loadImage(POSTER),
        fetch(manifestUrl, { cache: 'force-cache' })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null),
      ]);
      if (runtime.cancelled) return;

      runtime.poster = poster;
      runtime.drawn = poster;
      applyComposition();
      measure();

      if (!manifest || typeof manifest !== 'object' || !manifest.sets?.landscape) {
        fallBackToStill();
        return;
      }

      runtime.manifest = manifest as SequenceManifest;
      runtime.hasPortraitSet = Boolean(manifest.sets.portrait);

      const resolved = resolveSequence(runtime.manifest, window.innerWidth, window.innerHeight);
      if (!resolved) {
        fallBackToStill();
        return;
      }

      const { set } = resolved;
      const rect = sticky.getBoundingClientRect();
      // Mid-range Androids get fewer in-flight requests and a smaller resident
      // window. Identical picture, materially smaller memory footprint.
      const nav = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { saveData?: boolean; effectiveType?: string };
      };
      const lean = (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4;
      // Someone who asked for data saver, or who is on a link that reports
      // itself as slow, gets the small tier rather than a stalled large one.
      const frugal =
        Boolean(nav.connection?.saveData) ||
        nav.connection?.effectiveType === 'slow-2g' ||
        nav.connection?.effectiveType === '2g';

      const tier = chooseTier(set.widths, rect.width, window.devicePixelRatio || 1, frugal);
      // Resident decoded frames are budgeted by bytes, not by count: a 1920
      // frame costs six times the memory of a 720 one.
      const budget = chooseBudget(tier, set.width, set.height, frugal ? 48 : 96);

      const loader = new FrameSequenceLoader({
        set,
        tier,
        concurrency: lean ? 4 : frugal ? 4 : 8,
        budget,
        warmCount: lean ? 10 : 14,
        callbacks: {
          onFrameAvailable: schedule,
          onGiveUp: fallBackToStill,
        },
      });

      runtime.loader = loader;
      runtime.frame = set.startIndex;
      runtime.rate = playbackRate(set.count);
      loader.prewarm(lean ? 10 : 14);
      setPhase('sequence');
      lastTick = 0;
      sync(16);
      schedule();

      resizeObserver = new ResizeObserver(() => {
        measure();
        applyComposition();
        schedule();
      });
      resizeObserver.observe(sticky);

      // A watchdog: if nothing has painted within 15s, stop waiting and show the
      // still rather than an empty hero.
      window.setTimeout(() => {
        if (runtime.cancelled) return;
        if (!runtime.loader?.get(runtime.frame) && !runtime.loader?.nearest(runtime.frame)) {
          fallBackToStill();
        }
      }, 15000);
    };

    const onOrientation = () => {
      measure();
      applyComposition();
      onScrollEvent();
    };

    window.addEventListener('scroll', onScrollEvent, { passive: true });
    window.addEventListener('resize', onOrientation, { passive: true });
    window.addEventListener('orientationchange', onOrientation, { passive: true });

    void setup();

    return () => {
      runtime.cancelled = true;
      window.clearTimeout(settled);
      if (runtime.raf) cancelAnimationFrame(runtime.raf);
      runtime.loader?.destroy();
      runtime.bundle?.canvas.remove();
      runtime.bundle = null;
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', onScrollEvent);
      window.removeEventListener('resize', onOrientation);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, [manifestUrl, paint, reducedMotion]);

  const skipIntro = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    // Land inside the closing hold, so the finished collection is on screen
    // rather than one frame before it.
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    const top = section.offsetTop + travel * (1 - END_HOLD * 0.55);
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="From three yarns to a finished crochet collection"
      data-hero-root=""
      className={pinned ? 'hero-pin' : 'hero-static'}
      style={{ '--pin-screens': PIN_SCREENS } as CSSProperties}
    >
      <div ref={stickyRef} data-hero-sticky={pinned ? 'true' : 'false'} className="hero-stage">
        {/* With JavaScript the canvas paints everything, including the failure
            and reduced-motion stills, so the CSS background would only cost
            47 KB on every visit. It is declared for the no-JS case instead. */}
        <noscript>
          <style>{`[data-hero-sticky]{background-image:url(${STATIC_STILL});background-size:cover;background-position:center}`}</style>
        </noscript>

        <div ref={canvasHostRef} className="absolute inset-0" aria-hidden="true" />

        <div
          ref={modeRef}
          data-mode="band"
          data-hero-wash=""
          className="hero-wash pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />

        {/* Identity mark. Held off the phone layout, where the wordmark owns the
            top of the stage and the type is already doing enough. */}
        <BrandMark
          name="seal"
          tone="champagne"
          decorative
          className="brand-watermark brand-watermark--light pointer-events-none absolute right-[var(--gutter)] top-[calc(var(--header-h)+1.5rem)] hidden w-28 opacity-[0.14] md:block md:w-36 lg:w-40"
        />

        <div className="on-wine absolute inset-0 z-10">
          <div
            className="hero-copy absolute inset-x-[var(--gutter)] top-[calc(var(--header-h)+0.85rem)] md:top-1/2 md:max-w-[32rem] md:-translate-y-1/2"
            ref={copyRef}
            data-hero-copy
          >
            <p className="eyebrow eyebrow--light mb-2.5 justify-center text-[0.625rem] md:justify-start md:text-[0.6875rem]">
              Handmade in Jaipur
            </p>
            <h1 className="hero-wordmark font-display leading-[0.9] text-champagne-100">
              Cuddle
              <span className="block italic text-blush-200">with Yarn</span>
            </h1>
            <p className="mt-2.5 font-display text-[length:0.98rem] italic text-blush-200/90 md:mt-5 md:max-w-none md:text-[length:1.5rem]">
              One thread. Endless little wonders.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 md:mt-8 md:flex md:max-w-xs md:items-start">
              <Link
                href="/shop"
                className="btn btn--light min-w-0 px-2.5 text-[0.5625rem] tracking-[0.08em] min-[400px]:px-3 min-[400px]:text-[0.625rem] min-[400px]:tracking-[0.13em] md:flex-none md:px-6 md:py-3 md:text-[0.75rem] md:tracking-[0.2em]"
              >
                Shop the collection
              </Link>
              <Link
                href="/custom"
                className="btn btn--outline-light min-w-0 px-2.5 text-[0.5625rem] tracking-[0.08em] min-[400px]:px-3 min-[400px]:text-[0.625rem] min-[400px]:tracking-[0.13em] md:flex-none md:px-6 md:py-3 md:text-[0.75rem] md:tracking-[0.2em]"
              >
                Custom crochet
              </Link>
            </div>
          </div>

          {/* Closing card, pinned to the end hold. */}
          <div
            ref={endRef}
            data-hidden=""
            className="hero-end absolute inset-x-[var(--gutter)] bottom-[6.5rem] flex flex-col items-center text-center md:bottom-[7rem]"
          >
            <BrandMark name="stamp" tone="champagne" decorative className="mb-4 w-20 opacity-80" />
            <p className="eyebrow eyebrow--light justify-center">That is the whole collection</p>
            <h2 className="mt-3 max-w-[22ch] font-display text-[length:1.6rem] uppercase leading-[1.05] text-champagne-100 md:text-[length:2.5rem]">
              Every piece made
              <span className="block italic text-blush-200">after you order it</span>
            </h2>
            <div className="mt-6 grid w-full max-w-[26rem] grid-cols-2 gap-2 md:flex md:max-w-none md:justify-center">
              <Link
                href="/shop"
                className="btn btn--light min-w-0 px-2.5 text-[0.5625rem] tracking-[0.08em] min-[400px]:px-4 min-[400px]:text-[0.625rem] min-[400px]:tracking-[0.13em] md:px-6 md:py-3 md:text-[0.75rem] md:tracking-[0.2em]"
              >
                Shop all pieces
              </Link>
              <Link
                href="/shop/bags"
                className="btn btn--outline-light min-w-0 px-2.5 text-[0.5625rem] tracking-[0.08em] min-[400px]:px-4 min-[400px]:text-[0.625rem] min-[400px]:tracking-[0.13em] md:px-6 md:py-3 md:text-[0.75rem] md:tracking-[0.2em]"
              >
                Start with bags
              </Link>
            </div>
          </div>

          <div
            ref={barRef}
            className="hero-bar absolute inset-x-[var(--gutter)] bottom-5 flex items-end justify-between gap-4 md:bottom-8"
            data-hero-state={reducedMotion || phase === 'static' ? 'static' : 'sequence'}
          >
            <div className="flex items-center gap-3">
              <div
                ref={railRef}
                aria-hidden="true"
                className="hero-rail relative h-12 w-px overflow-hidden bg-champagne-200/25 md:h-16"
              >
                <span className="hero-rail__fill absolute inset-x-0 top-0 bg-champagne-200" />
              </div>
              <p ref={chapterRef} className="hero-chapter font-display italic text-champagne-200/90" data-hero-chapter>
                {CHAPTER_LABELS[0]}
              </p>
            </div>

            <button
              ref={skipRef}
              type="button"
              onClick={skipIntro}
              data-visible="false"
              className="skip-intro text-[0.625rem] uppercase tracking-[0.22em] text-champagne-200/70 underline decoration-champagne-200/30 underline-offset-4 transition-opacity hover:text-champagne-100"
            >
              Skip intro
            </button>
          </div>

          {/* First-load affordance, occupying the lower gutter. Fades with the
              wordmark so it never competes with the sequence. */}
          <p className="hero-cue absolute inset-x-[var(--gutter)] bottom-12 flex items-center gap-3 text-[0.625rem] uppercase tracking-[0.24em] text-champagne-200/60 md:hidden">
            <span className="hero-cue__line" aria-hidden="true" />
            Scroll to watch it made
          </p>
        </div>

        <p className="sr-only">
          A scroll-controlled sequence of 271 photographs: three balls of yarn, two hands
          crocheting, the stitches building into a rose, the finished red rose purse, and
          finally the whole collection laid out together. The final photograph is held on screen
          while the sequence finishes.
        </p>

        <span className="sr-only" role="status" aria-live="polite">
          {phase === 'static' ? 'Showing the collection photograph.' : ''}
        </span>
      </div>
    </section>
  );
}

export type { CompositionMode };