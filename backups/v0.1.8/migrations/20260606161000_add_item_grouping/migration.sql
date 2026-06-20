/* 
  Migration Name: 20260606161000_add_item_grouping
  Purpose: Add ItemGroup enum, print/tax flags on template items, and archival columns.
*/

-- Create ItemGroup enum
CREATE TYPE "ItemGroup" AS ENUM (
  'SURGERY',
  'OT_CHARGE',
  'ANAESTHESIA',
  'ROOM',
  'NURSING',
  'ICU',
  'OT_MEDICATION',
  'CONSUMABLE',
  'ADDITIONAL',
  'PACKAGE',
  'CUSTOM'
);

-- Alter table estimates
ALTER TABLE "estimates"
  ADD COLUMN "generated_file_name" VARCHAR(255) NULL,
  ADD COLUMN "generated_at" TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN "generated_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL;

-- Alter table estimate_items
ALTER TABLE "estimate_items"
  ADD COLUMN "item_group" "ItemGroup" NOT NULL DEFAULT 'CUSTOM';

-- Alter table estimate_template_items
ALTER TABLE "estimate_template_items"
  ADD COLUMN "item_group" "ItemGroup" NULL,
  ADD COLUMN "is_printable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "is_taxable" BOOLEAN NOT NULL DEFAULT true;
