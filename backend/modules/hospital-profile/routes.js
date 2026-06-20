/* 
  Purpose: Define Express route endpoints for the Hospital Profile Module.
  Responsibility: Map / GET and PUT paths with auth and tenancy middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createHospitalProfileRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  router.get('/', controller.getOne.bind(controller));
  router.put('/', authorizeRoles('ADMIN'), validator.validateUpdate, controller.putOne.bind(controller));

  return router;
}

module.exports = createHospitalProfileRouter;
