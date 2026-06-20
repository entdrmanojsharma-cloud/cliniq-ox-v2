/* 
  Purpose: HTTP controller handling requests for the audits module.
  Responsibility: Route incoming payloads to service layer and format JSON responses.
*/

class AuditsController {
  constructor(service) {
    this.service = service;
  }

  async getOne(req, res, next) {
    try {
      const data = await this.service.getDetails(req.params.id);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async postOne(req, res, next) {
    try {
      const data = await this.service.executeCreate(req.body);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuditsController;
