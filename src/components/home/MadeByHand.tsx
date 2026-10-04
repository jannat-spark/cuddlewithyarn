import Image from 'next/image';
import Link from 'next/link';
import Reveal from '@/components/layout/Reveal';

const STEPS = [
  {
    step: '01',
    title: 'The yarn',
    body: 'Crimson, blush and ivory cotton, wound by hand onto three balls. Nothing is dyed to order, nothing is blended to save money.',
  },
  {
    step: '02',
    title: 'The stitches',
    body: 'One continuous spiral, worked outward from the centre. There is no seam, no glue and no way to hide a mistake — so there are no mistakes.',
  },
  {
    step: '03',
    title: 'The blocking',
    body: 'Two days pinned flat under a cloth, then shaped by hand. This is the part nobody sees and the reason the rose holds its form.',
  },
  {
    step: '04',
    title: 'The finish',
    body: 'Pearls sewn one stitch at a time, hardware, lining, and a final inspection at a north-facing window.',
  },
];

export default function MadeByHand() {
  return (
    <section id="made-by-hand" className="shell py-20 md:py-28" aria-labelledby="made-by-hand-title">
      <div className="grid gap-10 md:grid-cols-[1fr_1.15fr] md:gap-16">
        <Reveal>
          <p className="eyebrow">02 — Made by hand</p>
          <h2
            id="made-by-hand-title"
            className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]"
          >
            Made by
            <br />
            <span className="italic">hand.</span>
          </h2>
          <div className="prose-brand mt-6 max-w-[46ch] text-[length:1rem] leading-relaxed text-ink-700">
            <p>
              Every piece that leaves this studio was made by a person, not a machine. One rose is
              roughly fourteen hundred stitches. A single purse takes two to three evenings, start to
              finish, including the blocking.
            </p>
            <p>
              That is not a marketing line — it is the reason we only make what we can make properly.
              When a colourway sells out, it is gone until the next dye lot.
            </p>
          </div>
          <Link href="/atelier" className="btn btn--ghost btn--sm mt-8">
            Inside the atelier
          </Link>
        </Reveal>

        <Reveal delay={90}>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="media-frame media-frame--zoom col-span-2 aspect-4/3">
              <Image
                src="/media/editorial/atelier-hands-1200.webp"
                alt="Two hands crocheting with a hook, three balls of yarn resting on the table"
                fill
                sizes="(min-width: 768px) 46vw, 92vw"
                loading="lazy"
                decoding="async"
                className="object-cover"
              />
            </div>
            <div className="media-frame media-frame--zoom aspect-square">
              <Image
                src="/media/editorial/atelier-stitch-1200.webp"
                alt="Ivory yarn being worked into a blush rose, close up"
                fill
                sizes="(min-width: 768px) 23vw, 46vw"
                loading="lazy"
                decoding="async"
                className="object-cover"
              />
            </div>
            <div className="media-frame media-frame--zoom aspect-square">
              <Image
                src="/media/editorial/atelier-thread-1200.webp"
                alt="Crimson, pink and ivory yarn balls on a blush table"
                fill
                sizes="(min-width: 768px) 23vw, 46vw"
                loading="lazy"
                decoding="async"
                className="object-cover"
              />
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={60}>
        <ol className="hairline-grid mt-14 grid gap-px border-t border-wine-900/10 md:mt-20 md:grid-cols-4 md:border-t">
          {STEPS.map((item) => (
            <li key={item.step} className="pt-5 md:px-5 md:pt-6 md:first:pl-0">
              <p className="font-display text-[length:0.95rem] italic text-crimson-600">
                {item.step}
              </p>
              <h3 className="mt-2 font-display text-[length:1.25rem]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{item.body}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}