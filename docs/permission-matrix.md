<!-- 
  Purpose: Define the role-based permission matrix (View, Create, Edit, Delete, 
  Approve, Export) for Receptionist, Doctor, and Administrator roles.
-->
# Cliniq-OX: Role Permission Matrix

This document defines user access rights across all modules for the three core roles: **Receptionist (R)**, **Doctor (D)**, and **Administrator (A)**.

---

## 1. Access Matrix Key
- **[x]**: Allowed
- **[ ]**: Denied
- **[Soft]**: Permitted via soft-delete parameters only (never hard delete).
- **[Own]**: Permitted for own records/assigned patients only.

---

## 2. Permissions Table

| Module | Action | Receptionist / Nurse | Surgeon / Doctor | Administrator |
| :--- | :--- | :---: | :---: | :---: |
| **Patient Profile** | View | [x] | [x] [Own] | [x] |
| | Create | [x] | [ ] | [x] |
| | Edit | [x] | [ ] | [x] |
| | Delete | [ ] | [ ] | [Soft] |
| | Export | [ ] | [ ] | [x] |
| **Surgery Scheduling**| View | [x] | [x] | [x] |
| | Create | [x] | [ ] | [x] |
| | Edit | [x] | [x] [Own] | [x] |
| | Delete | [ ] | [ ] | [Soft] |
| | Approve | [ ] | [x] | [x] |
| **Routine Scheduling**| View | [x] | [x] | [x] |
| | Create | [x] | [x] | [x] |
| | Edit | [x] | [x] [Own] | [x] |
| | Delete | [ ] | [Soft] [Own] | [Soft] |
| **Surgery Master** | View | [x] | [x] | [x] |
| | Create | [ ] | [x] `SURGERY_MASTER_MANAGER` | [x] |
| | Edit | [ ] | [x] `SURGERY_MASTER_MANAGER` | [x] |
| | Delete | [ ] | [ ] | [Soft] |
| **Estimates** | View | [x] | [x] [Own] | [x] |
| | Create / Edit | [x] | [x] [Own] | [x] |
| | Delete | [ ] | [ ] | [Soft] |
| | Export (PDF) | [x] | [x] | [x] |
| **Pending Charges** | View | [x] | [x] | [x] |
| | Create | [x] | [x] | [x] |
| | Approve | [ ] | [ ] | [x] |
| **Audit Logs** | View | [ ] | [ ] | [x] |
| **Hospital settings** | Edit | [ ] | [ ] | [x] |
