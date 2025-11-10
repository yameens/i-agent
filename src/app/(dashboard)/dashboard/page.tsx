"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function DashboardPage() {
  const { data: campaigns, isLoading } = trpc.campaign.list.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-ink">Campaigns</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-ink">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage your channel-check campaigns
          </p>
        </div>
        <Button asChild className="bg-brand hover:bg-brand/90">
          <Link href="/dashboard/campaigns/new">Create Campaign</Link>
        </Button>
      </div>

      {campaigns && campaigns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No campaigns yet</CardTitle>
            <CardDescription>
              Create your first campaign to start making channel-check calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-brand hover:bg-brand/90">
              <Link href="/dashboard/campaigns/new">Create Your First Campaign</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns?.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/dashboard/campaigns/${campaign.id}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {campaign.category}
                      </CardDescription>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        campaign.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : campaign.status === "DRAFT"
                          ? "bg-gray-100 text-gray-700"
                          : campaign.status === "PAUSED"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{campaign._count.calls} calls</span>
                    <span>{campaign._count.hypotheses} hypotheses</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

