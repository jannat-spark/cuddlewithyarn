# Cuddle With Yarn

A production e-commerce site for a handmade crochet atelier. The homepage hero is a
**scroll-controlled, 271-frame canvas sequence** — three yarns, two hands, crochet
stitches, a growing flower, the red rose purse, the finished collection — and the shop
around it is a real commerce application with server-priced orders, a protected studio
back office and Supabase persistence.

---

## Quick start

```bash
npm install
npm run assets      # encode the frame sequence, stills and product photography
npm run dev         # http://localhost:3000
```

`npm run assets` is required once. It reads `frames/` (271 JPEGs) and the three 2K identity
artworks in `images!!/`, and writes:

| Output | What it is |
| --- | --- |
| `public/sequences/hero/720,1280,1920/f_0001.webp …` | The scroll sequence, three responsive tiers |
| `public/sequences/hero/manifest.json` | The runtime contract (counts, focal point, tiers, stills) |
| `public/media/hero-poster-*.webp`, `still-*.webp` | Poster, chapter stills, fallback image, `<noscript>` image |
| `public/media/og-hero.jpg` | 1200×630 Open Graph card, art-directed with the wordmark |
| `public/media/shop/*` | Catalogue photography, cut from real frames of the sequence |
| `public/media/editorial/*` | "Real work" photography for the atelier sections |
| `public/brand/*` | The three identity marks, cropped and recoloured (see **Brand identity**) |
| `src/app/icon.png`, `apple-icon.png` | Favicon and home-screen icon, generated from the badge |

No Supabase project is needed to run it. Without credentials the app uses a local
JSON store (`.data/db.json`) and a passcode for `/admin`, so the whole shopping and
admin flow is testable immediately. See **Going to production** below.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | `tsc --noEmit`, ESLint |
| `npm run assets` | All image pipelines, then a reference check |
| `npm run assets:brand` | Identity marks only — the three 2K sources in `images!!/` |
| `npm run assets:check` | Resolves every literal `/media`, `/brand`, `/sequences` path in `src/` against `public/` |
| `npm run db:seed` | Upsert the catalogue into Supabase |
| `node scripts/shoot.mjs <url>` | Screenshots the hero at five scroll stops across four viewports |
| `node scripts/e2e.mjs <url>` | 39 checks: validation, server-side pricing, duplicates, uploads, admin guard, routes |
| `node scripts/admin-e2e.mjs <url>` | 20 checks: sign in, order pipeline, refused transitions, sign out |
| `node scripts/ux-e2e.mjs <url>` | 63 checks: reduced motion, blocked sequence, empty cart, checkout validation, keyboard, scroll determinism, the closing hold, collection pages, brand identity |
| `node scripts/measure.mjs <url>` | First-paint payload and timings on a throttled mid-range Android profile |

---

## Brand identity

The three artworks in `images!!/` are the source of truth for the brand. They are
monochrome — one brown on one cream — so `scripts/build-brand.mjs` recovers a single
alpha channel from each one and emits three colourways from it:

| Colourway | Use |
| --- | --- |
| `paper` | The original flattened onto the exact brand off-white (`#f9f3e4`, sampled from the artwork). Two to ten kilobytes, because it is a flat colour field. |
| `ink` | The same alpha, filled with the brand brown `#4a2a21`, on transparency. Safe on any light surface. |
| `champagne` | The same alpha in champagne, for the deep-wine panels. |

`BrandMark` places them. The header carries **both** wordmark colourways in the DOM and
cross-fades between them with an attribute selector, so moving between the over-hero and
solid header states costs no request and no layout shift.

Two details that are easy to get wrong and were not:

- **The alpha is measured per output size**, not downscaled from a master. The supplied
  artwork carries hairline flourishes barely a pixel wide at 2K; scaled into a 28px-tall
  header they are sub-pixel noise that cost ~80 KB in WebP alpha and read as dirt.
