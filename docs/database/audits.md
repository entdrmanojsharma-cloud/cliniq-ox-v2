<!-- 
  Purpose: Define PostgreSQL table schema, indexes, and relations 
  for auditing system operations.
-->
# Database Spec: Audit Trails

This document details the PostgreSQL schema for the central system audit logs.

---

## 1. `audit_logs`
- **Purpose:** Tracks all critical user actions (inserts, updates, soft-deletes) across all system modules, retaining immutable snapshots of user names and roles.
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `hospital_id` UUID NOT NULL REFERENCES hospital_profile(id) ON DELETE CASCADE
  - `user_id` UUID REFERENCES users(id) ON DELETE SET NULL
  - `user_name_snapshot` VARCHAR(255) NOT NULL -- Retains the user's name even if deleted
  - `user_role_snapshot` VARCHAR(100) NOT NULL -- Retains the user's role even if changed
  - `action` VARCHAR(100) NOT NULL -- e.g. "CREATE_ESTIMATE", "SOFT_DELETE_PATIENT"
  - `target_table` VARCHAR(100) NOT NULL -- e.g. "estimates", "patients"
  - `target_id` UUID NOT NULL -- ID of modified record
  - `payload` JSONB NOT NULL -- Holds full changes array or snapshot differences
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
- **Relationships:** Many-to-One with `hospital_profile`, `users`.
- **Indexes:**
  - `CREATE INDEX idx_audit_lookup ON audit_logs(hospital_id, created_at DESC);`
  - `CREATE INDEX idx_audit_target ON audit_logs(target_table, target_id);`
- **Constraints:** None (appends only).
