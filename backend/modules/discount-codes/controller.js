const { sendSuccess } = require('../../shared/response');

class DiscountCodesController {
  constructor(service) {
    this.service = service;
  }

  async list(req, res, next) {
    try {
      const data = await this.service.listCodes(req.user.hospitalId, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await this.service.createCode(req.user.hospitalId, req.body, req.user);
      return sendSuccess(res, 201, data);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await this.service.updateCode(req.params.id, req.user.hospitalId, req.body, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async toggle(req, res, next) {
    try {
      const { status } = req.body;
      const data = await this.service.toggleStatus(req.params.id, req.user.hospitalId, status, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const data = await this.service.deleteCode(req.params.id, req.user.hospitalId, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async validate(req, res, next) {
    try {
      const { code } = req.body;
      const data = await this.service.validateCode(req.user.hospitalId, code);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  // --- Access Requests ---

  async createRequest(req, res, next) {
    try {
      const data = await this.service.createAccessRequest(req.user.hospitalId, req.user);
      return sendSuccess(res, 201, data);
    } catch (err) {
      next(err);
    }
  }

  async getActiveRequest(req, res, next) {
    try {
      const data = await this.service.getActiveAccessRequest(req.user.hospitalId, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async listRequests(req, res, next) {
    try {
      const data = await this.service.listAccessRequests(req.user.hospitalId, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async approveRequest(req, res, next) {
    try {
      const data = await this.service.approveAccessRequest(req.params.id, req.user.hospitalId, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async rejectRequest(req, res, next) {
    try {
      const data = await this.service.rejectAccessRequest(req.params.id, req.user.hospitalId, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async getRevealed(req, res, next) {
    try {
      const data = await this.service.getRevealedCodes(req.user.hospitalId, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  // --- Audit Logs ---

  async getAudits(req, res, next) {
    try {
      const data = await this.service.getAuditLogs(req.user.hospitalId, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DiscountCodesController;
