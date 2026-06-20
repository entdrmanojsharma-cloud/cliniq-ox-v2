/* 
  Purpose: Define request validation rules for the Receipts Module.
  Responsibility: Validate incoming HTTP request body parameters using Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const createReceiptSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID format.'),
  estimateId: z.string().uuid('Invalid estimate ID format.').nullable().optional(),
  amount: z.number().positive('Receipt amount must be positive.'),
  paymentMode: z.string().min(1, 'Payment mode is required.'),
  transactionRef: z.string().optional().nullable(),
  remarks: z.string().optional().nullable()
});

class ReceiptsValidator {
  constructor() {
    this.validateCreate = validateSchema(createReceiptSchema);
  }
}

module.exports = ReceiptsValidator;
