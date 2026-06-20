/* 
  Purpose: Define Express route endpoints for the Estimate Templates Module.
  Responsibility: Map endpoint paths to controller handlers and attach validation, auth, and role middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createEstimateTemplatesRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  // Read: all authenticated roles
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', controller.getOne.bind(controller));

  // Write: Doctor and Admin only
  router.post('/', authorizeRoles('ADMIN', 'DOCTOR'), validator.validateCreate, controller.postOne.bind(controller));
  router.put('/:id', authorizeRoles('ADMIN', 'DOCTOR'), validator.validateUpdate, controller.putOne.bind(controller));
  router.post('/:id/duplicate', authorizeRoles('ADMIN', 'DOCTOR'), controller.postDuplicate.bind(controller));
  router.patch('/:id/status', authorizeRoles('ADMIN', 'DOCTOR'), controller.patchStatus.bind(controller));
  
  // Delete: Admin only (soft-delete)
  router.delete('/:id', authorizeRoles('ADMIN'), controller.deleteOne.bind(controller));

  return router;
}

module.exports = createEstimateTemplatesRouter;
