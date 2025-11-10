# Deployment Guide - Diligence Dialer

## 🚀 Quick Deploy Options

This application has two components:
1. **Web App** (Next.js) → Deploy to Vercel
2. **Worker Service** (Inngest handlers) → Deploy to Vercel or Railway

---

## ✅ Option 1: Deploy to Vercel (Recommended)

### Prerequisites
- [ ] GitHub repository pushed
- [ ] Supabase project created
- [ ] Twilio account set up
- [ ] OpenAI API key
- [ ] Inngest account (optional for dev)

### Step 1: Prepare Environment Variables

Create a `.env.production` file or prepare these values:

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# OpenAI
OPENAI_API_KEY=sk-...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=signkey-prod-...

# App URL (set after first deployment)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Step 2: Deploy to Vercel

#### Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Click "Import Project"
3. Import from GitHub: `yameens/i-agent`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

5. Add Environment Variables:
   - Click "Environment Variables"
   - Paste all variables from above
   - Make sure to select "Production", "Preview", and "Development"

6. Click "Deploy"

#### Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd /Users/yameensekandari/Desktop/VENTURES/i-agent
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? i-agent
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
# ... (add all variables)

# Deploy to production
vercel --prod
```

### Step 3: Run Database Migrations

After first deployment, connect to your Supabase database:

```bash
# Set DATABASE_URL
export DATABASE_URL="your-supabase-url"

# Run migrations
npx prisma migrate deploy

# Apply RLS policies
psql $DATABASE_URL < prisma/rls-policies.sql

# Apply pgvector functions
psql $DATABASE_URL < prisma/pgvector-functions.sql

# Optional: Seed data
npx prisma db seed
```

### Step 4: Update Twilio Webhooks

Update Twilio webhook URLs to point to your Vercel deployment:

```
Voice URL: https://your-app.vercel.app/api/webhooks/twilio/voice
Status Callback: https://your-app.vercel.app/api/webhooks/twilio/status
Recording Callback: https://your-app.vercel.app/api/webhooks/twilio/recording
```

### Step 5: Update NEXT_PUBLIC_APP_URL

Add the final environment variable in Vercel:

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Then redeploy:
```bash
vercel --prod
```

---

## 🐳 Option 2: Deploy with Docker

### Build and Run Locally

```bash
# Build images
docker-compose build

# Run services
docker-compose up

# Or run in background
docker-compose up -d
```

### Deploy to Cloud Providers

#### Railway

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

3. Add environment variables in Railway dashboard

#### Render

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: i-agent
    env: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      # ... add all env vars
```

2. Connect GitHub repo in Render dashboard

#### AWS ECS / Google Cloud Run

See Docker documentation for cloud-specific deployment guides.

---

## 🔧 Post-Deployment Checklist

### 1. Verify Deployment
- [ ] Visit your app URL
- [ ] Test login/signup
- [ ] Check dashboard loads
- [ ] Test insights page

### 2. Test Webhooks
- [ ] Make a test call
- [ ] Verify webhooks hit your endpoints
- [ ] Check logs in Vercel dashboard

### 3. Test Dashboard Features
- [ ] KPI tiles display correctly
- [ ] Signals table loads
- [ ] Filters work
- [ ] Evidence drawer opens
- [ ] Audio player works
- [ ] Keyboard shortcut (E) works

### 4. Set Up Monitoring
- [ ] Enable Vercel Analytics
- [ ] Set up Sentry (optional)
- [ ] Configure log drains
- [ ] Set up uptime monitoring

### 5. Performance Optimization
- [ ] Enable Edge Functions (if needed)
- [ ] Configure CDN caching
- [ ] Optimize images
- [ ] Enable Vercel Speed Insights

---

## 🔐 Security Checklist

- [ ] All environment variables are secrets (not exposed)
- [ ] Supabase RLS policies are active
- [ ] CORS is properly configured
- [ ] Webhook signatures are verified
- [ ] Rate limiting is in place
- [ ] HTTPS is enforced

