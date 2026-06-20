/* 
  Migration Name: 20260606160800_add_estimate_discounts
  Purpose: Add component-level discount types/values/amounts, print/tax control flags, and backwards compatibility fields.
*/

-- Create DiscountType enum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- Alter table estimates
ALTER TABLE "estimates"
  ADD COLUMN "ot_discount_type" "DiscountType" DEFAULT 'PERCENTAGE',
  ADD COLUMN "ot_discount_value" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "ot_discount_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "anaesthesia_discount_type" "DiscountType" DEFAULT 'PERCENTAGE',
  ADD COLUMN "anaesthesia_discount_value" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "anaesthesia_discount_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "room_daily_rate" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "room_original_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "room_discount_type" "DiscountType" DEFAULT 'PERCENTAGE',
  ADD COLUMN "room_discount_value" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "room_discount_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "room_final_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "nursing_original_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "nursing_discount_type" "DiscountType" DEFAULT 'PERCENTAGE',
  ADD COLUMN "nursing_discount_value" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "nursing_discount_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "nursing_final_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "icu_original_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "icu_discount_type" "DiscountType" DEFAULT 'PERCENTAGE',
  ADD COLUMN "icu_discount_value" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "icu_discount_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "icu_final_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "service_original_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "service_discount_type" "DiscountType" DEFAULT 'PERCENTAGE',
  ADD COLUMN "service_discount_value" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "service_discount_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "service_final_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "discount_type" "DiscountType" NOT NULL DEFAULT 'FIXED_AMOUNT',
  ADD COLUMN "discount_value" DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- Alter table estimate_surgeries
ALTER TABLE "estimate_surgeries"
  ADD COLUMN "discount_type" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
  ADD COLUMN "discount_value" DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- Alter table estimate_items
ALTER TABLE "estimate_items"
  ADD COLUMN "original_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "discount_type" "DiscountType" NOT NULL DEFAULT 'FIXED_AMOUNT',
  ADD COLUMN "discount_value" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "discount_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN "is_printable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "is_taxable" BOOLEAN NOT NULL DEFAULT true;

-- Alter table estimate_template_items
ALTER TABLE "estimate_template_items"
  ADD COLUMN "discount_type" "DiscountType",
  ADD COLUMN "discount_value" DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
