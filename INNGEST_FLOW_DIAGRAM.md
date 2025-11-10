# Inngest Orchestration Flow Diagram

## Complete Call Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INITIATES CAMPAIGN                            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CREATE CALL RECORD (QUEUED)                             │
│  db.call.create({ status: "QUEUED", campaignId, phoneNumber })             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    │ emit: call/orchestrate
                                    ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║                        FUNCTION 1: orchestrate-call                          ║
╠═════════════════════════════════════════════════════════════════════════════╣
║  1. Idempotency Check: Skip if twilioSid exists                             ║
║  2. Fetch Campaign: Validate ACTIVE status                                  ║
║  3. Update Call: QUEUED → RINGING                                           ║
║  4. Twilio API: Create call with dual-channel recording                     ║
║  5. Update Call: RINGING → IN_PROGRESS (store twilioSid)                   ║
║                                                                              ║
║  Durability:                                                                 ║
║  • Retries: 3 attempts (2s-10s backoff)                                    ║
║  • Rate Limit: 10/min per campaign                                          ║
║  • Timeout: 30s                                                              ║
║  • Idempotent: Checks twilioSid                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
                                    │
                                    │ Twilio webhooks track status
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CALL IN PROGRESS (TWILIO)                            │
│  • Status updates via webhook: /api/webhooks/twilio/status                  │
│  • Voice interaction via webhook: /api/webhooks/twilio/voice                │
│  • Consent tracking via webhook: /api/webhooks/twilio/consent               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    │ Call completes
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RECORDING READY (TWILIO WEBHOOK)                        │
│  POST /api/webhooks/twilio/recording?callId={id}                            │
│  • Receives recordingUrl and recordingDualUrl                               │
│  • Updates Call record with URLs                                             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    │ emit: call/transcribe
                                    ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║                     FUNCTION 2: transcribe-recording                         ║
╠═════════════════════════════════════════════════════════════════════════════╣
║  1. Idempotency Check: Skip if transcript + utterances exist                ║
║  2. Download Recording: Fetch dual-channel audio from Twilio                ║
║  3. Validate File: Check size (<25MB) and format                            ║
║  4. Whisper API: Transcribe with word-level timestamps                      ║
║  5. Parse Utterances: Group by pauses (>1.5s), alternate speakers          ║
║  6. Save to DB: Atomic transaction (transcript + utterances)                ║
║                                                                              ║
║  Durability:                                                                 ║
║  • Retries: Download 3x (1s-5s), Transcribe 3x (2s-15s)                   ║
║  • Concurrency: Max 5 concurrent                                            ║
║  • Timeouts: 2m download, 5m transcribe, 30s DB                            ║
║  • Idempotent: Checks transcript + utterances                               ║
║  • Atomic: Transaction for consistency                                       ║
╚═════════════════════════════════════════════════════════════════════════════╝
                                    │
                                    │ emit: claim/extract
                                    ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║                       FUNCTION 3: extract-claims                             ║
╠═════════════════════════════════════════════════════════════════════════════╣
║  1. Idempotency Check: Skip if claims exist for callId                      ║
║  2. Validate Transcript: Must be >50 chars                                  ║
║  3. Fetch Campaign: Load hypotheses                                         ║
║  4. Build RAG Context: Retrieve relevant checklist items                    ║
║  5. GPT-4 Extraction: Structured claims with confidence scores              ║
║  6. Validate Claims: Filter invalid (short, bad confidence)                 ║
║  7. Match Hypotheses: Fuzzy matching to link claims                         ║
║  8. Save Claims: Atomic transaction                                         ║
║  9. Check Threshold: ≥3 claims from ≥3 different calls?                    ║
║                                                                              ║
║  Durability:                                                                 ║
║  • Retries: RAG 2x (1s-5s), GPT-4 3x (2s-10s)                             ║
║  • Concurrency: Max 3 concurrent                                            ║
║  • Timeouts: 30s RAG, 2m GPT-4, 30s DB                                     ║
║  • Idempotent: Checks existing claims                                       ║
║  • Atomic: Transaction for consistency                                       ║
╚═════════════════════════════════════════════════════════════════════════════╝
                                    │
                                    │ if threshold met (≥3 claims from ≥3 calls)
                                    │ emit: claim/validate
                                    ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║                       FUNCTION 4: validate-claim                             ║
