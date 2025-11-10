-- Enable Row Level Security on all tables
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "utterances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hypotheses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization ID
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS TEXT AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()::text;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Organization policies
CREATE POLICY "Users can view their own organization"
  ON "organizations" FOR SELECT
  USING (id = auth.user_organization_id());

CREATE POLICY "Owners can update their organization"
  ON "organizations" FOR UPDATE
  USING (
    id = auth.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('OWNER', 'ADMIN')
    )
  );

-- User policies
CREATE POLICY "Users can view users in their organization"
  ON "users" FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can view their own record"
  ON "users" FOR SELECT
  USING (id = auth.uid()::text);

CREATE POLICY "Admins can manage users in their organization"
  ON "users" FOR ALL
  USING (
    organization_id = auth.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('OWNER', 'ADMIN')
    )
  );

-- Campaign policies
CREATE POLICY "Users can view campaigns in their organization"
  ON "campaigns" FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Admins can manage campaigns in their organization"
  ON "campaigns" FOR ALL
  USING (
    organization_id = auth.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('OWNER', 'ADMIN')
    )
  );

-- Call policies
CREATE POLICY "Users can view calls in their organization"
  ON "calls" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = calls.campaign_id
      AND campaigns.organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Admins can manage calls in their organization"
  ON "calls" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = calls.campaign_id
      AND campaigns.organization_id = auth.user_organization_id()
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()::text
        AND users.role IN ('OWNER', 'ADMIN')
      )
    )
  );

-- Utterance policies
CREATE POLICY "Users can view utterances in their organization"
  ON "utterances" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls.campaign_id
      WHERE calls.id = utterances.call_id
      AND campaigns.organization_id = auth.user_organization_id()
    )
  );

-- Claim policies
CREATE POLICY "Users can view claims in their organization"
  ON "claims" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls.campaign_id
      WHERE calls.id = claims.call_id
      AND campaigns.organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Admins can manage claims in their organization"
  ON "claims" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls.campaign_id
      WHERE calls.id = claims.call_id
      AND campaigns.organization_id = auth.user_organization_id()
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()::text
        AND users.role IN ('OWNER', 'ADMIN')
      )
    )
  );

-- Hypothesis policies
CREATE POLICY "Users can view hypotheses in their organization"
  ON "hypotheses" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = hypotheses.campaign_id
      AND campaigns.organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Admins can manage hypotheses in their organization"
  ON "hypotheses" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = hypotheses.campaign_id
      AND campaigns.organization_id = auth.user_organization_id()
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()::text
        AND users.role IN ('OWNER', 'ADMIN')
      )
    )
  );

-- Integration policies
CREATE POLICY "Users can view integrations in their organization"
  ON "integrations" FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Admins can manage integrations in their organization"
  ON "integrations" FOR ALL
  USING (
    organization_id = auth.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('OWNER', 'ADMIN')
    )
  );

-- Enable pgvector extension for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Create checklist embeddings table (for RAG)
CREATE TABLE IF NOT EXISTS checklist_embeddings (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON checklist_embeddings USING ivfflat (embedding vector_cosine_ops);

