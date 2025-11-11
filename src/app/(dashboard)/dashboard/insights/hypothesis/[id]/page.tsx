"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function HypothesisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: hypothesis, isLoading } = trpc.insight.getHypothesis.useQuery({
    id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  if (!hypothesis) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-ink">Hypothesis Not Found</h1>
        <Button asChild>
          <Link href="/dashboard/insights">Back to Insights</Link>
        </Button>
      </div>
    );
  }

  const statusColor = {
    PENDING: "bg-gray-100 text-gray-700",
    VALIDATED: "bg-green-100 text-green-700",
    INVALIDATED: "bg-red-100 text-red-700",
    INCONCLUSIVE: "bg-yellow-100 text-yellow-700",
  }[hypothesis.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink">Hypothesis Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Campaign:{" "}
            <Link
              href={`/dashboard/campaigns/${hypothesis.campaign.id}`}
              className="text-brand hover:underline"
            >
              {hypothesis.campaign.name}
            </Link>
          </p>
        </div>
        <Badge className={statusColor}>{hypothesis.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{hypothesis.question}</p>
        </CardContent>
      </Card>

      {hypothesis.conclusion && (
        <Card>
          <CardHeader>
            <CardTitle>Conclusion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{hypothesis.conclusion}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Supporting Signals ({hypothesis.claims.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hypothesis.claims.map((claim) => (
              <div
                key={claim.id}
                className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium flex-1">{claim.text}</p>
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
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="space-x-4">
                    <span>
                      From:{" "}
                      <Link
                        href={`/dashboard/calls/${claim.call.id}`}
                        className="text-brand hover:underline"
                      >
                        {claim.call.phoneNumber}
                      </Link>
                    </span>
                    <span>
                      {claim.call.completedAt
                        ? new Date(claim.call.completedAt).toLocaleDateString()
                        : "In progress"}
                    </span>
                  </div>
                  <a
                    href={claim.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    Listen to Evidence →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

