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

export type TransactionListItem = {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  currency: Currency;
  accountName: string;
  date: string;
  notes: string | null;
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
  const { data, error } = await sb
    .from("accounts")
    .select("id,name,type,currency,balance,principal,profit")
    .order("name", { ascending: true });

  if (error) throw error;
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
    .order("created_at", { ascending: true });

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
      category_id,
      amount,
      currency,
      occurred_on,
      notes,
      accounts ( name ),
      categories ( name )
    `,
    )
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  type Row = {
    id: string;
    title: string;
    category_id: string | null;
    amount: unknown;
    currency: string;
    occurred_on: string;
    notes: string | null;
    accounts:
      | { name: string }
      | { name: string }[]
      | null;
    categories:
      | { name: string }
      | { name: string }[]
      | null;
  };

  const rows = (data ?? []) as Row[];
  return rows.map((r) => {
    const acc = r.accounts;
    const accountName = Array.isArray(acc)
      ? (acc[0]?.name ?? "")
      : (acc?.name ?? "");

    const cat = r.categories;
    const categoryName = Array.isArray(cat)
      ? (cat[0]?.name ?? "")
      : (cat?.name ?? "");

    return {
      id: r.id,
      title: r.title,
      categoryId: r.category_id ?? "",
      categoryName,
      amount: num(r.amount),
      currency: r.currency as Currency,
      accountName,
      date: r.occurred_on.slice(0, 10),
      notes: r.notes ?? null,
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
    .lte("occurred_on", to);

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
    title: params.title,
    amount: params.amount,
    currency: params.currency,
    occurred_on: params.occurredOn,
  };
  if (params.notes != null && params.notes.trim() !== "") {
    row.notes = params.notes.trim();
  }

  const { error: insErr } = await sb.from("transactions").insert(row);
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
    .select("amount, account_id")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (fetchErr) throw fetchErr;
  if (!currentTx) throw new Error("Transaction not found");

  const txAmount = num(currentTx.amount);
  const txAccountId = currentTx.account_id as string;

  // 回滚账户余额
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

  // 删除交易记录
  const { error: delErr } = await sb
    .from("transactions")
    .delete()
    .eq("id", transactionId);
  if (delErr) throw delErr;
}
