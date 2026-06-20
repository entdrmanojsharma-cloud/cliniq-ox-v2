/* 
  Purpose: Define request validation schema middleware.
  Responsibility: Validate request body against Zod schemas and map errors to standard JSON error format.
*/

const { sendError } = require('../shared/response');

function validateSchema(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = (result.error.issues || result.error.errors || []).map((err) => ({
        field: err.path.join('.'),
        issue: err.message
      }));
      
      console.error(`[VALIDATION FAILED] ${req.method} ${req.originalUrl}:`, JSON.stringify(details, null, 2));

      return sendError(
        res,
        400,
        'ERR_VALIDATION_FAILED',
        'Request payload failed schema validation validation.',
        details
      );
    }
    
    // Override request body with validated/coerced schema parameters
    req.body = result.data;
    next();
  };
}

module.exports = validateSchema;
