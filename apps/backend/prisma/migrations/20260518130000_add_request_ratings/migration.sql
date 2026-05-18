-- CreateTable
CREATE TABLE "request_ratings" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "handyman_id" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "short_feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "request_ratings_request_id_key" ON "request_ratings"("request_id");

-- AddForeignKey
ALTER TABLE "request_ratings" ADD CONSTRAINT "request_ratings_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_ratings" ADD CONSTRAINT "request_ratings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_ratings" ADD CONSTRAINT "request_ratings_handyman_id_fkey" FOREIGN KEY ("handyman_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
