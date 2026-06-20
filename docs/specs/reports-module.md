<!-- 
  Purpose: Define the functional specification, database schema impact, 
  API endpoints, screen flows, and test plans for the Reports Module.
-->
# Feature Spec: Reports Module

This document details the specifications for clinic operations data reporting, metrics dashboards, and exports.

---

## 1. Functional Specification
- **Analytics Dashboard:** Graphical widgets for monthly appointment statistics, doctor reviews, and revenue.
- **Financial Reports:** Summarize billing transactions, insurance payouts, and outstanding bills.
- **Data Export:** Export metrics lists into CSV or Excel files.

---

## 2. Database Impact
Read-only queries aggregating datasets:
- **Tables joined:** `payments`, `appointments`, and `patients`.
- **Optimization:** Use query indexes on date ranges (`appointment_date`, `created_at`).

---

## 3. API Impact
- **`GET /api/v1/reports/financial`**: Retrieve aggregated daily/monthly revenues.
- **`GET /api/v1/reports/appointments`**: Retrieve counts of completed vs. cancelled bookings.
- **`GET /api/v1/reports/export`**: Download raw data tables as CSV formats.

---

## 4. UI Flow
- Login Screen
- → Dashboard
- → Reports Panel Screen (select dates, view visual graphs and charts)
- → Export Confirmation Modal

---

## 5. Test Plan

### 5.1 Automated Tests
- Test that querying reports with invalid start/end dates (e.g. end date before start date) returns `400 Bad Request`.
- Verify that aggregated revenues equal the sum of completed payment records.

### 5.2 Manual Verification
- Filter dashboard report from "2026-06-01" to "2026-06-06".
- Export the data list as CSV and open it to verify calculations match local payment registers.
