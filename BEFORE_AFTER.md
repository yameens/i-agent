# Rondo Rebrand: Before & After

Visual comparison of key changes from Diligence Dialer to Rondo.

---

## 🏷️ Brand Identity

### Before: Diligence Dialer
- **Positioning**: Autonomous channel-check calls
- **Target**: Finance/research teams
- **Tone**: Technical, finance-focused
- **Key Terms**: "channel-check", "expert network", "claims"

### After: Rondo
- **Positioning**: Continuous Consumer Intelligence
- **Target**: Retail intelligence teams
- **Tone**: Venture-grade SaaS, professional
- **Key Terms**: "automated interviews", "panel", "signals"

---

## 🎨 Visual Design

### Color Palette

**Before**:
```css
--brand: #0F1C3F;    /* dark blue */
--ink: #0A0A0A;      /* near-black text */
--bg: #FFFFFF;       /* white background */
--muted: #F5F7FB;    /* light gray surfaces */
```

**After**:
```css
--brand-950: #0F1C3F;  /* deep navy - primary brand */
--brand-600: #1E2E6E;  /* medium blue - interactive states */
--brand: #0F1C3F;      /* alias for primary brand */
--ink: #0A0A0A;        /* near-black text */
--bg: #FFFFFF;         /* white background */
--muted: #F5F7FB;      /* light gray surfaces */
```

**Change**: Added `--brand-950` and `--brand-600` for richer brand palette.

---

## 📱 User Interface

### Navigation Bar

**Before**:
```tsx
<span className="text-xl font-bold text-brand">
  Diligence Dialer
</span>
```

**After**:
```tsx
<span className="text-xl font-bold text-brand">
  Rondo
</span>
```

---

### Login Page

**Before**:
```tsx
<CardTitle className="text-2xl font-bold text-brand">
  Diligence Dialer
</CardTitle>
<CardDescription>
  Sign in to your account to continue
</CardDescription>
```

**After**:
```tsx
<CardTitle className="text-2xl font-bold text-brand">
  Rondo
</CardTitle>
<CardDescription>
  Continuous Consumer Intelligence
</CardDescription>
```

---

### Signup Page

**Before**:
```tsx
<CardDescription>
  Get started with Diligence Dialer
</CardDescription>
```

**After**:
```tsx
<CardDescription>
  Start gathering continuous consumer intelligence
</CardDescription>
```

---

### Dashboard Header

**Before**:
```tsx
<h1 className="text-3xl font-bold text-ink">Campaigns</h1>
<p className="text-muted-foreground mt-1">
  Manage your channel-check campaigns
</p>
```

**After**:
```tsx
<h1 className="text-3xl font-bold text-ink">Campaigns</h1>
<p className="text-muted-foreground mt-1">
  Manage your automated interview campaigns
</p>
```

---

### Dashboard Empty State

**Before**:
```tsx
<CardDescription>
  Create your first campaign to start making channel-check calls
</CardDescription>
<p className="text-sm text-muted-foreground text-center max-w-md">
  Get started by creating a campaign. You'll be able to configure
  call scripts, set up hypotheses, and start gathering insights.
</p>
```

**After**:
```tsx
<CardDescription>
  Create your first campaign to start automated retail interviews
</CardDescription>
<p className="text-sm text-muted-foreground text-center max-w-md">
  Get started by creating a campaign. Configure your panel, set up 
  interview scripts, and start gathering continuous intelligence.
</p>
```

---

### Insights Page

**Before**:
```tsx
<h1 className="text-3xl font-bold text-ink">Insights</h1>
<p className="text-muted-foreground mt-1">
  View validated claims and hypothesis analysis
</p>

<KPITile
  title="Total Signals"
  value={kpis.totalSignals}
  subtitle="claims extracted"
  icon={Activity}
/>
<KPITile
  title="Validated"
  value={kpis.validatedSignals}
  subtitle="triangulated claims"
  icon={CheckCircle2}
/>
```

**After**:
```tsx
<h1 className="text-3xl font-bold text-ink">Insights</h1>
<p className="text-muted-foreground mt-1">
  View validated signals and hypothesis analysis
</p>

<KPITile
  title="Total Signals"
  value={kpis.totalSignals}
  subtitle="extracted from interviews"
  icon={Activity}
/>
<KPITile
  title="Validated"
  value={kpis.validatedSignals}
  subtitle="triangulated signals"
  icon={CheckCircle2}
/>
```

---

## 🔊 Voice Experience

### Twilio Call Greeting

**Before**:
```typescript
twiml.say(
  { voice: "Polly.Joanna" },
  "Hello, this is an automated channel check call from Diligence Dialer."
);
```

**After**:
```typescript
twiml.say(
  { voice: "Polly.Joanna" },
  "Hello, this is an automated retail interview from Rondo."
);
```

---

## 📄 Metadata

### HTML Head

**Before**:
```tsx
export const metadata: Metadata = {
  title: "Diligence Dialer",
  description: "Autonomous channel-check calls with evidence-based claim validation",
};
```

**After**:
```tsx
export const metadata: Metadata = {
  title: "Rondo | Continuous Consumer Intelligence",
  description: "Weekly automated retail interviews with evidence-linked insights. Build a persistent panel, extract structured signals, and spot trends across SKUs and geographies.",
};
```

---

