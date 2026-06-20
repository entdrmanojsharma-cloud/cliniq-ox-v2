/* 
  Purpose: Define validation rules for the reports module.
  Responsibility: Validate incoming HTTP request body parameters.
*/

class ReportsValidator {
  validateCreate(req, res, next) {
    next();
  }

  validateUpdate(req, res, next) {
    next();
  }
}

module.exports = ReportsValidator;
