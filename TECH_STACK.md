<!-- 
  Purpose: Document the technology stack selections, design rationales, 
  and dependency structures for the Cliniq-OX application.
-->
# Cliniq-OX: Technology Stack Specification

This document details the selected technologies for the Cliniq-OX platform and explains the architectural rationale behind each choice.

---

## 1. Core Architecture Pattern

We split the codebase into two independent, clean directory structures:
- **Mobile Client:** Feature-Based Frontend (React Native + Expo)
- **API Server:** Module-Based Backend (Node.js + Express + PostgreSQL)

---

## 2. Frontend Technology Stack

### 2.1 Core Framework: React Native with Expo
- **Rationale:** React Native allows compiling to native iOS and Android packages from a single TypeScript codebase. Expo provides standard build flows (EAS), simplified upgrade cycles, and native module bindings without manual configuration.
- **Architectural Fit:** Supports a modular, feature-based directory where components, hooks, and services reside in self-contained feature folders (e.g., `auth/`, `appointments/`).

### 2.2 Global State: Zustand
- **Rationale:** Zustand is lightweight, has almost zero boilerplate, and uses hooks for simple state access. This prevents the performance overhead and file clutter associated with Redux, keeping files under the 300-line limit.

### 2.3 Navigation: React Navigation (Native Stack & Bottom Tabs)
- **Rationale:** Standard, highly optimized navigation library for React Native that integrates smoothly with native screen gestures and transitions.

---

## 3. Backend Technology Stack

### 3.1 Platform: Node.js with TypeScript & Express
- **Rationale:** Express is a fast, unopinionated minimalist framework. Express combined with TypeScript provides compile-time safety and self-documenting routing, making it highly readable for new developers.
- **Architectural Fit:** Express routers maps perfectly to a module-based structure where each directory mounts its own Router module (e.g. `app.use('/api/v1/appointments', appointmentsRouter)`).

### 3.2 Database: PostgreSQL
- **Rationale:** HIPAA-ready clinic management requires relational data consistency, transactional integrity, and strong ACID properties for appointments, schedules, and billing. PostgreSQL provides top-tier performance, support for relational schema validation, and JSONB fields for dynamic data (e.g., prescriptions, availability matrix).

### 3.3 ORM: Prisma
- **Rationale:** Prisma offers auto-generated type-safe queries directly matching the PostgreSQL schema. This prevents manual SQL errors and eliminates the boilerplate of query building, ensuring services remain simple and under 300 lines.

---

## 4. Third-Party Integrations

### 4.1 Payment Processor: Stripe SDK
- **Rationale:** Standard, PCI-DSS compliant payment processing. Stripe handles credit/debit card tokens without the server ever interacting with raw card data (critical for security compliance).

### 4.2 Telehealth Video: WebRTC / Twilio Video API
- **Rationale:** Low-latency peer-to-peer audio/video streaming. WebRTC provides secure encryption of media streams, matching health data compliance regulations.
