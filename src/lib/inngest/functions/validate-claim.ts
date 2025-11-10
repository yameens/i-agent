import { inngest } from "../client";
import { db } from "@/server/db";
import { openaiClient } from "@/lib/openai";

export const validateClaim = inngest.createFunction(
  {
    id: "validate-claim",
    name: "Validate Claim (Triangulation)",
  },
  { event: "claim/validate" },
  async ({ event, step }) => {
    const { hypothesisId, campaignId } = event.data;

    // Step 1: Fetch hypothesis with all claims
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
      throw new Error(`Hypothesis ${hypothesisId} not found`);
    }

    if (hypothesis.claims.length < 3) {
      return {
        success: false,
        message: "Not enough claims for triangulation (minimum 3 required)",
      };
    }

    // Step 2: Analyze claim consistency using GPT-4
    const analysis = await step.run("analyze-consistency", async () => {
      const systemPrompt = `You are an expert analyst evaluating the consistency and validity of claims from multiple sources.

Your task:
1. Analyze claims from at least 3 different channel-check calls
2. Determine if the claims are consistent and mutually supportive
3. Identify any contradictions or inconsistencies
4. Provide an overall validation status: VALIDATED, INVALIDATED, or INCONCLUSIVE
5. Write a brief conclusion summarizing the findings

Consider:
- Claim confidence scores
- Consistency across sources
- Specificity and clarity of claims
- Any contradictory information`;

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
            content: `Hypothesis: ${hypothesis.question}\n\nClaims to evaluate:\n\n${claimsSummary}\n\nProvide your analysis in JSON format:
{
  "status": "VALIDATED" | "INVALIDATED" | "INCONCLUSIVE",
  "conclusion": "Your detailed conclusion",
  "consistencyScore": 0.85,
  "reasoning": "Brief explanation of your decision"
}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from GPT-4");
      }

      return JSON.parse(content) as {
        status: "VALIDATED" | "INVALIDATED" | "INCONCLUSIVE";
        conclusion: string;
        consistencyScore: number;
        reasoning: string;
      };
    });

    // Step 3: Update hypothesis with validation results
    await step.run("update-hypothesis", async () => {
      return db.hypothesis.update({
        where: { id: hypothesisId },
        data: {
          status: analysis.status,
          conclusion: `${analysis.conclusion}\n\nReasoning: ${analysis.reasoning}\n\nConsistency Score: ${(analysis.consistencyScore * 100).toFixed(1)}%`,
        },
      });
    });

    // Step 4: Mark claims as validated
    await step.run("mark-claims-validated", async () => {
      // Only mark claims as validated if the hypothesis is validated
      if (analysis.status === "VALIDATED") {
        await db.claim.updateMany({
          where: {
            hypothesisId,
          },
          data: {
            validated: true,
          },
        });
      }
    });

    // Step 5: Check if campaign is complete and trigger export
    const campaignStatus = await step.run("check-campaign-status", async () => {
      const campaign = await db.campaign.findUnique({
        where: { id: campaignId },
        include: {
          hypotheses: true,
          _count: {
            select: {
              calls: true,
            },
          },
        },
      });

      const allHypothesesValidated = campaign?.hypotheses.every(
        (h) => h.status !== "PENDING"
      );

      return {
        campaign,
        allHypothesesValidated,
      };
    });

    // If all hypotheses are validated and campaign is active, optionally trigger export
    if (
      campaignStatus.allHypothesesValidated &&
      campaignStatus.campaign?.status === "ACTIVE"
    ) {
      // Could auto-trigger export here
      // await step.sendEvent("trigger-export", {
      //   name: "insight/export",
      //   data: { campaignId },
      // });
    }

    return {
      success: true,
      hypothesisId,
      status: analysis.status,
      consistencyScore: analysis.consistencyScore,
      claimsAnalyzed: hypothesis.claims.length,
    };
  }
);

