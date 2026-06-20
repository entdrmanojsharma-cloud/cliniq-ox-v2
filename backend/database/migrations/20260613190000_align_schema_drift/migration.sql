/*
  Migration: align_schema_drift
  Purpose: Fix schema drift between Prisma schema and actual database.
  Aligns users, hospital_profile, patients tables and Role enum with current schema.prisma.
*/

-- ============================================
-- 1. ROLE ENUM: Add SUPER_ADMIN
-- ============================================
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- ============================================
-- 2. HOSPITAL_PROFILE: Add missing columns
-- ============================================
ALTER TABLE "hospital_profile"
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE NULL;

-- ============================================
-- 3. USERS TABLE: Rename email -> username, add missing columns, fix constraints
-- ============================================

-- 3a. Drop old composite unique constraint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "uq_users_hospital_email";

-- 3b. Rename email column to username
ALTER TABLE "users" RENAME COLUMN "email" TO "username";

-- 3c. Add unique constraint on username
ALTER TABLE "users" ADD CONSTRAINT "users_username_key" UNIQUE ("username");

-- 3d. Make hospital_id nullable (schema has String?)
ALTER TABLE "users" ALTER COLUMN "hospital_id" DROP NOT NULL;

-- 3e. Add missing columns
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "plain_password" VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS "first_name" VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS "last_name" VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN DEFAULT FALSE NOT NULL;

-- ============================================
-- 4. PATIENTS TABLE: Add missing pmjay_number
-- ============================================
ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "pmjay_number" VARCHAR(100) NULL;

-- ============================================
-- 5. PASSWORD_RESET_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS "password_reset_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "username" VARCHAR(255) NOT NULL,
  "status" VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
  "temp_password" VARCHAR(255) NULL,
  "requested_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "resolved_at" TIMESTAMP WITH TIME ZONE NULL,
  "resolved_by" UUID NULL
);

-- ============================================
-- 6. DOCUMENT_SEQUENCES TABLE (if missing)
-- ============================================
CREATE TABLE IF NOT EXISTS "document_sequences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "document_type" VARCHAR(50) NOT NULL,
  "year" INTEGER NOT NULL,
  "next_value" INTEGER DEFAULT 1 NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "document_sequences_hospital_id_document_type_year_key" UNIQUE ("hospital_id", "document_type", "year")
);
