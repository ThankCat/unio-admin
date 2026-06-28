import type { ReactNode } from "react";

/** openstatus 风格 facet 选项（值 + 展示标签，可选自定义渲染）。 */
export interface FacetOption {
  value: string;
  label: string;
  /** 自定义选项渲染（如带颜色的 Badge）。 */
  render?: () => ReactNode;
}

/** 左侧筛选栏的字段定义；目前实现 checkbox（多选 facet）。 */
export interface CheckboxFilterField {
  type: "checkbox";
  /** 对应列 id，用于读取 faceted 计数与设置 column filter。 */
  value: string;
  label: string;
  options: FacetOption[];
  /** 默认展开该 facet。 */
  defaultOpen?: boolean;
}

export type FilterField = CheckboxFilterField;
