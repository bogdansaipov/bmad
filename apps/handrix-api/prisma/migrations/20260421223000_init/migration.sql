-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RequestLifecycleState" AS ENUM ('awaiting_confirmation', 'intake_in_review', 'dispatch_in_progress', 'dispatch_delayed', 'clarification_needed', 'completed', 'unfulfilled');

-- CreateEnum
CREATE TYPE "PublicRequestStatus" AS ENUM ('received', 'inReview', 'dispatching', 'delayed', 'needsClarification', 'completed', 'unavailable');

-- CreateEnum
CREATE TYPE "RequestHistoryActorType" AS ENUM ('system', 'customer', 'ops', 'support');

-- CreateEnum
CREATE TYPE "RequestHistoryVisibility" AS ENUM ('customer', 'internal');

-- CreateEnum
CREATE TYPE "RequestInterventionKind" AS ENUM ('clarification', 'blocker', 'unavailable');

-- CreateEnum
CREATE TYPE "InternalUserRole" AS ENUM ('ops', 'support');

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_fingerprint" TEXT NOT NULL,
    "issue_type_id" TEXT NOT NULL,
    "issue_label" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "serviceability_status" TEXT NOT NULL,
    "intake_next_step" TEXT NOT NULL,
    "intake_summary_headline" TEXT NOT NULL,
    "intake_summary_detail" TEXT NOT NULL,
    "intake_recovery_code" TEXT,
    "address_line1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "unit_or_access_note" TEXT,
    "location_details" TEXT,
    "lifecycle_state" "RequestLifecycleState" NOT NULL,
    "public_status" "PublicRequestStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "tracking_token" TEXT NOT NULL,
    "tracking_token_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "customer_context" JSONB,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_assignments" (
    "request_id" TEXT NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "owner_label" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL,
    "note" TEXT,

    CONSTRAINT "request_assignments_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "request_status_history" (
    "id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "previous_lifecycle_state" "RequestLifecycleState",
    "next_lifecycle_state" "RequestLifecycleState" NOT NULL,
    "previous_public_status" "PublicRequestStatus",
    "next_public_status" "PublicRequestStatus" NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "actor_type" "RequestHistoryActorType" NOT NULL,
    "actor_id" TEXT,
    "change_summary" TEXT NOT NULL,
    "visibility" "RequestHistoryVisibility" NOT NULL,
    "intervention_kind" "RequestInterventionKind",
    "intervention_detail" TEXT,
    "customer_snapshot" JSONB NOT NULL,

    CONSTRAINT "request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "InternalUserRole" NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "internal_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_public_id_key" ON "service_requests"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_idempotency_key_key" ON "service_requests"("idempotency_key");

-- CreateIndex
CREATE INDEX "service_requests_created_at_idx" ON "service_requests"("created_at");

-- CreateIndex
CREATE INDEX "request_status_history_request_id_occurred_at_idx" ON "request_status_history"("request_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "internal_users_email_key" ON "internal_users"("email");

-- AddForeignKey
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
