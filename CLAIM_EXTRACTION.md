# Typed Claims & Zod Contract (Extraction)

## Overview

This document describes the typed claims extraction system with end-to-end Zod schema validation. The system ensures that all extracted claims from call transcripts conform to a strict, structured format with normalized units and validated data.

## Architecture

### 1. Zod Schema Definition (`src/lib/schemas/claim.ts`)

The core schema defines the structure of extracted claims:

```typescript
{
  field: ClaimFieldType,           // Type of claim (PRICE, VELOCITY, etc.)
  valueNumber?: number,             // Numeric value (e.g., 5.99, 15, 100)
  valueText?: string,               // Text value for qualitative claims
  unit?: UnitType,                  // Normalized unit (USD, PERCENT, UNITS, etc.)
  skuId?: string,                   // Product/SKU identifier
  geoCode?: string,                 // ISO country code or region
  startSec: number,                 // Timestamp in seconds (required)
  endSec?: number,                  // End timestamp if claim spans time
  confidence: number,               // 0-1 score from extraction
  hypothesisId?: string,            // Link to hypothesis if applicable
  rawText?: string,                 // Original quote from transcript
  context?: string                  // Surrounding context for review
}
```

#### Claim Field Types

- `PRICE` - Pricing information
- `VELOCITY` - Sales velocity/rate
- `STOCKOUT` - Out of stock events
- `INVENTORY_LEVEL` - Current inventory counts
- `MARKET_SHARE` - Market share percentages
- `PROMOTION` - Promotional activities
- `COMPETITIVE_ACTIVITY` - Competitor actions
- `CUSTOMER_FEEDBACK` - Customer opinions
- `OTHER` - Other factual claims

#### Normalized Units

**Monetary:**
- `USD`, `EUR`, `GBP`, `JPY`

**Percentage:**
- `PERCENT`

**Quantity:**
- `UNITS`, `CASES`, `PALLETS`, `BOXES`

**Time:**
- `DAYS`, `WEEKS`, `MONTHS`

**Rate:**
- `UNITS_PER_DAY`, `UNITS_PER_WEEK`, `UNITS_PER_MONTH`

### 2. Robust Parser (`src/lib/parsers/claim-parser.ts`)

The parser handles model output with multiple layers of validation:

#### Features

1. **JSON Parsing** - Handles malformed JSON with repair attempts
2. **Schema Validation** - Validates against Zod schema
3. **Claim Validation** - Business logic validation (e.g., PRICE claims must have numeric values)
4. **Automatic Repair** - Attempts to fix common issues:
   - Removes markdown code blocks
   - Strips extraneous text
   - Fixes trailing commas
   - Converts single quotes to double quotes
5. **Failure Logging** - Logs all parse failures for review

#### Usage

```typescript
import { ClaimParser } from "@/lib/parsers/claim-parser";

const result = ClaimParser.parseWithRepair(modelOutput);

if (result.success) {
  // Use validated claims
  const claims = result.data.claims;
} else {
  // Handle error
  console.error(result.error);
}
```

### 3. Extraction Function (`src/lib/inngest/functions/extract-claims.ts`)

The Inngest function orchestrates the extraction process:

1. Fetch campaign and hypotheses
2. Build RAG context from checklist
3. Generate structured prompt with schema definition
4. Call GPT-4o with JSON mode
5. Parse and validate output
6. Save structured claims to database
7. Trigger hypothesis validation if threshold met

#### Agent Prompt

The prompt includes:
- Complete schema definition with all field types
- Extraction rules (normalize units, precise timestamps, etc.)
- Category-specific context
- RAG checklist guidance
- Hypotheses to validate against

### 4. Database Schema (`prisma/schema.prisma`)

The Prisma schema stores structured claims:

```prisma
model Claim {
  // Structured fields
  field        ClaimField
  valueNumber  Float?
  valueText    String?
  unit         ClaimUnit?
  skuId        String?
  geoCode      String?
  
  // Temporal
  startSec     Float
  endSec       Float?
  
  // Metadata
  confidence   Float
  validated    Boolean
  rawText      String?
  context      String?
  
  // Relations
  call         Call
  hypothesis   Hypothesis?
}
```

## Validation Rules

### Schema Validation (Automatic)

- `field` must be a valid ClaimFieldType enum
- `confidence` must be between 0 and 1
- `startSec` must be >= 0
- `endSec` must be >= startSec if present
- `unit` must be a valid UnitType enum if present

### Business Logic Validation

1. **At least one value field required**: Either `valueNumber` or `valueText` must be present
2. **Unit required for numeric values**: If `valueNumber` is present, `unit` should be specified
3. **Confidence threshold**: Claims with confidence < 0.3 are flagged
4. **Field-specific rules**:
   - `PRICE` claims should have `valueNumber`
   - `STOCKOUT` claims should have `valueText`

## Unit Normalization

The system automatically normalizes various unit representations:

```typescript
// Examples
"$" | "usd" | "dollar" → "USD"
"%" | "percent" | "pct" → "PERCENT"
"unit" | "units" | "piece" → "UNITS"
"case" | "cases" → "CASES"
"units/day" | "per day" → "UNITS_PER_DAY"
```

### Helper Functions

```typescript
import { normalizeUnit, parseValueWithUnit } from "@/lib/schemas/claim";

// Normalize a unit string
const unit = normalizeUnit("$"); // Returns "USD"

// Parse value with unit from text
const parsed = parseValueWithUnit("$5.99"); 
// Returns { value: 5.99, unit: "USD" }
```

