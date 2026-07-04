# 请求记录页改造方案（对标 sub2api / new-api，2026-07）

> 目标：把「请求中心 → 请求记录」从 6 列的简陋表格，改造成对标 sub2api（图1）/ new-api（图2）的专业请求日志。
> 本文只做**方案 + 落地清单**，标 **【待确认】** 处请先拍板。

---

## 0. 实施状态（2026-07-04 全量落地完成）

**批一（列表富化 + 详情补强 + 删用量页）✅ 完成**
- 后端：`ListRequestRecordsPage` 单条 JOIN 富化（usage/cost_snapshots/ledger 净扣费/routes/channels + `string_agg` 渠道链）；service 计算 `latency_ms`/`ttft_ms`/`tps`；DTO/handler 全量更新。
- 前端：列表重设计为 时间·状态·用户/Key·模型·类型·端点·IP·线路·推理强度·Tokens·耗时·费用·请求ID·操作；`request-cells.tsx` 新增 Tokens/耗时/费用/线路/推理强度单元格（悬浮显示成本明细、渠道链、思考预算）；详情弹窗新增「时延」区块 + IP/推理强度行。
- 删除「用量分析」页：前后端 + SQL（`ListUsageRecordsPage`/`CountUsageRecords`）+ 路由/导航全部移除；仅保留 `Usage` struct 供详情复用。

**批二（网关埋点：线路快照 / reasoning 归一 / client_ip）✅ 完成**
- 迁移 `000064`：`request_records` 增 `route_id`（快照）/`reasoning_effort`/`reasoning_budget_tokens`/`client_ip`（均可空，向后兼容）。
- 写路径：`RequestLifecycle.CreateRequest` 快照 `principal.RouteID`、从 ctx 取 client_ip（新增 `httpmw.ClientIP` 中间件 + `httpx.ExtractClientIP`，XFF/X-Real-IP/RemoteAddr）；协议编排从请求 DTO 提取推理强度并经 `NormalizeOpenAIEffort` / `NormalizeAnthropicThinking` 归一（none/minimal/low/medium/high/xhigh，budget↔effort 区间对齐 aiproxy）。
- 列表线路名改为**请求级快照** `route_id → routes.name`（Key 换绑不影响历史，历史行回落 Key 当前绑定）。

**测试 ✅ 全绿**
- `go build`/`go vet`/`go test ./...` 全通过；新增 `lifecycle` reasoning 归一单测（OpenAI + Anthropic 全档位）。
- 前端 `tsc` + `vite build` 通过；改动文件 ESLint 零新增告警。
- 迁移 `000064` 已应用到本地 dev DB（version 64）。
- **真实上游 e2e**（`cmd/e2e-reqrecords`，复用线路 75 + 真实渠道，进程内起当前源码网关）：14/14 PASS —
  route_id 快照=75、client_ip=XFF 首个、reasoning_effort 归一=high、记录 succeeded；
  读路径 List 富化项 token(552/6)/用户扣费/平台成本/总耗时(1680ms)/线路名(VIP-Codex)/渠道链 均正确。

---

## 1. 现状诊断（为什么"不专业"）

**列表**只有 6 个字段 + 操作按钮（`requests-os-columns.tsx`）：

| 请求ID | 模型 | 状态 | 流式 | 用户 | 创建时间 | 操作 |

- **无 tokens**（输入/输出/缓存看不到）
- **无费用**（一眼看不出这条请求花了多少钱 / 平台成本 / 毛利）
- **无耗时 / TTFT / TPS**（快不快、首字多久，全无）
- **无渠道/服务商、无归因**（要点进详情才知道走了哪条渠道）
- 用量分析（`UsagePage`）是**另一个几乎重复的列表**（只多了聚合 input/output），两页信息割裂。

**详情弹窗**（`RequestDetailDialog`）其实不差：基本信息、上游尝试（含 `fault_party` 归因）、用量 token、账本流水、计费异常——**在归因维度甚至比 new-api 还细**。但缺：**$ 成本拆解、单价、延迟/TTFT**。

**结论**：我们的**数据基本都有**（见 §3），只是**列表几乎没展示**、详情缺成本与延迟。改造主要是"把已有数据摆出来"，而非重做后端。

---

