-- ===========================================================================
-- Cuddle With Yarn — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- products
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text        not null unique,
  name           text        not null,
  tagline        text        not null default '',
  description    text        not null,
  price          integer     not null check (price >= 0),
  compare_at     integer     check (compare_at is null or compare_at >= 0),
  images         jsonb       not null default '[]'::jsonb,
  category       text        not null check (category in ('bags','accessories','flowers','custom')),
  availability   text        not null default 'made_to_order'
                     check (availability in ('in_stock','made_to_order','sold_out')),
  featured       boolean     not null default false,
  lead_time_days integer     not null default 12,
  materials      text        not null default '',
  details        jsonb       not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_featured_idx on public.products (featured desc);

-- ------------------------------------------------------------------ orders
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text        not null unique,
  idempotency_key  text        unique,
  status           text        not null default 'new'
                     check (status in ('new','confirmed','processing','shipped','completed','cancelled')),
  customer_name    text        not null,
  phone            text        not null,
  email            text        not null,
  address_line     text        not null,
  city             text        not null,
  state            text        not null,
  pincode          text        not null,
  notes            text,
  subtotal         integer     not null check (subtotal >= 0),
  shipping         integer     not null default 0 check (shipping >= 0),
  total            integer     not null check (total >= 0),
  international    boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

-- Order items are an immutable snapshot: the price a customer paid is stored
-- here and never re-read from `products`.
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid        not null references public.orders (id) on delete cascade,
  product_id    uuid        references public.products (id) on delete set null,
  product_slug  text,
  product_name  text        not null,
  unit_price    integer     not null check (unit_price >= 0),
  quantity      integer     not null check (quantity > 0 and quantity <= 20),
  line_total    integer     not null check (line_total >= 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------- custom requests
create table if not exists public.custom_requests (
  id                 uuid primary key default gen_random_uuid(),
  name               text        not null,
  phone              text        not null,
  email              text        not null,
  description        text        not null,
  color_preference   text,
  size_preference    text,
  reference_image_url text,
  notes              text,
  status             text        not null default 'new'
                       check (status in ('new','reviewing','quoted','accepted','declined')),
  created_at         timestamptz not null default now()
);

create index if not exists custom_requests_created_idx on public.custom_requests (created_at desc);

-- ======================================================================= RLS
-- Everything is locked down. The storefront reads products with the anon key;
-- orders and custom requests are only ever touched by the service role, which
-- lives exclusively in server code behind /admin authentication.
alter table public.products         enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.custom_requests  enable row level security;

drop policy if exists "products are public" on public.products;
create policy "products are public"
  on public.products for select
  using (true);

-- No insert/update/delete policies at all on orders / order_items /
-- custom_requests: those tables are unreachable with the anon key.

-- ---------------------------------------------------- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- ====================================================== reference image bucket
-- Optional storage bucket for custom-request reference images.
insert into storage.buckets (id, name, public)
values ('custom-references', 'custom-references', true)
on conflict (id) do nothing;

drop policy if exists "public read for reference images" on storage.objects;
create policy "public read for reference images"
  on storage.objects for select
  using (bucket_id = 'custom-references');