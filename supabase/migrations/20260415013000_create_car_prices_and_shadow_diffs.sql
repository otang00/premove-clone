create table if not exists public.car_prices (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  base_price integer not null default 0,
  discount_price integer not null default 0,
  delivery_price integer not null default 0,
  currency text not null default 'KRW',
  effective_from timestamptz,
  effective_to timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_car_prices_car_id on public.car_prices(car_id);
create index if not exists idx_car_prices_effective_window on public.car_prices(effective_from, effective_to);
create table if not exists public.search_shadow_diffs (
  id uuid primary key default gen_random_uuid(),
  search_hash text not null,
  search_params jsonb not null,
  partner jsonb not null,
  db jsonb not null,
  diff jsonb not null,
  execution_meta jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_search_shadow_diffs_hash on public.search_shadow_diffs(search_hash);
create index if not exists idx_search_shadow_diffs_created_at on public.search_shadow_diffs(created_at desc);
