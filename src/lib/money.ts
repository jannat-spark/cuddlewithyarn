import { BRAND } from './brand';

/** All money is handled as whole rupees (integers). Never floats. */
export function formatPrice(paise: number): string {
  const value = Number.isFinite(paise) ? Math.round(paise) : 0;
  return `${BRAND.currencySymbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatPricePlain(paise: number): string {
  const value = Number.isFinite(paise) ? Math.round(paise) : 0;
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function shippingFor(subtotal: number, international = false): number {
  if (subtotal <= 0) return 0;
  if (international) return 2400;
  return subtotal >= 3500 ? 0 : 149;
}