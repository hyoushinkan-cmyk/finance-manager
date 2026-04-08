"use client";

import { useEffect, useState } from "react";
import type { Currency } from "@/lib/mock-data";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  categoryExpenseJpyInMonth,
  fetchTransactionsForStats,
  monthTotalsJpy,
} from "@/lib/ledger-data";

type TxAgg = {
  amount: number;
  currency: Currency;
  category: string;
  date: string;
};

const DEMO_MONTH_INCOME = 380_000;
const DEMO_MONTH_EXPENSE = 125_400;

const DEMO_CATEGORY = [
  { name: "餐饮", pct: 32, amount: 40_128 },
  { name: "居住", pct: 28, amount: 35_112 },
  { name: "交通", pct: 18, amount: 22_572 },
  { name: "购物", pct: 12, amount: 15_048 },
  { name: "其他", pct: 10, amount: 12_540 },
];

const DEMO_TREND = [
  { key: "d1", label: "1月", income: 320_000, expense: 118_000 },
  { key: "d2", label: "2月", income: 350_000, expense: 132_000 },
  { key: "d3", label: "3月", income: 380_000, expense: 125_400 },
];

function monthLabel(month1to12: number): string {
  return `${month1to12}月`;
}

function buildTrend(
  now: Date,
  monthsBack: number,
  items: TxAgg[],
): { key: string; label: string; income: number; expense: number }[] {
  const out: {
    key: string;
    label: string;
    income: number;
    expense: number;
  }[] = [];
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const t = monthTotalsJpy(items, y, m);
    out.push({
      key: `${y}-${m}`,
      label: monthLabel(m),
      income: t.income,
      expense: t.expense,
    });
  }
  return out;
}

function buildCategoryShare(
  items: TxAgg[],
  year: number,
  month: number,
): { name: string; pct: number; amount: number }[] {
  const map = categoryExpenseJpyInMonth(items, year, month);
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 4);
  const rest = entries.slice(4).reduce((s, [, v]) => s + v, 0);
  const rows = top.map(([name, amount]) => ({
    name,
    pct: Math.round((amount / total) * 100),
    amount: Math.round(amount),
  }));
  if (rest > 0) {
    rows.push({
      name: "其他",
      pct: Math.round((rest / total) * 100),
      amount: Math.round(rest),
    });
  }
  return rows;
}

export function StatsView() {
  const [monthIncome, setMonthIncome] = useState(DEMO_MONTH_INCOME);
  const [monthExpense, setMonthExpense] = useState(DEMO_MONTH_EXPENSE);
  const [categoryShare, setCategoryShare] = useState(DEMO_CATEGORY);
  const [trend, setTrend] = useState(DEMO_TREND);
  const [subtitle, setSubtitle] = useState("本月概览（演示数据）");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSubtitle("本月概览（演示数据）");
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setSubtitle("本月概览（演示数据）");
      return;
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

    void (async () => {
      try {
        const rows = await fetchTransactionsForStats(sb, from, to);
        const items = rows.map((r) => ({
          amount: r.amount,
          currency: r.currency,
          category: r.category,
          date: r.occurred_on,
        }));
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const totals = monthTotalsJpy(items, y, m);
        setMonthIncome(Math.round(totals.income));
        setMonthExpense(Math.round(totals.expense));
        setCategoryShare(buildCategoryShare(items, y, m));
        setTrend(buildTrend(now, 2, items));
        setSubtitle("本月概览");
      } catch (e) {
        console.error(e);
        setSubtitle("本月概览（加载失败）");
      }
    })();
  }, []);

  const maxBar = Math.max(
    ...trend.map((t) => Math.max(t.income, t.expense)),
    1,
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">统计</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {subtitle}
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            本月收入
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            ¥{monthIncome.toLocaleString("ja-JP")}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            本月支出
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
            ¥{monthExpense.toLocaleString("ja-JP")}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-600 dark:text-stone-400">
          分类占比
        </h2>
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          {categoryShare.length === 0 ? (
            <p className="text-sm text-stone-500">暂无支出分类数据</p>
          ) : (
            <>
              <div className="mb-4 flex h-8 w-full overflow-hidden rounded-lg">
                {categoryShare.map((c, i) => {
                  const hues = [
                    "bg-emerald-500",
                    "bg-sky-500",
                    "bg-amber-500",
                    "bg-violet-500",
                    "bg-stone-400",
                  ];
                  return (
                    <div
                      key={`bar-${i}-${c.name}`}
                      className={`${hues[i % hues.length]} first:rounded-l-lg last:rounded-r-lg`}
                      style={{ width: `${c.pct}%` }}
                      title={`${c.name} ${c.pct}%`}
                    />
                  );
                })}
              </div>
              <ul className="space-y-2">
                {categoryShare.map((c, i) => {
                  const hues = [
                    "bg-emerald-500",
                    "bg-sky-500",
                    "bg-amber-500",
                    "bg-violet-500",
                    "bg-stone-400",
                  ];
                  return (
                    <li
                      key={`row-${i}-${c.name}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${hues[i % hues.length]}`}
                        />
                        {c.name}
                      </span>
                      <span className="tabular-nums text-stone-600 dark:text-stone-300">
                        {c.pct}% · ¥{c.amount.toLocaleString("ja-JP")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-600 dark:text-stone-400">
          趋势
        </h2>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex h-40 items-end justify-between gap-3 border-b border-stone-100 pb-2 dark:border-neutral-800">
            {trend.map((t) => (
              <div
                key={t.key}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-32 w-full items-end justify-center gap-1">
                  <div
                    className="w-3 rounded-t bg-emerald-500/90"
                    style={{
                      height: `${(t.income / maxBar) * 100}%`,
                      minHeight: "4px",
                    }}
                    title={`收入 ${t.income}`}
                  />
                  <div
                    className="w-3 rounded-t bg-rose-500/90"
                    style={{
                      height: `${(t.expense / maxBar) * 100}%`,
                      minHeight: "4px",
                    }}
                    title={`支出 ${t.expense}`}
                  />
                </div>
                <span className="text-[11px] text-stone-500">{t.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-6 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" /> 收入
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-rose-500" /> 支出
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
