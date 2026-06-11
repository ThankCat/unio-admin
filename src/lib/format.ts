// 价格/时间相关的纯展示与转换工具，成本价与售价弹窗共用。

// 去掉十进制字符串的多余尾零："0.2700000000" → "0.27"，"1.0000000000" → "1"。
export function trimDecimal(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

// datetime-local 值（本地时区，无时区信息）→ RFC3339（UTC）。
export function localToRFC3339(local: string): string {
  return new Date(local).toISOString();
}

// RFC3339 → datetime-local 值（按本地时区，截到分钟）。
export function rfc3339ToLocal(rfc: string | null): string {
  if (!rfc) return "";
  const d = new Date(rfc);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

// RFC3339 → 本地可读时间串。
export function formatDateTime(rfc: string): string {
  return new Date(rfc).toLocaleString();
}
