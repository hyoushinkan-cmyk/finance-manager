"use client";

import { useCallback, useEffect, useState } from "react";
import { mockCategories, mockIncomeCategories } from "@/lib/mock-data";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  fetchCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
  type CategoryRow,
} from "@/lib/ledger-data";

type Props = {
  onBack?: () => void;
};

export function CategoriesSettingsView({ onBack }: Props) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newIncomeName, setNewIncomeName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMockCategories = () => {
    const expenseCats = mockCategories.map((name, i) => ({
      id: `mock-expense-${i}`,
      name,
      type: "expense" as const,
      sort_order: i,
    }));
    const incomeCats = mockIncomeCategories.map((name, i) => ({
      id: `mock-income-${i}`,
      name,
      type: "income" as const,
      sort_order: i,
    }));
    return [...expenseCats, ...incomeCats];
  };

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      // 使用 mock 数据
      setCategories(loadMockCategories());
      setLoading(false);
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setCategories(loadMockCategories());
      setLoading(false);
      return;
    }

    try {
      const cats = await fetchCategories(sb);
      setCategories(cats);
    } catch (e) {
      // ✅ 完整的 Supabase 错误打印
      console.error("[Supabase RAW ERROR]", e);
      console.error("[Supabase JSON]", JSON.stringify(e, null, 2));

      if (e && typeof e === "object") {
        const err = e as any;
        console.error("[Supabase parsed]", {
          message: err.message,
          details: err.details,
          hint: err.hint,
          code: err.code,
        });
      }
      // ❗ 不再使用 mock 数据 fallback，错误会传播到 UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  const handleAddExpense = async () => {
    const name = newExpenseName.trim();
    if (!name) return;
    setError(null);

    if (!isSupabaseConfigured()) {
      setNewExpenseName("");
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) return;

    setSaving(true);
    try {
      await insertCategory(sb, { name, type: "expense" });
      setNewExpenseName("");
      await refresh();
    } catch (e) {
      console.error(e);
      setError("添加失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAddIncome = async () => {
    const name = newIncomeName.trim();
    if (!name) return;
    setError(null);

    if (!isSupabaseConfigured()) {
      setNewIncomeName("");
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) return;

    setSaving(true);
    try {
      await insertCategory(sb, { name, type: "income" });
      setNewIncomeName("");
      await refresh();
    } catch (e) {
      console.error(e);
      setError("添加失败");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (cat: CategoryRow) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setError(null);

    if (!isSupabaseConfigured()) {
      setEditingId(null);
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) return;

    setSaving(true);
    try {
      await updateCategory(sb, editingId, { name: editName.trim() });
      setEditingId(null);
      await refresh();
    } catch (e) {
      console.error(e);
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个分类吗？")) return;
    setError(null);

    if (!isSupabaseConfigured()) {
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) return;

    try {
      await deleteCategory(sb, id);
      await refresh();
    } catch (e) {
      console.error(e);
      setError("删除失败");
    }
  };

  const isMockData = !isSupabaseConfigured();

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-neutral-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">分类管理</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {isMockData ? "演示数据（配置 Supabase 后可管理）" : "管理支出和收入分类"}
          </p>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-center text-stone-500">加载中…</p>
      ) : (
        <div className="space-y-6">
          {/* 支出分类 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-stone-600 dark:text-stone-400">
              支出分类
            </h2>
            <div className="space-y-2">
              {expenseCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900"
                >
                  {editingId === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit()}
                        disabled={saving}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm dark:border-neutral-700"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{cat.name}</span>
                      {!isMockData && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 dark:hover:bg-neutral-800"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(cat.id)}
                            className="rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
              {!isMockData && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newExpenseName}
                    onChange={(e) => setNewExpenseName(e.target.value)}
                    placeholder="新增支出分类"
                    className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAddExpense();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddExpense()}
                    disabled={saving || !newExpenseName.trim()}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    添加
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 收入分类 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-stone-600 dark:text-stone-400">
              收入分类
            </h2>
            <div className="space-y-2">
              {incomeCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900"
                >
                  {editingId === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit()}
                        disabled={saving}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm dark:border-neutral-700"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{cat.name}</span>
                      {!isMockData && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 dark:hover:bg-neutral-800"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(cat.id)}
                            className="rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
              {!isMockData && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newIncomeName}
                    onChange={(e) => setNewIncomeName(e.target.value)}
                    placeholder="新增收入分类"
                    className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAddIncome();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddIncome()}
                    disabled={saving || !newIncomeName.trim()}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    添加
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
