/* 
  Purpose: Define Express route endpoints for the Payment Allocations Module.
  Responsibility: Map endpoint paths to controller handlers and attach validation and auth middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');

function createPaymentAllocationsRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  router.post('/', validator.validateAllocate, controller.postOne.bind(controller));

  return router;
}

module.exports = createPaymentAllocationsRouter;
