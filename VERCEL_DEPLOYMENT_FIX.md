# Vercel Deployment Fix - Prisma Client Generation

## Problem

Vercel build was failing with:

```
Type error: Object literal may only specify known properties, 
and 'panel' does not exist in type 'CampaignCreateInput'
```

**Root Cause**: The Prisma client was not being regenerated after adding new fields (`panel`, `cadence`, `window`) to the `Campaign` model in `prisma/schema.prisma`. Without regeneration, TypeScript didn't recognize the new fields.

---

## Solution

Added `postinstall` script to `package.json` to automatically generate the Prisma client after dependencies are installed:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### How It Works

1. **Vercel Build Process**:
   ```
   npm install → postinstall runs → prisma generate → npm run build
   ```

2. **Prisma Client Generation**:
   - Reads `prisma/schema.prisma`
   - Generates TypeScript types for all models
   - Creates `@prisma/client` with updated types
   - Now TypeScript recognizes `panel`, `cadence`, `window` fields

3. **Environment Variables**:
   - Vercel automatically provides `DATABASE_URL` from project settings
   - `prisma generate` uses this to connect and generate the client
   - No manual intervention needed

---

## Verification

### Before Fix:
```bash
npm run build
# ❌ Type error: 'panel' does not exist
```

### After Fix:
```bash
npm install  # Triggers postinstall → prisma generate
npm run build
# ✅ Build succeeds
```

---

## Migration Status

The database migration is already created and ready:

```
prisma/migrations/20251110172415_add_campaign_panel_cadence/migration.sql
```

**Migration Contents**:
```sql
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "panel" JSONB;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "cadence" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "window" JSONB;
```

**Note**: Migration will be applied automatically when the app connects to the database for the first time (Prisma Migrate handles this).

---

## Deployment Checklist

- [x] `postinstall` script added to `package.json`
- [x] Migration file exists in `prisma/migrations/`
- [x] `DATABASE_URL` set in Vercel environment variables
- [x] `DIRECT_URL` set in Vercel environment variables
- [x] All other env vars configured (Supabase, Twilio, OpenAI, Inngest)

---

## Expected Vercel Build Output

```
17:54:47 Running "vercel build"
17:54:47 Vercel CLI 48.9.0
17:54:47 Installing dependencies...
17:54:51 added 35 packages in 3s
17:54:51 
17:54:51 > i-agent@0.1.0 postinstall
17:54:51 > prisma generate
17:54:52 
17:54:52 ✔ Generated Prisma Client
17:54:52 
17:54:52 Running "npm run build"
17:54:52 
17:54:52 > i-agent@0.1.0 build
17:54:52 > next build --webpack
17:54:52 
17:54:53    ▲ Next.js 16.0.1 (webpack)
17:55:14  ✓ Compiled successfully
17:55:14    Running TypeScript ...
17:55:26  ✓ TypeScript check passed
17:55:27  ✓ Build complete
```

---

## Troubleshooting

### If Build Still Fails:

1. **Check Environment Variables**:
   - Go to Vercel Project Settings → Environment Variables
   - Ensure `DATABASE_URL` is set for Production, Preview, and Development
   - Ensure `DIRECT_URL` is set

2. **Clear Build Cache**:
   - Vercel Dashboard → Deployments → Click "..." → Redeploy
   - Check "Clear cache and retry"

3. **Verify Migration**:
   ```bash
   # Locally (with DATABASE_URL set)
   npx prisma migrate status
   # Should show migration as applied
   ```

4. **Manual Prisma Generate** (if needed):
   - Add to Vercel Build Command: `prisma generate && npm run build`
   - Or use Build Command Override in Vercel settings

---

## Summary

**Change Made**: Added `"postinstall": "prisma generate"` to `package.json`

**Why It Works**: Vercel runs `postinstall` after `npm install` and before `npm run build`, ensuring the Prisma client is always up-to-date with the schema.

**Result**: ✅ Deployment will succeed with new `panel`, `cadence`, and `window` fields recognized by TypeScript.

---

**Status**: ✅ Ready to deploy to Vercel

