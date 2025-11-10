# Webhook Security - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
```bash
# Required for webhook verification
export TWILIO_AUTH_TOKEN="your_twilio_auth_token"
export NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 3. Run Database Migration
```bash
npx prisma migrate dev --name add_webhook_dedup
```

### 4. Run Tests
```bash
npm test
```

## ✅ What's Protected

All Twilio webhook endpoints now have:
- ✅ Signature verification (rejects invalid requests with 403)
- ✅ Duplicate detection (prevents double-processing)
- ✅ Idempotent Inngest functions (safe retries)

### Protected Endpoints:
- `/api/webhooks/twilio/voice`
- `/api/webhooks/twilio/status`
- `/api/webhooks/twilio/recording`
- `/api/webhooks/twilio/consent`

## 🔍 How It Works

### Request Flow:
```
Twilio → Webhook → Verify Signature → Check Duplicate → Process
                        ↓                    ↓
                    403 Reject          200 Skip
```

### Event ID Format:
```
Voice:     CA123:voice
Status:    CA123:status
Recording: CA123:recording:RE456
Consent:   CA123:consent
```

## 📝 Usage Example

```typescript
import { verifyAndDeduplicateWebhook } from "@/lib/webhook-security";

export async function POST(request: NextRequest) {
  // Verify and check for duplicates
  const verification = await verifyAndDeduplicateWebhook(request, "voice");

  if (!verification.isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  if (verification.isDuplicate) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  // Process webhook...
  const formData = verification.formData!;
  const callSid = verification.callSid!;
}
```

## 🧪 Testing

### Run All Tests:
```bash
npm test
```

### Test Specific File:
```bash
npm test webhook-security.test.ts
```

### Watch Mode:
```bash
npm run test:watch
```

## 🐛 Troubleshooting

### Issue: All webhooks return 403
**Solution:** Check `TWILIO_AUTH_TOKEN` environment variable

### Issue: Duplicates not detected
**Solution:** Verify database migration was applied

### Issue: Tests failing
**Solution:** Run `npm install` to ensure test dependencies are installed

## 📚 Documentation

- **Full Documentation:** `WEBHOOK_SECURITY.md`
- **Implementation Details:** `WEBHOOK_IMPLEMENTATION_SUMMARY.md`
- **This Guide:** `WEBHOOK_QUICKSTART.md`

## 🔐 Security Checklist

Before deploying to production:

- [ ] `TWILIO_AUTH_TOKEN` is set correctly
- [ ] Webhooks configured over HTTPS only
- [ ] Database migration applied
- [ ] All tests passing
- [ ] Monitoring/logging configured

## 📊 Monitoring

Watch for these in logs:
- `Invalid Twilio signature` - Potential security issue
- `Duplicate webhook event` - Normal, but track frequency
- Webhook processing errors - Investigate and fix

## 🎯 Key Files

```
src/lib/webhook-security.ts              # Security utilities
src/app/api/webhooks/twilio/*/route.ts   # Protected endpoints
src/lib/inngest/functions/*.ts           # Idempotent functions
prisma/schema.prisma                     # WebhookDedup model
```

## 💡 Pro Tips

1. **Local Testing:** Use ngrok to test webhooks locally
   ```bash
   ngrok http 3000
   # Update NEXT_PUBLIC_APP_URL to ngrok URL
   ```

2. **Debug Signatures:** Check Twilio Console > Monitor > Logs

3. **Clean Old Records:** Consider adding a cron job to delete old webhook_dedup records

4. **Rate Limiting:** Add per-IP rate limiting for additional protection

## ✨ What's Next?

Optional enhancements:
- Add webhook payload storage for debugging
- Implement webhook replay functionality
- Add Datadog/New Relic metrics
- Schedule cleanup job for old dedup records

---

**Need help?** Check `WEBHOOK_SECURITY.md` for detailed documentation.

