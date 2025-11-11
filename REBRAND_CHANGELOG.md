# Rebrand Changelog: Diligence Dialer → Rondo

**Date**: November 11, 2025  
**Positioning**: Continuous Consumer Intelligence  
**Tagline**: Weekly automated retail interviews with evidence-linked insights

---

## Summary

Transformed the platform from "Diligence Dialer" (channel-check calls) to "Rondo" (Continuous Consumer Intelligence). This rebrand positions the product as a retail-first, SaaS platform for recurring, evidence-linked insights from a persistent panel of retail contacts.

---

## Brand Identity Updates

### Design Tokens
Updated brand colors in `src/app/globals.css`:
- `--brand-950: #0F1C3F` (deep navy - primary brand)
- `--brand-600: #1E2E6E` (medium blue - interactive states)
- `--brand: #0F1C3F` (alias for primary brand)
- `--ink: #0A0A0A` (near-black text)
- `--bg: #FFFFFF` (white background)
- `--muted: #F5F7FB` (light gray surfaces)

### Typography
- Maintained Inter font family for clean, professional look
- Consistent 12/16/24 spacing scale
- Minimal borders, ample whitespace

---

## Files Modified

### Core Documentation
1. **README.md** - Complete rewrite
   - New positioning: "Continuous Consumer Intelligence"
   - Added "Weekly Interview Pipeline" section
   - Added "SaaS Model & Tenancy" section
   - Updated all descriptions to use retail/panel terminology
   - Added cron schedule documentation

### Frontend (UI/UX)
2. **src/app/layout.tsx**
   - Title: "Rondo | Continuous Consumer Intelligence"
   - Description: "Weekly automated retail interviews with evidence-linked insights..."

3. **src/app/globals.css**
   - Updated design tokens with Rondo brand colors
   - Added `--brand-950` and `--brand-600` tokens

4. **src/components/layout/nav.tsx**
   - Changed brand name from "Diligence Dialer" to "Rondo"

5. **src/app/(auth)/login/page.tsx**
   - Title: "Rondo"
   - Description: "Continuous Consumer Intelligence"

6. **src/app/(auth)/signup/page.tsx**
   - Description: "Start gathering continuous consumer intelligence"

7. **src/app/(dashboard)/dashboard/page.tsx**
   - Updated subtitle: "Manage your automated interview campaigns"
   - Updated empty state: "Create your first campaign to start automated retail interviews"
   - Updated description: "Configure your panel, set up interview scripts, and start gathering continuous intelligence"

8. **src/app/(dashboard)/dashboard/insights/page.tsx**
   - Updated subtitle: "View validated signals and hypothesis analysis"
   - Updated KPI subtitle: "extracted from interviews" (was "claims extracted")
   - Updated KPI subtitle: "triangulated signals" (was "triangulated claims")

### Backend & Infrastructure
9. **src/lib/inngest/client.ts**
   - Inngest ID: "rondo"
   - Inngest name: "Rondo"

10. **src/app/api/webhooks/twilio/voice/route.ts**
    - Greeting: "Hello, this is an automated retail interview from Rondo."

11. **prisma/schema.prisma**
    - Header comment: "Rondo - Multi-tenant Schema / Continuous Consumer Intelligence Platform"

12. **prisma/rls-policies.sql**
    - Header comment: "Rondo - Continuous Consumer Intelligence Platform"

13. **worker/package.json**
    - Package name: "rondo-worker"
    - Description: "Worker service for Rondo..."

### Deployment Files
14. **Dockerfile**
    - Header comment: "Rondo - Main Application Dockerfile / Continuous Consumer Intelligence Platform"

15. **deploy-vercel.sh**
    - Header comment: "Rondo - Vercel Deployment Script"

16. **DEPLOYMENT_GUIDE.md**
    - Title: "Deployment Guide - Rondo"
    - Added subtitle: "Continuous Consumer Intelligence Platform"

17. **IMPLEMENTATION_SUMMARY.md**
    - Title: "Rondo - Implementation Summary"
    - Updated description: "automated retail interviews with evidence-linked signal extraction"
    - Updated conclusion: "The Rondo platform is production-ready..."

18. **INNGEST_ORCHESTRATION.md**
    - Updated description: "for the Rondo platform (Continuous Consumer Intelligence)"
    - Updated Inngest name in examples
    - Updated conclusion reference

---

## Terminology Changes

### User-Facing Copy
- "Diligence Dialer" → "Rondo"
- "channel-check calls" → "automated retail interviews"
- "expert network" → "panel"
- "claims" → "signals" (in UI labels, kept "Claim" in code/schema)

### Code/Schema (Preserved)
- Kept table names: `claims`, `hypotheses`, `campaigns`, etc.
- Kept tRPC router names: `insight.listValidatedClaims`, etc.
- Kept internal variable names to avoid breaking changes
- Kept test references unchanged

---

## Search & Replace Report

### "Diligence Dialer" → "Rondo" (18 instances replaced)

| File | Line(s) | Context |
|------|---------|---------|
| README.md | 1 | Title |
| src/app/layout.tsx | 12 | Metadata title |
| src/components/layout/nav.tsx | 46 | Brand name in nav |
| src/app/(auth)/login/page.tsx | 54 | Page title |
| src/app/(auth)/signup/page.tsx | 67 | Page description |
| src/lib/inngest/client.ts | 5 | Inngest name |
| src/app/api/webhooks/twilio/voice/route.ts | 51 | Voice greeting |
| prisma/schema.prisma | 1 | Header comment |
| prisma/rls-policies.sql | 2 | Header comment |
| worker/package.json | 2, 4 | Package name & description |
| Dockerfile | 1 | Header comment |
| deploy-vercel.sh | 3 | Script header |
| DEPLOYMENT_GUIDE.md | 1 | Title |
| IMPLEMENTATION_SUMMARY.md | 1, 375 | Title & conclusion |
| INNGEST_ORCHESTRATION.md | 3, 337, 476 | Multiple references |

---

## Guardrails Maintained

✅ **No schema changes**: All table and field names preserved  
✅ **No test breakage**: Test references unchanged  
✅ **No route changes**: API routes and webhooks unchanged  
✅ **No env var changes**: All environment variable names preserved  
✅ **Integration compatibility**: Twilio, Supabase, Inngest, OpenAI integrations unchanged  
✅ **Git history preserved**: "Diligence Dialer" remains in commit history and migration names  

---

## Weekly Cadence Narrative

Added documentation throughout to emphasize **weekly interview cycles** as a first-class concept:

- Campaigns run on a **weekly schedule** (e.g., Monday 9am org-local)
- Inngest cron triggers orchestrate batch call initiation
- Panel contacts are rotated to prevent fatigue
- Dashboard shows "Last refresh: <timestamp>" and week-over-week trends

---

## Next Steps (Optional)

1. **Favicon Update**: Replace `/public/favicon.ico` with Rondo branding
2. **Social Meta Tags**: Add Open Graph and Twitter Card images
3. **Email Templates**: Update Supabase Auth email templates with Rondo branding
4. **Landing Page**: Create a marketing landing page at `/` (currently redirects to `/login`)
5. **Billing Integration**: Add Stripe for seat-based pricing
6. **Org Switcher**: Multi-org support for users with multiple memberships

---

## Tone & Voice

**Before (Diligence Dialer)**: Technical, finance-focused ("channel-check", "expert network", "claims")  
**After (Rondo)**: Venture-grade SaaS, retail-focused ("panel", "signals", "continuous intelligence")

Maintained crisp, professional tone similar to Linear/Hex/Retool.

---

**Rebrand Complete** ✅

