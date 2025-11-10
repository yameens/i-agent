import { inngest } from "../client";
import { db } from "@/server/db";
import { openaiClient } from "@/lib/openai";
import { NonRetriableError } from "inngest";

export const validateClaim = inngest.createFunction(
  {
    id: "validate-claim",
    name: "Validate Claim (Triangulation)",
    retries: 3,
    idempotency: "event.data.hypothesisId", // Use hypothesisId for idempotency
    concurrency: {
      limit: 2, // Max 2 concurrent validations
    },
    debounce: {
      // Debounce to avoid multiple validations for same hypothesis
      key: "event.data.hypothesisId",
      period: "5s",
    },
  },
  { event: "claim/validate" },
  async ({ event, step }) => {
    const { hypothesisId, campaignId } = event.data;

    // Step 1: Fetch hypothesis with all claims (idempotency check)
    const hypothesis = await step.run("fetch-hypothesis", async () => {
      return db.hypothesis.findUnique({
        where: { id: hypothesisId },
        include: {
          claims: {
            include: {
              call: {
                select: {
                  id: true,
                  phoneNumber: true,
                  completedAt: true,
                },
              },
            },
            orderBy: {
              confidence: "desc",
            },
          },
        },
      });
    });

    if (!hypothesis) {
      throw new NonRetriableError(`Hypothesis ${hypothesisId} not found`);
    }

    // Idempotency guard: Skip if already validated
    if (hypothesis.status !== "PENDING") {
      return {
        success: true,
        hypothesisId,
        status: hypothesis.status,
        skipped: true,
        reason: `Hypothesis already ${hypothesis.status.toLowerCase()}`,
        claimsAnalyzed: hypothesis.claims.length,
      };
    }

    // Check minimum claims threshold
    if (hypothesis.claims.length < 3) {
      return {
        success: false,
        hypothesisId,
        skipped: true,
        message: "Not enough claims for triangulation (minimum 3 required)",
        claimsAnalyzed: hypothesis.claims.length,
      };
    }

    // Check claims are from different calls (triangulation requirement)
    const uniqueCalls = new Set(hypothesis.claims.map((c) => c.call.id));
    if (uniqueCalls.size < 3) {
      return {
        success: false,
        hypothesisId,
        skipped: true,
        message: `Claims must come from at least 3 different calls (found ${uniqueCalls.size})`,
        claimsAnalyzed: hypothesis.claims.length,
      };
    }

    // Step 2: Analyze claim consistency using GPT-4 with retries
    const analysis = await step.run(
      "analyze-consistency",
      async () => {
        const systemPrompt = `You are an expert analyst evaluating the consistency and validity of claims from multiple independent sources.

Your task:
1. Analyze claims from at least 3 different channel-check calls
2. Determine if the claims are consistent and mutually supportive (triangulation)
3. Identify any contradictions or inconsistencies
4. Provide an overall validation status: VALIDATED, INVALIDATED, or INCONCLUSIVE
5. Write a detailed conclusion summarizing the findings

Validation criteria:
- VALIDATED: ≥3 claims from different sources are consistent within tolerance, with average confidence ≥0.6
- INVALIDATED: Claims contradict each other or confidence is too low
- INCONCLUSIVE: Mixed signals or insufficient clarity

Consider:
- Claim confidence scores (weight higher confidence claims more)
- Consistency across independent sources
- Specificity and clarity of claims
- Any contradictory information
- Statistical significance of the pattern

IMPORTANT: Be rigorous. Only mark as VALIDATED if there is strong corroborating evidence.`;

        const claimsSummary = hypothesis.claims
          .map(
            (claim, idx) =>
              `Claim ${idx + 1} (from call ${claim.call.phoneNumber}, confidence: ${(claim.confidence * 100).toFixed(1)}%):\n${claim.text}`
          )
          .join("\n\n");

        const response = await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Hypothesis: ${hypothesis.question}\n\nClaims to evaluate (${hypothesis.claims.length} claims from ${uniqueCalls.size} different calls):\n\n${claimsSummary}\n\nProvide your analysis in JSON format:
{
  "status": "VALIDATED" | "INVALIDATED" | "INCONCLUSIVE",
  "conclusion": "Your detailed conclusion (2-3 sentences)",
  "consistencyScore": 0.85,
  "reasoning": "Brief explanation of your decision"
}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2, // Lower temperature for more consistent analysis
          max_tokens: 1000,
        });

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("No response from GPT-4");
        }

        const parsed = JSON.parse(content) as {
          status: "VALIDATED" | "INVALIDATED" | "INCONCLUSIVE";
          conclusion: string;
          consistencyScore: number;
          reasoning: string;
        };

        // Validate response structure
        if (
          !parsed.status ||
          !["VALIDATED", "INVALIDATED", "INCONCLUSIVE"].includes(parsed.status)
        ) {
          throw new NonRetriableError(
            "Invalid status in GPT-4 validation response"
          );
        }

        if (
          typeof parsed.consistencyScore !== "number" ||
          parsed.consistencyScore < 0 ||
          parsed.consistencyScore > 1
        ) {
          throw new NonRetriableError(
            "Invalid consistencyScore in GPT-4 validation response"
          );
        }

        return parsed;
      }
    );

    // Step 3: Update hypothesis and claims (atomic transaction)
    await step.run(
      "update-hypothesis-and-claims",
      async () => {
        await db.$transaction(async (tx) => {
          // Update hypothesis with validation results
          await tx.hypothesis.update({
            where: { id: hypothesisId },
            data: {
              status: analysis.status,
              conclusion: `${analysis.conclusion}\n\nReasoning: ${analysis.reasoning}\n\nConsistency Score: ${(analysis.consistencyScore * 100).toFixed(1)}%\n\nBased on ${hypothesis.claims.length} claims from ${uniqueCalls.size} different calls.`,
            },
          });

          // Mark claims as validated if hypothesis is validated
          if (analysis.status === "VALIDATED") {
            await tx.claim.updateMany({
              where: {
                hypothesisId,
              },
              data: {
                validated: true,
              },
            });
          }
        });
      }
    );

    // Step 4: Check if campaign is complete
    const campaignStatus = await step.run("check-campaign-status", async () => {
      const campaign = await db.campaign.findUnique({
        where: { id: campaignId },
        include: {
          hypotheses: {
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              calls: true,
            },
          },
        },
      });

      if (!campaign) {
        return { allHypothesesResolved: false, campaign: null };
      }

      const allHypothesesResolved = campaign.hypotheses.every(
        (h) => h.status !== "PENDING"
      );

      const validatedCount = campaign.hypotheses.filter(
        (h) => h.status === "VALIDATED"
      ).length;

      return {
        campaign,
        allHypothesesResolved,
        validatedCount,
        totalHypotheses: campaign.hypotheses.length,
      };
    });

    // Step 5: If all hypotheses resolved, optionally trigger campaign completion
    if (
      campaignStatus.allHypothesesResolved &&
      campaignStatus.campaign?.status === "ACTIVE"
    ) {
      // Optionally auto-complete campaign or trigger export
      // This could be extended to:
      // 1. Update campaign status to COMPLETED
      // 2. Trigger export to integrations
      // 3. Send notifications
      //
      // await step.sendEvent("campaign-complete", {
      //   name: "campaign/complete",
      //   data: {
      //     campaignId,
      //     validatedCount: campaignStatus.validatedCount,
      //     totalHypotheses: campaignStatus.totalHypotheses,
      //   },
      // });
    }

    return {
      success: true,
      hypothesisId,
      status: analysis.status,
      consistencyScore: analysis.consistencyScore,
      claimsAnalyzed: hypothesis.claims.length,
      uniqueCallsAnalyzed: uniqueCalls.size,
      campaignComplete: campaignStatus.allHypothesesResolved,
      skipped: false,
    };
  }
);

