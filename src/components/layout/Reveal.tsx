'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

/**
 * One shared IntersectionObserver for every reveal on the page — cheap, and it
 * keeps scroll work out of React state. Reveals are disabled entirely under
 * prefers-reduced-motion via CSS.
 */
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return null;
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target as HTMLElement;
        target.dataset.reveal = 'in';
        observer?.unobserve(target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );
  return observer;
}

export default function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  children,
  ...rest
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = getObserver();
    if (!io) {
      node.dataset.reveal = 'in';
      return;
    }
    io.observe(node);
    return () => io.unobserve(node);
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={className}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}