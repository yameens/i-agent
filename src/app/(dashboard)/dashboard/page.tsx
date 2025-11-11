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
import { KPITile } from "@/components/dashboard/kpi-tile";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Phone, CheckCircle2, TrendingUp, Users } from "lucide-react";

export default function DashboardPage() {
  const { data: campaigns, isLoading } = trpc.campaign.list.useQuery();

  // Calculate aggregate KPIs
  const kpis = {
    totalCampaigns: campaigns?.length || 0,
    activeCampaigns:
      campaigns?.filter((c) => c.status === "ACTIVE").length || 0,
    totalCalls: campaigns?.reduce((sum, c) => sum + c._count.calls, 0) || 0,
    totalHypotheses:
      campaigns?.reduce((sum, c) => sum + c._count.hypotheses, 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-brand-950">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage your automated interview campaigns
          </p>
        </div>
        <Button asChild className="bg-brand-600 hover:bg-brand-600/90 text-white">
          <Link href="/dashboard/campaigns/new">Create Campaign</Link>
        </Button>
      </div>

      {/* KPI Tiles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPITile
          title="Total Campaigns"
          value={kpis.totalCampaigns}
          subtitle="all time"
          icon={TrendingUp}
        />
        <KPITile
          title="Active Campaigns"
          value={kpis.activeCampaigns}
          subtitle="currently running"
          icon={CheckCircle2}
        />
        <KPITile
          title="Total Calls"
          value={kpis.totalCalls}
          subtitle="completed"
          icon={Phone}
        />
        <KPITile
          title="Hypotheses"
          value={kpis.totalHypotheses}
          subtitle="being tested"
          icon={Users}
        />
      </div>

      {/* Campaigns List */}
      {campaigns && campaigns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No campaigns yet</CardTitle>
            <CardDescription>
              Create your first campaign to start automated retail interviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Create your first campaign to start automated retail interviews. Configure your panel, set weekly cadence, and collect continuous intelligence.
              </p>
            <Button asChild className="bg-brand-600 hover:bg-brand-600/90 text-white">
                <Link href="/dashboard/campaigns/new">
                  Create Your First Campaign
                </Link>
            </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns?.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/dashboard/campaigns/${campaign.id}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer bg-bg border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-brand-950">
                        {campaign.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {campaign.category}
                      </CardDescription>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
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
