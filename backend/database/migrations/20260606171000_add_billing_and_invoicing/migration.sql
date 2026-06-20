/* 
  Migration Name: 20260606171000_add_billing_and_invoicing
  Purpose: Add Invoices, Receipts, Refunds, Advance Ledgers, Credit Notes, Document Sequences, and optional item-level GST fields.
*/

-- CreateEnums
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'FINALIZED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
CREATE TYPE "ReceiptStatus" AS ENUM ('ACTIVE', 'REFUNDED', 'CANCELLED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "AdvanceLedgerType" AS ENUM ('DEPOSIT', 'ALLOCATION', 'REFUND');

-- Alter Table estimate_items
ALTER TABLE "estimate_items"
  ADD COLUMN "hsn_code" VARCHAR(50) NULL,
  ADD COLUMN "gst_rate" DECIMAL(5, 2) NULL;

-- Alter Table estimate_surgeries
ALTER TABLE "estimate_surgeries"
  ADD COLUMN "sac_code" VARCHAR(50) NULL,
  ADD COLUMN "gst_rate" DECIMAL(5, 2) NULL;

-- Create Table invoices
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "estimate_id" UUID NULL,
    "patient_id" UUID NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "subtotal" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "gst_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "grand_total" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- Create Table invoice_items
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "estimate_item_id" UUID NULL,
    "estimate_surgery_id" UUID NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "hsn_code" VARCHAR(50) NULL,
    "sac_code" VARCHAR(50) NULL,
    "gst_rate" DECIMAL(5, 2) NULL,
    "gst_amount" DECIMAL(10, 2) NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "check_invoice_item_source" CHECK (
        (estimate_item_id IS NULL AND estimate_surgery_id IS NOT NULL) OR 
        (estimate_item_id IS NOT NULL AND estimate_surgery_id IS NULL)
    )
);

-- Create Table receipts
CREATE TABLE "receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "receipt_number" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "payment_mode" VARCHAR(50) NOT NULL,
    "transaction_ref" VARCHAR(100) NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- Create Table payment_allocations
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "amount_allocated" DECIMAL(10, 2) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- Create Table advance_balances
CREATE TABLE "advance_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "estimate_id" UUID NULL,
    "total_deposited" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "total_allocated" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "total_refunded" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "current_balance" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advance_balances_pkey" PRIMARY KEY ("id")
);

-- Create Table advance_ledger_entries
CREATE TABLE "advance_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "advance_balance_id" UUID NOT NULL,
    "type" "AdvanceLedgerType" NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "reference_id" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advance_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- Create Table refunds
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "refund_number" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "payment_mode" VARCHAR(50) NOT NULL,
    "transaction_ref" VARCHAR(100) NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'COMPLETED',
    "reason" TEXT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- Create Table credit_notes
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "credit_note_number" VARCHAR(100) NOT NULL,
    "reason" TEXT NOT NULL,
    "subtotal" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "gst_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "grand_total" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- Create Table credit_note_items
CREATE TABLE "credit_note_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "credit_note_id" UUID NOT NULL,
    "invoice_item_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "gst_rate" DECIMAL(5, 2) NULL,
    "gst_amount" DECIMAL(10, 2) NULL,

    CONSTRAINT "credit_note_items_pkey" PRIMARY KEY ("id")
);

-- Create Table document_sequences
CREATE TABLE "document_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "year" INTEGER NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE UNIQUE INDEX "receipts_receipt_number_key" ON "receipts"("receipt_number");
CREATE UNIQUE INDEX "payment_allocations_invoice_id_receipt_id_key" ON "payment_allocations"("invoice_id", "receipt_id");
CREATE UNIQUE INDEX "advance_balances_patient_id_estimate_id_key" ON "advance_balances"("patient_id", "estimate_id");
CREATE UNIQUE INDEX "refunds_refund_number_key" ON "refunds"("refund_number");
CREATE UNIQUE INDEX "credit_notes_credit_note_number_key" ON "credit_notes"("credit_note_number");
CREATE UNIQUE INDEX "document_sequences_hospital_id_document_type_year_key" ON "document_sequences"("hospital_id", "document_type", "year");

-- Add ForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_estimate_item_id_fkey" FOREIGN KEY ("estimate_item_id") REFERENCES "estimate_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_estimate_surgery_id_fkey" FOREIGN KEY ("estimate_surgery_id") REFERENCES "estimate_surgeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "receipts" ADD CONSTRAINT "receipts_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "advance_balances" ADD CONSTRAINT "advance_balances_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "advance_balances" ADD CONSTRAINT "advance_balances_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "advance_balances" ADD CONSTRAINT "advance_balances_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "advance_ledger_entries" ADD CONSTRAINT "advance_ledger_entries_advance_balance_id_fkey" FOREIGN KEY ("advance_balance_id") REFERENCES "advance_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refunds" ADD CONSTRAINT "refunds_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "invoice_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
