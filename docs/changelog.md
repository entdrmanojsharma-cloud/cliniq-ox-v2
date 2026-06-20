<!-- 
  Purpose: Document the project changelogs, updates, releases, 
  and specifications versions for Cliniq-OX.
-->
# Cliniq-OX: Project Changelog

This document tracks all version history and updates made to the Cliniq-OX system.

---

## [0.1.11-alpha] - 2026-06-08

### Added
- **Core Functional Integrations:** Pre-filled parameter redirection hooks between Calendar Details (View/Create Estimate), Estimate Details (Generate Billing Invoice), and Invoice Details (Record Deposit, Allocate Advance Balance).
- **Searchable Form Selectors:** Integrated searchable overlays for Patients, Doctors, and OT Rooms on Calendar Event forms.
- **Credit Note Item Selection:** Updated Credit Note creation forms to load invoice line items dynamically rather than requesting manual UUID input.

## [0.1.10-alpha] - 2026-06-08

### Fixed
- **Metro Bundler web crash (White Screen):** Disabled `unstable_enablePackageExports` in `frontend/metro.config.js` to prevent Metro from resolving `import.meta` ESM entrypoints inside third-party `node_modules` (e.g. `zustand` v4) which causes runtime SyntaxErrors in browser environments.
- **Hospital Settings Save Error:** Made the Zod schema in `backend/modules/hospital-profile/validator.js` `.partial()` so that the settings screen is able to save profile configurations without sending all required DB profile fields (like address, email, logoUrl, currency, etc.).
- **User-friendly Schema Validation Alerts:** Enhanced the frontend HTTP API client (`frontend/shared/utils/api.js`) to parse and format the specific field-level validation errors returned by Zod, displaying bullet points indicating which fields failed validation and why, instead of a generic alert.
- **Doctor Profile Creation (On-the-fly user):** Made `userId` optional in the doctor create validator and updated the backend service to automatically generate a matching user account under the hood if it is not supplied by the client.

## [0.1.9-alpha] - 2026-06-06


### Added
- **Centralized Numbering Service:** Created a shared transactional numbering utility for estimates, invoices, receipts, refunds, and credit notes with atomic year-resettable sequences.
- **Billing & Invoices Module:** Completed Invoices, Receipts, Refunds, Payment Allocations, and Advance Balances repositories, services, validators, and routes with double-billing checks.
- **Credit Notes Module:** Support for full/partial credit note reversals against immutableized finalized invoices, audit trailing, and automatic excess payment refunds back to the Advance Balance pool.
- **Item-Level GST schema:** Appended `hsnCode`, `sacCode`, `gstRate`, `gstAmount` optional schema placeholders on Estimate Items, Estimate Surgeries, and Invoice Items.

## [0.1.8-alpha] - 2026-06-06

### Added
- **Document Generations Table:** Established the `document_generations` table to archive generated PDFs and metadata history as the single source of truth, enabling unlimited revisions.

### Modified
- **Prisma Schema:** Dropped `generatedFileName`, `generatedAt`, and `generatedBy` from the `Estimate` model.
- **Estimate Template Modularization:** Refactored the monolithic A4 print template `estimate.js` into 7 modular sub-components under 300 lines limit.

## [0.1.7-alpha] - 2026-06-06

### Added
- **Documents & PDF Engine:** Built the documents module with HTML/CSS templates for Estimates, Invoices, Receipts, and Consent Forms, rendering high-quality A4-compatible print sheets.
- **Item Grouping:** Added `ItemGroup` enum constraint to `EstimateItem` and `EstimateTemplateItem`.
- **Archival Metadata:** Added optional document archival columns `generatedFileName`, `generatedAt`, `generatedBy` to `estimates` table.

## [0.1.6-alpha] - 2026-06-06

### Added
- **Estimates & Templates Implementation:** Coded repositories, services, controllers, and routes with Zod request payload validation, multi-tier percentage/fixed component discount calculations, version snapshot triggers on approved/locked updates, and billing status protection constraints.

## [0.1.5-alpha] - 2026-06-06

### Added
- **Database Table Specifications:** Created modular specs files `identity-master.md`, `scheduling.md`, `estimating.md`, and `audits.md` under `docs/database/` defining the 17 system tables.
- **Relational ER Diagram:** Embedded the complete entity relationships map in `docs/database-schema.md` using Mermaid.
- **Database Partitioning Strategy:** Outlined `hospital_id` multi-hospital isolation strategy.
- **Archival Policies:** Added ADR 014 detailing data retention and annual audit log compactions in `docs/architecture-decisions.md`.
- **Estimate Numbering ADR:** Added ADR 015 outlining immutable estimate numbers.
- **Multi-Surgeon ADR:** Added ADR 016 mapping future assistant surgeon integrations.
- **Patient UHID ADR:** Added and expanded ADR 017 detailing the automatic, immutable, unique, and searchable UHID generation strategy (`HOSPITALCODE-YYYY-000001`). Added `code` column to `hospital_profile` to support it.

### Modified
- **Patient Schema:** Replaced `age` with `date_of_birth` and converted `gender` to a strict ENUM.
- **Schedules Schema:** Appended `event_status` enum, `created_by`, `approved_by`, and `approved_at` to `calendar_events`.
- **Estimates Schema:** Added `approved_by` and `approved_at` fields. Added `item_type` enum to `estimate_template_items`.
- **Project Status Log:** Updated `docs/current-project-status.md` indicating database design completion.
- **REST API Contracts Specs:** Generated global standards in `docs/api-spec.md` and created modular sub-documents (`auth-users.md`, `identity-directories.md`, `scheduling-masters.md`, `estimating-workflow.md`, `system-utilities.md`) covering all 17 system modules.
