-- AlterTable
ALTER TABLE "service_requests"
ADD COLUMN "confirmed_at" TIMESTAMPTZ(6),
ADD COLUMN "fulfilled_at" TIMESTAMPTZ(6),
ADD COLUMN "cancelled_at" TIMESTAMPTZ(6);

-- Backfill confirmed_at from created_at for existing rows that are already past intake review
UPDATE "service_requests"
SET "confirmed_at" = "created_at"
WHERE "lifecycle_state" IN (
  'intake_in_review',
  'dispatch_in_progress',
  'dispatch_delayed',
  'clarification_needed',
  'completed',
  'unfulfilled'
);

-- Backfill fulfilled_at from the earliest status_history entry that transitioned to 'completed'
UPDATE "service_requests" AS r
SET "fulfilled_at" = h."first_occurred_at"
FROM (
  SELECT "request_id", MIN("occurred_at") AS "first_occurred_at"
  FROM "request_status_history"
  WHERE "next_lifecycle_state" = 'completed'
  GROUP BY "request_id"
) AS h
WHERE r."id" = h."request_id"
  AND r."lifecycle_state" = 'completed'
  AND r."fulfilled_at" IS NULL;

-- Backfill cancelled_at from the earliest status_history entry that transitioned to 'unfulfilled'
UPDATE "service_requests" AS r
SET "cancelled_at" = h."first_occurred_at"
FROM (
  SELECT "request_id", MIN("occurred_at") AS "first_occurred_at"
  FROM "request_status_history"
  WHERE "next_lifecycle_state" = 'unfulfilled'
  GROUP BY "request_id"
) AS h
WHERE r."id" = h."request_id"
  AND r."lifecycle_state" = 'unfulfilled'
  AND r."cancelled_at" IS NULL;

-- CreateIndex
CREATE INDEX "service_requests_confirmed_at_idx" ON "service_requests"("confirmed_at");

-- CreateIndex
CREATE INDEX "service_requests_fulfilled_at_idx" ON "service_requests"("fulfilled_at");
