-- 转账功能支持
-- 添加 type 字段、from_account_id、to_account_id 字段

-- 1. 添加 type 字段（默认为 'expense' 兼容旧数据）
ALTER TABLE public.transactions 
ADD COLUMN type text NOT NULL DEFAULT 'expense' 
CHECK (type IN ('expense', 'income', 'transfer'));

-- 2. 添加转账专用字段
ALTER TABLE public.transactions 
ADD COLUMN from_account_id uuid REFERENCES public.accounts(id) ON DELETE RESTRICT;

ALTER TABLE public.transactions 
ADD COLUMN to_account_id uuid REFERENCES public.accounts(id) ON DELETE RESTRICT;

-- 3. 添加约束：转账时 from 和 to 不能相同
ALTER TABLE public.transactions 
ADD CONSTRAINT transfer_accounts_check 
CHECK (type != 'transfer' OR (from_account_id IS NOT NULL AND to_account_id IS NOT NULL AND from_account_id != to_account_id));

-- 4. 添加索引以优化查询性能
CREATE INDEX transactions_type_idx ON public.transactions (type);
CREATE INDEX transactions_from_account_idx ON public.transactions (from_account_id) WHERE from_account_id IS NOT NULL;
CREATE INDEX transactions_to_account_idx ON public.transactions (to_account_id) WHERE to_account_id IS NOT NULL;

-- 5. 为现有数据设置 type 值（根据 amount 正负判断）
UPDATE public.transactions 
SET type = CASE 
    WHEN amount >= 0 THEN 'income' 
    ELSE 'expense' 
END
WHERE type = 'expense' AND amount >= 0 OR type = 'expense' AND amount < 0;

-- 更安全的做法：直接基于 amount 设置 type
UPDATE public.transactions SET type = CASE WHEN amount >= 0 THEN 'income' ELSE 'expense' END;
