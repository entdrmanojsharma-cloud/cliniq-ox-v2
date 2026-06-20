/* 
  Purpose: Define request validation rules for the Refunds Module.
  Responsibility: Validate incoming HTTP request body parameters using Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const createRefundSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID format.'),
  estimateId: z.string().uuid('Invalid estimate ID format.').nullable().optional(),
  amount: z.number().positive('Refund amount must be positive.'),
  paymentMode: z.string().min(1, 'Payment mode is required.'),
  transactionRef: z.string().optional().nullable(),
  reason: z.string().optional().nullable()
});

class RefundsValidator {
  constructor() {
    this.validateCreate = validateSchema(createRefundSchema);
  }
}

module.exports = RefundsValidator;
