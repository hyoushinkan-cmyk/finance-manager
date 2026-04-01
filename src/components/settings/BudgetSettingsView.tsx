"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Currency } from "@/lib/mock-data";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  deleteBudget,
  fetchBudgets,
  insertBudget,
  updateBudget,
  type BudgetRow,
} from "@/lib/ledger-data";

export function BudgetSettingsView() {
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetRow | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([]);
      setLoading(false);
      return;
    }
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await fetchBudgets(sb));
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <header className="mb-6">
        <Link
          href="/settings"
          className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          <ArrowLeft className="h-4 w-4" />
          返回设置
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">预算管理</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          按支出分类设置月度额度（与资产页预算条对应）
        </p>
      </header>

      {!isSupabaseConfigured() ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          配置 Supabase 并登录后，可在此管理预算。
        </p>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              添加预算
            </button>
          </div>

          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {loading ? (
              <li className="px-4 py-6 text-center text-sm text-stone-500">
                加载中…
              </li>
            ) : rows.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-stone-500">
                暂无预算，请添加（分类名建议与记账支出分类一致，如「餐饮」）
              </li>
            ) : (
              rows.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 px-4 py-3.5"
                >
                  <div>
                    <p className="font-medium">{b.category}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      额度 {b.limit.toLocaleString()} {b.currency}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(b);
                        setModalOpen(true);
                      }}
                      className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-neutral-800"
                      aria-label="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`删除「${b.category}」预算？`))
                          return;
                        const sb = createBrowserSupabaseClient();
                        if (!sb) return;
                        try {
                          await deleteBudget(sb, b.id);
                          void refresh();
                        } catch (e) {
                          console.error(e);
                          window.alert("删除失败");
                        }
                      }}
                      className="rounded-lg p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          <BudgetEditModal
            open={modalOpen}
            editing={editing}
            onClose={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSaved={() => void refresh()}
          />
        </>
      )}
    </>
  );
}

function BudgetEditModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: BudgetRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const titleId = useId();
  const [category, setCategory] = useState("");
  const [limitStr, setLimitStr] = useState("");
  const [currency, setCurrency] = useState<Currency>("JPY");
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
    if (!open) return;
    if (editing) {
      setCategory(editing.category);
      setLimitStr(String(editing.limit));
      setCurrency(editing.currency);
    } else {
      setCategory("");
      setLimitStr("");
      setCurrency("JPY");
    }
    setError(null);
  }, [open, editing]);

  if (!open) return null;

  const sb = createBrowserSupabaseClient();

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
        className="relative z-10 w-full max-w-lg rounded-t-2xl border border-stone-200 bg-white p-4 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {editing ? "编辑预算" : "添加预算"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-neutral-800"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sb ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              const cat = category.trim();
              if (!cat) {
                setError("请填写分类名称");
                return;
              }
              const lim = Number(limitStr);
              if (!Number.isFinite(lim) || lim <= 0) {
                setError("额度须为大于 0 的数字");
                return;
              }
              setSaving(true);
              try {
                if (editing) {
                  await updateBudget(sb, editing.id, {
                    category: cat,
                    limit: lim,
                    currency,
                  });
                } else {
                  await insertBudget(sb, {
                    category: cat,
                    limit: lim,
                    currency,
                  });
                }
                onSaved();
                onClose();
              } catch (err) {
                console.error(err);
                setError(
                  "保存失败：分类是否与其它预算重复？或与网络、权限有关。",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                分类名称
              </span>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="例如：餐饮"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                  月度额度
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={limitStr}
                  onChange={(e) => setLimitStr(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 tabular-nums outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                  币种
                </span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
                >
                  <option value="JPY">JPY</option>
                  <option value="CNY">CNY</option>
                </select>
              </label>
            </div>
            {error ? (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {saving ? "保存中…" : "保存"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-stone-500">无法连接 Supabase</p>
        )}
      </div>
    </div>
  );
}
