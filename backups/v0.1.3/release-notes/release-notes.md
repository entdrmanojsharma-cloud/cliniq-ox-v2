# Release Notes - Cliniq-OX (v0.1.3)

This release implements the Documents module with HTML template rendering and database schema changes for item grouping.

## Key Enhancements

1. **HTML Template Rendering Engine**:
   - Reusable template-based layout engine for Estimates, Invoices, Receipts, and Consent Forms.
   - Decoupled data-prep service layer and rendering templates to ensure clean division of concerns.
   - Built to output print-preview and PDF assets matching standard A4 dimensions.

2. **Database Item Grouping**:
   - Implemented `ItemGroup` enum: `SURGERY`, `OT_CHARGE`, `ANAESTHESIA`, `ROOM`, `NURSING`, `ICU`, `OT_MEDICATION`, `CONSUMABLE`, `ADDITIONAL`, `PACKAGE`, `CUSTOM`.
   - Updated `estimate_items` and `estimate_template_items` to enforce grouping.

3. **Archival Architecture Readiness**:
   - Prepared `estimates` table with archival metadata columns: `generated_file_name`, `generated_at`, `generated_by`.

4. **Estimate Template Updates**:
   - Added support for templates to store and reproduce component-level `itemGroup`, `discountType`, `discountValue`, `isTaxable`, and `isPrintable`.
