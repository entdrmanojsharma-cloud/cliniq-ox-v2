# Rollback Instructions (v0.1.3)

To rollback the changes made during the Documents module and Item Grouping phase, follow these instructions:

## 1. Restore Source Files
Run the following commands to restore the original source files from backup:
```bash
cp backups/v0.1.3/source/schema.prisma backend/database/schema.prisma
cp backups/v0.1.3/source/estimates_validator.js backend/modules/estimates/validator.js
cp backups/v0.1.3/source/estimates_service.js backend/modules/estimates/service.js
cp backups/v0.1.3/source/estimate_templates_validator.js backend/modules/estimate-templates/validator.js
```

## 2. Restore Migrations Directory
Restore the migrations history:
```bash
rm -rf migrations/
cp -R backups/v0.1.3/migrations/ migrations/
```

## 3. Rollback Database Schema State
You will need to manually drop any tables/columns added by the migrations of this phase, or restore the database from a pre-migration backup.
The columns to drop from the database if migrating down:
- Table `estimates`:
  - `ot_discount_type`, `ot_discount_value`, `ot_discount_amount`
  - `anaesthesia_discount_type`, `anaesthesia_discount_value`, `anaesthesia_discount_amount`
  - `room_daily_rate`, `room_original_amount`, `room_discount_type`, `room_discount_value`, `room_discount_amount`, `room_final_amount`
  - `nursing_original_amount`, `nursing_discount_type`, `nursing_discount_value`, `nursing_discount_amount`, `nursing_final_amount`
  - `icu_original_amount`, `icu_discount_type`, `icu_discount_value`, `icu_discount_amount`, `icu_final_amount`
  - `service_original_amount`, `service_discount_type`, `service_discount_value`, `service_discount_amount`, `service_final_amount`
  - `discount_type`, `discount_value`
  - `generated_file_name`, `generated_at`, `generated_by`
- Table `estimate_surgeries`:
  - `discount_type`, `discount_value`
- Table `estimate_items`:
  - `original_amount`, `discount_type`, `discount_value`, `discount_amount`, `is_printable`, `is_taxable`, `item_group`
- Table `estimate_template_items`:
  - `discount_type`, `discount_value`, `item_group`
- Drop custom types:
  - Enum `DiscountType`
  - Enum `ItemGroup`
