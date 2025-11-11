"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KPITile } from "@/components/dashboard/kpi-tile";
import { EvidenceDrawer } from "@/components/dashboard/evidence-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  CheckCircle2,
  Activity,
  FileText,
  Users,
  MapPin,
  Package,
  Phone,
  Clock,
  BarChart3,
} from "lucide-react";

// Dynamic import for recharts (SSR-safe)
const LineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
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

// Mock data for charts (feature flag controlled)
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true" || true; // Default true for demo

const mockWeeklyVelocity = [
  { week: "Week 1", signals: 12 },
  { week: "Week 2", signals: 19 },
  { week: "Week 3", signals: 15 },
  { week: "Week 4", signals: 25 },
  { week: "Week 5", signals: 22 },
  { week: "Week 6", signals: 30 },
];

const mockStockoutsByRegion = [
  { region: "California", count: 8 },
  { region: "Texas", count: 5 },
  { region: "Northeast", count: 12 },
  { region: "Midwest", count: 6 },
  { region: "Southeast", count: 9 },
];

interface Signal {
  id: string;
  claim: string;
  sku?: string;
  geo?: string;
  field?: string;
  confidence: number;
  validated: boolean;
  timestamp: number;
  callId: string;
  phoneNumber: string;
  evidenceUrl?: string;
  hypothesis?: string;
  campaign?: string;
}

