/** 表格列对齐（当前产品统一左对齐）。 */
export type TableColumnAlign = "left" | "right" | "center";

/** 表头/单元格对齐 class；当前固定左对齐。 */
export function tableAlignClass(_align: TableColumnAlign = "left") {
  return "text-left";
}
