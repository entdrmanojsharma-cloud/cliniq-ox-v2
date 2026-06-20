/*
  Purpose: Define Express route endpoints for the Data Management Import/Export system.
  Responsibility: Map import/validation paths with authentication, tenancy, and RBAC middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createDataManagementRouter(controller) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  // Expose endpoints, restricting modify access to ADMIN/SUPER_ADMIN
  router.get('/sample', controller.getSampleTemplate.bind(controller));
  router.post('/validate', authorizeRoles('ADMIN', 'SUPER_ADMIN'), controller.validateData.bind(controller));
  router.post('/import', authorizeRoles('ADMIN', 'SUPER_ADMIN'), controller.commitImport.bind(controller));
  router.get('/history', authorizeRoles('ADMIN', 'SUPER_ADMIN'), controller.getHistory.bind(controller));

  return router;
}

module.exports = createDataManagementRouter;