## 2. 对标（三方列/信息对比）

| 维度 | 我们（现状） | sub2api（图1） | new-api（图2） |
| --- | --- | --- | --- |
| 时间 | ✅ | ✅ | ✅ 带状态色（错误行红） |
| 状态 | ✅ 徽标 | ✅ 颜色 | ✅ 消耗/错误 色点 |
| 用户 / Key | 用户ID | API 密钥名 | 令牌名 + 分组 + 组倍率 |
| 模型 | requested | requested→upstream + 映射链 a→b→c | 模型徽标 |
| 类型 | 流式 是/否 | 同步/流式/ws | 流式/非流式 |
| 端点 | ❌（有 operation 未展示） | ✅ 入站 /v1/chat/completions | ❌ |
| IP + 地理 | ❌（未存） | ✅ 203.x · JP·Tokyo | ✅ IP 列（掩码+悬浮） |
| 分组/线路 | ❌（未存名称） | ✅ Pro极速分组 | ✅ group |
| 计费模式 | ❌ | ✅ 按量/image | — |
| 推理强度 | ❌（未存） | ✅ XHigh | — |
| Tokens | ❌ | ✅ ↓547 ↑12 缓存3.8K | ✅ 输入/输出 + 缓存↓↑ |
| 耗时 | ❌ | ✅ 1.41s | ✅ 8.0s + TTFT + t/s 着色 |
| 首 Token(TTFT) | ❌（时间戳可算未算） | ✅ | ✅ |
| 费用 | ❌ | ✅ $ + 成本明细浮层 | ✅ + 价目浮层 |
| 成本明细浮层 | ❌ | ✅ 输入/输出/缓存成本 + 单价 + 档位 + 倍率 + 原始 vs 用户扣费 | ✅ 标准·$2.5/$15/M + 缓存价 + 组倍率 |
| 归因(上游/客户端/平台) | ✅ 详情有 fault_party | 部分 | 重试链 A→B→C |
| 详情弹窗 | ✅ 较全（缺成本/延迟） | ✅ | ✅ |

**takeaway**：new-api 的**耗时着色 + Tokens 双行 + 费用价目浮层**、sub2api 的**成本明细浮层（原始 vs 扣费 + 单价 + 倍率）**是最值得抄的两处；两者列表都是**单页富信息 + 悬浮/弹窗展开**。

---

## 3. 差距分析（分两类）

### A 类：数据我们已有，只是没展示（**低成本高收益，阶段一**）

| 想展示 | 数据来源（已有） |
| --- | --- |
| Tokens 输入/输出/缓存读/缓存写/reasoning | `usage_records`（`uncached_input`/`cache_read`/`cache_write_5m/1h`/`output_tokens_total`/`reasoning_output`） |
| 耗时（总） | `completed_at - started_at` |
| TTFT 首字 | `response_started_at - started_at` |
| TPS | `output_tokens_total / (completed_at - response_started_at)` |
| 用户扣费 | `ledger_entries`（净 debit） |
| 平台成本（原始） | `cost_snapshots.total_cost_amount` + 各 bucket `*_cost_amount` |
| 单价（成本单价） | `cost_snapshots` 各 bucket 单价 |
| 客户单价 / 倍率 | `price_snapshots`（客户单价 + `formula_version`）——**当前 admin API 未暴露** |
| 毛利 | 用户扣费 − 平台成本 |
| 渠道/服务商名 | `final_channel_id`/`final_provider_id` → JOIN channels/providers |
| 类型 | `stream` |
| 端点(近似) | `operation` + `ingress_protocol`（chat_completions/messages/responses） |
| 归因 | 详情 attempts 的 `fault_party`（已展示，可上浮到列表状态） |

### B 类：我们**没存**，要网关埋点 + 迁移（**阶段二**）

