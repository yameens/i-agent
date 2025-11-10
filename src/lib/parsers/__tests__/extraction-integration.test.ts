import { describe, it, expect } from "vitest";
import { ClaimParser, buildExtractionPrompt } from "../claim-parser";

/**
 * Integration tests with synthetic transcripts
 * Tests end-to-end extraction with realistic scenarios
 */

describe("Extraction Integration Tests", () => {
  describe("Price Claims", () => {
    it("should extract price with dollar amount", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "PRICE",
            valueNumber: 5.99,
            unit: "USD",
            startSec: 45.5,
            endSec: 48.0,
            confidence: 0.95,
            rawText: "The retail price is $5.99",
            context: "Q: What's the current price? A: The retail price is $5.99",
          },
        ],
        metadata: {
          modelVersion: "gpt-4o",
          extractionTimestamp: new Date().toISOString(),
          totalClaims: 1,
        },
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.field).toBe("PRICE");
        expect(claim.valueNumber).toBe(5.99);
        expect(claim.unit).toBe("USD");
        expect(claim.confidence).toBeGreaterThan(0.9);
      }
    });

    it("should extract price increase percentage", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "PRICE",
            valueNumber: 15,
            unit: "PERCENT",
            startSec: 120.0,
            confidence: 0.85,
            rawText: "Prices went up about 15% last quarter",
            skuId: "SKU-12345",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.valueNumber).toBe(15);
        expect(claim.unit).toBe("PERCENT");
        expect(claim.skuId).toBe("SKU-12345");
      }
    });
  });

  describe("Velocity Claims", () => {
    it("should extract daily sales velocity", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "VELOCITY",
            valueNumber: 100,
            unit: "UNITS_PER_DAY",
            startSec: 200.0,
            confidence: 0.8,
            rawText: "We're moving about 100 units per day",
            skuId: "SKU-WIDGET-001",
            geoCode: "US-CA",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.field).toBe("VELOCITY");
        expect(claim.valueNumber).toBe(100);
        expect(claim.unit).toBe("UNITS_PER_DAY");
        expect(claim.geoCode).toBe("US-CA");
      }
    });

    it("should extract weekly case velocity", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "VELOCITY",
            valueNumber: 50,
            unit: "CASES",
            valueText: "per week",
            startSec: 300.0,
            confidence: 0.75,
            rawText: "We sell around 50 cases per week",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.valueNumber).toBe(50);
        expect(claim.unit).toBe("CASES");
      }
    });
  });

  describe("Stockout Claims", () => {
    it("should extract stockout with duration", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "STOCKOUT",
            valueText: "Out of stock for 3 days last week",
            startSec: 400.0,
            confidence: 0.9,
            rawText: "We were completely out of stock for 3 days last week",
            geoCode: "US-NY",
            skuId: "SKU-POPULAR-ITEM",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.field).toBe("STOCKOUT");
        expect(claim.valueText).toContain("3 days");
        expect(claim.geoCode).toBe("US-NY");
      }
    });

    it("should extract recurring stockout pattern", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "STOCKOUT",
            valueText: "Stockouts happen every weekend",
            startSec: 500.0,
            confidence: 0.7,
            rawText: "We run out every weekend, it's a regular pattern",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.valueText).toContain("weekend");
      }
    });
  });

  describe("Inventory Level Claims", () => {
    it("should extract current inventory count", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "INVENTORY_LEVEL",
            valueNumber: 500,
            unit: "UNITS",
            startSec: 600.0,
            confidence: 0.85,
            rawText: "We have about 500 units in stock right now",
            skuId: "SKU-WIDGET-001",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.field).toBe("INVENTORY_LEVEL");
        expect(claim.valueNumber).toBe(500);
        expect(claim.unit).toBe("UNITS");
      }
    });

    it("should extract inventory in cases", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "INVENTORY_LEVEL",
            valueNumber: 25,
            unit: "CASES",
            startSec: 700.0,
            confidence: 0.8,
            rawText: "We have 25 cases in the warehouse",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.valueNumber).toBe(25);
        expect(claim.unit).toBe("CASES");
      }
    });
  });

  describe("Market Share Claims", () => {
    it("should extract market share percentage", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "MARKET_SHARE",
            valueNumber: 23.5,
            unit: "PERCENT",
            startSec: 800.0,
            confidence: 0.75,
            rawText: "Our market share is approximately 23.5%",
            geoCode: "US",
            hypothesisId: "hyp-market-share-001",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.field).toBe("MARKET_SHARE");
        expect(claim.valueNumber).toBe(23.5);
        expect(claim.unit).toBe("PERCENT");
        expect(claim.hypothesisId).toBe("hyp-market-share-001");
      }
    });
  });

  describe("Promotion Claims", () => {
    it("should extract promotion details", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "PROMOTION",
            valueNumber: 20,
            unit: "PERCENT",
            valueText: "Buy one get one 20% off promotion",
            startSec: 900.0,
            endSec: 910.0,
            confidence: 0.9,
            rawText: "We're running a buy one get one 20% off promotion",
            skuId: "SKU-PROMO-ITEM",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.field).toBe("PROMOTION");
        expect(claim.valueNumber).toBe(20);
        expect(claim.valueText?.toLowerCase()).toContain("buy one get one");
      }
    });
  });

  describe("Competitive Activity Claims", () => {
    it("should extract competitor pricing", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "COMPETITIVE_ACTIVITY",
            valueNumber: 4.99,
            unit: "USD",
            valueText: "Competitor X pricing at $4.99",
            startSec: 1000.0,
            confidence: 0.8,
            rawText: "I noticed Competitor X is selling it for $4.99",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.field).toBe("COMPETITIVE_ACTIVITY");
        expect(claim.valueNumber).toBe(4.99);
        expect(claim.unit).toBe("USD");
      }
    });
  });

  describe("Multiple Claims in Single Extraction", () => {
    it("should extract multiple claims from complex transcript", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "PRICE",
            valueNumber: 5.99,
            unit: "USD",
            startSec: 45.5,
            confidence: 0.95,
            rawText: "The price is $5.99",
          },
          {
            field: "VELOCITY",
            valueNumber: 100,
            unit: "UNITS_PER_DAY",
            startSec: 120.0,
            confidence: 0.85,
            rawText: "We sell about 100 units per day",
          },
          {
            field: "STOCKOUT",
            valueText: "Out of stock twice last month",
            startSec: 200.0,
            confidence: 0.7,
            rawText: "We had stockouts twice last month",
          },
        ],
        metadata: {
          modelVersion: "gpt-4o",
          totalClaims: 3,
        },
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.claims).toHaveLength(3);
        expect(result.data.claims[0].field).toBe("PRICE");
        expect(result.data.claims[1].field).toBe("VELOCITY");
        expect(result.data.claims[2].field).toBe("STOCKOUT");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle claims with only text values", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "CUSTOMER_FEEDBACK",
            valueText: "Customers love the new packaging",
            startSec: 300.0,
            confidence: 0.8,
            rawText: "Customers have been giving great feedback about the new packaging",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.field).toBe("CUSTOMER_FEEDBACK");
        expect(claim.valueText).toBeTruthy();
        expect(claim.valueNumber).toBeUndefined();
      }
    });

    it("should handle claims with time ranges", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "VELOCITY",
            valueNumber: 150,
            unit: "UNITS_PER_DAY",
            startSec: 100.0,
            endSec: 125.0,
            confidence: 0.85,
            rawText: "During the discussion about velocity from 100s to 125s",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.startSec).toBe(100.0);
        expect(claim.endSec).toBe(125.0);
      }
    });

    it("should handle claims with all optional fields", () => {
      const mockModelOutput = JSON.stringify({
        claims: [
          {
            field: "PRICE",
            valueNumber: 5.99,
            unit: "USD",
            startSec: 45.5,
            endSec: 48.0,
            confidence: 0.95,
            skuId: "SKU-12345",
            geoCode: "US-CA",
            hypothesisId: "hyp-price-001",
            rawText: "The price is $5.99",
            context: "Full context of the conversation",
          },
        ],
      });

      const result = ClaimParser.parseModelOutput(mockModelOutput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const claim = result.data.claims[0];
        expect(claim.skuId).toBe("SKU-12345");
        expect(claim.geoCode).toBe("US-CA");
        expect(claim.hypothesisId).toBe("hyp-price-001");
        expect(claim.rawText).toBeTruthy();
        expect(claim.context).toBeTruthy();
      }
    });
  });
});

