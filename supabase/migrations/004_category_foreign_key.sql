-- 将 transactions 和 budgets 表的 category 从 text 改为外键引用 categories 表
-- 迁移脚本 - 幂等版本

-- 1. 为 transactions 表添加 category_id 列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN category_id uuid;
  END IF;
END $$;

-- 2. 为 budgets 表添加 category_id 列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budgets' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.budgets ADD COLUMN category_id uuid;
  END IF;
END $$;

-- 3. 将现有 transactions 的 category 名称关联到 categories 表的 id（仅针对未关联的记录）
UPDATE public.transactions t
SET category_id = c.id
FROM public.categories c
WHERE t.category = c.name AND t.category_id IS NULL;

-- 4. 将现有 budgets 的 category 名称关联到 categories 表的 id（仅针对未关联的记录）
UPDATE public.budgets b
SET category_id = c.id
FROM public.categories c
WHERE b.category = c.name AND b.category_id IS NULL;

-- 5. 添加外键约束（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_transactions_category'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT fk_transactions_category
    FOREIGN KEY (category_id)
    REFERENCES public.categories(id)
    ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_budgets_category'
  ) THEN
    ALTER TABLE public.budgets
    ADD CONSTRAINT fk_budgets_category
    FOREIGN KEY (category_id)
    REFERENCES public.categories(id)
    ON DELETE RESTRICT;
  END IF;
END $$;
