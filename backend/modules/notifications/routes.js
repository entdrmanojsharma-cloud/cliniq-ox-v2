/* 
  Purpose: Define Express route endpoints for the notifications module.
  Responsibility: Map paths to controller methods and attach auth/tenancy middleware.
*/

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const tenancyMiddleware = require('../../middleware/tenancy');

function createNotificationsRouter(controller, validator) {
  const router = Router();
  function Router() {
    return express.Router();
  }

  const r = Router();
  r.use(authMiddleware);
  r.use(tenancyMiddleware);

  r.get('/', controller.getAll.bind(controller));
  r.patch('/:id/read', controller.markAsRead.bind(controller));
  r.post('/read-all', controller.markAllAsRead.bind(controller));
  r.post('/', validator.validateCreate, controller.postOne.bind(controller));

  return r;
}

module.exports = createNotificationsRouter;
