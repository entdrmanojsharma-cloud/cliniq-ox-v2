const express = require('express');
const authMiddleware = require('../../middleware/auth');

function createDashboardRouter(controller) {
  const router = express.Router();
  router.get('/stats', authMiddleware, controller.getStats.bind(controller));
  return router;
}

module.exports = createDashboardRouter;
