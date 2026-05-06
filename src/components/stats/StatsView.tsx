"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  categoryExpenseJpyInMonth,
  fetchTransactionsForStats,
} from "@/lib/ledger-data";
import { useTransactions } from "@/contexts/TransactionsContext";
import { useCategories } from "@/contexts/CategoriesContext";
import { DrilldownModal } from "./DrilldownModal";
import { amountInJpy } from "@/lib/fx";
import type { Currency } from "@/lib/mock-data";

type TxAgg = {
  amount: number;
  currency: Currency;
  category: string;
  date: string;
};

type DateRange = {
  start: Date;
  end: Date;
  label: string;
};

type DateRangePreset = "this-month" | "last-month" | "two-months-ago" | "custom";

type DrilldownState = {
  open: boolean;
  categoryName: string;
  from: string;
  to: string;
  totalAmount: number;
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
  { key: "d1", label: "1月", expense: 118_000 },
  { key: "d2", label: "2月", expense: 132_000 },
  { key: "d3", label: "3月", expense: 125_400 },
];

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: "this-month", label: "本月" },
  { key: "last-month", label: "上月" },
  { key: "two-months-ago", label: "上上月" },
  { key: "custom", label: "自定义" },
];

/**
 * 使用 UTC 创建日期，避免本地时区偏移问题
 * new Date(year, month, day) 在 JST 时区会导致日期偏移
 */
