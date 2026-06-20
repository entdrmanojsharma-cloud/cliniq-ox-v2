<!-- 
  Purpose: Define PostgreSQL table schemas, indexes, and relations 
  for identity, doctor profiles, patients, and hospital profile entities.
-->
# Database Spec: Identity & Profiles

This document details the PostgreSQL schemas for hospital settings, user credentials, doctor directories, and patient profiles.

---

## 1. `hospital_profile`
- **Purpose:** Manages global hospital identity configurations, financial defaults, and billing prefixes.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `code` VARCHAR(20) UNIQUE NOT NULL -- Short code used for UHID (e.g., 'CLKOX')
  - `name` VARCHAR(150) NOT NULL
  - `address` TEXT NOT NULL
  - `gst_number` VARCHAR(50) UNIQUE
  - `phone` VARCHAR(20) NOT NULL
  - `email` VARCHAR(100) NOT NULL
  - `logo_url` VARCHAR(255)
  - `currency` VARCHAR(10) DEFAULT 'INR' NOT NULL
  - `default_gst_rate` DECIMAL(5, 2) DEFAULT 18.00 NOT NULL
  - `estimate_prefix` VARCHAR(10) DEFAULT 'EST' NOT NULL
  - `invoice_prefix` VARCHAR(10) DEFAULT 'INV' NOT NULL
  - `receipt_prefix` VARCHAR(10) DEFAULT 'REC' NOT NULL
  - `financial_year_start` VARCHAR(10) DEFAULT '04-01' NOT NULL -- Format: MM-DD
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL

---

## 2. `users`
- **Purpose:** System users authentication database.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `email` VARCHAR(255) NOT NULL
  - `password_hash` VARCHAR(255) NOT NULL
  - `role` ENUM('RECEPTIONIST', 'DOCTOR', 'ADMIN') NOT NULL
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
- **Constraints:** `UNIQUE (hospital_id, email)`.

---

## 3. `doctors`
- **Purpose:** Decoupled clinical credentials and surgeon directory records.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `user_id` UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - `first_name` VARCHAR(100) NOT NULL
  - `last_name` VARCHAR(100) NOT NULL
  - `specialty` VARCHAR(100) NOT NULL
  - `license_number` VARCHAR(100) NOT NULL
  - `default_surgeon_fee` DECIMAL(10, 2) DEFAULT 0.00
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)
- **Constraints:** `UNIQUE (hospital_id, license_number)`.

---

## 4. `patients`
- **Purpose:** Patient clinical metadata storage.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `uhid` VARCHAR(100) NOT NULL -- Format: HOSPITALCODE-YYYY-000001 (Auto-generated, Immutable, Unique per hospital, Searchable. See ADR 017)
  - `name` VARCHAR(150) NOT NULL
  - `date_of_birth` DATE NOT NULL -- Derived age calculated on query/UI
  - `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL
  - `mobile` VARCHAR(20) NOT NULL
  - `address` TEXT
  - `referring_doctor` VARCHAR(150)
  - `notes` TEXT
  - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  - `deleted_at` TIMESTAMP WITH TIME ZONE
  - `deleted_by` UUID REFERENCES users(id)
- **Constraints:** `UNIQUE (hospital_id, uhid)`.
