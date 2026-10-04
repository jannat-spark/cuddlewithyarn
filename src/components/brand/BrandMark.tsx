import { BRAND, brandMark, type BrandMarkName, type BrandTone } from '@/lib/brand';

const BRAND_NAME = BRAND.name;

/**
 * One identity artwork, placed.
 *
 * Plain `<img>` rather than `next/image`, deliberately:
 *
 *  • These are static brand files under `public/brand/`, already sized and
 *    compressed per breakpoint by `npm run assets:brand`. Re-optimising them
 *    through the image pipeline would only add a negotiation round trip.
 *  • `loading="eager"` on the header mark: it is in the first viewport on every
 *    page and it *is* the brand, so it should never be the thing that pops in.
 *  • `sizes`/`srcSet` come straight from the build so the phone fetches the 360
 *    wordmark and the desktop the 720 one.
 *
 * `decorative` drops the alt text for watermark use, where the mark repeats a
 * heading that is already in the accessibility tree.
 */
export default function BrandMark({
  name,
  tone = 'ink',
  className = '',
  decorative = false,
  priority = false,
  sizes,
}: {
  name: BrandMarkName;
  tone?: BrandTone;
  className?: string;
  decorative?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const mark = brandMark(name, tone);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset, already optimised at build time
    <img
      src={mark.src}
      srcSet={mark.srcSet}
      sizes={sizes ?? `${mark.width}px`}
      width={mark.width}
      height={mark.height}
      // The colourway is part of the contract with the stylesheet: the header
      // cross-fades `ink` against `champagne` by matching on this attribute.
      data-brand-tone={tone}
      data-brand-mark={name}
      alt={decorative ? '' : `${BRAND_NAME}${name === 'wordmark' ? '' : ' studio mark'}`}
      aria-hidden={decorative ? 'true' : undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      draggable={false}
      className={`brand-mark brand-mark--${name} ${className}`}
    />
  );
}