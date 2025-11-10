"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: call, isLoading } = trpc.call.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-ink">Call Not Found</h1>
        <Button asChild>
          <Link href="/dashboard/calls">Back to Calls</Link>
        </Button>
      </div>
    );
  }

  const statusColor = {
    QUEUED: "bg-gray-100 text-gray-700",
    RINGING: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    NO_ANSWER: "bg-orange-100 text-orange-700",
  }[call.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink">Call Details</h1>
          <p className="text-muted-foreground mt-1">
            Campaign:{" "}
            <Link
              href={`/dashboard/campaigns/${call.campaign.id}`}
              className="text-brand hover:underline"
            >
              {call.campaign.name}
            </Link>
          </p>
        </div>
        <Badge className={statusColor}>{call.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Call Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone Number:</span>
              <span className="font-medium">{call.phoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">
                {call.duration ? `${call.duration}s` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consent Given:</span>
              <span className="font-medium">
                {call.consentGiven ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started:</span>
              <span className="font-medium">
                {call.startedAt
                  ? new Date(call.startedAt).toLocaleString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-medium">
                {call.completedAt
                  ? new Date(call.completedAt).toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Utterances:</span>
              <span className="font-medium">{call.utterances.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claims Extracted:</span>
              <span className="font-medium">{call.claims.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validated Claims:</span>
              <span className="font-medium">
                {call.claims.filter((c) => c.validated).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {call.recordingUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <audio controls className="w-full">
              <source src={call.recordingUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </CardContent>
        </Card>
      )}

      {call.transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {call.utterances.length > 0 ? (
                call.utterances.map((utterance) => (
                  <div
                    key={utterance.id}
                    className={`p-3 rounded-lg ${
                      utterance.speaker === "AI"
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : "bg-gray-50 border-l-4 border-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {utterance.speaker === "AI" ? "AI" : "HUMAN"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(utterance.timestamp / 60)}:
                        {String(Math.floor(utterance.timestamp % 60)).padStart(
                          2,
                          "0"
                        )}
                      </span>
                    </div>
                    <p className="text-sm">{utterance.text}</p>
                    {utterance.confidence && (
                      <span className="text-xs text-muted-foreground">
                        Confidence: {(utterance.confidence * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {call.transcript}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {call.claims.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {call.claims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium flex-1">{claim.text}</p>
                    <Badge
                      className={
                        claim.validated
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {claim.validated ? "Validated" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Confidence: {(claim.confidence * 100).toFixed(1)}%
                    </span>
                    <a
                      href={claim.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      View Evidence
                    </a>
                  </div>
                  {claim.hypothesis && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Hypothesis: {claim.hypothesis.question}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

