"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { mockAccounts, mockTransactions } from "@/lib/mock-data";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  fetchAccounts,
  fetchTransactions,
  spendJpyOnDate,
  spendJpyInMonth,
  deleteTransaction,
  type AccountRow,
  type TransactionListItem,
} from "@/lib/ledger-data";
import { TransactionModal } from "./TransactionModal";
import { useTransactions } from "@/contexts/TransactionsContext";
import { useCategories } from "@/contexts/CategoriesContext";

function formatMoney(amount: number, currency: string) {
  const sign = amount < 0 ? "-" : "+";
  const n = Math.abs(amount);
  const formatted =
    currency === "JPY"
      ? n.toLocaleString("ja-JP")
      : n.toLocaleString("zh-CN");
  return `${sign}${formatted} ${currency}`;
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function LedgerHome() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionListItem | null>(null);
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 搜索相关状态
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchAccount, setSearchAccount] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchAmountMin, setSearchAmountMin] = useState("");
  const [searchAmountMax, setSearchAmountMax] = useState("");
  const [searchResult, setSearchResult] = useState<TransactionListItem[] | null>(null);

  // 使用 Context 通知其他页面刷新
  const { triggerRefresh } = useTransactions();
  const { categories } = useCategories();

  const refresh = useCallback(async () => {
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setTransactions(
        mockTransactions.map((t) => ({
          id: t.id,
          title: t.title,
          type: t.amount < 0 ? "expense" as const : "income" as const,
          categoryId: "",
          categoryName: t.category,
          amount: t.amount,
          currency: t.currency,
          accountName: t.accountName,
          accountId: "",
          date: t.date,
          notes: null,
        })),
      );
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
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [t, a] = await Promise.all([
        fetchTransactions(sb),
        fetchAccounts(sb),
      ]);
      setTransactions(t);
      setAccounts(a);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const todayStr = toYmdLocal(now);

  const txForAgg = transactions.map((t) => ({
    amount: t.amount,
    currency: t.currency,
    date: t.date,
  }));

  const todaySpend = spendJpyOnDate(txForAgg, todayStr);
  const monthSpend = spendJpyInMonth(txForAgg, y, m);

  const handleEdit = (transaction: TransactionListItem) => {
    setEditingTransaction(transaction);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const handleDelete = async (transaction: TransactionListItem) => {
    if (!window.confirm(`确定要删除「${transaction.title}」这条记录吗？`)) {
      return;
    }

    if (!isSupabaseConfigured()) {
      // Mock 模式下只刷新列表
      void refresh();
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) {
      void refresh();
      return;
    }

    setDeletingId(transaction.id);
    try {
      await deleteTransaction(sb, transaction.id);
      void refresh();
      triggerRefresh(); // 通知统计页面刷新
    } catch (err) {
      console.error("删除失败:", err);
      alert("删除失败，请稍后重试");
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingTransaction(null);
  };

  // 搜索处理函数
  const handleSearch = () => {
    const filtered = transactions.filter((t) => {
      // 关键字搜索（标题 + 备注）
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(keyword);
        const notesMatch = t.notes ? t.notes.toLowerCase().includes(keyword) : false;
        if (!titleMatch && !notesMatch) {
          return false;
        }
      }
      // 分类搜索
      if (searchCategory && t.categoryName !== searchCategory) {
        return false;
      }
      // 账户搜索
      if (searchAccount && t.accountName !== searchAccount) {
        return false;
      }
      // 日期范围搜索
      if (searchDateFrom && t.date < searchDateFrom) {
        return false;
      }
      if (searchDateTo && t.date > searchDateTo) {
        return false;
      }
      // 金额范围搜索
      if (searchAmountMin) {
        const min = parseFloat(searchAmountMin);
        if (!isNaN(min) && Math.abs(t.amount) < min) {
          return false;
        }
      }
      if (searchAmountMax) {
        const max = parseFloat(searchAmountMax);
        if (!isNaN(max) && Math.abs(t.amount) > max) {
          return false;
        }
      }
      return true;
    });
    setSearchResult(filtered);
  };

  // 清空搜索
  const handleClearSearch = () => {
    setSearchKeyword("");
    setSearchCategory("");
    setSearchAccount("");
    setSearchDateFrom("");
    setSearchDateTo("");
    setSearchAmountMin("");
    setSearchAmountMax("");
    setSearchResult(null);
    setSearchOpen(false);
  };

  // 判断是否有搜索条件
  const hasSearchCriteria = searchKeyword || searchCategory || searchAccount || searchDateFrom || searchDateTo || searchAmountMin || searchAmountMax;

  // 用于显示的交易列表（搜索结果或全部）
  const displayTransactions = searchResult !== null ? searchResult : transactions;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">记账</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          快速记录收支
        </p>
      </header>

      {!loading && isSupabaseConfigured() && accounts.length === 0 ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          暂无账户，请先在底部进入「资产」添加账户，再回来记账。
        </p>
      ) : null}

      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            今日支出
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
            ¥{todaySpend.toLocaleString("ja-JP")}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-400">JPY</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            本月支出
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
            ¥{monthSpend.toLocaleString("ja-JP")}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-400">JPY</p>
        </div>
      </section>

      {/* 搜索按钮 */}
      <button
        type="button"
        onClick={() => setSearchOpen(!searchOpen)}
        className={`mb-4 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition flex items-center justify-center gap-2 ${
          searchOpen || hasSearchCriteria
            ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
            : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-stone-400 dark:hover:bg-neutral-800"
        }`}
      >
        <Search className="h-4 w-4" />
        {searchOpen ? "收起搜索" : "搜索记录"}
      </button>

      {/* 搜索表单 */}
      {searchOpen && (
        <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid gap-3">
            {/* 关键字搜索（标题 + 备注） */}
            <div>
              <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">关键字</label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索标题或备注"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-200"
              />
            </div>

            {/* 分类和账户搜索 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">分类</label>
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-200"
                >
                  <option value="">全部分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">账户</label>
                <select
                  value={searchAccount}
                  onChange={(e) => setSearchAccount(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-200"
                >
                  <option value="">全部账户</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.name}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 日期范围搜索 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">开始日期</label>
                <input
                  type="date"
                  value={searchDateFrom}
                  onChange={(e) => setSearchDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">结束日期</label>
                <input
                  type="date"
                  value={searchDateTo}
                  onChange={(e) => setSearchDateTo(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-200"
                />
              </div>
            </div>

            {/* 金额范围搜索 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">最小金额</label>
                <input
                  type="number"
                  value={searchAmountMin}
                  onChange={(e) => setSearchAmountMin(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">最大金额</label>
                <input
                  type="number"
                  value={searchAmountMax}
                  onChange={(e) => setSearchAmountMax(e.target.value)}
                  placeholder="无限"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-200"
                />
              </div>
            </div>
          </div>

          {/* 搜索按钮组 */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              搜索
            </button>
            <button
              type="button"
              onClick={handleClearSearch}
              className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-neutral-700 dark:text-stone-400 dark:hover:bg-neutral-800"
            >
              清空
            </button>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-600 dark:text-stone-400">
          {searchResult !== null ? `搜索结果 (${searchResult.length})` : "最近记录"}
        </h2>
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {loading ? (
            <li className="px-4 py-6 text-center text-sm text-stone-500">
              加载中…
            </li>
          ) : displayTransactions.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-stone-500">
              {searchResult !== null ? "找不到该记录" : "暂无记录"}
            </li>
          ) : (
            displayTransactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                    {t.categoryName} · {t.accountName} · {t.date}
                  </p>
                  {t.notes ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-stone-400 dark:text-stone-500">
                      {t.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      t.amount < 0
                        ? "text-stone-800 dark:text-stone-200"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {formatMoney(t.amount, t.currency)}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(t)}
                      className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-neutral-800 dark:hover:text-stone-300"
                      aria-label="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      disabled={deletingId === t.id}
                      className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 disabled:opacity-50"
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <button
        type="button"
        onClick={handleNew}
        className="pb-safe fixed bottom-28 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-95 dark:bg-emerald-500 dark:hover:bg-emerald-600 sm:right-[max(1rem,calc(50%-16rem))]"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        记一笔
      </button>

      <TransactionModal
        open={modalOpen}
        accounts={accounts}
        transaction={editingTransaction}
        onClose={handleModalClose}
        onSaved={() => {
          void refresh();
          triggerRefresh(); // 通知统计页面刷新
        }}
      />
    </>
  );
}
