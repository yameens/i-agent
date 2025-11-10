# Diligence Dialer

Autonomous channel-check calls with evidence-based claim validation.

## Architecture

- **Frontend:** Next.js 14 App Router, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes + tRPC, Zod validation
- **Database:** Supabase Postgres with RLS policies, pgvector for RAG
- **Auth:** Supabase Auth with multi-tenant org management
- **Voice:** Twilio Programmable Voice (PSTN), dual-channel recording
- **Orchestration:** Inngest for durable workflows
- **AI:** OpenAI GPT-4 for extraction, Whisper for transcription
- **Deployment:** Vercel (web) + separate worker service

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase account
- Twilio account
- OpenAI API key
- Inngest account (optional for development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd i-agent
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials.

4. Set up the database:
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Apply RLS policies
psql $DATABASE_URL < prisma/rls-policies.sql

# Apply pgvector functions
psql $DATABASE_URL < prisma/pgvector-functions.sql

# Seed default checklists (optional)
npx prisma db seed
```

5. Run the development server:
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

## Project Structure

```
i-agent/
├── prisma/                 # Database schema and migrations
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (auth)/        # Auth routes
│   │   ├── (dashboard)/   # Protected dashboard
│   │   └── api/           # API routes (tRPC, webhooks)
│   ├── server/            # Server-side code
│   │   └── trpc/          # tRPC routers
│   ├── lib/               # Shared utilities
│   │   ├── inngest/       # Inngest functions
│   │   └── integrations/  # External API clients
│   └── components/        # React components
├── worker/                # Separate worker service
└── public/                # Static assets
```

## Key Features

### Multi-Tenant Architecture
- Organization-based isolation with RLS policies
- Role-based access control (OWNER, ADMIN, MEMBER)
- Secure auth via Supabase

### Call Orchestration
- Automated PSTN calls via Twilio
- Dual-channel recording for evidence
- Real-time status updates via webhooks
- Consent capture and redaction

### AI-Powered Extraction
- RAG-based question generation (pgvector)
- GPT-4 claim extraction with confidence scoring
- Timestamped evidence links
- Speaker diarization

### Triangulation & Validation
- Automatic validation after ≥3 calls
- Consistency analysis across sources
- Hypothesis status tracking
- Detailed conclusions

### Export & Integrations
- CSV/JSON export
- Salesforce lead creation
- Google Sheets sync
- Snowflake Snowpipe (planned)

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
npx prisma migrate dev --name <migration-name>
```

### Seeding Data
```bash
npx prisma db seed
```

## Deployment

### Vercel (Recommended for Web App)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Worker Service
Deploy the worker service separately to handle long-running tasks:
- Railway
- Render
- AWS ECS
- Google Cloud Run

## Environment Variables

See `.env.example` for required variables:
- Database: `DATABASE_URL`, `DIRECT_URL`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- OpenAI: `OPENAI_API_KEY`
- Inngest: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
