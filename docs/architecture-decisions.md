<!-- 
  Purpose: Document Architecture Decision Records (ADRs) tracking design contexts, 
  decisions, statuses, and technical consequences.
-->
# Cliniq-OX: Architecture Decision Records (ADR)

This document tracks key engineering decisions, their context, and long-term implications.

---

## ADR 013: Estimate State Machine & Approved Lock Constraint
- **Decision:** Implement an Estimate State Machine with states: `DRAFT`, `APPROVED`, `LOCKED`, and `CANCELLED`. If the estimate status is `APPROVED` or `LOCKED`, block direct database mutations. Any modification request must generate a new Version record with version history tracking.
- **Consequence:** Guarantees historical calculation stability and compliance auditing. Prevents unauthorized fee manipulation post-approval.

---

## ADR 014: Data Retention & Archival Policies
- **Decision:** Inactive records marked soft-deleted (where `is_active = false`) for longer than 7 years are eligible for bulk data compaction and archival to warm bucket storage.
- **Consequence:** Database query indexes remain highly performant while maintaining long-term historical records.

---

## ADR 015: Immutable Estimate Numbering Strategy
- **Decision:** Estimate numbers are generated sequentially using the format `EST-YYYY-XXXXX` (where `YYYY` is the current year and `XXXXX` is a sequential zero-padded number). Once assigned, this estimate number is strictly immutable and cannot be edited, changed, or reassigned, even if the estimate is duplicated or updated.
- **Consequence:** Guarantees audit traceability and prevents double-referencing of estimates.

---

## ADR 016: Multiple Surgeon Architecture Reservation
- **Decision:** For Phase 1, we persist a single `doctor_id` referencing the primary surgeon in `calendar_events` to keep queries simple, ensuring easy migrations to an `event_doctors` join table in the future.
- **Consequence:** Promotes agile Phase 1 database design while providing a clean expansion pathway.

---

## ADR 017: Patient UHID Generation Strategy
- **Decision:** Patient UHIDs (Unique Hospital ID) must be auto-generated at the system level upon patient creation using a strict, standardized format and set of business rules.
  - **UHID Format:** `HOSPITALCODE-YYYY-000001`
    - `HOSPITALCODE`: Short uppercase alphanumeric code representing the hospital (e.g., `CLKOX`), derived from the `hospital_profile.code` column.
    - `YYYY`: 4-digit calendar year of patient registration (e.g., `2026`).
    - `000001`: A 6-digit, sequential, zero-padded integer starting at `000001` per hospital and per year.
  - **Examples:**
    - `CLKOX-2026-000001`
    - `CLKOX-2026-000002`
  - **Rules:**
    - **Auto-generated:** The backend server computes the next sequential number and constructs the string during insertion. Client inputs cannot supply or override this value.
    - **Immutable:** Once generated and saved, a patient's UHID can never be modified, updated, or reassigned.
    - **Unique per Hospital:** Tenant isolation is enforced. No two patients under the same hospital tenant can share a UHID. Enforced by database constraint `UNIQUE (hospital_id, uhid)`.
    - **Searchable:** A unique index on `(hospital_id, uhid)` guarantees high-performance lookups when receptionists or clinicians search for patients by their identifier.
  - **Generation Strategy & Concurrency Handling:**
    - To prevent race conditions during concurrent patient registration, the generation logic will lock the counter generator or perform a database sequence query for the `(hospital_id, YYYY)` partition.
    - Alternatively, an atomic Postgres sequence or transaction-safe increment lookup will be executed to guarantee gapless and collision-free assignment.
- **Consequence:** Eliminates manual record entry errors, prevents patient duplication across systems, ensures compliance with clinical documentation standards, and provides highly optimized search capabilities.

---

## ADR 018: Unique Constraint on Estimates Event ID
- **Decision:** A strict unique constraint is applied to `estimates.event_id`.
- **Justification:** An estimate is generated directly from and tied to a specific calendar surgery event. By making `event_id` unique in `estimates`, we enforce a strict 1-to-1 relationship. This prevents the generation of duplicate active estimates for the same scheduled surgical slot, guaranteeing data integrity and simplifying invoicing.

---

## ADR 019: Patient UHID and MRD Number Strategy
- **Decision:** The UHID (Unique Hospital ID) serves as the primary patient identifier. In the default configuration, the UHID also functions as the patient's Medical Record Department (MRD) number. If a hospital tenant requires distinct UHID and MRD numbers, the architecture allows adding a separate `mrd_number` column to the `patients` table in a future migration with zero schema breakages.
- **Consequence:** Avoids schema complexity in Phase 1 while keeping options open for complex multi-facility setups.

---

## ADR 020: Architecture Reservation for Patient Documents Module
- **Decision:** The folder structure, router namespaces, and database spec slots reserve hooks for a future `patient_documents` module. This module will store PDF uploads, clinical images, and scan results linked to patients.
- **Consequence:** Ensures developers do not build conflicting document workflows, allowing a clean, unified document engine integration in Phase 2.
