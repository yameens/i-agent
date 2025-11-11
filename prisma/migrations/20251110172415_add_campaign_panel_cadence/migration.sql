-- AlterTable: Add optional panel, cadence, and window fields to Campaign
-- These are additive and backward-compatible (all nullable)

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "panel" JSONB;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "cadence" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "window" JSONB;

-- Add comments for documentation
COMMENT ON COLUMN "campaigns"."panel" IS 'Panel configuration: { companies: string[], regions: string[], contacts: ContactLite[], size: number }';
COMMENT ON COLUMN "campaigns"."cadence" IS 'Interview cadence: WEEKLY, BIWEEKLY, MONTHLY';
COMMENT ON COLUMN "campaigns"."window" IS 'Interview window: { days: string[], start: string, end: string, tz: string }';

