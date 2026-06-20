/* 
  Purpose: HTTP controller handling requests for the Credit Notes Module.
  Responsibility: Map HTTP methods to credit notes service and return standard envelopes.
*/

const { sendSuccess } = require('../../shared/response');

class CreditNotesController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getCreditNotes(req.user.hospitalId, req.query);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req, res, next) {
    try {
      const data = await this.service.getCreditNoteById(req.params.id, req.user.hospitalId);
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
      const data = await this.service.createCreditNote(req.user.hospitalId, req.body, userContext);
      return sendSuccess(res, 201, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CreditNotesController;