export default function InsightsPage() {
  const { data: campaigns, isLoading: isLoadingCampaigns } =
    trpc.campaign.list.useQuery();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: validatedClaims, isLoading: isLoadingClaims } =
    trpc.insight.listValidatedClaims.useQuery(
      { campaignId: selectedCampaignId!, validated: undefined },
      { enabled: !!selectedCampaignId }
    );

  const { data: hypotheses, isLoading: isLoadingHypotheses } =
    trpc.insight.listHypotheses.useQuery(
      { campaignId: selectedCampaignId! },
      { enabled: !!selectedCampaignId }
    );

  // Get transcript for selected signal
  const { data: callDetails, isLoading: isLoadingTranscript } =
    trpc.calls.getById.useQuery(
      { id: selectedSignal?.callId || "" },
      { enabled: !!selectedSignal?.callId }
    );

  // Transform claims into signals
  const signals: Signal[] = useMemo(() => {
    if (!validatedClaims) return [];

    return validatedClaims.map((claim) => ({
      id: claim.id,
      claim: claim.text,
      sku: claim.skuId || undefined,
      geo: claim.geoCode || undefined,
      field: claim.field || undefined,
      confidence: claim.confidence,
      validated: claim.validated,
      timestamp: claim.startSec,
      callId: claim.call.id,
      phoneNumber: claim.call.phoneNumber,
      evidenceUrl: claim.evidenceUrl,
      hypothesis: (claim as any).hypothesis?.question || "N/A",
      campaign: selectedCampaignId || "N/A",
    }));
  }, [validatedClaims, selectedCampaignId]);

  // Calculate KPIs with coverage metrics
  const kpis = useMemo(() => {
    if (!validatedClaims || !hypotheses) {
      return {
        totalInterviews: 0,
        validatedSignals: 0,
        uniqueSkus: 0,
        uniqueGeos: 0,
        panelSize: 0,
      };
    }

    const validatedCount = validatedClaims.filter((c) => c.validated).length;
    const uniqueSkus = new Set(
      validatedClaims.map((c) => c.skuId).filter(Boolean)
    ).size;
    const uniqueGeos = new Set(
      validatedClaims.map((c) => c.geoCode).filter(Boolean)
    ).size;
    const panelSize = new Set(
      validatedClaims.map((c) => c.call.phoneNumber)
    ).size;

    return {
      totalInterviews: panelSize,
      validatedSignals: validatedCount,
      uniqueSkus,
      uniqueGeos,
      panelSize,
    };
  }, [validatedClaims, hypotheses]);

  // Panel health metrics (mock for now)
  const panelHealth = {
    scheduled: 45,
    completed: 38,
    consentRate: 84,
    avgDuration: 8.5,
    retryRate: 12,
  };

  const handleSignalClick = (signal: Signal) => {
    setSelectedSignal(signal);
    setIsDrawerOpen(true);
  };

  const isLoading = isLoadingClaims || isLoadingHypotheses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-brand-950">This Week&apos;s Signals</h1>
        <p className="text-muted-foreground mt-1">
          Validated insights from your retail panel, refreshed weekly
        </p>
      </div>

      {/* Campaign Selector */}
      {isLoadingCampaigns ? (
        <Card>
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
        <Card>
          <CardHeader>
            <CardTitle>No Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8">
              <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground text-center max-w-md">
                You don&apos;t have any campaigns yet. Create a campaign to start
                collecting insights.
              </p>
              <Button className="bg-brand-600 hover:bg-brand-600/90 text-white">
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
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

      {selectedCampaignId && (
        <>
          {/* Main Content + Right Rail */}
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Main Content */}
            <div className="space-y-6">
              {/* KPI Tiles */}
              <div className="grid gap-4 md:grid-cols-3">
                <KPITile
                  title="This Week's Interviews"
                  value={kpis.totalInterviews}
                  subtitle="completed"
                  icon={Phone}
                  isLoading={isLoading}
                />
                <KPITile
                  title="Validated Signals"
                  value={kpis.validatedSignals}
                  subtitle="triangulated"
                  icon={CheckCircle2}
                  isLoading={isLoading}
                />
                <KPITile
                  title="Coverage"
                  value={`${kpis.uniqueSkus}/${kpis.uniqueGeos}`}
                  subtitle="SKUs / Regions"
                  icon={MapPin}
                  isLoading={isLoading}
                />
              </div>

              {/* Charts Row */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Weekly Velocity Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Weekly Velocity Index</CardTitle>
                    <CardDescription>Signal extraction rate over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mockWeeklyVelocity}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="week"
                            tick={{ fontSize: 12 }}
                            stroke="#888"
                          />
                          <YAxis tick={{ fontSize: 12 }} stroke="#888" />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="signals"
                            stroke="#1E2E6E"
                            strokeWidth={2}
                            dot={{ fill: "#1E2E6E", r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {USE_MOCKS && (
                      <p className="text-xs text-muted-foreground mt-2">
                        * Sample data (NEXT_PUBLIC_USE_MOCKS=true)
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Stockouts by Region Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Stockouts by Region</CardTitle>
                    <CardDescription>Regional inventory signals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mockStockoutsByRegion}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="region"
                            tick={{ fontSize: 11 }}
                            stroke="#888"
                            angle={-15}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis tick={{ fontSize: 12 }} stroke="#888" />
                          <Tooltip />
                          <Bar dataKey="count" fill="#1E2E6E" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {USE_MOCKS && (
                      <p className="text-xs text-muted-foreground mt-2">
                        * Sample data (NEXT_PUBLIC_USE_MOCKS=true)
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* This Week's Signals Table */}
              <Card className="bg-muted">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-brand-950">This Week&apos;s Signals</CardTitle>
                      <CardDescription className="mt-1">
                        Click any signal to view timestamped audio evidence
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/api/export/claims?campaignId=${selectedCampaignId}&format=csv&validatedOnly=false`;
                        }}
                      >
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : signals.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground opacity-50 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        No signals yet. Run interviews to collect data.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                            <th className="pb-3 pr-4">Signal</th>
                            <th className="pb-3 pr-4">Hypothesis</th>
                            <th className="pb-3 pr-4">Evidence</th>
                            <th className="pb-3 pr-4">Confidence</th>
                            <th className="pb-3">Campaign</th>
                          </tr>
                        </thead>
                        <tbody>
                          {signals.slice(0, 10).map((signal) => (
                            <tr
                              key={signal.id}
                              className="border-b hover:bg-background/50 cursor-pointer transition-colors"
                              onClick={() => handleSignalClick(signal)}
                            >
                              <td className="py-3 pr-4 text-sm">
                                <div className="max-w-md">
                                  <p className="font-medium text-ink line-clamp-2">
                                    {signal.claim}
                                  </p>
                                  {signal.sku && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      {signal.sku}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-sm text-muted-foreground">
                                {signal.hypothesis}
                              </td>
                              <td className="py-3 pr-4">
                                <button className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {Math.floor(signal.timestamp / 60)}:
                                  {String(Math.floor(signal.timestamp % 60)).padStart(2, "0")}
                                </button>
                              </td>
                              <td className="py-3 pr-4">
                                <Badge
                                  variant="outline"
                                  className={
                                    signal.confidence >= 0.8
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : signal.confidence >= 0.6
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }
                                >
                                  {Math.round(signal.confidence * 100)}%
                                </Badge>
                              </td>
                              <td className="py-3 text-sm text-muted-foreground">
                                {campaigns?.find((c) => c.id === signal.campaign)?.name || "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Rail - Continuous Information */}
            <div className="space-y-6">
              {/* Panel Health */}
              <Card className="bg-muted">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-600" />
                    <CardTitle className="text-lg">Panel Health</CardTitle>
                  </div>
                  <CardDescription>This week&apos;s interview metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Interviews Scheduled</p>
                    <p className="text-2xl font-bold text-ink">{panelHealth.scheduled}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-ink">{panelHealth.completed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Consent Rate</p>
                    <p className="text-2xl font-bold text-ink">{panelHealth.consentRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Duration</p>
                    <p className="text-2xl font-bold text-ink">{panelHealth.avgDuration} min</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Retry Rate</p>
                    <p className="text-2xl font-bold text-ink">{panelHealth.retryRate}%</p>
                  </div>
                </CardContent>
              </Card>

              {/* Coverage */}
              <Card className="bg-muted">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-brand-600" />
                    <CardTitle className="text-lg">Coverage</CardTitle>
                  </div>
                  <CardDescription>Latest week targets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">SKUs</p>
                    </div>
                    <p className="text-xl font-bold text-ink">{kpis.uniqueSkus}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Stores</p>
                    </div>
                    <p className="text-xl font-bold text-ink">{kpis.panelSize}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Regions</p>
                    </div>
                    <p className="text-xl font-bold text-ink">{kpis.uniqueGeos}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Evidence Drawer */}
      <EvidenceDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        signal={selectedSignal}
        transcript={callDetails?.utterances as any}
        isLoadingTranscript={isLoadingTranscript}
      />
    </div>
  );
}
