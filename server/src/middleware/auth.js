const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Required authentication middleware.
 * Rejects the request with 401 if no valid token is provided.
 */
function auth(ctx, next) {
  const authHeader = ctx.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = { code: 1000, message: '未登录或登录已过期' };
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    ctx.state.user = decoded;
    return next();
  } catch (err) {
    ctx.status = 401;
    ctx.body = { code: 1000, message: '登录已过期，请重新登录' };
  }
}

/**
 * Optional authentication middleware.
 * Attaches user info if a valid token is present, but does not reject.
 */
function optionalAuth(ctx, next) {
  const authHeader = ctx.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    ctx.state.user = decoded;
  } catch (err) {
    // Token invalid, but optional — just ignore
  }

  return next();
}

module.exports = { auth, optionalAuth };
