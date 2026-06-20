/* 
  Purpose: Define Express route endpoints for the Authentication Module.
  Responsibility: Map /signup and /login paths to controller methods with validation.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const authorizeRoles = require('../../middleware/rbac');

function createAuthRouter(controller, validator) {
  const router = express.Router();

  router.post('/verify-username', controller.verifyUsername.bind(controller));
  router.post('/signup', validator.validateSignup, controller.signup.bind(controller));
  router.post('/login', validator.validateLogin, controller.login.bind(controller));
  router.post('/refresh', controller.refreshToken.bind(controller));
  router.post('/refresh-token', controller.refreshToken.bind(controller));
  router.post('/forgot-password', controller.forgotPassword.bind(controller));
  router.post('/change-password', authMiddleware, controller.changePassword.bind(controller));

  // Staff management — ADMIN only
  router.get('/staff', authMiddleware, authorizeRoles('ADMIN'), controller.listStaff.bind(controller));
  router.put('/staff/:id', authMiddleware, authorizeRoles('ADMIN'), controller.updateStaff.bind(controller));
  router.delete('/staff/:id', authMiddleware, authorizeRoles('ADMIN'), controller.deleteStaff.bind(controller));

  return router;
}

module.exports = createAuthRouter;
