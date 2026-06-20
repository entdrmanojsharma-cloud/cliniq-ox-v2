/* 
  Purpose: HTTP controller handling requests for the Patients Module.
  Responsibility: Map incoming bodies/params to patient service workflows and format response envelopes.
*/

const { sendSuccess } = require('../../shared/response');
const { broadcast } = require('../../utils/realtime');

class PatientsController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getPatients(req.user.hospitalId, req.query);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req, res, next) {
    try {
      const data = await this.service.getPatientById(req.params.id, req.user.hospitalId);
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
      const data = await this.service.createPatient(req.user.hospitalId, req.body, userContext);
      broadcast(req, { event: 'PATIENTS_UPDATED', action: 'create', data: { id: data?.id } });
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
      const data = await this.service.updatePatient(req.params.id, req.user.hospitalId, req.body, userContext);
      broadcast(req, { event: 'PATIENTS_UPDATED', action: 'update', data: { id: data?.id } });
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
      const data = await this.service.softDeletePatient(req.params.id, req.user.hospitalId, userContext);
      broadcast(req, { event: 'PATIENTS_UPDATED', action: 'delete', data: { id: req.params.id } });
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PatientsController;
