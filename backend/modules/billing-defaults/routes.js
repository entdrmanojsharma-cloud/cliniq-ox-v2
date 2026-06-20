/* 
  Purpose: Define Express route endpoints for the Billing Defaults Module.
  Responsibility: Map / GET and PUT paths with auth, tenancy, role checks, and validators.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createBillingDefaultsRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  router.get('/', controller.getOne.bind(controller));
  router.put('/', authorizeRoles('ADMIN'), validator.validateUpdate, controller.putOne.bind(controller));

  // Generate package inclusion paragraph — accessible to all authenticated staff
  router.post('/generate-inclusion-text', controller.generateInclusionText.bind(controller));

  return router;
}

module.exports = createBillingDefaultsRouter;