---

## 📊 Monitoring & Debugging

### Vercel Logs

```bash
# View logs
vercel logs your-app.vercel.app

# Follow logs in real-time
vercel logs your-app.vercel.app --follow
```

### Database Monitoring

Check Supabase dashboard for:
- Query performance
- Connection pooling
- Active queries
- Error logs

### Error Tracking

Add Sentry (optional):

```bash
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard@latest -i nextjs
```

---

## 🔄 Continuous Deployment

### Automatic Deploys

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

### Manual Deploys

```bash
# Deploy specific branch
vercel --prod

# Deploy from local
vercel
```

### Rollback

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

---

## 🌍 Custom Domain (Optional)

### Add Domain in Vercel

1. Go to Project Settings → Domains
2. Add your domain: `yourdomain.com`
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Update Twilio webhooks with new domain

---

## 🚨 Troubleshooting

### Build Fails

```bash
# Check build logs
vercel logs your-app.vercel.app

# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Missing dependencies
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Prisma client
npx prisma db pull
```

### Webhook Issues

- Verify webhook URLs in Twilio dashboard
- Check webhook signature validation
- Review error logs in Vercel

### Audio Player Not Working

- Check `evidenceUrl` is accessible
- Verify CORS headers
- Test audio format compatibility

---

## 📈 Scaling

### Vercel Pro Features

- Higher limits (functions, bandwidth)
- Analytics and Speed Insights
- Advanced deployment controls
- Team collaboration

### Database Scaling

- Upgrade Supabase plan for more connections
- Enable connection pooling (PgBouncer)
- Optimize queries with indexes

### Worker Scaling

- Deploy multiple worker instances
- Use Inngest for automatic scaling
- Consider queue-based architecture

---

## 💰 Cost Estimation

### Free Tier (Development)

- **Vercel**: Free (Hobby plan)
- **Supabase**: Free (up to 500MB database)
- **Inngest**: Free (up to 5K events/month)
- **Twilio**: Pay-as-you-go (~$0.01/min)
- **OpenAI**: Pay-as-you-go

### Production (Estimated Monthly)

- **Vercel Pro**: $20/month
- **Supabase Pro**: $25/month
- **Inngest Pro**: $150/month
- **Twilio**: $100-500/month (based on usage)
- **OpenAI**: $50-200/month (based on usage)

**Total**: ~$345-895/month

---

## 🎯 Deployment Commands Quick Reference

```bash
# Vercel deployment
vercel                    # Deploy preview
vercel --prod            # Deploy production

# Environment variables
vercel env add KEY prod  # Add production variable
vercel env ls            # List variables
vercel env rm KEY prod   # Remove variable

# Logs and debugging
vercel logs --follow     # Watch logs
vercel inspect [url]     # Inspect deployment

# Database
npx prisma migrate deploy    # Run migrations
npx prisma db seed           # Seed data
npx prisma studio            # Open Prisma Studio

# Docker
docker-compose up --build    # Build and run
docker-compose logs -f       # Watch logs
docker-compose down          # Stop services
```

---

## ✅ Final Checklist

Before going live:

- [ ] All environment variables set
- [ ] Database migrated and seeded
- [ ] RLS policies applied
- [ ] Twilio webhooks configured
- [ ] Domain configured (if using custom domain)
- [ ] NEXT_PUBLIC_APP_URL updated
- [ ] Test call completed successfully
- [ ] Dashboard tested thoroughly
- [ ] Evidence drawer works with audio
- [ ] Export functionality tested
- [ ] Monitoring set up
- [ ] Backups configured (Supabase)
- [ ] SSL/HTTPS working
- [ ] Performance optimized

---

## 🆘 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Review Supabase logs
3. Check browser console for errors
4. Review this guide's troubleshooting section
5. Open a GitHub issue with logs

---

**Your app is now ready to deploy!** 🚀

Start with Vercel for the easiest deployment experience.

