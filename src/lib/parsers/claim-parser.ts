import { z } from "zod";
import {
  ClaimSchema,
  ExtractionResponseSchema,
  validateClaim,
  type Claim,
  type ExtractionResponse,
} from "@/lib/schemas/claim";

/**
 * Result type for parsing operations
 */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; rawData?: unknown };

/**
 * Robust parser for model output
 * Handles malformed JSON, missing fields, and validation errors
 */
export class ClaimParser {
  /**
   * Parse raw model output into validated claims
   */
  static parseModelOutput(rawOutput: string): ParseResult<ExtractionResponse> {
    // Step 1: Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
        rawData: rawOutput,
      };
    }

    // Step 2: Validate against schema
    const schemaResult = ExtractionResponseSchema.safeParse(parsed);
    if (!schemaResult.success) {
      return {
        success: false,
        error: `Schema validation failed: ${this.formatZodError(schemaResult.error)}`,
        rawData: parsed,
      };
    }

    // Step 3: Validate individual claims
    const validatedClaims: Claim[] = [];
    const errors: string[] = [];

    for (let i = 0; i < schemaResult.data.claims.length; i++) {
      const claim = schemaResult.data.claims[i];
      const validation = validateClaim(claim);

      if (!validation.valid) {
        errors.push(`Claim ${i}: ${validation.errors.join(", ")}`);
      } else {
        validatedClaims.push(claim);
      }
    }

    // If all claims failed validation, return error
    if (validatedClaims.length === 0 && schemaResult.data.claims.length > 0) {
      return {
        success: false,
        error: `All claims failed validation: ${errors.join("; ")}`,
        rawData: parsed,
      };
    }

    // Return validated claims (may be subset of original if some failed)
    return {
      success: true,
      data: {
        claims: validatedClaims,
        metadata: schemaResult.data.metadata,
      },
    };
  }

  /**
   * Parse a single claim with validation
   */
  static parseClaim(rawClaim: unknown): ParseResult<Claim> {
    const schemaResult = ClaimSchema.safeParse(rawClaim);
    if (!schemaResult.success) {
      return {
        success: false,
        error: `Schema validation failed: ${this.formatZodError(schemaResult.error)}`,
        rawData: rawClaim,
      };
    }

    const validation = validateClaim(schemaResult.data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Claim validation failed: ${validation.errors.join(", ")}`,
        rawData: rawClaim,
      };
    }

    return {
      success: true,
      data: schemaResult.data,
    };
  }

  /**
   * Attempt to repair common issues in model output
   */
  static attemptRepair(rawOutput: string): string {
    let repaired = rawOutput;

    // Remove markdown code blocks if present
    repaired = repaired.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    // Remove any text before first { or [
    const firstBrace = repaired.indexOf("{");
    const firstBracket = repaired.indexOf("[");
    if (firstBrace !== -1 || firstBracket !== -1) {
      const start = Math.min(
        firstBrace !== -1 ? firstBrace : Infinity,
        firstBracket !== -1 ? firstBracket : Infinity
      );
      repaired = repaired.substring(start);
    }

    // Remove any text after last } or ]
    const lastBrace = repaired.lastIndexOf("}");
    const lastBracket = repaired.lastIndexOf("]");
    if (lastBrace !== -1 || lastBracket !== -1) {
      const end = Math.max(lastBrace, lastBracket);
      repaired = repaired.substring(0, end + 1);
    }

    // Fix common JSON issues
    repaired = repaired
      .replace(/,\s*}/g, "}") // Remove trailing commas in objects
      .replace(/,\s*]/g, "]") // Remove trailing commas in arrays
      .replace(/'/g, '"'); // Replace single quotes with double quotes

    return repaired;
  }

  /**
   * Parse with automatic repair attempt
   */
  static parseWithRepair(rawOutput: string): ParseResult<ExtractionResponse> {
    // First attempt: parse as-is
    const firstAttempt = this.parseModelOutput(rawOutput);
    if (firstAttempt.success) {
      return firstAttempt;
    }

    // Second attempt: try to repair and parse again
    const repaired = this.attemptRepair(rawOutput);
    const secondAttempt = this.parseModelOutput(repaired);

    if (secondAttempt.success) {
      return secondAttempt;
    }

    // Both attempts failed, return the original error with more context
    return {
      success: false,
      error: `Failed to parse even after repair. Original error: ${"error" in firstAttempt ? firstAttempt.error : "Unknown"}. Repair error: ${"error" in secondAttempt ? secondAttempt.error : "Unknown"}`,
      rawData: rawOutput,
    } as any;
  }

  /**
   * Format Zod errors into readable string
   */
  private static formatZodError(error: any): string {
    if (!error.errors || error.errors.length === 0) {
      return "Unknown validation error";
    }
    return error.errors
      .map((err) => {
        const path = err.path.join(".");
        return `${path}: ${err.message}`;
      })
      .join("; ");
  }
}

/**
 * Logging and review system for failed parses
 */
export interface ParseFailureLog {
  timestamp: Date;
  callId: string;
  rawOutput: string;
  error: string;
  rawData?: unknown;
}

export class ParseFailureLogger {
  private static failures: ParseFailureLog[] = [];

  static log(failure: ParseFailureLog): void {
    this.failures.push(failure);
    
    // Log to console for immediate visibility
    console.error("[ClaimParser] Parse failure:", {
      callId: failure.callId,
      error: failure.error,
      timestamp: failure.timestamp,
    });

    // In production, you might want to:
    // - Send to error tracking service (Sentry, etc.)
    // - Store in database for review
    // - Alert team if failure rate exceeds threshold
  }

  static getFailures(): ParseFailureLog[] {
    return [...this.failures];
  }

  static getFailureRate(timeWindow: number = 3600000): number {
    const now = Date.now();
    const recentFailures = this.failures.filter(
      (f) => now - f.timestamp.getTime() < timeWindow
    );
    return recentFailures.length;
  }

  static clearFailures(): void {
    this.failures = [];
  }
}

/**
 * Helper to create a standardized extraction prompt
 */
export function buildExtractionPrompt(options: {
  transcript: string;
  hypotheses: Array<{ id: string; question: string }>;
  ragContext: string;
  category: string;
}): { system: string; user: string } {
  const system = `You are an expert analyst extracting structured, verifiable claims from automated retail interview transcripts.

CRITICAL: You MUST return valid JSON matching this exact schema:

{
  "claims": [
    {
      "field": "PRICE" | "VELOCITY" | "STOCKOUT" | "INVENTORY_LEVEL" | "MARKET_SHARE" | "PROMOTION" | "COMPETITIVE_ACTIVITY" | "CUSTOMER_FEEDBACK" | "OTHER",
      "valueNumber": <number> (optional, but required for quantitative claims),
      "valueText": <string> (optional, but required for qualitative claims),
      "unit": "USD" | "EUR" | "PERCENT" | "UNITS" | "CASES" | "DAYS" | etc. (required if valueNumber present),
      "skuId": <string> (optional, product/SKU identifier),
      "geoCode": <string> (optional, ISO country code or region),
      "startSec": <number> (required, timestamp in seconds),
      "endSec": <number> (optional, end timestamp if claim spans time),
      "confidence": <number 0-1> (required, your confidence in this extraction),
      "hypothesisId": <string> (optional, hypothesis ID if claim relates to one),
      "rawText": <string> (optional, exact quote from transcript),
      "context": <string> (optional, surrounding context)
    }
  ],
  "metadata": {
    "modelVersion": "gpt-4o",
    "extractionTimestamp": "<ISO timestamp>",
    "totalClaims": <number>
  }
}

EXTRACTION RULES:
1. Extract ONLY factual, verifiable claims - not opinions or speculation
2. Normalize all units (e.g., "$5.99" → valueNumber: 5.99, unit: "USD")
3. Include precise timestamps (startSec) for each claim
4. Set confidence based on clarity and specificity of the claim
5. Link claims to hypotheses when relevant using hypothesisId
6. For numeric claims, ALWAYS include both valueNumber AND unit
7. For qualitative claims (e.g., stockouts), use valueText

CATEGORY CONTEXT: ${options.category}

CHECKLIST GUIDANCE:
${options.ragContext}

HYPOTHESES TO VALIDATE:
${options.hypotheses.map((h) => `- ${h.id}: ${h.question}`).join("\n")}

Return ONLY valid JSON. Do not include explanations or markdown.`;

  const user = `Extract structured claims from this transcript:\n\n${options.transcript}`;

  return { system, user };
}

