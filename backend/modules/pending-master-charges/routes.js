/* 
  Purpose: Define Express route endpoints for the Pending Master Charges Module.
  Responsibility: Map Pending Charge paths with auth, tenancy, and role validation middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createPendingMasterChargesRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', controller.getOne.bind(controller));
  
  router.post(
    '/',
    authorizeRoles('RECEPTIONIST', 'DOCTOR', 'ADMIN'),
    validator.validateCreate,
    controller.postOne.bind(controller)
  );

  router.patch(
    '/:id/approve',
    authorizeRoles('ADMIN'),
    controller.approveOne.bind(controller)
  );

  router.patch(
    '/:id/reject',
    authorizeRoles('ADMIN'),
    controller.rejectOne.bind(controller)
  );

  router.delete(
    '/:id',
    authorizeRoles('ADMIN'),
    controller.deleteOne.bind(controller)
  );

  return router;
}

module.exports = createPendingMasterChargesRouter;
