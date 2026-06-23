/* 
  Purpose: Define Express route endpoints for the Calendar Events Module.
  Responsibility: Map CalendarEvent paths with auth, tenancy, and role validation middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createCalendarRouter(controller, validator) {
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

  router.patch(
    '/:id/approve',
    authorizeRoles('DOCTOR', 'ADMIN'),
    controller.approveOne.bind(controller)
  );

  router.patch(
    '/:id/cancel',
    authorizeRoles('RECEPTIONIST', 'DOCTOR', 'ADMIN'),
    controller.cancelOne.bind(controller)
  );

  router.patch(
    '/:id/postpone',
    authorizeRoles('RECEPTIONIST', 'DOCTOR', 'ADMIN'),
    controller.postponeOne.bind(controller)
  );

  router.patch(
    '/:id/complete',
    authorizeRoles('RECEPTIONIST', 'DOCTOR', 'ADMIN'),
    controller.completeOne.bind(controller)
  );

  router.delete(
    '/:id',
    authorizeRoles('ADMIN'),
    controller.deleteOne.bind(controller)
  );

  return router;
}

module.exports = createCalendarRouter;
