/* 
  Migration Name: 20260606164500_add_document_generations
  Purpose: Remove document archival fields from estimates table and create separate document_generations table.
*/

-- AlterTable
ALTER TABLE "estimates" 
  DROP COLUMN "generated_file_name",
  DROP COLUMN "generated_at",
  DROP COLUMN "generated_by";

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ESTIMATE', 'INVOICE', 'RECEIPT', 'CONSENT_FORM');

-- CreateTable
CREATE TABLE "document_generations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "target_id" UUID NOT NULL,
    "generated_file_name" VARCHAR(255) NOT NULL,
    "generated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" UUID NOT NULL,

    CONSTRAINT "document_generations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "document_generations" ADD CONSTRAINT "document_generations_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_generations" ADD CONSTRAINT "document_generations_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "document_generations_hospital_id_generated_at_idx" ON "document_generations"("hospital_id", "generated_at" DESC);
CREATE INDEX "document_generations_document_type_target_id_idx" ON "document_generations"("document_type", "target_id");
