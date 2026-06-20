const { sendSuccess } = require('../../shared/response');

class DiagnosisMasterController {
  constructor(service) {
    this.service = service;
  }

  async create(req, res, next) {
    try {
      const data = await this.service.createDiagnosis(req.user.hospitalId, req.body, req.user);
      return sendSuccess(res, 201, data);
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const data = await this.service.listDiagnoses(req.user.hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async get(req, res, next) {
    try {
      const data = await this.service.getDiagnosis(req.params.id, req.user.hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await this.service.updateDiagnosis(req.params.id, req.user.hospitalId, req.body, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const data = await this.service.deleteDiagnosis(req.params.id, req.user.hospitalId, req.user);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DiagnosisMasterController;
