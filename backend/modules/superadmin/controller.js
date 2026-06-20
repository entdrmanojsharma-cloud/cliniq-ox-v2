const { sendSuccess } = require('../../shared/response');

class SuperAdminController {
  constructor(superAdminService) {
    this.superAdminService = superAdminService;
  }

  async listHospitals(req, res, next) {
    try {
      const data = await this.superAdminService.listHospitals();
      return sendSuccess(res, 200, { hospitals: data });
    } catch (err) {
      next(err);
    }
  }

  async toggleHospitalStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        const err = new Error('Missing or invalid isActive status.');
        err.status = 400;
        err.code = 'ERR_BAD_REQUEST';
        throw err;
      }
      const data = await this.superAdminService.toggleHospitalActiveStatus(id, isActive);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async deleteHospital(req, res, next) {
    try {
      const { id } = req.params;
      const data = await this.superAdminService.softDeleteHospital(id);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async updateHospital(req, res, next) {
    try {
      const { id } = req.params;
      const { name, address, phone, email, gstNumber } = req.body;
      const data = await this.superAdminService.updateHospital(id, { name, address, phone, email, gstNumber });
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async createHospital(req, res, next) {
    try {
      const { code, name, address, gstNumber, phone, email, adminUsername, adminPassword, adminFirstName, adminLastName } = req.body;
      
      // Basic check
      if (!code || !name || !phone || !email || !adminUsername || !adminPassword || !adminFirstName) {
        const err = new Error('Missing required fields for hospital or admin.');
        err.status = 400;
        err.code = 'ERR_BAD_REQUEST';
        throw err;
      }

      const data = await this.superAdminService.createHospital({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address?.trim() || '',
        gstNumber: gstNumber?.trim() || null,
        phone: phone.trim(),
        email: email.trim(),
        adminUsername: adminUsername.trim(),
        adminPassword,
        adminFirstName: adminFirstName?.trim() || null,
        adminLastName: adminLastName?.trim() || null
      });

      return sendSuccess(res, 201, data);
    } catch (err) {
      next(err);
    }
  }

  async getPendingResets(req, res, next) {
    try {
      const data = await this.superAdminService.getPendingResets();
      return sendSuccess(res, 200, { requests: data });
    } catch (err) {
      next(err);
    }
  }

  async resolveReset(req, res, next) {
    try {
      const { requestId, action } = req.body;
      if (!requestId || !action) {
        const err = new Error('Missing requestId or action.');
        err.status = 400;
        err.code = 'ERR_BAD_REQUEST';
        throw err;
      }

      const data = await this.superAdminService.resolveReset(requestId, action, req.user.userId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async backupDatabase(req, res, next) {
    try {
      const data = await this.superAdminService.backupDatabase();
      
      // Set attachment headers for downloading the database file
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=cliniqox_backup_${Date.now()}.json`);
      return res.status(200).send(JSON.stringify(data, null, 2));
    } catch (err) {
      next(err);
    }
  }

  async restoreDatabase(req, res, next) {
    try {
      const data = await this.superAdminService.restoreDatabase(req.body, req.user.userId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async clearTestData(req, res, next) {
    try {
      // Must supply the confirmation token
      const { confirmToken } = req.body;
      if (confirmToken !== 'CLEAR_CONFIRMED') {
        const err = new Error('Invalid confirmation token. Action aborted.');
        err.status = 400;
        err.code = 'ERR_CONFIRMATION_REQUIRED';
        throw err;
      }

      const hospitalId = req.user.hospitalId;
      if (!hospitalId) {
        const err = new Error('No hospital context found for this user.');
        err.status = 400;
        err.code = 'ERR_NO_HOSPITAL';
        throw err;
      }

      const data = await this.superAdminService.clearTestData(hospitalId);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SuperAdminController;
