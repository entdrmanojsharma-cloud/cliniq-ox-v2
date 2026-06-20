/* 
  Purpose: Define request validation rules for the Payment Allocations Module.
  Responsibility: Validate incoming HTTP request body parameters using Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const allocatePaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID format.'),
  receiptId: z.string().uuid('Invalid receipt ID format.'),
  amountAllocated: z.number().positive('Allocation amount must be positive.')
});

class PaymentAllocationsValidator {
  constructor() {
    this.validateAllocate = validateSchema(allocatePaymentSchema);
  }
}

module.exports = PaymentAllocationsValidator;
