/* 
  Purpose: Define standardized REST JSON response wrappers.
  Responsibility: Format success and error responses automatically including the active request ID.
*/

const Logger = require('../utils/logger');

function sendSuccess(res, status, data) {
  return res.status(status).json({
    success: true,
    data,
    requestId: Logger.getRequestId()
  });
}

function sendError(res, status, code, message, details = []) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details
    },
    requestId: Logger.getRequestId()
  });
}

module.exports = {
  sendSuccess,
  sendError
};
