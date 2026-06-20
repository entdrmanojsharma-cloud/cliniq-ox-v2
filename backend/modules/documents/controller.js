const { sendSuccess } = require('../../shared/response');

class DocumentsController {
  constructor(service) {
    this.service = service;
  }

  async generate(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };

      const hospitalId = req.user.hospitalId;
      const result = await this.service.generateDocument(hospitalId, req.body, userContext);

      if (result.format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(result.content);
      } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
        return res.status(200).send(result.content);
      }
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.listDocuments(req.user.hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DocumentsController;
