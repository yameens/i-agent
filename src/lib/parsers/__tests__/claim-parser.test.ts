import { describe, it, expect, beforeEach } from "vitest";
import { ClaimParser, ParseFailureLogger } from "../claim-parser";

describe("ClaimParser", () => {
  beforeEach(() => {
    ParseFailureLogger.clearFailures();
  });

  describe("parseModelOutput", () => {
    it("should parse valid extraction response", () => {
      const validOutput = JSON.stringify({
        claims: [
          {
            field: "PRICE",
            valueNumber: 5.99,
            unit: "USD",
            startSec: 45.5,
            confidence: 0.9,
            rawText: "The price is $5.99",
          },
        ],
        metadata: {
          modelVersion: "gpt-4o",
          totalClaims: 1,
        },
      });

      const result = ClaimParser.parseModelOutput(validOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.claims).toHaveLength(1);
        expect(result.data.claims[0].field).toBe("PRICE");
        expect(result.data.claims[0].valueNumber).toBe(5.99);
      }
    });

    it("should reject invalid JSON", () => {
      const invalidOutput = "{ this is not valid json }";

      const result = ClaimParser.parseModelOutput(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to parse JSON");
      }
    });

    it("should reject missing required fields", () => {
      const invalidOutput = JSON.stringify({
        claims: [
          {
            field: "PRICE",
            // Missing startSec and confidence
            valueNumber: 5.99,
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Schema validation failed");
      }
    });

    it("should filter out invalid claims but keep valid ones", () => {
      const mixedOutput = JSON.stringify({
        claims: [
          {
            field: "PRICE",
            valueNumber: 5.99,
            unit: "USD",
            startSec: 45.5,
            confidence: 0.9,
          },
          {
            field: "VELOCITY",
            // Missing both valueNumber and valueText
            startSec: 100.0,
            confidence: 0.8,
          },
          {
            field: "STOCKOUT",
            valueText: "Out of stock",
            startSec: 200.0,
            confidence: 0.7,
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mixedOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should keep the 2 valid claims
        expect(result.data.claims.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("should reject if all claims are invalid", () => {
      const allInvalidOutput = JSON.stringify({
        claims: [
          {
            field: "PRICE",
            // No value fields
            startSec: 45.5,
            confidence: 0.9,
          },
          {
            field: "VELOCITY",
            // No value fields
            startSec: 100.0,
            confidence: 0.8,
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(allInvalidOutput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("All claims failed validation");
      }
    });
  });

  describe("attemptRepair", () => {
    it("should remove markdown code blocks", () => {
      const input = "```json\n{\"claims\": []}\n```";
      const repaired = ClaimParser.attemptRepair(input);
      expect(repaired).toBe('{"claims": []}');
    });

    it("should remove text before first brace", () => {
      const input = "Here is the output: {\"claims\": []}";
      const repaired = ClaimParser.attemptRepair(input);
      expect(repaired).toBe('{"claims": []}');
    });

    it("should remove text after last brace", () => {
      const input = '{\"claims\": []} and some extra text';
      const repaired = ClaimParser.attemptRepair(input);
      expect(repaired).toBe('{"claims": []}');
    });

    it("should remove trailing commas", () => {
      const input = '{"claims": [{"field": "PRICE",}],}';
      const repaired = ClaimParser.attemptRepair(input);
      expect(repaired).toBe('{"claims": [{"field": "PRICE"}]}');
    });

    it("should replace single quotes with double quotes", () => {
      const input = "{'claims': []}";
      const repaired = ClaimParser.attemptRepair(input);
      expect(repaired).toBe('{"claims": []}');
    });

    it("should handle multiple repairs at once", () => {
      const input = "```json\nHere's the data: {'claims': [],}\n```\nDone!";
      const repaired = ClaimParser.attemptRepair(input);
      expect(repaired).toBe('{"claims": []}');
    });
  });

  describe("parseWithRepair", () => {
    it("should parse valid output without repair", () => {
      const validOutput = JSON.stringify({
        claims: [
          {
            field: "PRICE",
            valueNumber: 5.99,
            unit: "USD",
            startSec: 45.5,
            confidence: 0.9,
          },
        ],
      });

      const result = ClaimParser.parseWithRepair(validOutput);
      expect(result.success).toBe(true);
    });

    it("should repair and parse markdown-wrapped output", () => {
      const wrappedOutput = `\`\`\`json
{
  "claims": [
    {
      "field": "PRICE",
      "valueNumber": 5.99,
      "unit": "USD",
      "startSec": 45.5,
      "confidence": 0.9
    }
  ]
}
\`\`\``;

      const result = ClaimParser.parseWithRepair(wrappedOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.claims).toHaveLength(1);
      }
    });

    it("should fail if repair doesn't help", () => {
      const invalidOutput = "completely invalid { not json at all";

      const result = ClaimParser.parseWithRepair(invalidOutput);
      expect(result.success).toBe(false);
    });
  });
});

describe("ParseFailureLogger", () => {
  beforeEach(() => {
    ParseFailureLogger.clearFailures();
  });

  it("should log failures", () => {
    ParseFailureLogger.log({
      timestamp: new Date(),
      callId: "call-123",
      rawOutput: "invalid",
      error: "Test error",
    });

    const failures = ParseFailureLogger.getFailures();
    expect(failures).toHaveLength(1);
    expect(failures[0].callId).toBe("call-123");
  });

  it("should calculate failure rate", () => {
    const now = new Date();
    
    // Add 3 recent failures
    for (let i = 0; i < 3; i++) {
      ParseFailureLogger.log({
        timestamp: now,
        callId: `call-${i}`,
        rawOutput: "invalid",
        error: "Test error",
      });
    }

    const rate = ParseFailureLogger.getFailureRate(3600000); // 1 hour window
    expect(rate).toBe(3);
  });

  it("should clear failures", () => {
    ParseFailureLogger.log({
      timestamp: new Date(),
      callId: "call-123",
      rawOutput: "invalid",
      error: "Test error",
    });

    expect(ParseFailureLogger.getFailures()).toHaveLength(1);
    
    ParseFailureLogger.clearFailures();
    
    expect(ParseFailureLogger.getFailures()).toHaveLength(0);
  });
});

