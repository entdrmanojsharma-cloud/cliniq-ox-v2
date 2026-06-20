/* 
  Purpose: Define Express route endpoints for the reports module.
  Responsibility: Map paths to controller methods and attach auth/tenancy/RBAC middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createReportsRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  router.get('/surgery', authorizeRoles('DOCTOR', 'ADMIN'), controller.getSurgery.bind(controller));
  router.get('/billing', authorizeRoles('DOCTOR', 'ADMIN'), controller.getBilling.bind(controller));
  router.get('/export-csv', authorizeRoles('DOCTOR', 'ADMIN'), controller.exportCsv.bind(controller));

  return router;
}

module.exports = createReportsRouter;
