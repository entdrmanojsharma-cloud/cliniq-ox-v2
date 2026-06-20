/* 
  Purpose: Define request validation rules for the Credit Notes Module.
  Responsibility: Validate incoming HTTP request body parameters using Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const creditNoteItemSchema = z.object({
  invoiceItemId: z.string().uuid('Invalid invoice item ID format.'),
  quantity: z.number().int().positive('Quantity to credit must be positive.')
});

const createCreditNoteSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID format.'),
  reason: z.string().min(1, 'Reason for credit note is required.'),
  creditNoteItems: z.array(creditNoteItemSchema).min(1, 'At least one item to credit is required.')
});

class CreditNotesValidator {
  constructor() {
    this.validateCreate = validateSchema(createCreditNoteSchema);
  }
}

module.exports = CreditNotesValidator;
