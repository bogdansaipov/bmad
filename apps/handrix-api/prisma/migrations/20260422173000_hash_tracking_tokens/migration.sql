ALTER TABLE "service_requests"
ADD COLUMN "tracking_token_digest" TEXT;

UPDATE "service_requests"
SET "tracking_token_digest" = md5("tracking_token");

ALTER TABLE "service_requests"
ALTER COLUMN "tracking_token_digest" SET NOT NULL;

ALTER TABLE "service_requests"
DROP COLUMN "tracking_token";
