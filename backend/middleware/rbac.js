/* 
  Purpose: Role-based authorization middleware (RBAC) with capability support.
  Responsibility: Validate req.user.role against permissible endpoint access levels,
                  and optionally check for fine-grained capabilities on the user record.
*/

const { sendError } = require('../shared/response');

/**
 * Authorize by role only.
 * Usage: authorizeRoles('ADMIN', 'DOCTOR')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 401, 'ERR_UNAUTHORIZED', 'Session details not established.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        'ERR_FORBIDDEN',
        'You do not have permission to execute this operation.'
      );
    }

    next();
  };
}

/**
 * Authorize by role, with an optional capability gate for specific roles.
 * If a role appears in the capabilityMap, the user must also possess that capability.
 *
 * Usage:
 *   authorizeWithCapability(
 *     ['ADMIN', 'DOCTOR'],
 *     { DOCTOR: 'SURGERY_MASTER_MANAGER' }
 *   )
 *
 * - ADMIN passes with role alone (no capability check).
 * - DOCTOR passes only if req.user.capabilities includes 'SURGERY_MASTER_MANAGER'.
 */
function authorizeWithCapability(allowedRoles, capabilityMap = {}) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 401, 'ERR_UNAUTHORIZED', 'Session details not established.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        'ERR_FORBIDDEN',
        'You do not have permission to execute this operation.'
      );
    }

    // If the role requires a specific capability, enforce it
    const requiredCapability = capabilityMap[req.user.role];
    if (requiredCapability) {
      const userCapabilities = req.user.capabilities || [];
      if (!userCapabilities.includes(requiredCapability)) {
        return sendError(
          res,
          403,
          'ERR_FORBIDDEN',
          `Your account requires the ${requiredCapability} capability for this operation.`
        );
      }
    }

    next();
  };
}

module.exports = authorizeRoles;
module.exports.authorizeRoles = authorizeRoles;
module.exports.authorizeWithCapability = authorizeWithCapability;
