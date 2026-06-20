/* 
  Purpose: Request ID trace middleware.
  Responsibility: Generate a unique requestId per request, attach it to req and headers, and bind it to the logger context.
*/

const crypto = require('crypto');
const Logger = require('../utils/logger');

function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Bind the request context to the logger store
  Logger.getStorage().run({ requestId }, () => {
    next();
  });
}

module.exports = requestIdMiddleware;
