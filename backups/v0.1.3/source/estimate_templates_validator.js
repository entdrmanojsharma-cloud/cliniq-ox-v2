/* 
  Purpose: Define request validation rules for the Estimate Templates Module.
  Responsibility: Validate incoming HTTP request body parameters using Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const visibilityEnum = z.enum(['GLOBAL', 'PRIVATE']);
const templateItemTypeEnum = z.enum([
  'SURGERY_FEE',
  'OT_CHARGE',
  'ANAESTHESIA',
  'ROOM_CHARGE',
  'NURSING',
  'ICU',
  'ADDITIONAL'
]);
const discountTypeEnum = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);

const templateItemSchema = z.object({
  itemType: templateItemTypeEnum,
  description: z.string().min(1, 'Description is required.'),
  defaultQuantity: z.number().int().positive().optional(),
  defaultRate: z.number().nonnegative().optional(),
  discountType: discountTypeEnum.nullable().optional(),
  discountValue: z.number().nonnegative().optional()
});

const createTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required.').max(150),
  visibility: visibilityEnum.optional(),
  templateItems: z.array(templateItemSchema).min(1, 'At least one template item is required.')
});

const updateTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required.').max(150).optional(),
  visibility: visibilityEnum.optional(),
  templateItems: z.array(templateItemSchema).optional()
});

class EstimateTemplatesValidator {
  constructor() {
    this.validateCreate = validateSchema(createTemplateSchema);
    this.validateUpdate = validateSchema(updateTemplateSchema);
  }
}

module.exports = EstimateTemplatesValidator;
