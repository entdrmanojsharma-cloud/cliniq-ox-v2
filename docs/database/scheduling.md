<!-- 
  Purpose: Define PostgreSQL table schemas, indexes, and relations 
  for scheduling calendar events and master configurations.
-->
# Database Spec: Scheduling & Masters

This document details the PostgreSQL schemas for the unified calendar, surgery master, OT rooms, ward rooms, and pricing scales.

---

## 1. `calendar_events`
- **Purpose:** Unified scheduling engine. Stores all calendar entries (Surgery, OPD, IPD, Meeting, Leave, Conference) and approvals.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `event_type` ENUM('SURGERY', 'OPD', 'IPD', 'MEETING', 'LEAVE', 'CONFERENCE', 'ADMINISTRATIVE', 'OTHER') NOT NULL
  - `event_status` ENUM('PENDING', 'APPROVED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING'
  - `title` VARCHAR(255) NOT NULL
  - `start_time` TIMESTAMP WITH TIME ZONE NOT NULL
  - `end_time` TIMESTAMP WITH TIME ZONE NOT NULL
  - `doctor_id` UUID REFERENCES doctors(id) ON DELETE SET NULL
  - `ot_room_id` UUID REFERENCES ot_rooms_master(id) ON DELETE SET NULL
  - `patient_id` UUID REFERENCES patients(id) ON DELETE SET NULL
  - `recurrence_rule` VARCHAR(255)
  - `created_by` UUID NOT NULL REFERENCES users(id)
  - `approved_by` UUID REFERENCES users(id)
  - `approved_at` TIMESTAMP WITH TIME ZONE
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)
- **Constraints:** Check constraint `start_time < end_time`.

---

## 2. `surgery_master`
- **Purpose:** Surgery code directories.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `surgery_code` VARCHAR(50) NOT NULL
  - `surgery_name` VARCHAR(150) NOT NULL
  - `category` VARCHAR(100) NOT NULL
  - `default_surgeon_fee` DECIMAL(10, 2) DEFAULT 0.00
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)
- **Constraints:** `UNIQUE (hospital_id, surgery_code)`.

---

## 3. `ot_rooms_master`
- **Purpose:** Operating Theatre directory list.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `room_name` VARCHAR(150) NOT NULL
  - `default_hourly_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)
- **Constraints:** `UNIQUE (hospital_id, room_name)`.

---

## 4. `rooms_master`
- **Purpose:** Ward room directories.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `room_name` VARCHAR(150) NOT NULL
  - `room_type` VARCHAR(100) NOT NULL
  - `default_daily_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)
- **Constraints:** `UNIQUE (hospital_id, room_name)`.

---

## 5. `hospital_charges_master`
- **Purpose:** Central base rates (OT, Anaesthesia, Nursing, ICU, etc.).
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `charge_name` VARCHAR(150) NOT NULL
  - `charge_category` VARCHAR(100) NOT NULL
  - `default_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `unit_type` ENUM('FIXED', 'PER_HOUR', 'PER_DAY') NOT NULL
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)
- **Constraints:** `UNIQUE (hospital_id, charge_name)`.

---

## 6. `pending_master_charges`
- **Purpose:** Approval queue for dynamically suggested custom estimate charges.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING'
  - `charge_name` VARCHAR(150) NOT NULL
  - `charge_category` VARCHAR(100) NOT NULL
  - `default_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  - `unit_type` VARCHAR(50) NOT NULL
  - `created_by` UUID NOT NULL REFERENCES users(id)
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)
