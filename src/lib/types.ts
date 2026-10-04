import type { CollectionSlug } from './brand';
import { DEFAULT_LEAD_TIME_DAYS } from './brand';

export type Availability = 'in_stock' | 'made_to_order' | 'sold_out';

export type ProductImage = {
  src: string;
  srcSet?: string;
  alt: string;
  width?: number;
  height?: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Whole rupees. Integer, never a float. */
  price: number;
  compareAt: number | null;
  images: ProductImage[];
  category: CollectionSlug;
  availability: Availability;
  featured: boolean;
  leadTimeDays: number;
  materials: string;
  details: string[];
  createdAt: string;
};

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: ProductImage;
  quantity: number;
  availability: Availability;
};

export type OrderItem = {
  id: string;
  productId: string | null;
  productSlug: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  phone: string;
  email: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  notes: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type CustomRequest = {
  id: string;
  name: string;
  phone: string;
  email: string;
  description: string;
  colorPreference: string | null;
  sizePreference: string | null;
  referenceImageUrl: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in_stock: 'In stock — ships in 3 days',
  made_to_order: `Made to order — ${DEFAULT_LEAD_TIME_DAYS} days`,
  sold_out: 'Sold out',
};

/** Compact form used on cards and grids, where space is tight. */
export const AVAILABILITY_SHORT: Record<Availability, string> = {
  in_stock: 'In stock',
  made_to_order: 'Made to order',
  sold_out: 'Sold out',
};

export const CATEGORY_LABEL: Record<string, string> = {
  bags: 'Bags',
  accessories: 'Accessories',
  flowers: 'Flowers',
  custom: 'Custom',
};