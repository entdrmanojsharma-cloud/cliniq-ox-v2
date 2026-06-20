/* 
  Purpose: HTTP controller handling requests for the Billing Defaults Module.
  Responsibility: Map incoming request attributes to the service layer and output standard JSON responses.
*/

const { sendSuccess } = require('../../shared/response');

class BillingDefaultsController {
  constructor(service) {
    this.service = service;
  }

  async getOne(req, res, next) {
    try {
      const data = await this.service.getDefaults(req.user.hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async putOne(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.updateDefaults(req.user.hospitalId, req.body, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async generateInclusionText(req, res, next) {
    try {
      const { anaesthesiaType, stayDays } = req.body;

      // Validate required fields
      if (!anaesthesiaType) {
        const err = new Error('anaesthesiaType is required. Valid values: LA, GA, SPINAL, OTHER');
        err.status = 400;
        err.code = 'ERR_MISSING_ANAESTHESIA_TYPE';
        throw err;
      }

      const validTypes = ['LA', 'GA', 'SPINAL', 'OTHER'];
      const normalizedType = (anaesthesiaType || '').toUpperCase();
      if (!validTypes.includes(normalizedType)) {
        const err = new Error(`Invalid anaesthesiaType "${anaesthesiaType}". Valid values: ${validTypes.join(', ')}`);
        err.status = 400;
        err.code = 'ERR_INVALID_ANAESTHESIA_TYPE';
        throw err;
      }

      const parsedDays = Number(stayDays);
      if (isNaN(parsedDays) || parsedDays < 0) {
        const err = new Error('stayDays must be a non-negative number.');
        err.status = 400;
        err.code = 'ERR_INVALID_STAY_DAYS';
        throw err;
      }

      const result = await this.service.generateInclusionText(
        req.user.hospitalId,
        normalizedType,
        parsedDays
      );

      return sendSuccess(res, 200, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = BillingDefaultsController;
