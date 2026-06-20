<!-- 
  Purpose: Document the Project Handover Pack for Cliniq-OX.
  Responsibility: Provide a comprehensive transfer guide covering architectural decisions, schemas, structures, and next development steps.
-->
# Cliniq-OX: Project Handover Pack

This document serves as the official project handover pack for the Cliniq-OX system, summarizing all progress, architectural decisions, specifications, structures, and execution milestones.

---

## 1. System Overview & Status

* **Project Goal:** Cliniq-OX is a mobile-first PWA for surgery scheduling, clinician activity planning, and patient cost estimations.
* **Current Version:** `0.1.7-alpha` (Foundation Infrastructure & Authentication Completed).
* **Next Step:** Domain business modules implementation (estimates, scheduling, directories, and patients).

---

## 2. Key Architecture Decisions (ADR) Reference
Refer to [architecture-decisions.md](file:///Users/Shared/Mobile%20app%20cliniq-OX/docs/architecture-decisions.md) for full records:
* **ADR 013 (Estimate State Lock):** Estimates in `APPROVED` or `LOCKED` states block mutations; edits copy the snapshot to `estimate_versions` and start a new `DRAFT`.
* **ADR 015 (Immutable Estimates):** Assigned sequential estimate numbers (`EST-YYYY-XXXXX`) are strictly immutable.
* **ADR 017 (Patient UHID Strategy):** Patient IDs are auto-generated, immutable, unique per hospital, and searchable in format `HOSPITALCODE-YYYY-000001` (e.g., `CLKOX-2026-000001`).
* **ADR 018 (Estimate Event ID):** Enforces a unique constraint on `estimates.event_id` ensuring a strict 1-to-1 relationship between calendar surgery slots and estimates.
* **ADR 019 (UHID & MRD):** UHID serves as the default MRD department identifier; the architecture supports adding distinct MRD fields in the future.
* **ADR 020 (Patient Documents):** Reserved namespace and paths for future document attachment features.

---

## 3. Database Schema Specifications
Refer to [database-schema.md](file:///Users/Shared/Mobile%20app%20cliniq-OX/docs/database-schema.md) and modular schemas under `docs/database/`:
* **Total Tables:** 17 tables mapped using Prisma models under [schema.prisma](file:///Users/Shared/Mobile%20app%20cliniq-OX/backend/database/schema.prisma).
* **Multi-Hospital Tenancy:** Enforced via `hospital_id UUID NOT NULL` column on all partition tables.
* **Soft-Delete Coverage:** Tracks `is_active`, `deleted_at`, and `deleted_by` across transactions and catalog masters.
* **Migrations Order:**
  1. `001_init_enums_and_core_tables` -> Enums, hospital settings, and user logins.
  2. `002_init_scheduling_and_charges` -> Ward configurations, base charges, and the calendar scheduler.
  3. `003_init_estimating_and_templates` -> Cost calculations, versions log, and template catalogs.
  4. `004_init_audits_and_indexes` -> Action logs.
* **Valuation & Seed:** Validated via Prisma CLI (`valid 🚀`). Bootstrap seeding defined in [seed.js](file:///Users/Shared/Mobile%20app%20cliniq-OX/backend/database/seed.js).

---

## 4. REST API Contracts Specs
Refer to [api-spec.md](file:///Users/Shared/Mobile%20app%20cliniq-OX/docs/api-spec.md) and modular contracts under `docs/api/`:
* **Tenancy Header:** `X-Hospital-ID` header required on all requests.
* **RBAC:** Authorized roles: `RECEPTIONIST`, `DOCTOR`, `ADMIN`.
* **Standard Queries:** Pagination (`page`, `limit`), Sorting (`sortBy`, `sortOrder`), and error json envelope standard.

---

## 5. Backend Module Structure (DI Ready)
* **Modules Path:** `backend/modules/`
* **Generated Skeletons (17 modules):** `auth`, `users`, `doctors`, `patients`, `calendar`, `surgeries`, `ot-rooms`, `rooms`, `hospital-charges`, `pending-master-charges`, `estimates`, `estimate-templates`, `documents`, `audits`, `hospital-profile`, `reports`, `notifications`.
* **File Responsibilities:**
  * `routes.js`: Express endpoints mapping.
  * `validator.js`: Express payload schema checkers.
  * `controller.js`: HTTP lifecycle handlers.
  * `service.js`: Domain business logic workflows.
  * `repository.js`: Database queries (Prisma Client bindings).
* **Dependency Flow:**
  `express.Router -> controller.js (injects service) -> service.js (injects repository) -> repository.js (injects PrismaClient)`.

---

## 6. Next Steps & Development Roadmap

1. **Foundation Infrastructure (Completed):**
   - Authentication Module (Signup & Login with password hash comparisons).
   - JWT validation middleware (`auth.js`), role-based checks (`rbac.js`), and tenant header verification (`tenancy.js`).
   - Console logging (`logger.js`), Zod payload validation (`validate.js`), and central error handling (`errorHandler.js`).
2. **Business Modules Generation (Phase 1 & 2 Completed):**
   - **Hospital Profile Module:** Integrated full configuration (metadata settings like prefixing, FY boundaries, GST defaults, and isolation mechanics).
   - **Patients Module:** Integrated patient directory management, soft-delete safety controls, and custom auto-incrementing UHID generation per hospital code (`HOSPITALCODE-YYYY-000001`).
   - **Doctors Module:** Integrated doctor credential mappings, profile directories, specialty sorting, and own-profile update RBAC safety checks.
   - **Surgery, OT Rooms, & Rooms Masters:** Implemented full directory management, soft-deletes, pagination/sorting, and change audibility logs.
   - **Hospital Charges & Pending Charges Modules:** Formulated charge proposal workflows for non-admin staff with strict Admin-only transactional approval/promotion mechanisms.
   - **Calendar Events Module:** Fully implemented appointment scheduling workflows (`PENDING` -> `APPROVED` -> `COMPLETED`/`CANCELLED`), including an on-demand RFC5545 recurrence conflict checking engine preventing doctor and room scheduling overlaps.
   - All modules implement complete repository, service, controller, validator, and routes layers, ensuring audit logs and multi-hospital isolation.
3. **Deploy Schema:** Configure a local PostgreSQL container, apply the 4 migration scripts, and run the Prisma seed task: `node backend/database/seed.js`.
4. **Flesh out Domain Modules:** Implement Prisma database actions in `repository.js` and business rules validation inside `service.js` for remaining modules (Estimates, etc.).
5. **Write Backend Tests:** Write Jest unit tests targeting services using mock repositories.
6. **Frontend Integration:** Setup Vite/React frontend and connect Zustand stores to API clients.


