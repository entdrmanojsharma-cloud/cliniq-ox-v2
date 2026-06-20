/* 
  Purpose: HTTP controller handling requests for the Invoices Module.
  Responsibility: Map HTTP methods to invoices service and return standard envelopes.
*/

const { sendSuccess } = require('../../shared/response');

class InvoicesController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getInvoices(req.user.hospitalId, req.query);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req, res, next) {
    try {
      const data = await this.service.getInvoiceById(req.params.id, req.user.hospitalId);
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
      const data = await this.service.createInvoice(req.user.hospitalId, req.body, userContext);
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
      const data = await this.service.updateInvoice(req.params.id, req.user.hospitalId, req.body, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async finalize(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.finalizeInvoice(req.params.id, req.user.hospitalId, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.cancelInvoice(req.params.id, req.user.hospitalId, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InvoicesController;
