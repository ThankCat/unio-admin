import { api } from "@/lib/api/client";

// 与后端 channelCostMultiplierDTO 对齐（DEC-027：渠道价格倍率）。
// 上游名义成本 = 模型基准价 × 本倍率（DEC-031：以模型基准价为成本基数）。model_id 为 null=渠道默认倍率；非空=对该模型的覆盖（优先于默认）。
// model_external_id / model_display_name 仅逐模型覆盖行由后端 JOIN 带出。
export interface ChannelCostMultiplier {
  id: number;
  channel_id: number;
  model_id: number | null;
  model_external_id: string | null;
  model_display_name: string | null;
  multiplier: string;
  status: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export async function listChannelCostMultipliers(
  channelId: number,
): Promise<ChannelCostMultiplier[]> {
  const res = await api.get<{ data: ChannelCostMultiplier[] }>(
    `/admin/v1/channels/${channelId}/cost-multipliers`,
  );
  return res.data.data;
}

/**
 * 取某渠道对某模型当前生效的价格倍率：优先逐模型覆盖，无则回退渠道默认（model_id=null）。
 * modelId 传 null 时只看渠道默认。
 */
export function pickCurrentChannelCostMultiplier(
  multipliers: ChannelCostMultiplier[],
  modelId: number | null,
): ChannelCostMultiplier | null {
  const now = Date.now();
  const active = (m: ChannelCostMultiplier) => {
    if (m.status !== "enabled") return false;
    if (new Date(m.effective_from).getTime() > now) return false;
    if (m.effective_to && new Date(m.effective_to).getTime() <= now) return false;
    return true;
  };
  const pickLatest = (list: ChannelCostMultiplier[]) =>
    list.length === 0
      ? null
      : list.sort(
          (a, b) =>
            new Date(b.effective_from).getTime() -
            new Date(a.effective_from).getTime(),
        )[0]!;

  if (modelId != null) {
    const override = pickLatest(
      multipliers.filter((m) => m.model_id === modelId && active(m)),
    );
    if (override) return override;
  }
  return pickLatest(multipliers.filter((m) => m.model_id == null && active(m)));
}

/**
 * 找出同一 model_key（默认 modelId=null 或某模型覆盖）下、启用中且窗口与 [from,to) 相交的倍率。
 * 用于新建倍率前「收口旧窗口」确认，避免后端窗口重叠报错。按 effective_from 倒序。
 */
export function findOverlappingChannelCostMultipliers(
  multipliers: ChannelCostMultiplier[],
  modelId: number | null,
  from: string,
  to: string | null,
): ChannelCostMultiplier[] {
  const aFrom = new Date(from).getTime();
  const aTo = to ? new Date(to).getTime() : null;
  return multipliers
    .filter((m) => {
      if (m.status !== "enabled") return false;
      // 同一时间线：默认对默认、覆盖对同一模型覆盖。
      if ((m.model_id ?? null) !== (modelId ?? null)) return false;
      const bFrom = new Date(m.effective_from).getTime();
      const bTo = m.effective_to ? new Date(m.effective_to).getTime() : null;
      const aStartsBeforeBEnds = bTo == null || aFrom < bTo;
      const bStartsBeforeAEnds = aTo == null || bFrom < aTo;
      return aStartsBeforeBEnds && bStartsBeforeAEnds;
    })
    .sort(
      (a, b) =>
        new Date(b.effective_from).getTime() -
        new Date(a.effective_from).getTime(),
    );
}

export interface CreateChannelCostMultiplierInput {
  channelId: number;
  model_id: number | null;
  multiplier: string;
  status: string;
  effective_from: string;
  effective_to: string | null;
}

export async function createChannelCostMultiplier({
  channelId,
  ...body
}: CreateChannelCostMultiplierInput): Promise<ChannelCostMultiplier> {
  const res = await api.post<{ data: ChannelCostMultiplier }>(
    `/admin/v1/channels/${channelId}/cost-multipliers`,
    body,
  );
  return res.data.data;
}

// 倍率不可改数值：只能 PATCH 关闭窗口（改 effective_to）或启停（改 status）。
export interface UpdateChannelCostMultiplierInput {
  id: number;
  status: string;
  effective_to: string | null;
}

export async function updateChannelCostMultiplier({
  id,
  ...body
}: UpdateChannelCostMultiplierInput): Promise<ChannelCostMultiplier> {
  const res = await api.patch<{ data: ChannelCostMultiplier }>(
    `/admin/v1/channel-cost-multipliers/${id}`,
    body,
  );
  return res.data.data;
}
