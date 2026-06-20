/* 
  Purpose: Define Express route endpoints for the Advance Balances Module.
  Responsibility: Map endpoint paths to controller handlers and attach validation and auth middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');

function createAdvanceBalancesRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  router.get('/details', controller.getDetails.bind(controller));
  router.get('/history', controller.getHistory.bind(controller));

  return router;
}

module.exports = createAdvanceBalancesRouter;
