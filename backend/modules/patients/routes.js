/* 
  Purpose: Define Express route endpoints for the Patients Module.
  Responsibility: Map patient paths with auth, tenancy, and role validation middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createPatientsRouter(controller, validator) {
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

  router.put(
    '/:id',
    authorizeRoles('RECEPTIONIST', 'DOCTOR', 'ADMIN'),
    validator.validateUpdate,
    controller.putOne.bind(controller)
  );

  router.delete(
    '/:id',
    authorizeRoles('DOCTOR', 'ADMIN'),
    controller.deleteOne.bind(controller)
  );

  return router;
}

module.exports = createPatientsRouter;
