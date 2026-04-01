"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import type { Currency } from "@/lib/mock-data";

const STORAGE_KEY = "finance_app_recurring_rules";

export type RecurringRule = {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  kind: "expense" | "income";
  frequency: "monthly" | "weekly";
  note: string;
};

function loadRules(): RecurringRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is RecurringRule =>
        typeof r === "object" &&
        r !== null &&
        "id" in r &&
        "title" in r &&
        typeof (r as RecurringRule).title === "string",
    );
  } catch {
    return [];
  }
}

function saveRules(rules: RecurringRule[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function RecurringSettingsView() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setRules(loadRules());
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
        <h1 className="text-2xl font-bold tracking-tight">循环记账</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          记录房租、订阅等周期性收支备忘（保存在本机；不会自动入账，记一笔仍需手动确认）
        </p>
      </header>

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          添加规则
        </button>
      </div>

      <ul className="space-y-3">
        {rules.length === 0 ? (
          <li className="rounded-2xl border border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-500 dark:border-neutral-800 dark:bg-neutral-900">
            暂无规则。后续若接入服务端定时任务，可在此基础上自动生成账单。
          </li>
        ) : (
          rules.map((r) => (
            <li
              key={r.id}
              className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.title}</p>
                <p className="mt-0.5 text-sm tabular-nums text-stone-600 dark:text-stone-300">
                  {r.kind === "expense" ? "支出" : "收入"}{" "}
                  {Math.abs(r.amount).toLocaleString()} {r.currency} ·{" "}
                  {r.frequency === "monthly" ? "每月" : "每周"}
                </p>
                {r.note ? (
                  <p className="mt-1 text-xs text-stone-400">{r.note}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = rules.filter((x) => x.id !== r.id);
                  setRules(next);
                  saveRules(next);
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

      <RecurringAddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(rule) => {
          const next = [...rules, rule];
          setRules(next);
          saveRules(next);
          setModalOpen(false);
        }}
      />
    </>
  );
}

function RecurringAddModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (r: RecurringRule) => void;
}) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<Currency>("JPY");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [frequency, setFrequency] = useState<"monthly" | "weekly">("monthly");
  const [note, setNote] = useState("");

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
    setTitle("");
    setAmountStr("");
    setCurrency("JPY");
    setKind("expense");
    setFrequency("monthly");
    setNote("");
  }, [open]);

  if (!open) return null;

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
            添加循环备忘
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

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const t = title.trim();
            if (!t) return;
            const amt = Number(amountStr);
            if (!Number.isFinite(amt) || amt <= 0) return;
            const signed = kind === "expense" ? -Math.abs(amt) : Math.abs(amt);
            onAdd({
              id:
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `${Date.now()}`,
              title: t,
              amount: signed,
              currency,
              kind,
              frequency,
              note: note.trim(),
            });
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
              名称
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：房租"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                金额
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm tabular-nums outline-none dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                币种
              </span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              >
                <option value="JPY">JPY</option>
                <option value="CNY">CNY</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                类型
              </span>
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "expense" | "income")
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              >
                <option value="expense">支出</option>
                <option value="income">收入</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                频率
              </span>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as "monthly" | "weekly")
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              >
                <option value="monthly">每月</option>
                <option value="weekly">每周</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
              备注
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            添加
          </button>
        </form>
      </div>
    </div>
  );
}
