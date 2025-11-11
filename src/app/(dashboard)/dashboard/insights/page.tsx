"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPITile } from "@/components/dashboard/kpi-tile";
import { SignalsTable, Signal } from "@/components/dashboard/signals-table";
import { EvidenceDrawer } from "@/components/dashboard/evidence-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Activity,
  FileText,
  Users,
  MapPin,
  Package,
} from "lucide-react";

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
    }));
  }, [validatedClaims]);

  // Calculate KPIs with coverage metrics
  const kpis = useMemo(() => {
    if (!validatedClaims || !hypotheses) {
      return {
        totalSignals: 0,
        validatedSignals: 0,
        avgConfidence: 0,
        hypothesesValidated: 0,
        uniqueSkus: 0,
        uniqueGeos: 0,
        panelSize: 0,
      };
    }

    const validatedCount = validatedClaims.filter((c) => c.validated).length;
    const avgConfidence =
      validatedClaims.reduce((sum, c) => sum + c.confidence, 0) /
      (validatedClaims.length || 1);
    const hypothesesValidatedCount = hypotheses.filter(
      (h) => h.status === "VALIDATED"
    ).length;

    // Coverage metrics
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
      totalSignals: validatedClaims.length,
      validatedSignals: validatedCount,
      avgConfidence: avgConfidence * 100,
      hypothesesValidated: hypothesesValidatedCount,
      uniqueSkus,
      uniqueGeos,
      panelSize,
    };
  }, [validatedClaims, hypotheses]);

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
          {/* Panel Health & Coverage */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPITile
              title="Panel Health"
              value={kpis.panelSize}
              subtitle="active contacts this week"
              icon={Users}
              isLoading={isLoading}
              className="bg-muted"
            />
            <KPITile
              title="Coverage: SKUs"
              value={kpis.uniqueSkus}
              subtitle="products tracked"
              icon={Package}
              isLoading={isLoading}
              className="bg-muted"
            />
            <KPITile
              title="Coverage: Regions"
              value={kpis.uniqueGeos}
              subtitle="geographies covered"
              icon={MapPin}
              isLoading={isLoading}
              className="bg-muted"
            />
            <KPITile
              title="Consistency Score"
              value={`${kpis.avgConfidence.toFixed(0)}%`}
              subtitle="avg confidence"
              icon={TrendingUp}
              isLoading={isLoading}
              className="bg-muted"
            />
          </div>

          {/* This Week's Signals Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <KPITile
              title="This Week's Signals"
              value={kpis.totalSignals}
              subtitle="extracted from interviews"
              icon={Activity}
              isLoading={isLoading}
            />
            <KPITile
              title="Validated Signals"
              value={kpis.validatedSignals}
              subtitle="triangulated across sources"
              icon={CheckCircle2}
              isLoading={isLoading}
            />
            <KPITile
              title="Trend Movements"
              value={kpis.hypothesesValidated}
              subtitle="hypotheses confirmed"
              icon={AlertCircle}
              isLoading={isLoading}
            />
          </div>

          {/* Signals Table */}
          <Card className="bg-muted">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-brand-950">Evidence Drawer</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click any signal to view timestamped audio evidence and transcript
                  </p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/api/export/claims?campaignId=${selectedCampaignId}&format=json&validatedOnly=false`;
                    }}
                  >
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SignalsTable
                signals={signals}
                onSignalClick={handleSignalClick}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Hypotheses Summary */}
          {hypotheses && hypotheses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Hypotheses Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hypotheses.map((hypothesis) => (
                    <a
                      key={hypothesis.id}
                      href={`/dashboard/insights/hypothesis/${hypothesis.id}`}
                      className="block"
                    >
                      <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-bg">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-ink">
                            {hypothesis.question}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              hypothesis.status === "VALIDATED"
                                ? "bg-green-100 text-green-700"
                                : hypothesis.status === "INVALIDATED"
                                ? "bg-red-100 text-red-700"
                                : hypothesis.status === "INCONCLUSIVE"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {hypothesis.status}
                          </span>
                        </div>
                        {hypothesis.conclusion && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {hypothesis.conclusion}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{hypothesis._count.claims} claims</span>
                          <span className="text-brand hover:underline">
                            View details →
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
            </CardContent>
          </Card>
          )}
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
