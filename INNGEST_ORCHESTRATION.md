# Inngest Durable Orchestration

This document describes the durable orchestration system built with Inngest for the Rondo platform (Continuous Consumer Intelligence).

## Overview

The orchestration system handles the complete lifecycle of channel-check calls, from initiation through transcription, claim extraction, and validation. Each step is durable, retryable, and idempotent.

## Architecture

```
┌─────────────────┐
│  orchestrate-   │  Creates call, initiates Twilio
│     call        │  → Emits: call/recording-ready (via webhook)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  transcribe-    │  Downloads audio, transcribes with Whisper
│   recording     │  → Emits: claim/extract
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  extract-       │  RAG + GPT-4 structured extraction
│    claims       │  → Emits: claim/validate (when ≥3 claims)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  validate-      │  Triangulation analysis with GPT-4
│    claim        │  → Marks hypothesis as VALIDATED/INVALIDATED
└─────────────────┘
```

## Functions

### 1. orchestrate-call

**Event**: `call/orchestrate`

**Purpose**: Initiates a Twilio call and tracks its lifecycle.

**Flow**:
1. **Idempotency check**: Skip if call already has a Twilio SID
2. **Fetch campaign**: Validate campaign exists and is ACTIVE
3. **Update status**: Mark call as RINGING
4. **Initiate Twilio call**: Create call with dual-channel recording
5. **Update with SID**: Store Twilio SID for tracking

**Configuration**:
- **Retries**: 3 attempts with exponential backoff
- **Rate limit**: 10 concurrent calls per campaign per minute
- **Timeout**: 30s for Twilio API call

**Error Handling**:
- Invalid phone numbers (21211, 21217) → NonRetriableError
- Network/rate limit errors → Retry with backoff
- Campaign not ACTIVE → NonRetriableError

**Idempotency**: Checks for existing `twilioSid` before processing

---

### 2. transcribe-recording

**Event**: `call/transcribe`

**Purpose**: Downloads recording, transcribes with Whisper, and creates utterances with speaker diarization.

**Flow**:
1. **Idempotency check**: Skip if transcript and utterances exist
2. **Download recording**: Fetch dual-channel audio from Twilio
3. **Transcribe**: Use OpenAI Whisper with word-level timestamps
4. **Parse utterances**: Group words by pauses (>1.5s) with speaker alternation
5. **Save to database**: Atomic transaction to store transcript + utterances
6. **Trigger extraction**: Emit `claim/extract` event

**Configuration**:
- **Retries**: 3 attempts with exponential backoff
- **Concurrency**: Max 5 concurrent transcriptions
- **Timeouts**:
  - Download: 2 minutes
  - Transcription: 5 minutes
  - Database save: 30 seconds

**Error Handling**:
- 404 on recording URL → NonRetriableError
- File too large (>25MB) → NonRetriableError
- Invalid audio format → NonRetriableError
- Silent recording (no words) → NonRetriableError

**Idempotency**: Checks for existing transcript and utterances; uses `skipDuplicates` on batch insert

**Speaker Diarization**:
- Simple pause-based heuristic (>1.5s pause = speaker change)
- Alternates between AI and HUMAN
- Production recommendation: Use Deepgram or AssemblyAI for better accuracy

---

### 3. extract-claims

**Event**: `claim/extract`

**Purpose**: Extracts structured claims from transcript using RAG + GPT-4.

**Flow**:
1. **Idempotency check**: Skip if claims already exist for call
2. **Validate transcript**: Ensure minimum length (50 chars)
3. **Fetch campaign**: Load hypotheses to match claims against
4. **Build RAG context**: Retrieve relevant checklist items
5. **Extract with GPT-4**: Structured extraction with confidence scores
6. **Save claims**: Atomic transaction with hypothesis matching
7. **Check threshold**: Trigger validation when ≥3 claims from ≥3 different calls

**Configuration**:
- **Retries**: 3 attempts with exponential backoff
- **Concurrency**: Max 3 concurrent extractions
- **Timeouts**:
  - RAG context: 30 seconds
  - GPT-4 extraction: 2 minutes
  - Database save: 30 seconds

**Error Handling**:
- Transcript too short → NonRetriableError
- No hypotheses → NonRetriableError
- Invalid GPT-4 response → NonRetriableError
- Network errors → Retry with backoff

