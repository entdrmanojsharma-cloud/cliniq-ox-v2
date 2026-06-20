/* 
  Purpose: Define request validation rules for the Billing Defaults Module.
  Responsibility: Validate incoming HTTP request body parameters using Zod schemas.
  Accepts both legacy plural keys (e.g. otCharges) and singular DB keys (e.g. otCharge) for compatibility.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const billingDefaultsSchema = z.object({
  // Singular form (DB canonical)
  otCharge: z.number().nonnegative().optional(),
  gaCharge: z.number().nonnegative().optional(),
  localAnaesthesiaCharge: z.number().nonnegative().optional(),
  sedationCharge: z.number().nonnegative().optional(),
  surgeonCharge: z.number().nonnegative().optional(),
  assistantSurgeonCharge: z.number().nonnegative().optional(),
  roomCharge: z.number().nonnegative().optional(),
  icuCharge: z.number().nonnegative().optional(),
  wardCharge: z.number().nonnegative().optional(),
  nursingCharge: z.number().nonnegative().optional(),
  monitoringCharge: z.number().nonnegative().optional(),
  dressingCharge: z.number().nonnegative().optional(),
  consumableCharge: z.number().nonnegative().optional(),
  equipmentCharge: z.number().nonnegative().optional(),
  admissionCharge: z.number().nonnegative().optional(),
  registrationCharge: z.number().nonnegative().optional(),
  // Legacy plural form (frontend compatibility)
  otCharges: z.number().nonnegative().optional(),
  gaCharges: z.number().nonnegative().optional(),
  laCharges: z.number().nonnegative().optional(),
  sedationCharges: z.number().nonnegative().optional(),
  assistantSurgeonCharges: z.number().nonnegative().optional(),
  surgeonCharges: z.number().nonnegative().optional(),
  roomCharges: z.number().nonnegative().optional(),
  icuCharges: z.number().nonnegative().optional(),
  wardCharges: z.number().nonnegative().optional(),
  nursingCharges: z.number().nonnegative().optional(),
  monitoringCharges: z.number().nonnegative().optional(),
  dressingCharges: z.number().nonnegative().optional(),
  consumableCharges: z.number().nonnegative().optional(),
  equipmentCharges: z.number().nonnegative().optional(),
  admissionCharges: z.number().nonnegative().optional(),
  registrationCharges: z.number().nonnegative().optional()
});

class BillingDefaultsValidator {
  constructor() {
    this.validateUpdate = validateSchema(billingDefaultsSchema);
  }
}

module.exports = BillingDefaultsValidator;
