-- AlterTable
ALTER TABLE "patients" ADD COLUMN "consulting_doctor_id" UUID;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_consulting_doctor_id_fkey" FOREIGN KEY ("consulting_doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
