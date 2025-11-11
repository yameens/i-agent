# Rondo

**Continuous Consumer Intelligence**

Rondo is a SaaS platform that schedules and runs weekly automated interviews with a consistent panel of retail contacts—store managers, DTC operations teams, service centers, and suppliers—converts qualitative responses into structured signals, and delivers evidence-linked insights through a clean, intuitive dashboard.

---

## Why Rondo?

Traditional market research is slow, expensive, and episodic. Rondo transforms consumer intelligence into a continuous, automated process:

- **Weekly Interview Cycles**: Automated PSTN calls run on a consistent schedule, keeping your finger on the pulse of retail trends
- **Persistent Panel Management**: Build and maintain relationships with a curated network of retail contacts
- **Evidence-Linked Signals**: Every insight is backed by timestamped audio evidence and validated transcripts
- **Trend Detection**: Spot emerging patterns across SKUs, geographies, and product categories
- **Multi-Tenant SaaS**: Secure organization-based isolation with role-based access control

---

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

---

## Weekly Interview Pipeline

Rondo operates on a **weekly cadence** to provide continuous, actionable intelligence:

### 1. Panel Selection
- Org-specific contact lists with metadata (role, location, SKU focus)
- Smart rotation to prevent panel fatigue
- Consent management and opt-out handling

### 2. Scheduling & Execution
- **Cron Trigger**: Weekly schedule (e.g., Monday 9am org-local time)
- Inngest orchestrates batch call initiation via Twilio
- Real-time status tracking and retry logic for failed connections

### 3. Recording & Transcription
- Dual-channel audio capture (AI + Human)
- Automatic download and storage in Supabase
- Whisper-powered transcription with speaker diarization

### 4. Signal Extraction
- RAG-based question generation using pgvector embeddings
- GPT-4 extracts structured signals from conversational responses
- Confidence scoring and timestamped evidence links

### 5. QA & Triangulation
- Automatic validation when ≥3 sources report similar signals
- Cross-source consistency analysis
- Hypothesis status updates (VALIDATED, INVALIDATED, INCONCLUSIVE, PENDING)

### 6. Dashboard Refresh
- Real-time KPI updates (total signals, validation rate, avg confidence)
- Filterable signals table (by SKU, geography, field)
- Evidence drawer with audio playback and highlighted transcripts

---

## SaaS Model & Tenancy

Rondo is designed as a **multi-tenant SaaS platform**:

### Organizations
- Each customer gets a dedicated organization with isolated data
- Row-level security (RLS) policies enforce strict data boundaries
- Organization-level settings: panel lists, interview scripts, billing

### Roles & Permissions
- **OWNER**: Full admin access, billing management
- **ADMIN**: Manage campaigns, view all insights, configure integrations
- **MEMBER**: View insights, export data (read-only)

### Weekly Cadence as a First-Class Concept
- Campaigns are configured with a **weekly schedule** (day + time)
- Panel contacts are rotated automatically to maintain freshness
- Historical trend views show week-over-week changes

### Billing (Planned)
- Seat-based pricing (per user)
- Usage-based add-ons (additional interview minutes, API calls)
- Self-serve upgrade/downgrade via Stripe integration

---

## Getting Started

### Prerequisites

