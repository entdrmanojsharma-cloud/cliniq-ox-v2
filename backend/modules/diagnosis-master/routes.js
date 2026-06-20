const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createDiagnosisMasterRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  // Accessible by DOCTOR, ADMIN, RECEPTIONIST (since they might need to see diagnosis list)
  router.get('/', authorizeRoles('RECEPTIONIST', 'DOCTOR', 'ADMIN'), controller.list.bind(controller));
  router.get('/:id', authorizeRoles('RECEPTIONIST', 'DOCTOR', 'ADMIN'), controller.get.bind(controller));

  // Only Admin or Surgeon/Doctor can modify master data
  router.post('/', authorizeRoles('DOCTOR', 'ADMIN'), validator.validateCreate, controller.create.bind(controller));
  router.put('/:id', authorizeRoles('DOCTOR', 'ADMIN'), validator.validateUpdate, controller.update.bind(controller));
  router.delete('/:id', authorizeRoles('DOCTOR', 'ADMIN'), controller.delete.bind(controller));

  return router;
}

module.exports = createDiagnosisMasterRouter;
