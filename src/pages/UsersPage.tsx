import { getUsersOpsTable } from "@/lib/api/customerOps";
import { ServerDataTable } from "@/components/openstatus-table";
import {
  userOsColumns,
  USER_OS_COLUMN_LABELS,
} from "@/components/openstatus-table/users-os-columns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCustomerServerTable } from "@/hooks/useCustomerServerTable";

export function UsersPage() {
  const table = useCustomerServerTable({
    queryKey: "users-ops",
    fetch: getUsersOpsTable,
    defaultSort: { id: "consumption", desc: true },
  });

  return (
    <div className="flex flex-col gap-4">
      {table.query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{(table.query.error as Error).message}</AlertDescription>
        </Alert>
      ) : (
        <ServerDataTable
          storageKey="users"
          columns={userOsColumns()}
          data={table.items}
          columnLabels={USER_OS_COLUMN_LABELS}
          total={table.total}
          page={table.page}
          pageCount={table.pageCount}
          onPageChange={table.setPage}
          sorting={table.sorting}
          onSortingChange={table.setSorting}
          getRowId={(r) => String(r.id)}
          loading={table.query.isPending}
          refetching={table.query.isFetching && !table.query.isPending}
          emptyMessage="暂无用户"
          searchValue={table.searchInput}
          onSearchChange={table.onSearchChange}
          searchPlaceholder="搜索邮箱 / 昵称"
          chips={table.chips}
          onClearChips={table.resetFilters}
        />
      )}
    </div>
  );
}
