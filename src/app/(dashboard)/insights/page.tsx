"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { TrendingUp, Activity, Package } from "lucide-react";

// Dynamic import for recharts (SSR-safe)
const LineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
);
const AreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { ssr: false }
);
const Line = dynamic(
  () => import("recharts").then((mod) => mod.Line),
  { ssr: false }
);
const Bar = dynamic(
  () => import("recharts").then((mod) => mod.Bar),
  { ssr: false }
);
const Area = dynamic(
  () => import("recharts").then((mod) => mod.Area),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

// Mock data (aligns with current 2025 retail patterns)
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

const mockWeekly = [
  { week: "2025-09-08", velocity: 0.98, promo: 14.2, stockouts: 4.8, bopis: 9.6, returns: 8.1 },
  { week: "2025-09-15", velocity: 1.01, promo: 15.5, stockouts: 4.6, bopis: 9.7, returns: 8.0 },
  { week: "2025-09-22", velocity: 1.02, promo: 16.0, stockouts: 4.5, bopis: 9.9, returns: 8.2 },
  { week: "2025-09-29", velocity: 1.04, promo: 17.1, stockouts: 4.3, bopis: 10.1, returns: 8.0 },
  { week: "2025-10-06", velocity: 1.05, promo: 18.2, stockouts: 4.2, bopis: 10.3, returns: 7.9 },
  { week: "2025-10-13", velocity: 1.06, promo: 19.0, stockouts: 4.1, bopis: 10.4, returns: 7.8 },
  { week: "2025-10-20", velocity: 1.07, promo: 20.3, stockouts: 4.0, bopis: 10.5, returns: 7.7 },
  { week: "2025-10-27", velocity: 1.09, promo: 21.5, stockouts: 3.9, bopis: 10.6, returns: 7.7 },
];

const mockTopMovers = [
  { sku: "Matcha-12oz", deltaWoW: "+12.4%", regions: 4 },
  { sku: "ColdBrew-Pack6", deltaWoW: "+9.7%", regions: 6 },
  { sku: "ProteinBar-Choc", deltaWoW: "+6.1%", regions: 5 },
];

const mockCoverage = [
  { metric: "Stores Called", value: "128" },
  { metric: "Regions", value: "7" },
  { metric: "Interview Compliance", value: "86%" },
];

export default function InsightsPage() {
  const { data: campaigns, isLoading: isLoadingCampaigns } =
    trpc.campaign.list.useQuery();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );

  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-brand-950">This Week&apos;s Signals</h1>
          <p className="text-muted-foreground mt-1">
            Validated insights from your retail panel, refreshed weekly
          </p>
        </div>

        {/* Campaign Selector */}
        {isLoadingCampaigns ? (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Select Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : !campaigns || campaigns.length === 0 ? (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>No Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-8">
                <Activity className="h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  You don&apos;t have any campaigns yet. Create a campaign to start
                  collecting insights.
                </p>
                <Button className="bg-brand-600 hover:bg-brand-600/90 text-white" asChild>
                  <Link href="/campaigns/new">Create Campaign</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Select Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map((campaign) => (
                  <Button
                    key={campaign.id}
                    variant={
                      selectedCampaignId === campaign.id ? "default" : "outline"
                    }
                    className={
                      selectedCampaignId === campaign.id
                        ? "bg-brand-600 hover:bg-brand-600/90 text-white"
                        : ""
                    }
                    onClick={() => setSelectedCampaignId(campaign.id)}
                  >
                    {campaign.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Section - Only show if mocks enabled or campaign selected */}
        {(USE_MOCKS || selectedCampaignId) && (
          <>
            {/* Four Charts Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Velocity Index (Line Chart) */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg text-brand-950">Velocity Index</CardTitle>
                  <CardDescription>Unit velocity vs baseline 1.00</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockWeekly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 11 }}
                          stroke="#888"
                          angle={-15}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          stroke="#888"
                          domain={[0.95, 1.15]}
                        />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="velocity"
                          stroke="#1E2E6E"
                          strokeWidth={2}
                          dot={{ fill: "#1E2E6E", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {USE_MOCKS && (
                    <p className="text-xs text-muted-foreground mt-2">
                      * Mock data (NEXT_PUBLIC_USE_MOCKS=true)
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Promo Depth % (Bar Chart) */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg text-brand-950">Promo Depth %</CardTitle>
                  <CardDescription>Average discount depth (peaks Q4)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockWeekly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 11 }}
                          stroke="#888"
                          angle={-15}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 12 }} stroke="#888" />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Bar dataKey="promo" fill="#1E2E6E" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {USE_MOCKS && (
                    <p className="text-xs text-muted-foreground mt-2">
                      * Mock data (NEXT_PUBLIC_USE_MOCKS=true)
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Stockout Rate % (Area Chart) */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg text-brand-950">Stockout Rate %</CardTitle>
                  <CardDescription>3–6% typical for CPG categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockWeekly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 11 }}
                          stroke="#888"
                          angle={-15}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 12 }} stroke="#888" />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Area
                          type="monotone"
                          dataKey="stockouts"
                          stroke="#1E2E6E"
                          fill="#1E2E6E"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {USE_MOCKS && (
                    <p className="text-xs text-muted-foreground mt-2">
                      * Mock data (NEXT_PUBLIC_USE_MOCKS=true)
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* BOPIS Share % (Line Chart) */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg text-brand-950">BOPIS Share %</CardTitle>
                  <CardDescription>~10% of e-com orders in NA</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockWeekly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 11 }}
                          stroke="#888"
                          angle={-15}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 12 }} stroke="#888" />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Line
                          type="monotone"
                          dataKey="bopis"
                          stroke="#1E2E6E"
                          strokeWidth={2}
                          dot={{ fill: "#1E2E6E", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {USE_MOCKS && (
                    <p className="text-xs text-muted-foreground mt-2">
                      * Mock data (NEXT_PUBLIC_USE_MOCKS=true)
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Two Small Tables */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top Movers Table */}
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-brand-600" />
                    <CardTitle className="text-lg text-brand-950">Top Movers</CardTitle>
                  </div>
                  <CardDescription>SKUs with highest velocity changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                          <th className="pb-3 pr-4">SKU</th>
                          <th className="pb-3 pr-4">ΔVelocity WoW</th>
                          <th className="pb-3">Region Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockTopMovers.map((mover) => (
                          <tr key={mover.sku} className="border-b">
                            <td className="py-3 pr-4 text-sm font-medium text-ink">
                              {mover.sku}
                            </td>
                            <td className="py-3 pr-4 text-sm text-green-600 font-medium">
                              {mover.deltaWoW}
                            </td>
                            <td className="py-3 text-sm text-muted-foreground">
                              {mover.regions}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {USE_MOCKS && (
                    <p className="text-xs text-muted-foreground mt-3">
                      * Mock data (NEXT_PUBLIC_USE_MOCKS=true)
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Coverage Table */}
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-brand-600" />
                    <CardTitle className="text-lg text-brand-950">Coverage</CardTitle>
                  </div>
                  <CardDescription>Panel reach and compliance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockCoverage.map((item) => (
                      <div
                        key={item.metric}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm text-muted-foreground">
                          {item.metric}
                        </span>
                        <span className="text-lg font-bold text-ink">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  {USE_MOCKS && (
                    <p className="text-xs text-muted-foreground mt-3">
                      * Mock data (NEXT_PUBLIC_USE_MOCKS=true)
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Empty State - Show if no mocks and no campaign selected */}
        {!USE_MOCKS && !selectedCampaignId && campaigns && campaigns.length > 0 && (
          <Card className="bg-white">
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Activity className="h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Select a campaign above to view insights and signals.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
