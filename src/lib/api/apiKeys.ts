import { api } from "@/lib/api/client";

// 与后端 apiKeyDTO 对齐；绝不含 key_hash。
// status: active / disabled / revoked / expired（后端按优先级计算）。
// spend_limit 为 null 表示不限额；spent_total 是迄今累计被扣金额。
export interface ApiKey {
  id: number;
  user_id: number;
  name: string;
  key_prefix: string;
  status: string;
  spend_limit: string | null;
  spent_total: string;
  route_id: number;
  // 令牌级限流（P2-8）：null=继承全局默认，0=不限，>0=具体上限。
  rpm_limit: number | null;
  tpm_limit: number | null;
  rpd_limit: number | null;
  last_used_at: string | null;
  expires_at: string | null;
  disabled_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

// 创建结果：含只展示一次的明文 plaintext。
export interface CreatedApiKey extends ApiKey {
  plaintext: string;
}

// 令牌级限流三维（P2-8）：null=继承全局默认，0=不限，>0=具体上限。
export interface RateLimitsInput {
  rpm: number | null;
  tpm: number | null;
  rpd: number | null;
}

export interface CreateApiKeyInput {
  userId: number;
  name: string;
  // RFC3339，可选过期时间。
  expiresAt?: string | null;
  // 费用上限（十进制字符串），不传/空串表示不限额。
  spendLimit?: string;
  // 线路绑定（必填）：正整数 route id。
  routeId: number;
  // 可选令牌级限流；省略表示三维全继承全局默认。
  rateLimits?: RateLimitsInput;
}

export async function createApiKey(
  input: CreateApiKeyInput,
): Promise<CreatedApiKey> {
  const res = await api.post<{ data: CreatedApiKey }>(
    `/admin/v1/users/${input.userId}/api-keys`,
    {
      name: input.name,
      expires_at: input.expiresAt || undefined,
      spend_limit: input.spendLimit ?? undefined,
      route_id: input.routeId,
      rate_limits: input.rateLimits ?? undefined,
    },
  );
  return res.data.data;
}

// 更新：disabled 启停；spend_limit 设上限（""=清除上限/改为不限额，省略=不变）；
// route_id 换绑线路（正整数；省略=不变，不可清除）。
export interface UpdateApiKeyInput {
  id: number;
  disabled?: boolean;
  spendLimit?: string;
  routeId?: number;
  // 令牌级限流；省略表示不变，传对象即原子替换三维。
  rateLimits?: RateLimitsInput;
}

export async function updateApiKey(input: UpdateApiKeyInput): Promise<ApiKey> {
  const body: Record<string, unknown> = {};
  if (input.disabled !== undefined) body.disabled = input.disabled;
  if (input.spendLimit !== undefined) body.spend_limit = input.spendLimit;
  if (input.routeId !== undefined) body.route_id = input.routeId;
  if (input.rateLimits !== undefined) body.rate_limits = input.rateLimits;
  const res = await api.patch<{ data: ApiKey }>(
    `/admin/v1/api-keys/${input.id}`,
    body,
  );
  return res.data.data;
}

// 永久吊销（不可逆）。
export async function revokeApiKey(id: number): Promise<ApiKey> {
  const res = await api.delete<{ data: ApiKey }>(`/admin/v1/api-keys/${id}`);
  return res.data.data;
}
