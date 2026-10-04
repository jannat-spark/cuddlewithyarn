import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Reveal from '@/components/layout/Reveal';
import BrandMark from '@/components/brand/BrandMark';
import { BRAND, PHONE_E164 } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'The atelier',
  description:
    'Inside the Cuddle With Yarn studio in Jaipur: the blocking mats, the dye lots, the tools, and the evenings a single rose takes to finish.',
  alternates: { canonical: '/atelier' },
};

const SHOTS = [
  {
    src: '/media/editorial/atelier-hands-1200.webp',
    alt: 'Two hands crocheting with a hook, three balls of yarn resting on the table',
    caption: 'The hook table. Three balls of yarn, one hook, and a north-facing window for judging colour.',
  },
  {
    src: '/media/editorial/atelier-stitch-1200.webp',
    alt: 'Ivory yarn being worked into a blush rose, close up',
    caption: 'The centre of the spiral. This is the part that cannot be rushed.',
  },
  {
    src: '/media/editorial/atelier-pearl-1200.webp',
    alt: 'A hand lifting the blush rose purse by its pearl handle',
    caption: 'Finishing. Pearls are sewn one stitch at a time, never glued.',
  },
  {
    src: '/media/editorial/atelier-collection-1200.webp',
    alt: 'The finished collection arranged on a deep wine backdrop',
    caption: 'The season, laid out. Everything here was made in this room.',
  },
  {
    src: '/media/editorial/atelier-thread-1200.webp',
    alt: 'Crimson, pink and ivory yarn balls on a blush table',
    caption: 'The palette. Three shades of crimson, two of blush, one ivory — that is the whole brand.',
  },
  {
    src: '/media/editorial/atelier-finish-1200.webp',
    alt: 'Crimson and blush rose purses with crochet blooms laid out for the final reveal',
    caption: 'Blocking day. Two days pinned flat under a cloth before anything is finished.',
  },
];

const FACTS = [
  { label: 'Founded', value: BRAND.founded },
  { label: 'Where', value: BRAND.location },
  { label: 'Who makes it', value: 'One crocheter, two apprentices' },
  { label: 'Stitches per rose', value: 'About 1,400' },
  { label: 'Time per purse', value: 'Two to three evenings' },
  { label: 'Dye lots per year', value: 'Four' },
];

export default function AtelierPage() {
  return (
    <div className="pb-24 md:pb-32">
      <div className="relative overflow-hidden shell pt-[calc(var(--header-h)+2.5rem)] md:pt-[calc(var(--header-h)+4rem)]">
        <BrandMark
          name="seal"
          tone="ink"
          decorative
          className="brand-watermark -right-8 top-12 w-40 opacity-[0.07] md:-right-2 md:top-16 md:w-64"
        />
        <div className="relative flex items-start gap-5 md:gap-8">
          <BrandMark name="stamp" tone="ink" decorative className="mt-1 hidden w-24 shrink-0 sm:block" />
          <div className="min-w-0">
            <p className="eyebrow">The atelier</p>
            <h1 className="mt-5 max-w-[20ch] font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
              One room,
              <span className="block italic text-crimson-600">one pair of hands</span>
            </h1>
            <p className="lede mt-6">
              We are a small studio in {BRAND.location}. There is no production line behind these
              pieces — just a long table, a wall of blocking pins, and a short list of colours we
              can honestly source.
            </p>
          </div>
        </div>
      </div>

      <Reveal className="shell mt-12 md:mt-16">
        <div className="media-frame media-frame--zoom aspect-16/9 w-full">
          <Image
            src="/media/editorial/atelier-collection-1200.webp"
            alt="The finished collection arranged on a deep wine backdrop"
            fill
            priority
            sizes="(min-width: 1280px) 90vw, 100vw"
            className="object-cover"
          />
        </div>
      </Reveal>

      <div className="shell mt-16 md:mt-24">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <Reveal>
            <h2 className="font-display text-[length:var(--text-title)] uppercase leading-tight">
              How a rose gets made
            </h2>
            <div className="prose-brand mt-5 max-w-[48ch] text-[length:1rem] leading-relaxed">
              <p>
                A rose begins as a magic ring and grows outward in a single unbroken spiral. There is
                no seam to hide and nowhere for a mistake to go, so the work is slow and the counting
                is constant.
              </p>
              <p>
                When the spiral closes, the piece is left for a day to settle, then pinned flat under
                a cloth for two more. Blocking is the least glamorous part of the process and the
                reason a rose holds its shape instead of collapsing into a bag.
              </p>
              <p>
                Only then: pearls, hardware, lining, and a last look at the colour by the window.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h2 className="font-display text-[length:var(--text-title)] uppercase leading-tight">
              Why there is so little of it
            </h2>
            <div className="prose-brand mt-5 max-w-[48ch] text-[length:1rem] leading-relaxed">
              <p>
                We could make twice as much if we dropped the blocking, lined the purses with
                cheaper fabric and skipped the hand-finished pearl trim. We have tried it, on a
                sample, and it looked like a different studio.
              </p>
              <p>
                So the collection stays short, sells out, and sometimes takes a fortnight. If
                something you want is gone, ask us — a new dye lot arrives four times a year.
              </p>
            </div>
            <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-wine-900/10 pt-6">
              {FACTS.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[0.625rem] uppercase tracking-[0.2em] text-ink-400">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 font-display text-[length:1.05rem]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal className="mt-16 md:mt-24">
          <h2 className="border-b border-wine-900/10 pb-4 font-display text-[length:var(--text-title)] uppercase leading-tight">
            In the room
          </h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
            {SHOTS.map((shot) => (
              <li key={shot.src}>
                <div className="media-frame media-frame--zoom aspect-4/3 w-full">
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    fill
                    sizes="(min-width: 768px) 30vw, 88vw"
                    loading="lazy"
                    decoding="async"
                    className="object-cover"
                  />
                </div>
                <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-ink-500">
                  {shot.caption}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-16 md:mt-24">
          <div className="grid gap-6 border border-wine-900/12 bg-paper-200 p-7 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-12 md:p-10">
            <div>
              <h2 className="font-display text-[length:var(--text-title)] uppercase leading-tight">
                Come and see it made
              </h2>
              <p className="mt-3 max-w-[48ch] text-[length:1rem] leading-relaxed text-ink-700">
                We are open by appointment on Thursdays and Fridays. Bring a photograph, or bring
                nothing and just look at the blocking board. Ring{' '}
                <a href={`tel:${PHONE_E164}`} className="link-rule">
                  {BRAND.phone}
                </a>{' '}
                first and we will put the kettle on.
              </p>
            </div>
            <div className="md:justify-self-end">
              <Link href="/contact" className="btn btn--full md:w-auto">
                Arrange a visit
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}