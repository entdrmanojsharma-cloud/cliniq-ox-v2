<!-- 
  Purpose: Define RESTful contract specifications for Estimates, Versions, and Package Templates.
  Responsibility: Enforce estimate calculations, status locks, revisions log, and package configurations APIs.
-->
# API Specs: Estimates & Pricing Workflows

This document details the API contracts for Patient Cost Estimations, Versioning, and Templates under `/api/v1`.

---

## 1. Estimates Module

### 1.1 Create Estimate
* **Endpoint:** `/estimates`
* **HTTP Method:** `POST`
* **Permission Requirements:** Receptionist, Doctor, Admin.
* **Validation Rules:**
  * `eventId` (UUID, Required, unique)
  * `roomId` (UUID, Optional)
  * `expectedDurationMinutes` (Integer, Required)
  * `expectedStayDays` (Integer, Required)
  * `surgeries` (Array of objects containing `surgeryId`, `discountPct`, Required)
  * `items` (Array of objects containing `chargeCategory`, `description`, `quantity`, `rate`, Optional)
* **Example Request:**
  ```json
  {
    "eventId": "c98b89d9-2ef4-4321-ab9e-80decd023401",
    "roomId": "room-uuid-here",
    "expectedDurationMinutes": 90,
    "expectedStayDays": 3,
    "surgeries": [
      { "surgeryId": "surgery-uuid-here", "discountPct": 5.00 }
    ]
  }
  ```
* **Example Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e98bb9d1-d7fa-4cc9-90db-30abcf092301",
      "estimateNumber": "EST-2026-00001",
      "grandTotal": 45000.00,
      "status": "DRAFT"
    }
  }
  ```

### 1.2 Update Estimate
* **Endpoint:** `/estimates/:id`
* **HTTP Method:** `PUT`
* **Permission Requirements:** Receptionist, Doctor, Admin.
* **State Machine Rules:**
  * If estimate status is `APPROVED` or `LOCKED`, direct database mutations are blocked.
  * Modifying an approved/locked estimate automatically creates a new record inside the `estimate_versions` snapshot history, increments the version counter, and returns the modified estimate back in `DRAFT` state.
* **Example Request:**
  ```json
  {
    "expectedStayDays": 5,
    "changeReason": "Extended patient stay requirements suggested by surgeon."
  }
  ```
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e98bb9d1-d7fa-4cc9-90db-30abcf092301",
      "estimateNumber": "EST-2026-00001",
      "grandTotal": 55000.00,
      "status": "DRAFT"
    }
  }
  ```

### 1.3 Transition Estimate Status
* **Endpoint:** `/estimates/:id/status`
* **HTTP Method:** `PATCH`
* **Permission Requirements:** Admin or Doctor for approval; Receptionist/Doctor/Admin for cancellations.
* **Validation Rules:**
  * `status` (String, Required, enum: `DRAFT`, `APPROVED`, `LOCKED`, `CANCELLED`)
* **Example Request:**
  ```json
  {
    "status": "APPROVED"
  }
  ```
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e98bb9d1-d7fa-4cc9-90db-30abcf092301",
      "status": "APPROVED",
      "approvedBy": "e0099db1-d703-4952-b883-718c50543e09",
      "approvedAt": "2026-06-06T14:30:00Z"
    }
  }
  ```

---

## 2. Estimate Versions Module

### 2.1 Get Estimate Version History
* **Endpoint:** `/estimates/:id/versions`
* **HTTP Method:** `GET`
* **Permission Requirements:** Authenticated
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "v123b3d1-8f99-4dce-bcdf-99decfef01ab",
        "versionNumber": 1,
        "previousTotal": 45000.00,
        "newTotal": 55000.00,
        "changeSummary": "Stay days increased from 3 to 5",
        "changeReason": "Extended patient stay requirements suggested by surgeon.",
        "createdAt": "2026-06-06T14:32:00Z"
      }
    ]
  }
  ```

---

## 3. Estimate Templates (Package Catalogs)

### 3.1 List Package Templates
* **Endpoint:** `/estimate-templates`
* **HTTP Method:** `GET`
* **Permission Requirements:** Authenticated
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "t899b8d9-2e11-4bcd-bd5e-30abcfef0111",
        "templateName": "Standard Appendectomy Package",
        "visibility": "GLOBAL"
      }
    ]
  }
  ```