| 字段 | sub2api 对应 | 需要 |
| --- | --- | --- |
| 客户端 IP（**不带地理**，已定） | `IPAddress` | 网关写 `request_records.client_ip`（不做地理） |
| 入站/上游端点原始 path | `InboundEndpoint`/`UpstreamEndpoint` | 现有 `operation` 够用则可不加 |
| 推理强度 | `ReasoningEffort` | OpenAI：请求侧已解析 `reasoning_effort`（`chatcompletions/dto.go:19`），只需落库；Anthropic：无原生档位（`thinking.budget_tokens` 原样透传 `messages/wire.go:21`），需归一或留空（Q7） |
| 服务档位 service_tier | `ServiceTier` | 网关解析落库 |
| 计费模式 billing_mode | `BillingMode` | 若只有 token 计费可先固定"按量" |
| User-Agent | `UserAgent` | 网关写库 |
| 线路/分组名 | `GroupID`→name | 我们有 route/channel，可 JOIN；"分组"概念需确认 |

> B 类都要改**网关热路径 + request_records 迁移加列**，风险与工作量都比 A 类大。建议**阶段二**单独做，先按需挑（IP、reasoning_effort 最有感）。

---

## 4. 方案（分阶段）

### 阶段一（不改网关，纯"摆出已有数据"）——**主体改造**

**4.1 后端：列表接口富化**
- `ListRequestRecordsPage` 改为 `LEFT JOIN` 关联每请求的 `usage_records`（token）、`cost_snapshots`（平台成本）、`price_snapshots`（客户单价）+ 一个 `ledger_entries` 净额子查询（用户扣费）；SELECT 增加：token 各桶、`total_cost_amount`、净扣费、`final_channel_id/provider` 名。
  - 均为 1:1（`request_record_id` 唯一），JOIN 成本可控；分页 20 行。**【验证项 V】** 大表下 EXPLAIN 确认走索引；若慢则退化为「列表只带 token + 扣费，成本明细走详情接口」。
- 计算列（SQL 或 Go）：`latency_ms`、`ttft_ms`、`tps`。
- DTO 增字段；`price_snapshots` 首次纳入（客户单价/倍率，管理端可见）。

**4.2 前端：列表列重设计（对标图1/图2）**

建议列（可列设置隐藏）：

| 列 | 内容 |
| --- | --- |
| 时间 | `created_at` + 状态色点（错误行整行淡红，学 new-api） |
| 状态 | 徽标（succeeded/failed/…）；失败带 `error_code` 悬浮 |
| 用户/Key | `user_id` + `api_key_id`（名可后续） |
| 模型 | requested；若 `response_model_id` 不同则 requested→response |
| 类型 | 流式/非流式 |
| 端点 | `operation`/`ingress_protocol`（/v1/chat/completions 等） |
| IP〔需埋点〕 | 客户端 IP（掩码+悬浮，**不带地理**） |
| 线路〔需迁移+埋点〕 | 线路名（**请求级快照** `request_records.route_id + route_name`，Key 换绑不影响历史）；**悬浮展示所有经过的渠道链** `A→B→C`（`array_agg(channel ORDER BY attempt_index)`，标出命中/失败） |
| 推理强度〔需迁移+埋点〕 | **统一档位** minimal/low/medium/high/xhigh：OpenAI 取 `reasoning_effort`；Anthropic 由 `thinking.budget_tokens` 归一（见 §4b D2）。**Anthropic 悬浮/详情显示**：原始预算（若有）+ 该档位区间（例：Claude 归一为 medium → 悬浮显示 `4097–12288`；若有真实预算则同时显示 `预算 8192 tokens`）。OpenAI 原生档位无需悬浮。 |
| Tokens | `输入 / 输出` + 次行 `缓存↓读 缓存↑写`；数值**带单位 K/M/B**（复用 `lib/format.formatCompact`） |
| 耗时 | 总耗时 + TTFT + TPS，**按阈值着色**（学 new-api getResponseTimeColor） |
| 费用 | 用户扣费 $，**悬浮"成本明细"**：输入/输出/缓存成本 + 单价 + 平台原始成本 + 毛利（学 sub2api） |
| 操作 | 详情（眼睛） |

- 复用现有 `SuccessRateTimeline` 无关；复用 `RangeFilter`、`useServerTable`、`ServerDataTable`、列设置。
- 保留深链 `?request_id=` 打开详情。

**4.3 前端：详情弹窗增强**
- 新增「**成本 / 计费**」区块：客户单价（price_snapshots）× 用量 = 扣费；平台成本（cost_snapshots）；毛利；倍率/公式版本。补齐图1"成本明细"的全部字段。
- 「**时延**」区块：TTFT、总耗时、TPS（从时间戳算）。
- 其余（attempts + fault_party + 账本 + 计费异常）保留。