function createUTCDate(year: number, month: number, day: number): Date {
  // month: 1-12, day: 1-31
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * 使用 UTC 获取某月最后一天
 * createUTCDate(year, month, 0) 行为错误（会回退到前一个月的-1天）
 */
function createUTCDateLastDayOfMonth(year: number, month: number): Date {
  // month: 1-12, 获取该月最后一天
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(Date.UTC(nextYear, nextMonth - 1, 0, 0, 0, 0, 0));
}

// 计算日期区间的快捷选项
function getPresetRange(preset: DateRangePreset): DateRange | null {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // UTC 月份 (1-12)
  const day = now.getUTCDate();

  switch (preset) {
    case "this-month":
      return {
        start: createUTCDate(year, month, 1),
        end: createUTCDate(year, month, day),
        label: "本月",
      };
    case "last-month": {
      const lastMonth = month === 1 ? 12 : month - 1;
      const lastMonthYear = month === 1 ? year - 1 : year;
      return {
        start: createUTCDate(lastMonthYear, lastMonth, 1),
        end: createUTCDateLastDayOfMonth(lastMonthYear, lastMonth),
        label: "上月",
      };
    }
    case "two-months-ago": {
      let twoMonthsAgoMonth = month - 2;
      let twoMonthsAgoYear = year;
      while (twoMonthsAgoMonth <= 0) {
        twoMonthsAgoMonth += 12;
        twoMonthsAgoYear -= 1;
      }
      // 结束日期是 twoMonthsAgoMonth 月的最后一天（不是上月）
      return {
        start: createUTCDate(twoMonthsAgoYear, twoMonthsAgoMonth, 1),
        end: createUTCDateLastDayOfMonth(twoMonthsAgoYear, twoMonthsAgoMonth),
        label: "上上月",
      };
    }
    default:
      return null;
  }
}

function toDateString(d: Date): string {
  // 使用 UTC 方法确保与 createUTCDate 创建的日期一致
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(month1to12: number, year?: number): string {
  // 显示 YY/MM 格式，如 25/05
  const shortYear = year ? String(year).slice(-2) : "";
  const m = String(month1to12).padStart(2, "0");
  return shortYear ? `${shortYear}/${m}` : m;
}

function buildCategoryTrend(
  items: TxAgg[],
  filterCategory: string,
): { key: string; label: string; expense: number }[] {
  const now = new Date();
  const nowUTCYear = now.getUTCFullYear();
  const nowUTCMonth = now.getUTCMonth() + 1; // 1-12
  const out: { key: string; label: string; expense: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    // 使用 UTC 计算月份
    let month = nowUTCMonth - i;
    let year = nowUTCYear;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }

    const categoryMap = categoryExpenseJpyInMonth(items, year, month);
    const expense = categoryMap.get(filterCategory) ?? 0;
    out.push({
      key: `${year}-${month}`,
      label: monthLabel(month, year),
      expense: Math.round(expense),
    });
  }
  return out;
}

function buildCategoryShare(
  items: TxAgg[],
  start: Date,
  end: Date,
): { name: string; pct: number; amount: number }[] {
  console.log("[DEBUG buildCategoryShare] items count:", items.length, "start:", start, "end:", end);
  
  const filtered = items.filter((t) => {
    const d = new Date(t.date);
    const inRange = d >= start && d <= end && t.amount < 0;
    if (!inRange && t.amount < 0) {
      console.log("[DEBUG buildCategoryShare] 过滤掉记录:", { date: t.date, amount: t.amount, category: t.category, d: d.toISOString(), startISO: start.toISOString(), endISO: end.toISOString() });
    }
    return inRange;
  });
  
  console.log("[DEBUG buildCategoryShare] filtered count:", filtered.length);

  const map = new Map<string, number>();
  for (const t of filtered) {
    const jpy = amountInJpy(Math.abs(t.amount), t.currency);
    const existing = map.get(t.category) ?? 0;
    map.set(t.category, existing + jpy);
  }

  console.log("[DEBUG buildCategoryShare] map entries:", [...map.entries()]);

  const total = [...map.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return [];

  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return entries.map(([name, amount]) => ({
    name,
    pct: Math.round((amount / total) * 100),
    amount: Math.round(amount),
  }));
}

function buildTotals(
  items: TxAgg[],
  start: Date,
  end: Date,
): { income: number; expense: number } {
  const filtered = items.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

  let income = 0;
  let expense = 0;
  for (const t of filtered) {
    const jpy = amountInJpy(Math.abs(t.amount), t.currency);
    if (t.amount < 0) {
      expense += jpy;
    } else {
      income += jpy;
    }
  }
  return { income: Math.round(income), expense: Math.round(expense) };
}

function isValidDateRange(start: Date, end: Date): boolean {
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
}

export function StatsView() {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>("this-month");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [categoryShare, setCategoryShare] = useState(DEMO_CATEGORY);
  const [categoryTrend, setCategoryTrend] = useState<{ key: string; label: string; expense: number }[]>([]);
  const [subtitle, setSubtitle] = useState("本月概览（演示数据）");
  const [monthIncome, setMonthIncome] = useState(DEMO_MONTH_INCOME);
  const [monthExpense, setMonthExpense] = useState(DEMO_MONTH_EXPENSE);

  // 下钻状态
  const [drilldown, setDrilldown] = useState<DrilldownState>({
    open: false,
    categoryName: "",
    from: "",
    to: "",
    totalAmount: 0,
  });

  // 订阅 Context 的刷新触发器
  const { refresh } = useTransactions();
  const { categories, loading: loadingCategories } = useCategories();

  // 支出分类选项
  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.type === "expense");
  }, [categories]);

  // 获取当前选中的日期区间
  const getCurrentRange = useCallback((): DateRange | null => {
    if (selectedPreset === "custom") {
      if (!customStart || !customEnd) return null;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      if (!isValidDateRange(start, end)) return null;
      return {
        start,
        end,
        label: "自定义",
      };
    }
    return getPresetRange(selectedPreset);
  }, [selectedPreset, customStart, customEnd]);

  // 加载区间统计数据（收支概览 + 分类占比）
  const loadRangeData = useCallback((range: DateRange) => {
    if (!isSupabaseConfigured()) {
      setSubtitle(`${range.label}概览（演示数据）`);
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setSubtitle(`${range.label}概览（演示数据）`);
      return;
    }

    const from = toDateString(range.start);
    const to = toDateString(range.end);

    console.log("[DEBUG loadRangeData] 查询区间:", { from, to, start: range.start.toISOString(), end: range.end.toISOString() });

    void (async () => {
      try {
        const rows = await fetchTransactionsForStats(sb, from, to);
        console.log("[DEBUG loadRangeData] 获取到记录数:", rows.length);
        
        const items = rows.map((r) => ({
          amount: r.amount,
          currency: r.currency,
          category: r.category,
          date: r.occurred_on,
        }));

        console.log("[DEBUG loadRangeData] items:", items.slice(0, 5));

        const totals = buildTotals(items, range.start, range.end);
        setMonthIncome(totals.income);
        setMonthExpense(totals.expense);
        const share = buildCategoryShare(items, range.start, range.end);
        console.log("[DEBUG loadRangeData] 分类占比结果:", share);
        setCategoryShare(share);
        setSubtitle(`${range.label}概览`);
      } catch (e) {
        console.error(e);
        setSubtitle(`${range.label}概览（加载失败）`);
      }
    })();
  }, []);

  // 加载分类趋势数据（始终12个月）
  const loadTrendData = useCallback((category: string) => {
    if (!isSupabaseConfigured()) {
      setCategoryTrend(DEMO_TREND);
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setCategoryTrend(DEMO_TREND);
      return;
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const from = toDateString(start);
    const to = toDateString(now);

    void (async () => {
      try {
        const rows = await fetchTransactionsForStats(sb, from, to);
        const items = rows.map((r) => ({
          amount: r.amount,
          currency: r.currency,
          category: r.category,
          date: r.occurred_on,
        }));

        setCategoryTrend(buildCategoryTrend(items, category));
      } catch (e) {
        console.error(e);
        setCategoryTrend([]);
      }
    })();
  }, []);

  // 监听区间选择变化
  useEffect(() => {
    const range = getCurrentRange();
    if (range) {
      loadRangeData(range);
    }
  }, [selectedPreset, customStart, customEnd, loadRangeData, getCurrentRange]);

  // 监听分类筛选变化，加载趋势数据
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  useEffect(() => {
    if (selectedCategory) {
      loadTrendData(selectedCategory);
    } else {
      setCategoryTrend([]);
    }
  }, [selectedCategory, loadTrendData, refresh]);

  // 处理区间选择
  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    if (preset === "custom") {
      // 设置默认的自定义日期范围为本月，使用 UTC
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      const day = now.getUTCDate();
      setCustomStart(toDateString(createUTCDate(year, month, 1)));
      setCustomEnd(toDateString(createUTCDate(year, month, day)));
    }
  };

  // 处理分类筛选变化
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  // 处理饼图/列表点击
  const handleCategoryClick = (categoryName: string, amount: number) => {
    const range = getCurrentRange();
    if (!range) return;
    setDrilldown({
      open: true,
      categoryName,
      from: toDateString(range.start),
      to: toDateString(range.end),
      totalAmount: amount,
    });
  };

  // 处理柱状图月份点击
  const handleTrendClick = (key: string, amount: number) => {
    if (!selectedCategory) return;
    const [year, month] = key.split("-").map(Number);
    // 使用 UTC 方法创建日期，避免时区偏移
    const startDate = createUTCDate(year, month, 1);
    const endDate = createUTCDateLastDayOfMonth(year, month);

    setDrilldown({
      open: true,
      categoryName: selectedCategory,
      from: toDateString(startDate),
      to: toDateString(endDate),
      totalAmount: amount,
    });
  };

  // 关闭下钻弹窗
  const handleDrilldownClose = () => {
    setDrilldown((prev) => ({ ...prev, open: false }));
  };

  const maxBar = Math.max(
    ...categoryTrend.map((t) => t.expense),
    1,
  );

  const hues = [
    "bg-emerald-500",
    "bg-sky-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">统计</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {subtitle}
        </p>
      </header>

      {/* 日期范围选择器 */}
      <section className="mb-6">
        {/* 快捷按钮 */}
        <div className="flex gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => handlePresetChange(preset.key)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                selectedPreset === preset.key
                  ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500"
                  : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-stone-400 dark:hover:bg-neutral-800"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* 自定义日期输入 */}
        {selectedPreset === "custom" && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
            <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              开始
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <span className="text-stone-400">—</span>
            <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              结束
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
          </div>
        )}
      </section>

      {/* 收支概览 */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            {getCurrentRange()?.label ?? "本月"}收入
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            ¥{monthIncome.toLocaleString("ja-JP")}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            {getCurrentRange()?.label ?? "本月"}支出
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
            ¥{monthExpense.toLocaleString("ja-JP")}
          </p>
        </div>
      </section>

      {/* 分类占比 */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-600 dark:text-stone-400">
          分类占比
        </h2>
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          {categoryShare.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">
              暂无支出分类数据
            </p>
          ) : (
            <>
              <div className="mb-4 flex h-8 w-full overflow-hidden rounded-lg">
                {categoryShare.map((c, i) => (
                  <div
                    key={`bar-${i}-${c.name}`}
                    className={`${hues[i % hues.length]} first:rounded-l-lg last:rounded-r-lg cursor-pointer transition-opacity hover:opacity-80`}
                    style={{ width: `${c.pct}%` }}
                    title={`${c.name} ${c.pct}%`}
                    onClick={() => handleCategoryClick(c.name, c.amount)}
                  />
                ))}
              </div>
              <ul className="space-y-2">
                {categoryShare.map((c, i) => (
                  <li
                    key={`row-${i}-${c.name}`}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-stone-50 dark:hover:bg-neutral-800"
                    onClick={() => handleCategoryClick(c.name, c.amount)}
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
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* 分类筛选 & 月度趋势 */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-600 dark:text-stone-400">
            月度趋势
          </h2>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={loadingCategories}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">选择分类查看趋势</option>
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          {!selectedCategory ? (
            <p className="py-8 text-center text-sm text-stone-400">
              请选择上方分类查看支出趋势
            </p>
          ) : categoryTrend.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">
              暂无数据
            </p>
          ) : (
            <>
              <div className="flex items-end justify-between gap-2 overflow-x-auto border-b border-stone-100 pb-2 dark:border-neutral-800">
                {categoryTrend.map((t) => (
                  <div
                    key={t.key}
                    className="flex flex-1 min-w-0 flex-col items-center gap-1"
                  >
                    <div className="flex h-28 w-full flex-col items-center justify-end">
                      <span className="mb-1 text-[10px] font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {t.expense > 0 ? `¥${(t.expense / 1000).toFixed(0)}k` : ""}
                      </span>
                      <div
                        className="w-3 cursor-pointer rounded-t bg-rose-500/90 transition-all hover:bg-rose-500"
                        style={{
                          height: `${Math.max((t.expense / maxBar) * 100, 2)}%`,
                        }}
                        onClick={() => handleTrendClick(t.key, t.expense)}
                      />
                    </div>
                    <span className="text-[10px] text-stone-500 whitespace-nowrap">{t.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-center gap-6 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-rose-500" />
                  {selectedCategory} 支出
                </span>
                <span className="text-stone-400">点击柱体查看明细</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 下钻明细弹窗 */}
      <DrilldownModal
        open={drilldown.open}
        categoryName={drilldown.categoryName}
        from={drilldown.from}
        to={drilldown.to}
        totalAmount={drilldown.totalAmount}
        onClose={handleDrilldownClose}
      />
    </>
  );
}
