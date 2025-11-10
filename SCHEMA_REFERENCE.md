# Schema Field Reference

## Claim Model Fields

When working with the `Claim` model, use these correct field names:

### ✅ Correct Field Names

```typescript
// From prisma/schema.prisma Claim model

// Structured claim fields
field: ClaimField           // Type: PRICE, VELOCITY, STOCK, DEMAND, etc.
valueNumber: Float?         // Numeric value (e.g., 5.99, 15, 100)
valueText: String?          // Text value for qualitative claims
unit: ClaimUnit?            // USD, PERCENT, UNITS, etc.
skuId: String?              // Product/SKU identifier
geoCode: String?            // ISO country code or region

// Legacy field
text: String                // Human-readable summary

// Temporal and evidence
evidenceUrl: String         // Recording URL + timestamp fragment
startSec: Float             // Seconds from call start ⚠️ NOT "timestamp"
endSec: Float?              // End timestamp if claim spans time

// Metadata
confidence: Float           // 0-1 score
validated: Boolean          // Validation status
rawText: String?            // Original quote from transcript
context: String?            // Surrounding context
```

### ❌ Common Mistakes

```typescript
// DON'T USE THESE (they don't exist in the schema)
timestamp: claim.timestamp  ❌ Use: claim.startSec
sku: claim.sku             ❌ Use: claim.skuId
geo: claim.geo             ❌ Use: claim.geoCode
```

### 💡 Correct Usage Example

```typescript
// ✅ Correct way to map Claim to Signal
const signals: Signal[] = claims.map((claim) => ({
  id: claim.id,
  claim: claim.text,
  sku: claim.skuId,              // ✅ Correct
  geo: claim.geoCode,            // ✅ Correct
  field: claim.field,            // ✅ Correct
  confidence: claim.confidence,
  validated: claim.validated,
  timestamp: claim.startSec,     // ✅ Correct (not claim.timestamp)
  callId: claim.call.id,
  phoneNumber: claim.call.phoneNumber,
  evidenceUrl: claim.evidenceUrl,
}));
```

---

## ClaimField Enum

Available claim types:

```typescript
enum ClaimField {
  PRICE          // Price-related claims
  VELOCITY       // Sales velocity/demand
  STOCK          // Inventory/stock levels
  DEMAND         // Customer demand
  PROMO          // Promotions/discounts
  QUALITY        // Product quality
  AVAILABILITY   // Product availability
  DISPLAY        // Store display/placement
  COMPETITION    // Competitor activity
  OTHER          // Other types
}
```

---

## ClaimUnit Enum

Available units for numeric values:

```typescript
enum ClaimUnit {
  USD            // US Dollars
  PERCENT        // Percentage
  UNITS          // Unit count
  DAYS           // Days
  WEEKS          // Weeks
  STORES         // Store count
}
```

---

## Call Model Fields

```typescript
// Relevant Call fields
id: String
phoneNumber: String
status: CallStatus
recordingUrl: String?
recordingDualUrl: String?
duration: Int?              // seconds
consentGiven: Boolean
transcript: String?
startedAt: DateTime?
completedAt: DateTime?
```

---

## Utterance Model Fields

```typescript
// For transcript display
speaker: Speaker            // AI or HUMAN
text: String
timestamp: Float            // seconds from call start ✅ This one IS "timestamp"
confidence: Float?          // ASR confidence
```

**Note:** `Utterance.timestamp` is correct, but `Claim` uses `startSec`!

---

## Quick Reference Table

| Feature | Schema Field | UI Display | Type |
|---------|--------------|------------|------|
| Product | `skuId` | SKU | String? |
| Region | `geoCode` | Geography | String? |
| Type | `field` | Field | ClaimField |
| Time | `startSec` | Timestamp | Float |
| Text | `text` | Claim | String |
| Score | `confidence` | Confidence | Float |
| Status | `validated` | Validated | Boolean |
| Audio | `evidenceUrl` | Evidence URL | String |

---

## tRPC Query Example

```typescript
// This query returns all Claim fields by default
const { data: claims } = trpc.insight.listValidatedClaims.useQuery({
  campaignId: "...",
  validated: true,
});

// Access fields correctly:
claims?.forEach(claim => {
  console.log(claim.skuId);      // ✅ Product SKU
  console.log(claim.geoCode);    // ✅ Geography
  console.log(claim.field);      // ✅ Claim type
  console.log(claim.startSec);   // ✅ Timestamp
  console.log(claim.text);       // ✅ Claim text
});
```

---

## Common Filters

### Filter by SKU
```typescript
const bySku = claims.filter(c => c.skuId === "PRODUCT-123");
```

### Filter by Geography
```typescript
const byGeo = claims.filter(c => c.geoCode === "US");
```

### Filter by Claim Type
```typescript
const priceCllaims = claims.filter(c => c.field === "PRICE");
```

### Filter by Time Range
```typescript
const inRange = claims.filter(c => 
  c.startSec >= 30 && c.startSec <= 60
);
```

---

## Migration Guide

If you have existing code using the old field names:

```typescript
// OLD (incorrect)
timestamp: claim.timestamp
sku: claim.sku
geo: claim.geo

// NEW (correct)
timestamp: claim.startSec
sku: claim.skuId
geo: claim.geoCode
```

---

**Remember:** Always refer to `prisma/schema.prisma` for the source of truth!

