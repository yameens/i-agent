import { db } from "@/server/db";

export interface ExportableClaim {
  claimText: string;
  hypothesisQuestion: string;
  hypothesisStatus: string;
  confidence: number;
  validated: boolean;
  phoneNumber: string;
  callCompletedAt: string;
  evidenceUrl: string;
  timestamp: number;
}

/**
 * Fetch exportable claims for a campaign
 */
export async function getExportableClaims(
  campaignId: string,
  validatedOnly: boolean = true
): Promise<ExportableClaim[]> {
  const claims = await db.claim.findMany({
    where: {
      call: {
        campaignId,
      },
      validated: validatedOnly ? true : undefined,
    },
    include: {
      call: {
        select: {
          phoneNumber: true,
          completedAt: true,
        },
      },
      hypothesis: {
        select: {
          question: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return claims.map((claim: any) => ({
    claimText: claim.text,
    hypothesisQuestion: claim.hypothesis?.question || "N/A",
    hypothesisStatus: claim.hypothesis?.status || "N/A",
    confidence: claim.confidence,
    validated: claim.validated,
    phoneNumber: claim.call.phoneNumber,
    callCompletedAt: claim.call.completedAt?.toISOString() || "N/A",
    evidenceUrl: claim.evidenceUrl,
    timestamp: claim.startSec,
  }));
}

/**
 * Convert claims to CSV format
 */
export function claimsToCSV(claims: ExportableClaim[]): string {
  const headers = [
    "Claim",
    "Hypothesis",
    "Status",
    "Confidence",
    "Validated",
    "Phone Number",
    "Call Completed",
    "Evidence URL",
    "Timestamp",
  ];

  const rows = claims.map((claim) => [
    `"${claim.claimText.replace(/"/g, '""')}"`,
    `"${claim.hypothesisQuestion.replace(/"/g, '""')}"`,
    claim.hypothesisStatus,
    claim.confidence.toFixed(2),
    claim.validated ? "Yes" : "No",
    claim.phoneNumber,
    claim.callCompletedAt,
    claim.evidenceUrl,
    claim.timestamp.toFixed(1),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Convert claims to JSON format
 */
export function claimsToJSON(claims: ExportableClaim[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      claimCount: claims.length,
      claims,
    },
    null,
    2
  );
}

