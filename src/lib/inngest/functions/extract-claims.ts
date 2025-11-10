import { inngest } from "../client";
import { db } from "@/server/db";
import { openaiClient } from "@/lib/openai";
import { buildRAGContext } from "@/lib/rag";

interface ExtractedClaim {
  text: string;
  timestamp: number;
  confidence: number;
  hypothesisQuestion?: string;
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

    // Step 3: Extract claims using GPT-4
    const extractedClaims = await step.run(
      "extract-claims-with-gpt4",
      async () => {
        const systemPrompt = `You are an expert analyst extracting factual claims from channel-check call transcripts.

Your task:
1. Identify specific, verifiable claims made by the respondent
2. Assign a confidence score (0-1) based on how clearly the claim was stated
3. Note the approximate timestamp in the conversation
4. Match claims to relevant hypotheses if applicable

Checklist context:
${ragContext}

Campaign hypotheses:
${campaign.hypotheses.map((h) => `- ${h.question}`).join("\n")}

Return a JSON array of claims with this structure:
{
  "claims": [
    {
      "text": "The specific claim made",
      "timestamp": 45.5,
      "confidence": 0.85,
      "hypothesisQuestion": "Which hypothesis this relates to (if any)"
    }
  ]
}`;

        const response = await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Extract claims from this transcript:\n\n${transcript}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        });

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("No response from GPT-4");
        }

        const parsed = JSON.parse(content);
        return parsed.claims as ExtractedClaim[];
      }
    );

    // Step 4: Save claims to database
    const savedClaims = await step.run("save-claims", async () => {
      const call = await db.call.findUnique({
        where: { id: callId },
        select: { recordingUrl: true },
      });

      const claims = [];

      for (const claim of extractedClaims) {
        // Find matching hypothesis
        let hypothesisId: string | undefined;
        if (claim.hypothesisQuestion) {
          const hypothesis = campaign.hypotheses.find((h) =>
            h.question
              .toLowerCase()
              .includes(claim.hypothesisQuestion!.toLowerCase())
          );
          hypothesisId = hypothesis?.id;
        }

        // Build evidence URL with timestamp
        const evidenceUrl = call?.recordingUrl
          ? `${call.recordingUrl}#t=${Math.floor(claim.timestamp)}`
          : "";

        const savedClaim = await db.claim.create({
          data: {
            callId,
            hypothesisId,
            text: claim.text,
            evidenceUrl,
            timestamp: claim.timestamp,
            confidence: claim.confidence,
            validated: false,
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

