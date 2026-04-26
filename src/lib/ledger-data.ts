import type { SupabaseClient } from "@supabase/supabase-js";
import type { Currency } from "@/lib/mock-data";
import { amountInJpy } from "@/lib/fx";

export type AccountRow = {
  id: string;
  name: string;
  type: "cash" | "investment";
  currency: Currency;
  balance: number;
  principal: number | null;
  profit: number | null;
};

export type TransactionType = "expense" | "income" | "transfer";

export type TransactionListItem = {
  id: string;
  title: string;
  type: TransactionType;
  categoryId: string | null;
  categoryName: string;
  amount: number;
  currency: Currency;
  accountName: string;
  accountId: string;
  date: string;
  notes: string | null;
  fromAccountId?: string | null;
  fromAccountName?: string | null;
  toAccountId?: string | null;
  toAccountName?: string | null;
};

export type BudgetRow = {
  id: string;
  categoryId: string;
  categoryName: string;
  limit: number;
  currency: Currency;
};

export type CategoryRow = {
  id: string;
  name: string;
  type: "expense" | "income";
  sort_order: number;
};

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return 0;
}

async function requireUserId(sb: SupabaseClient): Promise<string> {
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

export async function fetchAccounts(
  sb: SupabaseClient,
): Promise<AccountRow[]> {
  console.log("[DEBUG] fetchAccounts: 开始查询...");
  const { data, error } = await sb
    .from("accounts")
    .select("id,name,type,currency,balance,principal,profit")
    .order("name", { ascending: true });

  console.log("[DEBUG] fetchAccounts 结果:", { data, error });
  if (error) {
    console.error("[DEBUG] fetchAccounts error:", error);
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    type: r.type as AccountRow["type"],
    currency: r.currency as Currency,
    balance: num(r.balance),
    principal: r.principal == null ? null : num(r.principal),
    profit: r.profit == null ? null : num(r.profit),
  }));
}

export async function insertAccount(
  sb: SupabaseClient,
  params: {
    name: string;
    type: AccountRow["type"];
    currency: Currency;
    balance: number;
    principal: number | null;
    profit: number | null;
  },
): Promise<void> {
  const userId = await requireUserId(sb);
  const { error } = await sb.from("accounts").insert({
    user_id: userId,
    name: params.name.trim(),
    type: params.type,
    currency: params.currency,
    balance: params.balance,
    principal: params.type === "investment" ? params.principal : null,
    profit: params.type === "investment" ? params.profit : null,
  });
  if (error) throw error;
}

export async function updateAccount(
  sb: SupabaseClient,
  accountId: string,
  params: {
    name: string;
    type: AccountRow["type"];
    currency: Currency;
    balance: number;
    principal: number | null;
    profit: number | null;
  },
): Promise<void> {
  await requireUserId(sb);
  const { error } = await sb
    .from("accounts")
    .update({
      name: params.name.trim(),
      type: params.type,
      currency: params.currency,
      balance: params.balance,
      principal: params.type === "investment" ? params.principal : null,
      profit: params.type === "investment" ? params.profit : null,
    })
    .eq("id", accountId);
  if (error) throw error;
}

export async function deleteAccount(
  sb: SupabaseClient,
  accountId: string,
): Promise<void> {
  await requireUserId(sb);
  const { error } = await sb.from("accounts").delete().eq("id", accountId);
  if (error) throw error;
}

export async function fetchBudgets(sb: SupabaseClient): Promise<BudgetRow[]> {
  const { data, error } = await sb
    .from("budgets")
    .select(`
      id,
      category_id,
      limit_amount,
      currency,
      categories ( name )
    `)
    .order("id", { ascending: true });

  if (error) throw error;

  type Row = {
    id: string;
    category_id: string | null;
    limit_amount: unknown;
    currency: string;
    categories: { name: string } | null;
  };

  return (data ?? []).map((r) => {
    const row = r as unknown as Row;
    const categoryName = row.categories?.name ?? "";

    return {
      id: row.id,
      categoryId: row.category_id ?? "",
      categoryName,
      limit: num(row.limit_amount),
      currency: row.currency as Currency,
    };
  });
}

