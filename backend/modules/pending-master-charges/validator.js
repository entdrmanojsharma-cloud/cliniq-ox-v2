/* 
  Purpose: Define validation rules for the Pending Master Charges Module.
  Responsibility: Validate incoming creation payloads against Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const createPendingChargeSchema = z.object({
  chargeName: z.string().min(1, 'Charge name is required.').max(150),
  chargeCategory: z.string().min(1, 'Charge category is required.').max(100),
  defaultRate: z.number().nonnegative().optional(),
  defaultGst: z.number().min(0).max(100).optional(),
  unitType: z.enum(['FIXED', 'PER_HOUR', 'PER_DAY'], {
    errorMap: () => ({ message: 'Unit type must be FIXED, PER_HOUR, or PER_DAY.' })
  })
});

class PendingMasterChargesValidator {
  constructor() {
    this.validateCreate = validateSchema(createPendingChargeSchema);
  }
}

module.exports = PendingMasterChargesValidator;
