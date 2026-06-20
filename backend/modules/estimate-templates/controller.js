/* 
  Purpose: HTTP controller handling requests for the Estimate Templates Module.
  Responsibility: Map incoming request attributes to the service layer and output standard JSON responses.
*/

const { sendSuccess } = require('../../shared/response');

class EstimateTemplatesController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getTemplates(req.user.hospitalId, req.query);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req, res, next) {
    try {
      const data = await this.service.getTemplateById(req.params.id, req.user.hospitalId);
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
      const data = await this.service.createTemplate(req.user.hospitalId, req.body, userContext);
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
      const data = await this.service.updateTemplate(req.params.id, req.user.hospitalId, req.body, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async postDuplicate(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.duplicateTemplate(req.params.id, req.user.hospitalId, req.body, userContext);
      return sendSuccess(res, 201, data);
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
      const data = await this.service.toggleStatus(req.params.id, req.user.hospitalId, req.body.isActive, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async deleteOne(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.softDeleteTemplate(req.params.id, req.user.hospitalId, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = EstimateTemplatesController;
