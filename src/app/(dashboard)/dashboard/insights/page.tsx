"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export default function InsightsPage() {
  const { data: campaigns } = trpc.campaign.list.useQuery();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );

  const { data: hypotheses } = trpc.insight.listHypotheses.useQuery(
    { campaignId: selectedCampaignId! },
    { enabled: !!selectedCampaignId }
  );

  const { data: validatedClaims } = trpc.insight.listValidatedClaims.useQuery(
    { campaignId: selectedCampaignId!, validated: true },
    { enabled: !!selectedCampaignId }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Insights</h1>
        <p className="text-muted-foreground mt-1">
          View validated claims and hypothesis analysis
        </p>
      </div>

      {/* Campaign Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {campaigns?.map((campaign) => (
              <Button
                key={campaign.id}
                variant={
                  selectedCampaignId === campaign.id ? "default" : "outline"
                }
                className={
                  selectedCampaignId === campaign.id
                    ? "bg-brand hover:bg-brand/90"
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

      {selectedCampaignId && (
        <>
          {/* Hypotheses Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Hypotheses Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {hypotheses && hypotheses.length > 0 ? (
                <div className="space-y-4">
                  {hypotheses.map((hypothesis) => (
                    <Link
                      key={hypothesis.id}
                      href={`/dashboard/insights/hypothesis/${hypothesis.id}`}
                    >
                      <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium">{hypothesis.question}</h3>
                          <Badge
                            className={
                              hypothesis.status === "VALIDATED"
                                ? "bg-green-100 text-green-700"
                                : hypothesis.status === "INVALIDATED"
                                ? "bg-red-100 text-red-700"
                                : hypothesis.status === "INCONCLUSIVE"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }
                          >
                            {hypothesis.status}
                          </Badge>
                        </div>
                        {hypothesis.conclusion && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {hypothesis.conclusion.split("\n")[0]}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{hypothesis._count.claims} claims</span>
                          <span className="text-brand hover:underline">
                            View details →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No hypotheses found for this campaign.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Validated Claims Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Validated Claims</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = `/api/export/claims?campaignId=${selectedCampaignId}&format=csv&validatedOnly=true`;
                    }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = `/api/export/claims?campaignId=${selectedCampaignId}&format=json&validatedOnly=true`;
                    }}
                  >
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {validatedClaims && validatedClaims.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim</TableHead>
                      <TableHead>Hypothesis</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Evidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validatedClaims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="max-w-md">
                          {claim.text}
                        </TableCell>
                        <TableCell>
                          {claim.hypothesis ? (
                            <Link
                              href={`/dashboard/insights/hypothesis/${claim.hypothesis.id}`}
                              className="text-brand hover:underline text-sm"
                            >
                              {claim.hypothesis.question}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              N/A
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              claim.confidence >= 0.8
                                ? "border-green-500 text-green-700"
                                : claim.confidence >= 0.6
                                ? "border-yellow-500 text-yellow-700"
                                : "border-gray-500 text-gray-700"
                            }
                          >
                            {(claim.confidence * 100).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/calls/${claim.call.id}`}
                            className="text-brand hover:underline text-sm"
                          >
                            {claim.call.phoneNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <a
                            href={claim.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand hover:underline text-sm"
                          >
                            Listen
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">
                  No validated claims yet. Claims will appear here after
                  triangulation across ≥3 calls.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