- **The paper token in `globals.css` is the same `#f9f3e4` the paper variant is flattened
  onto.** That is what makes the wordmark seamless on the page background. Nothing on the
  site is white: `--color-paper` replaces it everywhere, and `--color-brand-700` carries
  the logo's brown.

---

## The hero

### Scroll control

`position: sticky` inside a `500svh` section pins the stage. Progress is measured from the
cached section offset, not from a rect read on every scroll event:

```
progress  = clamp(scrollY − sectionTop, 0, travel) / travel
position  = hold(progress)          // 7% hold at the start, 18% hold at the end
frame     = round(position × (frameCount − 1))
```

Two details the geometry depends on:

- The measurement is from the **section's** offset, not the sticky's `top` (a stuck
  element's `top` stays at `0`, which is the trap that makes most of these sequences
  silently do nothing).
- `travel` and `sectionTop` are cached and only re-measured on resize, on the
  `ResizeObserver`, and after webfonts land. Reading `getBoundingClientRect()` in the
  scroll handler forces a synchronous reflow per event, which on a phone is three or four
  reflows for one visible frame.

It is fully deterministic: stop at 42% and that frame stays on screen; scroll back and
the sequence reverses; a refresh mid-hero restores the right frame immediately. There
is no autoplay, no `IntersectionObserver`-triggered playback and no video element.

### Holding the last frame

The sequence exists to deliver one thing: three yarns becoming a finished collection.
Mapping scroll linearly onto frames means that photograph is on screen for about twelve
frames and then gone — which is the one outcome the whole hero is built to avoid.

`END_HOLD` gives the last **18% of the pin** to frame 271 — roughly two thirds of a
screen of scrolling — and `START_HOLD` gives the first 7% to frame 1 so the opening
composition holds long enough to read the wordmark over it. The 271 photographs are
compressed into the remaining 75% and are still evenly paced.

The hold is also where the closing call to action appears, so it is long enough to read
*and* tap. The chapter rail and the skip control fade out as it arrives: both are about
the journey, and both are redundant once it is over.

### Surviving a hard flick

The failure mode of a scroll-scrubbed sequence is a fast scroll: a thumb can move the
page several thousand pixels between two frames, which is hundreds of photographs, and
following that literally means the canvas samples whatever happens to be resident. The
picture appears to fall apart.

Three things fix it:

- **The canvas is rate limited, not the page.** `playbackRate` caps how fast the *displayed
  frame* may advance (~85 fps here). The same gesture now plays the sequence out at a
  legible speed, while ordinary scrolling — well under the cap — stays exactly 1:1. The cap
  lifts eightfold the moment the page stops moving, so a fling-and-stop settles onto the
  frame the visitor scrolled to within a couple of frames.
- **The loop is not driven by scroll events.** A fling, trackpad momentum, releasing a
  scrollbar drag and the skip button all stop firing events while the canvas is still
  hundreds of frames behind. The hero keeps its own `requestAnimationFrame` alive until it
  has caught up *and* painted the exact frame, then goes quiet.
- **The loader window is biased by velocity, not just position.** Frames ahead of the
  direction of travel are cheap to request, frames behind are expensive, and the penalty
  grows with speed — the faster the visitor moves, the further ahead the window reaches,
  because that is the only place a request can still land in time to be used. Reversing
  direction flips the bias.

Neighbour substitution is capped at ±2 frames and prefers the direction of travel. Reaching
further would paint a photograph from a visibly different point in the sequence — a rose
halfway grown appearing where it should be finished — which reads as a broken picture
rather than a slow one.

### React never re-renders on scroll

The scroll listener is passive and writes only to refs and CSS custom properties on the
sticky element (`--copy-alpha`, `--chapter-alpha`, `--end-alpha`, `--progress`). Text
content is written with `textContent` on at most six elements. The canvas redraws inside a
single `requestAnimationFrame` and **only when the target frame's image actually changes**.

### Progressive loading

