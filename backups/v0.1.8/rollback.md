# Rollback Instructions (v0.1.8)

To rollback the changes made during the final corrections of the Documents module, follow these instructions:

## 1. Restore Source Files
Run the following commands to restore the original source files from backup:
```bash
cp backups/v0.1.8/source/schema.prisma backend/database/schema.prisma
cp backups/v0.1.8/source/service.js backend/modules/documents/service.js
cp backups/v0.1.8/source/repository.js backend/modules/documents/repository.js
cp backups/v0.1.8/source/controller.js backend/modules/documents/controller.js
cp backups/v0.1.8/source/routes.js backend/modules/documents/routes.js
cp backups/v0.1.8/source/estimate.js backend/modules/documents/templates/estimate.js
cp backups/v0.1.8/source/test_documents.js tests/unit/test_documents.js
rm -rf backend/modules/documents/templates/estimate/
```

## 2. Restore Migrations Directory
Restore the migrations history:
```bash
rm -rf migrations/
cp -R backups/v0.1.8/migrations/ migrations/
```

## 3. Rollback Database Schema State
You will need to drop the table `document_generations`, restore the dropped columns to the `estimates` table, and drop the `DocumentType` enum.

SQL statements for manual rollback:
```sql
-- Restore estimates table columns
ALTER TABLE "estimates"
  ADD COLUMN "generated_file_name" VARCHAR(255) NULL,
  ADD COLUMN "generated_at" TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN "generated_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL;

-- Drop document generations table and enum
DROP TABLE IF EXISTS "document_generations" CASCADE;
DROP TYPE IF EXISTS "DocumentType" CASCADE;
```
