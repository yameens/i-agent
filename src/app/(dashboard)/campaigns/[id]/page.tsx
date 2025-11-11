"use client";

import { use } from "react";
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
import { ArrowLeft, Phone, CheckCircle2, TrendingUp, Users } from "lucide-react";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: campaign, isLoading } = trpc.campaign.getById.useQuery({
    id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Link
          href="/campaigns"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Campaign Not Found</CardTitle>
            <CardDescription>
              The campaign you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
               <Button asChild className="bg-brand-600 hover:bg-brand-600/90 text-white">
                 <Link href="/campaigns">Back to Campaigns</Link>
               </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-brand-600 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-950">{campaign.name}</h1>
            <p className="text-muted-foreground mt-1">{campaign.category}</p>
          </div>
          <span
            className={`px-3 py-1 text-sm rounded-full font-medium ${
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
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPITile
          title="Total Calls"
          value={campaign.calls?.length || 0}
          subtitle="completed"
          icon={Phone}
        />
        <KPITile
          title="Hypotheses"
          value={campaign.hypotheses?.length || 0}
          subtitle="being tested"
          icon={Users}
        />
        <KPITile
          title="Active Signals"
          value={0}
          subtitle="this week"
          icon={TrendingUp}
        />
        <KPITile
          title="Panel Size"
          value={0}
          subtitle="contacts"
          icon={CheckCircle2}
        />
      </div>

      {/* Campaign Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-sm text-ink">{campaign.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <p className="text-sm text-ink">{campaign.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-sm text-ink">{campaign.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cadence</p>
              <p className="text-sm text-ink">{(campaign as any).cadence || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-sm text-ink">
                {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full bg-brand-600 hover:bg-brand-600/90 text-white" disabled>
              Add Panel Contacts
            </Button>
            <Button className="w-full" variant="outline" disabled>
              Configure Interview Script
            </Button>
            <Button className="w-full" variant="outline" disabled>
              Set Weekly Schedule
            </Button>
            <Button className="w-full" variant="outline" disabled>
              View Insights
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Panel Details */}
      {(campaign as any).panel && (
        <Card>
          <CardHeader>
            <CardTitle>Panel Configuration</CardTitle>
            <CardDescription>
              Companies and regions targeted for automated retail interviews
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Companies</p>
              <div className="flex flex-wrap gap-2">
                {((campaign as any).panel.companies || []).map((company: string) => (
                  <span
                    key={company}
                    className="px-2 py-1 text-xs bg-muted rounded-md border"
                  >
                    {company}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Regions</p>
              <div className="flex flex-wrap gap-2">
                {((campaign as any).panel.regions || []).map((region: string) => (
                  <span
                    key={region}
                    className="px-2 py-1 text-xs bg-muted rounded-md border"
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Panel Size</p>
              <p className="text-sm text-ink">{(campaign as any).panel.size || 0} targets</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interview Window */}
      {(campaign as any).window && (
        <Card>
          <CardHeader>
            <CardTitle>Interview Window</CardTitle>
            <CardDescription>
              When automated interviews are scheduled to run
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Days</p>
              <div className="flex flex-wrap gap-2">
                {((campaign as any).window.days || []).map((day: string) => (
                  <span
                    key={day}
                    className="px-3 py-1 text-xs bg-brand-600 text-white rounded-md"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Start Time</p>
                <p className="text-sm text-ink">{(campaign as any).window.start || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">End Time</p>
                <p className="text-sm text-ink">{(campaign as any).window.end || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                <p className="text-sm text-ink">{(campaign as any).window.tz || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Launch Campaign */}
      {campaign.status === "DRAFT" && (campaign as any).panel && (campaign as any).window && (
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Launch Weekly Interviews</CardTitle>
            <CardDescription>
              Start automated retail interviews on the configured schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="bg-brand-600 hover:bg-brand-600/90 text-white"
              disabled
            >
              Launch Campaign (Coming Soon)
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will trigger Inngest to schedule weekly interview cycles with your panel
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

