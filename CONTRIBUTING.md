<!-- 
  Purpose: Document the contribution standards, AI coding guidelines, 
  and feature workflow parameters for the Cliniq-OX project.
-->
# Cliniq-OX: Contribution & Development Standards

Welcome to the Cliniq-OX codebase. To ensure long-term maintainability, all contributions must follow the architectural patterns, developer guidelines, and coding practices outlined below.

---

## 1. Core Coding Standards

- **Understandability:** All code must be clear and structured so a new developer can understand it within 1 hour.
- **File Length Cap:** No file may exceed 300 lines. Keep files under 200 lines whenever possible.
- **One Component/Service Per File:** Limit each file to a single component or a single service with one clear responsibility.
- **Header Comments:** Every file must contain a header comment describing its purpose and responsibility.
- **Separation of Concerns:** Maintain decoupling between UI, business logic, API wrappers, and database repositories.
- **Data Flow Pipeline:** Backend requests must follow: `Routes → Controllers → Services → Database`. Direct DB queries from routers are prohibited.
- **Production Safety:** Preserve the existing architecture, modify the minimum number of files, prefer updates over new code generation, and never modify project folders unless requested.

---

## 2. AI Development Rules
We enforce 25 strict AI code generation rules. All automated and manual refactoring must conform to the instructions defined in [ai-development-rules.md](file:///Users/Shared/Mobile%20app%20cliniq-OX/docs/ai-development-rules.md).

---

## 3. Workflow for Every New Feature

Before implementing any feature, developers (and AI agents) must strictly execute these 8 steps in order:

1. **Step 1:** Create or update the feature specification document under `docs/specs/`.
2. **Step 2:** Update `docs/requirements.md` if the business requirements change.
3. **Step 3:** Update `docs/database-schema.md` if data fields or indexes change.
4. **Step 4:** Update `docs/api-spec.md` if endpoint contracts change.
5. **Step 5:** List all affected file paths.
6. **Step 6:** Generate a feature implementation plan.
7. **Step 7:** Generate the codebase changes in small, reviewable chunks.
8. **Step 8:** Update `docs/changelog.md` tracking the version changes.

No feature implementation is allowed to skip documentation or generate code in large monolithic blocks.
