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
  category: string;
  amount: number;
  currency: Currency;
  accountName: string;
  date: string;
};

export type BudgetRow = {
  category: string;
  limit: number;
  currency: Currency;
};

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return 0;
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
  const { error } = await sb.from("accounts").insert({
    name: params.name.trim(),
    type: params.type,
    currency: params.currency,
    balance: params.balance,
    principal: params.type === "investment" ? params.principal : null,
    profit: params.type === "investment" ? params.profit : null,
  });
  if (error) throw error;
}

export async function fetchBudgets(sb: SupabaseClient): Promise<BudgetRow[]> {
  const { data, error } = await sb
    .from("budgets")
    .select("category,limit_amount,currency")
    .order("category", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    category: r.category as string,
    limit: num(r.limit_amount),
    currency: r.currency as Currency,
  }));
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
      category,
      amount,
      currency,
      occurred_on,
      accounts ( name )
    `,
    )
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  type Row = {
    id: string;
    title: string;
    category: string;
    amount: unknown;
    currency: string;
    occurred_on: string;
    accounts:
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

    return {
      id: r.id,
      title: r.title,
      category: r.category,
      amount: num(r.amount),
      currency: r.currency as Currency,
      accountName,
      date: r.occurred_on.slice(0, 10),
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
    .select("amount,currency,category,occurred_on")
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  if (error) throw error;

  return (data ?? []).map((r) => ({
    amount: num(r.amount),
    currency: r.currency as Currency,
    category: r.category as string,
    occurred_on: (r.occurred_on as string).slice(0, 10),
  }));
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
    category: string;
    title: string;
    amount: number;
    currency: Currency;
    occurredOn: string;
  },
): Promise<void> {
  const { data: account, error: accErr } = await sb
    .from("accounts")
    .select("balance")
    .eq("id", params.accountId)
    .single();

  if (accErr) throw accErr;

  const currentBalance = num(account?.balance);
  const nextBalance = currentBalance + params.amount;

  const { error: insErr } = await sb.from("transactions").insert({
    account_id: params.accountId,
    category: params.category,
    title: params.title,
    amount: params.amount,
    currency: params.currency,
    occurred_on: params.occurredOn,
  });
  if (insErr) throw insErr;

  const { error: updErr } = await sb
    .from("accounts")
    .update({ balance: nextBalance })
    .eq("id", params.accountId);
  if (updErr) throw updErr;
}
