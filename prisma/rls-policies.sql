-- ============================================================================
-- Diligence Dialer - RLS Policies with Membership-based Access Control
-- ============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "utterances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hypotheses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get user's organization IDs (they can be members of multiple orgs)
CREATE OR REPLACE FUNCTION auth.user_org_ids()
RETURNS SETOF TEXT AS $$
  SELECT "organizationId" FROM memberships WHERE "userId" = auth.uid()::text;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user has a specific role in an org
CREATE OR REPLACE FUNCTION auth.user_has_role(org_id TEXT, required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE "userId" = auth.uid()::text
    AND "organizationId" = org_id
    AND (
      CASE required_role
        WHEN 'OWNER' THEN role = 'OWNER'
        WHEN 'ADMIN' THEN role IN ('OWNER', 'ADMIN')
        WHEN 'MEMBER' THEN role IN ('OWNER', 'ADMIN', 'MEMBER')
        ELSE FALSE
      END
    )
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- Organization Policies
-- ============================================================================

CREATE POLICY "Users can view orgs they are members of"
  ON "organizations" FOR SELECT
  USING (id IN (SELECT auth.user_org_ids()));

CREATE POLICY "Owners can update their organization"
  ON "organizations" FOR UPDATE
  USING (auth.user_has_role(id, 'OWNER'));

CREATE POLICY "Owners can delete their organization"
  ON "organizations" FOR DELETE
  USING (auth.user_has_role(id, 'OWNER'));

-- ============================================================================
-- User Policies
-- ============================================================================

CREATE POLICY "Users can view their own record"
  ON "users" FOR SELECT
  USING (id = auth.uid()::text);

CREATE POLICY "Users can update their own record"
  ON "users" FOR UPDATE
  USING (id = auth.uid()::text);

CREATE POLICY "Anyone can create a user (signup)"
  ON "users" FOR INSERT
  WITH CHECK (id = auth.uid()::text);

-- ============================================================================
-- Membership Policies
-- ============================================================================

CREATE POLICY "Users can view memberships in their orgs"
  ON "memberships" FOR SELECT
  USING ("organizationId" IN (SELECT auth.user_org_ids()));

CREATE POLICY "Admins can create memberships in their orgs"
  ON "memberships" FOR INSERT
  WITH CHECK (auth.user_has_role("organizationId", 'ADMIN'));

CREATE POLICY "Admins can update memberships in their orgs"
  ON "memberships" FOR UPDATE
  USING (auth.user_has_role("organizationId", 'ADMIN'))
  WITH CHECK (auth.user_has_role("organizationId", 'ADMIN'));

CREATE POLICY "Admins can delete memberships in their orgs"
  ON "memberships" FOR DELETE
  USING (auth.user_has_role("organizationId", 'ADMIN'));

-- Prevent users from removing themselves if they're the last owner
CREATE POLICY "Cannot remove last owner"
  ON "memberships" FOR DELETE
  USING (
    NOT (
      role = 'OWNER' AND
      "userId" = auth.uid()::text AND
      (SELECT COUNT(*) FROM memberships WHERE "organizationId" = memberships."organizationId" AND role = 'OWNER') = 1
    )
  );

-- ============================================================================
-- Campaign Policies
-- ============================================================================

CREATE POLICY "Members can view campaigns in their orgs"
  ON "campaigns" FOR SELECT
  USING ("organizationId" IN (SELECT auth.user_org_ids()));

CREATE POLICY "Admins can create campaigns in their orgs"
  ON "campaigns" FOR INSERT
  WITH CHECK (auth.user_has_role("organizationId", 'ADMIN'));

CREATE POLICY "Admins can update campaigns in their orgs"
  ON "campaigns" FOR UPDATE
  USING (auth.user_has_role("organizationId", 'ADMIN'))
  WITH CHECK (auth.user_has_role("organizationId", 'ADMIN'));

CREATE POLICY "Admins can delete campaigns in their orgs"
  ON "campaigns" FOR DELETE
  USING (auth.user_has_role("organizationId", 'ADMIN'));

-- ============================================================================
-- Call Policies
-- ============================================================================

CREATE POLICY "Members can view calls in their orgs"
  ON "calls" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = calls."campaignId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "System can create calls"
  ON "calls" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = calls."campaignId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "System can update calls"
  ON "calls" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = calls."campaignId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "Admins can delete calls in their orgs"
  ON "calls" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = calls."campaignId"
      AND auth.user_has_role(campaigns."organizationId", 'ADMIN')
    )
  );

-- ============================================================================
-- Utterance Policies
-- ============================================================================

CREATE POLICY "Members can view utterances in their orgs"
  ON "utterances" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls."campaignId"
      WHERE calls.id = utterances."callId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "System can create utterances"
  ON "utterances" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls."campaignId"
      WHERE calls.id = utterances."callId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "System can update utterances"
  ON "utterances" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls."campaignId"
      WHERE calls.id = utterances."callId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "System can delete utterances"
  ON "utterances" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls."campaignId"
      WHERE calls.id = utterances."callId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

-- ============================================================================
-- Claim Policies
-- ============================================================================

CREATE POLICY "Members can view claims in their orgs"
  ON "claims" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls."campaignId"
      WHERE calls.id = claims."callId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "System can create claims"
  ON "claims" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls."campaignId"
      WHERE calls.id = claims."callId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "System can update claims"
  ON "claims" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls."campaignId"
      WHERE calls.id = claims."callId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "Admins can delete claims in their orgs"
  ON "claims" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN campaigns ON campaigns.id = calls."campaignId"
      WHERE calls.id = claims."callId"
      AND auth.user_has_role(campaigns."organizationId", 'ADMIN')
    )
  );

-- ============================================================================
-- Hypothesis Policies
-- ============================================================================

CREATE POLICY "Members can view hypotheses in their orgs"
  ON "hypotheses" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = hypotheses."campaignId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "Admins can create hypotheses in their orgs"
  ON "hypotheses" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = hypotheses."campaignId"
      AND auth.user_has_role(campaigns."organizationId", 'ADMIN')
    )
  );

CREATE POLICY "System can update hypotheses"
  ON "hypotheses" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = hypotheses."campaignId"
      AND campaigns."organizationId" IN (SELECT auth.user_org_ids())
    )
  );

CREATE POLICY "Admins can delete hypotheses in their orgs"
  ON "hypotheses" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = hypotheses."campaignId"
      AND auth.user_has_role(campaigns."organizationId", 'ADMIN')
    )
  );

-- ============================================================================
-- Integration Policies
-- ============================================================================

CREATE POLICY "Members can view integrations in their orgs"
  ON "integrations" FOR SELECT
  USING ("organizationId" IN (SELECT auth.user_org_ids()));

CREATE POLICY "Admins can create integrations in their orgs"
  ON "integrations" FOR INSERT
  WITH CHECK (auth.user_has_role("organizationId", 'ADMIN'));

CREATE POLICY "Admins can update integrations in their orgs"
  ON "integrations" FOR UPDATE
  USING (auth.user_has_role("organizationId", 'ADMIN'))
  WITH CHECK (auth.user_has_role("organizationId", 'ADMIN'));

CREATE POLICY "Admins can delete integrations in their orgs"
  ON "integrations" FOR DELETE
  USING (auth.user_has_role("organizationId", 'ADMIN'));

-- ============================================================================
-- pgvector Extension & Checklist Embeddings
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS checklist_embeddings_embedding_idx 
  ON checklist_embeddings USING ivfflat (embedding vector_cosine_ops);

-- No RLS on checklist_embeddings as it's shared across all orgs
-- (checklists are not org-specific)
