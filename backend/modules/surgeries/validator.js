/* 
  Purpose: Define validation rules for the Surgery Master Module.
  Responsibility: Validate incoming create and update payloads against Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const createSurgerySchema = z.object({
  surgeryCode: z.string().min(1, 'Surgery code is required.').max(50),
  surgeryName: z.string().min(1, 'Surgery name is required.').max(150),
  category: z.string().min(1, 'Category is required.').max(100),
  defaultSurgeonFee: z.number().nonnegative().optional()
});

const updateSurgerySchema = z.object({
  surgeryCode: z.string().min(1, 'Surgery code is required.').max(50).optional(),
  surgeryName: z.string().min(1, 'Surgery name is required.').max(150).optional(),
  category: z.string().min(1, 'Category is required.').max(100).optional(),
  defaultSurgeonFee: z.number().nonnegative().optional()
});

class SurgeriesValidator {
  constructor() {
    this.validateCreate = validateSchema(createSurgerySchema);
    this.validateUpdate = validateSchema(updateSurgerySchema);
  }
}

module.exports = SurgeriesValidator;
