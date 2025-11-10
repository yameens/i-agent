import { describe, it, expect } from "vitest";
import {
  ClaimSchema,
  validateClaim,
  normalizeUnit,
  parseValueWithUnit,
  type Claim,
} from "../claim";

describe("ClaimSchema", () => {
  it("should validate a complete price claim", () => {
    const claim: Claim = {
      field: "PRICE",
      valueNumber: 5.99,
      unit: "USD",
      startSec: 45.5,
      confidence: 0.9,
      rawText: "The price is $5.99",
    };

    const result = ClaimSchema.safeParse(claim);
    expect(result.success).toBe(true);
  });

  it("should validate a velocity claim with units", () => {
    const claim: Claim = {
      field: "VELOCITY",
      valueNumber: 100,
      unit: "UNITS_PER_DAY",
      startSec: 120.0,
      endSec: 125.0,
      confidence: 0.85,
      skuId: "SKU-12345",
      rawText: "We're selling about 100 units per day",
    };

    const result = ClaimSchema.safeParse(claim);
    expect(result.success).toBe(true);
  });

  it("should validate a stockout claim with text value", () => {
    const claim: Claim = {
      field: "STOCKOUT",
      valueText: "Out of stock for 3 days last week",
      startSec: 200.0,
      confidence: 0.75,
      geoCode: "US-CA",
      rawText: "We were completely out of stock for 3 days last week",
    };

    const result = ClaimSchema.safeParse(claim);
    expect(result.success).toBe(true);
  });

  it("should validate a market share claim with percentage", () => {
    const claim: Claim = {
      field: "MARKET_SHARE",
      valueNumber: 15,
      unit: "PERCENT",
      startSec: 300.0,
      confidence: 0.8,
      hypothesisId: "hyp-123",
      rawText: "Our market share is around 15%",
    };

    const result = ClaimSchema.safeParse(claim);
    expect(result.success).toBe(true);
  });

  it("should reject claim with invalid confidence", () => {
    const claim = {
      field: "PRICE",
      valueNumber: 5.99,
      unit: "USD",
      startSec: 45.5,
      confidence: 1.5, // Invalid: > 1
    };

    const result = ClaimSchema.safeParse(claim);
    expect(result.success).toBe(false);
  });

  it("should reject claim with negative timestamp", () => {
    const claim = {
      field: "PRICE",
      valueNumber: 5.99,
      unit: "USD",
      startSec: -10, // Invalid: negative
      confidence: 0.9,
    };

    const result = ClaimSchema.safeParse(claim);
    expect(result.success).toBe(false);
  });
});

describe("validateClaim", () => {
  it("should pass validation for well-formed claim", () => {
    const claim: Claim = {
      field: "PRICE",
      valueNumber: 5.99,
      unit: "USD",
      startSec: 45.5,
      confidence: 0.9,
    };

    const result = validateClaim(claim);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail if no value fields present", () => {
    const claim: Claim = {
      field: "PRICE",
      startSec: 45.5,
      confidence: 0.9,
    };

    const result = validateClaim(claim);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Claim must have either valueNumber or valueText"
    );
  });

  it("should warn if confidence is too low", () => {
    const claim: Claim = {
      field: "PRICE",
      valueNumber: 5.99,
      unit: "USD",
      startSec: 45.5,
      confidence: 0.2, // Very low
    };

    const result = validateClaim(claim);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Confidence is very low"))).toBe(
      true
    );
  });

  it("should fail if endSec < startSec", () => {
    const claim: Claim = {
      field: "PRICE",
      valueNumber: 5.99,
      unit: "USD",
      startSec: 100.0,
      endSec: 50.0, // Invalid: before start
      confidence: 0.9,
    };

    const result = validateClaim(claim);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("endSec must be greater"))
    ).toBe(true);
  });

  it("should validate PRICE claims have numeric value", () => {
    const claim: Claim = {
      field: "PRICE",
      valueText: "expensive",
      startSec: 45.5,
      confidence: 0.9,
    };

    const result = validateClaim(claim);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("PRICE claims should have"))
    ).toBe(true);
  });

  it("should validate STOCKOUT claims have text value", () => {
    const claim: Claim = {
      field: "STOCKOUT",
      valueNumber: 3,
      unit: "DAYS",
      startSec: 45.5,
      confidence: 0.9,
    };

    const result = validateClaim(claim);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("STOCKOUT claims should have"))
    ).toBe(true);
  });
});

