"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, PenLine, PieChart, Settings } from "lucide-react";

const items = [
  { href: "/assets", label: "资产", icon: Landmark },
  { href: "/", label: "记账", icon: PenLine },
  { href: "/stats", label: "统计", icon: PieChart },
  { href: "/settings", label: "设置", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pb-safe fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/80 bg-stone-50/95 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/95"
      aria-label="主导航"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1 px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[4rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
