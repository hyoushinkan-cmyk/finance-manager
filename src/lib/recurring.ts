import type { SupabaseClient } from "@supabase/supabase-js";
import { insertTransactionAndUpdateBalance } from "@/lib/ledger-data";
import type { Currency } from "@/lib/mock-data";

export const RECURRING_STORAGE_KEY = "finance_app_recurring_rules";
const LAST_RUN_KEY = "finance_app_recurring_last_run";

export type RecurringRule = {
  id: string;
  title: string;
  amount: number; // signed: negative = expense, positive = income
  currency: Currency;
  kind: "expense" | "income";
  frequency: "monthly" | "weekly";
  note: string;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
};

export function loadRecurringRules(): RecurringRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECURRING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is RecurringRule =>
        typeof r === "object" &&
        r !== null &&
        "id" in r &&
        "title" in r &&
        typeof (r as RecurringRule).title === "string",
    );
  } catch {
    return [];
  }
}

export function saveRecurringRules(rules: RecurringRule[]) {
  window.localStorage.setItem(RECURRING_STORAGE_KEY, JSON.stringify(rules));
}

/** 返回某年某月的最后一天，格式 "YYYY-MM-DD" */
function getLastDayOfMonth(year: number, month: number): string {
  // month 是 1-based
  const lastDay = new Date(year, month, 0); // day=0 表示上个月最后一天
  const y = lastDay.getFullYear();
  const m = String(lastDay.getMonth() + 1).padStart(2, "0");
  const d = String(lastDay.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 读取上次执行记录，格式 "YYYY-MM" 或 null */
function getLastRun(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_RUN_KEY);
}

/** 保存本次执行的年月，格式 "YYYY-MM" */
function setLastRun(yearMonth: string) {
  window.localStorage.setItem(LAST_RUN_KEY, yearMonth);
}

/**
 * 在每次 App 初始化时调用。
 * 如果当前月份比上次执行月份更新，则把上个月的所有 monthly 规则
 * 以上个月最后一天为日期自动插入 transactions。
 *
 * @returns 成功入账的条数
 */
export async function applyMonthlyRecurringRules(
  sb: SupabaseClient,
): Promise<number> {
  const rules = loadRecurringRules();
  const monthlyRules = rules.filter(
    (r) =>
      r.frequency === "monthly" &&
      r.accountId &&
      r.categoryId,
  );

  if (monthlyRules.length === 0) return 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  // 上个月
  const prevDate = new Date(currentYear, currentMonth - 2, 1); // month-2 because month is 1-based
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1; // 1-based
  const prevYM = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  const lastRun = getLastRun();

  // 如果上次执行已经是上个月（或更新），说明本月已处理过，跳过
  if (lastRun && lastRun >= prevYM) return 0;

  // 上个月最后一天
  const occurredOn = getLastDayOfMonth(prevYear, prevMonth);

  let applied = 0;
  for (const rule of monthlyRules) {
    try {
      await insertTransactionAndUpdateBalance(sb, {
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        categoryName: rule.categoryName,
        title: rule.title,
        amount: rule.amount,
        currency: rule.currency,
        occurredOn,
        notes: rule.note || null,
      });
      applied++;
    } catch (err) {
      console.error(`[recurring] 自动入账失败 (${rule.title}):`, err);
    }
  }

  // 记录本次执行为上个月（而非当前月，避免当月重复执行）
  setLastRun(prevYM);

  return applied;
}