**4.4 页面合并【待确认 Q1】**
- 两家参照都是**单页富日志**。我们「请求记录」+「用量分析」高度重复。
  - **推荐**：请求记录富化后，**用量分析降级为「聚合/统计视图」或直接并入请求记录**（用列设置切换 token 视图），避免两个割裂列表。
  - 或：保留两页，用量分析专注"按模型/用户聚合汇总"（非逐条），与逐条请求记录区分。

### 阶段二（网关埋点 + 迁移）——**新字段**（可延后/挑选）
- `request_records` 迁移加列：`client_ip`、`reasoning_effort`、`service_tier`、`user_agent`（按 Q2 选）。
- 网关写路径填充；前端列表加对应列（IP 掩码+悬浮、推理强度徽标等）。
- 地理位置（IP→国家/城市）：离线库或前端解析，**【待确认 Q3】** 是否需要。

---

## 4b. 已锁定决策（2026-07 追加）

### D1 线路做「请求级快照」（不靠 JOIN 当前 Key 绑定）
- 迁移 `request_records` 加 `route_id BIGINT`（可空，历史行 NULL）+ `route_name TEXT`（快照名，可选带 `route_price_ratio`）。
- 网关建 request_record 时写入本次解析出的线路（id + 名称快照）。**即使之后 API Key 换绑线路，历史请求仍显示当时真实线路。**
- 「线路」列读快照；悬浮的「经过渠道链」从 `request_attempts`（已存）取。

### D2 推理强度：统一档位（Q7=B，与 sub2api / aiproxy 看齐）
- 迁移 `request_records` 加 `reasoning_effort TEXT`（归一档位）+ `reasoning_budget_tokens INT`（原始预算，留证）。
- 网关解析并落库：
  - **OpenAI**（chat/responses）：直接取 `reasoning_effort`（`chatcompletions/dto.go:19` 已解析，只差落库）。
  - **Anthropic**（messages）：解析 `thinking`（现为 `RawMessage` 透传 `messages/wire.go:21`，需解析）：`type=disabled`→`none`；有 `budget_tokens`→按下表归一；`enabled/adaptive` 无 budget→默认 `medium`。
- **归一映射（budget → effort，展示口径）**：

| budget 区间 | effort |
| --- | --- |
| ≤ 0 | none |
| 1–1024 | minimal |
| 1025–4096 | low |
| 4097–12288 | medium |
| 12289–24576 | high |
| > 24576 | xhigh |

- **反向（effort → budget，协议桥接 OpenAI→Anthropic 翻译时用）**：none=0 / minimal=1024 / low=2048 / medium=8192 / high=16384 / xhigh=32768。
- 统一词表 `{none, minimal, low, medium, high, xhigh}`；Anthropic 概念上的 `max` 归一为 `xhigh`（sub2api 亦把 DeepSeek `max`→`xhigh`）。
- **前端展示**：列表「推理强度」显示归一档位。**Anthropic 请求**在列表悬浮 + 详情里额外显示：该档位对应的 budget 区间（如 medium → `4097–12288`），若落库了真实 `reasoning_budget_tokens` 则同时显示「预算 N tokens」。OpenAI 原生档位不需悬浮。

- **源码追溯（写代码时在归一函数处加注释，附以下链接）**：
  - 概念 + `UsageLog` 字段（`ReasoningEffort` 跨协议、`max`→`xhigh` 归一）：sub2api
    `https://github.com/Wei-Shaw/sub2api/blob/main/backend/internal/service/usage_log.go`
  - 精确的 budget↔effort 区间映射表（本文档采用的边界）：labring/aiproxy
    `https://github.com/labring/aiproxy/blob/main/docs/REASONING_COMPATIBILITY.md`
  - 注：上表 effort→budget（low=2048/medium=8192/high=16384/xhigh=32768）两家一致；budget→effort 的**区间边界**取自 aiproxy 文档。

