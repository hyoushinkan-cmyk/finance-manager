-- 循环记账规则表
-- 注意：accounts 表没有 user_id 列，我们通过 RLS 策略来限制用户只能访问自己的数据

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric not null, -- signed: negative = expense, positive = income
  currency text not null,
  kind text not null check (kind in ('expense', 'income')),
  frequency text not null check (frequency in ('monthly', 'weekly')),
  note text,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recurring_rules enable row level security;

-- 临时策略：在开发模式下允许所有操作
-- 生产环境需要替换为基于 account 所属用户的策略
create policy "dev_allow_all_recurring_rules"
  on public.recurring_rules for all
  using (true)
  with check (true);

-- 为常用查询添加索引
create index recurring_rules_account_id_idx on public.recurring_rules (account_id);
create index recurring_rules_category_id_idx on public.recurring_rules (category_id);