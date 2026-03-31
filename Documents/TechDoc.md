# 技术文档

## 技术栈

-   Next.js + TypeScript
-   Tailwind CSS
-   Supabase
-   Vercel

## 数据库设计

### accounts

-   id
-   user_id
-   name
-   type
-   currency
-   balance
-   principal
-   profit

### transactions

-   id
-   account_id
-   amount
-   currency
-   type
-   category
-   date

### budgets

-   id
-   category
-   amount

### recurring_rules

-   id
-   amount
-   frequency
-   next_run_date

### exchange_rates

-   base_currency
-   target_currency
-   rate

## 核心逻辑

-   投资账户：balance = principal + profit
-   自动记账：按规则生成 transaction
-   汇率：手动输入
-   总资产：统一换算

## 部署

-   Vercel 部署前端
-   Supabase 提供数据库和认证
