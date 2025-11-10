import { z } from "zod";

/**
 * Zod schema for extracted claims
 * Enforces structured data extraction from call transcripts
 */

// Base claim field types
export const ClaimFieldType = z.enum([
  "PRICE",
  "VELOCITY",
  "STOCKOUT",
  "INVENTORY_LEVEL",
  "MARKET_SHARE",
  "PROMOTION",
  "COMPETITIVE_ACTIVITY",
  "CUSTOMER_FEEDBACK",
  "OTHER",
]);

export type ClaimFieldType = z.infer<typeof ClaimFieldType>;

// Normalized unit types
export const UnitType = z.enum([
  // Monetary
  "USD",
  "EUR",
  "GBP",
  "JPY",
  
  // Percentage
  "PERCENT",
  
  // Quantity
  "UNITS",
  "CASES",
  "PALLETS",
  "BOXES",
  
  // Time
  "DAYS",
  "WEEKS",
  "MONTHS",
  
  // Rate
  "UNITS_PER_DAY",
  "UNITS_PER_WEEK",
  "UNITS_PER_MONTH",
  
  // Other
  "NONE",
]);

export type UnitType = z.infer<typeof UnitType>;

/**
 * Core claim schema - what the extraction model MUST return
 */
export const ClaimSchema = z.object({
  // Required: Type of claim being made
  field: ClaimFieldType,
  
  // Value fields (at least one must be present)
  valueNumber: z.number().optional(),
  valueText: z.string().optional(),
  
  // Normalized unit (required if valueNumber is present)
  unit: UnitType.optional(),
  
  // Optional identifiers for linking claims to entities
  skuId: z.string().optional(),
  geoCode: z.string().optional(), // ISO country code or region identifier
  
  // Temporal information (required)
  startSec: z.number().min(0), // When the claim starts in the recording
  endSec: z.number().min(0).optional(), // When the claim ends (if different from start)
  
  // Confidence and linking
  confidence: z.number().min(0).max(1), // Model's confidence in extraction
  hypothesisId: z.string().optional(), // Link to hypothesis if applicable
  
  // Optional metadata
  rawText: z.string().optional(), // Original text snippet from transcript
  context: z.string().optional(), // Surrounding context for review
});

export type Claim = z.infer<typeof ClaimSchema>;

/**
 * Schema for the complete extraction response from the model
 */
export const ExtractionResponseSchema = z.object({
  claims: z.array(ClaimSchema),
  metadata: z.object({
    modelVersion: z.string().optional(),
    extractionTimestamp: z.string().optional(),
    totalClaims: z.number().optional(),
  }).optional(),
});

export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>;

/**
 * Validation rules for claims
 */
export function validateClaim(claim: Claim): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // At least one value field must be present
  if (!claim.valueNumber && !claim.valueText) {
    errors.push("Claim must have either valueNumber or valueText");
  }
  
  // If valueNumber is present, unit should be present (unless it's a count)
  if (claim.valueNumber !== undefined && !claim.unit) {
    errors.push("Claims with valueNumber should specify a unit");
  }
  
  // endSec must be >= startSec if present
  if (claim.endSec !== undefined && claim.endSec < claim.startSec) {
    errors.push("endSec must be greater than or equal to startSec");
  }
  
  // Confidence should be reasonable (warn if too high or too low)
  if (claim.confidence < 0.3) {
    errors.push("Confidence is very low (<0.3), consider rejecting this claim");
  }
  
  // Field-specific validations
  if (claim.field === "PRICE" && claim.valueNumber === undefined) {
    errors.push("PRICE claims should have a numeric value");
  }
  
  if (claim.field === "STOCKOUT" && claim.valueText === undefined) {
    errors.push("STOCKOUT claims should have descriptive text");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Unit normalization helpers
 */
export function normalizeUnit(rawUnit: string): UnitType | null {
  const normalized = rawUnit.toLowerCase().trim();
  
  // Monetary
  if (["$", "usd", "dollar", "dollars"].includes(normalized)) return "USD";
  if (["€", "eur", "euro", "euros"].includes(normalized)) return "EUR";
  if (["£", "gbp", "pound", "pounds"].includes(normalized)) return "GBP";
  if (["¥", "jpy", "yen"].includes(normalized)) return "JPY";
  
  // Percentage
  if (["%", "percent", "percentage", "pct"].includes(normalized)) return "PERCENT";
  
  // Quantity
  if (["unit", "units", "piece", "pieces", "item", "items"].includes(normalized)) return "UNITS";
  if (["case", "cases"].includes(normalized)) return "CASES";
  if (["pallet", "pallets"].includes(normalized)) return "PALLETS";
  if (["box", "boxes"].includes(normalized)) return "BOXES";
  
  // Time
  if (["day", "days"].includes(normalized)) return "DAYS";
  if (["week", "weeks"].includes(normalized)) return "WEEKS";
  if (["month", "months"].includes(normalized)) return "MONTHS";
  
  // Rate
  if (["units/day", "units per day", "per day"].includes(normalized)) return "UNITS_PER_DAY";
  if (["units/week", "units per week", "per week"].includes(normalized)) return "UNITS_PER_WEEK";
  if (["units/month", "units per month", "per month"].includes(normalized)) return "UNITS_PER_MONTH";
  
  return null;
}

/**
 * Parse and normalize a numeric value with unit
 */
export function parseValueWithUnit(
  text: string
): { value: number; unit: UnitType } | null {
  // Try to extract number and unit from text
  // Examples: "$5.99", "15%", "100 units", "5 cases per week"
  
  // Trim whitespace first
  const trimmed = text.trim();
  
  const patterns = [
    // Currency at start: $5.99 (with optional spaces)
    /^[$€£¥]\s*(\d+(?:\.\d+)?)/,
    // Number with % at end: 15%
    /(\d+(?:\.\d+)?)\s*%/,
    // Number with unit: 100 units, 5 cases
    /(\d+(?:\.\d+)?)\s+(\w+)/,
  ];
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (isNaN(value)) continue;
      
      // Determine unit based on pattern
      if (trimmed.includes("$") || trimmed.includes("€") || trimmed.includes("£") || trimmed.includes("¥")) {
        // Check which currency
        if (trimmed.includes("$")) return { value, unit: "USD" };
        if (trimmed.includes("€")) return { value, unit: "EUR" };
        if (trimmed.includes("£")) return { value, unit: "GBP" };
        if (trimmed.includes("¥")) return { value, unit: "JPY" };
      } else if (trimmed.includes("%")) {
        return { value, unit: "PERCENT" };
      } else if (match[2]) {
        const unit = normalizeUnit(match[2]);
        if (unit) {
          return { value, unit };
        }
      }
    }
  }
  
  return null;
}

