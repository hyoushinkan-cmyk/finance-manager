import type { Currency } from "@/lib/mock-data";

const STORAGE_KEY_JPY_PER_CNY = "finance_app_jpy_per_cny";

/** Default when no custom rate (SSR or missing localStorage) */
export const DEFAULT_JPY_PER_CNY = 21;

/** @deprecated Use getJpyPerCny() in client components for the effective rate */
export const JPY_PER_CNY = DEFAULT_JPY_PER_CNY;

export function getJpyPerCny(): number {
  if (typeof window === "undefined") return DEFAULT_JPY_PER_CNY;
  const raw = window.localStorage.getItem(STORAGE_KEY_JPY_PER_CNY);
  const n = raw != null ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_JPY_PER_CNY;
  return n;
}

export function setJpyPerCnyClient(rate: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_JPY_PER_CNY, String(rate));
  window.dispatchEvent(new Event("finance-fx-changed"));
}

export function amountInJpy(amount: number, currency: Currency): number {
  if (currency === "JPY") return amount;
  const rate =
    typeof window !== "undefined" ? getJpyPerCny() : DEFAULT_JPY_PER_CNY;
  return amount * rate;
}