`FrameSequenceLoader` keeps a moving window around the current scroll position, biased
forward because scrolling down is what visitors do:

- **First paint costs ~260 KB** — a burst of 10–14 frames. The resident window only grows
  once scrolling starts.
- Concurrency 4 on lean devices, 8 otherwise, detected via `deviceMemory` /
  `hardwareConcurrency`. `saveData` and a reported `2g`/`slow-2g` connection drop the tier
  to 720 and halve the budget: a soft picture beats a stalled one.
- The resident window is budgeted **by bytes, not by frame count** (`chooseBudget`): a
  1920-wide frame costs six times the memory of a 720-wide one, so a flat number would be
  reckless on desktop and stingy on a phone.
- The window is only re-sorted when the target moves two frames or the direction flips, so
  a slow scrub does not sort 271 entries per animation frame.
- The currently painted frame is pinned and never evicted, so a slow connection shows a
  slightly stale stitch rather than a flash of something distant.
- Frames are `immutable`-cached for a year, so revisiting is free.
- Eight consecutive network failures, a missing manifest, or a 15-second watchdog all
  fall back to a still. So does `prefers-reduced-motion`, which unpins the hero entirely.

### Mobile composition, and the 9:16 escape hatch

A 16:9 source full-bleed on a 390×844 phone would keep only 26% of its width and stretch
~500 source pixels across the screen — mush, and the hands disappear. So on portrait
viewports the composer switches strategy (`band`):

- The frame is drawn as a **near-native-resolution band** across the middle 60% of the
  screen, cropping to a centre-weighted vertical slice (the subject stays centred across
  all 271 frames).
- The gutters above and below are filled with an **upscaled 32px-wide copy of the same
  frame** — free blur, no filter, no second full-resolution blit.
- The wordmark and both CTAs live in those gutters, over a colour wash that switches with
  the strategy. The hands and the crochet work are never covered.
- Cost per redraw: one tiny upscale plus one sharp `drawImage`. The canvas backing store is
  capped at ~1.35 Mpx.

**Adding a native 9:16 sequence requires no component changes.** The manifest is
set-shaped (`sets.landscape`, optionally `sets.portrait`); `resolveSequence` prefers
`portrait` on portrait viewports and the composer already cover-fits it full-bleed. To ship
one, emit a second set in `scripts/build-frames.mjs` and the phone path switches to it
automatically.

### Measured cost

Throttled profile: 390×844 @2x, 10 Mbps, 60 ms latency, 4× CPU throttle.

| Page | Requests | Transferred | JS | CSS | Fonts |
| --- | --- | --- | --- | --- | --- |
| Home (first paint) | 52 | **945 KB** | 173 KB | 12.5 KB | 91 KB |
| Home (+45% scroll) | — | 1.83 MB | — | — | — |
| Shop | 42 | 417 KB | 177 KB | 12.2 KB | 90 KB |
| Product | 28 | 334 KB | 162 KB | 12.2 KB | 90 KB |
| Checkout | 24 | 355 KB | 165 KB | 12.2 KB | 90 KB |

A full pass through the hero fetches 50 frames for 271 photographs; the rest are never
requested. Zero long tasks on any page.

Three payload decisions worth noting: the hero's no-JS fallback image is declared inside
`<noscript>` rather than as a CSS background (which would have cost 47 KB on every
visit); a `unicode-range`-limited local face supplies `₹`, which otherwise forced an
84 KB Cyrillic subset download to render one glyph on every price; and the two header
wordmark colourways are cross-faded from the DOM rather than swapped, so the header
change costs a 260 ms opacity transition instead of a second 36 KB image.

---

## Commerce

```
Browse → Collection → Product → Add to bag → Checkout → Place order → Confirmation
```

### The shop is a set of pages, not one long grid

The homepage is a shop **window**, not the catalogue. It carries the hero, the studio
story, the collection tiles, one signature piece and `HOT_PRODUCT_SLUGS` — a short list
the studio curates in `src/lib/brand.ts`. Everything else is browsable on `/shop` and on
one page per collection.

