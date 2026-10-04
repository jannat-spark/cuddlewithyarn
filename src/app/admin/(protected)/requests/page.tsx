import Image from 'next/image';
import { listCustomRequests } from '@/server/repository';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminRequestsPage() {
  const requests = await listCustomRequests();

  return (
    <div>
      <p className="eyebrow">Custom</p>
      <h1 className="mt-3 font-display text-[length:2.4rem] uppercase leading-none">
        {requests.length} {requests.length === 1 ? 'request' : 'requests'}
      </h1>
      <p className="mt-3 max-w-[52ch] text-[0.95rem] leading-relaxed text-ink-500">
        Every commission enquiry, newest first. Reply from your normal inbox — the studio reads these
        personally within two working days.
      </p>

      {requests.length === 0 ? (
        <p className="py-20 text-center text-ink-400">
          Nothing yet. Send one from the custom crochet form to see it arrive.
        </p>
      ) : (
        <ul className="mt-8 space-y-6">
          {requests.map((request) => (
            <li key={request.id} className="border border-wine-900/12 bg-cream-50 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-[length:1.3rem] leading-snug">{request.name}</h2>
                  <p className="mt-1 text-sm text-ink-500">
                    <a href={`tel:${request.phone}`} className="link-rule">
                      {request.phone}
                    </a>
                    {' · '}
                    <a href={`mailto:${request.email}`} className="link-rule">
                      {request.email}
                    </a>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">{formatDate(request.createdAt)}</p>
                </div>
                <span className="shrink-0 border border-wine-900/15 px-2.5 py-1 text-[0.5625rem] uppercase tracking-[0.18em] text-ink-500">
                  {request.status}
                </span>
              </div>

              <p className="mt-5 max-w-[68ch] text-[0.95rem] leading-relaxed">
                {request.description}
              </p>

              <dl className="mt-5 grid gap-x-8 gap-y-3 border-t border-wine-900/10 pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-ink-400">Colour</dt>
                  <dd className="mt-0.5">{request.colorPreference || 'No preference'}</dd>
                </div>
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-ink-400">Size</dt>
                  <dd className="mt-0.5">{request.sizePreference || 'No preference'}</dd>
                </div>
              </dl>

              {request.notes ? (
                <p className="mt-4 border-t border-wine-900/10 pt-4 text-sm text-ink-700">
                  <span className="block text-[0.625rem] uppercase tracking-[0.18em] text-ink-400">
                    Notes
                  </span>
                  {request.notes}
                </p>
              ) : null}

              {request.referenceImageUrl ? (
                <a
                  href={request.referenceImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="media-frame mt-5 block aspect-4/3 w-full max-w-sm"
                >
                  <Image
                    src={request.referenceImageUrl}
                    alt={`Reference image sent by ${request.name}`}
                    fill
                    sizes="384px"
                    className="object-cover"
                  />
                </a>
              ) : (
                <p className="mt-4 text-xs text-ink-400">No reference image attached.</p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={`mailto:${request.email}?subject=${encodeURIComponent('Your crochet commission')}`}
                  className="btn btn--sm"
                >
                  Reply by email
                </a>
                <a
                  href={`https://wa.me/91${request.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--ghost btn--sm"
                >
                  WhatsApp
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}