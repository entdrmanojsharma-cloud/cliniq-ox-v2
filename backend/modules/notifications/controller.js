/* 
  Purpose: HTTP controller handling requests for the notifications module.
  Responsibility: Route incoming payloads to service layer and format JSON responses using standard success envelopes.
*/

const { sendSuccess } = require('../../shared/response');

class NotificationsController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getNotifications(
        req.user.hospitalId,
        req.user.userId,
        req.query
      );
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const data = await this.service.markNotificationAsRead(
        req.params.id,
        req.user.hospitalId,
        req.user.userId
      );
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const data = await this.service.markAllNotificationsAsRead(
        req.user.hospitalId,
        req.user.userId
      );
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async postOne(req, res, next) {
    try {
      const data = await this.service.executeCreate(req.body);
      return sendSuccess(res, 201, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = NotificationsController;