| Route | What it is |
| --- | --- |
| `/` | Window: hero, story, collections, curated picks, signature piece, custom form |
| `/shop` | Index of the collections plus the full catalogue in one list |
| `/shop/bags`, `/shop/accessories`, `/shop/flowers` | Collection pages: a lead visual, a written intro, "good to know", the products, a cross-sell rail |
| `/product/[slug]` | Gallery, details, materials, add to bag |
| `/cart`, `/checkout`, `/order/[orderNumber]` | Bag, checkout, confirmation |

Categories are real pages with their own metadata, `ItemList` structured data and entries
in the sitemap. The legacy `/shop?category=bags` form **redirects** to `/shop/bags`, so
links that are already shared, indexed or printed on old packaging land on the page that
replaced them rather than on a filtered duplicate.

Changing what appears in the window is a one-line edit to `HOT_PRODUCT_SLUGS` — no layout
change, and a slug that no longer exists is skipped rather than breaking the page.

- **Bag** lives in `localStorage` behind a `useSyncExternalStore` store: no
  setState-in-effect, no hydration mismatch, and cross-tab sync for free. Add-to-bag opens
  a bottom sheet (mobile-native pattern) rather than navigating away.
- **Checkout** posts product ids and quantities only. Every price, shipping charge and
  total is rebuilt on the server from the catalogue — the browser's numbers are discarded,
  not trusted.
- **Duplicate submissions** are prevented by an idempotency key generated once per bag and
  a `submitting` guard. The key has a unique index; a conflict returns the original order
  instead of creating a second one.
- **Order numbers** look like `CWY-260412-7F3K`.
- Confirmation pages are `noindex` and reachable only by order number.

### Data model

`supabase/schema.sql` is idempotent and creates four tables with RLS enabled:

| Table | Notes |
| --- | --- |
| `products` | Publicly readable with the anon key; nothing else is |
| `orders` | Status enum, idempotency key, denormalised totals |
| `order_items` | **Immutable snapshot**: `product_name`, `unit_price`, `quantity`, `line_total` |
| `custom_requests` | Colour, size, optional reference image URL, notes, status |

`order_items` deliberately stores the price paid. Re-pricing the catalogue never rewrites
history.

### Validation

`src/lib/validation.ts` is dependency-free and shared: the forms run it for fast feedback,
the route handlers run it again as the actual gate. Indian mobiles (`[6-9]` + 9 digits),
6-digit PIN codes, 20+ character descriptions, and a reference-image URL that must be
either same-origin or `http(s)`.

---

## Studio back office

`/admin` — orders list with status filters, order detail with the customer note and a
WhatsApp/email shortcut, the custom-request inbox with attached reference images, and
status transitions.

Status moves along a documented pipeline, enforced **on the server**:

```
new → confirmed → processing → shipped → completed
                  ↘ cancelled (from any non-terminal state)
completed / cancelled ↘ (terminal)
```

An illegal jump returns `409`, not a hidden button. Authentication is Supabase Auth when
configured (session cookie, email allow-list via `NEXT_PUBLIC_ADMIN_EMAIL`); otherwise a
signed passcode cookie for local development only. Orders and requests are read with the
service role, which exists exclusively in server code behind that gate — the anon key
cannot reach them at all.

---

## Custom crochet

Section 05 on the homepage and the whole of `/custom` share one form: name, phone, email,
description, colour preference, size preference, **optional** reference image, notes.

The image uploads to `POST /api/uploads` first — Supabase Storage bucket
`custom-references` in production, `.data/uploads/` locally. Type and size are validated,
the filename is a UUID, and if the upload cannot reach storage the form says so and still
lets the request through, because the reference image is genuinely optional.

---

## SEO

