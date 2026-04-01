"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { mockCategories, mockIncomeCategories } from "@/lib/mock-data";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { insertTransactionAndUpdateBalance } from "@/lib/ledger-data";
import type { AccountRow } from "@/lib/ledger-data";

type Props = {
  open: boolean;
  onClose: () => void;
  accounts: AccountRow[];
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
  onClose,
  accounts,
  onSaved,
}: Props) {
  const titleId = useId();
  const [flowKind, setFlowKind] = useState<"expense" | "income">("expense");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState(mockCategories[0] ?? "其他");
  const [accountId, setAccountId] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => toYmdLocal(new Date()));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || accounts.length === 0) return;
    setFlowKind("expense");
    setAmountStr("");
    setCategory(mockCategories[0] ?? "其他");
    setAccountId(accounts[0].id);
    setOccurredOn(toYmdLocal(new Date()));
    setNotes("");
    setError(null);
  }, [open, accounts]);

  useEffect(() => {
    if (flowKind === "expense") {
      setCategory((c) =>
        mockCategories.includes(c) ? c : (mockCategories[0] ?? "其他"),
      );
    } else {
      const incomeCats = [...mockIncomeCategories];
      setCategory((c) =>
        incomeCats.includes(c as (typeof mockIncomeCategories)[number])
          ? c
          : incomeCats[0]!,
      );
    }
  }, [flowKind]);

  if (!open) return null;

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const categoryOptions =
    flowKind === "expense" ? mockCategories : [...mockIncomeCategories];

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
            记一笔
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
              if (!selectedAccount) {
                setError("请选择账户");
                return;
              }
              if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
                setError("日期格式无效");
                return;
              }

              const storedAmount =
                flowKind === "expense" ? -Math.abs(raw) : Math.abs(raw);
              const currencySave = selectedAccount.currency;
              const title = category;
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
                await insertTransactionAndUpdateBalance(sb, {
                  accountId: selectedAccount.id,
                  category,
                  title,
                  amount: storedAmount,
                  currency: currencySave,
                  occurredOn,
                  notes: notesTrim === "" ? null : notesTrim,
                });
                onSaved();
                onClose();
              } catch (err) {
                console.error(err);
                setError("保存失败，请检查网络与 Supabase 配置");
              } finally {
                setSaving(false);
              }
            }}
          >
            <div>
              <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                类型
              </span>
              <div className="flex rounded-xl border border-stone-200 p-0.5 dark:border-neutral-700">
                {(
                  [
                    { key: "expense" as const, label: "支出" },
                    { key: "income" as const, label: "收入" },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFlowKind(key)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                      flowKind === key
                        ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500"
                        : "text-stone-600 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

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

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                分类
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

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
              {saving ? "保存中…" : "保存"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
