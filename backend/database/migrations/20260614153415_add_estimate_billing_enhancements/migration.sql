-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('FIXED_PACKAGE', 'DETAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstimateStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "EstimateStatus" ADD VALUE 'REJECTED';

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_created_by_fkey";

-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_ot_room_id_fkey";

-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_surgery_id_fkey";

-- DropForeignKey
ALTER TABLE "doctors" DROP CONSTRAINT "doctors_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "doctors" DROP CONSTRAINT "doctors_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "doctors" DROP CONSTRAINT "doctors_user_id_fkey";

-- DropForeignKey
ALTER TABLE "estimate_items" DROP CONSTRAINT "estimate_items_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "estimate_items" DROP CONSTRAINT "estimate_items_estimate_id_fkey";

-- DropForeignKey
ALTER TABLE "estimate_surgeries" DROP CONSTRAINT "estimate_surgeries_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "estimate_surgeries" DROP CONSTRAINT "estimate_surgeries_estimate_id_fkey";

-- DropForeignKey
ALTER TABLE "estimate_surgeries" DROP CONSTRAINT "estimate_surgeries_surgery_id_fkey";

-- DropForeignKey
ALTER TABLE "estimate_template_items" DROP CONSTRAINT "estimate_template_items_template_id_fkey";

-- DropForeignKey
ALTER TABLE "estimate_templates" DROP CONSTRAINT "estimate_templates_created_by_fkey";

-- DropForeignKey
ALTER TABLE "estimate_templates" DROP CONSTRAINT "estimate_templates_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "estimate_templates" DROP CONSTRAINT "estimate_templates_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "estimate_versions" DROP CONSTRAINT "estimate_versions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "estimate_versions" DROP CONSTRAINT "estimate_versions_estimate_id_fkey";

-- DropForeignKey
ALTER TABLE "estimates" DROP CONSTRAINT "estimates_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "estimates" DROP CONSTRAINT "estimates_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "estimates" DROP CONSTRAINT "estimates_event_id_fkey";

-- DropForeignKey
ALTER TABLE "estimates" DROP CONSTRAINT "estimates_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "estimates" DROP CONSTRAINT "estimates_room_id_fkey";

-- DropForeignKey
ALTER TABLE "hospital_charges_master" DROP CONSTRAINT "hospital_charges_master_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "hospital_charges_master" DROP CONSTRAINT "hospital_charges_master_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "ot_rooms_master" DROP CONSTRAINT "ot_rooms_master_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "ot_rooms_master" DROP CONSTRAINT "ot_rooms_master_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_requests" DROP CONSTRAINT "password_reset_requests_user_id_fkey";

-- DropForeignKey
ALTER TABLE "patients" DROP CONSTRAINT "patients_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "patients" DROP CONSTRAINT "patients_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "pending_master_charges" DROP CONSTRAINT "pending_master_charges_created_by_fkey";

-- DropForeignKey
ALTER TABLE "pending_master_charges" DROP CONSTRAINT "pending_master_charges_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "pending_master_charges" DROP CONSTRAINT "pending_master_charges_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms_master" DROP CONSTRAINT "rooms_master_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "rooms_master" DROP CONSTRAINT "rooms_master_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "surgery_master" DROP CONSTRAINT "surgery_master_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "surgery_master" DROP CONSTRAINT "surgery_master_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_hospital_id_fkey";

-- DropIndex
DROP INDEX "idx_calendar_doctor_fk";

-- DropIndex
DROP INDEX "idx_calendar_ot_fk";

-- DropIndex
DROP INDEX "idx_calendar_patient_fk";

-- DropIndex
DROP INDEX "idx_estimate_items_est_fk";

-- DropIndex
DROP INDEX "idx_estimate_surgeries_surg_fk";

-- DropIndex
DROP INDEX "idx_estimate_template_items_temp_fk";

-- DropIndex
DROP INDEX "idx_estimates_room_fk";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "hospital_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "estimate_templates" ADD COLUMN     "package_includes" TEXT,
ADD COLUMN     "package_price" DECIMAL(10,2),
ADD COLUMN     "template_type" "TemplateType" NOT NULL DEFAULT 'DETAILED';

-- AlterTable
ALTER TABLE "estimates" ADD COLUMN     "approval_remarks" TEXT,
ADD COLUMN     "is_package" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "package_includes" TEXT,
ADD COLUMN     "package_name" VARCHAR(150),
ADD COLUMN     "package_price" DECIMAL(10,2),
ADD COLUMN     "package_template_id" UUID,
ADD COLUMN     "scheduled_date" TIMESTAMPTZ,
ADD COLUMN     "surgeon_id" UUID,
ADD COLUMN     "surgery_name" VARCHAR(255);

-- CreateTable
CREATE TABLE "billing_defaults" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "ot_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "ga_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "la_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "sedation_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "assistant_surgeon_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "surgeon_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "room_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "icu_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "ward_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "nursing_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "monitoring_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "dressing_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "consumable_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "equipment_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "admission_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "registration_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_defaults_hospital_id_key" ON "billing_defaults"("hospital_id");

-- CreateIndex
CREATE INDEX "calendar_events_hospital_id_start_time_end_time_doctor_id_o_idx" ON "calendar_events"("hospital_id", "start_time", "end_time", "doctor_id", "ot_room_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_ot_room_id_fkey" FOREIGN KEY ("ot_room_id") REFERENCES "ot_rooms_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_surgery_id_fkey" FOREIGN KEY ("surgery_id") REFERENCES "surgery_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgery_master" ADD CONSTRAINT "surgery_master_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgery_master" ADD CONSTRAINT "surgery_master_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_rooms_master" ADD CONSTRAINT "ot_rooms_master_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_rooms_master" ADD CONSTRAINT "ot_rooms_master_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms_master" ADD CONSTRAINT "rooms_master_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms_master" ADD CONSTRAINT "rooms_master_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_charges_master" ADD CONSTRAINT "hospital_charges_master_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_charges_master" ADD CONSTRAINT "hospital_charges_master_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_master_charges" ADD CONSTRAINT "pending_master_charges_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_master_charges" ADD CONSTRAINT "pending_master_charges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_master_charges" ADD CONSTRAINT "pending_master_charges_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_surgeon_id_fkey" FOREIGN KEY ("surgeon_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_package_template_id_fkey" FOREIGN KEY ("package_template_id") REFERENCES "estimate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_surgeries" ADD CONSTRAINT "estimate_surgeries_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_surgeries" ADD CONSTRAINT "estimate_surgeries_surgery_id_fkey" FOREIGN KEY ("surgery_id") REFERENCES "surgery_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_surgeries" ADD CONSTRAINT "estimate_surgeries_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_templates" ADD CONSTRAINT "estimate_templates_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_templates" ADD CONSTRAINT "estimate_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_templates" ADD CONSTRAINT "estimate_templates_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_template_items" ADD CONSTRAINT "estimate_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "estimate_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_defaults" ADD CONSTRAINT "billing_defaults_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_audit_lookup" RENAME TO "audit_logs_hospital_id_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_audit_target" RENAME TO "audit_logs_target_table_target_id_idx";

-- RenameIndex
ALTER INDEX "uq_doctors_hospital_license" RENAME TO "doctors_hospital_id_license_number_key";

-- RenameIndex
ALTER INDEX "uq_estimate_surgeries_unique" RENAME TO "estimate_surgeries_estimate_id_surgery_id_key";

-- RenameIndex
ALTER INDEX "uq_templates_hospital_name" RENAME TO "estimate_templates_hospital_id_template_name_key";

-- RenameIndex
ALTER INDEX "uq_estimate_versions_unique" RENAME TO "estimate_versions_estimate_id_version_number_key";

-- RenameIndex
ALTER INDEX "uq_estimates_hospital_number" RENAME TO "estimates_hospital_id_estimate_number_key";

-- RenameIndex
ALTER INDEX "uq_charges_hospital_name" RENAME TO "hospital_charges_master_hospital_id_charge_name_key";

-- RenameIndex
ALTER INDEX "uq_ot_rooms_hospital_name" RENAME TO "ot_rooms_master_hospital_id_room_name_key";

-- RenameIndex
ALTER INDEX "idx_patients_mobile" RENAME TO "patients_hospital_id_mobile_idx";

-- RenameIndex
ALTER INDEX "idx_patients_name" RENAME TO "patients_hospital_id_name_idx";

-- RenameIndex
ALTER INDEX "uq_patients_hospital_uhid" RENAME TO "patients_hospital_id_uhid_key";

-- RenameIndex
ALTER INDEX "uq_rooms_hospital_name" RENAME TO "rooms_master_hospital_id_room_name_key";

-- RenameIndex
ALTER INDEX "uq_surgery_hospital_code" RENAME TO "surgery_master_hospital_id_surgery_code_key";