export async function insertBudget(
  sb: SupabaseClient,
  params: { categoryId: string; limit: number; currency: Currency },
): Promise<void> {
  await requireUserId(sb);
  const { error } = await sb.from("budgets").insert({
    category_id: params.categoryId,
    limit_amount: params.limit,
    currency: params.currency,
  });
  if (error) throw error;
}

export async function updateBudget(
  sb: SupabaseClient,
  budgetId: string,
  params: { categoryId: string; limit: number; currency: Currency },
): Promise<void> {
  await requireUserId(sb);
  const { error } = await sb
    .from("budgets")
    .update({
      category_id: params.categoryId,
      limit_amount: params.limit,
      currency: params.currency,
    })
    .eq("id", budgetId);
  if (error) throw error;
}

export async function deleteBudget(
  sb: SupabaseClient,
  budgetId: string,
): Promise<void> {
  await requireUserId(sb);
  const { error } = await sb.from("budgets").delete().eq("id", budgetId);
  if (error) throw error;
}

// 分类管理函数
export async function fetchCategories(
  sb: SupabaseClient,
): Promise<CategoryRow[]> {
  const { data, error } = await sb
    .from("categories")
    .select("id,name,type,sort_order")
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    type: r.type as "expense" | "income",
    sort_order: num(r.sort_order),
  }));
}

export async function insertCategory(
  sb: SupabaseClient,
  params: { name: string; type: "expense" | "income" },
): Promise<void> {
  await requireUserId(sb);
  const { error } = await sb.from("categories").insert({
    name: params.name.trim(),
    type: params.type,
    sort_order: 0,
  });
  if (error) throw error;
}

export async function updateCategory(
  sb: SupabaseClient,
  categoryId: string,
  params: { name: string },
): Promise<void> {
  await requireUserId(sb);
  const { error } = await sb
    .from("categories")
    .update({ name: params.name.trim() })
    .eq("id", categoryId);
  if (error) throw error;
}

export async function deleteCategory(
  sb: SupabaseClient,
  categoryId: string,
): Promise<void> {
  await requireUserId(sb);
  const { error } = await sb
    .from("categories")
    .delete()
    .eq("id", categoryId);
  if (error) throw error;
}

export async function fetchTransactions(
  sb: SupabaseClient,
): Promise<TransactionListItem[]> {
  const { data, error } = await sb
    .from("transactions")
    .select(
      `
      id,
      title,
      type,
      category_id,
      amount,
      currency,
      occurred_on,
      notes,
      account_id,
      categories ( name ),
      from_account_id,
      to_account_id
    `,
    )
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });

  console.log("[DEBUG FETCH] data:", data, "error:", error);
  
  if (error) throw error;

  type Row = {
    id: string;
    title: string;
    type: string;
    category_id: string | null;
    amount: unknown;
    currency: string;
    occurred_on: string;
    notes: string | null;
    account_id: string;
    categories:
      | { name: string }
      | { name: string }[]
      | null;
    from_account_id: string | null;
    to_account_id: string | null;
  };

  const rows = (data ?? []) as Row[];
  
  // 批量获取所有相关的账户名称
  const allAccountIds = new Set<string>();
  rows.forEach((r) => {
    if (r.account_id) allAccountIds.add(r.account_id);
    if (r.from_account_id) allAccountIds.add(r.from_account_id);
    if (r.to_account_id) allAccountIds.add(r.to_account_id);
  });
  
  // 查询所有需要的账户
  let accountNames: Record<string, string> = {};
  if (allAccountIds.size > 0) {
    const { data: accountsData, error: accErr } = await sb
      .from("accounts")
      .select("id, name")
      .in("id", Array.from(allAccountIds));
    
    if (!accErr && accountsData) {
      accountNames = {};
      accountsData.forEach((acc: { id: string; name: string }) => {
        accountNames[acc.id] = acc.name;
      });
    }
  }

  return rows.map((r) => {
    const cat = r.categories;
    const categoryName = Array.isArray(cat)
      ? (cat[0]?.name ?? "")
      : (cat?.name ?? "");

    return {
      id: r.id,
      title: r.title,
      type: r.type as TransactionType,
      categoryId: r.category_id ?? null,
      categoryName,
      amount: num(r.amount),
      currency: r.currency as Currency,
      accountName: accountNames[r.account_id] ?? "",
      accountId: r.account_id,
      date: r.occurred_on.slice(0, 10),
      notes: r.notes ?? null,
      fromAccountId: r.from_account_id,
      fromAccountName: r.from_account_id ? accountNames[r.from_account_id] ?? null : null,
      toAccountId: r.to_account_id,
      toAccountName: r.to_account_id ? accountNames[r.to_account_id] ?? null : null,
    };
  });
}

