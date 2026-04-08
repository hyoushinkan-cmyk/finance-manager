# Finance management app bugs and features
_Exported on 4/1/2026 at 09:54:17 GMT+9 from Cursor (2.6.22)_

---

**User**

finanace-management-app这个项目有bug要修复。1.资产要能支持修改和删除。2.记账要可以记录收入（分类有工资，奖金，额外收入）3.记账，无论是支出还是收入，增加备注栏用户自由输入。4.记账，增加日期选项，默认当日，可以手选修改。5.设置页面的【本地演示】部分内容应该是demo漏删除了。6.账户管理，预算管理，汇率设置，循环记账 这几个功能都还没实现。点击菜单没反应。

---

**Cursor**


正在探索项目结构并实现这些功能修复。




正在查找数据库 schema 与 `StatsView` 中对交易的引用。




正在实现：添加数据库迁移（`notes`）、扩展 `ledger-data`、更新记账与资产 UI，并创建设置子页面。




正在更新 `AddAccountModal`（编辑模式）、`AssetsView`（汇率与预算类型）、`TransactionModal`、`LedgerHome` 和 `SettingsView`。




正在重写 `TransactionModal` 并更新 `LedgerHome`。




正在创建设置子页面与组件。




## 已完成的改动

### 1. 资产：修改与删除
- **资产页**每条账户旁增加编辑 / 删除（仅已配置 Supabase 时显示）。
- **`AddAccountModal`** 支持 `editingAccount`：新增与编辑共用同一弹窗。
- **`ledger-data`** 增加 `updateAccount`、`deleteAccount`。若账户仍有流水，数据库外键会拦截删除，并提示用户先处理记账。

### 2. 记账：收入与分类
- **记一笔**增加「支出 / 收入」切换；收入分类为：**工资、奖金、额外收入**（`mockIncomeCategories`）；支出仍为原有分类。
- 金额按正数输入：支出存为负数，收入存为正数。

### 3. 备注与日期
- 增加**备注**多行输入，写入库字段 `notes`。
- 增加**日期**选择，默认当天，可修改；列表展示 **分类 · 账户 · 日期**，有备注时显示备注。

### 4. 设置页
- 已**移除**「本地演示」整块说明。
- **账户管理 / 预算设置 / 汇率设置 / 循环记账 / 数据导出**均用 `Link` 跳转到对应子路由，不再是无效按钮。

### 5. 各子页行为
| 路径 | 作用 |
|------|------|
| `/settings/accounts` | 账户列表、添加 / 编辑 / 删除（需登录 Supabase） |
| `/settings/budgets` | 预算 CRUD（与资产页预算条数据源一致） |
| `/settings/fx` | 1 CNY = ? JPY，写入 **localStorage**，并触发 `finance-fx-changed`；资产总资产换算与统计里的日元换算会跟着变 |
| `/settings/recurring` | **本机备忘**：周期收支规则（不自动入账，避免无后端定时任务时误导） |
| `/settings/export` | 从 Supabase 拉流水并下载 **CSV**（含备注列） |

### 6. 数据库
- 新迁移：`supabase/migrations/002_transaction_notes.sql`，为 `transactions` 增加可空列 **`notes`**。请在 Supabase 中执行该迁移（或合并进你的迁移流程），否则带 `notes` 的查询/插入可能报错。

### 7. 汇率逻辑（`src/lib/fx.ts`）
- `amountInJpy` 在浏览器内会读 `getJpyPerCny()`；无 `localStorage` 或服务端仍用默认 **21**。

---

`npm run build` 已通过。若你还没有对生产库跑 `002` 迁移，上线前请先执行 `notes` 字段迁移。

---

**User**

告诉我如何具体对生产库跑 002 迁移，上线前请先执行 notes 字段迁移

