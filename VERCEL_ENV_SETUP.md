# Vercel Environment Variables Setup

## 🚨 CRITICAL: Your app is crashing because environment variables are missing!

The error "Application error: a server-side exception has occurred" means the server can't connect to the database or other services.

---

## ✅ IMMEDIATE FIX: Add Environment Variables to Vercel

### Step 1: Go to Vercel Project Settings

1. Visit: https://vercel.com/yameens-projects-842a9125/i-agent/settings/environment-variables
2. Or navigate: Your Project → Settings → Environment Variables

### Step 2: Add ALL These Variables

**Copy and paste each variable below:**

#### Database (Supabase) - REQUIRED
```
DATABASE_URL
Value: postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT].supabase.co:5432/postgres?pgbouncer=true

DIRECT_URL
Value: postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT].supabase.co:5432/postgres
```

**How to get these:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Copy "Connection string" for both values
5. For DATABASE_URL add `?pgbouncer=true` at the end
6. For DIRECT_URL use it as-is

#### Supabase Auth - REQUIRED
```
NEXT_PUBLIC_SUPABASE_URL
Value: https://[YOUR_PROJECT].supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGc... (long token)

SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGc... (long token)
```

**How to get these:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - Project URL → NEXT_PUBLIC_SUPABASE_URL
   - anon/public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - service_role key → SUPABASE_SERVICE_ROLE_KEY

#### Twilio - REQUIRED (for calls to work)
```
TWILIO_ACCOUNT_SID
Value: AC... (from Twilio Console)

TWILIO_AUTH_TOKEN
Value: ... (from Twilio Console)

TWILIO_PHONE_NUMBER
Value: +1... (your Twilio number)
```

**How to get these:**
1. Go to https://console.twilio.com
2. Account SID and Auth Token are on the dashboard
3. Phone number from Phone Numbers section

#### OpenAI - REQUIRED (for AI features)
```
OPENAI_API_KEY
Value: sk-... (from OpenAI)
```

**How to get this:**
1. Go to https://platform.openai.com/api-keys
2. Create a new key
3. Copy it

#### Inngest - OPTIONAL (can skip for now)
```
INNGEST_EVENT_KEY
Value: ... (from Inngest dashboard)

INNGEST_SIGNING_KEY
Value: signkey-prod-... (from Inngest dashboard)
```

#### App URL - ADD AFTER FIRST DEPLOY
```
NEXT_PUBLIC_APP_URL
Value: https://i-agent-git-main-yameens-projects-842a9125.vercel.app
```

### Step 3: Set Environment for Each Variable

**IMPORTANT:** For each variable, select:
- ✅ Production
- ✅ Preview  
- ✅ Development

### Step 4: Redeploy

After adding all variables:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click "..." menu → **Redeploy**
4. Check "Use existing Build Cache" ✅
5. Click **Redeploy**

---

## 🔧 Quick Checklist

Before the app will work, you MUST have:

- [ ] DATABASE_URL (Supabase)
- [ ] DIRECT_URL (Supabase)
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] NEXT_PUBLIC_APP_URL (your Vercel URL)

Optional but recommended:
- [ ] TWILIO_ACCOUNT_SID
- [ ] TWILIO_AUTH_TOKEN
- [ ] TWILIO_PHONE_NUMBER
- [ ] OPENAI_API_KEY
- [ ] INNGEST_EVENT_KEY
- [ ] INNGEST_SIGNING_KEY

---

## 🎯 Visual Guide

### Where to Add Variables in Vercel

```
1. Vercel Dashboard
   ↓
2. Your Project (i-agent)
   ↓
3. Settings Tab
   ↓
4. Environment Variables (left sidebar)
   ↓
5. Click "Add New"
   ↓
6. Enter: Key, Value, and select environments
   ↓
7. Click "Save"
   ↓
8. Repeat for all variables
   ↓
9. Go to Deployments → Redeploy latest
```

---

## 🚨 Common Mistakes

❌ **Forgetting to select all environments** (Production, Preview, Development)
❌ **Missing DATABASE_URL** (most common cause of crashes)
❌ **Wrong DATABASE_URL format** (missing ?pgbouncer=true)
❌ **Not redeploying after adding variables**
❌ **Copy-pasting with extra spaces**

---

## 🔍 How to Verify

After adding variables and redeploying:

1. Go to **Deployments**
2. Find the new deployment
3. Click on it
4. Check **Runtime Logs** for errors
5. If you see "Prisma Client" or "DATABASE_URL" errors, the variables aren't set correctly

---

## 🆘 Still Not Working?

### Check Runtime Logs

1. Go to your deployment in Vercel
2. Click **Runtime Logs** tab
3. Look for errors mentioning:
   - "DATABASE_URL"
   - "Prisma"
   - "Supabase"
   - "Environment variable"

### Test Database Connection

After setting variables, the dashboard layout will:
1. Connect to Supabase to check user auth
2. Connect to database to fetch memberships
3. If either fails, you'll see the error

---

## 💡 Pro Tip

You can check which variables are set:

1. Vercel Dashboard → Project → Settings → Environment Variables
2. You should see all variables listed
3. Click "eye" icon to verify values (check for typos!)

---

**Add the environment variables now, then redeploy!** 🚀

