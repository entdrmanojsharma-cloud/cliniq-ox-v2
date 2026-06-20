<!-- 
  Purpose: Define RESTful contract specifications for Scheduler and Master Data directories.
  Responsibility: Enforce slot reservations, overlap validations, and master catalogue configurations APIs.
-->
# API Specs: Scheduling & Master Directories

This document details the API contracts for Calendar scheduling and directories under `/api/v1`.

---

## 1. Calendar Events Module

### 1.1 List / Query Events
* **Endpoint:** `/calendar-events`
* **HTTP Method:** `GET`
* **Permission Requirements:** Authenticated
* **Validation Rules:** Tenant header `X-Hospital-ID` required. Filter parameters: `start` and `end` (ISO-8601 Timestamps, Required).
* **Example Request:**
  `GET /api/v1/calendar-events?start=2026-06-08T00:00:00Z&end=2026-06-09T00:00:00Z`
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c98b89d9-2ef4-4321-ab9e-80decd023401",
        "title": "Appendectomy - John Doe",
        "eventType": "SURGERY",
        "eventStatus": "APPROVED",
        "startTime": "2026-06-08T10:00:00Z",
        "endTime": "2026-06-08T11:00:00Z",
        "doctorId": "f51950d9-7e3e-4cc5-bd18-80de61f173b9"
      }
    ]
  }
  ```

### 1.2 Create Calendar Event
* **Endpoint:** `/calendar-events`
* **HTTP Method:** `POST`
* **Permission Requirements:** Receptionist, Doctor, Admin.
* **Validation Rules:**
  * `title` (String, Required)
  * `eventType` (String, Required, enum: `SURGERY`, `OPD`, `IPD`, `MEETING`, etc.)
  * `startTime` (Timestamp, Required)
  * `endTime` (Timestamp, Required, must be > `startTime`)
  * `doctorId` (UUID, Optional)
  * `otRoomId` (UUID, Optional)
  * `patientId` (UUID, Optional)
* **Conflict Rules:** Overlap checks are triggered on `(doctorId, startTime, endTime)` and `(otRoomId, startTime, endTime)`.
* **Error Codes:**
  * `ERR_SCHEDULE_COLLISION` (409) - Overlap collision
  * `ERR_VALIDATION_FAILED` (400)
* **Example Request:**
  ```json
  {
    "title": "Appendectomy - John Doe",
    "eventType": "SURGERY",
    "startTime": "2026-06-08T10:00:00Z",
    "endTime": "2026-06-08T11:00:00Z",
    "doctorId": "f51950d9-7e3e-4cc5-bd18-80de61f173b9",
    "otRoomId": "82f8a9e0-3bf4-4f9b-bd5e-30decf6709a1"
  }
  ```
* **Example Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "c98b89d9-2ef4-4321-ab9e-80decd023401",
      "eventStatus": "PENDING"
    }
  }
  ```

---

## 2. Directory Master Catalogs

### 2.1 Surgery Master API
* **`GET /surgeries`**: List surgeries catalog.
* **`POST /surgeries`**: Add surgery. Requires `ADMIN`.
  * *Request:* `{ "surgeryCode": "SURG-APP", "surgeryName": "Appendectomy", "category": "GENERAL", "defaultSurgeonFee": 25000.00 }`
  * *Response (201):* `{ "success": true, "data": { "id": "uuid" } }`

### 2.2 OT Rooms Master API
* **`GET /ot-rooms`**: List OT theatres.
* **`POST /ot-rooms`**: Create OT room. Requires `ADMIN`.
  * *Request:* `{ "roomName": "OT Room A", "defaultHourlyCharge": 3500.00 }`

### 2.3 Rooms Master API
* **`GET /rooms`**: List ward rooms.
* **`POST /rooms`**: Add ward room. Requires `ADMIN`.
  * *Request:* `{ "roomName": "Semi-Private 201", "roomType": "SEMI_PRIVATE", "defaultDailyCharge": 3000.00 }`

### 2.4 Hospital Charges Master API
* **`GET /hospital-charges`**: List charges catalog.
* **`POST /hospital-charges`**: Create base charge rates. Requires `ADMIN`.
  * *Request:* `{ "chargeName": "OT Nursing Care", "chargeCategory": "OT_STAFF", "defaultRate": 800.00, "unitType": "PER_HOUR" }`

---

## 3. Pending Master Charges Module

### 3.1 Submit Pending Custom Charge
* **Endpoint:** `/pending-charges`
* **HTTP Method:** `POST`
* **Permission Requirements:** Doctor, Receptionist, Admin.
* **Validation Rules:**
  * `chargeName` (String, Required)
  * `chargeCategory` (String, Required)
  * `defaultRate` (Decimal, Required)
  * `unitType` (String, Required, enum: `FIXED`, `PER_HOUR`, `PER_DAY`)
* **Example Request:**
  ```json
  {
    "chargeName": "Special Laser Charge",
    "chargeCategory": "EQUIPMENT",
    "defaultRate": 5000.00,
    "unitType": "FIXED"
  }
  ```
* **Example Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e30b32d2-8fc4-4786-90de-30abcfef09aa",
      "status": "PENDING"
    }
  }
  ```

### 3.2 Review Custom Charge (Approval/Rejection)
* **Endpoint:** `/pending-charges/:id/review`
* **HTTP Method:** `PATCH`
* **Permission Requirements:** Admin only.
* **Validation Rules:**
  * `status` (String, Required, enum: `APPROVED`, `REJECTED`)
* **Example Request:**
  ```json
  { "status": "APPROVED" }
  ```
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e30b32d2-8fc4-4786-90de-30abcfef09aa",
      "status": "APPROVED"
    }
  }
  ```