╠═════════════════════════════════════════════════════════════════════════════╣
║  1. Idempotency Check: Skip if status != PENDING                            ║
║  2. Fetch Hypothesis: Load all claims with call metadata                    ║
║  3. Validate Threshold: ≥3 claims from ≥3 different calls                  ║
║  4. GPT-4 Analysis: Triangulation consistency check                         ║
║  5. Determine Status:                                                        ║
║     • VALIDATED: Consistent, avg confidence ≥0.6                           ║
║     • INVALIDATED: Contradictory or low confidence                          ║
║     • INCONCLUSIVE: Mixed signals                                           ║
║  6. Update Hypothesis: Set status + conclusion                              ║
║  7. Mark Claims: Set validated=true if VALIDATED                            ║
║  8. Check Campaign: All hypotheses resolved?                                ║
║                                                                              ║
║  Durability:                                                                 ║
║  • Retries: 3 attempts (2s-15s backoff)                                    ║
║  • Concurrency: Max 2 concurrent                                            ║
║  • Debounce: 5s per hypothesis                                              ║
║  • Timeouts: 2m GPT-4, 30s DB                                              ║
║  • Idempotent: Checks status + debounce                                     ║
║  • Atomic: Transaction for consistency                                       ║
╚═════════════════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HYPOTHESIS VALIDATED/RESOLVED                         │
│  • Status: VALIDATED | INVALIDATED | INCONCLUSIVE                           │
│  • Claims marked as validated                                                │
│  • Conclusion stored with reasoning                                          │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CHECK CAMPAIGN COMPLETION                               │
│  Are all hypotheses resolved (not PENDING)?                                  │
│  • If YES: Campaign ready for export/completion                             │
│  • If NO: Continue with more calls                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Parallel Processing

Multiple calls can be processed concurrently:

```
Call 1:  [orchestrate] → [transcribe] → [extract] ──┐
                                                      │
Call 2:  [orchestrate] → [transcribe] → [extract] ──┼→ [validate]
                                                      │
Call 3:  [orchestrate] → [transcribe] → [extract] ──┘
```

**Concurrency Limits**:
- orchestrate-call: 10/min per campaign
- transcribe-recording: 5 concurrent
- extract-claims: 3 concurrent
- validate-claim: 2 concurrent (debounced)

---

## Error Handling Flow

```
┌─────────────┐
│   Function  │
│   Executes  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Error Occurs?  │
└──────┬──────────┘
       │
       ├─── NO ──────────────────────────────────────┐
       │                                              │
       └─── YES ──────┐                              │
                       ▼                              │
              ┌──────────────────┐                   │
              │ NonRetriableError?│                  │
              └────────┬──────────┘                  │
                       │                              │
                ┌──────┴──────┐                      │
                │             │                      │
               YES           NO                      │
                │             │                      │
                ▼             ▼                      │
         ┌──────────┐  ┌──────────────┐            │
         │   FAIL   │  │ Retry with   │            │
         │  (stop)  │  │  Backoff     │            │
         └──────────┘  └──────┬───────┘            │
                               │                     │
                               ▼                     │
                        ┌──────────────┐            │
                        │ Max Retries? │            │
                        └──────┬───────┘            │
                               │                     │
                        ┌──────┴──────┐             │
                        │             │             │
                       YES           NO             │
                        │             │             │
                        ▼             │             │
                 ┌──────────┐        │             │
                 │   FAIL   │        │             │
                 │  (stop)  │        │             │
                 └──────────┘        │             │
                                     │             │
                                     └─────────────┤
                                                   │
                                                   ▼
                                            ┌──────────┐
                                            │ SUCCESS  │
                                            └──────────┘
```

---

## Idempotency Flow

```
┌─────────────────┐
│  Event Received │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ Idempotency Check    │
│ (Query DB for state) │
└────────┬─────────────┘
         │
         ├─── Already Done ────────┐
         │                          │
         └─── Not Done ───┐         │
                          │         │
                          ▼         │
                   ┌──────────┐    │
                   │ Process  │    │
                   │  Event   │    │
                   └────┬─────┘    │
                        │          │
                        ▼          │
                   ┌──────────┐   │
                   │  Update  │   │
                   │   State  │   │
                   └────┬─────┘   │
                        │          │
                        └──────────┤
                                   │
                                   ▼
                            ┌────────────┐
                            │   Return   │
                            │  {success, │
                            │   skipped} │
                            └────────────┘
```

---

## Database State Transitions

### Call Status
```
QUEUED → RINGING → IN_PROGRESS → COMPLETED
                                ↓
                              FAILED
                                ↓
                            NO_ANSWER
```

