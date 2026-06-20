const express = require('express');
const authMiddleware = require('../../middleware/auth');
const authorizeRoles = require('../../middleware/rbac');
const tenancyMiddleware = require('../../middleware/tenancy');

function createSuperAdminRouter(controller) {
  const router = express.Router();

  // All endpoints require authentication
  router.use(authMiddleware);

  // ── SUPER_ADMIN only routes ────────────────────────────────────────────────
  const superAdminOnly = authorizeRoles('SUPER_ADMIN');
  router.get('/hospitals', superAdminOnly, controller.listHospitals.bind(controller));
  router.post('/hospitals', superAdminOnly, controller.createHospital.bind(controller));
  router.put('/hospitals/:id', superAdminOnly, controller.updateHospital.bind(controller));
  router.patch('/hospitals/:id/status', superAdminOnly, controller.toggleHospitalStatus.bind(controller));
  router.delete('/hospitals/:id', superAdminOnly, controller.deleteHospital.bind(controller));
  
  router.get('/pending-resets', superAdminOnly, controller.getPendingResets.bind(controller));
  router.post('/resolve-reset', superAdminOnly, controller.resolveReset.bind(controller));

  router.get('/backup', superAdminOnly, controller.backupDatabase.bind(controller));
  router.post('/restore', superAdminOnly, controller.restoreDatabase.bind(controller));

  // ── ADMIN + SUPER_ADMIN routes ────────────────────────────────────────────
  // Clear test data — admin can wipe their own hospital's transactional data
  router.post(
    '/clear-test-data',
    authorizeRoles('ADMIN', 'SUPER_ADMIN'),
    tenancyMiddleware,
    controller.clearTestData.bind(controller)
  );

  return router;
}

module.exports = createSuperAdminRouter;

