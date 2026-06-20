/* 
  Migration Name: 20260606150000_init_audits_and_indexes
  Purpose: Initialize the system-wide action audit trail logging table and define global performance query indexes.
*/

-- Create audit_logs table
CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospital_profile"("id") ON DELETE CASCADE,
  "user_id" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "user_name_snapshot" VARCHAR(255) NOT NULL,
  "user_role_snapshot" VARCHAR(100) NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "target_table" VARCHAR(100) NOT NULL,
  "target_id" UUID NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexing for high-performance audits search and log queries
CREATE INDEX "idx_audit_lookup" ON "audit_logs"("hospital_id", "created_at" DESC);
CREATE INDEX "idx_audit_target" ON "audit_logs"("target_table", "target_id");
