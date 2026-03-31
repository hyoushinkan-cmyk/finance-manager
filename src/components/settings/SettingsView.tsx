import {
  ArrowRightLeft,
  Download,
  Landmark,
  PieChart,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { AuthPanel } from "./AuthPanel";

const rows = [
  {
    icon: Landmark,
    title: "账户管理",
    desc: "现金与投资账户",
  },
  {
    icon: PieChart,
    title: "预算设置",
    desc: "按分类设定额度",
  },
  {
    icon: ArrowRightLeft,
    title: "汇率设置",
    desc: "JPY / CNY 手动汇率",
  },
  {
    icon: RefreshCw,
    title: "循环记账",
    desc: "房租、订阅等自动入账",
  },
  {
    icon: Download,
    title: "数据导出",
    desc: "导出为 CSV",
  },
] as const;

export function SettingsView() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">设置</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          账户、预算与数据
        </p>
      </header>

      <AuthPanel />

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
          <Wallet className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div>
          <p className="font-medium">本地演示</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            登录与云端同步将在接入 Supabase 后启用
          </p>
        </div>
      </div>

      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        {rows.map(({ icon: Icon, title, desc }) => (
          <li key={title}>
            <button
              type="button"
              className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-stone-50 dark:hover:bg-neutral-800/80"
            >
              <Icon
                className="h-5 w-5 shrink-0 text-stone-400"
                strokeWidth={1.75}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{title}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {desc}
                </p>
              </div>
              <span className="text-stone-300 dark:text-stone-600">›</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