describe("buildExtractionPrompt", () => {
  it("should build structured prompt with all context", () => {
    const prompt = buildExtractionPrompt({
      transcript: "Sample transcript about pricing and velocity",
      hypotheses: [
        { id: "hyp-1", question: "Are prices increasing?" },
        { id: "hyp-2", question: "Is velocity declining?" },
      ],
      ragContext: "Retail checklist: Ask about pricing, inventory, and stockouts",
      category: "Retail",
    });

    expect(prompt.system).toContain("PRICE");
    expect(prompt.system).toContain("VELOCITY");
    expect(prompt.system).toContain("hyp-1");
    expect(prompt.system).toContain("hyp-2");
    expect(prompt.system).toContain("Retail");
    expect(prompt.system).toContain("Retail checklist");
    
    expect(prompt.user).toContain("Sample transcript");
  });

  it("should include schema definition in prompt", () => {
    const prompt = buildExtractionPrompt({
      transcript: "Test",
      hypotheses: [],
      ragContext: "Context",
      category: "Test",
    });

    expect(prompt.system).toContain("valueNumber");
    expect(prompt.system).toContain("valueText");
    expect(prompt.system).toContain("unit");
    expect(prompt.system).toContain("startSec");
    expect(prompt.system).toContain("confidence");
  });
});

