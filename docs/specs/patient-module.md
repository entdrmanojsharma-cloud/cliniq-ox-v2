<!-- 
  Purpose: Define the functional specification, database schema impact, 
  API endpoints, screen flows, and test plans for the Patients Module.
-->
# Feature Spec: Patients Module

This document details the specifications for patient registration, directory lookups, and profile management.

---

## 1. Functional Specification
- **Patient Registration:** Ability for admins to onboard patients or for patients to sign up, providing names, date of birth, gender, and insurance details.
- **Search & Filter:** Clinicians and admins can search the patient directory by name, date of birth, or insurance numbers.
- **Patient Detail Viewer:** View clinical records, contact profiles, and emergency contact details.

---

## 2. Database Impact
Affects the `patients` and `users` tables:
- **Columns utilized:** `patients.first_name`, `patients.last_name`, `patients.date_of_birth`, `patients.insurance_provider`, `patients.insurance_number`.
- **Indexes used:** `CREATE INDEX idx_patients_name ON patients(last_name, first_name);`

---

## 3. API Impact
- **`POST /api/v1/patients`**: Create a patient profile.
- **`GET /api/v1/patients`**: Retrieve and search patient records.
- **`GET /api/v1/patients/:id`**: Fetch specific patient profile.
- **`PUT /api/v1/patients/:id`**: Update patient profile details.

---

## 4. UI Flow
- Login Screen
- → Dashboard
- → Patient List Screen (contains search input and table of patients)
- → Patient Details Screen (displays general profile, history logs, and options to edit)

---

## 5. Test Plan

### 5.1 Automated Tests
- Test that registering a patient with missing fields returns `400 Bad Request`.
- Test that lookup filters return the correct matched patient profiles.

### 5.2 Manual Verification
- Log in, navigate to **Patient List**, search "Doe", and click on the result.
- Verify patient details display matching values, and click **Edit** to update the phone number. Ensure values persist on reload.
