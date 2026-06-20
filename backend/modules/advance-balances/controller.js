/* 
  Purpose: HTTP controller handling requests for the Advance Balances Module.
  Responsibility: Map HTTP methods to advance balances service and return standard envelopes.
*/

const { sendSuccess } = require('../../shared/response');

class AdvanceBalancesController {
  constructor(service) {
    this.service = service;
  }

  async getDetails(req, res, next) {
    try {
      const patientId = req.query.patientId;
      const estimateId = req.query.estimateId || null;
      if (!patientId) {
        const err = new Error('patientId query parameter is required.');
        err.status = 400;
        err.code = 'ERR_MISSING_PARAMETER';
        throw err;
      }
      const data = await this.service.getBalanceDetails(patientId, estimateId, req.user.hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req, res, next) {
    try {
      const patientId = req.query.patientId;
      const estimateId = req.query.estimateId || null;
      if (!patientId) {
        const err = new Error('patientId query parameter is required.');
        err.status = 400;
        err.code = 'ERR_MISSING_PARAMETER';
        throw err;
      }
      const data = await this.service.getLedgerHistory(patientId, estimateId, req.user.hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdvanceBalancesController;
