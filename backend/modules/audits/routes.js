/* 
  Purpose: Define Express route endpoints for the audits module.
  Responsibility: Map paths to controller methods and attach validator middlewares.
*/

const express = require('express');

function createAuditsRouter(controller, validator) {
  const router = express.Router();

  router.get('/:id', controller.getOne.bind(controller));
  router.post('/', validator.validateCreate, controller.postOne.bind(controller));

  return router;
}

module.exports = createAuditsRouter;
