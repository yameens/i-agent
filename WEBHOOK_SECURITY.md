# Twilio Webhook Security & Idempotency Implementation

## Overview

This document describes the comprehensive security and idempotency implementation for all Twilio webhook endpoints in the i-agent application.

## Features Implemented

### 1. Twilio Signature Verification

All webhook endpoints now verify the `X-Twilio-Signature` header to ensure requests are genuinely from Twilio.

**Implementation:**
- Uses HMAC-SHA1 with `TWILIO_AUTH_TOKEN` to compute expected signature
- Compares signatures using constant-time comparison to prevent timing attacks
- Rejects requests with invalid or missing signatures with HTTP 403

**Location:** `src/lib/webhook-security.ts`

### 2. Webhook Deduplication

Prevents duplicate webhook processing using a database-backed idempotency system.

**Database Schema:**
```sql
CREATE TABLE "webhook_dedup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Event ID Format:**
- Voice: `{CallSid}:voice`
- Status: `{CallSid}:status`
- Recording: `{CallSid}:recording:{RecordingSid}`
- Consent: `{CallSid}:consent`

**Behavior:**
- First request: Inserts event ID and processes webhook
- Duplicate request: Returns HTTP 200 with `{"success": true, "duplicate": true}`
- Prevents race conditions using database unique constraint

### 3. Inngest Function Idempotency

All Inngest background functions include idempotency keys and guards:

**Functions Updated:**
- `transcribe-recording`: Uses `event.data.callId` as idempotency key
- `extract-claims`: Uses `event.data.callId` as idempotency key
- `orchestrate-call`: Uses `event.data.callId` as idempotency key
- `validate-claim`: Uses `event.data.hypothesisId` as idempotency key

**Implementation:**
- Function-level idempotency keys prevent duplicate execution
- Step-level guards check database state before processing
- Gracefully skips already-processed work

## Webhook Endpoints

### 1. Voice Webhook (`/api/webhooks/twilio/voice`)

**Purpose:** Handles incoming call and generates TwiML for greeting and consent

**Security:**
- ✅ Signature verification
- ✅ Deduplication
- ✅ CallId validation

**Response:**
- Valid: TwiML XML with greeting and consent prompt
- Invalid signature: HTTP 403
- Duplicate: HTTP 200 with `duplicate: true`
- Missing callId: HTTP 400

### 2. Status Webhook (`/api/webhooks/twilio/status`)

**Purpose:** Updates call status as it progresses

**Security:**
- ✅ Signature verification
- ✅ Deduplication
- ✅ CallId validation

**Updates:**
- Maps Twilio status to internal status enum
- Updates call duration when completed
- Sets `completedAt` timestamp

### 3. Recording Webhook (`/api/webhooks/twilio/recording`)

**Purpose:** Triggers transcription when recording is ready

**Security:**
- ✅ Signature verification
- ✅ Deduplication (includes RecordingSid)
- ✅ CallId validation

**Triggers:**
- Sends `call/transcribe` event to Inngest
- Includes recording URL with `.mp3` extension

### 4. Consent Webhook (`/api/webhooks/twilio/consent`)

**Purpose:** Processes consent response and continues or ends call

**Security:**
- ✅ Signature verification
- ✅ Deduplication
- ✅ CallId validation

**Behavior:**
- Updates `consentGiven` field in database
- Returns TwiML to continue or end call based on consent

## Testing

### Unit Tests

**Location:** `src/lib/__tests__/webhook-security.test.ts`

**Coverage:**
- ✅ Valid signature verification
- ✅ Invalid signature rejection
- ✅ Missing signature header handling
- ✅ Missing auth token handling
- ✅ String and FormData body support
- ✅ New event processing
- ✅ Duplicate event detection
- ✅ Event ID generation
- ✅ Full webhook verification flow

### Integration Tests

**Location:** `src/app/api/webhooks/twilio/__tests__/webhooks.test.ts`

**Coverage:**
- ✅ All webhook endpoints
- ✅ Signature validation
- ✅ Duplicate detection
- ✅ Happy path processing
- ✅ Error cases (missing params, invalid data)
- ✅ Database interactions
- ✅ Inngest event triggering

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test webhook-security.test.ts
```

## Database Migration

### Apply Migration

```bash
# Generate migration
npx prisma migrate dev --name add_webhook_dedup

# Or apply manually
psql $DATABASE_URL < prisma/migrations/add_webhook_dedup.sql
```

### Rollback (if needed)

```sql
DROP TABLE IF EXISTS "webhook_dedup";
```

## Environment Variables

Required environment variables:

