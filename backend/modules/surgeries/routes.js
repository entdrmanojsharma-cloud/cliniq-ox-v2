/* 
  Purpose: Define Express route endpoints for the Surgery Master Module.
  Responsibility: Map surgery paths with auth, tenancy, and role+capability validation middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');
const { authorizeWithCapability } = require('../../middleware/rbac');

function createSurgeriesRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  // View: all authenticated roles
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', controller.getOne.bind(controller));
  
  // Create: ADMIN and DOCTOR
  router.post(
    '/',
    authorizeRoles('ADMIN', 'DOCTOR'),
    validator.validateCreate,
    controller.postOne.bind(controller)
  );

  // Update: ADMIN and DOCTOR
  router.put(
    '/:id',
    authorizeRoles('ADMIN', 'DOCTOR'),
    validator.validateUpdate,
    controller.putOne.bind(controller)
  );

  // Delete: ADMIN only
  router.delete(
    '/:id',
    authorizeRoles('ADMIN'),
    controller.deleteOne.bind(controller)
  );

  return router;
}

module.exports = createSurgeriesRouter;