### D3 删除「用量分析」页（Q1）——清理清单
- **前端删**：`pages/UsagePage.tsx`、`components/openstatus-table/usage-os-columns.tsx`、`lib/api/usage.ts`；移除 `App.tsx` 路由与 `AppLayout.tsx` 导航项。
- **后端删**：`adminapi/usage.go`（handler + DTO + `UsageQueryService` 接口）、`router.go` 的 `GET /usage` 注册（L255-257）与 `UsageQueryService` 依赖字段（L43）、`service/admin/query/usage.go`、`bootstrap/admin_server.go` + `admin_http.go` 的 UsageQueryService 装配、`query_handlers_test.go` 里 usage 用例。
- **SQL**：`usage_records.sql` 里**仅删** admin 用量列表专用查询（`ListUsageRecordsPage`/`CountUsageRecords`）；**保留** `GetUsageRecordByRequest`（请求详情用）及 settlement/dashboard 用到的其它查询。sqlc 重生成。
- 逐条用量并入请求记录后，按模型/用户的**聚合统计**走 Dashboard breakdown，不再单独承接。

---

## 5. 【待确认】需你拍板

- **Q1 页面结构**：~~用量分析怎么处理~~ → **已定：删除用量分析页**（清理见 §4b D3），聚合统计走 Dashboard breakdown。
- **Q2 阶段二字段范围**：IP / reasoning_effort / service_tier / user_agent / billing_mode 里，先做哪些？**推荐先做 IP + reasoning_effort**（最有感），其余延后。
- **Q3 IP 地理**：~~是否要地理~~ → **已定：不要地理**，IP 列只显示 IP（掩码+悬浮）。
- **Q7 推理强度跨协议**：~~A/B~~ → **已定：B（统一归一）**，映射见 §4b D2。
- **Q4 费用口径**：~~确认~~ → **已定**：列表"费用"显示**用户扣费**，悬浮给**平台成本 + 毛利**。
- **Q5 成本单价来源**：~~确认~~ → **已定**：用 `price_snapshots` / `cost_snapshots`（结算时冻结的真实单价），保证历史行显示的是"当时实际扣费单价"，不随价目表变动。
- **Q6 列表取数方式**：~~确认~~ → **已定**：列表接口用**多表 JOIN**（`usage_records`/`cost_snapshots`/`price_snapshots` 均 1:1 + `ledger` 净额子查询），不额外去规范化、不改网关；落地时跑 EXPLAIN 验证性能，真慢再考虑冗余列。

---

## 6. 落地清单（阶段一，确认后执行）

### 后端
- [ ] `request_records.sql`：`ListRequestRecordsPage` 增 `LEFT JOIN usage_records / cost_snapshots / price_snapshots` + ledger 净额子查询 + channels/providers 名；SELECT 增 token/成本/扣费/延迟计算列。sqlc 重生成。
- [ ] `query/request.go`：`RequestSummary` 增字段 + 映射；latency/ttft/tps 计算。
- [ ] `adminapi/requests.go`：`requestSummaryDTO` 增字段。
- [ ] 详情 `Get`：补 `price_snapshots` + `cost_snapshots`（详情接口纳入）；DTO 增成本区块。
- [ ] `go vet`/`test`/EXPLAIN 验证。

### 前端
- [ ] `requests.ts`：`RequestSummary`/`RequestDetail` 增字段（tokens/cost/latency/ttft/tps/channel_name…）。
- [ ] `requests-os-columns.tsx`：重设计列（§4.2），加 Tokens/耗时/费用单元格 + 成本明细悬浮 + 行状态色。
- [ ] `RequestDetailDialog.tsx`：加「成本/计费」「时延」区块。
- [ ] `RequestsPage.tsx`：按 Q1 调整与用量分析的关系。
- [ ] `tsc` + build 验证；浏览器实测对比图1/图2。

### 阶段二（Q2/Q3 定后）
- [ ] 迁移 `request_records` 加列 + 网关写路径 + 前端列。

---

## 7. 参考源码（已核对）

- sub2api `UsageLog`：`Wei-Shaw/sub2api` `backend/internal/service/usage_log.go`（字段全集，图1 成本明细来源）。
- new-api 列：`QuantumNous/new-api` `web/default/src/features/usage-logs/components/columns/common-logs-columns.tsx`（时间/令牌/模型/耗时着色/Tokens/费用/详情价目 + IP 列 + 重试链）。
