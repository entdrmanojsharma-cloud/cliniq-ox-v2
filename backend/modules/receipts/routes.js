/* 
  Purpose: Define Express route endpoints for the Receipts Module.
  Responsibility: Map endpoint paths to controller handlers and attach validation and auth middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');

function createReceiptsRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  router.get('/', controller.getAll.bind(controller));
  router.post('/', validator.validateCreate, controller.postOne.bind(controller));
  router.get('/:id', controller.getOne.bind(controller));

  return router;
}

module.exports = createReceiptsRouter;
