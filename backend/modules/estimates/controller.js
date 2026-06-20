/* 
  Purpose: HTTP controller handling requests for the Estimates Module.
  Responsibility: Map incoming request attributes to the service layer and output standard JSON responses.
*/

const { sendSuccess } = require('../../shared/response');
const { broadcast } = require('../../utils/realtime');

class EstimatesController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getEstimates(req.user.hospitalId, req.query);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req, res, next) {
    try {
      const data = await this.service.getEstimateById(req.params.id, req.user.hospitalId);
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
      const data = await this.service.createEstimate(req.user.hospitalId, req.body, userContext);
      broadcast(req, { event: 'ESTIMATES_UPDATED', action: 'create', data: { id: data?.id } });
      return sendSuccess(res, 201, data);
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
      const data = await this.service.updateEstimate(req.params.id, req.user.hospitalId, req.body, userContext);
      broadcast(req, { event: 'ESTIMATES_UPDATED', action: 'update', data: { id: data?.id } });
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async patchStatus(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.updateStatus(req.params.id, req.user.hospitalId, req.body.status, req.body.remarks, userContext);
      broadcast(req, { event: 'ESTIMATES_UPDATED', action: 'status', data: { id: req.params.id, status: req.body.status } });
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async postFromTemplate(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.createFromTemplate(req.user.hospitalId, req.body, userContext);
      broadcast(req, { event: 'ESTIMATES_UPDATED', action: 'template', data: { id: data?.id } });
      return sendSuccess(res, 201, data);
    } catch (err) {
      next(err);
    }
  }

  async getVersions(req, res, next) {
    try {
      const data = await this.service.getVersions(req.params.id, req.user.hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = EstimatesController;
