// capability limits 的纯展示与解析工具，模型能力 / 渠道收紧弹窗共用。

// formatLimits 把 limits JSON 值渲染成紧凑字符串用于展示与表单回填；null/undefined → 空串。
export function formatLimits(limits: unknown): string {
  if (limits == null) return "";
  return JSON.stringify(limits);
}

// parseLimitsInput 把表单 limits 文本解析成 JSON 值；空串返回 undefined（省略 → 后端写 NULL）。
// 调用方应先校验合法性；这里非空即按 JSON 解析。
export function parseLimitsInput(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  return JSON.parse(trimmed);
}
