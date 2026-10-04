'use client';

import { useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import type { Product } from '@/lib/types';

export default function AddToBagButton({
  product,
  quantity = 1,
  className = 'btn btn--full',
  label = 'Add to bag',
}: {
  product: Product;
  quantity?: number;
  className?: string;
  label?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const soldOut = product.availability === 'sold_out';

  return (
    <button
      type="button"
      disabled={soldOut}
      className={className}
      onClick={() => {
        add(product, quantity);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 2400);
      }}
    >
      {soldOut ? 'Sold out' : added ? 'Added to bag ✓' : label}
    </button>
  );
}