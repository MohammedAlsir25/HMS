CREATE TYPE "GenderType" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

ALTER TABLE "patients" ADD COLUMN "gender_new" "GenderType" DEFAULT 'UNKNOWN';
UPDATE "patients" SET "gender_new" = 'MALE' WHERE UPPER("gender") IN ('MALE', 'M', 'ذكر');
UPDATE "patients" SET "gender_new" = 'FEMALE' WHERE UPPER("gender") IN ('FEMALE', 'F', 'أنثى');
UPDATE "patients" SET "gender_new" = 'OTHER' WHERE UPPER("gender") IN ('OTHER', 'O');
UPDATE "patients" SET "gender_new" = 'UNKNOWN' WHERE "gender" IS NULL OR UPPER("gender") NOT IN ('MALE', 'M', 'FEMALE', 'F', 'OTHER', 'O', 'ذكر', 'أنثى');

ALTER TABLE "patients" DROP COLUMN "gender";
ALTER TABLE "patients" RENAME COLUMN "gender_new" TO "gender";

ALTER TABLE "patients" ADD COLUMN "structured_name" JSONB;

CREATE TABLE "fhir_endpoints" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "base_url" TEXT NOT NULL,
  "auth_type" TEXT NOT NULL DEFAULT 'bearer',
  "auth_config" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'active',
  "last_sync_at" TIMESTAMPTZ,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "description" TEXT,
  "hospital_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "fhir_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fhir_endpoints_hospital_id_idx" ON "fhir_endpoints"("hospital_id");

ALTER TABLE "fhir_endpoints" ADD CONSTRAINT "fhir_endpoints_hospital_id_fkey"
  FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
