-- CreateTable
CREATE TABLE "handyman_category_preferences" (
    "id" TEXT NOT NULL,
    "handyman_profile_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handyman_category_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "handyman_category_preferences_handyman_profile_id_idx" ON "handyman_category_preferences"("handyman_profile_id");

-- CreateIndex
CREATE INDEX "handyman_category_preferences_category_id_idx" ON "handyman_category_preferences"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "handyman_category_preferences_handyman_profile_id_category__key" ON "handyman_category_preferences"("handyman_profile_id", "category_id");

-- AddForeignKey
ALTER TABLE "handyman_category_preferences" ADD CONSTRAINT "handyman_category_preferences_handyman_profile_id_fkey" FOREIGN KEY ("handyman_profile_id") REFERENCES "handyman_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handyman_category_preferences" ADD CONSTRAINT "handyman_category_preferences_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