export async function fetchTransactionsForStats(
  sb: SupabaseClient,
  from: string,
  to: string,
): Promise<
  {
    amount: number;
    currency: Currency;
    category: string;
    occurred_on: string;
  }[]
> {
  const { data, error } = await sb
    .from("transactions")
    .select(`
      amount,
      currency,
      occurred_on,
      categories ( name )
    `)
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .neq("type", "transfer"); // 过滤掉转账记录

  if (error) throw error;

  type Row = {
    amount: unknown;
    currency: string;
    occurred_on: string;
    categories:
      | { name: string }
      | { name: string }[]
      | null;
  };

  return (data ?? []).map((r) => {
    const row = r as unknown as Row;
    const cat = row.categories;
    const categoryName = Array.isArray(cat)
      ? (cat[0]?.name ?? "")
      : (cat?.name ?? "");

    return {
      amount: num(row.amount),
      currency: row.currency as Currency,
      category: categoryName,
      occurred_on: (row.occurred_on as string).slice(0, 10),
    };
  });
}

export function spendJpyOnDate(
  items: { amount: number; currency: Currency; date: string }[],
  ymd: string,
): number {
  let sum = 0;
  for (const t of items) {
    if (t.date !== ymd) continue;
    if (t.amount >= 0) continue;
    sum += amountInJpy(Math.abs(t.amount), t.currency);
  }
  return sum;
}

export function spendJpyInMonth(
  items: { amount: number; currency: Currency; date: string }[],
  year: number,
  month: number,
): number {
  let sum = 0;
  for (const t of items) {
    const d = t.date.slice(0, 10);
    const [y, m] = d.split("-").map(Number);
    if (y !== year || m !== month) continue;
    if (t.amount >= 0) continue;
    sum += amountInJpy(Math.abs(t.amount), t.currency);
  }
  return sum;
}

export function incomeJpyInMonth(
  items: { amount: number; currency: Currency; date: string }[],
  year: number,
  month: number,
): number {
  let sum = 0;
  for (const t of items) {
    const d = t.date.slice(0, 10);
    const [y, m] = d.split("-").map(Number);
    if (y !== year || m !== month) continue;
    if (t.amount <= 0) continue;
    sum += amountInJpy(t.amount, t.currency);
  }
  return sum;
}

export function categoryExpenseJpyInMonth(
  items: { amount: number; currency: Currency; category: string; date: string }[],
  year: number,
  month: number,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of items) {
    const d = t.date.slice(0, 10);
    const [y, m] = d.split("-").map(Number);
    if (y !== year || m !== month) continue;
    if (t.amount >= 0) continue;
    const jpy = amountInJpy(Math.abs(t.amount), t.currency);
    map.set(t.category, (map.get(t.category) ?? 0) + jpy);
  }
  return map;
}

export function monthTotalsJpy(
  items: { amount: number; currency: Currency; date: string }[],
  year: number,
  month: number,
): { income: number; expense: number } {
  return {
    income: incomeJpyInMonth(items, year, month),
    expense: spendJpyInMonth(items, year, month),
  };
}

export async function insertTransactionAndUpdateBalance(
  sb: SupabaseClient,
  params: {
    accountId: string;
    categoryId: string;
    categoryName: string;
    title: string;
    amount: number;
    currency: Currency;
    occurredOn: string;
    notes: string | null;
  },
): Promise<void> {
  const userId = await requireUserId(sb);
  const { data: account, error: accErr } = await sb
    .from("accounts")
    .select("balance")
    .eq("id", params.accountId)
    .single();

  if (accErr) throw accErr;

  const currentBalance = num(account?.balance);
  const nextBalance = currentBalance + params.amount;

  const row: Record<string, unknown> = {
    user_id: userId,
    account_id: params.accountId,
    category_id: params.categoryId,
    category: params.categoryName,
    title: params.title,
    amount: params.amount,
    currency: params.currency,
    occurred_on: params.occurredOn,
  };
  if (params.notes != null && params.notes.trim() !== "") {
    row.notes = params.notes.trim();
  }

  const { data: insertResult, error: insErr } = await sb
    .from("transactions")
    .insert(row)
    .select("id, category_id, category");
  
  console.log("[DEBUG INSERT RESULT] data:", insertResult, "error:", insErr);
  
  if (insErr) throw insErr;

  const { error: updErr } = await sb
    .from("accounts")
    .update({ balance: nextBalance })
    .eq("id", params.accountId);
  if (updErr) throw updErr;
}