**Idempotency**: Checks for existing claims by `callId`

**Validation Trigger**:
- Requires ≥3 claims from ≥3 different calls
- Uses event batching to avoid duplicate validations
- Includes timestamp-based idempotency key

**GPT-4 Prompt**:
- Extracts factual claims from HUMAN speaker
- Assigns confidence scores (0-1)
- Matches to hypotheses
- Filters invalid claims (too short, invalid confidence, etc.)

---

### 4. validate-claim

**Event**: `claim/validate`

**Purpose**: Validates hypotheses through triangulation of ≥3 corroborating claims.

**Flow**:
1. **Idempotency check**: Skip if hypothesis already validated
2. **Fetch hypothesis**: Load all claims with call metadata
3. **Validate threshold**: Ensure ≥3 claims from ≥3 different calls
4. **Analyze consistency**: GPT-4 triangulation analysis
5. **Update hypothesis**: Atomic transaction to update status and mark claims
6. **Check campaign**: Determine if all hypotheses resolved

**Configuration**:
- **Retries**: 3 attempts with exponential backoff
- **Concurrency**: Max 2 concurrent validations
- **Debounce**: 5 seconds per hypothesis (avoids duplicate validations)
- **Timeouts**:
  - GPT-4 analysis: 2 minutes
  - Database update: 30 seconds

**Error Handling**:
- Hypothesis not found → NonRetriableError
- Invalid GPT-4 response → NonRetriableError
- Network errors → Retry with backoff

**Idempotency**: 
- Checks hypothesis status (skip if not PENDING)
- Debounce prevents concurrent validations

**Triangulation Criteria**:
- **VALIDATED**: ≥3 consistent claims, avg confidence ≥0.6
- **INVALIDATED**: Contradictory claims or low confidence
- **INCONCLUSIVE**: Mixed signals or insufficient clarity

**GPT-4 Analysis**:
- Evaluates consistency across independent sources
- Weights by confidence scores
- Provides consistency score (0-1)
- Generates detailed conclusion with reasoning

---

## Event Flow

### Complete Call Lifecycle

```
1. User triggers campaign
   ↓
2. System creates Call(QUEUED) in database
   ↓
3. Emit: call/orchestrate
   ↓
4. orchestrate-call function:
   - Updates Call(RINGING)
   - Calls Twilio API
   - Updates Call(IN_PROGRESS) with twilioSid
   ↓
5. Twilio webhooks track status changes
   ↓
6. Call completes → Twilio recording webhook
   ↓
7. Webhook emits: call/transcribe
   ↓
8. transcribe-recording function:
   - Downloads dual-channel audio
   - Transcribes with Whisper
   - Creates Utterance rows
   - Emits: claim/extract
   ↓
9. extract-claims function:
   - Builds RAG context
   - Extracts claims with GPT-4
   - Saves Claim rows
   - If threshold met, emits: claim/validate
   ↓
10. validate-claim function:
    - Analyzes ≥3 claims from ≥3 calls
    - Triangulation with GPT-4
    - Updates Hypothesis status
    - Marks claims as validated
```

## Durability Features

### Retries & Backoff

All functions use exponential backoff:
- **Base delay**: 1-2 seconds
- **Max delay**: 5-15 seconds
- **Attempts**: 2-3 retries per step

### Idempotency

Each function implements idempotency guards:
- **orchestrate-call**: Checks for existing `twilioSid`
- **transcribe-recording**: Checks for transcript + utterances
- **extract-claims**: Checks for existing claims by `callId`
- **validate-claim**: Checks hypothesis status + debounce

### Atomic Transactions

Database operations use Prisma transactions:
- Transcript + utterances saved atomically
- Claims saved in single transaction
- Hypothesis + claim updates are atomic

### Error Classification

**NonRetriableError** (permanent failures):
- Invalid phone numbers
- Missing resources (campaign, call, hypothesis)
- Invalid data (file too large, wrong format)
- Campaign not active

**Retriable Errors** (transient failures):
- Network timeouts
- API rate limits
- Temporary service unavailability

## Rate Limiting & Concurrency

| Function | Limit | Scope |
|----------|-------|-------|
| orchestrate-call | 10/min | Per campaign |
| transcribe-recording | 5 concurrent | Global |
| extract-claims | 3 concurrent | Global |
| validate-claim | 2 concurrent | Global |

