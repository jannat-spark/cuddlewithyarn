/**
 * The only place that knows how orders and catalogue rows are stored.
 *
 * Two backends:
 *   • Supabase (production) — service-role client, RLS on, prices re-read from
 *     the database on every checkout.
 *   • Local JSON store (development, or a laptop with no project yet) — same
 *     contract, same server-side price validation.
 *
 * Prices are *never* accepted from the browser. `createOrder` receives only
 * product ids and quantities and rebuilds every amount from the catalogue.
 */
import { randomUUID } from 'node:crypto';
import { SEED_PRODUCTS, SEED_PRODUCTS_BY_SLUG } from '@/lib/catalog';
import { SHIPPING, type OrderStatus } from '@/lib/brand';
import type { CheckoutInput } from '@/lib/validation';
import { ValidationError, clampQuantity } from '@/lib/validation';
import type {
  Availability,
  CustomRequest,
  Order,
  OrderItem,
  Product,
  ProductImage,
} from '@/lib/types';
import { isSupabaseConfigured, serviceClient } from './supabase-admin';
import {
  localReadCustomRequests,
  localReadOrder,
  localReadOrderByNumber,
  localReadOrders,
  withDb,
  type LocalCustomRequest,
  type LocalOrder,
  type LocalOrderItem,
} from './local-store';

const BACKEND = isSupabaseConfigured ? 'supabase' : 'local';
export const dataBackend = BACKEND;

/* ------------------------------------------------------------------ catalogue */

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  price: number;
  compare_at: number | null;
  images: unknown;
  category: string;
  availability: string;
  featured: boolean;
  lead_time_days: number;
  materials: string | null;
  details: unknown;
  created_at: string;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? '',
    description: row.description,
    price: Number(row.price),
    compareAt: row.compare_at === null ? null : Number(row.compare_at),
    images: Array.isArray(row.images) ? (row.images as ProductImage[]) : [],
    category: row.category as Product['category'],
    availability: (row.availability as Availability) ?? 'made_to_order',
    featured: Boolean(row.featured),
    leadTimeDays: row.lead_time_days ?? 12,
    materials: row.materials ?? '',
    details: Array.isArray(row.details) ? (row.details as string[]) : [],
    createdAt: row.created_at,
  };
}

const PRODUCT_COLUMNS =
  'id, slug, name, tagline, description, price, compare_at, images, category, availability, featured, lead_time_days, materials, details, created_at';

export async function getAllProducts(): Promise<Product[]> {
  if (BACKEND === 'supabase') {
    const supabase = serviceClient()!;
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[repo] products select failed:', error.message);
      return SEED_PRODUCTS;
    }
    const rows = (data ?? []) as ProductRow[];
    // A reachable but empty database must never render an empty storefront.
    return rows.length > 0 ? rows.map(toProduct) : SEED_PRODUCTS;
  }
  return SEED_PRODUCTS;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (BACKEND === 'supabase') {
    const supabase = serviceClient()!;
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      console.error('[repo] product select failed:', error.message);
      return SEED_PRODUCTS_BY_SLUG.get(slug) ?? null;
    }
    return data ? toProduct(data as ProductRow) : (SEED_PRODUCTS_BY_SLUG.get(slug) ?? null);
  }
  return SEED_PRODUCTS_BY_SLUG.get(slug) ?? null;
}

export async function getProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  if (ids.length === 0) return new Map();
  if (BACKEND === 'supabase') {
    const supabase = serviceClient()!;
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .in('id', ids);
    if (error) {
      console.error('[repo] products in() failed:', error.message);
      return new Map();
    }
    return new Map(((data ?? []) as ProductRow[]).map((row) => [row.id, toProduct(row)]));
  }
  return new Map(SEED_PRODUCTS.filter((p) => ids.includes(p.id)).map((p) => [p.id, p]));
}

/* --------------------------------------------------------------------- orders */

function toOrderItem(row: Record<string, unknown>): OrderItem {
  return {
    id: String(row.id),
    productId: (row.product_id as string | null) ?? null,
    productSlug: (row.product_slug as string | null) ?? null,
    productName: String(row.product_name),
    unitPrice: Number(row.unit_price),
    quantity: Number(row.quantity),
    lineTotal: Number(row.line_total),
  };
}

function toOrder(row: Record<string, unknown>, items: OrderItem[]): Order {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    status: String(row.status),
    customerName: String(row.customer_name),
    phone: String(row.phone),
    email: String(row.email),
    addressLine: String(row.address_line),
    city: String(row.city),
    state: String(row.state),
    pincode: String(row.pincode),
    notes: (row.notes as string | null) ?? null,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    total: Number(row.total),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items,
  };
}

const ORDER_SELECT =
  'id, order_number, status, customer_name, phone, email, address_line, city, state, pincode, notes, subtotal, shipping, total, created_at, updated_at';

