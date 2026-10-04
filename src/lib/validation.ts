/**
 * Hand-rolled validators. Small, dependency-free and shared by the route
 * handlers, the admin actions and the client forms (client-side validation is
 * only ever a convenience — the server repeats every one of these checks).
 */

export type FieldErrors = Record<string, string>;

export class ValidationError extends Error {
  fieldErrors: FieldErrors;
  constructor(message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export function asString(value: unknown, max = 2000): string {
  if (typeof value === 'string') return value.trim().slice(0, max);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function isEmail(value: string): boolean {
  // Intentionally permissive: deliverability is proven by the confirmation email,
  // not by a regex.
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value) && value.length <= 254;
}

/** Accepts 10-digit Indian mobiles, with optional +91 / 0 prefix and separators. */
export function normalisePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return local;
}

export function normalisePincode(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Reference images come back either as an absolute Supabase Storage URL or as
 * a same-origin path (the local fallback store). Anything else — javascript:,
 * data:, an off-site scrape target — is rejected.
 */
export function isUsableImageUrl(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  return isHttpUrl(value);
}

export function clampQuantity(value: unknown, max = 20): number {
  const n = typeof value === 'number' ? Math.round(value) : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}

export type CheckoutInput = {
  customerName: string;
  phone: string;
  email: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
  international: boolean;
};

export function parseCheckout(body: unknown): CheckoutInput {
  const raw = (body ?? {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const customerName = asString(raw.customerName ?? raw.name, 120);
  if (customerName.length < 2) errors.customerName = 'Please tell us your name.';

  const phoneRaw = asString(raw.phone, 40);
  const phone = normalisePhone(phoneRaw);
  if (!phone) errors.phone = 'Enter a 10-digit mobile number.';

  const email = asString(raw.email, 254).toLowerCase();
  if (!isEmail(email)) errors.email = 'Enter an email we can send the confirmation to.';

  const addressLine = asString(raw.addressLine ?? raw.address, 400);
  if (addressLine.length < 6) errors.addressLine = 'Add a street address.';

  const city = asString(raw.city, 80);
  if (city.length < 2) errors.city = 'Add your city.';

  const state = asString(raw.state, 80);
  if (state.length < 2) errors.state = 'Add your state.';

  const pincode = normalisePincode(asString(raw.pincode, 12));
  if (!pincode) errors.pincode = 'Enter a 6-digit PIN code.';

  const notes = asString(raw.notes, 600);

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Please check the highlighted fields.', errors);
  }

  return {
    customerName,
    phone: phone!,
    email,
    addressLine,
    city,
    state,
    pincode: pincode!,
    notes,
    international: raw.international === true,
  };
}

export type CustomRequestInput = {
  name: string;
  phone: string;
  email: string;
  description: string;
  colorPreference: string;
  sizePreference: string;
  referenceImageUrl: string | null;
  notes: string;
};

export function parseCustomRequest(body: unknown): CustomRequestInput {
  const raw = (body ?? {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const name = asString(raw.name, 120);
  if (name.length < 2) errors.name = 'Please tell us your name.';

  const phone = normalisePhone(asString(raw.phone, 40));
  if (!phone) errors.phone = 'Enter a 10-digit mobile number.';

  const email = asString(raw.email, 254).toLowerCase();
  if (!isEmail(email)) errors.email = 'Enter an email address.';

  const description = asString(raw.description, 4000);
  if (description.length < 20) {
    errors.description = 'A little more detail helps — at least 20 characters.';
  }

  const colorPreference = asString(raw.colorPreference, 200);
  const sizePreference = asString(raw.sizePreference, 200);
  const notes = asString(raw.notes, 1000);

  const refRaw = asString(raw.referenceImageUrl, 500);
  const referenceImageUrl = refRaw ? (isUsableImageUrl(refRaw) ? refRaw : null) : null;
  if (refRaw && !referenceImageUrl) {
    errors.referenceImageUrl = 'That image link is not usable. Try uploading again.';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Please check the highlighted fields.', errors);
  }

  return {
    name,
    phone: phone!,
    email,
    description,
    colorPreference,
    sizePreference,
    referenceImageUrl,
    notes,
  };
}

export type RequestedLine = { productId: string; quantity: number };

export function parseRequestedLines(body: unknown): RequestedLine[] {
  const raw = (body ?? {}) as Record<string, unknown>;
  const items = Array.isArray(raw.items) ? raw.items : [];
  if (items.length === 0) {
    throw new ValidationError('Your bag is empty.', { items: 'Your bag is empty.' });
  }
  if (items.length > 40) {
    throw new ValidationError('Too many items in one order.');
  }

  const merged = new Map<string, number>();
  for (const entry of items) {
    const item = (entry ?? {}) as Record<string, unknown>;
    const productId = asString(item.productId, 64);
    if (!productId) continue;
    const quantity = clampQuantity(item.quantity);
    merged.set(productId, Math.min((merged.get(productId) ?? 0) + quantity, 20));
  }

  if (merged.size === 0) {
    throw new ValidationError('Your bag is empty.', { items: 'Your bag is empty.' });
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}