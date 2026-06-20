/* 
  Purpose: Define request validation rules for the Invoices Module.
  Responsibility: Validate incoming HTTP request body parameters using Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const invoiceItemSchema = z.object({
  estimateItemId: z.string().uuid('Invalid estimate item ID format.').nullable().optional(),
  estimateSurgeryId: z.string().uuid('Invalid estimate surgery ID format.').nullable().optional(),
  rate: z.number().nonnegative().optional(),
  quantity: z.number().int().positive().optional()
});

const createInvoiceSchema = z.object({
  estimateId: z.string().uuid('Invalid estimate ID format.').nullable().optional(),
  patientId: z.string().uuid('Invalid patient ID format.'),
  invoiceItems: z.array(invoiceItemSchema).optional().default([])
});

class InvoicesValidator {
  constructor() {
    this.validateCreate = validateSchema(createInvoiceSchema);
  }
}

module.exports = InvoicesValidator;
