/* 
  Purpose: Global centralized error handling middleware.
  Responsibility: Intercept unhandled exceptions, log detailed stack traces, and map responses to the API error contract.
  
  Transient DB errors (Neon cold-start, connection resets) are returned as 503
  so the client can distinguish "retry later" from genuine application bugs.
*/

const Logger = require('../utils/logger');
const { sendError } = require('../shared/response');
const { isTransientError, dbErrorHttpStatus, dbErrorCode, dbErrorMessage } = require('../utils/dbResilience');

function errorHandlerMiddleware(err, req, res, next) {
  const transient = isTransientError(err);

  if (transient) {
    // Log as WARN — these are infrastructure blips, not bugs
    Logger.warn(`[DB Transient] ${req.method} ${req.url}: ${err.message}`);
  } else {
    Logger.error(`Unhandled error during request: ${req.method} ${req.url}`, err);
  }

  const status = err.status || dbErrorHttpStatus(err);
  const code = err.code || dbErrorCode(err);
  const message = transient ? dbErrorMessage(err) : (err.message || 'An unexpected error occurred on the server.');

  const details = (!transient && process.env.NODE_ENV === 'development')
    ? [{ issue: err.stack }]
    : [];

  return sendError(res, status, code, message, details);
}

module.exports = errorHandlerMiddleware;
