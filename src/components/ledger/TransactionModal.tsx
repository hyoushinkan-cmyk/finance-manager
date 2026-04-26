"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { mockCategories, mockIncomeCategories } from "@/lib/mock-data";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  insertTransactionAndUpdateBalance,
  insertTransfer,
  updateTransaction,
} from "@/lib/ledger-data";
import type { AccountRow, TransactionListItem, TransactionType } from "@/lib/ledger-data";
import { useCategories } from "@/contexts/CategoriesContext";

type Props = {
  open: boolean;
  accounts: AccountRow[];
  transaction?: TransactionListItem | null; // 编辑模式时传入
  onClose: () => void;
  onSaved: () => void;
};

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TransactionModal({
  open,
  accounts,
  transaction,
  onClose,
  onSaved,
}: Props) {
  const isEditMode = !!transaction;
  const titleId = useId();
  const [flowKind, setFlowKind] = useState<TransactionType>("expense");
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  // 转账专用字段
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => toYmdLocal(new Date()));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 使用 Context 获取分类数据
  const { categories, loading: loadingCategories } = useCategories();

  // 当弹窗打开或交易数据变化时，初始化表单
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (transaction) {
      // 编辑模式：填充现有数据
      const isExpense = transaction.amount < 0;
      setFlowKind(isExpense ? "expense" : "income");
      setAmountStr(Math.abs(transaction.amount).toString());
      setCategoryId(transaction.categoryId ?? "");
      setOccurredOn(transaction.date);
      setNotes(transaction.notes ?? "");
      // 需要找到对应的账户ID
      const matchingAccount = accounts.find(
        (a) => a.name === transaction.accountName && a.currency === transaction.currency
      );
      setAccountId(matchingAccount?.id ?? accounts[0]?.id ?? "");
    } else {
      // 新建模式
      setFlowKind("expense");
      setAmountStr("");
      setCategoryId("");
      setAccountId(accounts[0]?.id ?? "");
      setFromAccountId(accounts[0]?.id ?? "");
      setToAccountId(accounts.length > 1 ? accounts[1]?.id ?? "" : accounts[0]?.id ?? "");
      setOccurredOn(toYmdLocal(new Date()));
      setNotes("");
    }
    setError(null);
  }, [open, transaction, accounts]);

  // 当flowKind变化时，重置分类选择
  useEffect(() => {
    if (!isEditMode && categories.length > 0) {
      const filteredCats = categories.filter((c) => c.type === flowKind);
      if (filteredCats.length > 0 && !filteredCats.find((c) => c.id === categoryId)) {
        setCategoryId(filteredCats[0]!.id);
      }
    }
  }, [flowKind, categories, categoryId, isEditMode]);

  // 根据flowKind过滤分类选项
  const categoryOptions = useMemo(() => {
    if (isSupabaseConfigured()) {
      return categories.filter((c) => c.type === flowKind);
    }
    // Mock数据模式
    return (flowKind === "expense" ? mockCategories : mockIncomeCategories).map((name, i) => ({
      id: `mock-${flowKind}-${i}`,
      name,
      type: flowKind,
      sort_order: i,
    }));
  }, [flowKind, categories]);

  // 获取当前选中的分类名称
  const selectedCategoryName = useMemo(() => {
    if (isSupabaseConfigured()) {
      return categoryOptions.find((c) => c.id === categoryId)?.name ?? "";
    }
    return categoryId;
  }, [categoryId, categoryOptions]);

  if (!open) return null;

  const selectedAccount = accounts.find((a) => a.id === accountId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="关闭"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-stone-200 bg-white p-4 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {isEditMode ? "编辑记录" : "记一笔"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-neutral-800 dark:hover:text-stone-200"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSupabaseConfigured() && accounts.length === 0 ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              还没有账户。请先到「资产」页添加账户，再回来记账。
            </p>
            <Link
              href="/assets"
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              去资产页添加账户
            </Link>
          </div>
        ) : loadingCategories ? (
          <div className="py-8 text-center text-stone-500">加载分类中…</div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              const raw = Number(amountStr);
              if (!Number.isFinite(raw) || raw <= 0) {
                setError("请输入大于零的金额");
                return;
              }

              if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
                setError("日期格式无效");
                return;
              }

              const notesTrim = notes.trim();

              if (!isSupabaseConfigured()) {
                onClose();
                return;
              }

              const sb = createBrowserSupabaseClient();
              if (!sb) {
                onClose();
                return;
              }

              setSaving(true);
              try {
                if (flowKind === "transfer") {
                  // 转账模式
                  if (!fromAccountId) {
                    setError("请选择转出账户");
                    return;
                  }
                  if (!toAccountId) {
                    setError("请选择转入账户");
                    return;
                  }
                  if (fromAccountId === toAccountId) {
                    setError("转出账户和转入账户不能相同");
                    return;
                  }

                  const fromAccount = accounts.find((a) => a.id === fromAccountId);
                  if (!fromAccount) {
                    setError("请选择有效的转出账户");
                    return;
                  }

                  await insertTransfer(sb, {
                    fromAccountId,
                    toAccountId,
                    title: "账户转账",
                    amount: raw,
                    currency: fromAccount.currency,
                    occurredOn,
                    notes: notesTrim === "" ? null : notesTrim,
                  });
                } else {
                  // 支出/收入模式
                  if (!selectedAccount) {
                    setError("请选择账户");
                    return;
                  }
                  if (!categoryId) {
                    setError("请选择分类");
                    return;
                  }

                  const storedAmount =
                    flowKind === "expense" ? -Math.abs(raw) : Math.abs(raw);
                  const currencySave = selectedAccount.currency;

                  if (isEditMode && transaction) {
                    await updateTransaction(sb, transaction.id, {
                      accountId: selectedAccount.id,
                      categoryId,
                      categoryName: selectedCategoryName,
                      title: selectedCategoryName,
                      amount: storedAmount,
                      currency: currencySave,
                      occurredOn,
                      notes: notesTrim === "" ? null : notesTrim,
                    });
                  } else {
                    await insertTransactionAndUpdateBalance(sb, {
                      accountId: selectedAccount.id,
                      categoryId,
                      categoryName: selectedCategoryName,
                      title: selectedCategoryName,
                      amount: storedAmount,
                      currency: currencySave,
                      occurredOn,
                      notes: notesTrim === "" ? null : notesTrim,
                    });
                  }
                }
                onSaved();
                onClose();
              } catch (err) {
                console.error(err);
                setError(isEditMode ? "更新失败，请检查网络与 Supabase 配置" : "保存失败，请检查网络与 Supabase 配置");
              } finally {
                setSaving(false);
              }
            }}
          >
            {/* 类型选择 */}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                类型
              </span>
              <div className="flex rounded-xl border border-stone-200 p-0.5 dark:border-neutral-700">
                {(
                  [
                    { key: "expense" as TransactionType, label: "支出" },
                    { key: "income" as TransactionType, label: "收入" },
                    { key: "transfer" as TransactionType, label: "转账" },
                  ] as { key: TransactionType; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFlowKind(key)}
                    disabled={isEditMode}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                      flowKind === key
                        ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500"
                        : "text-stone-600 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-neutral-800"
                    } ${isEditMode ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 金额输入 */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                金额
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-2xl font-semibold tabular-nums outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
                autoFocus
              />
            </label>

            {/* 日期 */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                日期
              </span>
              <input
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>

            {/* 转账专用表单 */}
            {flowKind === "transfer" ? (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                    从账户转出
                  </span>
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
                  >
                    <option value="">选择转出账户…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}（{a.currency}）
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center justify-center py-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 dark:bg-neutral-800">
                    <ArrowRight className="h-4 w-4 text-stone-500" />
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                    转入账户
                  </span>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
                  >
                    <option value="">选择转入账户…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}（{a.currency}）
                      </option>
                    ))}
                  </select>
                </label>

                {fromAccountId && toAccountId && fromAccountId === toAccountId ? (
                  <p className="text-sm text-rose-600 dark:text-rose-400">
                    转出账户和转入账户不能相同
                  </p>
                ) : null}
              </>
            ) : (
              <>
                {/* 分类选择 */}
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                    分类
                  </span>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
                  >
                    <option value="">选择分类…</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 账户选择 */}
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                    账户
                  </span>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}（{a.currency}）
                      </option>
                    ))}
                  </select>
                  {selectedAccount ? (
                    <p className="mt-1 text-xs text-stone-400">
                      金额将以 {selectedAccount.currency} 记入该账户
                    </p>
                  ) : null}
                </label>
              </>
            )}

            {/* 备注 */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                备注（可选）
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="自由填写说明…"
                rows={3}
                className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>

            {error ? (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving || accounts.length === 0}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {saving ? (isEditMode ? "更新中…" : "保存中…") : (isEditMode ? "更新" : "保存")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
