/* 
  Migration Name: 20260606130000_init_scheduling_and_charges
  Purpose: Initialize scheduling directories (Surgeries, OTs, Rooms, Charges) and the unified calendar engine with timestamps.
*/

-- Create surgery_master table
CREATE TABLE "surgery_master" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "surgery_code" VARCHAR(50) NOT NULL,
  "surgery_name" VARCHAR(150) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "default_surgeon_fee" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "uq_surgery_hospital_code" UNIQUE ("hospital_id", "surgery_code")
);

-- Create ot_rooms_master table
CREATE TABLE "ot_rooms_master" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "room_name" VARCHAR(150) NOT NULL,
  "default_hourly_charge" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "uq_ot_rooms_hospital_name" UNIQUE ("hospital_id", "room_name")
);

-- Create rooms_master table
CREATE TABLE "rooms_master" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "room_name" VARCHAR(150) NOT NULL,
  "room_type" VARCHAR(100) NOT NULL,
  "default_daily_charge" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "uq_rooms_hospital_name" UNIQUE ("hospital_id", "room_name")
);

-- Create hospital_charges_master table
CREATE TABLE "hospital_charges_master" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "charge_name" VARCHAR(150) NOT NULL,
  "charge_category" VARCHAR(100) NOT NULL,
  "default_rate" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "unit_type" "UnitType" NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "uq_charges_hospital_name" UNIQUE ("hospital_id", "charge_name")
);

-- Create pending_master_charges table
CREATE TABLE "pending_master_charges" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "status" "PendingChargeStatus" DEFAULT 'PENDING' NOT NULL,
  "charge_name" VARCHAR(150) NOT NULL,
  "charge_category" VARCHAR(100) NOT NULL,
  "default_rate" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "unit_type" "UnitType" NOT NULL,
  "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL
);

-- Create calendar_events table (Unified Scheduler)
CREATE TABLE "calendar_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "event_type" "EventType" NOT NULL,
  "event_status" "EventStatus" DEFAULT 'PENDING' NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
  "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
  "doctor_id" UUID NULL REFERENCES "doctors"("id") ON DELETE SET NULL,
  "ot_room_id" UUID NULL REFERENCES "ot_rooms_master"("id") ON DELETE SET NULL,
  "patient_id" UUID NULL REFERENCES "patients"("id") ON DELETE SET NULL,
  "recurrence_rule" VARCHAR(255) NULL,
  "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "approved_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" TIMESTAMP WITH TIME ZONE NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "ck_calendar_start_end" CHECK ("start_time" < "end_time")
);

-- Indexing for conflict checks and scheduling queries
CREATE INDEX "idx_calendar_scheduling_conflict" ON "calendar_events"("hospital_id", "start_time", "end_time", "doctor_id", "ot_room_id") WHERE "is_active" = TRUE;
CREATE INDEX "idx_calendar_doctor_fk" ON "calendar_events"("doctor_id");
CREATE INDEX "idx_calendar_ot_fk" ON "calendar_events"("ot_room_id");
CREATE INDEX "idx_calendar_patient_fk" ON "calendar_events"("patient_id");
