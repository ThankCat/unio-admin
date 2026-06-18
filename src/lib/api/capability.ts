import { api } from "@/lib/api/client";

// 与后端能力管理 DTO 对齐（M5）。limits 原样透传 JSON（无则为 null）。
// 能力 key 是稳定契约（docs/protocol/CAPABILITY_KEYS.md）；support_level：full/limited/unsupported。
// 阶段 14 起能力不再带 source。

export type SupportLevel = "full" | "limited" | "unsupported";

export interface ModelCapability {
  model_id: number;
  capability_key: string;
  support_level: SupportLevel;
  limits: unknown | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelOverride {
  channel_id: number;
  capability_key: string;
  support_level: SupportLevel;
  limits: unknown | null;
  reason: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---- 能力 key 注册表 ----

export async function listCapabilityKeys(): Promise<string[]> {
  const res = await api.get<{ data: string[] }>("/admin/v1/capability/keys");
  return res.data.data;
}

// ---- 模型能力（手工覆盖，source=manual）----

export async function listModelCapabilities(
  modelId: number,
): Promise<ModelCapability[]> {
  const res = await api.get<{ data: ModelCapability[] }>(
    `/admin/v1/models/${modelId}/capabilities`,
  );
  return res.data.data;
}

// limits 传已解析的 JSON 值或 undefined（省略 → 后端写 NULL）；仅 limited 级别允许 limits。
export interface SetModelCapabilityInput {
  modelId: number;
  capability_key: string;
  support_level: SupportLevel;
  limits?: unknown;
}

export async function setModelCapability({
  modelId,
  capability_key,
  support_level,
  limits,
}: SetModelCapabilityInput): Promise<ModelCapability> {
  const res = await api.put<{ data: ModelCapability }>(
    `/admin/v1/models/${modelId}/capabilities/${encodeURIComponent(capability_key)}`,
    { support_level, limits },
  );
  return res.data.data;
}

export async function deleteModelCapability(
  modelId: number,
  capabilityKey: string,
): Promise<void> {
  await api.delete(
    `/admin/v1/models/${modelId}/capabilities/${encodeURIComponent(capabilityKey)}`,
  );
}

// ---- 渠道收紧（只能减：limited / unsupported）----

export async function listChannelOverrides(
  channelId: number,
): Promise<ChannelOverride[]> {
  const res = await api.get<{ data: ChannelOverride[] }>(
    `/admin/v1/channels/${channelId}/capability-overrides`,
  );
  return res.data.data;
}

export interface SetChannelOverrideInput {
  channelId: number;
  capability_key: string;
  support_level: "limited" | "unsupported";
  limits?: unknown;
  reason?: string;
}

export async function setChannelOverride({
  channelId,
  capability_key,
  support_level,
  limits,
  reason,
}: SetChannelOverrideInput): Promise<ChannelOverride> {
  const res = await api.put<{ data: ChannelOverride }>(
    `/admin/v1/channels/${channelId}/capability-overrides/${encodeURIComponent(capability_key)}`,
    { support_level, limits, reason },
  );
  return res.data.data;
}

export async function deleteChannelOverride(
  channelId: number,
  capabilityKey: string,
): Promise<void> {
  await api.delete(
    `/admin/v1/channels/${channelId}/capability-overrides/${encodeURIComponent(capabilityKey)}`,
  );
}

// ---- models.dev 同步 ----

export interface SyncJob {
  id: number;
  source: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  stats: unknown | null;
  error_text: string | null;
  created_at: string;
}

export interface SyncResult {
  dry_run: boolean;
  feed_models: number;
  upserted: number;
  removed: number;
  capability_hints: number;
  removed_canonical_ids: string[];
  fingerprint: string;
}

export async function listSyncJobs(limit = 20): Promise<SyncJob[]> {
  const res = await api.get<{ data: SyncJob[] }>(
    "/admin/v1/capability/sync-jobs",
    { params: { limit } },
  );
  return res.data.data;
}

export async function triggerSync(dryRun: boolean): Promise<SyncResult> {
  const res = await api.post<{ data: SyncResult }>(
    "/admin/v1/capability/sync-jobs",
    { dry_run: dryRun },
  );
  return res.data.data;
}

// ---- adapter 画像 ----

export interface ProfileDeclaration {
  capability_key: string;
  support_level: SupportLevel;
  limits: unknown | null;
}

export interface AdapterProfile {
  key: string;
  provider: string;
  protocol: string;
  declarations: ProfileDeclaration[];
}

export interface SeedResult {
  model_id: number;
  profile_key: string;
  provider: string;
  protocol: string;
  materialized: number;
}

export async function listAdapterProfiles(): Promise<AdapterProfile[]> {
  const res = await api.get<{ data: AdapterProfile[] }>(
    "/admin/v1/capability/adapter-profiles",
  );
  return res.data.data;
}

export async function materializeAdapterSeed(
  modelId: number,
  profileKey: string,
): Promise<SeedResult> {
  const res = await api.post<{ data: SeedResult }>(
    "/admin/v1/capability/adapter-seed-jobs",
    { model_id: modelId, profile_key: profileKey },
  );
  return res.data.data;
}

// ---- enforce 只读状态 + observe 分布 ----

export interface EnforcementSurface {
  surface: string;
  operation: string;
  env_var: string;
  mode: "observe" | "enforce";
}

export interface Enforcement {
  source: string;
  note: string;
  surfaces: EnforcementSurface[];
}

export async function getEnforcement(): Promise<Enforcement> {
  const res = await api.get<{ data: Enforcement }>(
    "/admin/v1/capability/enforcement",
  );
  return res.data.data;
}

export interface ObserveResult {
  result: string | null;
  total: number;
}

export interface ObserveSummary {
  from: string | null;
  to: string | null;
  results: ObserveResult[];
}

export async function getObserveSummary(params?: {
  from?: string;
  to?: string;
}): Promise<ObserveSummary> {
  const res = await api.get<{ data: ObserveSummary }>(
    "/admin/v1/capability/observe-summary",
    { params: { from: params?.from, to: params?.to } },
  );
  return res.data.data;
}

// ---- 能力自动校正（DESIGN-capability-autocalibration）----

export type EvidenceKind = "strong" | "weak";
export type SuggestionStatus = "pending" | "accepted" | "dismissed";
export type AutocalibrateMode = "off" | "suggest" | "auto";

export const AUTO_CALIBRATE_ACTOR = "auto_calibrate";

export interface SuggestionRationale {
  success_count: number;
  evidence_count: number;
  evidence_ratio: number;
  channel_ids?: number[];
  lookback_hours?: number;
}

export interface CapabilitySuggestion {
  id: number;
  model_id: number;
  capability_key: string;
  suggested_level: SupportLevel;
  evidence_kind: EvidenceKind;
  rationale: SuggestionRationale;
  status: SuggestionStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export async function listCapabilitySuggestions(
  status: SuggestionStatus = "pending",
): Promise<CapabilitySuggestion[]> {
  const res = await api.get<{ data: CapabilitySuggestion[] }>(
    "/admin/v1/capability/suggestions",
    { params: { status } },
  );
  return res.data.data;
}

export async function acceptCapabilitySuggestion(
  modelId: number,
  capabilityKey: string,
): Promise<ModelCapability> {
  const res = await api.post<{ data: ModelCapability }>(
    `/admin/v1/models/${modelId}/capability-suggestions/${encodeURIComponent(capabilityKey)}/accept`,
  );
  return res.data.data;
}

export async function dismissCapabilitySuggestion(
  modelId: number,
  capabilityKey: string,
): Promise<void> {
  await api.post(
    `/admin/v1/models/${modelId}/capability-suggestions/${encodeURIComponent(capabilityKey)}/dismiss`,
  );
}

export async function getModelAutocalibrateMode(
  modelId: number,
): Promise<AutocalibrateMode> {
  const res = await api.get<{ data: { mode: AutocalibrateMode } }>(
    `/admin/v1/models/${modelId}/capability-autocalibrate`,
  );
  return res.data.data.mode;
}

export async function setModelAutocalibrateMode(
  modelId: number,
  mode: AutocalibrateMode,
): Promise<AutocalibrateMode> {
  const res = await api.put<{ data: { mode: AutocalibrateMode } }>(
    `/admin/v1/models/${modelId}/capability-autocalibrate`,
    { mode },
  );
  return res.data.data.mode;
}
