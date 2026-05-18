-- CreateTable
CREATE TABLE "handyman_location_updates" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "handyman_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handyman_location_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "handyman_location_updates_request_id_recorded_at_idx" ON "handyman_location_updates"("request_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "handyman_location_updates" ADD CONSTRAINT "handyman_location_updates_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handyman_location_updates" ADD CONSTRAINT "handyman_location_updates_handyman_id_fkey" FOREIGN KEY ("handyman_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