## Testing

### Unit Tests

Run schema and parser tests:

```bash
npm test src/lib/schemas/__tests__/claim.test.ts
npm test src/lib/parsers/__tests__/claim-parser.test.ts
```

### Integration Tests

Test with synthetic transcripts:

```bash
npm test src/lib/parsers/__tests__/extraction-integration.test.ts
```

### Test Coverage

The test suite includes:

1. **Schema validation tests** - All field types and validation rules
2. **Unit normalization tests** - All supported unit conversions
3. **Parser tests** - JSON parsing, repair, and error handling
4. **Integration tests** - End-to-end extraction with realistic scenarios:
   - Price claims ($5.99, 15% increase)
   - Velocity claims (100 units/day, 50 cases/week)
   - Stockout claims (duration, patterns)
   - Inventory levels (500 units, 25 cases)
   - Market share (23.5%)
   - Promotions (20% off)
   - Competitive activity (competitor pricing)
   - Multiple claims in single extraction

## Error Handling

### Parse Failures

All parse failures are logged for review:

```typescript
import { ParseFailureLogger } from "@/lib/parsers/claim-parser";

// Get all failures
const failures = ParseFailureLogger.getFailures();

// Get failure rate in time window
const rate = ParseFailureLogger.getFailureRate(3600000); // 1 hour

// Clear failures
ParseFailureLogger.clearFailures();
```

### Failure Log Structure

```typescript
{
  timestamp: Date,
  callId: string,
  rawOutput: string,    // Raw model output
  error: string,        // Error message
  rawData?: unknown     // Parsed but invalid data
}
```

## Best Practices

### For Model Prompting

1. Always include the complete schema in the system prompt
2. Provide examples of normalized units
3. Emphasize the importance of precise timestamps
4. Request confidence scores based on clarity
5. Link claims to hypotheses when relevant

### For Validation

1. Reject claims with very low confidence (<0.3)
2. Flag claims missing required fields for review
3. Validate field-specific requirements (e.g., PRICE needs numbers)
4. Check for reasonable value ranges
5. Ensure temporal consistency (endSec >= startSec)

### For Unit Normalization

1. Always normalize units before storage
2. Use helper functions for parsing
3. Handle edge cases (e.g., "per week" vs "units per week")
4. Log unrecognized units for future support
5. Prefer standard units (USD over $, PERCENT over %)

## Monitoring

### Key Metrics

1. **Parse success rate** - % of model outputs successfully parsed
2. **Validation pass rate** - % of parsed claims passing validation
3. **Confidence distribution** - Distribution of confidence scores
4. **Field type distribution** - Which claim types are most common
5. **Unit coverage** - Which units are being used

### Alerts

Set up alerts for:
- Parse failure rate > 5%
- Validation failure rate > 10%
- Average confidence < 0.7
- Unrecognized units appearing frequently

## Migration Guide

### From Legacy Claims

Legacy claims have a simple `text` field. To migrate:

1. Keep the `text` field for backward compatibility
2. Add structured fields (`field`, `valueNumber`, etc.)
3. Generate `text` from structured fields using `generateClaimText()`
4. Gradually backfill structured fields for existing claims

### Example Migration

```typescript
// Old format
{
  text: "The price is $5.99",
  timestamp: 45.5,
  confidence: 0.9
}

// New format
{
  field: "PRICE",
  valueNumber: 5.99,
  unit: "USD",
  startSec: 45.5,
  confidence: 0.9,
  rawText: "The price is $5.99",
  text: "[PRICE] 5.99 USD - \"The price is $5.99\"" // Generated
}
```

## Future Enhancements

1. **Multi-language support** - Normalize units across languages
2. **Currency conversion** - Convert all prices to base currency
3. **Temporal normalization** - Convert relative times to absolute dates
4. **Entity linking** - Link SKUs and geo codes to master data
5. **Confidence calibration** - Adjust confidence based on historical accuracy
6. **Active learning** - Use failed parses to improve prompts

## API Reference

### ClaimSchema

```typescript
import { ClaimSchema, type Claim } from "@/lib/schemas/claim";

// Validate a claim
const result = ClaimSchema.safeParse(claim);
if (result.success) {
  const validClaim: Claim = result.data;
}
```

### ClaimParser

```typescript
import { ClaimParser } from "@/lib/parsers/claim-parser";

// Parse model output
const result = ClaimParser.parseModelOutput(output);

// Parse with automatic repair
const result = ClaimParser.parseWithRepair(output);

// Parse single claim
const result = ClaimParser.parseClaim(claimData);
```

### Unit Helpers

```typescript
import { 
  normalizeUnit, 
  parseValueWithUnit 
} from "@/lib/schemas/claim";

// Normalize a unit
const unit = normalizeUnit("$"); // "USD"

// Parse value with unit
const parsed = parseValueWithUnit("15%"); 
// { value: 15, unit: "PERCENT" }
```

### Validation

```typescript
import { validateClaim } from "@/lib/schemas/claim";

const validation = validateClaim(claim);
if (!validation.valid) {
  console.error(validation.errors);
}
```

## Support

For issues or questions:
1. Check the test suite for examples
2. Review parse failure logs
3. Consult the schema definitions
4. Reach out to the team

