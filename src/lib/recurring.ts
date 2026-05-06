import type { SupabaseClient } from "@supabase/supabase-js";
import { insertTransactionAndUpdateBalance } from "@/lib/ledger-data";
import type { Currency } from "@/lib/mock-data";

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

// ====== 数据库操作函数 ======

/**
 * 从数据库加载用户的循环记账规则
 */
export async function fetchRecurringRules(sb: SupabaseClient): Promise<RecurringRule[]> {
  const { data, error } = await sb
    .from("recurring_rules")
    .select(`
      id,
      title,
      amount,
      currency,
      kind,
      frequency,
      note,
      account_id,
      category_id,
      accounts (name),
      categories (name)
    `)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[recurring] 获取规则失败:", error);
    return [];
  }

  return (data ?? []).map((r) => {
    // 处理 accounts 可能是数组或对象的情况
    let accountName = "";
    const acc = r.accounts;
    if (Array.isArray(acc)) {
      accountName = acc[0]?.name ?? "";
    } else if (acc && typeof acc === "object" && "name" in acc) {
      accountName = (acc as { name: string }).name ?? "";
    }
    
    // 处理 categories 可能是数组或对象的情况
    let categoryName = "";
    const cat = r.categories;
    if (Array.isArray(cat)) {
      categoryName = cat[0]?.name ?? "";
    } else if (cat && typeof cat === "object" && "name" in cat) {
      categoryName = (cat as { name: string }).name ?? "";
    }
    
    return {
      id: r.id as string,
      title: r.title as string,
      amount: Number(r.amount),
      currency: r.currency as Currency,
      kind: r.kind as "expense" | "income",
      frequency: r.frequency as "monthly" | "weekly",
      note: (r.note as string) || "",
      accountId: r.account_id as string,
      accountName,
      categoryId: r.category_id as string,
      categoryName,
    };
  });
}

/**
 * 添加新的循环记账规则
 */
export async function addRecurringRule(
  sb: SupabaseClient,
  rule: Omit<RecurringRule, "id">
): Promise<RecurringRule> {
  const { data, error } = await sb
    .from("recurring_rules")
    .insert({
      title: rule.title,
      amount: rule.amount,
      currency: rule.currency,
      kind: rule.kind,
      frequency: rule.frequency,
      note: rule.note || null,
      account_id: rule.accountId,
      category_id: rule.categoryId,
    })
    .select(`
      id,
      title,
      amount,
      currency,
      kind,
      frequency,
      note,
      account_id,
      category_id,
      accounts (name),
      categories (name)
    `)
    .single();

  if (error) {
    console.error("[recurring] 添加规则失败:", error);
    throw error;
  }

  // 处理 accounts 可能是数组或对象的情况
  let accountName = "";
  const acc = data.accounts;
  if (Array.isArray(acc)) {
    accountName = acc[0]?.name ?? "";
  } else if (acc && typeof acc === "object" && "name" in acc) {
    accountName = (acc as { name: string }).name ?? "";
  }
  
  // 处理 categories 可能是数组或对象的情况
  let categoryName = "";
  const cat = data.categories;
  if (Array.isArray(cat)) {
    categoryName = cat[0]?.name ?? "";
  } else if (cat && typeof cat === "object" && "name" in cat) {
    categoryName = (cat as { name: string }).name ?? "";
  }
  
  return {
    id: data.id as string,
    title: data.title as string,
    amount: Number(data.amount),
    currency: data.currency as Currency,
    kind: data.kind as "expense" | "income",
    frequency: data.frequency as "monthly" | "weekly",
    note: (data.note as string) || "",
    accountId: data.account_id as string,
    accountName,
    categoryId: data.category_id as string,
    categoryName,
  };
}

/**
 * 删除循环记账规则
 */
export async function deleteRecurringRule(sb: SupabaseClient, ruleId: string): Promise<void> {
  const { error } = await sb.from("recurring_rules").delete().eq("id", ruleId);
  if (error) {
    console.error("[recurring] 删除规则失败:", error);
    throw error;
  }
}

/**
 * 从本地 localStorage 加载规则（兼容旧数据迁移）
 */
export function loadRecurringRulesFromLocal(): RecurringRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("finance_app_recurring_rules");
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

/**
 * 清除本地 localStorage 中的旧规则（迁移后调用）
 */
export function clearLocalRecurringRules(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("finance_app_recurring_rules");
  window.localStorage.removeItem("finance_app_recurring_last_run");
}

// ====== 自动入账相关 ======

const LAST_RUN_KEY = "finance_app_recurring_last_run";

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
  // 从数据库加载规则
  const rules = await fetchRecurringRules(sb);
  const monthlyRules = rules.filter(
    (r: RecurringRule) =>
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
