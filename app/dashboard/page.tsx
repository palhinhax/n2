"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostsTable } from "@/features/posts/components";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name || session?.user?.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Hello! 👋</div>
            <p className="text-xs text-muted-foreground">
              Start managing your posts below
            </p>
          </CardContent>
        </Card>
      </div>

      <PostsTable />
    </div>
  );
}
