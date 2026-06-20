<!-- 
  Purpose: Document the project folder tree layout, separating the codebase 
  into frontend (features/shared) and backend (modules) components.
-->
# Cliniq-OX: Project Structure

This document outlines the directory structure for the Cliniq-OX application, enforcing clean separation of concerns.

---

## Recommended Project Structure

```
project-root/
├── docs/                       # Architectural Specifications
│   ├── specs/                  # Feature specs
│   ├── release-notes/          # Release documentation
│   ├── architecture-history/   # Architectural ADR iterations
│   ├── requirements.md
│   ├── database-schema.md
│   ├── api-spec.md
│   ├── project-structure.md
│   ├── ui-flow.md
│   ├── ai-development-rules.md
│   ├── permission-matrix.md
│   └── changelog.md
│
├── frontend/                   # Feature-Based Client Layer
│   ├── features/
│   │   ├── auth/
│   │   ├── patients/
│   │   ├── doctors/            # [NEW] Doctors profile configurations
│   │   ├── calendar/
│   │   ├── surgeries/
│   │   ├── estimates/
│   │   ├── templates/
│   │   ├── settings/
│   │   ├── master-data/        # [NEW] Master imports/exports views
│   │   ├── documents/          # [NEW] PDF/Receipt rendering modules
│   │   └── reports/
│   ├── shared/                 # Global Shared Resources
│   ├── layouts/                # Common layouts
│   └── App.js                  # React frontend entrypoint
│
├── backend/                    # Module-Based API Service Layer
│   ├── modules/
│   │   ├── auth/
│   │   ├── patients/
│   │   ├── doctors/            # [NEW] Decoupled clinical doctor profiles
│   │   ├── calendar/
│   │   ├── surgeries/
│   │   ├── estimates/
│   │   ├── templates/
│   │   ├── settings/
│   │   ├── master-data/        # [NEW] Bulk CSV/Excel export services
│   │   ├── documents/          # [NEW] Central HTML-to-PDF generators
│   │   ├── notifications/
│   │   └── audits/
│   ├── middleware/             # Common HTTP interceptors
│   ├── database/               # Db client singleton
│   └── server.js               # Node server startup file
│
├── tests/                      # Automated test scripts
├── backups/                    # Versioned code/schema backups
├── migrations/                 # PostgreSQL migrations scripts
├── package.json
└── README.md
```
