"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { deleteAccount, fetchAccounts, type AccountRow } from "@/lib/ledger-data";
import { AddAccountModal } from "@/components/assets/AddAccountModal";

export function AccountSettingsView() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setAccounts(await fetchAccounts(sb));
    } catch (e) {
      console.error(e);
      setAccounts([]);
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
        <h1 className="text-2xl font-bold tracking-tight">账户管理</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          添加、编辑或删除现金与投资账户
        </p>
      </header>

      {!isSupabaseConfigured() ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          请先配置 Supabase 并登录，才能管理云端账户。您仍可在「资产」页查看演示数据。
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
              添加账户
            </button>
          </div>

          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {loading ? (
              <li className="px-4 py-6 text-center text-sm text-stone-500">
                加载中…
              </li>
            ) : accounts.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-stone-500">
                暂无账户，请先添加
              </li>
            ) : (
              accounts.map((a) => (
                <li key={a.id} className="flex items-center gap-2 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {a.type === "investment" ? "投资" : "现金"} · {a.currency}{" "}
                      · 余额 {a.balance.toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(a);
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
                      if (
                        !window.confirm(
                          `确定删除「${a.name}」？若仍有记账记录将无法删除。`,
                        )
                      )
                        return;
                      const sb = createBrowserSupabaseClient();
                      if (!sb) return;
                      try {
                        await deleteAccount(sb, a.id);
                        void refresh();
                      } catch (e) {
                        console.error(e);
                        window.alert(
                          "删除失败：该账户可能仍有记账记录，请先处理相关流水。",
                        );
                      }
                    }}
                    className="rounded-lg p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                    aria-label="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))
            )}
          </ul>

          <AddAccountModal
            open={modalOpen}
            editingAccount={editing}
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
