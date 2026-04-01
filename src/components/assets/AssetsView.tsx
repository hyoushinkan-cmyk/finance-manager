"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { mockAccounts, mockBudgets, type Currency } from "@/lib/mock-data";
import { getJpyPerCny } from "@/lib/fx";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  categoryExpenseJpyInMonth,
  deleteAccount,
  fetchAccounts,
  fetchBudgets,
  fetchTransactionsForStats,
  type AccountRow,
} from "@/lib/ledger-data";
import { AddAccountModal } from "./AddAccountModal";

function convertToDisplay(
  amount: number,
  from: Currency,
  display: Currency,
  jpyPerCny: number,
): number {
  if (from === display) return amount;
  if (from === "JPY" && display === "CNY") return amount / jpyPerCny;
  return amount * jpyPerCny;
}

function formatDisplay(n: number, c: Currency) {
  if (c === "JPY") return `¥${Math.round(n).toLocaleString("ja-JP")}`;
  return `¥${n.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

function monthRangeYmd(): { y: number; m: number; from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { y, m, from, to };
}

export function AssetsView() {
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("JPY");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<
    { id: string; category: string; limit: number; currency: Currency }[]
  >([]);
  const [spentByCategoryJpy, setSpentByCategoryJpy] = useState<
    Map<string, number>
  >(new Map());
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [jpyPerCny, setJpyPerCny] = useState(getJpyPerCny);

  const supabaseLive = isSupabaseConfigured();

  useEffect(() => {
    const onFx = () => setJpyPerCny(getJpyPerCny());
    window.addEventListener("finance-fx-changed", onFx);
    return () => window.removeEventListener("finance-fx-changed", onFx);
  }, []);

  const refresh = useCallback(async () => {
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setAccounts(
        mockAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          currency: a.currency,
          balance: a.balance,
          principal: a.principal ?? null,
          profit: a.profit ?? null,
        })),
      );
      setBudgetLimits(
        mockBudgets.map((b, i) => ({
          id: `mock-budget-${i}`,
          category: b.category,
          limit: b.limit,
          currency: b.currency,
        })),
      );
      const map = new Map<string, number>();
      for (const b of mockBudgets) {
        map.set(b.category, b.spent);
      }
      setSpentByCategoryJpy(map);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { y, m, from, to } = monthRangeYmd();
      const [accs, buds, txRows] = await Promise.all([
        fetchAccounts(sb),
        fetchBudgets(sb),
        fetchTransactionsForStats(sb, from, to),
      ]);
      setAccounts(accs);
      setBudgetLimits(buds);
      const items = txRows.map((r) => ({
        amount: r.amount,
        currency: r.currency,
        category: r.category,
        date: r.occurred_on,
      }));
      setSpentByCategoryJpy(categoryExpenseJpyInMonth(items, y, m));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const total = useMemo(() => {
    return accounts.reduce((sum, a) => {
      return (
        sum + convertToDisplay(a.balance, a.currency, displayCurrency, jpyPerCny)
      );
    }, 0);
  }, [accounts, displayCurrency, jpyPerCny]);

  const budgetRows = budgetLimits.map((b) => {
    const spentJpy = spentByCategoryJpy.get(b.category) ?? 0;
    return {
      id: b.id,
      category: b.category,
      spent: spentJpy,
      limit: b.limit,
      currency: b.currency,
    };
  });

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">资产</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          总资产与预算
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-stone-200 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-neutral-800 dark:from-emerald-950/40 dark:to-neutral-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
              总资产
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
              {loading ? "…" : formatDisplay(total, displayCurrency)}
            </p>
          </div>
          <div className="flex rounded-xl border border-stone-200/80 bg-white/80 p-0.5 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-950/80">
            {(["JPY", "CNY"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDisplayCurrency(c)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  displayCurrency === c
                    ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500"
                    : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-neutral-800"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-stone-400">
          当前汇率为 1 CNY = {jpyPerCny} JPY（可在「设置 → 汇率设置」中修改）
        </p>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-600 dark:text-stone-400">
            账户
          </h2>
          {supabaseLive ? (
            <button
              type="button"
              onClick={() => {
                setEditingAccount(null);
                setAddModalOpen(true);
              }}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              添加账户
            </button>
          ) : null}
        </div>
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {loading ? (
            <li className="px-4 py-6 text-center text-sm text-stone-500">
              加载中…
            </li>
          ) : accounts.length === 0 && supabaseLive ? (
            <li className="px-4 py-8 text-center">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                还没有账户，请先添加（例如现金、银行卡），之后才能在「记账」里记一笔。
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingAccount(null);
                  setAddModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                添加第一个账户
              </button>
            </li>
          ) : (
            accounts.map((a) => (
              <li key={a.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {a.type === "investment" ? "投资" : "现金"} · {a.currency}
                    </p>
                    {a.type === "investment" &&
                      a.principal != null &&
                      a.profit != null && (
                        <p className="mt-1 text-[11px] text-stone-400">
                          本金 {a.principal.toLocaleString("ja-JP")} · 收益{" "}
                          {a.profit.toLocaleString("ja-JP")}
                        </p>
                      )}
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <p className="text-sm font-semibold tabular-nums">
                      {a.currency === "JPY"
                        ? `¥${a.balance.toLocaleString("ja-JP")}`
                        : `¥${a.balance.toLocaleString("zh-CN")}`}
                    </p>
                    {supabaseLive ? (
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccount(a);
                            setAddModalOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-neutral-800 dark:hover:text-stone-200"
                          aria-label="编辑账户"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `确定删除账户「${a.name}」？若该账户下仍有记账记录，删除会失败。`,
                              )
                            ) {
                              return;
                            }
                            const sb = createBrowserSupabaseClient();
                            if (!sb) return;
                            try {
                              await deleteAccount(sb, a.id);
                              void refresh();
                            } catch (e) {
                              console.error(e);
                              window.alert(
                                "删除失败：该账户可能仍有记账记录，请先调整或删除相关流水后再试。",
                              );
                            }
                          }}
                          className="rounded-lg p-1.5 text-stone-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                          aria-label="删除账户"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <AddAccountModal
        open={addModalOpen}
        editingAccount={editingAccount}
        onClose={() => {
          setAddModalOpen(false);
          setEditingAccount(null);
        }}
        onSaved={() => void refresh()}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-600 dark:text-stone-400">
          预算进度
        </h2>
        <ul className="space-y-4">
          {loading ? (
            <li className="text-sm text-stone-500">加载中…</li>
          ) : (
            budgetRows.map((b) => {
              const pct = Math.min(
                100,
                Math.round((b.spent / b.limit) * 100) || 0,
              );
              const over = b.spent > b.limit;
              return (
                <li key={b.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{b.category}</span>
                    <span
                      className={`tabular-nums ${over ? "text-rose-600 dark:text-rose-400" : "text-stone-600 dark:text-stone-300"}`}
                    >
                      {b.spent.toLocaleString("ja-JP")} /{" "}
                      {b.limit.toLocaleString("ja-JP")} {b.currency}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-neutral-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        over
                          ? "bg-rose-500"
                          : "bg-emerald-500 dark:bg-emerald-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </>
  );
}
