const { sendSuccess } = require('../../shared/response');

class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }

  async getStats(req, res, next) {
    try {
      const { from, to } = req.query;
      const data = await this.dashboardService.getStats(req.user.hospitalId, { from, to });
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardController;
