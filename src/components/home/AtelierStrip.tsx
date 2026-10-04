import Image from 'next/image';
import Link from 'next/link';
import Reveal from '@/components/layout/Reveal';

const SHOTS = [
  {
    src: '/media/editorial/atelier-stitch-1200.webp',
    alt: 'Ivory yarn being worked into a blush rose, close up',
    span: 'aspect-4/5',
    caption: 'The centre of the spiral. This is the part that cannot be rushed.',
  },
  {
    src: '/media/editorial/atelier-collection-1200.webp',
    alt: 'The finished collection arranged on a deep wine backdrop',
    span: 'aspect-4/5',
    caption: 'Everything the studio finished this season, photographed the day it shipped.',
  },
  {
    src: '/media/editorial/atelier-finish-1200.webp',
    alt: 'Crimson and blush rose purses with crochet blooms laid out for the final reveal',
    span: 'aspect-4/5',
    caption: 'Blocking day. Two days pinned flat under a cloth before any finishing.',
  },
];

export default function AtelierStrip() {
  return (
    <section
      id="real-work"
      className="border-t border-wine-900/10 bg-paper py-20 md:py-28"
      aria-labelledby="real-work-title"
    >
      <div className="shell">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">06 — Real work</p>
              <h2
                id="real-work-title"
                className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]"
              >
                The atelier,
                <br />
                <span className="italic">as it actually is</span>
              </h2>
            </div>
            <Link href="/atelier" className="btn btn--ghost btn--sm">
              Visit the studio
            </Link>
          </div>
          <p className="lede mt-6">
            These are photographs of the work, not renders of it. Yarn on the table, hook in hand,
            blocking pins still in the rose.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <ul className="mt-12 grid gap-8 md:mt-16 md:grid-cols-3 md:gap-6">
            {SHOTS.map((shot) => (
              <li key={shot.src}>
                <div className={`media-frame media-frame--zoom ${shot.span} w-full`}>
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
                <p className="mt-3.5 max-w-[36ch] text-sm leading-relaxed text-ink-500">
                  {shot.caption}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}