/* 
  Purpose: HTTP controller handling requests for the documents module.
  Responsibility: Route incoming payloads to service layer and format HTTP responses (HTML or PDF).
*/

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
}

module.exports = DocumentsController;
