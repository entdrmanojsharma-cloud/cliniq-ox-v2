<!-- 
  Purpose: Guide new developers on the system architecture, domain models, 
  and local developer environment setup to ramp up in under 1 hour.
-->
# Cliniq-OX: Developer Onboarding & Quickstart Guide

Welcome to the Cliniq-OX team! This document will guide you through the architecture, system setup, and coding workflows so you can start contributing within your first hour.

---

## 1. Domain & System Map

Cliniq-OX is a clinic scheduling and health record system composed of:
1. **Frontend Mobile App (`client/`):** React Native (Expo) app targeting Patients and Doctors.
2. **Backend API (`server/`):** Node.js/Express service connecting to PostgreSQL.

### Core Data Flow: Booking an Appointment
- Patient searches for a doctor (`GET /doctors`) -> client displays list.
- Patient requests slot (`POST /appointments`) -> server validates slot availability.
- Server creates Stripe Payment Intent -> client launches Stripe Payment Sheet.
- Payment completes -> Stripe webhook updates database (`CONFIRMED`).
- Doctor accepts -> updates status -> telehealth WebRTC room signal becomes active.

---

## 2. Directory & Coding Standards

We follow strict design guidelines:
- **Max File Length:** 300 lines. Refactor immediately if a file exceeds this.
- **Header Comments:** Every code file starts with a short XML-style block describing its purpose.
- **Architectural decoupling:** UI component file contains UI only; business logic resides in custom hooks; state changes are handled by store.

---

## 3. Local Environment Setup

### Prerequisites
- Node.js (v18 or v20 LTS)
- PostgreSQL (v14 or higher) running locally or via Docker
- Expo Go app on your phone (for mobile preview) or Android/iOS Simulator

### Step-by-Step Quickstart

#### 1. Clone & Install Dependencies
```bash
git clone <repository-url> cliniq-ox
cd cliniq-ox
npm install --prefix client
npm install --prefix server
```

#### 2. Configure Environment Files
Create a `.env` file in `server/`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cliniq_ox?schema=public"
JWT_ACCESS_SECRET="your-super-secret-access-token-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key"
STRIPE_SECRET_KEY="sk_test_..."
```

#### 3. Database Initialization
```bash
cd server
npx prisma db push # push schema models to database
npx prisma db seed # populate specialties and test admin accounts
```

#### 4. Run Development Servers
- **Start Backend:** `npm run dev` in `server/` (runs on `http://localhost:3000`).
- **Start Frontend:** `npm run start` in `client/` (opens Expo developer portal).

---

## 4. How to Implement a New Feature
1. Create a design specification document under `docs/features/<feature-name>.md` and obtain approval.
2. Build database migrations and repositories first.
3. Build Express controller/service modules.
4. Create frontend screens inside `client/src/features/<feature-name>/screens/`.
5. Integrate screens into navigation and test.
