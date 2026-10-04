'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done'; url: string }
  | { status: 'error'; message: string };

const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Optional reference image. Uploaded first, then the URL travels with the rest
 * of the form. If the upload cannot reach storage the request is still
 * submittable — the reference image really is optional.
 */
export default function ReferenceImageField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (url: string) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = useCallback(
    async (file: File) => {
      setLocalError(null);
      if (!ACCEPTED.includes(file.type)) {
        setLocalError('Please choose a JPG, PNG or WebP image.');
        setState({ status: 'idle' });
        return;
      }
      if (file.size > MAX_BYTES) {
        setLocalError('That image is over 6 MB. Please send a smaller one.');
        setState({ status: 'idle' });
        return;
      }

      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
      setState({ status: 'uploading' });

      const body = new FormData();
      body.append('file', file);

      try {
        const response = await fetch('/api/uploads', { method: 'POST', body });
        const payload = (await response.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !payload.url) {
          throw new Error(payload.error ?? 'Upload failed');
        }
        onChange(payload.url);
        setState({ status: 'done', url: payload.url });
      } catch (error) {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Upload failed',
        });
        setLocalError(
          'We could not upload that image, but your request can still be sent — describe it in the notes instead.',
        );
      }
    },
    [onChange, preview],
  );

  return (
    <div className="field">
      <span className="label-like" id="reference-image-label">
        Reference image <span className="normal-case tracking-normal text-ink-400">(optional)</span>
      </span>
      <p className="hint" id="reference-image-hint">
        A photo, a screenshot, a dress you liked. JPG, PNG or WebP, up to 6 MB.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="reference-image"
          className="btn btn--ghost btn--sm cursor-pointer"
          data-busy={state.status === 'uploading' ? 'true' : undefined}
        >
          {state.status === 'uploading' ? 'Uploading…' : value ? 'Replace image' : 'Choose image'}
        </label>
        <input
          ref={inputRef}
          id="reference-image"
          name="referenceImage"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          aria-describedby="reference-image-hint"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />

        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setState({ status: 'idle' });
              setPreview(null);
            }}
            className="text-[0.6875rem] uppercase tracking-[0.16em] text-ink-400 underline underline-offset-4 hover:text-crimson-600"
          >
            Remove
          </button>
        ) : null}
      </div>

      {preview ? (
        <div className="relative mt-1 h-32 w-32 overflow-hidden border border-wine-900/15 bg-blush-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-full w-full object-cover" />
          {state.status === 'uploading' ? (
            <span className="absolute inset-0 flex items-center justify-center bg-wine-900/50 text-[0.625rem] uppercase tracking-[0.18em] text-ivory">
              Sending
            </span>
          ) : null}
          {state.status === 'done' ? (
            <span className="absolute bottom-0 inset-x-0 bg-wine-900/75 py-1 text-center text-[0.5625rem] uppercase tracking-[0.18em] text-ivory">
              Attached
            </span>
          ) : null}
        </div>
      ) : null}

      {localError ? <p className="error">{localError}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}