import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ActivityIcon, ServerIcon } from "lucide-react";
import { api } from "@/lib/api/client";
import { listProviders } from "@/lib/api/providers";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPage() {
  const health = useQuery({
    queryKey: ["healthz"],
    queryFn: async () => {
      const res = await api.get<{ status: string }>("/healthz");
      return res.data;
    },
  });

  // 只取计数：page_size=1 拉一条，读 meta.total。
  // queryKey 以 "providers" 开头，provider 增改后的 invalidate(["providers"]) 也会刷新它。
  const providers = useQuery({
    queryKey: ["providers", { page: 1, pageSize: 1 }],
    queryFn: () => listProviders({ page: 1, pageSize: 1 }),
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>后端状态</CardTitle>
          <CardDescription>服务端 /healthz 探活</CardDescription>
          <CardAction>
            <ActivityIcon className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {health.isPending ? (
            <Skeleton className="h-5 w-16 rounded-full" />
          ) : health.isError ? (
            <Badge variant="destructive">无法连接</Badge>
          ) : (
            <Badge variant="secondary">{health.data.status}</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>服务商</CardTitle>
          <CardDescription>已接入上游服务商</CardDescription>
          <CardAction>
            <ServerIcon className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {providers.isPending ? (
            <Skeleton className="h-8 w-12" />
          ) : providers.isError ? (
            <Badge variant="destructive">加载失败</Badge>
          ) : (
            <Link
              to="/providers"
              className="text-2xl font-semibold tracking-tight tabular-nums hover:underline"
            >
              {providers.data.total}
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
