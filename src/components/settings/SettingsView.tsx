import Link from "next/link";
import {
  ArrowRightLeft,
  Download,
  Landmark,
  PieChart,
  RefreshCw,
} from "lucide-react";
import { AuthPanel } from "./AuthPanel";

const rows = [
  {
    href: "/settings/accounts" as const,
    icon: Landmark,
    title: "账户管理",
    desc: "现金与投资账户",
  },
  {
    href: "/settings/budgets" as const,
    icon: PieChart,
    title: "预算设置",
    desc: "按分类设定额度",
  },
  {
    href: "/settings/fx" as const,
    icon: ArrowRightLeft,
    title: "汇率设置",
    desc: "JPY / CNY 手动汇率",
  },
  {
    href: "/settings/recurring" as const,
    icon: RefreshCw,
    title: "循环记账",
    desc: "房租、订阅等周期备忘",
  },
  {
    href: "/settings/export" as const,
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

      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        {rows.map(({ href, icon: Icon, title, desc }) => (
          <li key={href}>
            <Link
              href={href}
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
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
