/* 
  Purpose: Define shared audit logging wrapper.
  Responsibility: Save system operation logs (action, target table, payload changes) to database.
*/

const Logger = require('../utils/logger');

async function writeAuditLog(prisma, { hospitalId, userId, userName, role, action, targetTable, targetId, payload }) {
  try {
    await prisma.auditLog.create({
      data: {
        hospitalId,
        userId,
        userNameSnapshot: userName || 'SYSTEM',
        userRoleSnapshot: role || 'SYSTEM',
        action,
        targetTable,
        targetId,
        payload: payload || {}
      }
    });
  } catch (err) {
    Logger.error(`Failed to write audit log for action ${action} on ${targetTable} : ${targetId}`, err);
  }
}

module.exports = writeAuditLog;
