const { z } = require('zod');
const { sendError } = require('../../shared/response');

class DiscountCodesValidator {
  validateCreate(req, res, next) {
    const schema = z.object({
      code: z.string().min(2).max(50).transform(v => v.toUpperCase().trim()),
      description: z.string().max(255).default(''),
      discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
      value: z.number().positive(),
      validFrom: z.string().transform(val => new Date(val)),
      validTo: z.string().transform(val => new Date(val)),
      usageLimit: z.number().int().positive()
    });

    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, 'ERR_VALIDATION_FAILED', 'Input validation failed.', {
          details: err.issues.map(i => ({ field: i.path.join('.'), issue: i.message }))
        });
      }
      next(err);
    }
  }

  validateUpdate(req, res, next) {
    const schema = z.object({
      description: z.string().max(255).optional(),
      discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).optional(),
      value: z.number().positive().optional(),
      validFrom: z.string().transform(val => new Date(val)).optional(),
      validTo: z.string().transform(val => new Date(val)).optional(),
      usageLimit: z.number().int().positive().optional(),
      reason: z.string().min(3, "Reason for editing must be at least 3 characters").optional()
    });

    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, 'ERR_VALIDATION_FAILED', 'Input validation failed.', {
          details: err.issues.map(i => ({ field: i.path.join('.'), issue: i.message }))
        });
      }
      next(err);
    }
  }
}

module.exports = DiscountCodesValidator;
