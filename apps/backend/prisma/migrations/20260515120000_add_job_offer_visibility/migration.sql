-- AlterTable
ALTER TABLE "handyman_profiles" ADD COLUMN "base_location_lat" DOUBLE PRECISION,
ADD COLUMN "base_location_lng" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "job_offer_visibilities" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "handyman_profile_id" TEXT NOT NULL,
    "offer_status" TEXT NOT NULL DEFAULT 'pending',
    "offered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "job_offer_visibilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_offer_visibilities_request_id_idx" ON "job_offer_visibilities"("request_id");

-- CreateIndex
CREATE INDEX "job_offer_visibilities_handyman_profile_id_idx" ON "job_offer_visibilities"("handyman_profile_id");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "job_offer_visibilities_request_id_handyman_profile_id_key" ON "job_offer_visibilities"("request_id", "handyman_profile_id");

-- AddForeignKey
ALTER TABLE "job_offer_visibilities" ADD CONSTRAINT "job_offer_visibilities_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_offer_visibilities" ADD CONSTRAINT "job_offer_visibilities_handyman_profile_id_fkey" FOREIGN KEY ("handyman_profile_id") REFERENCES "handyman_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
