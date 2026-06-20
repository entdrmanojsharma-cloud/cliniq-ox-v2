const { z } = require('zod');
const { sendError } = require('../../shared/response');

class DiagnosisMasterValidator {
  validateCreate(req, res, next) {
    const schema = z.object({
      diagnosisCode: z.string().min(1).max(50),
      diagnosisName: z.string().min(1).max(255),
      description: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
      procedures: z.array(z.object({
        surgeryId: z.string().uuid(),
        isDefault: z.boolean().optional()
      })).optional()
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
      diagnosisCode: z.string().min(1).max(50).optional(),
      diagnosisName: z.string().min(1).max(255).optional(),
      description: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
      procedures: z.array(z.object({
        surgeryId: z.string().uuid(),
        isDefault: z.boolean().optional()
      })).optional()
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

module.exports = DiagnosisMasterValidator;
