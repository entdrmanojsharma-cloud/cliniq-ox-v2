/* 
  Purpose: Define Express route endpoints for the documents module.
  Responsibility: Map paths to controller methods and attach validator and tenant middlewares.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');

function createDocumentsRouter(controller, validator) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(tenancyMiddleware);

  router.post('/', validator.validateGenerate, controller.generate.bind(controller));
  router.get('/', controller.getAll.bind(controller));

  return router;
}

module.exports = createDocumentsRouter;
