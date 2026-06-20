/* 
  Purpose: HTTP controller handling requests for the Hospital Profile Module.
  Responsibility: Map incoming payloads to hospital profile workflows and format responses.
*/

const { sendSuccess } = require('../../shared/response');

class HospitalProfileController {
  constructor(service) {
    this.service = service;
  }

  async getOne(req, res, next) {
    try {
      const data = await this.service.getProfile(req.user.hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async putOne(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'admin@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.updateProfile(req.user.hospitalId, req.body, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = HospitalProfileController;
