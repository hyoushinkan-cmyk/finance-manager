"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { fetchTransactions } from "@/lib/ledger-data";

function csvEscape(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function ExportDataView() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const download = useCallback(async () => {
    setMessage(null);
    if (!isSupabaseConfigured()) {
      setMessage("请先配置 Supabase 并登录后再导出。");
      return;
    }
    const sb = createBrowserSupabaseClient();
    if (!sb) return;
    setBusy(true);
    try {
      const rows = await fetchTransactions(sb);
      const header = [
        "date",
        "title",
        "category",
        "amount",
        "currency",
        "account",
        "notes",
      ];
      const lines = [
        header.join(","),
        ...rows.map((r) =>
          [
            csvEscape(r.date),
            csvEscape(r.title),
            csvEscape(r.categoryName),
            String(r.amount),
            csvEscape(r.currency),
            csvEscape(r.accountName),
            csvEscape(r.notes ?? ""),
          ].join(","),
        ),
      ];
      const blob = new Blob(["\uFEFF" + lines.join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("已开始下载");
    } catch (e) {
      console.error(e);
      setMessage("导出失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }, []);

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
        <h1 className="text-2xl font-bold tracking-tight">数据导出</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          将记账流水导出为 CSV（UTF-8）
        </p>
      </header>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <button
          type="button"
          disabled={busy}
          onClick={() => void download()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          <Download className="h-4 w-4" />
          {busy ? "导出中…" : "下载 CSV"}
        </button>
        {message ? (
          <p className="mt-3 text-center text-sm text-stone-600 dark:text-stone-400">
            {message}
          </p>
        ) : null}
      </div>
    </>
  );
}
