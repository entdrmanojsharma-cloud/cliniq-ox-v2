<!-- 
  Purpose: Define RESTful contract specifications for Document generation engine and Audit logs.
  Responsibility: Enforce PDF rendering actions and actions auditing retrieval APIs.
-->
# API Specs: Documents Engine & Audit Logs

This document details the API contracts for the PDF Documents Generator and Audit Logs viewer under `/api/v1`.

---

## 1. Documents Engine Module

### 1.1 Generate PDF Document
* **Endpoint:** `/documents/generate`
* **HTTP Method:** `POST`
* **Permission Requirements:** Receptionist, Doctor, Admin.
* **Validation Rules:**
  * `documentType` (String, Required, enum: `ESTIMATE`, `INVOICE`, `RECEIPT`, `CONSENT_FORM`, `DISCHARGE_SUMMARY`)
  * `targetId` (UUID, Required, ID of the related transaction record e.g. estimate ID)
* **Error Codes:**
  * `ERR_TARGET_NOT_FOUND` (404)
  * `ERR_PDF_RENDER_FAILED` (500)
* **Example Request:**
  ```json
  {
    "documentType": "ESTIMATE",
    "targetId": "e98bb9d1-d7fa-4cc9-90db-30abcf092301"
  }
  ```
* **Example Response (200 OK - PDF Stream or Link):**
  ```json
  {
    "success": true,
    "data": {
      "downloadUrl": "https://storage.cliniqox.com/documents/2026/EST-2026-00001.pdf",
      "generatedAt": "2026-06-06T14:35:00Z"
    }
  }
  ```

---

## 2. Audit Logs Module

### 2.1 Fetch Audit Trails
* **Endpoint:** `/audit-logs`
* **HTTP Method:** `GET`
* **Permission Requirements:** Admin only.
* **Validation Rules:**
  * Tenant header `X-Hospital-ID` required.
  * Supports standard pagination (`page`, `limit`).
  * Supports filtering query parameters: `targetTable` (String), `userId` (UUID).
* **Example Request:**
  `GET /api/v1/audit-logs?targetTable=estimates&page=1&limit=5`
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "a123b321-fec8-49db-80de-cdabcfef098a",
        "userNameSnapshot": "Sarah Conner",
        "userRoleSnapshot": "DOCTOR",
        "action": "APPROVE_ESTIMATE",
        "targetTable": "estimates",
        "targetId": "e98bb9d1-d7fa-4cc9-90db-30abcf092301",
        "payload": {
          "previousStatus": "DRAFT",
          "newStatus": "APPROVED"
        },
        "createdAt": "2026-06-06T14:30:00Z"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 5,
      "totalPages": 1
    }
  }
  ```
