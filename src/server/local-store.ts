/**
 * Development / offline fallback store.
 *
 * Used only when Supabase credentials are absent (or unreachable). Keeps the
 * entire shopping + admin flow testable on a laptop with no project set up.
 * Data lives in `.data/db.json`, which is gitignored.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type LocalOrder = {
  id: string;
  order_number: string;
  idempotency_key: string | null;
  status: string;
  customer_name: string;
  phone: string;
  email: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  notes: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  international: boolean;
  created_at: string;
  updated_at: string;
  items: LocalOrderItem[];
};

export type LocalOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_slug: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type LocalCustomRequest = {
  id: string;
  name: string;
  phone: string;
  email: string;
  description: string;
  color_preference: string | null;
  size_preference: string | null;
  reference_image_url: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

type Db = { orders: LocalOrder[]; custom_requests: LocalCustomRequest[] };

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

/**
 * Serialises access so two concurrent requests cannot clobber the file, and
 * persists whatever the callback changed.
 */
let chain: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<Db> {
  try {
    const raw = await readFile(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Db>;
    return { orders: parsed.orders ?? [], custom_requests: parsed.custom_requests ?? [] };
  } catch {
    return { orders: [], custom_requests: [] };
  }
}

async function writeDb(db: Db): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const target = `${DB_FILE}.${process.pid}.tmp`;
  await writeFile(target, JSON.stringify(db, null, 2));
  await rename(target, DB_FILE);
}

export function withDb<T>(fn: (db: Db) => Promise<T> | T): Promise<T> {
  const next = chain.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  chain = next.catch(() => undefined);
  return next;
}

export async function localReadOrders(): Promise<LocalOrder[]> {
  const db = await readDb();
  return [...db.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function localReadOrder(id: string): Promise<LocalOrder | null> {
  const db = await readDb();
  return db.orders.find((o) => o.id === id) ?? null;
}

export async function localReadOrderByNumber(orderNumber: string): Promise<LocalOrder | null> {
  const db = await readDb();
  const found = db.orders.find(
    (o) => o.order_number.toLowerCase() === orderNumber.trim().toLowerCase(),
  );
  return found ?? null;
}

export async function localReadCustomRequests(): Promise<LocalCustomRequest[]> {
  const db = await readDb();
  return [...db.custom_requests].sort((a, b) => b.created_at.localeCompare(a.created_at));
}