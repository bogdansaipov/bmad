-- CreateTable
CREATE TABLE "request_feedback" (
    "id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "satisfaction_rating" INTEGER NOT NULL,
    "reduced_uncertainty" BOOLEAN,
    "free_text" TEXT,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "request_feedback_request_id_key" ON "request_feedback"("request_id");

-- CreateIndex
CREATE INDEX "request_feedback_recorded_at_idx" ON "request_feedback"("recorded_at");

-- AddForeignKey
ALTER TABLE "request_feedback" ADD CONSTRAINT "request_feedback_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add satisfaction rating bounds check
ALTER TABLE "request_feedback" ADD CONSTRAINT "request_feedback_satisfaction_rating_check"
  CHECK ("satisfaction_rating" BETWEEN 1 AND 5);
