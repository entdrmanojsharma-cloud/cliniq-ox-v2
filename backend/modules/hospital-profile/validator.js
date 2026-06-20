/* 
  Purpose: Define validation rules for the Hospital Profile Module.
  Responsibility: Validate incoming settings update request body against the Zod schema.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const hospitalUpdateSchema = z.object({
  name: z.string().min(1, 'Hospital name is required.').max(150),
  address: z.string().min(1, 'Address is required.'),
  phone: z.string().min(1, 'Phone is required.'),
  email: z.string().email('Invalid email format.'),
  logoUrl: z.string().url('Invalid logo URL format.').optional().nullable(),
  currency: z.string().min(1, 'Currency is required.').max(10),
  defaultGstRate: z.number().min(0).max(100),
  estimatePrefix: z.string().min(1).max(10),
  invoicePrefix: z.string().min(1).max(10),
  receiptPrefix: z.string().min(1).max(10),
  financialYearStart: z.string().regex(/^\d{2}-\d{2}$/, 'Must be in MM-DD format.')
}).partial();

class HospitalProfileValidator {
  constructor() {
    this.validateUpdate = validateSchema(hospitalUpdateSchema);
  }
}

module.exports = HospitalProfileValidator;
