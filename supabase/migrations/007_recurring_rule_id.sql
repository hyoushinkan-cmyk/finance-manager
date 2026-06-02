-- 为 transactions 表添加 recurring_rule_id 字段，关联循环记账规则
-- 这样可以追踪每笔自动入账的交易来自哪个规则

-- 1. 添加 recurring_rule_id 字段
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS recurring_rule_id uuid REFERENCES public.recurring_rules(id) ON DELETE SET NULL;

-- 2. 添加索引以优化查询
CREATE INDEX IF NOT EXISTS transactions_recurring_rule_id_idx ON public.transactions (recurring_rule_id) WHERE recurring_rule_id IS NOT NULL;

-- 3. 为现有的循环记账交易补上 recurring_rule_id
-- 匹配逻辑：同一 title、同月份的交易，关联到对应规则
-- 注意：可能有多个规则使用相同标题的情况，此时只关联第一个匹配到的规则

DO $$
DECLARE
    rec record;
BEGIN
    -- 为每条没有 recurring_rule_id 的交易，尝试找到匹配的规则
    FOR rec IN
        SELECT t.id as tx_id, t.title, t.occurred_on, r.id as rule_id
        FROM public.transactions t
        CROSS JOIN LATERAL (
            SELECT id FROM public.recurring_rules
            WHERE title = t.title
            LIMIT 1
        ) r
        WHERE t.recurring_rule_id IS NULL
    LOOP
        UPDATE public.transactions
        SET recurring_rule_id = rec.rule_id
        WHERE id = rec.tx_id;
    END LOOP;
END $$;