describe("normalizeUnit", () => {
  it("should normalize dollar signs to USD", () => {
    expect(normalizeUnit("$")).toBe("USD");
    expect(normalizeUnit("usd")).toBe("USD");
    expect(normalizeUnit("dollar")).toBe("USD");
    expect(normalizeUnit("dollars")).toBe("USD");
  });

  it("should normalize percentage symbols", () => {
    expect(normalizeUnit("%")).toBe("PERCENT");
    expect(normalizeUnit("percent")).toBe("PERCENT");
    expect(normalizeUnit("percentage")).toBe("PERCENT");
    expect(normalizeUnit("pct")).toBe("PERCENT");
  });

  it("should normalize quantity units", () => {
    expect(normalizeUnit("unit")).toBe("UNITS");
    expect(normalizeUnit("units")).toBe("UNITS");
    expect(normalizeUnit("case")).toBe("CASES");
    expect(normalizeUnit("cases")).toBe("CASES");
    expect(normalizeUnit("pallet")).toBe("PALLETS");
    expect(normalizeUnit("box")).toBe("BOXES");
  });

  it("should normalize time units", () => {
    expect(normalizeUnit("day")).toBe("DAYS");
    expect(normalizeUnit("days")).toBe("DAYS");
    expect(normalizeUnit("week")).toBe("WEEKS");
    expect(normalizeUnit("month")).toBe("MONTHS");
  });

  it("should normalize rate units", () => {
    expect(normalizeUnit("units/day")).toBe("UNITS_PER_DAY");
    expect(normalizeUnit("units per day")).toBe("UNITS_PER_DAY");
    expect(normalizeUnit("per week")).toBe("UNITS_PER_WEEK");
  });

  it("should return null for unknown units", () => {
    expect(normalizeUnit("foobar")).toBe(null);
    expect(normalizeUnit("xyz")).toBe(null);
  });

  it("should be case insensitive", () => {
    expect(normalizeUnit("USD")).toBe("USD");
    expect(normalizeUnit("Usd")).toBe("USD");
    expect(normalizeUnit("PERCENT")).toBe("PERCENT");
  });
});

describe("parseValueWithUnit", () => {
  it("should parse dollar amounts", () => {
    const result = parseValueWithUnit("$5.99");
    expect(result).toEqual({ value: 5.99, unit: "USD" });
  });

  it("should parse percentages", () => {
    const result = parseValueWithUnit("15%");
    expect(result).toEqual({ value: 15, unit: "PERCENT" });
  });

  it("should parse quantities with units", () => {
    const result = parseValueWithUnit("100 units");
    expect(result).toEqual({ value: 100, unit: "UNITS" });
  });

  it("should parse with extra whitespace", () => {
    const result = parseValueWithUnit("  $  10.50  ");
    expect(result).toEqual({ value: 10.5, unit: "USD" });
  });

  it("should handle decimal values", () => {
    const result = parseValueWithUnit("12.5%");
    expect(result).toEqual({ value: 12.5, unit: "PERCENT" });
  });

  it("should return null for invalid input", () => {
    expect(parseValueWithUnit("no numbers here")).toBe(null);
    expect(parseValueWithUnit("")).toBe(null);
  });

  it("should parse cases", () => {
    const result = parseValueWithUnit("50 cases");
    expect(result).toEqual({ value: 50, unit: "CASES" });
  });
});

