-- Run in Supabase SQL Editor or via CLI. Adjust RLS policies before production.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('cash', 'investment')),
  currency text not null check (currency in ('JPY', 'CNY')),
  balance numeric not null default 0,
  principal numeric,
  profit numeric,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete restrict,
  category text not null,
  title text not null,
  amount numeric not null,
  currency text not null check (currency in ('JPY', 'CNY')),
  occurred_on date not null default (current_date),
  created_at timestamptz not null default now()
);

create index transactions_occurred_on_idx on public.transactions (occurred_on desc);
create index transactions_account_id_idx on public.transactions (account_id);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  category text not null unique,
  limit_amount numeric not null,
  currency text not null check (currency in ('JPY', 'CNY'))
);

alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

create policy "dev_allow_all_accounts"
  on public.accounts for all
  using (true) with check (true);

create policy "dev_allow_all_transactions"
  on public.transactions for all
  using (true) with check (true);

create policy "dev_allow_all_budgets"
  on public.budgets for all
  using (true) with check (true);

-- Seed (matches former mock data; balances consistent with these transactions)
insert into public.accounts (id, name, type, currency, balance, principal, profit) values
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1', '现金 · 三菱', 'cash', 'JPY', 185420, null, null),
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa2', 'Suica', 'cash', 'JPY', 3200, null, null),
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa3', '投资 · SBI', 'investment', 'JPY', 1200000, 1000000, 200000),
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa4', '招行储蓄', 'cash', 'CNY', 42800, null, null);

insert into public.budgets (category, limit_amount, currency) values
  ('餐饮', 60000, 'JPY'),
  ('交通', 15000, 'JPY'),
  ('购物', 30000, 'JPY');

insert into public.transactions (account_id, category, title, amount, currency, occurred_on) values
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1', '餐饮', '超市', -1280, 'JPY', '2026-03-29'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa2', '交通', '交通', -220, 'JPY', '2026-03-29'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa4', '转账', '国内转账', 5000, 'CNY', '2026-03-28');
