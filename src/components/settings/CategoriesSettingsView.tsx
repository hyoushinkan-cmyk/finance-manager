"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { CategoryRow } from "@/lib/ledger-data";
import { useCategories } from "@/contexts/CategoriesContext";

type Props = {
  onBack?: () => void;
};

export function CategoriesSettingsView({ onBack }: Props) {
  const { categories, loading, error, addCategory, editCategory, removeCategory } = useCategories();
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newIncomeName, setNewIncomeName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  const handleAddExpense = async () => {
    const name = newExpenseName.trim();
    if (!name) return;
    setLocalError(null);
    setSaving(true);
    try {
      await addCategory(name, "expense");
      setNewExpenseName("");
    } catch (e) {
      setLocalError(String(e) || "添加失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAddIncome = async () => {
    const name = newIncomeName.trim();
    if (!name) return;
    setLocalError(null);
    setSaving(true);
    try {
      await addCategory(name, "income");
      setNewIncomeName("");
    } catch (e) {
      setLocalError(String(e) || "添加失败");
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
    setLocalError(null);
    setSaving(true);
    try {
      await editCategory(editingId, editName.trim());
      setEditingId(null);
    } catch (e) {
      setLocalError(String(e) || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个分类吗？")) return;
    setLocalError(null);
    try {
      await removeCategory(id);
    } catch (e) {
      setLocalError(String(e) || "删除失败");
    }
  };

  const isMockData = !isSupabaseConfigured();
  const displayError = localError || error;

  return (
    <div className="pb-4">
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

      {displayError && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
          {displayError}
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
                            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-neutral-800"
                            title="编辑"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(cat.id)}
                            className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="删除"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
                            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-neutral-800"
                            title="编辑"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(cat.id)}
                            className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="删除"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