```bash
# Twilio authentication token (required for signature verification)
TWILIO_AUTH_TOKEN="your_twilio_auth_token"

# Application URL (used in webhook URLs)
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## Security Considerations

### 1. Signature Verification

- **Timing Attack Protection:** Uses `crypto.timingSafeEqual()` for constant-time comparison
- **Token Security:** Auth token must be kept secret and never exposed to client
- **HTTPS Required:** Webhooks should only be configured over HTTPS in production

### 2. Idempotency

- **Race Condition Protection:** Database unique constraint prevents concurrent duplicate processing
- **Cleanup:** Consider adding a background job to clean old webhook_dedup records (e.g., older than 7 days)
- **Event ID Uniqueness:** Includes RecordingSid for recording webhooks to handle multiple recordings per call

### 3. Error Handling

- **Invalid Signatures:** Return 403 to indicate authentication failure
- **Duplicates:** Return 200 to acknowledge receipt (prevents Twilio retries)
- **Server Errors:** Return 500 (Twilio will retry with exponential backoff)

## Monitoring & Observability

### Recommended Logging

All webhook endpoints log:
- Invalid signature attempts (potential security issue)
- Duplicate events (normal, but useful for debugging)
- Processing errors (investigate and fix)

### Metrics to Track

- Webhook signature failure rate
- Duplicate webhook rate
- Webhook processing latency
- Inngest function retry rate

### Alerts

Consider alerting on:
- High signature failure rate (>1% of requests)
- Webhook processing errors (>5% of requests)
- Inngest function failures

## Best Practices

### 1. Webhook Configuration in Twilio

```javascript
// When creating calls, include all webhook URLs
const call = await twilioClient.calls.create({
  to: phoneNumber,
  from: twilioPhoneNumber,
  url: `${appUrl}/api/webhooks/twilio/voice?callId=${callId}`,
  statusCallback: `${appUrl}/api/webhooks/twilio/status?callId=${callId}`,
  statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
  recordingStatusCallback: `${appUrl}/api/webhooks/twilio/recording?callId=${callId}`,
});
```

### 2. Testing Webhooks Locally

Use ngrok or similar tool to expose local server:

```bash
# Start ngrok
ngrok http 3000

# Update NEXT_PUBLIC_APP_URL in .env
NEXT_PUBLIC_APP_URL="https://your-ngrok-url.ngrok.io"

# Twilio will now send webhooks to your local machine
```

### 3. Debugging Webhook Issues

1. Check Twilio Console > Monitor > Logs for webhook delivery status
2. Verify signature with Twilio's signature validation tool
3. Check application logs for detailed error messages
4. Use webhook_dedup table to verify deduplication is working

## Future Enhancements

### Potential Improvements

1. **Webhook Cleanup Job:**
   - Add scheduled job to delete old webhook_dedup records
   - Keep last 7 days for debugging, delete older records

2. **Webhook Replay:**
   - Store webhook payloads for debugging
   - Add admin endpoint to replay failed webhooks

3. **Rate Limiting:**
   - Add per-IP rate limiting to prevent abuse
   - Use Redis for distributed rate limiting

4. **Webhook Versioning:**
   - Support multiple webhook versions for gradual rollouts
   - Include version in webhook URL path

5. **Enhanced Monitoring:**
   - Add Datadog/New Relic integration
   - Track webhook processing metrics
   - Alert on anomalies

## Troubleshooting

### Issue: Signature Verification Failing

**Symptoms:** All webhooks return 403

**Causes:**
- Incorrect `TWILIO_AUTH_TOKEN` in environment
- URL mismatch (webhook URL in Twilio doesn't match actual URL)
- Proxy/load balancer modifying request

**Solution:**
1. Verify `TWILIO_AUTH_TOKEN` matches Twilio Console
2. Check webhook URL in Twilio matches exactly (including query params)
3. Ensure no middleware is modifying request body

### Issue: Duplicate Events Not Being Detected

**Symptoms:** Same webhook processed multiple times

**Causes:**
- Database constraint not applied
- Different event IDs for same event
- Race condition in high-concurrency scenario

**Solution:**
1. Verify webhook_dedup table has primary key on `id`
2. Check event ID generation logic
3. Review database transaction isolation level

### Issue: Inngest Functions Running Multiple Times

**Symptoms:** Transcription or claim extraction happening twice

**Causes:**
- Idempotency key not set correctly
- Step guards not checking database state
- Webhook deduplication not working

**Solution:**
1. Verify idempotency keys are set in function config
2. Check step guards are querying database before processing
3. Verify webhook deduplication is working

## References

- [Twilio Security Documentation](https://www.twilio.com/docs/usage/security)
- [Twilio Webhook Signature Validation](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Inngest Idempotency](https://www.inngest.com/docs/guides/idempotency)
- [OWASP Webhook Security](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html)

## Summary

This implementation provides defense-in-depth security for Twilio webhooks:

1. **Authentication:** Signature verification ensures requests are from Twilio
2. **Idempotency:** Database-backed deduplication prevents duplicate processing
3. **Resilience:** Inngest function guards prevent duplicate background work
4. **Testing:** Comprehensive unit and integration tests ensure reliability
5. **Monitoring:** Logging and error handling for production observability

All webhook endpoints are now production-ready with enterprise-grade security and reliability.

