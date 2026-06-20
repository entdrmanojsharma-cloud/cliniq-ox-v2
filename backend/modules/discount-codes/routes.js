const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');
const authorizeRoles = require('../../middleware/rbac');

function createDiscountCodesRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  // --- Promo Code Validation & Applying (Open to Receptionist/Doctor/Admin) ---
  router.post('/validate', controller.validate.bind(controller));
  router.get('/revealed', controller.getRevealed.bind(controller));

  // --- Access Requests (Open to Receptionists) ---
  router.post('/access-requests', authorizeRoles('RECEPTIONIST'), controller.createRequest.bind(controller));
  router.get('/access-requests/active', authorizeRoles('RECEPTIONIST'), controller.getActiveRequest.bind(controller));

  // --- Access Approval (Doctors and Admins only) ---
  router.get('/access-requests', authorizeRoles('DOCTOR', 'ADMIN'), controller.listRequests.bind(controller));
  router.patch('/access-requests/:id/approve', authorizeRoles('DOCTOR', 'ADMIN'), controller.approveRequest.bind(controller));
  router.patch('/access-requests/:id/reject', authorizeRoles('DOCTOR', 'ADMIN'), controller.rejectRequest.bind(controller));

  // --- CRUD (Doctors and Admins only) ---
  router.get('/', authorizeRoles('DOCTOR', 'ADMIN'), controller.list.bind(controller));
  router.post('/', authorizeRoles('DOCTOR', 'ADMIN'), validator.validateCreate, controller.create.bind(controller));
  router.put('/:id', authorizeRoles('DOCTOR', 'ADMIN'), validator.validateUpdate, controller.update.bind(controller));
  router.patch('/:id/toggle', authorizeRoles('DOCTOR', 'ADMIN'), controller.toggle.bind(controller));
  router.delete('/:id', authorizeRoles('DOCTOR', 'ADMIN'), controller.delete.bind(controller));

  // --- Audit Logs (Admins only) ---
  router.get('/audits', authorizeRoles('ADMIN'), controller.getAudits.bind(controller));

  return router;
}

module.exports = createDiscountCodesRouter;
