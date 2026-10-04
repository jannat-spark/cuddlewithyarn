'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import type { CartLine, Product } from '@/lib/types';
import { formatPrice } from '@/lib/money';
import { SHIPPING } from '@/lib/brand';

const STORAGE_KEY = 'cwy.cart.v1';
const MAX_PER_LINE = 20;

/* ------------------------------------------------------------------------ */
/* localStorage-backed external store                                       */
/*                                                                            */
/* Reading the bag through useSyncExternalStore keeps the server render and    */
/* the first client render identical (empty bag), then swaps to the real one  */
/* on hydration — no setState-in-effect, no hydration mismatch, no extra      */
/* render pass. It also syncs the bag across browser tabs for free.            */
/* ------------------------------------------------------------------------ */

const EMPTY_LINES: CartLine[] = [];
const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cacheLines: CartLine[] = EMPTY_LINES;

function parseCart(raw: string | null): CartLine[] {
  if (!raw) return EMPTY_LINES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_LINES;
    const lines = parsed
      .filter(
        (line): line is CartLine =>
          typeof line === 'object' &&
          line !== null &&
          typeof (line as CartLine).productId === 'string' &&
          typeof (line as CartLine).price === 'number',
      )
      .map((line) => ({
        ...line,
        quantity: Math.min(Math.max(1, Math.round(line.quantity)), MAX_PER_LINE),
      }));
    return lines.length > 0 ? lines : EMPTY_LINES;
  } catch {
    return EMPTY_LINES;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getSnapshot(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_LINES;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheLines = parseCart(raw);
  }
  return cacheLines;
}

function getServerSnapshot(): CartLine[] {
  return EMPTY_LINES;
}

function getClientReady(): boolean {
  return true;
}

function getServerReady(): boolean {
  return false;
}

function writeLines(lines: CartLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* private mode / quota — the bag simply will not persist */
  }
  cacheRaw = null;
  for (const listener of listeners) listener();
}

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  sheetOpen: boolean;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  openSheet: () => void;
  closeSheet: () => void;
  lastAdded: CartLine | null;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(subscribe, getClientReady, getServerReady);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartLine | null>(null);

  // Keep the sheet from scrolling the page behind it.
  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const add = useCallback(
    (product: Product, quantity = 1) => {
      const safeQuantity = Math.min(Math.max(1, Math.round(quantity)), MAX_PER_LINE);
      const existing = getSnapshot().find((line) => line.productId === product.id);
      const next = existing
        ? getSnapshot().map((line) =>
            line.productId === product.id
              ? { ...line, quantity: Math.min(line.quantity + safeQuantity, MAX_PER_LINE) }
              : line,
          )
        : [
            ...getSnapshot(),
            {
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: product.images[0],
              quantity: safeQuantity,
              availability: product.availability,
            },
          ];
      writeLines(next);

      const line: CartLine = {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images[0],
        quantity: safeQuantity,
        availability: product.availability,
      };
      setLastAdded(line);
      setSheetOpen(true);
    },
    [],
  );

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const current = getSnapshot();
    writeLines(
      quantity <= 0
        ? current.filter((line) => line.productId !== productId)
        : current.map((line) =>
            line.productId === productId
              ? { ...line, quantity: Math.min(Math.max(1, Math.round(quantity)), MAX_PER_LINE) }
              : line,
          ),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    writeLines(getSnapshot().filter((line) => line.productId !== productId));
  }, []);

  const clear = useCallback(() => writeLines(EMPTY_LINES), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const shipping = subtotal === 0 ? 0 : subtotal >= SHIPPING.freeOver ? 0 : SHIPPING.flat;
    return {
      lines,
      ready,
      count,
      subtotal,
      shipping,
      total: subtotal + shipping,
      sheetOpen,
      add,
      setQuantity,
      remove,
      clear,
      openSheet: () => setSheetOpen(true),
      closeSheet: () => setSheetOpen(false),
      lastAdded,
    };
  }, [lines, ready, sheetOpen, add, setQuantity, remove, clear, lastAdded]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartSheet />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}

function CartSheet() {
  const { sheetOpen, closeSheet, lines, subtotal, shipping, total, setQuantity, remove } = useCart();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (sheetOpen) panelRef.current?.focus();
  }, [sheetOpen]);

  if (!sheetOpen) return null;

  return (
    <div className="fixed inset-0 z-[120]" role="presentation">
      <button
        type="button"
        aria-label="Close bag"
        onClick={closeSheet}
        className="absolute inset-0 bg-wine-950/60"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        className="absolute inset-x-0 bottom-0 max-h-[86svh] overflow-y-auto border-t border-champagne-300/20 bg-paper pb-[env(safe-area-inset-bottom)] shadow-[0_-24px_60px_rgba(26,6,12,0.28)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-wine-900/10 bg-paper/95 px-[var(--gutter)] py-4 backdrop-blur">
          <h2 className="font-display text-[length:1.35rem]">Your bag</h2>
          <button
            type="button"
            onClick={closeSheet}
            className="text-[0.6875rem] uppercase tracking-[0.2em] text-ink-500 hover:text-crimson-600"
          >
            Close
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="px-[var(--gutter)] py-12 text-center">
            <p className="font-display text-[length:1.25rem]">Nothing in here yet.</p>
            <p className="mt-2 text-sm text-ink-500">
              Everything here is crocheted by hand, so pieces come and go quickly.
            </p>
            <Link href="/shop" onClick={closeSheet} className="btn btn--sm mt-6">
              Shop the collection
            </Link>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-wine-900/10">
              {lines.map((line) => (
                <li key={line.productId} className="flex gap-4 px-[var(--gutter)] py-4">
                  <div className="media-frame h-24 w-20 shrink-0">
{line.image?.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.image.src} alt={line.image.alt} loading="lazy" decoding="async" />
                  ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <Link
                        href={`/product/${line.slug}`}
                        onClick={closeSheet}
                        className="font-display text-[length:1.05rem] leading-snug"
                      >
                        {line.name}
                      </Link>
                      <p className="mt-1 text-sm text-ink-500">{formatPrice(line.price)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center border border-wine-900/15">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${line.name}`}
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          className="px-3 py-1.5 text-ink-500 hover:text-crimson-600"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm tabular-nums">{line.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${line.name}`}
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          className="px-3 py-1.5 text-ink-500 hover:text-crimson-600"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.productId)}
                        className="text-[0.6875rem] uppercase tracking-[0.16em] text-ink-400 underline underline-offset-4 hover:text-crimson-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t border-wine-900/10 px-[var(--gutter)] py-5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-500">Subtotal</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Shipping</span>
                <span className="tabular-nums">
                  {shipping === 0 ? 'Free' : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between border-t border-wine-900/10 pt-3 font-display text-[length:1.15rem]">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </div>
              {subtotal < SHIPPING.freeOver ? (
                <p className="pt-1 text-xs text-ink-400">
                  {formatPrice(SHIPPING.freeOver - subtotal)} more for free shipping.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2.5 px-[var(--gutter)] pb-6">
              <Link href="/checkout" onClick={closeSheet} className="btn btn--full">
                Checkout · {formatPrice(total)}
              </Link>
              <Link href="/cart" onClick={closeSheet} className="btn btn--ghost btn--full">
                View full bag
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}