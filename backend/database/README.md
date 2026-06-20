# Cliniq-OX: Database Module

## Purpose
This module manages database structure, schemas, custom migrations, and seed data configurations for the Cliniq-OX system.

## Responsibilities
- **Schema Mapping:** Defines the Prisma object relation definitions (`schema.prisma`) mapping PostgreSQL tables, unique constraints, and indices.
- **Migration Orchestration:** Provides incremental PostgreSQL migrations under the root `migrations/` directory.
- **Mock Seeding:** Configures initial mock tenants, users, doctors, templates, and patients via `seed.js`.
- **System Enums:** Exports Javascript equivalent objects (`enums.js`) matching the database enum structures.

## Dependencies
- `@prisma/client` - Node.js object-relational mapping tool.
- `PostgreSQL` - Relational database engine.

## Command Execution Reference
- **Generate Client:** `npx prisma generate`
- **Run Seeding:** `node backend/database/seed.js`
