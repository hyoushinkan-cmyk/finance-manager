"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  fetchTransactions,
  type TransactionListItem,
} from "@/lib/ledger-data";
import { applyMonthlyRecurringRules } from "@/lib/recurring";

type TransactionsContextValue = {
  transactions: TransactionListItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  triggerRefresh: () => void;
};

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) {
    throw new Error("useTransactions must be used within a TransactionsProvider");
  }
  return ctx;
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const txs = await fetchTransactions(sb);
      setTransactions(txs);
    } catch (e) {
      console.error("Failed to fetch transactions:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 触发刷新的函数 - 当其他页面修改了数据时调用
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // 初始加载时：执行循环记账自动入账（只在首次挂载时执行一次）
  const recurringRan = useRef(false);
  useEffect(() => {
    if (recurringRan.current) return;
    recurringRan.current = true;
    if (!isSupabaseConfigured()) return;
    const sb = createBrowserSupabaseClient();
    if (!sb) return;

    void applyMonthlyRecurringRules(sb).then((applied) => {
      if (applied > 0) {
        console.log(`[recurring] 自动入账 ${applied} 条循环记录`);
        // 自动入账后刷新交易列表
        void refresh();
      }
    });
  }, [refresh]);

  // 初始加载 + 响应 refreshTrigger 变化
  useEffect(() => {
    void refresh();
  }, [refresh, refreshTrigger]);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        loading,
        refresh,
        triggerRefresh,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}