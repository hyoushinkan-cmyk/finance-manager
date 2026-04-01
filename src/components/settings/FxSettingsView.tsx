"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  DEFAULT_JPY_PER_CNY,
  getJpyPerCny,
  setJpyPerCnyClient,
} from "@/lib/fx";

export function FxSettingsView() {
  const [rateStr, setRateStr] = useState(String(DEFAULT_JPY_PER_CNY));
  const [savedHint, setSavedHint] = useState(false);

  useEffect(() => {
    setRateStr(String(getJpyPerCny()));
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
        <h1 className="text-2xl font-bold tracking-tight">汇率设置</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          用于资产换算与统计中的日元计价（仅保存在本机浏览器）
        </p>
      </header>

      <form
        className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(rateStr);
          if (!Number.isFinite(n) || n <= 0) {
            window.alert("请输入大于 0 的数字");
            return;
          }
          setJpyPerCnyClient(n);
          setSavedHint(true);
          window.setTimeout(() => setSavedHint(false), 2000);
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
            1 人民币（CNY）折合日元（JPY）
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={rateStr}
            onChange={(e) => setRateStr(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xl font-semibold tabular-nums outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </label>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          当前默认值 {DEFAULT_JPY_PER_CNY}。修改后「资产」「统计」等页面的日元换算会立即使用新汇率。
        </p>
        {savedHint ? (
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            已保存
          </p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          保存汇率
        </button>
      </form>
    </>
  );
}
