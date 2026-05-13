-- CreateTable
CREATE TABLE "request_images" (
    "id" TEXT NOT NULL,
    "request_id" TEXT,
    "uploader_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_images_request_id_idx" ON "request_images"("request_id");

-- CreateIndex
CREATE INDEX "request_images_uploader_id_idx" ON "request_images"("uploader_id");

-- AddForeignKey
ALTER TABLE "request_images" ADD CONSTRAINT "request_images_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_images" ADD CONSTRAINT "request_images_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
