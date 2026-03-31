import type { Currency } from "@/lib/mock-data";

/** Demo FX; align with AssetsView — replace with settings later */
export const JPY_PER_CNY = 21;

export function amountInJpy(amount: number, currency: Currency): number {
  if (currency === "JPY") return amount;
  return amount * JPY_PER_CNY;
}