export async function updateTransaction(
  sb: SupabaseClient,
  transactionId: string,
  params: {
    accountId: string;
    categoryId: string;
    categoryName: string;
    title: string;
    amount: number;
    currency: Currency;
    occurredOn: string;
    notes: string | null;
  },
): Promise<void> {
  const userId = await requireUserId(sb);

  // 获取当前交易记录
  const { data: currentTx, error: fetchErr } = await sb
    .from("transactions")
    .select("amount, account_id")
    .eq("id", transactionId)
    .single();

  if (fetchErr) throw fetchErr;
  if (!currentTx) throw new Error("Transaction not found");

  const oldAmount = num(currentTx.amount);
  const oldAccountId = currentTx.account_id as string;
  const amountDiff = params.amount - oldAmount;

  // 如果更换了账户，需要从旧账户减去旧金额，新账户加上新金额
  // 否则只需要调整金额差异
  if (oldAccountId !== params.accountId) {
    // 旧账户：回滚旧金额
    const { data: oldAccount, error: oldAccErr } = await sb
      .from("accounts")
      .select("balance")
      .eq("id", oldAccountId)
      .single();
    if (oldAccErr) throw oldAccErr;

    const { error: oldUpdErr } = await sb
      .from("accounts")
      .update({ balance: num(oldAccount?.balance) - oldAmount })
      .eq("id", oldAccountId);
    if (oldUpdErr) throw oldUpdErr;

    // 新账户：加上新金额
    const { data: newAccount, error: newAccErr } = await sb
      .from("accounts")
      .select("balance")
      .eq("id", params.accountId)
      .single();
    if (newAccErr) throw newAccErr;

    const { error: newUpdErr } = await sb
      .from("accounts")
      .update({ balance: num(newAccount?.balance) + params.amount })
      .eq("id", params.accountId);
    if (newUpdErr) throw newUpdErr;
  } else if (amountDiff !== 0) {
    // 同一账户，只需调整差额
    const { data: account, error: accErr } = await sb
      .from("accounts")
      .select("balance")
      .eq("id", params.accountId)
      .single();
    if (accErr) throw accErr;

    const { error: updErr } = await sb
      .from("accounts")
      .update({ balance: num(account?.balance) + amountDiff })
      .eq("id", params.accountId);
    if (updErr) throw updErr;
  }

  // 更新交易记录
  const row: Record<string, unknown> = {
    category_id: params.categoryId,
    category: params.categoryName,
    title: params.title,
    amount: params.amount,
    currency: params.currency,
    occurred_on: params.occurredOn,
  };
  if (params.notes != null && params.notes.trim() !== "") {
    row.notes = params.notes.trim();
  } else {
    row.notes = null;
  }

  const { error: updErr } = await sb
    .from("transactions")
    .update(row)
    .eq("id", transactionId);
  if (updErr) throw updErr;
}

