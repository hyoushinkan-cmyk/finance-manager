-- 临时修复：允许所有经过认证的用户读取所有账户
-- 运行此 SQL 后，刷新页面看账户是否显示
-- 如果显示，说明问题确实是 RLS 策略导致的 user_id 不匹配

-- 删除限制性 SELECT 策略
DROP POLICY IF EXISTS accounts_select_own ON public.accounts;

-- 创建新的宽松 SELECT 策略（允许所有认证用户读取）
-- 注意: SELECT 不需要 WITH CHECK
CREATE POLICY accounts_select_all_authenticated
ON public.accounts
FOR SELECT
TO authenticated
USING (true);