## 🔧 Backend Services

### Inngest Client

**Before**:
```typescript
export const inngest = new Inngest({
  id: "diligence-dialer",
  name: "Diligence Dialer",
});
```

**After**:
```typescript
export const inngest = new Inngest({
  id: "rondo",
  name: "Rondo",
});
```

---

## 📦 Package Configuration

### Worker Package

**Before**:
```json
{
  "name": "diligence-dialer-worker",
  "description": "Worker service for Diligence Dialer - handles Twilio webhooks and Inngest functions"
}
```

**After**:
```json
{
  "name": "rondo-worker",
  "description": "Worker service for Rondo - handles Twilio webhooks and Inngest functions"
}
```

---

## 📚 Documentation

### README.md Title

**Before**:
```markdown
# Diligence Dialer

Autonomous channel-check calls with evidence-based claim validation.
```

**After**:
```markdown
# Rondo

**Continuous Consumer Intelligence**

Rondo is a SaaS platform that schedules and runs weekly automated interviews 
with a consistent panel of retail contacts—store managers, DTC operations teams, 
service centers, and suppliers—converts qualitative responses into structured 
signals, and delivers evidence-linked insights through a clean, intuitive dashboard.
```

---

### README.md Architecture

**Before**:
```markdown
## Architecture

- **Frontend:** Next.js 14 App Router, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes + tRPC, Zod validation
- **Database:** Supabase Postgres with RLS policies, pgvector for RAG
- **Auth:** Supabase Auth with multi-tenant org management
- **Voice:** Twilio Programmable Voice (PSTN), dual-channel recording
- **Orchestration:** Inngest for durable workflows
- **AI:** OpenAI GPT-4 for extraction, Whisper for transcription
- **Deployment:** Vercel (web) + separate worker service
```

**After**:
```markdown
## Architecture

Rondo is built on a modern, scalable stack designed for reliability and performance:

- **Frontend**: Next.js 16 App Router, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes + tRPC, Zod validation
- **Database**: Supabase Postgres with RLS policies, pgvector for semantic search
- **Auth**: Supabase Auth with multi-tenant organization management
- **Voice**: Twilio Programmable Voice (PSTN outbound), dual-channel recording
- **Orchestration**: Inngest for durable, fault-tolerant workflows
- **AI**: OpenAI GPT-4 for signal extraction, Whisper for transcription
- **Deployment**: Vercel (web app) + containerized worker service
```

---

### New Sections Added to README

**1. Weekly Interview Pipeline** (6 stages):
- Panel Selection
- Scheduling & Execution
- Recording & Transcription
- Signal Extraction
- QA & Triangulation
- Dashboard Refresh

**2. SaaS Model & Tenancy**:
- Organizations
- Roles & Permissions
- Weekly Cadence as First-Class Concept
- Billing (Planned)

**3. Cron Schedule (Weekly Runs)**:
```typescript
// Example: Every Monday at 9am (org-local time)
inngest.createScheduledFunction({
  id: "weekly-interview-cycle",
  cron: "0 9 * * 1",
  fn: async ({ event, step }) => {
    // 1. Fetch active campaigns
    // 2. Select panel contacts (with rotation)
    // 3. Initiate Twilio calls
    // 4. Wait for completions
    // 5. Trigger transcription + extraction
    // 6. Run validation after ≥3 calls
  },
});
```

---

## 📊 Terminology Mapping

| Before | After | Context |
|--------|-------|---------|
| Diligence Dialer | Rondo | Brand name |
| channel-check calls | automated retail interviews | Product description |
| expert network | panel | Contact list |
| claims | signals | UI labels (kept "Claim" in code) |
| claim extraction | signal extraction | Process description |
| validated claims | validated signals | Dashboard KPIs |
| triangulated claims | triangulated signals | KPI subtitles |

---

## 🎯 Positioning Shift

### Before: Diligence Dialer
- **Market**: Finance/research teams
- **Use Case**: Ad-hoc channel checks
- **Frequency**: On-demand
- **Focus**: Evidence-based claim validation
- **Tone**: Technical, research-oriented

### After: Rondo
- **Market**: Retail intelligence teams
- **Use Case**: Continuous consumer intelligence
- **Frequency**: Weekly automated cycles
- **Focus**: Trend detection across SKUs/geos
- **Tone**: Venture-grade SaaS, professional

---

## ✅ What Stayed the Same

- **Database schema**: No table/field name changes
- **API routes**: All endpoints unchanged
- **Environment variables**: All keys preserved
- **Integrations**: Twilio, Supabase, Inngest, OpenAI unchanged
- **Core functionality**: Call orchestration, transcription, extraction, validation
- **Code architecture**: tRPC routers, Inngest functions, Prisma models

---

## 🚀 Impact

### User-Facing Changes
✅ Clearer positioning for retail teams  
✅ More professional SaaS branding  
✅ Better terminology ("signals" vs "claims")  
✅ Emphasis on weekly cadence  

### Developer Experience
✅ No breaking changes  
✅ All tests pass  
✅ No migration required  
✅ Environment variables unchanged  

### Business Impact
✅ Retail-first positioning  
✅ SaaS model clearly defined  
✅ Weekly cadence as differentiator  
✅ Multi-tenant architecture highlighted  

---

**Rebrand Complete** ✅  
**Ready for Production** 🚀

