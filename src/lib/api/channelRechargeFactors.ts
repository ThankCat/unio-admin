import { api } from "@/lib/api/client";

// 与后端 channelRechargeFactorDTO 对齐（DEC-027：渠道充值倍率）。
// 渠道真实成本 = 上游名义成本 × 本充值倍率。factor = 每 1 单位上游名义额度折合多少结算币种真实钱
// （已把汇率 + 充值优惠折进去）。账户级、无 model 维度。
export interface ChannelRechargeFactor {
  id: number;
  channel_id: number;
  factor: string;
  status: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export async function listChannelRechargeFactors(
  channelId: number,
): Promise<ChannelRechargeFactor[]> {
  const res = await api.get<{ data: ChannelRechargeFactor[] }>(
    `/admin/v1/channels/${channelId}/recharge-factors`,
  );
  return res.data.data;
}

/** 取某渠道当前生效中的充值倍率（enabled 且在生效窗口内）；未配置返回 null（结算按 1.0）。 */
export function pickCurrentChannelRechargeFactor(
  factors: ChannelRechargeFactor[],
): ChannelRechargeFactor | null {
  const now = Date.now();
  const candidates = factors.filter((f) => {
    if (f.status !== "enabled") return false;
    if (new Date(f.effective_from).getTime() > now) return false;
    if (f.effective_to && new Date(f.effective_to).getTime() <= now) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  return candidates.sort(
    (a, b) =>
      new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime(),
  )[0]!;
}

/** 找出启用中且窗口与 [from,to) 相交的充值倍率（半开区间），用于新建前收口旧窗口确认。按 effective_from 倒序。 */
export function findOverlappingChannelRechargeFactors(
  factors: ChannelRechargeFactor[],
  from: string,
  to: string | null,
): ChannelRechargeFactor[] {
  const aFrom = new Date(from).getTime();
  const aTo = to ? new Date(to).getTime() : null;
  return factors
    .filter((f) => {
      if (f.status !== "enabled") return false;
      const bFrom = new Date(f.effective_from).getTime();
      const bTo = f.effective_to ? new Date(f.effective_to).getTime() : null;
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

export interface CreateChannelRechargeFactorInput {
  channelId: number;
  factor: string;
  status: string;
  effective_from: string;
  effective_to: string | null;
}

export async function createChannelRechargeFactor({
  channelId,
  ...body
}: CreateChannelRechargeFactorInput): Promise<ChannelRechargeFactor> {
  const res = await api.post<{ data: ChannelRechargeFactor }>(
    `/admin/v1/channels/${channelId}/recharge-factors`,
    body,
  );
  return res.data.data;
}

export interface UpdateChannelRechargeFactorInput {
  id: number;
  status: string;
  effective_to: string | null;
}

export async function updateChannelRechargeFactor({
  id,
  ...body
}: UpdateChannelRechargeFactorInput): Promise<ChannelRechargeFactor> {
  const res = await api.patch<{ data: ChannelRechargeFactor }>(
    `/admin/v1/channel-recharge-factors/${id}`,
    body,
  );
  return res.data.data;
}
