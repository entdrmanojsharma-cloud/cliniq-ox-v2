/* 
  Purpose: HTTP controller handling requests for the Refunds Module.
  Responsibility: Map HTTP methods to refunds service and return standard envelopes.
*/

const { sendSuccess } = require('../../shared/response');

class RefundsController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getRefunds(req.user.hospitalId, req.query);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req, res, next) {
    try {
      const data = await this.service.getRefundById(req.params.id, req.user.hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async postOne(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.createRefund(req.user.hospitalId, req.body, userContext);
      return sendSuccess(res, 201, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = RefundsController;
