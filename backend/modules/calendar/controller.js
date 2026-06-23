/* 
  Purpose: HTTP controller handling requests for the Calendar Events Module.
  Responsibility: Map parameters/request bodies to CalendarEvent services and output standard JSON envelopes.
*/

const { sendSuccess } = require('../../shared/response');

class CalendarController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getEvents(req.user.hospitalId, req.query);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req, res, next) {
    try {
      const data = await this.service.getEventById(req.params.id, req.user.hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async postOne(req, res, next) {
    try {
      console.log('--- POST /calendar PAYLOAD ---', JSON.stringify(req.body));
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.createEvent(req.user.hospitalId, req.body, userContext);
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
      const data = await this.service.updateEvent(req.params.id, req.user.hospitalId, req.body, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async approveOne(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.transitionStatus(req.params.id, req.user.hospitalId, 'APPROVED', userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async cancelOne(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.transitionStatus(req.params.id, req.user.hospitalId, 'CANCELLED', userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async postponeOne(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.postponeEvent(req.params.id, req.user.hospitalId, req.body, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async completeOne(req, res, next) {
    try {
      const userContext = {
        userId: req.user.userId,
        email: req.user.email || 'user@cliniqox.com',
        role: req.user.role
      };
      const data = await this.service.transitionStatus(req.params.id, req.user.hospitalId, 'COMPLETED', userContext);
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
      const data = await this.service.softDeleteEvent(req.params.id, req.user.hospitalId, userContext);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CalendarController;
