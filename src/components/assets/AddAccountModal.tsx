"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { Currency } from "@/lib/mock-data";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { insertAccount, type AccountRow } from "@/lib/ledger-data";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AddAccountModal({ open, onClose, onSaved }: Props) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountRow["type"]>("cash");
  const [currency, setCurrency] = useState<Currency>("JPY");
  const [balanceStr, setBalanceStr] = useState("0");
  const [principalStr, setPrincipalStr] = useState("");
  const [profitStr, setProfitStr] = useState("");
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
    setName("");
    setType("cash");
    setCurrency("JPY");
    setBalanceStr("0");
    setPrincipalStr("");
    setProfitStr("");
    setError(null);
  }, [open]);

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
            添加账户
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

        {sb ? (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const trimmed = name.trim();
            if (!trimmed) {
              setError("请填写账户名称");
              return;
            }
            const balance = Number(balanceStr);
            if (!Number.isFinite(balance)) {
              setError("初始余额无效");
              return;
            }
            let principal: number | null = null;
            let profit: number | null = null;
            if (type === "investment") {
              if (principalStr.trim() !== "") {
                const p = Number(principalStr);
                if (!Number.isFinite(p)) {
                  setError("本金无效");
                  return;
                }
                principal = p;
              }
              if (profitStr.trim() !== "") {
                const p = Number(profitStr);
                if (!Number.isFinite(p)) {
                  setError("收益无效");
                  return;
                }
                profit = p;
              }
            }

            setSaving(true);
            try {
              await insertAccount(sb, {
                name: trimmed,
                type,
                currency,
                balance,
                principal,
                profit,
              });
              onSaved();
              onClose();
            } catch (err) {
              console.error(err);
              setError("保存失败，请检查网络与权限");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
              名称
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：现金、招行储蓄"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
              autoFocus
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                类型
              </span>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as AccountRow["type"])
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
              >
                <option value="cash">现金</option>
                <option value="investment">投资</option>
              </select>
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

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
              当前余额
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={balanceStr}
              onChange={(e) => setBalanceStr(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xl font-semibold tabular-nums outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>

          {type === "investment" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                  本金（可选）
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={principalStr}
                  onChange={(e) => setPrincipalStr(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 tabular-nums outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-stone-400">
                  收益（可选）
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={profitStr}
                  onChange={(e) => setProfitStr(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 tabular-nums outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
                />
              </label>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </form>
        ) : (
          <div className="space-y-4">
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              未配置 Supabase 环境变量，无法保存到云端。
            </p>
            <Link
              href="/settings"
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              去设置页登录/检查配置
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