- **Node.js 20+**
- **Supabase account** (Postgres database + Auth)
- **Twilio account** (Programmable Voice)
- **OpenAI API key** (GPT-4 + Whisper)
- **Inngest account** (optional for local development)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd i-agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your credentials (see [Environment Variables](#environment-variables) below).

4. **Set up the database**:
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Push schema to Supabase (creates tables)
   npx prisma db push

   # Apply RLS policies (run in Supabase SQL Editor)
   # Copy contents of prisma/rls-policies.sql

   # Apply pgvector functions (run in Supabase SQL Editor)
   # Copy contents of prisma/pgvector-functions.sql

   # Seed default interview templates (optional)
   npx prisma db seed
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running the Worker Service

The worker service handles long-running tasks and Twilio webhooks:

```bash
cd worker
npm install
npm run dev
```

The worker runs on port 3001 by default.

### Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up --build
```

---

## Project Structure

```
i-agent/
├── prisma/                 # Database schema, migrations, seed data
│   ├── schema.prisma       # Prisma schema (User, Organization, Campaign, Call, Claim, etc.)
│   ├── rls-policies.sql    # Supabase RLS policies for multi-tenant isolation
│   └── pgvector-functions.sql  # Vector search functions for RAG
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (auth)/        # Auth routes (login, signup, org setup)
│   │   ├── (dashboard)/   # Protected dashboard (campaigns, calls, insights)
│   │   └── api/           # API routes (tRPC, webhooks, export)
│   ├── server/            # Server-side code
│   │   ├── db.ts          # Prisma client singleton
│   │   └── trpc/          # tRPC routers (campaign, calls, insight)
│   ├── lib/               # Shared utilities
│   │   ├── inngest/       # Inngest functions (orchestrate, transcribe, extract, validate)
│   │   ├── integrations/  # External API clients (Salesforce, Google Sheets, Snowflake)
│   │   ├── supabase/      # Supabase client helpers
│   │   └── trpc/          # tRPC client setup
│   └── components/        # React components (UI primitives, dashboard widgets)
├── worker/                # Separate worker service (Twilio webhooks, background jobs)
└── public/                # Static assets (favicons, images)
```

---

## Key Features

### Multi-Tenant Architecture
- **Organization-based isolation**: Every query is scoped to the user's organization via RLS policies
- **Role-based access control**: OWNER, ADMIN, MEMBER roles with granular permissions
- **Secure authentication**: Supabase Auth with email/password and social providers

### Automated Interview Orchestration
- **Weekly cron scheduling**: Inngest triggers campaigns on a configurable schedule
- **Twilio PSTN calls**: Outbound calls to panel contacts with retry logic
- **Dual-channel recording**: Separate tracks for AI and human audio
- **Real-time status updates**: Webhooks track call progress (initiated, ringing, in-progress, completed, failed)
- **Consent capture**: Automated consent recording and redaction for compliance

### AI-Powered Signal Extraction
- **RAG-based question generation**: pgvector embeddings match interview questions to campaign hypotheses
- **GPT-4 signal extraction**: Structured output with confidence scoring, SKU/geo tagging, and evidence timestamps
- **Speaker diarization**: Whisper identifies AI vs. human speakers for accurate attribution
- **Timestamped evidence links**: Every signal includes a direct link to the audio segment

### Triangulation & Validation
- **Automatic validation**: After ≥3 calls, Rondo cross-references signals for consistency
- **Hypothesis tracking**: PENDING → VALIDATED | INVALIDATED | INCONCLUSIVE
- **Detailed conclusions**: GPT-4 generates human-readable summaries of validation results

### Export & Integrations
- **CSV/JSON export**: Download signals with full metadata
- **Salesforce**: Automatically create leads from validated signals
- **Google Sheets**: Real-time sync of insights to shared spreadsheets
- **Snowflake Snowpipe**: Stream data to your data warehouse (planned)

---

## Environment Variables

Create a `.env.local` file with the following variables:

### Database
```bash
# Supabase Postgres (pooled connection for serverless)
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Direct connection for migrations
DIRECT_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

### Supabase Auth
```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
```

### Twilio Voice
```bash
TWILIO_ACCOUNT_SID="ACxxx"
TWILIO_AUTH_TOKEN="xxx"
TWILIO_PHONE_NUMBER="+15551234567"
```

### OpenAI
```bash
OPENAI_API_KEY="sk-proj-xxx"
```

### Inngest
```bash
INNGEST_EVENT_KEY="xxx"
INNGEST_SIGNING_KEY="signkey-prod-xxx"
```

### App URL
```bash
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

---

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Migrations
```bash
# Create a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations to production
npx prisma migrate deploy
```

### Seeding Data
```bash
npx prisma db seed
```

---

## Deployment

### Vercel (Recommended for Web App)

1. **Connect your repository** to Vercel
2. **Set environment variables** in the Vercel dashboard (see [Environment Variables](#environment-variables))
3. **Deploy** (automatic on push to `main`)

### Worker Service

Deploy the worker service separately to handle long-running tasks and webhooks:

- **Railway**: One-click deploy with Dockerfile
- **Render**: Web service with persistent storage
- **AWS ECS**: Fargate or EC2-backed containers
- **Google Cloud Run**: Serverless container hosting

### Database Setup (Production)

1. **Create a Supabase project** (or use your own Postgres instance)
2. **Run migrations**: `npx prisma migrate deploy`
3. **Apply RLS policies**: Copy `prisma/rls-policies.sql` to Supabase SQL Editor
4. **Apply pgvector functions**: Copy `prisma/pgvector-functions.sql` to Supabase SQL Editor

---

## Cron Schedule (Weekly Runs)

Rondo uses **Inngest cron triggers** to run weekly interview cycles:

```typescript
// Example: Every Monday at 9am (org-local time)
inngest.createScheduledFunction({
  id: "weekly-interview-cycle",
  cron: "0 9 * * 1", // Cron syntax: minute hour day month weekday
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

For multi-timezone support, campaigns can specify their own schedule in org-local time.

---

## License

MIT

---

## Support

For questions, issues, or feature requests, please open a GitHub issue or contact support@rondo.ai.

---

**Built with ❤️ for retail intelligence teams who need continuous, evidence-backed insights.**
