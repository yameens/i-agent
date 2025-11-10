# Inngest Orchestration - Quick Reference

## Event Triggers

### 1. Orchestrate Call
```typescript
await inngest.send({
  name: "call/orchestrate",
  data: {
    callId: string,        // Database call ID
    campaignId: string,    // Database campaign ID
    phoneNumber: string,   // E.164 format: +15551234567
  },
});
```

### 2. Transcribe Recording
```typescript
await inngest.send({
  name: "call/transcribe",
  data: {
    callId: string,              // Database call ID
    recordingUrl: string,        // Twilio recording URL
    recordingDualUrl?: string,   // Optional dual-channel URL
  },
});
```

### 3. Extract Claims
```typescript
await inngest.send({
  name: "claim/extract",
  data: {
    callId: string,        // Database call ID
    campaignId: string,    // Database campaign ID
    transcript: string,    // Full transcript text
  },
});
```

### 4. Validate Claims
```typescript
await inngest.send({
  name: "claim/validate",
  data: {
    hypothesisId: string,  // Database hypothesis ID
    campaignId: string,    // Database campaign ID
  },
});
```

---

## Function Configurations

| Function | Retries | Timeout | Concurrency | Rate Limit |
|----------|---------|---------|-------------|------------|
| orchestrate-call | 3 | 30s | - | 10/min per campaign |
| transcribe-recording | 3 | 5m | 5 global | - |
| extract-claims | 3 | 2m | 3 global | - |
| validate-claim | 3 | 2m | 2 global | Debounce 5s |

---

## Idempotency Behavior

### orchestrate-call
- **Check**: Existing `twilioSid` on Call
- **Skip if**: Call has twilioSid AND status is IN_PROGRESS/COMPLETED/FAILED
- **Safe to retry**: Yes, will skip if already processed

### transcribe-recording
- **Check**: Existing `transcript` AND utterances count > 0
- **Skip if**: Both exist
- **Safe to retry**: Yes, will skip if already transcribed

### extract-claims
- **Check**: Existing claims for `callId`
- **Skip if**: Any claims exist for the call
- **Safe to retry**: Yes, will skip if claims already extracted

### validate-claim
- **Check**: Hypothesis `status` !== PENDING
- **Skip if**: Already VALIDATED/INVALIDATED/INCONCLUSIVE
- **Safe to retry**: Yes, debounced and status-checked

---

## Error Types

### NonRetriableError (Permanent Failures)
- Invalid phone number (Twilio 21211, 21217)
- Campaign not found
- Campaign not ACTIVE
- Call/Hypothesis not found
- Recording not found (404)
- File too large (>25MB)
- Invalid audio format
- Silent recording (no words)
- Transcript too short (<50 chars)
- No hypotheses in campaign
- Invalid GPT-4 response structure

### Retriable Errors (Transient Failures)
- Network timeouts
- API rate limits
- Temporary service unavailability
- Database connection issues

---

## Return Value Structures

### orchestrate-call
```typescript
{
  success: boolean;
  callId: string;
  twilioSid: string;
  skipped: boolean;
  reason?: string;  // If skipped
}
```

### transcribe-recording
```typescript
{
  success: boolean;
  callId: string;
  utteranceCount: number;
  skipped: boolean;
  reason?: string;  // If skipped
}
```

### extract-claims
```typescript
{
  success: boolean;
  callId: string;
  claimsExtracted: number;
  hypothesesTriggered: number;
  skipped: boolean;
  reason?: string;  // If skipped
}
```

### validate-claim
```typescript
{
  success: boolean;
  hypothesisId: string;
  status: "VALIDATED" | "INVALIDATED" | "INCONCLUSIVE";
  consistencyScore: number;  // 0-1
  claimsAnalyzed: number;
  uniqueCallsAnalyzed: number;
  campaignComplete: boolean;
  skipped: boolean;
  reason?: string;  // If skipped
}
```

---

## Validation Thresholds

### Claim Extraction Trigger
- **Minimum**: ≥3 claims
- **Requirement**: Claims must be from ≥3 different calls
- **Action**: Emits `claim/validate` event

### Hypothesis Validation
- **Minimum**: ≥3 claims from ≥3 different calls
- **Criteria**:
  - **VALIDATED**: Consistent claims, avg confidence ≥0.6
  - **INVALIDATED**: Contradictory or low confidence
  - **INCONCLUSIVE**: Mixed signals

---

## Database Schema Quick Reference

### Call
```typescript
{
  id: string;
  campaignId: string;
  phoneNumber: string;
  twilioSid?: string;
  status: "QUEUED" | "RINGING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NO_ANSWER";
  recordingUrl?: string;
  recordingDualUrl?: string;
  transcript?: string;
  duration?: number;
  consentGiven: boolean;
  startedAt?: Date;
  completedAt?: Date;
}
```

### Utterance
```typescript
{
  id: string;
  callId: string;
  speaker: "AI" | "HUMAN";
  text: string;
  timestamp: number;  // seconds from call start
  confidence?: number;  // 0-1
}
```

### Claim
```typescript
{
  id: string;
  callId: string;
  hypothesisId?: string;
  text: string;
  evidenceUrl: string;  // recording URL + timestamp
  timestamp: number;  // seconds from call start
  confidence: number;  // 0-1
  validated: boolean;
}
```

