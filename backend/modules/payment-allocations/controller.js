/* 
  Purpose: HTTP controller handling requests for the Payment Allocations Module.
  Responsibility: Map HTTP methods to payment allocations service and return standard envelopes.
*/

const { sendSuccess } = require('../../shared/response');

class PaymentAllocationsController {
  constructor(service) {
    this.service = service;
  }

  async postOne(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.allocatePayment(req.user.hospitalId, req.body, userContext);
      return sendSuccess(res, 201, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PaymentAllocationsController;
