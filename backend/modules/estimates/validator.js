/* 
  Purpose: Define request validation rules for the Estimates Module.
  Responsibility: Validate incoming HTTP request body parameters using Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const discountTypeEnum = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);
const itemGroupEnum = z.enum([
  'SURGERY',
  'OT_CHARGE',
  'ANAESTHESIA',
  'ROOM',
  'NURSING',
  'ICU',
  'OT_MEDICATION',
  'CONSUMABLE',
  'ADDITIONAL',
  'PACKAGE',
  'CUSTOM'
]);

const surgeryItemSchema = z.object({
  surgeryId: z.string().uuid('Invalid surgery ID format.'),
  durationMinutes: z.number().int().nonnegative().optional(),
  surgeryCost: z.number().nonnegative().optional(),
  discountType: discountTypeEnum.optional(),
  discountValue: z.number().nonnegative().optional()
});

const customItemSchema = z.object({
  chargeCategory: z.string().min(1, 'Charge category is required.'),
  description: z.string().min(1, 'Description is required.'),
  quantity: z.number().int().positive().optional(),
  rate: z.number().nonnegative().optional(),
  discountType: discountTypeEnum.optional(),
  discountValue: z.number().nonnegative().optional(),
  itemGroup: itemGroupEnum.optional(),
  isPrintable: z.boolean().optional(),
  isTaxable: z.boolean().optional()
});

const createEstimateSchema = z.object({
  eventId: z.string().uuid('Invalid event ID format.'),
  roomId: z.string().uuid('Invalid room ID format.').nullable().optional(),
  expectedDurationMinutes: z.number().int().nonnegative().optional(),
  expectedStayDays: z.number().int().nonnegative().optional(),
  icuDays: z.number().int().nonnegative().optional(),
  icuDailyRate: z.number().nonnegative().optional(),
  actualOtCharge: z.number().nonnegative().optional(),
  otDiscountType: discountTypeEnum.optional(),
  otDiscountValue: z.number().nonnegative().optional(),
  actualAnaesthesiaCharge: z.number().nonnegative().optional(),
  anaesthesiaDiscountType: discountTypeEnum.optional(),
  anaesthesiaDiscountValue: z.number().nonnegative().optional(),
  roomDailyRate: z.number().nonnegative().optional(),
  roomDiscountType: discountTypeEnum.optional(),
  roomDiscountValue: z.number().nonnegative().optional(),
  nursingDailyRate: z.number().nonnegative().optional(),
  nursingDiscountType: discountTypeEnum.optional(),
  nursingDiscountValue: z.number().nonnegative().optional(),
  icuDiscountType: discountTypeEnum.optional(),
  icuDiscountValue: z.number().nonnegative().optional(),
  serviceDailyRate: z.number().nonnegative().optional(),
  serviceDiscountType: discountTypeEnum.optional(),
  serviceDiscountValue: z.number().nonnegative().optional(),
  discountType: discountTypeEnum.optional(),
  discountValue: z.number().nonnegative().optional(),
  gstRate: z.number().nonnegative().optional(),
  surgeries: z.array(surgeryItemSchema).min(1, 'At least one surgery is required for an estimate.'),
  items: z.array(customItemSchema).optional(),
  surgeonId: z.string().uuid('Invalid surgeon ID format.').nullable().optional(),
  scheduledDate: z.string().or(z.date()).nullable().optional(),
  surgeryName: z.string().nullable().optional(),
  isPackage: z.boolean().optional(),
  packageName: z.string().nullable().optional(),
  packagePrice: z.number().nonnegative().nullable().optional(),
  packageIncludes: z.string().nullable().optional(),
  packageTemplateId: z.string().uuid('Invalid package template ID format.').nullable().optional(),
  approvalRemark: z.string().nullable().optional(),
  diagnoses: z.array(z.string()).optional()
});

const updateEstimateSchema = z.object({
  roomId: z.string().uuid('Invalid room ID format.').nullable().optional(),
  expectedDurationMinutes: z.number().int().nonnegative().optional(),
  expectedStayDays: z.number().int().nonnegative().optional(),
  icuDays: z.number().int().nonnegative().optional(),
  icuDailyRate: z.number().nonnegative().optional(),
  actualOtCharge: z.number().nonnegative().optional(),
  otDiscountType: discountTypeEnum.optional(),
  otDiscountValue: z.number().nonnegative().optional(),
  actualAnaesthesiaCharge: z.number().nonnegative().optional(),
  anaesthesiaDiscountType: discountTypeEnum.optional(),
  anaesthesiaDiscountValue: z.number().nonnegative().optional(),
  roomDailyRate: z.number().nonnegative().optional(),
  roomDiscountType: discountTypeEnum.optional(),
  roomDiscountValue: z.number().nonnegative().optional(),
  nursingDailyRate: z.number().nonnegative().optional(),
  nursingDiscountType: discountTypeEnum.optional(),
  nursingDiscountValue: z.number().nonnegative().optional(),
  icuDiscountType: discountTypeEnum.optional(),
  icuDiscountValue: z.number().nonnegative().optional(),
  serviceDailyRate: z.number().nonnegative().optional(),
  serviceDiscountType: discountTypeEnum.optional(),
  serviceDiscountValue: z.number().nonnegative().optional(),
  discountType: discountTypeEnum.optional(),
  discountValue: z.number().nonnegative().optional(),
  gstRate: z.number().nonnegative().optional(),
  surgeries: z.array(surgeryItemSchema).optional(),
  items: z.array(customItemSchema).optional(),
  changeReason: z.string().min(1, 'Change reason is required when editing approved or locked estimates.').optional(),
  surgeonId: z.string().uuid('Invalid surgeon ID format.').nullable().optional(),
  scheduledDate: z.string().or(z.date()).nullable().optional(),
  surgeryName: z.string().nullable().optional(),
  isPackage: z.boolean().optional(),
  packageName: z.string().nullable().optional(),
  packagePrice: z.number().nonnegative().nullable().optional(),
  packageIncludes: z.string().nullable().optional(),
  packageTemplateId: z.string().uuid('Invalid package template ID format.').nullable().optional(),
  approvalRemark: z.string().nullable().optional(),
  diagnoses: z.array(z.string()).optional()
});

class EstimatesValidator {
  constructor() {
    this.validateCreate = validateSchema(createEstimateSchema);
    this.validateUpdate = validateSchema(updateEstimateSchema);
  }
}

module.exports = EstimatesValidator;
