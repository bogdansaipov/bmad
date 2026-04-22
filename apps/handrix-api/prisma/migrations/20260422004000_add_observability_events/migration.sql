-- CreateTable
CREATE TABLE "observability_events" (
    "id" UUID NOT NULL,
    "event_name" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "route_scope" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "public_id" TEXT,
    "request_lifecycle_state" "RequestLifecycleState",
    "public_status" "PublicRequestStatus",
    "outcome" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "observability_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "observability_events_event_name_occurred_at_idx" ON "observability_events"("event_name", "occurred_at");

-- CreateIndex
CREATE INDEX "observability_events_public_id_occurred_at_idx" ON "observability_events"("public_id", "occurred_at");

-- CreateIndex
CREATE INDEX "observability_events_correlation_id_idx" ON "observability_events"("correlation_id");
