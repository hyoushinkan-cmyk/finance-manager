-- 分类管理表
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('expense', 'income')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "dev_allow_all_categories"
  on public.categories for all
  using (true) with check (true);

-- 插入默认支出分类
insert into public.categories (name, type, sort_order) values
  ('餐饮', 'expense', 1),
  ('交通', 'expense', 2),
  ('购物', 'expense', 3),
  ('居住', 'expense', 4),
  ('娱乐', 'expense', 5),
  ('医疗', 'expense', 6),
  ('转账', 'expense', 7),
  ('其他', 'expense', 8);

-- 插入默认收入分类
insert into public.categories (name, type, sort_order) values
  ('工资', 'income', 1),
  ('奖金', 'income', 2),
  ('额外收入', 'income', 3);
