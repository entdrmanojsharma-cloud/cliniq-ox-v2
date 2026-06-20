/* 
  Purpose: Multi-hospital tenancy isolation middleware.
  Responsibility: Enforce X-Hospital-ID header validation and check synchronization with user JWT profile.
*/

const { sendError } = require('../shared/response');

function tenancyMiddleware(req, res, next) {
  // Bypass validation check for public auth routes
  if (req.path.startsWith('/auth')) {
    return next();
  }

  // Bypass tenancy checks for SUPER_ADMIN role
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  const hospitalHeader = req.headers['x-hospital-id'];
  if (!hospitalHeader) {
    return sendError(res, 400, 'ERR_BAD_REQUEST', 'Missing mandatory X-Hospital-ID header.');
  }

  if (!req.user || !req.user.hospitalId) {
    return sendError(res, 401, 'ERR_UNAUTHORIZED', 'Session details not established.');
  }

  // Cross-verify header with token claims scope
  if (hospitalHeader !== req.user.hospitalId) {
    return sendError(
      res,
      403,
      'ERR_FORBIDDEN',
      'Hospital ID in header does not match active user session settings.'
    );
  }

  next();
}

module.exports = tenancyMiddleware;