Per-route titles and descriptions, canonical URLs, Open Graph and Twitter cards, a
generated `sitemap.xml` (including every product and every collection page), and
`robots.txt` that keeps `/admin`, `/api`, `/cart`, `/checkout` and `/order/` out of the
index.

Structured data: `Organization` sitewide, `Product` with `Offer` and correct availability
(`PreOrder` for made-to-order) on product pages, `BreadcrumbList` on shop, collection and
product pages, `ItemList` on collection pages. Product slugs are clean and stable.

---

## Accessibility

- Semantic landmarks, one `h1` per page, real headings throughout.
- Skip link, visible focus rings everywhere (champagne on wine sections), full keyboard
  operation including the mobile menu and the bag sheet (`Escape` closes, focus moves).
- The bag sheet is a labelled `role="dialog" aria-modal`.
- Forms are associated labels, `aria-invalid`, per-field error text, and an `role="alert"`
  summary that receives focus on failure.
- Descriptive alt text on every photograph — all of them real, cut from the sequence.
- `prefers-reduced-motion` replaces the sequence with a considered still, unpins the hero,
  removes the scroll cue and neutralises every transition.
- A text summary of what the sequence shows is available to screen readers, and chapter
  changes are announced politely.

---

## Design

The brand pair comes from the supplied identity artwork: `--color-paper` (`#f9f3e4`) is
the logo's own off-white and is the page background — **nothing on this site is white** —
and `--color-brand-700` (`#4a2a21`) is its brown, used for the knockout wordmark, focus
accents and the darker ink tones. Rich crimson, blush, champagne and deep wine sit on top
of that pair for the photography and the panels.

Playfair Display for the editorial voice, Inter for text — both self-hosted at build time,
`display: swap`, latin subset only, one weight plus italic.

Identity marks appear where they do work rather than everywhere: the header (cross-fading
between colourways), the footer, the hero watermark and closing card, one mark per page
header, and the favicon. Everywhere else they are a watermark at 6–8% opacity.

Deliberately avoided: glassmorphism, generic beige-and-Etsy styling, soft rounded cards,
AI gradient washes, dark SaaS surfaces, decorative 3D and gratuitous motion. Hairline
rules, real photography, square corners, one Didone and one grotesque.

---

## Going to production

```bash
cp .env.example .env.local
```

| Variable | Required for |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, Open Graph, sitemap |
| `NEXT_PUBLIC_SUPABASE_URL` | Everything Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Storefront reads + admin sign-in |
| `SUPABASE_SERVICE_ROLE_KEY` | Orders, requests, uploads — **server only** |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Who may enter `/admin` |

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Create an auth user for the admin email (`NEXT_PUBLIC_ADMIN_EMAIL`).
3. `npm run db:seed` to upsert the catalogue.
4. `npm run build && npm start`.

### Adding frames

Drop new JPEGs into `frames/` named `ezgif-frame-NNN.jpg` and run `npm run assets:frames`.
The manifest regenerates with the new count. Chapter boundaries live in `CHAPTERS` in
`src/components/hero/ScrollHero.tsx` as progress fractions; `START_HOLD` and `END_HOLD`
beside them.

### Replacing the identity artwork

Drop new files into `images!!/` and run `npm run assets:brand`. Update `MARKS` in
`scripts/build-brand.mjs` if the filenames change, and re-check the `PAPER`, `INK` and
`CHAMPAGNE` constants against the new artwork — the page background token in
`globals.css` must stay identical to `PAPER` or the wordmark will show a seam on it.

### Notes

- Product photography is cut directly from the sequence, because that footage is the real
  photography of these pieces. Nothing in the catalogue is rendered or stylised.
- `scripts/contact-sheet.mjs` regenerates a visual contact sheet of the catalogue crops —
  worth running after any change to `scripts/build-products.mjs`.
- `npm run assets:check` exists because a typo in an image path renders as a broken image
  that looks like a styling problem rather than a data problem.
- Admin responses carry the existing storefront frames' brand watermark in the bottom
  right, which reads as the studio's own mark.
