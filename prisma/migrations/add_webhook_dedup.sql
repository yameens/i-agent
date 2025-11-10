-- CreateTable
CREATE TABLE "webhook_dedup" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_dedup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_dedup_receivedAt_idx" ON "webhook_dedup"("receivedAt");

-- Add comment
COMMENT ON TABLE "webhook_dedup" IS 'Stores webhook event IDs to prevent duplicate processing';
COMMENT ON COLUMN "webhook_dedup"."id" IS 'Composite key: CallSid + event type + optional RecordingSid';
COMMENT ON COLUMN "webhook_dedup"."receivedAt" IS 'Timestamp when webhook was first received';

