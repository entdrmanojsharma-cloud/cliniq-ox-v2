<!-- 
  Purpose: Define PostgreSQL table schemas, indexes, and relations 
  for estimates, items, versions, and reusable package templates.
-->
# Database Spec: Estimates & Pricing

This document details the PostgreSQL schemas for patient cost calculations, templates, and revision tracking.

---

## 1. `estimates`
- **Purpose:** Tracks patient cost estimations linked directly to calendar surgery events.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `estimate_number` VARCHAR(100) NOT NULL
  - `event_id` UUID UNIQUE NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE
  - `room_id` UUID REFERENCES rooms_master(id) ON DELETE SET NULL
  - `status` ENUM('DRAFT', 'APPROVED', 'LOCKED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT'
  - `billing_status` VARCHAR(50) DEFAULT 'UNBILLED' NOT NULL -- Reserved for future billing integration
  - `expected_duration_minutes` INTEGER NOT NULL DEFAULT 0
  - `expected_stay_days` INTEGER NOT NULL DEFAULT 0
  - `icu_days` INTEGER NOT NULL DEFAULT 0
  - `icu_daily_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `calculated_ot_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `actual_ot_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `calculated_anaesthesia_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `actual_anaesthesia_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `anaesthesia_discount_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00
  - `nursing_daily_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `service_daily_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `taxable_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `gst_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00
  - `gst_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `grand_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `approved_by` UUID REFERENCES users(id)
  - `approved_at` TIMESTAMP WITH TIME ZONE
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)
- **Constraints:** `UNIQUE (hospital_id, estimate_number)`.

---

## 2. `estimate_surgeries`
- **Purpose:** Many-to-Many association for multiple surgeries within a single estimate.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `estimate_id` UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE
  - `surgery_id` UUID NOT NULL REFERENCES surgery_master(id) ON DELETE RESTRICT
  - `duration_minutes` INTEGER NOT NULL DEFAULT 0
  - `surgery_cost` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `discount_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00
  - `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `final_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)

---

## 3. `estimate_items`
- **Purpose:** Stores individual cost items.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `estimate_id` UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE
  - `charge_category` VARCHAR(100) NOT NULL
  - `description` VARCHAR(255) NOT NULL
  - `quantity` INTEGER NOT NULL DEFAULT 1
  - `rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)

---

## 4. `estimate_versions`
- **Purpose:** Historical audit snapshots.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `estimate_id` UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE
  - `version_number` INTEGER NOT NULL
  - `created_by` UUID NOT NULL REFERENCES users(id)
  - `previous_total` DECIMAL(10, 2) NOT NULL
  - `new_total` DECIMAL(10, 2) NOT NULL
  - `change_summary` TEXT NOT NULL
  - `change_reason` TEXT NOT NULL
  - `snapshot` JSONB NOT NULL
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

---

## 5. `estimate_templates`
- **Purpose:** Saved templates (packages).
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `template_name` VARCHAR(150) NOT NULL
  - `created_by` UUID NOT NULL REFERENCES users(id)
  - `visibility` ENUM('GLOBAL', 'PRIVATE') NOT NULL DEFAULT 'GLOBAL'
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)
- **Constraints:** `UNIQUE (hospital_id, template_name)`.

---

## 6. `estimate_template_items`
- **Purpose:** Items inside templates.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `template_id` UUID NOT NULL REFERENCES estimate_templates(id) ON DELETE CASCADE
  - `item_type` ENUM('SURGERY_FEE', 'OT_CHARGE', 'ANAESTHESIA', 'ROOM_CHARGE', 'NURSING', 'ICU', 'ADDITIONAL') NOT NULL
  - `description` VARCHAR(255) NOT NULL
  - `default_quantity` INTEGER NOT NULL DEFAULT 1
  - `default_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
