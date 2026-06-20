<!-- 
  Purpose: Document global API standards and provide index references to modular API contract specs.
  Responsibility: Enforce tenancy headers, JWT formatting, pagination/filtering parameters, and error schema.
-->
# Cliniq-OX: API Contract Specifications

This document defines the global API standards and indexes the modular REST contract specifications for the 17 system modules.

---

## 1. Global API Standards

### 1.1 Base URL & Versioning
All endpoints are versioned and prefixed: `https://api.cliniqox.com/api/v1`

### 1.2 Authentication & Authorization
* **JWT Authentication:** All protected endpoints require a Bearer token in the `Authorization` header: `Authorization: Bearer <token>`.
* **Token Claims:** The JWT payload contains `userId`, `role`, and `hospitalId`.
* **Role-Based Access Control (RBAC):** Permissions are validated against user roles: `RECEPTIONIST`, `DOCTOR`, or `ADMIN`.

### 1.3 Multi-Hospital Tenancy Isolation
* **Header Enforced:** Every request must include the `X-Hospital-ID` header (UUID) matching the tenant scope.
* **Backend Isolation:** The API gateway and middleware validate that the `X-Hospital-ID` header matches the `hospitalId` stored in the JWT payload.

### 1.4 Request/Response Encoding
* Content-Type: `application/json`

### 1.5 Pagination, Filtering, and Sorting
For listing (GET) endpoints:
* **Pagination:** Query parameters `page` (default `1`) and `limit` (default `10`, max `100`).
  * Response envelope includes: `{ "data": [...], "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 } }`
* **Filtering:** Handled via exact query parameters (e.g. `is_active=true` or `gender=MALE`).
* **Sorting:** Handled via `sortBy` (field name) and `sortOrder` (`asc` or `desc`).

---

## 2. Global Error Response Standards
Every non-2xx response returns a standardized JSON structure:
* **Payload Format:**
  ```json
  {
    "success": false,
    "error": {
      "code": "ERR_VALIDATION_FAILED",
      "message": "The request payload failed validation checks.",
      "details": [
        { "field": "email", "issue": "Must be a valid email address." }
      ]
    }
  }
  ```

---

## 3. Modular API Contracts Index

The REST contracts are split into modular specifications to maintain cleanliness and strictly enforce the file-size limit:

1. **[Authentication, Users & Hospital Profile API](file:///Users/Shared/Mobile%20app%20cliniq-OX/docs/api/auth-users.md)**
2. **[Identity & Directories (Doctors/Patients) API](file:///Users/Shared/Mobile%20app%20cliniq-OX/docs/api/identity-directories.md)**
3. **[Scheduling & Master Configurations API](file:///Users/Shared/Mobile%20app%20cliniq-OX/docs/api/scheduling-masters.md)**
4. **[Estimates & Pricing Workflows API](file:///Users/Shared/Mobile%20app%20cliniq-OX/docs/api/estimating-workflow.md)**
5. **[Documents Engine & Audit Logs API](file:///Users/Shared/Mobile%20app%20cliniq-OX/docs/api/system-utilities.md)**
