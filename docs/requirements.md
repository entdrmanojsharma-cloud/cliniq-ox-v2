<!-- 
  Purpose: Define requirements, workflows, user roles, permissions, 
  and feature descriptions for the Surgery Scheduling and Estimates System.
-->
# Cliniq-OX: System Requirements Document

This document outlines the core business requirements, workflows, user roles, permissions, and feature descriptions.

---

## 1. User Roles & Decoupled Doctor Profiles
Refer to [permission-matrix.md](file:///Users/Shared/Mobile%20app%20cliniq-OX/docs/permission-matrix.md) for detailed role permissions.
- **Surgeon / Doctor:** Decoupled profile. Supports future extensions for **Multiple Surgeons** per scheduling event.
- **Administrator:** Manages directories (Surgeries, Rooms, OT Rooms), approvals, audits.

---

## 2. Core Architectural Requirements

### 2.1 Patients Profile Configuration
- **Date of Birth:** Managed via `date_of_birth` (DATE). Age is treated as derived data calculated on the client-side.
- **Gender:** Configured via ENUM ('MALE', 'FEMALE', 'OTHER').
- **UHID & MRD Strategy:** Unique Patient ID formatted as `HOSPITALCODE-YYYY-000001` (e.g., `CLKOX-2026-000001`). It is auto-generated, immutable, unique per hospital, and searchable. In Phase 1, the UHID acts as the default Medical Record Department (MRD) identifier. Future MRD extensions can add a separate `mrd_number` if needed (refer to ADR 019).

### 2.2 Calendar Event Status & Approvals
- **Event Status:** Managed via ENUM ('PENDING', 'APPROVED', 'CANCELLED', 'COMPLETED').
- **Audit Trails:** Tracks `created_by`, `approved_by`, and `approved_at` on scheduling events.
- **Time/Audit Fields:** All tables include `created_at` and `updated_at` timestamps.

### 2.3 Estimate & Pricing Module
- **1-to-1 Association:** Enforces a strict unique constraint on `estimates.event_id` to prevent duplicate active estimates for a single calendar surgery (refer to ADR 018).
- **Approved Sign-off:** Tracks `approved_by` and `approved_at` on estimates.
- **Estimate State Lock:** Approved/Locked estimates are read-only. Modifications generate a new Version record.
- **Immutable Estimates Numbering:** Generated using format `EST-YYYY-XXXXX` (immutable, sequential, non-modifiable).
- **Billing Integration Reservation:** Reserves a `billing_status` field (e.g. `UNBILLED`, `PARTIALLY_BILLED`, `BILLED`) on estimates for future billing service hookups.

### 2.4 Document & Upload Reservations
- Central HTML-to-PDF rendering service support (Estimates, Invoices, Receipts).
- Reserves hooks for a future **patient_documents** module to link PDF uploads, consent forms, and image uploads to patient profile records (refer to ADR 020).
