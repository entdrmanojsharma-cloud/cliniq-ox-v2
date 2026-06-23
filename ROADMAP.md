# 🗒️ CliniqOX — Product Roadmap & Feature Backlog

---

## ✅ Completed

| Feature | Description | Date |
|---|---|---|
| Patient Registration Form | Clean form — First/Last name stacked, Gender dropdown, Mobile in same row | Jun 2026 |
| Dashboard – Total Patients + Add Patient | Slim card split into two halves — Total Patients (left) + ADD PATIENT shortcut (right, red) | Jun 2026 |
| Patient List — Compact Filter Section | Reduced height of filter bar, smaller PMJAY buttons, search input tighter | Jun 2026 |
| Folder Drag & Drop | Patient file folder drag-drop upload | Jun 2026 |
| Estimate Approval — Blank Screen Bug | Fixed: approval no longer causes blank screen (local state retained via WebSocket) | Jun 2026 |
| Click-Outside Dropdown Close | Gender & Consulting Doctor dropdowns now close when clicking outside | Jun 2026 |
| Gender Dropdown (floating) | Replaced toggle buttons with absolute-positioned dropdown (does not push content down) | Jun 2026 |

---

## 🔜 Planned Milestones

---

### 🟡 MILESTONE 1 — DOB & Age Smart Entry
**Priority:** High  
**Status:** Planned (not started)

**Goal:** Allow patient registration using either DOB or manual Age (Years + Months), with auto-calculation when DOB is entered.

**UI Design:**
- `Date of Birth: [DD/MM/YYYY] [✕]`
- `— OR —`
- `Age: Years [___] Months [___] [✕]`
- Default: Months = 0

**Key Rules:**
- DOB entered → Age auto-calculated, becomes read-only
- Manual age entered → DOB field is disabled
- Each side has a clear `[✕]` button to switch modes
- Months: 0–11 only. Years: 0–150.

**Implementation Notes (pre-researched):**
- Requires **DB migration** (dateOfBirth → nullable, add `ageYears Int?`, `ageMonths Int?`)
- New shared component: `DobAgeSmartEntry.js`
- Backend: validator + service update for patients
- Frontend: Patient Registration/Edit form (primary entry point)
- Display: all other screens (Billing, Estimates, Calendar) just read from patient record — no changes needed there
- Open question: for manual age, show note *"Age entered manually"* to flag it may be outdated

**Files to change:**
- `backend/database/schema.prisma` — DB migration
- `backend/modules/patients/validator.js`
- `backend/modules/patients/service.js`
- `frontend/shared/components/DobAgeSmartEntry.js` (NEW)
- `frontend/features/patients/screens.js` (PatientFormScreen)

---

### 🟡 MILESTONE 2 — IPD Admission Module
**Priority:** High  
**Status:** Not started

- IPD Admission form linked to patient
- Bed allocation
- Ward/room assignment
- Admission date + expected discharge
- Daily notes / progress tracking

---

### 🟡 MILESTONE 3 — Patient Folder / Document Management
**Priority:** Medium  
**Status:** In progress

- File upload per patient
- Drag and drop support (web)
- View / Download / Delete documents
- Categorise: Lab Reports, Prescriptions, Consent Forms

---

### 🟡 MILESTONE 4 — OPD Registration Improvements
**Priority:** Medium  
**Status:** Not started

- Quick patient lookup on OPD registration
- Vitals entry (BP, weight, temp, SpO2)
- Chief complaint field
- Link to existing patient UHID

---

### 🟡 MILESTONE 5 — Reports & Analytics
**Priority:** Low  
**Status:** Not started

- Monthly patient count
- Surgery volume trends
- Revenue summary
- PMJAY vs. Others breakdown

---

## 📝 Notes & Decisions Log

| Date | Note |
|---|---|
| Jun 2026 | DOB & Age Smart Entry deferred — requires DB migration approval. Full plan saved here. |
| Jun 2026 | Do not auto-push to GitHub — user approval required before any `git push`. |

