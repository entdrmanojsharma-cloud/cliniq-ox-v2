<!-- 
  Purpose: Define the functional specification, database schema impact, 
  API endpoints, screen flows, and test plans for the Billing Module.
-->
# Feature Spec: Billing Module

This document details the specifications for clinic invoices, payment collection, and insurance claim ledgers.

---

## 1. Functional Specification
- **Invoice Generation:** Automatic creation of invoices after doctors complete a consultation.
- **Card Payment:** Secure integration with Stripe Elements for collecting credit card payments.
- **Invoice Directory:** Patients can view, pay, and download their active/historical invoices.

---

## 2. Database Impact
Affects the `payments` table:
- **Columns utilized:** `payments.amount`, `payments.currency`, `payments.status`, `payments.stripe_payment_intent_id`.
- **Indexes used:** `CREATE INDEX idx_payments_appointment ON payments(appointment_id);`

---

## 3. API Impact
- **`POST /api/v1/billing/invoices`**: Generate a new invoice (Admin/System initiated).
- **`GET /api/v1/billing/invoices`**: Retrieve invoices by filters (e.g. status, patient ID).
- **`POST /api/v1/billing/invoices/:id/pay`**: Submit card tokens and process payments.

---

## 4. UI Flow
- Login Screen
- → Dashboard
- → Billing Screen (lists paid and unpaid invoices)
- → Invoice Details Screen (displays invoice breakdown and Stripe payment sheet)

---

## 5. Test Plan

### 5.1 Automated Tests
- Test that an invoice amount cannot be negative.
- Verify that Stripe webhook updates the database status to `COMPLETED` when card payment succeeds.

### 5.2 Manual Verification
- Select an unpaid invoice, click **Pay Now**, input test card credentials.
- Confirm that the invoice status toggles from `PENDING` to `PAID` instantly and an receipt is sent.
