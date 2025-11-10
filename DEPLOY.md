# 🚀 Quick Deploy Guide

## Fastest Way to Deploy (5 minutes)

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy!
```bash
./deploy-vercel.sh
```
Or manually:
```bash
vercel --prod
```

---

## 🌐 Deploy via Vercel Dashboard (No CLI)

**Easiest method - just click:**

1. Go to https://vercel.com/new
2. Import from GitHub: `yameens/i-agent`
3. Add environment variables (see below)
4. Click "Deploy"

---

## 🔑 Required Environment Variables

Add these in Vercel dashboard under **Settings → Environment Variables**:

### Database (Supabase)
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

### Supabase Auth
```
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Twilio (Voice Calls)
```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

### OpenAI (AI Features)
```
OPENAI_API_KEY=sk-...
```

### Inngest (Background Jobs)
```
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=signkey-prod-...
```

### App URL (Add after first deploy)
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## ✅ Post-Deployment Steps

### 1. Run Database Migrations
```bash
# Connect to your Supabase database
export DATABASE_URL="your-supabase-url"

# Run migrations
npx prisma migrate deploy

# Apply RLS policies
psql $DATABASE_URL < prisma/rls-policies.sql

# Apply pgvector functions
psql $DATABASE_URL < prisma/pgvector-functions.sql
```

### 2. Update Twilio Webhooks

In Twilio Console, set these webhook URLs:

**Voice URL:**
```
https://your-app.vercel.app/api/webhooks/twilio/voice
```

**Status Callback:**
```
https://your-app.vercel.app/api/webhooks/twilio/status
```

**Recording Callback:**
```
https://your-app.vercel.app/api/webhooks/twilio/recording
```

### 3. Update App URL

In Vercel dashboard, add/update:
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Then redeploy:
```bash
vercel --prod
```

---

## 🧪 Test Your Deployment

1. Visit your app URL
2. Sign up / log in
3. Create a campaign
4. Navigate to `/dashboard/insights`
5. Test:
   - ✅ KPI tiles display
   - ✅ Signals table loads
   - ✅ Filters work
   - ✅ Evidence drawer opens (click a signal)
   - ✅ Audio player works
   - ✅ Keyboard shortcut `E` toggles drawer

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Test build locally
npm run build

# Check for TypeScript errors
npm run lint
```

### Can't Connect to Database
- Check `DATABASE_URL` is correct
- Verify Supabase project is active
- Test connection: `psql $DATABASE_URL -c "SELECT 1"`

### Environment Variables Not Working
- Make sure variables are added for "Production" environment
- Redeploy after adding variables
- Check no typos in variable names

### Webhooks Not Receiving Calls
- Verify webhook URLs in Twilio dashboard
- Check function logs in Vercel: `vercel logs --follow`
- Ensure webhooks are using `POST` method

---

## 📊 Monitoring

### View Logs
```bash
vercel logs your-app.vercel.app --follow
```

### Check Build Status
https://vercel.com/[your-account]/i-agent/deployments

### Analytics
Enable in Vercel dashboard:
- Analytics
- Speed Insights
- Web Vitals

---

## 🔄 Continuous Deployment

Once set up, Vercel automatically deploys:
- **Every push to `main`** → Production
- **Every pull request** → Preview deployment

No manual deployment needed! 🎉

---

## 💰 Costs

### Free Tier (Development)
- Vercel: Free
- Supabase: Free (up to 500MB)
- Inngest: Free (5K events/month)
- Twilio: Pay-per-use (~$0.01/min)
- OpenAI: Pay-per-use

### Production Estimate
~$345-895/month depending on usage

---

## 🆘 Need Help?

- **Deployment Issues**: Check `DEPLOYMENT_GUIDE.md`
- **Feature Documentation**: Check `DASHBOARD_FEATURES.md`
- **Code Examples**: Check `QUICK_REFERENCE.md`
- **GitHub Issues**: https://github.com/yameens/i-agent/issues

---

## 🎯 Quick Commands

```bash
# Deploy preview
vercel

# Deploy production
vercel --prod

# Watch logs
vercel logs --follow

# List deployments
vercel ls

# Rollback
vercel rollback

# Add environment variable
vercel env add VARIABLE_NAME production
```

---

**Ready to deploy? Just run: `./deploy-vercel.sh`** 🚀