### Hypothesis
```typescript
{
  id: string;
  campaignId: string;
  question: string;
  status: "PENDING" | "VALIDATED" | "INVALIDATED" | "INCONCLUSIVE";
  conclusion?: string;
}
```

---

## Common Patterns

### Trigger a Complete Call Flow
```typescript
// 1. Create call in database
const call = await db.call.create({
  data: {
    campaignId: "campaign_123",
    phoneNumber: "+15551234567",
    status: "QUEUED",
  },
});

// 2. Trigger orchestration
await inngest.send({
  name: "call/orchestrate",
  data: {
    callId: call.id,
    campaignId: call.campaignId,
    phoneNumber: call.phoneNumber,
  },
});

// Rest happens automatically via webhooks and event chaining
```

### Manual Transcription (if webhook missed)
```typescript
await inngest.send({
  name: "call/transcribe",
  data: {
    callId: "call_123",
    recordingUrl: "https://api.twilio.com/...",
  },
});
```

### Re-extract Claims (with new prompt)
```typescript
// Delete existing claims first
await db.claim.deleteMany({ where: { callId: "call_123" } });

// Trigger re-extraction
await inngest.send({
  name: "claim/extract",
  data: {
    callId: "call_123",
    campaignId: "campaign_456",
    transcript: "...",
  },
});
```

### Force Re-validation
```typescript
// Reset hypothesis status
await db.hypothesis.update({
  where: { id: "hyp_789" },
  data: { status: "PENDING", conclusion: null },
});

// Trigger validation
await inngest.send({
  name: "claim/validate",
  data: {
    hypothesisId: "hyp_789",
    campaignId: "campaign_456",
  },
});
```

---

## Debugging Tips

### Check Function Status
1. Go to Inngest Dashboard
2. Navigate to Functions
3. Click on function name
4. View recent runs and step-by-step execution

### Check Database State
```sql
-- Check call status
SELECT id, status, twilioSid, transcript FROM calls WHERE id = 'call_123';

-- Check utterances
SELECT COUNT(*) FROM utterances WHERE callId = 'call_123';

-- Check claims
SELECT id, text, confidence, validated FROM claims WHERE callId = 'call_123';

-- Check hypothesis status
SELECT id, question, status, conclusion FROM hypotheses WHERE campaignId = 'campaign_456';
```

### Common Issues

**Issue**: Call stuck in QUEUED
- Check Inngest dashboard for `orchestrate-call` errors
- Verify Twilio credentials
- Check campaign status (must be ACTIVE)

**Issue**: No transcript after call completes
- Check if recording webhook fired
- Manually trigger `call/transcribe` event
- Verify recording URL is accessible

**Issue**: Claims not extracted
- Check if transcript exists and is >50 chars
- Verify campaign has hypotheses
- Check Inngest dashboard for GPT-4 errors

**Issue**: Hypothesis stuck in PENDING
- Check if ≥3 claims from ≥3 different calls
- Manually trigger `claim/validate` event
- Review claim quality and confidence scores

---

## API Endpoints

### Inngest Webhook
```
POST /api/inngest
```
Used by Inngest Cloud to execute functions. Do not call directly.

### Twilio Webhooks
```
POST /api/webhooks/twilio/voice?callId={callId}
POST /api/webhooks/twilio/status?callId={callId}
POST /api/webhooks/twilio/recording?callId={callId}
POST /api/webhooks/twilio/consent?callId={callId}
```

---

## Environment Setup

### Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run Inngest dev server
npx inngest-cli@latest dev

# Run Next.js dev server
npm run dev
```

### Production
```bash
# Set environment variables in hosting platform
# Configure Inngest webhook URL: https://yourdomain.com/api/inngest
# Deploy application
# Verify Inngest functions registered in dashboard
```

---

## Cost Optimization

### Reduce Transcription Costs
- Use shorter recordings for testing
- Consider caching transcripts
- Batch process recordings during off-peak hours

### Reduce GPT-4 Costs
- Cache RAG context for repeated categories
- Use GPT-4o-mini for less critical extractions
- Optimize prompt length
- Set appropriate `max_tokens`

### Reduce Twilio Costs
- Use shorter test calls
- Implement call duration limits
- Use Twilio's answering machine detection

---

## Monitoring Metrics

### Key Metrics to Track
- **Call success rate**: COMPLETED / (COMPLETED + FAILED)
- **Transcription success rate**: Transcripts / Completed calls
- **Claim extraction rate**: Claims / Transcripts
- **Validation rate**: Validated hypotheses / Total hypotheses
- **Average latency per step**
- **Retry rate per function**
- **Error rate per function**

### Alerts to Configure
- Function failure rate >5%
- Average latency >2x baseline
- Retry rate >20%
- Database connection pool exhaustion
- API quota approaching limit

---

## Quick Links

- **Inngest Dashboard**: https://app.inngest.com
- **Documentation**: See INNGEST_ORCHESTRATION.md
- **Summary**: See ORCHESTRATION_SUMMARY.md
- **Schema**: See prisma/schema.prisma
- **Functions**: See src/lib/inngest/functions/

---

## Support

For issues or questions:
1. Check Inngest dashboard for function errors
2. Review database state for data issues
3. Check application logs for API errors
4. Consult INNGEST_ORCHESTRATION.md for detailed documentation

