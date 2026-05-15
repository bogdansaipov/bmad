-- CreateTable
CREATE TABLE "request_assignments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "handyman_user_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignment_status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "request_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_status_history" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "request_assignments_request_id_key" ON "request_assignments"("request_id");

-- CreateIndex
CREATE INDEX "request_status_history_request_id_created_at_idx" ON "request_status_history"("request_id", "created_at");

-- AddForeignKey
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_handyman_user_id_fkey" FOREIGN KEY ("handyman_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
