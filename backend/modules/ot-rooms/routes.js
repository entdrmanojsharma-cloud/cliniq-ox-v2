/* 
  Purpose: Define Express route endpoints for the OT Rooms Master Module.
  Responsibility: Map OT room paths with auth, tenancy, and role validation middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createOtRoomsRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', controller.getOne.bind(controller));
  
  router.post(
    '/',
    authorizeRoles('ADMIN'),
    validator.validateCreate,
    controller.postOne.bind(controller)
  );

  router.put(
    '/:id',
    authorizeRoles('ADMIN'),
    validator.validateUpdate,
    controller.putOne.bind(controller)
  );

  router.delete(
    '/:id',
    authorizeRoles('ADMIN'),
    controller.deleteOne.bind(controller)
  );

  return router;
}

module.exports = createOtRoomsRouter;
