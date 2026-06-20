/* 
  Purpose: HTTP controller handling requests for the reports module.
  Responsibility: Route incoming payloads to service layer and format JSON responses using standardized success wrappers or CSV downloads.
*/

const { sendSuccess } = require('../../shared/response');

class ReportsController {
  constructor(service) {
    this.service = service;
  }

  async getSurgery(req, res, next) {
    try {
      const data = await this.service.getSurgeryReport(req.user.hospitalId, req.query);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async getBilling(req, res, next) {
    try {
      const data = await this.service.getBillingReport(req.user.hospitalId, req.query);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async exportCsv(req, res, next) {
    try {
      const { type, from, to } = req.query;
      let data = [];
      let headers = [];
      let filename = 'report.csv';

      if (type === 'surgery') {
        data = await this.service.getSurgeryReport(req.user.hospitalId, { from, to });
        headers = [
          'date',
          'patientName',
          'uhid',
          'surgeries',
          'surgeonName',
          'assistantSurgeonName',
          'surgeonFee',
          'assistantSurgeonFee',
          'totalCost'
        ];
        filename = `surgery_report_${from || 'start'}_to_${to || 'end'}.csv`;
      } else if (type === 'billing') {
        data = await this.service.getBillingReport(req.user.hospitalId, { from, to });
        headers = [
          'invoiceNumber',
          'date',
          'patientName',
          'uhid',
          'surgeonName',
          'subtotal',
          'gstAmount',
          'grandTotal',
          'status'
        ];
        filename = `billing_report_${from || 'start'}_to_${to || 'end'}.csv`;
      } else {
        const err = new Error('Invalid export type. Must be "surgery" or "billing".');
        err.status = 400;
        throw err;
      }

      const csvString = this.service.convertToCsv(data, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvString);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportsController;