export async function deleteTransaction(
  sb: SupabaseClient,
  transactionId: string,
): Promise<void> {
  const userId = await requireUserId(sb);

  // 获取当前交易记录
  const { data: currentTx, error: fetchErr } = await sb
    .from("transactions")
    .select("amount, account_id, type, from_account_id, to_account_id")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (fetchErr) throw fetchErr;
  if (!currentTx) throw new Error("Transaction not found");

  const txType = currentTx.type as string;
  const txAmount = num(currentTx.amount);
  const txAccountId = currentTx.account_id as string;

  // 处理转账类型的余额回滚
  if (txType === "transfer") {
    const fromAccountId = currentTx.from_account_id as string;
    const toAccountId = currentTx.to_account_id as string;

    // 转账金额为正数存储，需要从 to 账户减去，from 账户加上
    // 回滚：from 账户减少（取走），to 账户增加（归还）
    // 但实际我们存的是 amount 正数，所以 from 账户要减去 amount，to 账户要减去 amount
    // 等效于：from 账户 balance -= amount, to 账户 balance -= amount

    // 获取 from 账户余额
    const { data: fromAccount, error: fromAccErr } = await sb
      .from("accounts")
      .select("balance")
      .eq("id", fromAccountId)
      .single();
    if (fromAccErr) throw fromAccErr;

    // 获取 to 账户余额
    const { data: toAccount, error: toAccErr } = await sb
      .from("accounts")
      .select("balance")
      .eq("id", toAccountId)
      .single();
    if (toAccErr) throw toAccErr;

    // 回滚 from 账户（转出账户）
    const { error: fromUpdErr } = await sb
      .from("accounts")
      .update({ balance: num(fromAccount?.balance) - txAmount })
      .eq("id", fromAccountId);
    if (fromUpdErr) throw fromUpdErr;

    // 回滚 to 账户（转入账户）
    const { error: toUpdErr } = await sb
      .from("accounts")
      .update({ balance: num(toAccount?.balance) - txAmount })
      .eq("id", toAccountId);
    if (toUpdErr) throw toUpdErr;
  } else {
    // 普通交易回滚
    const { data: account, error: accErr } = await sb
      .from("accounts")
      .select("balance")
      .eq("id", txAccountId)
      .single();
    if (accErr) throw accErr;

    const { error: updErr } = await sb
      .from("accounts")
      .update({ balance: num(account?.balance) - txAmount })
      .eq("id", txAccountId);
    if (updErr) throw updErr;
  }

  // 删除交易记录
  const { error: delErr } = await sb
    .from("transactions")
    .delete()
    .eq("id", transactionId);
  if (delErr) throw delErr;
}

/**
 * 创建转账记录
 * 从 fromAccount 转出 amount 到 toAccount
 * 转账不影响总资产
 */
export async function insertTransfer(
  sb: SupabaseClient,
  params: {
    fromAccountId: string;
    toAccountId: string;
    title: string;
    amount: number;
    currency: Currency;
    occurredOn: string;
    notes: string | null;
  },
): Promise<void> {
  // 验证 from 和 to 不能相同
  if (params.fromAccountId === params.toAccountId) {
    throw new Error("转出账户和转入账户不能相同");
  }

  if (params.amount <= 0) {
    throw new Error("转账金额必须大于零");
  }

  const userId = await requireUserId(sb);

  // 获取 from 账户当前余额
  const { data: fromAccount, error: fromAccErr } = await sb
    .from("accounts")
    .select("balance")
    .eq("id", params.fromAccountId)
    .single();
  if (fromAccErr) throw fromAccErr;

  // 获取 to 账户当前余额
  const { data: toAccount, error: toAccErr } = await sb
    .from("accounts")
    .select("balance")
    .eq("id", params.toAccountId)
    .single();
  if (toAccErr) throw toAccErr;

  // 更新 from 账户余额（减少）
  const { error: fromUpdErr } = await sb
    .from("accounts")
    .update({ balance: num(fromAccount?.balance) - params.amount })
    .eq("id", params.fromAccountId);
  if (fromUpdErr) throw fromUpdErr;

  // 更新 to 账户余额（增加）
  const { error: toUpdErr } = await sb
    .from("accounts")
    .update({ balance: num(toAccount?.balance) + params.amount })
    .eq("id", params.toAccountId);
  if (toUpdErr) throw toUpdErr;

  // 创建转账记录
  const row: Record<string, unknown> = {
    user_id: userId,
    type: "transfer",
    account_id: params.fromAccountId, // 主要账户关联
    from_account_id: params.fromAccountId,
    to_account_id: params.toAccountId,
    category_id: null, // 转账无分类
    category: "转账",
    title: params.title,
    amount: params.amount, // 正数
    currency: params.currency,
    occurred_on: params.occurredOn,
  };
  if (params.notes != null && params.notes.trim() !== "") {
    row.notes = params.notes.trim();
  }

  const { error: insErr } = await sb.from("transactions").insert(row);
  if (insErr) throw insErr;
}