## Monitoring & Observability

### Step Tracking

Each function uses named steps for observability:
- `idempotency-check`
- `fetch-campaign`
- `initiate-twilio-call`
- `download-recording`
- `transcribe-with-whisper`
- `extract-claims-with-gpt4`
- `analyze-consistency`

### Return Values

Functions return structured results:
```typescript
{
  success: boolean;
  callId?: string;
  hypothesisId?: string;
  skipped?: boolean;
  reason?: string;
  claimsExtracted?: number;
  status?: HypothesisStatus;
  consistencyScore?: number;
}
```

## Configuration

### Environment Variables

```bash
# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# OpenAI
OPENAI_API_KEY=

# Database
DATABASE_URL=
DIRECT_URL=

# App
NEXT_PUBLIC_APP_URL=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

### Inngest Client

```typescript
// src/lib/inngest/client.ts
export const inngest = new Inngest({
  id: "diligence-dialer",
  name: "Rondo",
});
```

### API Route

```typescript
// src/app/api/inngest/route.ts
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    orchestrateCall,
    transcribeRecording,
    extractClaims,
    validateClaim,
  ],
});
```

## Testing

### Manual Testing

```typescript
// Trigger orchestration
await inngest.send({
  name: "call/orchestrate",
  data: {
    callId: "call_123",
    campaignId: "campaign_456",
    phoneNumber: "+15551234567",
  },
});

// Trigger transcription
await inngest.send({
  name: "call/transcribe",
  data: {
    callId: "call_123",
    recordingUrl: "https://...",
    recordingDualUrl: "https://...",
  },
});

// Trigger claim extraction
await inngest.send({
  name: "claim/extract",
  data: {
    callId: "call_123",
    campaignId: "campaign_456",
    transcript: "...",
  },
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

### Idempotency Testing

Send the same event multiple times - should skip on subsequent calls:
```typescript
// First call: processes
// Second call: skips (idempotency guard)
await inngest.send({ name: "call/orchestrate", data: { ... } });
await inngest.send({ name: "call/orchestrate", data: { ... } });
```

## Production Considerations

### Scaling

- **Concurrency limits**: Adjust based on API quotas (OpenAI, Twilio)
- **Rate limits**: Tune per-campaign limits based on load
- **Database connections**: Monitor connection pool usage

### Monitoring

- **Inngest Dashboard**: View function runs, retries, failures
- **Database metrics**: Track claim/hypothesis counts
- **API usage**: Monitor OpenAI token usage, Twilio call volumes

### Optimization

1. **Batch operations**: Use `createMany` for utterances/claims
2. **Parallel processing**: Independent steps run concurrently
3. **Caching**: Consider caching RAG context for repeated categories
4. **Compression**: Compress large transcripts before storage

### Future Enhancements

1. **Better diarization**: Integrate Deepgram or AssemblyAI
2. **Real-time transcription**: Stream transcription during call
3. **Adaptive thresholds**: ML-based validation thresholds
4. **Export automation**: Auto-trigger exports when campaign complete
5. **Notifications**: Send alerts on validation completion
6. **A/B testing**: Compare different prompt templates

## Troubleshooting

### Common Issues

**Issue**: Transcription fails with "File too large"
- **Solution**: Compress audio before upload or split into chunks

**Issue**: Claims not triggering validation
- **Solution**: Check threshold (need ≥3 claims from ≥3 calls)

**Issue**: Hypothesis stuck in PENDING
- **Solution**: Manually trigger validation or check claim quality

**Issue**: Duplicate validations
- **Solution**: Debounce is set to 5s - increase if needed

### Debugging

1. Check Inngest dashboard for function runs
2. Review step-by-step execution logs
3. Verify database state (Call, Utterance, Claim, Hypothesis)
4. Test individual functions with manual events

## Summary

The Inngest orchestration system provides:

✅ **Durability**: Functions survive crashes and restarts
✅ **Reliability**: Automatic retries with exponential backoff
✅ **Idempotency**: Safe to replay events without side effects
✅ **Observability**: Named steps and structured return values
✅ **Scalability**: Concurrency and rate limiting controls
✅ **Error handling**: Distinguishes retriable vs. permanent failures
✅ **Atomicity**: Database transactions ensure consistency

This architecture ensures robust, production-ready orchestration for the Rondo platform.

