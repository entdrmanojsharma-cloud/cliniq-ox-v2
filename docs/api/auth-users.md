<!-- 
  Purpose: Define RESTful contract specifications for Authentication, Users, and Hospital Profiles.
  Responsibility: Enforce signup, login, profile updates, and tenant configurations contracts.
-->
# API Specs: Authentication, Users & Hospital Profiles

This document details the API contracts for Authentication, Users, and Hospital Profiles modules under `/api/v1`.

---

## 1. Authentication Module

### 1.1 User Registration (Signup)
* **Endpoint:** `/auth/signup`
* **HTTP Method:** `POST`
* **Permission Requirements:** Public
* **Validation Rules:**
  * `hospitalCode` (String, Required, must match a valid `hospital_profile.code`)
  * `email` (String, Required, valid email format)
  * `password` (String, Required, minimum 8 characters)
  * `role` (String, Required, enum: `RECEPTIONIST`, `DOCTOR`, `ADMIN`)
* **Error Codes:**
  * `ERR_HOSPITAL_NOT_FOUND` (404) - Hospital code invalid
  * `ERR_EMAIL_TAKEN` (409) - Email already registered
  * `ERR_VALIDATION_FAILED` (400)
* **Example Request:**
  ```json
  {
    "hospitalCode": "CLKOX",
    "email": "admin@cliniqox.com",
    "password": "SecurePassword123",
    "role": "ADMIN"
  }
  ```
* **Example Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e0099db1-d703-4952-b883-718c50543e09",
      "email": "admin@cliniqox.com",
      "role": "ADMIN"
    }
  }
  ```

### 1.2 User Login
* **Endpoint:** `/auth/login`
* **HTTP Method:** `POST`
* **Permission Requirements:** Public
* **Validation Rules:**
  * `hospitalCode` (String, Required)
  * `email` (String, Required, valid email format)
  * `password` (String, Required)
* **Error Codes:**
  * `ERR_INVALID_CREDENTIALS` (401)
  * `ERR_INACTIVE_USER` (403)
* **Example Request:**
  ```json
  {
    "hospitalCode": "CLKOX",
    "email": "admin@cliniqox.com",
    "password": "SecurePassword123"
  }
  ```
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjMT... ",
      "role": "ADMIN",
      "hospitalId": "d38bb394-bb9e-4c1b-9fca-e0adcd023401"
    }
  }
  ```

---

## 2. Users Module

### 2.1 List Users
* **Endpoint:** `/users`
* **HTTP Method:** `GET`
* **Permission Requirements:** Authenticated, Admin only.
* **Validation Rules:** Tenant header `X-Hospital-ID` required. Support optional query parameters `is_active` (Boolean).
* **Example Request Headers:**
  `Authorization: Bearer <token>`, `X-Hospital-ID: d38bb394-bb9e-4c1b-9fca-e0adcd023401`
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "e0099db1-d703-4952-b883-718c50543e09",
        "email": "admin@cliniqox.com",
        "role": "ADMIN",
        "isActive": true
      }
    ]
  }
  ```

### 2.2 Toggle User Status
* **Endpoint:** `/users/:id/status`
* **HTTP Method:** `PATCH`
* **Permission Requirements:** Admin only.
* **Validation Rules:** `isActive` (Boolean, Required)
* **Error Codes:** `ERR_USER_NOT_FOUND` (404)
* **Example Request:**
  ```json
  { "isActive": false }
  ```
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e0099db1-d703-4952-b883-718c50543e09",
      "isActive": false
    }
  }
  ```

---

## 3. Hospital Profile Module

### 3.1 Get Hospital Settings
* **Endpoint:** `/hospital-profile`
* **HTTP Method:** `GET`
* **Permission Requirements:** Authenticated (any role)
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "d38bb394-bb9e-4c1b-9fca-e0adcd023401",
      "code": "CLKOX",
      "name": "Cliniq-OX Hospital",
      "address": "100 Medical Plaza, City Centre",
      "currency": "INR",
      "defaultGstRate": 18.00,
      "estimatePrefix": "EST",
      "invoicePrefix": "INV",
      "receiptPrefix": "REC",
      "financialYearStart": "04-01"
    }
  }
  ```

### 3.2 Update Hospital Settings
* **Endpoint:** `/hospital-profile`
* **HTTP Method:** `PUT`
* **Permission Requirements:** Admin only.
* **Validation Rules:**
  * `name` (String, Required)
  * `address` (String, Required)
  * `currency` (String, Required)
  * `defaultGstRate` (Decimal, Required)
* **Example Request:**
  ```json
  {
    "name": "Cliniq-OX Specialty Center",
    "address": "100 Medical Plaza, Tower A",
    "currency": "INR",
    "defaultGstRate": 18.00,
    "estimatePrefix": "CLK-EST",
    "invoicePrefix": "CLK-INV",
    "receiptPrefix": "CLK-REC",
    "financialYearStart": "04-01"
  }
  ```
* **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "d38bb394-bb9e-4c1b-9fca-e0adcd023401",
      "name": "Cliniq-OX Specialty Center",
      "address": "100 Medical Plaza, Tower A"
    }
  }
  ```
