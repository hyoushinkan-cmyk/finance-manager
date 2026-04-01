/** 未配置 NEXT_PUBLIC_SUPABASE_* 时的本地占位；生产环境请使用 Supabase。 */

export type Currency = "JPY" | "CNY";

export type MockTransaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: Currency;
  accountName: string;
  date: string;
};

export const mockTransactions: MockTransaction[] = [
  {
    id: "1",
    title: "超市",
    category: "餐饮",
    amount: -1280,
    currency: "JPY",
    accountName: "现金 · 三菱",
    date: "2026-03-29",
  },
  {
    id: "2",
    title: "交通",
    category: "交通",
    amount: -220,
    currency: "JPY",
    accountName: "Suica",
    date: "2026-03-29",
  },
  {
    id: "3",
    title: "国内转账",
    category: "转账",
    amount: 5000,
    currency: "CNY",
    accountName: "招行储蓄",
    date: "2026-03-28",
  },
];

export const mockAccounts = [
  {
    id: "a1",
    name: "现金 · 三菱",
    type: "cash" as const,
    currency: "JPY" as Currency,
    balance: 185_420,
  },
  {
    id: "a2",
    name: "Suica",
    type: "cash" as const,
    currency: "JPY" as Currency,
    balance: 3_200,
  },
  {
    id: "a3",
    name: "投资 · SBI",
    type: "investment" as const,
    currency: "JPY" as Currency,
    balance: 1_200_000,
    principal: 1_000_000,
    profit: 200_000,
  },
  {
    id: "a4",
    name: "招行储蓄",
    type: "cash" as const,
    currency: "CNY" as Currency,
    balance: 42_800,
  },
];

export const mockBudgets = [
  { category: "餐饮", spent: 45_200, limit: 60_000, currency: "JPY" as Currency },
  { category: "交通", spent: 12_400, limit: 15_000, currency: "JPY" as Currency },
  { category: "购物", spent: 8_900, limit: 30_000, currency: "JPY" as Currency },
];

export const mockCategories = [
  "餐饮",
  "交通",
  "购物",
  "居住",
  "娱乐",
  "医疗",
  "转账",
  "其他",
];

/** 收入类记账分类 */
export const mockIncomeCategories = ["工资", "奖金", "额外收入"] as const;
