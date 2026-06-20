/* 
  Migration Name: 20260606120000_init_enums_and_core_tables
  Purpose: Define all custom PostgreSQL database enums and initialize the core identity, user, doctor, and patient tables.
*/

-- Create custom enums
CREATE TYPE "Role" AS ENUM ('RECEPTIONIST', 'DOCTOR', 'ADMIN');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "EventType" AS ENUM ('SURGERY', 'OPD', 'IPD', 'MEETING', 'LEAVE', 'CONFERENCE', 'ADMINISTRATIVE', 'OTHER');
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'APPROVED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "UnitType" AS ENUM ('FIXED', 'PER_HOUR', 'PER_DAY');
CREATE TYPE "PendingChargeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'APPROVED', 'LOCKED', 'CANCELLED');
CREATE TYPE "Visibility" AS ENUM ('GLOBAL', 'PRIVATE');
CREATE TYPE "TemplateItemType" AS ENUM ('SURGERY_FEE', 'OT_CHARGE', 'ANAESTHESIA', 'ROOM_CHARGE', 'NURSING', 'ICU', 'ADDITIONAL');

-- Enable pgcrypto extension for gen_random_uuid() if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create hospital_profile table
CREATE TABLE "hospital_profile" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(20) UNIQUE NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "address" TEXT NOT NULL,
  "gst_number" VARCHAR(50) UNIQUE NULL,
  "phone" VARCHAR(20) NOT NULL,
  "email" VARCHAR(100) NOT NULL,
  "logo_url" VARCHAR(255) NULL,
  "currency" VARCHAR(10) DEFAULT 'INR' NOT NULL,
  "default_gst_rate" DECIMAL(5, 2) DEFAULT 18.00 NOT NULL,
  "estimate_prefix" VARCHAR(10) DEFAULT 'EST' NOT NULL,
  "invoice_prefix" VARCHAR(10) DEFAULT 'INV' NOT NULL,
  "receipt_prefix" VARCHAR(10) DEFAULT 'REC' NOT NULL,
  "financial_year_start" VARCHAR(10) DEFAULT '04-01' NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create users table
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "email" VARCHAR(255) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "role" "Role" NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "uq_users_hospital_email" UNIQUE ("hospital_id", "email")
);

-- Create doctors table
CREATE TABLE "doctors" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "user_id" UUID UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "first_name" VARCHAR(100) NOT NULL,
  "last_name" VARCHAR(100) NOT NULL,
  "specialty" VARCHAR(100) NOT NULL,
  "license_number" VARCHAR(100) NOT NULL,
  "default_surgeon_fee" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "uq_doctors_hospital_license" UNIQUE ("hospital_id", "license_number")
);

-- Create patients table
CREATE TABLE "patients" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "uhid" VARCHAR(100) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "date_of_birth" DATE NOT NULL,
  "gender" "Gender" NOT NULL,
  "mobile" VARCHAR(20) NOT NULL,
  "address" TEXT NULL,
  "referring_doctor" VARCHAR(150) NULL,
  "notes" TEXT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "uq_patients_hospital_uhid" UNIQUE ("hospital_id", "uhid")
);

-- Indexing searchable patient fields
CREATE INDEX "idx_patients_mobile" ON "patients"("hospital_id", "mobile");
CREATE INDEX "idx_patients_name" ON "patients"("hospital_id", "name");
