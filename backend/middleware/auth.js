/* 
  Purpose: JWT Authentication verification middleware.
  Responsibility: Parse Authorization header, verify JWT signature, and assign claims payload to req.user.
*/

const jwt = require('jsonwebtoken');
const { sendError } = require('../shared/response');

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-signing-key';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'ERR_UNAUTHORIZED', 'Access token is missing or malformed.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      hospitalId: decoded.hospitalId,
      capabilities: decoded.capabilities || []
    };
    next();
  } catch (err) {
    return sendError(res, 401, 'ERR_INVALID_TOKEN', 'Access token has expired or is invalid.');
  }
}

module.exports = authMiddleware;