### Hypothesis Status
```
PENDING → VALIDATED
        ↓
        INVALIDATED
        ↓
        INCONCLUSIVE
```

---

## Data Flow

```
┌──────────────┐
│     Call     │
│   (QUEUED)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     Call     │
│(IN_PROGRESS) │
│ + twilioSid  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     Call     │
│ (COMPLETED)  │
│ + recording  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     Call     │
│ + transcript │
└──────┬───────┘
       │
       ├────────────────┐
       │                │
       ▼                ▼
┌──────────┐    ┌──────────────┐
│Utterance │    │     Call     │
│ (AI)     │    │   + claims   │
└──────────┘    └──────┬───────┘
┌──────────┐           │
│Utterance │           │
│ (HUMAN)  │           │
└──────────┘           │
┌──────────┐           │
│Utterance │           │
│ (AI)     │           │
└──────────┘           │
      ...              │
                       ▼
                ┌──────────────┐
                │    Claim     │
                │ + hypothesis │
                │ + confidence │
                └──────┬───────┘
                       │
                       │ (when ≥3 from ≥3 calls)
                       │
                       ▼
                ┌──────────────┐
                │  Hypothesis  │
                │  (VALIDATED) │
                │ + conclusion │
                └──────────────┘
```

---

## Monitoring Points

```
┌─────────────────────────────────────────────────────────┐
│                    MONITORING POINTS                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. orchestrate-call                                    │
│     • Call initiation rate                              │
│     • Twilio API success rate                           │
│     • Invalid phone number rate                         │
│                                                          │
│  2. transcribe-recording                                │
│     • Download success rate                             │
│     • Transcription latency                             │
│     • Utterance count per call                          │
│                                                          │
│  3. extract-claims                                      │
│     • Claims per call                                   │
│     • Average confidence score                          │
│     • Hypothesis match rate                             │
│                                                          │
│  4. validate-claim                                      │
│     • Validation rate (VALIDATED/INVALIDATED/INCONCLUSIVE)│
│     • Consistency score distribution                    │
│     • Time to validation                                │
│                                                          │
│  Cross-Function Metrics                                 │
│     • End-to-end latency (call → validation)           │
│     • Retry rate per function                           │
│     • Error rate per function                           │
│     • Cost per call                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Cost Breakdown

```
┌────────────────────────────────────────────────────┐
│              COST PER CALL (ESTIMATED)             │
├────────────────────────────────────────────────────┤
│                                                     │
│  Twilio Call (5 min avg)                          │
│    $0.0085/min × 5 min = $0.04                    │
│                                                     │
│  Twilio Recording Storage                          │
│    $0.0005/min × 5 min = $0.003                   │
│                                                     │
│  OpenAI Whisper (5 min audio)                     │
│    $0.006/min × 5 min = $0.03                     │
│                                                     │
│  OpenAI GPT-4 (Claim Extraction)                  │
│    ~500 tokens × $0.03/1K = $0.015                │
│                                                     │
│  OpenAI GPT-4 (Validation)                        │
│    ~300 tokens × $0.03/1K = $0.009                │
│                                                     │
│  ─────────────────────────────────────────────    │
│  TOTAL PER CALL: ~$0.10 - $0.15                   │
│                                                     │
│  (Varies by call length and token usage)           │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## Scalability Considerations

```
┌─────────────────────────────────────────────────────────┐
│                   SCALING FACTORS                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Bottlenecks:                                           │
│    • Twilio: Account limits (concurrent calls)          │
│    • OpenAI: Rate limits (RPM/TPM)                      │
│    • Database: Connection pool size                     │
│    • Inngest: Function concurrency limits               │
│                                                          │
│  Optimization Strategies:                               │
│    • Batch operations (utterances, claims)              │
│    • Cache RAG context per category                     │
│    • Use GPT-4o-mini for less critical tasks           │
│    • Compress audio before transcription                │
│    • Parallel processing where possible                 │
│                                                          │
│  Scaling Limits (Current Config):                       │
│    • Calls: 10/min per campaign = 600/hour             │
│    • Transcriptions: 5 concurrent = ~60/hour           │
│    • Extractions: 3 concurrent = ~180/hour             │
│    • Validations: 2 concurrent = ~120/hour             │
│                                                          │
│  To Scale Up:                                           │
│    • Increase concurrency limits                        │
│    • Add more Inngest workers                           │
│    • Upgrade OpenAI tier                                │
│    • Scale database (read replicas)                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

This visual diagram provides a comprehensive overview of the entire orchestration flow, error handling, data transitions, and monitoring points.

