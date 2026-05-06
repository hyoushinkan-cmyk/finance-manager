"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  fetchTransactionsForDrilldown,
  type DrilldownTransaction,
} from "@/lib/ledger-data";

type Props = {
  open: boolean;
  categoryName: string;
  from: string;
  to: string;
  totalAmount: number;
  onClose: () => void;
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${parseInt(year)}年${parseInt(month)}月${parseInt(day)}日`;
}

export function DrilldownModal({
  open,
  categoryName,
  from,
  to,
  totalAmount,
  onClose,
}: Props) {
  const [transactions, setTransactions] = useState<DrilldownTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 计算实际总计
  const actualTotal = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // 加载数据
  useEffect(() => {
    if (!open) return;

    if (!isSupabaseConfigured()) {
      setTransactions([]);
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const data = await fetchTransactionsForDrilldown(sb, categoryName, from, to);
        setTransactions(data);
      } catch (e) {
        console.error("Failed to fetch drilldown data:", e);
        setError("加载明细失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, categoryName, from, to]);

  // 锁定背景滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* 遮罩 */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="关闭"
        onClick={onClose}
      />
      
      {/* 抽屉内容 */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-stone-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:rounded-2xl"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {categoryName} 明细
            </h2>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              {from === to ? formatDate(from) : `${formatDate(from)} - ${formatDate(to)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-neutral-800 dark:hover:text-stone-200"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 金额汇总 */}
        <div className="border-b border-stone-100 bg-stone-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600 dark:text-stone-400">
              合计
            </span>
            <span className="text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              ¥{actualTotal.toLocaleString("ja-JP")}
            </span>
          </div>
          {Math.abs(actualTotal - Math.abs(totalAmount)) > 1 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              注意：实际明细总额与图表数据存在差异（图表：¥{Math.abs(totalAmount).toLocaleString("ja-JP")}）
            </p>
          )}
        </div>

        {/* 交易列表 */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(85dvh - 180px)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <span className="ml-2 text-sm text-stone-500">加载中…</span>
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-stone-500">暂无交易记录</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 px-4 dark:divide-neutral-800">
              {transactions.map((tx) => (
                <li key={tx.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                        {tx.title || categoryName}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-400">
                        {formatDate(tx.occurred_on)}
                        {tx.account_name && ` · ${tx.account_name}`}
                      </p>
                      {tx.notes && (
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                          {tx.notes}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        tx.amount >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {tx.amount >= 0 ? "+" : "¥"}
                      {Math.abs(tx.amount).toLocaleString("ja-JP")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="border-t border-stone-100 px-4 py-3 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-stone-100 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-200 dark:bg-neutral-800 dark:text-stone-300 dark:hover:bg-neutral-700"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
