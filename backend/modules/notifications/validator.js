/* 
  Purpose: Define validation rules for the notifications module.
  Responsibility: Validate incoming HTTP request body parameters.
*/

class NotificationsValidator {
  validateCreate(req, res, next) {
    next();
  }

  validateUpdate(req, res, next) {
    next();
  }
}

module.exports = NotificationsValidator;