/** Human-friendly, sortable, hard to guess. */
export function generateOrderNumber(now = new Date()): string {
  const stamp =
    String(now.getUTCFullYear()).slice(2) +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0');
  const alphabet = '347ACDEFHJKLMNPRTUVWXY';
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CWY-${stamp}-${suffix}`;
}

export type CreateOrderResult = { order: Order; duplicate: boolean };

export async function createOrder(params: {
  items: { productId: string; quantity: number }[];
  checkout: CheckoutInput;
  idempotencyKey: string | null;
}): Promise<CreateOrderResult> {
  const { items, checkout, idempotencyKey } = params;

  const catalogue = await getProductsByIds(items.map((i) => i.productId));
  const lines: OrderItem[] = [];
  const fieldErrors: Record<string, string> = {};

  for (const requested of items) {
    const product = catalogue.get(requested.productId);
    if (!product) {
      fieldErrors.items = 'One of the pieces in your bag is no longer available.';
      continue;
    }
    if (product.availability === 'sold_out') {
      fieldErrors.items = `${product.name} has just sold out.`;
      continue;
    }
    const quantity = clampQuantity(requested.quantity);
    lines.push({
      id: randomUUID(),
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      unitPrice: product.price, // <- straight from the catalogue, never the browser
      quantity,
      lineTotal: product.price * quantity,
    });
  }

  if (lines.length === 0) {
    throw new ValidationError(
      fieldErrors.items ?? 'We could not price your bag.',
      fieldErrors.items ? { items: fieldErrors.items } : {},
    );
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping = checkout.international
    ? SHIPPING.internationalFlat
    : subtotal >= SHIPPING.freeOver
      ? 0
      : SHIPPING.flat;
  const total = subtotal + shipping;

  if (BACKEND === 'local') {
    return withDb((db): CreateOrderResult => {
      if (idempotencyKey) {
        const existing = db.orders.find((o) => o.idempotency_key === idempotencyKey);
        if (existing) return { order: localToOrder(existing), duplicate: true };
      }
      const now = new Date().toISOString();
      const orderId = randomUUID();
      const order: LocalOrder = {
        id: orderId,
        order_number: uniqueLocalOrderNumber(db.orders),
        idempotency_key: idempotencyKey,
        status: 'new',
        customer_name: checkout.customerName,
        phone: checkout.phone,
        email: checkout.email,
        address_line: checkout.addressLine,
        city: checkout.city,
        state: checkout.state,
        pincode: checkout.pincode,
        notes: checkout.notes || null,
        subtotal,
        shipping,
        total,
        international: checkout.international,
        created_at: now,
        updated_at: now,
        items: lines.map((line) => ({
          id: line.id,
          order_id: orderId,
          product_id: line.productId,
          product_slug: line.productSlug,
          product_name: line.productName,
          unit_price: line.unitPrice,
          quantity: line.quantity,
          line_total: line.lineTotal,
        })),
      };
      db.orders.push(order);
      return { order: localToOrder(order), duplicate: false };
    });
  }

  const supabase = serviceClient()!;

  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing) {
      return { order: await hydrateOrder(existing as Record<string, unknown>), duplicate: true };
    }
  }

  const { data: inserted, error } = await supabase
    .from('orders')
    .insert({
      order_number: generateOrderNumber(),
      idempotency_key: idempotencyKey,
      customer_name: checkout.customerName,
      phone: checkout.phone,
      email: checkout.email,
      address_line: checkout.addressLine,
      city: checkout.city,
      state: checkout.state,
      pincode: checkout.pincode,
      notes: checkout.notes || null,
      subtotal,
      shipping,
      total,
      international: checkout.international,
    })
    .select(ORDER_SELECT)
    .single();

  if (error) {
    // 23505 = unique_violation. Almost always the idempotency key: a double tap.
    if (error.code === '23505' && idempotencyKey) {
      const { data: existing } = await supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) {
        return { order: await hydrateOrder(existing as Record<string, unknown>), duplicate: true };
      }
    }
    throw new Error(`Could not place order: ${error.message}`);
  }

  const orderRow = inserted as Record<string, unknown>;
  const { error: itemsError } = await supabase.from('order_items').insert(
    lines.map((line) => ({
      id: line.id,
      order_id: orderRow.id,
      product_id: line.productId,
      product_slug: line.productSlug,
      product_name: line.productName,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      line_total: line.lineTotal,
    })),
  );
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', orderRow.id);
    throw new Error(`Could not save order items: ${itemsError.message}`);
  }

  return {
    order: toOrder(orderRow, lines.map((l) => ({ ...l }))),
    duplicate: false,
  };
}

function uniqueLocalOrderNumber(orders: LocalOrder[]): string {
  const taken = new Set(orders.map((o) => o.order_number));
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = generateOrderNumber();
    if (!taken.has(candidate)) return candidate;
  }
  return `${generateOrderNumber()}-${Math.floor(Math.random() * 90 + 10)}`;
}

function localToOrder(row: LocalOrder): Order {
  const items: OrderItem[] = row.items.map((i: LocalOrderItem) => ({
    id: i.id,
    productId: i.product_id,
    productSlug: i.product_slug,
    productName: i.product_name,
    unitPrice: i.unit_price,
    quantity: i.quantity,
    lineTotal: i.line_total,
  }));
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    addressLine: row.address_line,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    notes: row.notes,
    subtotal: row.subtotal,
    shipping: row.shipping,
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

async function hydrateOrder(row: Record<string, unknown>): Promise<Order> {
  const supabase = serviceClient()!;
  const { data } = await supabase
    .from('order_items')
    .select('id, product_id, product_slug, product_name, unit_price, quantity, line_total')
    .eq('order_id', row.id)
    .order('id');
  const items = ((data ?? []) as Record<string, unknown>[]).map(toOrderItem);
  return toOrder(row, items);
}

export async function listOrders(): Promise<Order[]> {
  if (BACKEND === 'local') {
    return (await localReadOrders()).map(localToOrder);
  }
  const supabase = serviceClient()!;
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('[repo] orders select failed:', error.message);
    return [];
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  const { data: allItems } = await supabase
    .from('order_items')
    .select('id, order_id, product_id, product_slug, product_name, unit_price, quantity, line_total');
  const byOrder = new Map<string, OrderItem[]>();
  for (const item of (allItems ?? []) as Record<string, unknown>[]) {
    const orderId = String(item.order_id);
    const list = byOrder.get(orderId) ?? [];
    list.push(toOrderItem(item));
    byOrder.set(orderId, list);
  }
  return rows.map((row) => toOrder(row, byOrder.get(String(row.id)) ?? []));
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (BACKEND === 'local') {
    const row = await localReadOrder(id);
    return row ? localToOrder(row) : null;
  }
  const supabase = serviceClient()!;
  const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
  if (!data) return null;
  return hydrateOrder(data as Record<string, unknown>);
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  if (BACKEND === 'local') {
    const row = await localReadOrderByNumber(orderNumber);
    return row ? localToOrder(row) : null;
  }
  const supabase = serviceClient()!;
  const { data } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (!data) return null;
  return hydrateOrder(data as Record<string, unknown>);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  if (BACKEND === 'local') {
    const updated = await withDb((db) => {
      const order = db.orders.find((o) => o.id === id);
      if (!order) return null;
      order.status = status;
      order.updated_at = new Date().toISOString();
      return localToOrder(order);
    });
    return updated;
  }
  const supabase = serviceClient()!;
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select(ORDER_SELECT)
    .maybeSingle();
  if (error) {
    console.error('[repo] status update failed:', error.message);
    return null;
  }
  return data ? hydrateOrder(data as Record<string, unknown>) : null;
}

/* ----------------------------------------------------------- custom requests */

function localCustomToRow(row: LocalCustomRequest): CustomRequest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    description: row.description,
    colorPreference: row.color_preference,
    sizePreference: row.size_preference,
    referenceImageUrl: row.reference_image_url,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createCustomRequest(
  input: Omit<CustomRequest, 'id' | 'status' | 'createdAt'>,
): Promise<CustomRequest> {
  if (BACKEND === 'local') {
    return withDb((db) => {
      const row: LocalCustomRequest = {
        id: randomUUID(),
        name: input.name,
        phone: input.phone,
        email: input.email,
        description: input.description,
        color_preference: input.colorPreference || null,
        size_preference: input.sizePreference || null,
        reference_image_url: input.referenceImageUrl,
        notes: input.notes || null,
        status: 'new',
        created_at: new Date().toISOString(),
      };
      db.custom_requests.push(row);
      return localCustomToRow(row);
    });
  }
  const supabase = serviceClient()!;
  const { data, error } = await supabase
    .from('custom_requests')
    .insert({
      name: input.name,
      phone: input.phone,
      email: input.email,
      description: input.description,
      color_preference: input.colorPreference || null,
      size_preference: input.sizePreference || null,
      reference_image_url: input.referenceImageUrl,
      notes: input.notes || null,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Could not save request: ${error.message}`);
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    description: String(row.description),
    colorPreference: (row.color_preference as string | null) ?? null,
    sizePreference: (row.size_preference as string | null) ?? null,
    referenceImageUrl: (row.reference_image_url as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: String(row.status),
    createdAt: String(row.created_at),
  };
}

export async function listCustomRequests(): Promise<CustomRequest[]> {
  if (BACKEND === 'local') {
    return (await localReadCustomRequests()).map(localCustomToRow);
  }
  const supabase = serviceClient()!;
  const { data } = await supabase
    .from('custom_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    description: String(row.description),
    colorPreference: (row.color_preference as string | null) ?? null,
    sizePreference: (row.size_preference as string | null) ?? null,
    referenceImageUrl: (row.reference_image_url as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: String(row.status),
    createdAt: String(row.created_at),
  }));
}