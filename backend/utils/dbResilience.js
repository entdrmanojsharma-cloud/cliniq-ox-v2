/**
 * dbResilience.js
 * 
 * Handles Neon serverless PostgreSQL's cold-start and intermittent
 * connectivity issues with:
 *   1. withRetry()   — wraps any async DB call with exponential backoff
 *   2. startKeepalive() — pings DB every 4 mins to prevent cold starts
 *   3. isTransientError() — identifies retryable Neon/Prisma network errors
 */

const Logger = require('./logger');

// ─── Transient Error Detection ───────────────────────────────────────────────
// Neon serverless issues show up as PrismaClientKnownRequestError with 
// messages about socket hang-up, connection refused, or "Can't reach database"
const TRANSIENT_PATTERNS = [
  "Can't reach database server",
  "Connection refused",
  "socket hang up",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "connection pool timeout",
  "Timed out fetching",
  "Unable to open a connection",
  "Server has closed the connection",
  "prepared statement",         // Neon pooler prepared statement conflicts
  "connection terminated",
];

function isTransientError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return TRANSIENT_PATTERNS.some(p => msg.includes(p.toLowerCase()));
}

// ─── Exponential Backoff Retry ────────────────────────────────────────────────
/**
 * Wraps any async function with automatic retry on transient DB errors.
 * 
 * @param {Function} fn        — async function to execute
 * @param {Object}   options
 * @param {number}   options.maxRetries   — max attempts (default: 3)
 * @param {number}   options.baseDelayMs  — initial delay in ms (default: 500)
 * @param {string}   options.label        — label for logging (default: 'DB call')
 */
async function withRetry(fn, { maxRetries = 3, baseDelayMs = 500, label = 'DB call' } = {}) {
  let lastErr;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (!isTransientError(err) || attempt === maxRetries) {
        // Not retryable or we've exhausted retries — rethrow
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1); // 500ms, 1s, 2s, ...
      Logger.warn(
        `[DB Retry] ${label} failed (attempt ${attempt}/${maxRetries}). ` +
        `Retrying in ${delay}ms... Error: ${err.message}`
      );
      await sleep(delay);
    }
  }

  throw lastErr;
}

// ─── Keepalive Ping ───────────────────────────────────────────────────────────
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes (Neon idles after ~5 min)
let keepaliveTimer = null;

/**
 * Starts a background keepalive that pings the DB on a timer.
 * This prevents Neon's serverless compute from going into cold-start sleep.
 * 
 * @param {PrismaClient} prisma
 */
function startKeepalive(prisma) {
  if (keepaliveTimer) return; // Already running

  const ping = async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      Logger.info('[DB Keepalive] Ping OK — Neon connection warmed.');
    } catch (err) {
      Logger.warn(`[DB Keepalive] Ping failed: ${err.message}`);
      // Don't crash the server — just log and let the next request retry
    }
  };

  // Run immediately on startup to confirm DB is reachable
  setTimeout(ping, 2000);

  keepaliveTimer = setInterval(ping, KEEPALIVE_INTERVAL_MS);
  Logger.info(`[DB Keepalive] Started — pinging every ${KEEPALIVE_INTERVAL_MS / 1000}s to keep Neon warm.`);
}

function stopKeepalive() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
}

// ─── Error Classifier for HTTP responses ─────────────────────────────────────
/**
 * Returns the appropriate HTTP status code for a DB error.
 * Transient errors → 503 Service Unavailable (tells client to retry)
 * All others      → 500 Internal Server Error
 */
function dbErrorHttpStatus(err) {
  return isTransientError(err) ? 503 : 500;
}

function dbErrorCode(err) {
  return isTransientError(err) ? 'ERR_DB_UNAVAILABLE' : (err.code || 'ERR_INTERNAL_SERVER_ERROR');
}

function dbErrorMessage(err) {
  return isTransientError(err)
    ? 'Database is temporarily unavailable. Please try again in a moment.'
    : (err.message || 'An unexpected error occurred on the server.');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  withRetry,
  startKeepalive,
  stopKeepalive,
  isTransientError,
  dbErrorHttpStatus,
  dbErrorCode,
  dbErrorMessage,
};
