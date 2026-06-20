/* 
  Migration Name: 20260606140000_init_estimating_and_templates
  Purpose: Initialize estimates, multiple surgeries, estimate items, versions snapshot tracking, and package templates tables.
*/

-- Create estimates table
CREATE TABLE "estimates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "estimate_number" VARCHAR(100) NOT NULL,
  "event_id" UUID UNIQUE NOT NULL REFERENCES "calendar_events"("id") ON DELETE CASCADE,
  "room_id" UUID NULL REFERENCES "rooms_master"("id") ON DELETE SET NULL,
  "status" "EstimateStatus" DEFAULT 'DRAFT' NOT NULL,
  "billing_status" VARCHAR(50) DEFAULT 'UNBILLED' NOT NULL,
  "expected_duration_minutes" INTEGER DEFAULT 0 NOT NULL,
  "expected_stay_days" INTEGER DEFAULT 0 NOT NULL,
  "icu_days" INTEGER DEFAULT 0 NOT NULL,
  "icu_daily_rate" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "calculated_ot_charge" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "actual_ot_charge" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "calculated_anaesthesia_charge" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "actual_anaesthesia_charge" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "anaesthesia_discount_pct" DECIMAL(5, 2) DEFAULT 0.00 NOT NULL,
  "nursing_daily_rate" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "service_daily_rate" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "subtotal" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "discount" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "taxable_amount" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "gst_rate" DECIMAL(5, 2) DEFAULT 0.00 NOT NULL,
  "gst_amount" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "grand_total" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "approved_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" TIMESTAMP WITH TIME ZONE NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "uq_estimates_hospital_number" UNIQUE ("hospital_id", "estimate_number")
);

-- Create estimate_surgeries table (Many-to-Many association)
CREATE TABLE "estimate_surgeries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "estimate_id" UUID NOT NULL REFERENCES "estimates"("id") ON DELETE CASCADE,
  "surgery_id" UUID NOT NULL REFERENCES "surgery_master"("id") ON DELETE RESTRICT,
  "duration_minutes" INTEGER DEFAULT 0 NOT NULL,
  "surgery_cost" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "discount_pct" DECIMAL(5, 2) DEFAULT 0.00 NOT NULL,
  "discount_amount" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "final_amount" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "uq_estimate_surgeries_unique" UNIQUE ("estimate_id", "surgery_id")
);

-- Create estimate_items table
CREATE TABLE "estimate_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "estimate_id" UUID NOT NULL REFERENCES "estimates"("id") ON DELETE CASCADE,
  "charge_category" VARCHAR(100) NOT NULL,
  "description" VARCHAR(255) NOT NULL,
  "quantity" INTEGER DEFAULT 1 NOT NULL,
  "rate" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "amount" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL
);

-- Create estimate_versions table
CREATE TABLE "estimate_versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "estimate_id" UUID NOT NULL REFERENCES "estimates"("id") ON DELETE CASCADE,
  "version_number" INTEGER NOT NULL,
  "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "previous_total" DECIMAL(10, 2) NOT NULL,
  "new_total" DECIMAL(10, 2) NOT NULL,
  "change_summary" TEXT NOT NULL,
  "change_reason" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "uq_estimate_versions_unique" UNIQUE ("estimate_id", "version_number")
);

-- Create estimate_templates table
CREATE TABLE "estimate_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "template_name" VARCHAR(150) NOT NULL,
  "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "visibility" "Visibility" DEFAULT 'GLOBAL' NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE NULL,
  "deleted_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "uq_templates_hospital_name" UNIQUE ("hospital_id", "template_name")
);

-- Create estimate_template_items table
CREATE TABLE "estimate_template_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id" UUID NOT NULL REFERENCES "estimate_templates"("id") ON DELETE CASCADE,
  "item_type" "TemplateItemType" NOT NULL,
  "description" VARCHAR(255) NOT NULL,
  "default_quantity" INTEGER DEFAULT 1 NOT NULL,
  "default_rate" DECIMAL(10, 2) DEFAULT 0.00 NOT NULL
);

-- Indexing foreign keys for query efficiency
CREATE INDEX "idx_estimates_room_fk" ON "estimates"("room_id");
CREATE INDEX "idx_estimate_surgeries_surg_fk" ON "estimate_surgeries"("surgery_id");
CREATE INDEX "idx_estimate_items_est_fk" ON "estimate_items"("estimate_id");
CREATE INDEX "idx_estimate_template_items_temp_fk" ON "estimate_template_items"("template_id");
