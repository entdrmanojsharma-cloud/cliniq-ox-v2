/*
  Migration: align_schema_drift_2
  Purpose: Fix remaining schema drift for charges and calendar tables.
*/

-- ============================================
-- 1. HOSPITAL_CHARGES_MASTER: Add default_gst
-- ============================================
ALTER TABLE "hospital_charges_master"
  ADD COLUMN IF NOT EXISTS "default_gst" DECIMAL(5, 2) DEFAULT 0.00 NOT NULL;

-- ============================================
-- 2. PENDING_MASTER_CHARGES: Add default_gst
-- ============================================
ALTER TABLE "pending_master_charges"
  ADD COLUMN IF NOT EXISTS "default_gst" DECIMAL(5, 2) DEFAULT 0.00 NOT NULL;

-- ============================================
-- 3. CALENDAR_EVENTS: Add missing columns
-- ============================================
ALTER TABLE "calendar_events"
  ADD COLUMN IF NOT EXISTS "location" VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS "description" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "surgery_id" UUID NULL REFERENCES "surgery_master"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "surgery_cost" DECIMAL(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER NULL;
