import Image from 'next/image';
import BrandMark from '@/components/brand/BrandMark';
import Reveal from '@/components/layout/Reveal';
import CustomRequestForm from '@/components/forms/CustomRequestForm';
import { BRAND, PHONE_E164 } from '@/lib/brand';

const PROMISES = [
  {
    title: 'We say no gracefully',
    body: 'If an idea is not crochet, or not crochetable in the time you need, we will tell you and suggest someone better.',
  },
  {
    title: 'A price before a deposit',
    body: 'You get a written quote with stitch count, yarn and timeline. No advance is taken until you approve it.',
  },
  {
    title: 'Progress photographs',
    body: 'Halfway through, we send a photograph of your piece on the blocking mat. It is the good part.',
  },
];

export default function CustomCrochetSection({ standalone = false }: { standalone?: boolean }) {
  const image = '/media/editorial/atelier-pearl-1200.webp';

  return (
    <section
      id="custom"
      className="on-wine grain relative overflow-hidden bg-wine-900 py-20 md:py-28"
      aria-labelledby="custom-title"
    >
      <BrandMark
        name="seal"
        tone="champagne"
        decorative
        className="brand-watermark brand-watermark--light -right-10 -top-10 w-52 opacity-[0.06] md:-right-4 md:-top-16 md:w-80"
      />
      <div className="shell relative z-[3]">
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:gap-16">
          <Reveal>
            <p className="eyebrow eyebrow--light">05 — Custom crochet</p>
            <h2
              id="custom-title"
              className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.96] text-champagne-100"
            >
              You bring the idea.
              <br />
              <span className="italic text-blush-200">We turn it into stitches.</span>
            </h2>
            <p className="mt-6 max-w-[44ch] text-[length:1.05rem] leading-relaxed text-champagne-200/80">
              Bridesmaid gifts, a bag the size of a book, a colour match to a dress, a dozen roses for
              a December table. Tell us what you have in mind — we will tell you honestly whether we
              are the right studio for it.
            </p>

            <ul className="mt-9 space-y-5 border-t border-champagne-200/15 pt-7">
              {PROMISES.map((promise) => (
                <li key={promise.title}>
                  <h3 className="font-display text-[length:1.15rem] text-champagne-100">
                    {promise.title}
                  </h3>
                  <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-champagne-200/70">
                    {promise.body}
                  </p>
                </li>
              ))}
            </ul>

            <div className="relative mt-10 hidden aspect-3/2 w-full max-w-[30rem] md:block">
              <div className="media-frame media-frame--zoom h-full w-full">
                <Image
                  src={image}
                  alt="A hand lifting the blush rose crochet purse by its pearl handle"
                  fill
                  sizes="(min-width: 768px) 40vw, 90vw"
                  loading="lazy"
                  decoding="async"
                  className="object-cover"
                />
              </div>
              <p className="absolute -bottom-5 left-0 max-w-[26ch] text-[0.6875rem] uppercase leading-relaxed tracking-[0.16em] text-champagne-200/55">
                Commissions open · {productLead()}
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="border border-champagne-200/18 bg-wine-950/35 p-6 md:p-8">
              <h3 className="font-display text-[length:1.5rem] uppercase leading-tight text-champagne-100">
                Start a request
              </h3>
              <p className="mt-2 text-sm text-champagne-200/70">
                Everything marked optional really is optional.
              </p>
              <div className="mt-7">
                <CustomRequestForm tone="dark" />
              </div>
              {!standalone ? (
                <p className="mt-6 border-t border-champagne-200/12 pt-5 text-sm text-champagne-200/65">
                  Prefer email? Write to{' '}
                  <a href={`mailto:${BRAND.email}`} className="link-rule">
                    {BRAND.email}
                  </a>{' '}
                  or call{' '}
                  <a href={`tel:${PHONE_E164}`} className="link-rule">
                    {BRAND.phone}
                  </a>
                  .
                </p>
              ) : null}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function productLead() {
  return `typical turnaround 2–3 weeks · ${BRAND.location}`;
}