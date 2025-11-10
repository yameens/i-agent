import { inngest } from "../client";
import { db } from "@/server/db";
import { openaiClient } from "@/lib/openai";
import { buildRAGContext } from "@/lib/rag";
import {
  ClaimParser,
  ParseFailureLogger,
  buildExtractionPrompt,
} from "@/lib/parsers/claim-parser";
import type { Claim } from "@/lib/schemas/claim";

/**
 * Generate human-readable text from structured claim
 */
function generateClaimText(claim: Claim): string {
  const parts: string[] = [];
  
  // Add field type
  parts.push(`[${claim.field}]`);
  
  // Add value
  if (claim.valueNumber !== undefined) {
    const value = claim.unit
      ? `${claim.valueNumber} ${claim.unit}`
      : claim.valueNumber.toString();
    parts.push(value);
  }
  
  if (claim.valueText) {
    parts.push(claim.valueText);
  }
  
  // Add identifiers
  if (claim.skuId) {
    parts.push(`(SKU: ${claim.skuId})`);
  }
  
  if (claim.geoCode) {
    parts.push(`(Region: ${claim.geoCode})`);
  }
  
  // Add raw text if available
  if (claim.rawText) {
    parts.push(`- "${claim.rawText}"`);
  }
  
  return parts.join(" ");
}

export const extractClaims = inngest.createFunction(
  {
    id: "extract-claims",
    name: "Extract Claims",
  },
  { event: "claim/extract" },
  async ({ event, step }) => {
    const { callId, campaignId, transcript } = event.data;

    // Step 1: Fetch campaign and hypotheses
    const campaign = await step.run("fetch-campaign", async () => {
      return db.campaign.findUnique({
        where: { id: campaignId },
        include: {
          hypotheses: true,
        },
      });
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Step 2: Build RAG context from checklist
    const ragContext = await step.run("build-rag-context", async () => {
      return buildRAGContext(campaign.category, transcript);
    });

    // Step 3: Extract claims using GPT-4 with typed schema
    const extractedClaims = await step.run(
      "extract-claims-with-gpt4",
      async () => {
        // Build structured extraction prompt
        const prompt = buildExtractionPrompt({
          transcript,
          hypotheses: campaign.hypotheses.map((h) => ({
            id: h.id,
            question: h.question,
          })),
          ragContext,
          category: campaign.category,
        });

        // Call OpenAI with structured prompt
        const response = await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        });

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("No response from GPT-4");
        }

        // Parse and validate with robust parser
        const parseResult = ClaimParser.parseWithRepair(content);

        if (!parseResult.success) {
          // Log failure for review
          ParseFailureLogger.log({
          timestamp: new Date(),
          callId,
          rawOutput: content,
          error: "error" in parseResult ? parseResult.error : undefined,
          rawData: "rawData" in parseResult ? parseResult.rawData : undefined,
        });

        throw new Error(
          `Failed to parse claims from model output: ${"error" in parseResult ? parseResult.error : "Unknown error"}`
        );
        }

        return parseResult.data.claims;
      }
    );

    // Step 4: Save claims to database with structured fields
    const savedClaims = await step.run("save-claims", async () => {
      const call = await db.call.findUnique({
        where: { id: callId },
        select: { recordingUrl: true },
      });

      const claims = [];

      for (const claim of extractedClaims) {
        // Build evidence URL with timestamp
        const evidenceUrl = call?.recordingUrl
          ? `${call.recordingUrl}#t=${Math.floor(claim.startSec)}`
          : "";

        // Generate human-readable text for backward compatibility
        const humanReadableText = generateClaimText(claim as any);

        const savedClaim = await db.claim.create({
          data: {
            callId,
            hypothesisId: claim.hypothesisId,
            
            // Structured fields
            field: claim.field,
            valueNumber: claim.valueNumber,
            valueText: claim.valueText,
            unit: claim.unit,
            skuId: claim.skuId,
            geoCode: claim.geoCode,
            
            // Legacy text field
            text: humanReadableText,
            
            // Temporal and evidence
            evidenceUrl,
            startSec: claim.startSec,
            endSec: claim.endSec,
            
            // Metadata
            confidence: claim.confidence,
            validated: false,
            rawText: claim.rawText,
            context: claim.context,
          },
        });

        claims.push(savedClaim);
      }

      return claims;
    });

    // Step 5: Trigger validation for hypotheses with enough claims
    const hypothesesToValidate = await step.run(
      "check-validation-threshold",
      async () => {
        const hypothesesWithClaims = await db.hypothesis.findMany({
          where: {
            campaignId,
            status: "PENDING",
          },
          include: {
            _count: {
              select: { claims: true },
            },
          },
        });

        return hypothesesWithClaims.filter((h) => h._count.claims >= 3);
      }
    );

    // Trigger validation for each hypothesis
    for (const hypothesis of hypothesesToValidate) {
      await step.sendEvent(`validate-hypothesis-${hypothesis.id}`, {
        name: "claim/validate",
        data: {
          hypothesisId: hypothesis.id,
          campaignId,
        },
      });
    }

    return {
      success: true,
      callId,
      claimsExtracted: savedClaims.length,
      hypothesesTriggered: hypothesesToValidate.length,
    };
  }
);
